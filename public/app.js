const presets = {
  custom: null,
  fairyTaleAuthor: {
    personaName: "동화 작가 김하늘",
    voice: "marin",
    speed: 0.95,
    personaPrompt:
      "너는 아이들을 위한 동화를 쓰는 작가 김하늘이다. 초등학생과 전화로 대화하며 작품 이야기, 인물의 마음, 글쓰기 과정을 쉽고 따뜻하게 설명한다. 답변은 짧고 또렷하게 말한다.",
  },
  poet: {
    personaName: "시인 윤별",
    voice: "verse",
    speed: 1,
    personaPrompt:
      "너는 시인 윤별이다. 초등학생과 전화로 대화하며 시를 쓰는 이유, 상상하는 방법, 마음을 표현하는 법을 부드럽고 다정하게 들려준다. 어려운 표현은 쉬운 말로 바꿔 말한다.",
  },
  novelist: {
    personaName: "소설가 이도윤",
    voice: "sage",
    speed: 0.9,
    personaPrompt:
      "너는 소설가 이도윤이다. 초등학생과 전화로 대화하며 이야기 만드는 법, 인물을 떠올리는 법, 재미있는 사건을 만드는 방법을 차분하고 쉽게 설명한다. 답변은 짧은 문장 위주로 한다.",
  },
};

const storageKey = "voice-persona-local-settings";

const els = {
  settingsTabButton: document.querySelector("#settingsTabButton"),
  conversationTabButton: document.querySelector("#conversationTabButton"),
  settingsTab: document.querySelector("#settingsTab"),
  conversationTab: document.querySelector("#conversationTab"),
  presetSelect: document.querySelector("#presetSelect"),
  apiKey: document.querySelector("#apiKey"),
  apiKeyStatus: document.querySelector("#apiKeyStatus"),
  toggleApiKeyButton: document.querySelector("#toggleApiKeyButton"),
  personaName: document.querySelector("#personaName"),
  voice: document.querySelector("#voice"),
  speed: document.querySelector("#speed"),
  speedValue: document.querySelector("#speedValue"),
  personaPrompt: document.querySelector("#personaPrompt"),
  phoneNumber: document.querySelector("#phoneNumber"),
  phoneNumberPreview: document.querySelector("#phoneNumberPreview"),
  friendNamePreview: document.querySelector("#friendNamePreview"),
  callStageText: document.querySelector("#callStageText"),
  conversationLayout: document.querySelector("#conversationLayout"),
  saveSettingsButton: document.querySelector("#saveSettingsButton"),
  settingsStatus: document.querySelector("#settingsStatus"),
  startConversationButton: document.querySelector("#startConversationButton"),
  connectButton: document.querySelector("#connectButton"),
  disconnectButton: document.querySelector("#disconnectButton"),
  endCallButton: document.querySelector("#endCallButton"),
  sendTextButton: document.querySelector("#sendTextButton"),
  manualReplyButton: document.querySelector("#manualReplyButton"),
  textInput: document.querySelector("#textInput"),
  conversationLog: document.querySelector("#conversationLog"),
  remoteAudio: document.querySelector("#remoteAudio"),
  liveStatus: document.querySelector("#liveStatus"),
  callBadge: document.querySelector("#callBadge"),
  callVisual: document.querySelector("#callVisual"),
  callVisualName: document.querySelector("#callVisualName"),
  writerInitial: document.querySelector("#writerInitial"),
  liveStatusText: document.querySelector("#liveStatusText"),
  liveCaption: document.querySelector("#liveCaption"),
};

const state = {
  pc: null,
  dc: null,
  stream: null,
  connected: false,
  callPhase: "idle",
  callTimer: null,
  ringbackContext: null,
  ringbackNodes: [],
  effectContext: null,
  assistantDraftText: "",
  callStarting: false,
  apiKeyVisible: false,
  settingsDirty: false,
  inputMode: "audio",
};

function initPresetOptions() {
  for (const [key, preset] of Object.entries(presets)) {
    if (!preset) continue;
    const option = document.createElement("option");
    option.value = key;
    option.textContent = preset.personaName;
    els.presetSelect.append(option);
  }
}

function mapVoiceLabelToId(value) {
  const map = {
    marin: "marin",
    cedar: "cedar",
    alloy: "alloy",
    coral: "coral",
    sage: "sage",
    verse: "verse",
    ash: "ash",
    "밝은 목소리": "marin",
    "차분한 목소리": "cedar",
    "또렷한 목소리": "alloy",
    "상냥한 목소리": "coral",
    "부드러운 목소리": "sage",
    "재잘재잘 목소리": "verse",
    "낮은 목소리": "ash",
  };

  return map[value] || value;
}

function mapVoiceIdToLabel(value) {
  const map = {
    marin: "marin",
    cedar: "cedar",
    alloy: "alloy",
    coral: "coral",
    sage: "sage",
    verse: "verse",
    ash: "ash",
  };

  return map[value] || "marin";
}

function formatPhoneNumber(raw) {
  const digits = String(raw || "").replace(/\D/g, "").slice(0, 11);

  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function collectConfig() {
  return {
    model: "gpt-realtime-mini",
    personaName: els.personaName.value.trim(),
    voice: mapVoiceLabelToId(els.voice.value),
    speed: Number(els.speed.value),
    personaPrompt: els.personaPrompt.value.trim(),
    phoneNumber: formatPhoneNumber(els.phoneNumber.value),
  };
}

function fillForm(config) {
  if (!config) return;

  els.personaName.value = config.personaName || "";
  els.voice.value = mapVoiceIdToLabel(config.voice || "marin");
  els.speed.value = String(config.speed || 0.95);
  els.personaPrompt.value = config.personaPrompt || "";
  els.phoneNumber.value = formatPhoneNumber(config.phoneNumber || "");
  renderSpeed();
  updateFriendPreview();
  updatePhonePreview();
}

function setSettingsStatus(label, tone = "pending") {
  els.settingsStatus.textContent = label;
  els.settingsStatus.style.background =
    tone === "saved" ? "#eefaf1" : tone === "error" ? "#fff1f1" : "#fff4bf";
  els.settingsStatus.style.color =
    tone === "saved" ? "#238b55" : tone === "error" ? "#b54747" : "#8a6a00";
}

function updateApiKeyStatus() {
  const hasKey = Boolean(els.apiKey.value.trim());
  els.apiKeyStatus.textContent = hasKey ? "이 기기에 저장됨" : "저장되지 않음";
  els.apiKeyStatus.style.background = hasKey ? "#eefaf1" : "#fff1f1";
  els.apiKeyStatus.style.color = hasKey ? "#238b55" : "#b54747";
}

function saveSettings() {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      apiKey: els.apiKey.value,
      ...collectConfig(),
    }),
  );
  state.settingsDirty = false;
  updateApiKeyStatus();
  setSettingsStatus("이 기기에 저장됨", "saved");
}

function loadSavedSettings() {
  try {
    const raw = localStorage.getItem(storageKey);

    if (!raw) {
      applyPreset("fairyTaleAuthor");
      return;
    }

    const saved = JSON.parse(raw);
    els.apiKey.value = saved.apiKey || "";
    fillForm(saved);
    updateApiKeyStatus();
    setSettingsStatus("불러옴", "saved");
  } catch {
    applyPreset("fairyTaleAuthor");
  }
}

function applyPreset(name) {
  const preset = presets[name];
  if (!preset) return;
  fillForm(preset);
  saveSettings();
}

function markSettingsDirty() {
  state.settingsDirty = true;
  setSettingsStatus("변경됨, 저장 필요", "pending");
}

function renderSpeed() {
  const speed = Number(els.speed.value);

  if (speed <= 0.85) {
    els.speedValue.textContent = "천천히";
    return;
  }

  if (speed >= 1.05) {
    els.speedValue.textContent = "빠르게";
    return;
  }

  els.speedValue.textContent = "보통";
}

function updatePhonePreview() {
  const formatted = formatPhoneNumber(els.phoneNumber.value);
  els.phoneNumber.value = formatted;
  els.phoneNumberPreview.textContent = formatted || "010-0000-0000";
}

function updateFriendPreview() {
  const name = els.personaName.value.trim() || "작가";
  els.friendNamePreview.textContent = name;
  els.callVisualName.textContent = name;
  els.writerInitial.textContent = name.slice(0, 1);
}

function toggleApiKeyVisibility() {
  state.apiKeyVisible = !state.apiKeyVisible;
  els.apiKey.type = state.apiKeyVisible ? "text" : "password";
  els.toggleApiKeyButton.textContent = state.apiKeyVisible ? "숨기기" : "보기";
}

function switchTab(name) {
  const isSettings = name === "settings";
  els.settingsTabButton.classList.toggle("active", isSettings);
  els.conversationTabButton.classList.toggle("active", !isSettings);
  els.settingsTab.classList.toggle("active", isSettings);
  els.conversationTab.classList.toggle("active", !isSettings);
}

function moveToConversationTab() {
  switchTab("conversation");
  window.setTimeout(() => {
    els.phoneNumber.focus();
  }, 0);
}

function setInputMode(mode) {
  state.inputMode = mode;
}

function refreshCallControls() {
  const callBusy =
    state.callStarting || state.connected || state.callPhase === "dialing" || state.callPhase === "ringing";

  els.connectButton.disabled = callBusy;
  els.disconnectButton.disabled = !callBusy;
  els.endCallButton.disabled = !callBusy;
  els.sendTextButton.disabled = !state.connected;
  els.manualReplyButton.disabled = !state.connected;
}

function setConnected(connected) {
  state.connected = connected;
  refreshCallControls();
}

function setConversationFocusMode(active) {
  els.conversationLayout.classList.toggle("call-active", active);
}

function setStatus(label) {
  els.liveStatus.textContent = label;
  els.liveStatusText.textContent = label;
}

function setCallPhase(phase, detail = "") {
  state.callPhase = phase;
  refreshCallControls();

  if (phase === "dialing") {
    setConversationFocusMode(true);
    els.callVisual.classList.remove("ended");
    els.callBadge.textContent = "전화 거는 중";
    els.callStageText.textContent = detail || "지금 전화 연결음을 보내고 있어요.";
    setStatus("전화 중");
    els.liveCaption.textContent = "작가에게 전화를 걸고 있습니다.";
    return;
  }

  if (phase === "ringing") {
    setConversationFocusMode(true);
    els.callVisual.classList.remove("ended");
    els.callBadge.textContent = "받는 중";
    els.callStageText.textContent = detail || "뚜르르... 작가가 전화를 받고 있어요.";
    setStatus("연결 중");
    els.liveCaption.textContent = "통화 연결 중입니다.";
    return;
  }

  if (phase === "connected") {
    setConversationFocusMode(true);
    els.callVisual.classList.remove("ended");
    els.callBadge.textContent = "대화 중";
    els.callStageText.textContent = detail || "작가가 전화를 받았어요. 이제 이야기해 보세요.";
    setStatus("대화 중");
    els.liveCaption.textContent =
      state.inputMode === "audio"
        ? "마이크로 바로 말할 수 있습니다. 내가 말하면 작가가 실시간으로 듣고 답합니다."
        : "마이크 없이 연결되었습니다. 아래 글상자에 입력하면 작가가 바로 답합니다.";
    return;
  }

  if (phase === "ended") {
    setConversationFocusMode(false);
    els.callVisual.classList.add("ended");
    els.callBadge.textContent = "통화 끝";
    els.callStageText.textContent = detail || "통화가 종료되었습니다.";
    setStatus("통화 종료");
    els.liveCaption.textContent = "통화가 종료되었습니다.";
    return;
  }

  setConversationFocusMode(false);
  els.callVisual.classList.remove("ended");
  els.callBadge.textContent = "전화 대기";
  els.callStageText.textContent = detail || "전화번호를 입력하고 초록 버튼을 눌러 주세요.";
  setStatus("준비");
  els.liveCaption.textContent = "통화 대기 중입니다.";
}

function appendConversation(role, text, meta = "") {
  const item = document.createElement("article");
  item.className = `conversation-item ${role}`;

  const roleEl = document.createElement("strong");
  roleEl.className = "message-role";

  const labels = {
    user: "나",
    assistant: "작가",
    system: "안내",
  };

  roleEl.textContent = meta ? `${labels[role] || role} · ${meta}` : labels[role] || role;

  const textEl = document.createElement("p");
  textEl.className = "message-text";
  textEl.textContent = text;

  item.append(roleEl, textEl);
  els.conversationLog.prepend(item);
}

function replaceTopAssistantDraft(text) {
  let firstAssistant = els.conversationLog.querySelector(".conversation-item.assistant");

  if (!firstAssistant) {
    appendConversation("assistant", text || "...");
    firstAssistant = els.conversationLog.querySelector(".conversation-item.assistant");
  }

  const textEl = firstAssistant?.querySelector(".message-text");
  if (textEl) {
    textEl.textContent = text || "...";
  }
}

function clearCallTimer() {
  if (state.callTimer) {
    window.clearTimeout(state.callTimer);
    state.callTimer = null;
  }
}

function stopRingbackTone() {
  clearCallTimer();

  for (const node of state.ringbackNodes) {
    try {
      node.stop?.();
    } catch {}

    try {
      node.disconnect?.();
    } catch {}
  }

  state.ringbackNodes = [];

  if (state.ringbackContext) {
    state.ringbackContext.close().catch(() => {});
    state.ringbackContext = null;
  }
}

function stopEffectTone() {
  if (state.effectContext) {
    state.effectContext.close().catch(() => {});
    state.effectContext = null;
  }
}

async function playRingbackTone() {
  stopRingbackTone();

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const context = new AudioCtx();
  state.ringbackContext = context;

  const master = context.createGain();
  master.gain.value = 0.05;
  master.connect(context.destination);

  const osc1 = context.createOscillator();
  const osc2 = context.createOscillator();
  const gate = context.createGain();

  osc1.type = "sine";
  osc2.type = "sine";
  osc1.frequency.value = 440;
  osc2.frequency.value = 480;
  gate.gain.value = 0;

  osc1.connect(gate);
  osc2.connect(gate);
  gate.connect(master);

  osc1.start();
  osc2.start();
  state.ringbackNodes = [osc1, osc2, gate, master];

  const pattern = [1.1, 0.45, 1.1, 2.2];
  let elapsed = context.currentTime;

  for (let i = 0; i < 6; i += 1) {
    gate.gain.setValueAtTime(0, elapsed);
    gate.gain.linearRampToValueAtTime(0.9, elapsed + 0.02);
    gate.gain.linearRampToValueAtTime(0.9, elapsed + pattern[0]);
    gate.gain.linearRampToValueAtTime(0, elapsed + pattern[0] + 0.04);
    elapsed += pattern[0] + pattern[1];
    gate.gain.setValueAtTime(0, elapsed);
    gate.gain.linearRampToValueAtTime(0.9, elapsed + 0.02);
    gate.gain.linearRampToValueAtTime(0.9, elapsed + pattern[2]);
    gate.gain.linearRampToValueAtTime(0, elapsed + pattern[2] + 0.04);
    elapsed += pattern[2] + pattern[3];
  }
}

async function playPickupTone() {
  stopEffectTone();

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const context = new AudioCtx();
  state.effectContext = context;

  const master = context.createGain();
  master.gain.value = 0.08;
  master.connect(context.destination);

  const oscA = context.createOscillator();
  const oscB = context.createOscillator();
  const gainA = context.createGain();
  const gainB = context.createGain();

  oscA.type = "triangle";
  oscB.type = "sine";
  oscA.frequency.value = 660;
  oscB.frequency.value = 880;
  gainA.gain.value = 0;
  gainB.gain.value = 0;

  oscA.connect(gainA);
  oscB.connect(gainB);
  gainA.connect(master);
  gainB.connect(master);

  const now = context.currentTime;
  gainA.gain.setValueAtTime(0, now);
  gainA.gain.linearRampToValueAtTime(0.9, now + 0.02);
  gainA.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  gainB.gain.setValueAtTime(0, now + 0.08);
  gainB.gain.linearRampToValueAtTime(0.7, now + 0.1);
  gainB.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

  oscA.start(now);
  oscB.start(now);
  oscA.stop(now + 0.3);
  oscB.stop(now + 0.3);

  await new Promise((resolve) => {
    window.setTimeout(resolve, 320);
  });

  stopEffectTone();
}

function buildInstructions(config) {
  return [
    `너의 이름은 ${config.personaName || "작가"}이다.`,
    config.personaPrompt,
    "초등학생이 듣기 쉽게 짧고 친절하게 말한다.",
    "작가로서 작품, 인물, 글쓰기 생각을 자연스럽고 따뜻하게 들려준다.",
  ]
    .filter(Boolean)
    .join("\n");
}

function sendEvent(event) {
  if (!state.dc || state.dc.readyState !== "open") {
    throw new Error("아직 작가와 연결되지 않았어요.");
  }

  state.dc.send(JSON.stringify(event));
}

function normalizeUiErrorMessage(rawMessage) {
  if (!rawMessage) {
    return "오류가 발생했어요. 다시 시도해 주세요.";
  }

  const trimmed = String(rawMessage).trim();

  if (trimmed.startsWith("<!DOCTYPE html") || trimmed.startsWith("<html")) {
    return "서버 연결이 잠시 불안정합니다. 잠시 후 다시 시도해 주세요.";
  }

  return trimmed;
}

function handleRealtimeEvent(event) {
  switch (event.type) {
    case "response.created":
      setStatus("작가가 말하는 중");
      state.assistantDraftText = "";
      break;
    case "response.output_text.delta":
    case "response.output_audio_transcript.delta":
      state.assistantDraftText += event.delta || "";
      replaceTopAssistantDraft(state.assistantDraftText);
      break;
    case "response.done":
      state.assistantDraftText = "";
      setCallPhase(state.connected ? "connected" : "idle");
      break;
    case "input_audio_buffer.speech_started":
      setStatus("내가 말하는 중");
      break;
    case "input_audio_buffer.speech_stopped":
      setStatus("작가가 듣는 중");
      break;
    case "conversation.item.input_audio_transcription.completed":
      if (event.transcript) {
        appendConversation("user", event.transcript, "말하기");
      }
      break;
    case "error":
      appendConversation("system", event.error?.message || "오류가 생겼어요.");
      setStatus("오류");
      break;
    default:
      break;
  }
}

async function connectSession() {
  const apiKey = els.apiKey.value.trim();

  if (!apiKey) {
    appendConversation("system", "설정 탭에서 API 키를 먼저 넣어 주세요.");
    switchTab("settings");
    return;
  }

  saveSettings();
  setStatus("마이크 준비 중");

  const pc = new RTCPeerConnection();
  const dc = pc.createDataChannel("oai-events");
  let stream = null;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    setInputMode("audio");
  } catch {
    setInputMode("text");
    setStatus("글 대화 연결 중");
    appendConversation("system", "마이크 없이 글로 대화할 수 있는 상태로 연결합니다.");
  }

  state.pc = pc;
  state.dc = dc;
  state.stream = stream;
  state.assistantDraftText = "";

  els.remoteAudio.srcObject = new MediaStream();

  if (stream) {
    for (const track of stream.getTracks()) {
      pc.addTrack(track, stream);
    }
  } else {
    pc.addTransceiver("audio", { direction: "recvonly" });
  }

  pc.ontrack = (event) => {
    els.remoteAudio.srcObject = event.streams[0];
    els.remoteAudio.play().catch(() => {});
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "connected") {
      setConnected(true);
      setCallPhase("connected");
      appendConversation("system", `${els.friendNamePreview.textContent} 작가가 전화를 받았습니다.`);
    }

    if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
      setConnected(false);
      setCallPhase("ended", "연결이 끊어졌어요.");
    }
  };

  dc.onopen = () => {
    setConnected(true);
  };

  dc.onmessage = (message) => {
    try {
      handleRealtimeEvent(JSON.parse(message.data));
    } catch {}
  };

  dc.onerror = () => {
    appendConversation("system", "연결 중 문제가 생겼습니다.");
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const config = collectConfig();
  const response = await fetch("/api/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      apiKey,
      offerSdp: offer.sdp,
      config: {
        model: config.model,
        personaName: config.personaName,
        voice: config.voice,
        speed: config.speed,
        responseLength: "short",
        pacing: "balanced",
        turnMode: "auto",
        reasoningEffort: "low",
        identity: "",
        style: "",
        relationship: "아이와 작품 이야기를 나누는 작가",
        guardrails: config.personaPrompt,
        personaPrompt: config.personaPrompt,
      },
    }),
  });

  if (!response.ok) {
    let errorMessage = "세션 연결에 실패했어요.";
    const rawBody = await response.text();

    try {
      const payload = JSON.parse(rawBody);
      errorMessage = normalizeUiErrorMessage(payload.error || payload.message);
    } catch {
      errorMessage = normalizeUiErrorMessage(rawBody);
    }

    throw new Error(errorMessage);
  }

  const payload = await response.json();
  await pc.setRemoteDescription({
    type: "answer",
    sdp: payload.answerSdp,
  });

  sendEvent({
    type: "session.update",
    session: {
      type: "realtime",
      instructions: buildInstructions(config),
      output_modalities: ["audio", "text"],
      audio: {
        input: {
          turn_detection:
            state.inputMode === "audio"
              ? {
                  type: "semantic_vad",
                  interrupt_response: true,
                  create_response: true,
                }
              : null,
        },
        output: {
          voice: config.voice,
          speed: config.speed,
        },
      },
    },
  });
}

function disconnectSession() {
  disconnectSessionWithOptions();
}

function disconnectSessionWithOptions(options = {}) {
  stopRingbackTone();
  stopEffectTone();
  state.callStarting = false;

  if (state.dc) {
    state.dc.close();
  }

  if (state.pc) {
    for (const sender of state.pc.getSenders()) {
      try {
        if (sender.track) {
          sender.track.stop();
        }
        state.pc.removeTrack(sender);
      } catch {}
    }
  }

  if (state.pc) {
    state.pc.close();
  }

  if (state.stream) {
    for (const track of state.stream.getTracks()) {
      track.enabled = false;
      track.stop();
    }
  }

  try {
    els.remoteAudio.pause();
  } catch {}

  els.remoteAudio.srcObject = null;
  els.remoteAudio.removeAttribute("src");
  els.remoteAudio.load();

  state.pc = null;
  state.dc = null;
  state.stream = null;
  state.assistantDraftText = "";
  setInputMode("audio");
  state.connected = false;
  refreshCallControls();
  setCallPhase(options.keepReady ? "idle" : "ended");

  if (!options.quiet) {
    appendConversation("system", "통화가 종료되었습니다.");
  }
}

async function startPhoneCallFlow() {
  const apiKey = els.apiKey.value.trim();
  const phoneNumber = formatPhoneNumber(els.phoneNumber.value);

  if (!apiKey) {
    appendConversation("system", "설정 탭에서 API 키를 먼저 넣어 주세요.");
    switchTab("settings");
    return;
  }

  if (!phoneNumber) {
    appendConversation("system", "전화번호를 먼저 입력해 주세요.");
    return;
  }

  if (state.callStarting || state.connected) {
    return;
  }

  state.callStarting = true;
  switchTab("conversation");
  saveSettings();
  refreshCallControls();
  setCallPhase("dialing", `${phoneNumber}로 전화를 거는 중이에요.`);
  appendConversation("system", `${els.friendNamePreview.textContent} 작가에게 전화를 걸고 있어요.`);

  try {
    await playRingbackTone();
  } catch {}

  state.callTimer = window.setTimeout(() => {
    setCallPhase("ringing", "뚜르르... 작가가 전화를 받고 있어요.");

    state.callTimer = window.setTimeout(async () => {
      stopRingbackTone();
      setCallPhase("ringing", "작가가 전화를 받았습니다. 곧 대화가 시작됩니다.");
      appendConversation("system", `${els.friendNamePreview.textContent} 작가가 전화를 받는 중입니다.`);

      try {
        await playPickupTone();
        await connectSession();
      } catch (error) {
        disconnectSessionWithOptions({ quiet: true, keepReady: true });
        appendConversation(
          "system",
          error instanceof Error ? normalizeUiErrorMessage(error.message) : "전화 연결에 실패했어요.",
        );
      } finally {
        state.callStarting = false;
      }
    }, 2200);
  }, 1200);
}

function sendTextMessage() {
  const text = els.textInput.value.trim();
  if (!text) return;

  sendEvent({
    type: "conversation.item.create",
    item: {
      type: "message",
      role: "user",
      content: [
        {
          type: "input_text",
          text,
        },
      ],
    },
  });
  sendEvent({ type: "response.create" });
  appendConversation("user", text, "글쓰기");
  els.textInput.value = "";
}

function triggerManualReply() {
  sendEvent({ type: "response.create" });
}

function bindEvents() {
  els.settingsTabButton.addEventListener("click", () => switchTab("settings"));
  els.conversationTabButton.addEventListener("click", () => switchTab("conversation"));
  els.saveSettingsButton.addEventListener("click", saveSettings);
  els.startConversationButton.addEventListener("click", moveToConversationTab);
  els.presetSelect.addEventListener("change", () => applyPreset(els.presetSelect.value));
  els.speed.addEventListener("input", renderSpeed);
  els.phoneNumber.addEventListener("input", updatePhonePreview);
  els.toggleApiKeyButton.addEventListener("click", toggleApiKeyVisibility);

  [els.apiKey, els.personaName, els.voice, els.speed, els.personaPrompt].forEach((element) => {
    element.addEventListener("change", () => {
      markSettingsDirty();
      saveSettings();
    });
    element.addEventListener("input", () => {
      markSettingsDirty();
      saveSettings();
      updateFriendPreview();
    });
  });

  els.phoneNumber.addEventListener("change", () => {
    markSettingsDirty();
    saveSettings();
  });

  els.connectButton.addEventListener("click", async () => {
    await startPhoneCallFlow();
  });

  els.disconnectButton.addEventListener("click", disconnectSession);
  els.endCallButton.addEventListener("click", disconnectSession);

  els.sendTextButton.addEventListener("click", () => {
    try {
      sendTextMessage();
    } catch (error) {
      appendConversation("system", error instanceof Error ? error.message : "글을 보내지 못했어요.");
    }
  });

  els.manualReplyButton.addEventListener("click", () => {
    try {
      triggerManualReply();
    } catch (error) {
      appendConversation("system", error instanceof Error ? error.message : "답장을 듣지 못했어요.");
    }
  });

  window.addEventListener("beforeunload", () => {
    if (state.settingsDirty) {
      saveSettings();
    }
  });

  window.addEventListener("pagehide", () => {
    disconnectSessionWithOptions({ quiet: true, keepReady: true });
  });
}

function boot() {
  initPresetOptions();
  setSettingsStatus("불러오는 중", "pending");
  loadSavedSettings();
  renderSpeed();
  updatePhonePreview();
  updateFriendPreview();
  updateApiKeyStatus();
  setCallPhase("idle");
  bindEvents();
  appendConversation("system", "작가를 정하고 전화번호를 누른 뒤 전화를 걸어 보세요.");
}

boot();
