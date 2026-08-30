import { GameModel, AVATAR_TARGET } from "./game.js";

const stage = document.querySelector("#stage");
const timer = document.querySelector("#timer");
const levelPill = document.querySelector("#level-pill");
const pauseButton = document.querySelector("#pause-button");
const soundButton = document.querySelector("#sound-button");
const levelHint = document.querySelector("#level-hint");
const toast = document.querySelector("#toast");
const model = new GameModel();
const faces = ["😐", "🤪", "😎", "🥴"];
let soundOn = true;
let lastView = "";
let toastTimer;

function beep(frequency = 440, duration = 0.07) {
  if (!soundOn) return;
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.05, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  } catch { /* звук необязателен */ }
}

function showToast(text) {
  if (!text) return;
  toast.textContent = text;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 1800);
}

function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function renderChrome(snapshot) {
  timer.textContent = formatTime(snapshot.remainingMs);
  timer.classList.toggle("danger", snapshot.remainingMs <= 10_000 && snapshot.status === "running");
  levelPill.textContent = `Уровень ${snapshot.level} / 3`;
  pauseButton.disabled = !["running", "paused"].includes(snapshot.status);
  pauseButton.textContent = snapshot.status === "paused" ? "▶" : "Ⅱ";
  pauseButton.setAttribute("aria-label", snapshot.status === "paused" ? "Продолжить" : "Пауза");
}

function intro() {
  levelHint.textContent = "Enter — начать";
  return `
    <div class="screen intro-screen">
      <div class="floaty floaty-one">🤖</div><div class="floaty floaty-two">🍌</div>
      <p class="eyebrow">СБОЙ В СМЕШНОЙ VR-ЛАБОРАТОРИИ</p>
      <h1>Спаси котопортал<br><span>за 60 секунд</span></h1>
      <p class="lead">Три комнаты. Один нервный холодильник. Подозрительно много бананов.</p>
      <button class="primary big" data-action="start">Надеть виртуальные очки <span>↗</span></button>
      <div class="mission-row">
        <span>① Эмоции</span><b>→</b><span>② Код</span><b>→</b><span>③ Портал</span>
      </div>
    </div>`;
}

function levelOne(snapshot) {
  levelHint.textContent = "Клавиши 1–3 — крутить эмоции";
  const targetFaces = AVATAR_TARGET.map((value) => faces[value]);
  return `
    <div class="screen puzzle-screen">
      <div class="level-title"><span>01</span><div><p>СИНХРОНИЗАЦИЯ АВАТАРОВ</p><h2>Повтори эмоции с плаката</h2></div></div>
      <div class="target-strip"><small>ПЛАКАТ ИНСТРУКТОРА</small>${targetFaces.map((face) => `<b>${face}</b>`).join("")}</div>
      <div class="avatar-grid">
        ${snapshot.avatars.map((value, index) => `<button class="avatar-card" data-avatar="${index}" aria-label="Аватар ${index + 1}: ${faces[value]}"><kbd>${index + 1}</kbd><span>${faces[value]}</span><small>КРУТИТЬ</small></button>`).join("")}
      </div>
      <button class="primary" data-action="check-avatars">Проверить строй</button>
    </div>`;
}

function levelTwo(snapshot) {
  levelHint.textContent = "Цифры, Backspace, Enter";
  return `
    <div class="screen puzzle-screen fridge-screen">
      <div class="level-title"><span>02</span><div><p>ГРАВИТАЦИОННЫЙ ХОЛОДИЛЬНИК</p><h2>Собери трёхзначный код</h2></div></div>
      <div class="fridge-layout">
        <div class="clues">
          <p><b>1.</b> Лап у утки в невесомости</p>
          <p><b>2.</b> Углов у квадратной пиццы</p>
          <p><b>3.</b> Глаз у местного пришельца <span class="alien">👽</span></p>
        </div>
        <div class="keypad-wrap">
          <div class="code-display" aria-label="Введённый код">${[0, 1, 2].map((i) => `<span>${snapshot.code[i] || "·"}</span>`).join("")}</div>
          <div class="keypad">${[1,2,3,4,5,6,7,8,9].map((n) => `<button data-digit="${n}">${n}</button>`).join("")}<button data-action="erase">⌫</button><button data-digit="0">0</button><button data-action="check-code">↵</button></div>
        </div>
      </div>
    </div>`;
}

function levelThree(snapshot) {
  levelHint.textContent = "Стрелки + Space — переключать";
  return `
    <div class="screen puzzle-screen portal-screen">
      <div class="level-title"><span>03</span><div><p>КОТОПОРТАЛ 3000</p><h2>Погаси все глючные клетки</h2></div></div>
      <p class="rule">Одна клетка переключает себя и соседей по кресту.</p>
      <div class="portal-wrap">
        <div class="portal-grid" role="grid" aria-label="Панель котопортала">
          ${snapshot.portal.map((on, index) => `<button role="gridcell" data-cell="${index}" class="portal-cell ${on ? "on" : ""} ${index === snapshot.selectedCell ? "selected" : ""}" aria-label="Клетка ${index + 1}, ${on ? "включена" : "выключена"}">${on ? "⚡" : "·"}</button>`).join("")}
        </div>
        <div class="portal-cat" aria-hidden="true">😾<small>МЯУ-ОШИБКА</small></div>
      </div>
    </div>`;
}

function pauseScreen() {
  return `<div class="overlay"><div class="modal"><span class="modal-icon">🧠</span><p class="eyebrow">МОЗГ НА ПЕРЕРЫВЕ</p><h2>Пауза</h2><p>Таймер тоже отдыхает. Он заслужил.</p><button class="primary" data-action="resume">Продолжить <kbd>P</kbd></button></div></div>`;
}

function terminal(snapshot) {
  const won = snapshot.status === "won";
  levelHint.textContent = "R — новая попытка";
  const seconds = Math.ceil(snapshot.remainingMs / 1000);
  return `<div class="screen end-screen ${won ? "win" : "lose"}">
    <div class="end-burst">${won ? "😸" : "🐹"}</div>
    <p class="eyebrow">${won ? "МИССИЯ ВЫПОЛНЕНА" : "ВРЕМЯ ВЫШЛО"}</p>
    <h1>${won ? `Кот спасён!<br><span>Осталось ${seconds} сек.</span>` : "Хомяк победил.<br><span>Пока что.</span>"}</h1>
    <p class="lead">${snapshot.message}</p>
    <button class="primary big" data-action="restart">Играть ещё раз <span>↻</span></button>
  </div>`;
}

function render(force = false) {
  const snapshot = model.snapshot();
  renderChrome(snapshot);
  const viewKey = `${snapshot.status}-${snapshot.level}-${snapshot.avatars.join("")}-${snapshot.code}-${snapshot.portal.join("")}-${snapshot.selectedCell}`;
  if (!force && viewKey === lastView) return;
  lastView = viewKey;
  if (snapshot.status === "idle") stage.innerHTML = intro();
  else if (snapshot.status === "paused") stage.innerHTML = pauseScreen();
  else if (["won", "lost"].includes(snapshot.status)) stage.innerHTML = terminal(snapshot);
  else if (snapshot.level === 1) stage.innerHTML = levelOne(snapshot);
  else if (snapshot.level === 2) stage.innerHTML = levelTwo(snapshot);
  else stage.innerHTML = levelThree(snapshot);
}

function act(action, value) {
  const before = model.message;
  if (action === "start") { toast.textContent = ""; model.start(); beep(520); }
  if (action === "restart") { toast.textContent = ""; toast.classList.remove("visible"); model.reset(); model.start(); beep(520); }
  if (action === "pause") model.pause();
  if (action === "resume") model.resume();
  if (action === "avatar") { model.cycleAvatar(Number(value)); beep(300 + Number(value) * 90); }
  if (action === "check-avatars") { if (model.checkAvatars()) beep(720, .14); else beep(150, .16); }
  if (action === "digit") { model.addDigit(String(value)); beep(380 + Number(value) * 20); }
  if (action === "erase") model.eraseDigit();
  if (action === "check-code") { if (model.checkCode()) beep(760, .14); else beep(140, .16); }
  if (action === "cell") { model.togglePortal(Number(value)); beep(260 + Number(value) * 25); }
  if (model.message && model.message !== before) showToast(model.message);
  render(true);
}

stage.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.dataset.avatar !== undefined) act("avatar", target.dataset.avatar);
  else if (target.dataset.digit !== undefined) act("digit", target.dataset.digit);
  else if (target.dataset.cell !== undefined) act("cell", target.dataset.cell);
  else if (target.dataset.action) act(target.dataset.action);
});

pauseButton.addEventListener("click", () => act(model.status === "paused" ? "resume" : "pause"));
soundButton.addEventListener("click", () => {
  soundOn = !soundOn;
  soundButton.textContent = `Звук: ${soundOn ? "вкл" : "выкл"}`;
  soundButton.setAttribute("aria-pressed", String(soundOn));
  if (soundOn) beep(500);
});

document.addEventListener("keydown", (event) => {
  const used = ["KeyP", "Enter", "Space", "Backspace", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Digit0", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "KeyR"].includes(event.code);
  if (used) event.preventDefault();
  if (event.code === "KeyP" && ["running", "paused"].includes(model.status)) return act(model.status === "paused" ? "resume" : "pause");
  if (model.status === "idle" && event.code === "Enter") return act("start");
  if (["won", "lost"].includes(model.status) && event.code === "KeyR") return act("restart");
  if (model.status !== "running") return;
  if (model.level === 1 && /^Digit[1-3]$/.test(event.code)) return act("avatar", Number(event.code.at(-1)) - 1);
  if (model.level === 1 && event.code === "Enter") return act("check-avatars");
  if (model.level === 2 && /^Digit\d$/.test(event.code)) return act("digit", event.code.at(-1));
  if (model.level === 2 && event.code === "Backspace") return act("erase");
  if (model.level === 2 && event.code === "Enter") return act("check-code");
  if (model.level === 3 && ["Space", "Enter"].includes(event.code)) return act("cell", model.selectedCell);
  if (model.level === 3 && event.code.startsWith("Arrow")) {
    const moves = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    model.moveSelection(...moves[event.code]); render(true);
  }
});

function frame() {
  render();
  requestAnimationFrame(frame);
}
render(true);
requestAnimationFrame(frame);
