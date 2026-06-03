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
const desktopBridge = window.personaDesktop ?? null;

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
  startTextTestButton: document.querySelector("#startTextTestButton"),
  createDesktopShortcutButton: document.querySelector("#createDesktopShortcutButton"),
  desktopShortcutStatus: document.querySelector("#desktopShortcutStatus"),
  connectButton: document.querySelector("#connectButton"),
  connectTextTestButton: document.querySelector("#connectTextTestButton"),
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
  sessionConfigured: false,
  initialGreetingRequested: false,
  initialGreetingCompleted: false,
  awaitingResponse: false,
  responseAfterSpeechTimer: null,
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

function setDesktopShortcutStatus(label, tone = "pending") {
  if (!els.desktopShortcutStatus) return;

  els.desktopShortcutStatus.textContent = label;
  els.desktopShortcutStatus.style.background =
    tone === "saved" ? "#eefaf1" : tone === "error" ? "#fff1f1" : "#fff4bf";
  els.desktopShortcutStatus.style.color =
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

function setLocalAudioEnabled(enabled) {
  if (!state.stream) return;
  for (const track of state.stream.getAudioTracks()) {
    track.enabled = enabled;
  }
}

function refreshCallControls() {
  const callBusy =
    state.callStarting || state.connected || state.callPhase === "dialing" || state.callPhase === "ringing";

  els.connectButton.disabled = callBusy;
  if (els.connectTextTestButton) {
    els.connectTextTestButton.disabled = callBusy;
  }
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
      state.inputMode === "text"
        ? "텍스트 테스트 연결이 완료되었어요. 아래 글상자에 질문을 적어 페르소나가 잘 살아 있는지 확인해 보세요."
        : "마이크로 바로 말할 수 있습니다. 내가 말하면 작가가 실시간으로 듣고 답합니다.";
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

function clearConversationLog() {
  els.conversationLog.innerHTML = "";
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

function clearResponseAfterSpeechTimer() {
  if (state.responseAfterSpeechTimer) {
    window.clearTimeout(state.responseAfterSpeechTimer);
    state.responseAfterSpeechTimer = null;
  }
}

function requestAssistantResponse(instructions = "") {
  if (state.awaitingResponse) return;
  state.awaitingResponse = true;
  sendEvent(
    instructions
      ? {
          type: "response.create",
          response: { instructions },
        }
      : { type: "response.create" },
  );
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

function waitForDataChannelOpen(channel, timeoutMs = 10000) {
  if (!channel) {
    return Promise.reject(new Error("작가와 연결할 데이터 채널을 만들지 못했어요."));
  }

  if (channel.readyState === "open") {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let timeoutId = null;

    const cleanup = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      channel.removeEventListener("open", handleOpen);
      channel.removeEventListener("error", handleError);
      channel.removeEventListener("close", handleClose);
    };

    const finish = (callback) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };

    const handleOpen = () => finish(resolve);
    const handleError = () => finish(() => reject(new Error("작가와 연결하는 중 데이터 채널 오류가 발생했어요.")));
    const handleClose = () => finish(() => reject(new Error("작가와 연결되기 전에 데이터 채널이 닫혔어요.")));

    channel.addEventListener("open", handleOpen);
    channel.addEventListener("error", handleError);
    channel.addEventListener("close", handleClose);

    timeoutId = window.setTimeout(() => {
      finish(() => reject(new Error("작가와 연결이 너무 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.")));
    }, timeoutMs);
  });
}

function waitForIceGatheringComplete(peerConnection, timeoutMs = 4000) {
  if (!peerConnection) {
    return Promise.reject(new Error("통화 연결을 준비할 수 없어요."));
  }

  if (peerConnection.iceGatheringState === "complete") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    let timeoutId = null;

    const cleanup = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      peerConnection.removeEventListener("icegatheringstatechange", handleStateChange);
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };

    const handleStateChange = () => {
      if (peerConnection.iceGatheringState === "complete") {
        finish();
      }
    };

    peerConnection.addEventListener("icegatheringstatechange", handleStateChange);
    timeoutId = window.setTimeout(finish, timeoutMs);
  });
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

function describeMicrophoneError(error) {
  const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "마이크 권한이 거부되어 있어요. 브라우저 주소창의 마이크 권한을 허용으로 바꾼 뒤 다시 시도해 주세요.";
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "사용할 수 있는 마이크를 찾지 못했어요. 마이크가 연결되어 있는지 확인해 주세요.";
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    return "마이크를 다른 앱이 사용 중이거나 기기에서 읽을 수 없어요. 다른 통화 앱을 끄고 다시 시도해 주세요.";
  }

  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return "이 브라우저에서 마이크 설정을 맞추지 못했어요. 브라우저를 다시 열고 시도해 주세요.";
  }

  if (name === "SecurityError") {
    return "브라우저 보안 설정 때문에 마이크를 사용할 수 없어요. localhost 주소로 접속했는지 확인해 주세요.";
  }

  if (name === "AbortError") {
    return "마이크 연결이 중간에 취소되었어요. 다시 한 번 시도해 주세요.";
  }

  return "마이크를 켜지 못했어요. 브라우저와 macOS의 마이크 권한을 확인한 뒤 다시 시도해 주세요.";
}

function handleRealtimeEvent(event) {
  console.debug("[realtime event]", event.type, event);

  switch (event.type) {
    case "session.created":
      break;
    case "session.updated":
      state.sessionConfigured = true;
      if (!state.initialGreetingRequested) {
        state.initialGreetingRequested = true;
        requestAssistantResponse("통화가 연결되었다. 먼저 짧고 따뜻하게 인사하고, 아이가 무엇이 궁금한지 한 문장으로 물어봐라.");
      }
      break;
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
      state.awaitingResponse = false;
      state.assistantDraftText = "";
      if (state.connected && state.inputMode === "audio" && !state.initialGreetingCompleted) {
        state.initialGreetingCompleted = true;
        setLocalAudioEnabled(true);
        setCallPhase("connected", "작가 인사가 끝났어요. 이제 이야기해 보세요.");
      } else {
        setCallPhase(state.connected ? "connected" : "idle");
      }
      break;
    case "input_audio_buffer.speech_started":
      if (!state.initialGreetingCompleted) {
        return;
      }
      clearResponseAfterSpeechTimer();
      setStatus("내가 말하는 중");
      break;
    case "input_audio_buffer.speech_stopped":
      if (!state.initialGreetingCompleted) {
        return;
      }
      setStatus("작가가 듣는 중");
      break;
    case "conversation.item.input_audio_transcription.completed":
      if (state.initialGreetingCompleted && event.transcript) {
        appendConversation("user", event.transcript, "말하기");
      }
      break;
    case "error":
      state.awaitingResponse = false;
      appendConversation("system", event.error?.message || "오류가 생겼어요.");
      setStatus("오류");
      break;
    default:
      break;
  }
}

async function connectSession(preferredMode = "audio") {
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

  if (preferredMode === "audio") {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      setInputMode("audio");
    } catch (error) {
      setInputMode("audio");
      setStatus("마이크 권한 필요");
      throw new Error(describeMicrophoneError(error));
    }
  } else {
    setInputMode("text");
    setStatus("텍스트 테스트 준비 중");
  }

  state.pc = pc;
  state.dc = dc;
  state.stream = stream;
  state.assistantDraftText = "";
  state.sessionConfigured = false;
  state.initialGreetingRequested = false;
  state.initialGreetingCompleted = preferredMode === "text";
  state.awaitingResponse = false;
  clearResponseAfterSpeechTimer();

  els.remoteAudio.srcObject = new MediaStream();

  if (stream) {
    for (const track of stream.getAudioTracks()) {
      track.enabled = false;
    }
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
      if (state.inputMode === "text") {
        setCallPhase("connected");
      } else {
        setCallPhase("ringing", "작가가 먼저 인사하고 있어요. 인사가 끝나면 바로 이야기할 수 있어요.");
      }
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

  pc.oniceconnectionstatechange = () => {
    console.debug("[webrtc ice]", pc.iceConnectionState);
  };

  pc.onicegatheringstatechange = () => {
    console.debug("[webrtc gathering]", pc.iceGatheringState);
  };

  pc.onsignalingstatechange = () => {
    console.debug("[webrtc signaling]", pc.signalingState);
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIceGatheringComplete(pc);

  const config = collectConfig();
  const tokenResponse = await fetch("/api/realtime-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      apiKey,
      offerSdp: pc.localDescription?.sdp || offer.sdp,
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

  if (!tokenResponse.ok) {
    let errorMessage = "실시간 대화 토큰을 만들지 못했어요.";
    const rawBody = await tokenResponse.text();

    try {
      const payload = JSON.parse(rawBody);
      errorMessage = normalizeUiErrorMessage(payload.error || payload.message);
    } catch {
      errorMessage = normalizeUiErrorMessage(rawBody);
    }

    throw new Error(errorMessage);
  }

  const tokenPayload = await tokenResponse.json();
  const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenPayload.clientSecret}`,
      "Content-Type": "application/sdp",
    },
    body: pc.localDescription?.sdp || offer.sdp,
  });

  if (!sdpResponse.ok) {
    let errorMessage = "실시간 대화 연결에 실패했어요.";
    const rawBody = await sdpResponse.text();

    try {
      const payload = JSON.parse(rawBody);
      errorMessage = normalizeUiErrorMessage(payload.error || payload.message);
    } catch {
      errorMessage = normalizeUiErrorMessage(rawBody);
    }

    throw new Error(errorMessage);
  }

  const answerSdp = await sdpResponse.text();
  await pc.setRemoteDescription({
    type: "answer",
    sdp: answerSdp,
  });

  await waitForDataChannelOpen(dc);

  sendEvent({
    type: "session.update",
    session: {
      type: "realtime",
      instructions: buildInstructions(config),
      output_modalities: ["audio"],
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
  clearResponseAfterSpeechTimer();

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
  state.sessionConfigured = false;
  state.initialGreetingRequested = false;
  state.initialGreetingCompleted = false;
  state.awaitingResponse = false;
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
  clearConversationLog();

  try {
    await playRingbackTone();
  } catch {}

  state.callTimer = window.setTimeout(() => {
    setCallPhase("ringing", "뚜르르... 작가가 전화를 받고 있어요.");

    state.callTimer = window.setTimeout(async () => {
      stopRingbackTone();
      setCallPhase("ringing", "작가가 전화를 받았습니다. 곧 대화가 시작됩니다.");

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

async function startTextTestFlow() {
  const apiKey = els.apiKey.value.trim();

  if (!apiKey) {
    appendConversation("system", "설정 탭에서 API 키를 먼저 넣어 주세요.");
    switchTab("settings");
    return;
  }

  if (state.callStarting || state.connected) {
    return;
  }

  state.callStarting = true;
  switchTab("conversation");
  saveSettings();
  clearConversationLog();
  refreshCallControls();
  setCallPhase("dialing", "텍스트로 페르소나 테스트 연결을 준비하고 있어요.");

  try {
    await connectSession("text");
    setCallPhase("connected", "텍스트 테스트가 연결되었어요. 아래 입력창에 질문을 적어 보세요.");
    els.textInput.focus();
  } catch (error) {
    disconnectSessionWithOptions({ quiet: true, keepReady: true });
    appendConversation(
      "system",
      error instanceof Error ? normalizeUiErrorMessage(error.message) : "텍스트 테스트 연결에 실패했어요.",
    );
  } finally {
    state.callStarting = false;
    refreshCallControls();
  }
}

async function createDesktopShortcut() {
  setDesktopShortcutStatus("만드는 중...", "pending");

  try {
    if (desktopBridge?.isElectron) {
      const payload = await desktopBridge.createShortcut();
      setDesktopShortcutStatus("바탕화면에 생성됨", "saved");
      appendConversation("system", payload.message || "바탕화면에 바로가기를 만들었어요.");
      return;
    }

    const response = await fetch("/api/create-desktop-shortcut", {
      method: "POST",
    });

    const rawBody = await response.text();
    let payload = {};

    try {
      payload = JSON.parse(rawBody || "{}");
    } catch {
      payload = {};
    }

    if (!response.ok) {
      throw new Error(normalizeUiErrorMessage(payload.error || rawBody || "바탕화면 바로가기를 만들지 못했어요."));
    }

    setDesktopShortcutStatus("바탕화면에 생성됨", "saved");
    appendConversation("system", `바탕화면에 바로가기를 만들었어요. 이제 바탕화면의 "작가와의 대화" 아이콘으로 바로 시작할 수 있어요.`);
  } catch (error) {
    setDesktopShortcutStatus("만들기 실패", "error");
    appendConversation("system", error instanceof Error ? error.message : "바탕화면 바로가기를 만들지 못했어요.");
  }
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
  els.startTextTestButton?.addEventListener("click", async () => {
    await startTextTestFlow();
  });
  els.createDesktopShortcutButton?.addEventListener("click", async () => {
    await createDesktopShortcut();
  });
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
  els.connectTextTestButton?.addEventListener("click", async () => {
    await startTextTestFlow();
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
  setDesktopShortcutStatus("아직 만들지 않음", "pending");
}

boot();
