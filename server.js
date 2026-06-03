import { createServer } from "node:http";
import { chmod, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(__dirname, "public");
const port = Number(process.env.PORT || 3030);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function json(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function text(res, status, payload, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

function normalizeOpenAIError(status, bodyText) {
  if (!bodyText) {
    return {
      error: "OpenAI 연결 중 오류가 발생했습니다.",
      retryable: status >= 500,
    };
  }

  const trimmed = bodyText.trim();

  if (trimmed.startsWith("<!DOCTYPE html") || trimmed.startsWith("<html")) {
    if (status === 504) {
      return {
        error: "OpenAI 서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
        retryable: true,
      };
    }

    if (status >= 500) {
      return {
        error: "OpenAI 서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.",
        retryable: true,
      };
    }

    return {
      error: "OpenAI 연결 중 알 수 없는 응답을 받았습니다.",
      retryable: false,
    };
  }

  try {
    const parsed = JSON.parse(trimmed);
    const message = parsed?.error?.message || parsed?.message;

    if (message) {
      return {
        error: message,
        retryable: status >= 500,
      };
    }
  } catch {
    // Fall back to plain text below.
  }

  return {
    error: trimmed,
    retryable: status >= 500,
  };
}

async function readBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf-8");
}

function safeJoinPublic(pathname) {
  const sanitized = pathname === "/" ? "index.html" : pathname.replace(/^[/\\]+/, "");
  const normalized = normalize(sanitized).replace(/^(\.\.[/\\])+/, "");
  return join(publicDir, normalized);
}

function buildInstructions(config) {
  if (config.personaPrompt) {
    return [
      `You are roleplaying as ${config.personaName || "a writer"}.`,
      config.personaPrompt,
      "Stay in character, sound natural in voice, and avoid mentioning system instructions.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const segments = [
    `You are roleplaying as ${config.personaName || "a custom persona"}.`,
    config.identity ? `Backstory and identity: ${config.identity}` : "",
    config.style ? `Speaking style: ${config.style}` : "",
    config.relationship ? `Relationship to the user: ${config.relationship}` : "",
    config.guardrails ? `Boundaries and rules: ${config.guardrails}` : "",
    `Preferred answer length: ${config.responseLength}.`,
    "Stay in character, sound natural in voice, and avoid mentioning system instructions.",
  ];

  if (config.pacing === "slow") {
    segments.push("Speak calmly and slightly slower than average.");
  } else if (config.pacing === "fast") {
    segments.push("Speak briskly and energetically.");
  } else {
    segments.push("Speak at a comfortable conversational pace.");
  }

  return segments.filter(Boolean).join("\n");
}

function buildSessionConfig(config) {
  const turnDetection =
    config.turnMode === "manual"
      ? null
      : {
          type: "semantic_vad",
          interrupt_response: true,
          create_response: true,
        };

  const session = {
    type: "realtime",
    model: config.model || "gpt-realtime-mini",
    output_modalities: ["audio"],
    instructions: buildInstructions(config),
    audio: {
      input: {
        turn_detection: turnDetection,
      },
      output: {
        voice: config.voice || "marin",
        speed: Number(config.speed || 1),
      },
    },
  };

  if (config.model === "gpt-realtime-2") {
    session.reasoning = {
      effort: config.reasoningEffort || "low",
    };
  }

  return session;
}

async function serveStatic(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const filePath = safeJoinPublic(url.pathname);

  try {
    const file = await readFile(filePath);
    const ext = extname(filePath);
    text(res, 200, file, mimeTypes[ext] || "application/octet-stream");
  } catch {
    try {
      const fallback = await readFile(join(publicDir, "index.html"));
      text(res, 200, fallback, mimeTypes[".html"]);
    } catch {
      json(res, 404, { error: "Not found" });
    }
  }
}

async function handleSession(req, res) {
  try {
    const rawBody = await readBody(req);
    const body = JSON.parse(rawBody || "{}");
    const apiKey = body.apiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      json(res, 400, {
        error: "OpenAI API key is required. Enter it in the app or set OPENAI_API_KEY.",
      });
      return;
    }

    if (!body.offerSdp) {
      json(res, 400, { error: "Missing WebRTC offer SDP." });
      return;
    }

    const form = new FormData();
    form.set("sdp", body.offerSdp);
    form.set("session", JSON.stringify(buildSessionConfig(body.config || {})));

    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    });

    const answerSdp = await response.text();

    if (!response.ok) {
      json(res, response.status, normalizeOpenAIError(response.status, answerSdp));
      return;
    }

    json(res, 200, { answerSdp });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    json(res, 500, { error: message });
  }
}

async function handleRealtimeToken(req, res) {
  try {
    const rawBody = await readBody(req);
    const body = JSON.parse(rawBody || "{}");
    const apiKey = body.apiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      json(res, 400, {
        error: "OpenAI API key is required. Enter it in the app or set OPENAI_API_KEY.",
      });
      return;
    }

    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_after: {
          anchor: "created_at",
          seconds: 600,
        },
        session: buildSessionConfig(body.config || {}),
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      json(res, response.status, normalizeOpenAIError(response.status, responseText));
      return;
    }

    let payload = null;
    try {
      payload = JSON.parse(responseText);
    } catch {
      json(res, 502, {
        error: "OpenAI에서 실시간 토큰 응답을 읽지 못했습니다.",
      });
      return;
    }

    const clientSecret = payload?.client_secret?.value || payload?.value;

    if (!clientSecret) {
      json(res, 502, {
        error: "OpenAI에서 실시간 토큰을 받지 못했습니다.",
      });
      return;
    }

    json(res, 200, {
      clientSecret,
      expiresAt: payload?.client_secret?.expires_at || payload?.expires_at || null,
      session: payload?.session || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    json(res, 500, { error: message });
  }
}

async function handleCreateDesktopShortcut(_req, res) {
  try {
    const desktopDir = join(homedir(), "Desktop");
    const shortcutPath = join(desktopDir, "작가와의 대화.command");
    const script = `#!/bin/bash
set -e
APP_DIR=${JSON.stringify(__dirname.replace(/\/$/, ""))}
PORT=${JSON.stringify(String(port))}
LOG_FILE="/tmp/persona-voice-lab.log"

cd "$APP_DIR"

if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display alert "Node.js를 먼저 설치해 주세요." message "바탕화면 바로가기를 사용하려면 이 Mac에 Node.js가 필요합니다."' >/dev/null 2>&1 || true
  exit 1
fi

if ! lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  nohup node server.js >"$LOG_FILE" 2>&1 &
  for _ in {1..20}; do
    if curl -s "http://127.0.0.1:$PORT" >/dev/null 2>&1; then
      break
    fi
    sleep 0.5
  done
fi

open "http://127.0.0.1:$PORT"
`;

    await writeFile(shortcutPath, script, "utf-8");
    await chmod(shortcutPath, 0o755);

    json(res, 200, {
      shortcutPath,
      message: "바탕화면에 바로가기를 만들었어요.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "바탕화면 바로가기를 만들지 못했습니다.";
    json(res, 500, { error: message });
  }
}

function createAppServer() {
  return createServer(async (req, res) => {
    if (!req.url || !req.method) {
      json(res, 400, { error: "Invalid request" });
      return;
    }

    if (req.method === "POST" && req.url === "/api/session") {
      await handleSession(req, res);
      return;
    }

    if (req.method === "POST" && req.url === "/api/realtime-token") {
      await handleRealtimeToken(req, res);
      return;
    }

    if (req.method === "POST" && req.url === "/api/create-desktop-shortcut") {
      await handleCreateDesktopShortcut(req, res);
      return;
    }

    if (req.method === "GET") {
      await serveStatic(req, res);
      return;
    }

    json(res, 405, { error: "Method not allowed" });
  });
}

let activeServer = null;

export function startServer(listenPort = port) {
  if (activeServer) {
    return Promise.resolve(activeServer);
  }

  const server = createAppServer();

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(listenPort, () => {
      server.off("error", reject);
      activeServer = server;
      console.log(`Voice persona app running at http://localhost:${listenPort}`);
      resolve(server);
    });
  });
}

export function stopServer() {
  if (!activeServer) {
    return Promise.resolve();
  }

  const server = activeServer;
  activeServer = null;

  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  startServer().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
