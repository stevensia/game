"use strict";

class FishGame {
  constructor(random = Math.random) {
    this.random = random;
    this.width = 1000;
    this.height = 560;
    this.goal = 110;
    this.reset();
  }

  reset() {
    this.state = "ready";
    this.eaten = 0;
    this.level = 1;
    this.elapsed = 0;
    this.player = { x: this.width * 0.245, y: 280, radius: 28, facing: 1 };
    this.companion = {
      kind: "remora",
      x: this.player.x - 72,
      y: this.player.y - 42,
      radius: 15,
      facing: 1
    };
    const smallCount = this.width < 700 ? 11 : 19;
    const schoolCount = this.width < 700 ? 1 : 2;
    const crabCount = this.width < 700 ? 2 : 3;
    const breamCount = this.width < 700 ? 2 : 3;
    const mediumCount = this.width < 700 ? 2 : 3;
    const total = smallCount + schoolCount + crabCount + breamCount + mediumCount + (this.width < 700 ? 1 : 2);
    this.fish = Array.from({ length: total }, (_, index) => {
      const kind = index < smallCount ? "small"
        : index < smallCount + schoolCount ? "school"
          : index < smallCount + schoolCount + crabCount ? "crab"
            : index < smallCount + schoolCount + crabCount + breamCount ? "bream"
              : index < smallCount + schoolCount + crabCount + breamCount + mediumCount ? "medium" : "big";
      return this.makeFish(kind, index);
    });
    Object.assign(this.fish[0], { x: this.width * 0.39, y: 280, baseY: 280, vx: -30, phase: 0 });
  }

  resize(width) {
    const ratio = width / this.width;
    this.width = width;
    if (this.state === "ready") {
      this.reset();
    } else {
      this.player.x *= ratio;
      this.companion.x *= ratio;
      for (const fish of this.fish) fish.x *= ratio;
      this.clampPlayer();
      this.clampCompanion();
    }
  }

  start() {
    this.reset();
    this.state = "playing";
  }

  pause() {
    if (this.state === "playing") this.state = "paused";
  }

  resume() {
    if (this.state === "paused") this.state = "playing";
  }

  makeFish(kind, index = 0, fromEdge = false) {
    const radius = kind === "big" ? 59 + this.random() * 8
      : kind === "medium" ? (index % 2 === 0 ? 34 : 44)
        : kind === "school" ? 22
        : kind === "crab" ? 18
        : kind === "bream" ? 20 + this.random() * 3
        : 13 + this.random() * 11;
    const direction = this.random() > 0.5 ? 1 : -1;
    let x = 65 + this.random() * (this.width - 130);
    const y = kind === "crab" ? 475 + this.random() * 16 : 90 + this.random() * 345;
    const safeDistance = kind === "big" ? Math.min(270, this.width * 0.45) : 145;
    if (Math.hypot(x - this.player.x, y - this.player.y) < safeDistance) {
      x = this.player.x < this.width / 2 ? this.width - radius * 1.5 : radius * 1.5;
    }
    if (fromEdge) x = direction === 1 ? -radius * 2 : this.width + radius * 2;
    return {
      kind, radius, x, y, baseY: y,
      vx: direction * (kind === "big" ? 22 + this.random() * 12
        : kind === "school" ? 45 + this.random() * 16
          : kind === "crab" ? 13 + this.random() * 9
            : kind === "bream" ? 25 + this.random() * 14 : 27 + this.random() * 23),
      phase: this.random() * Math.PI * 2,
      color: index % 4
    };
  }

  canEat(fish) {
    return fish.radius < this.player.radius;
  }

  clampPlayer() {
    const margin = this.player.radius * 1.9 + 5;
    this.player.x = Math.max(margin, Math.min(this.width - margin, this.player.x));
    this.player.y = Math.max(65, Math.min(this.height - this.player.radius - 38, this.player.y));
  }

  clampCompanion() {
    const margin = this.companion.radius * 1.8;
    this.companion.x = Math.max(margin, Math.min(this.width - margin, this.companion.x));
    this.companion.y = Math.max(50, Math.min(this.height - 70, this.companion.y));
  }

  updateCompanion(seconds) {
    const followDistance = this.player.radius * 2.15 + 18;
    const targetX = this.player.x - this.player.facing * followDistance;
    const targetY = this.player.y - this.player.radius * 0.82 + Math.sin(this.elapsed * 2.4) * 5;
    const follow = 1 - Math.exp(-5.5 * seconds);
    this.companion.x += (targetX - this.companion.x) * follow;
    this.companion.y += (targetY - this.companion.y) * follow;
    this.companion.facing = this.player.facing;
    this.clampCompanion();
  }

  touches(fish) {
    const dx = this.player.x - fish.x;
    const dy = this.player.y - fish.y;
    const sum = this.player.radius + fish.radius;
    return (dx / (sum * 1.04)) ** 2 + (dy / (sum * 0.68)) ** 2 < 1;
  }

  update(seconds, keys = new Set()) {
    if (this.state !== "playing") return [];
    const dt = Math.max(0, Math.min(Number.isFinite(seconds) ? seconds : 0, 0.05));
    if (dt === 0) return [];
    this.elapsed += dt;
    let dx = Number(keys.has("ArrowRight") || keys.has("KeyD")) - Number(keys.has("ArrowLeft") || keys.has("KeyA"));
    let dy = Number(keys.has("ArrowDown") || keys.has("KeyS")) - Number(keys.has("ArrowUp") || keys.has("KeyW"));
    const magnitude = Math.hypot(dx, dy);
    if (magnitude) {
      dx /= magnitude;
      dy /= magnitude;
      this.player.x += dx * 235 * dt;
      this.player.y += dy * 235 * dt;
      if (dx) this.player.facing = dx > 0 ? 1 : -1;
      this.clampPlayer();
    }
    this.updateCompanion(dt);

    const events = [];
    for (let index = 0; index < this.fish.length; index++) {
      const fish = this.fish[index];
      fish.x += fish.vx * dt;
      fish.y = fish.baseY + Math.sin(this.elapsed * (fish.kind === "crab" ? 2.2 : 1.25) + fish.phase) * (fish.kind === "crab" ? 3 : 16);
      if (fish.x < -fish.radius * 3) fish.x = this.width + fish.radius * 2;
      if (fish.x > this.width + fish.radius * 3) fish.x = -fish.radius * 2;
      if (!this.touches(fish)) continue;

      if (this.canEat(fish)) {
        const points = fish.kind === "school" ? 10 : fish.kind === "crab" ? 2 : 1;
        const amount = Math.min(points, this.goal - this.eaten);
        this.eaten += amount;
        events.push({ type: "eat", x: fish.x, y: fish.y, eaten: this.eaten, amount, kind: fish.kind });
        this.fish[index] = this.makeFish(fish.kind, index, true);
        const nextLevel = this.eaten >= 60 ? 4 : this.eaten >= 30 ? 3 : this.eaten >= 10 ? 2 : 1;
        if (nextLevel > this.level) {
          this.level = nextLevel;
          this.player.radius = [0, 28, 38, 48, 56][this.level];
          this.clampPlayer();
          events.push({ type: "grow", level: this.level, fromKind: fish.kind, amount });
        }
        if (this.eaten >= this.goal) {
          this.state = "won";
          events.push({ type: "win" });
          break;
        }
      } else {
        this.state = "lost";
        events.push({ type: "eaten", predator: fish.kind, score: this.eaten });
        break;
      }
    }
    return events;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { FishGame };
}

if (typeof document !== "undefined") {
  bootFishGame();
}

function bootFishGame() {
  const canvas = document.getElementById("ocean");
  const ctx = canvas.getContext("2d");
  const message = document.getElementById("game-message");
  if (!ctx) {
    message.textContent = "这个浏览器无法画出海底，请换用 Edge、Chrome、Firefox 或 Safari。";
    document.getElementById("play-button").disabled = true;
    return;
  }

  const game = new FishGame();
  const keys = new Set();
  const pointers = new Map();
  const overlay = document.getElementById("game-overlay");
  const playButton = document.getElementById("play-button");
  const pauseButton = document.getElementById("pause-button");
  const soundButton = document.getElementById("sound-button");
  const progress = document.getElementById("growth-progress");
  const stage = document.getElementById("ocean-stage");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const effects = [];
  let lastFrame = null;
  let decorativeTime = 0;
  let soundOn = false;
  let audio = null;
  let displayWidth = 1000;
  let displayHeight = 560;
  let renderScale = 1;
  let renderOffsetX = 0;
  let renderOffsetY = 0;
  let celebrationTimer = null;

  const palettes = [
    ["#94f1db", "#239f96", "#127177"],
    ["#9de4ff", "#3b99d4", "#27669c"],
    ["#c9d6ff", "#7b87d2", "#5559a5"],
    ["#d7f0a8", "#76b690", "#41836f"]
  ];

  function resizeCanvas() {
    const bounds = stage.getBoundingClientRect();
    displayWidth = bounds.width;
    displayHeight = bounds.height;
    const worldWidth = Math.max(480, Math.min(1000, displayWidth / displayHeight * game.height));
    if (Math.abs(worldWidth - game.width) > 0.01) game.resize(worldWidth);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(displayWidth * dpr);
    canvas.height = Math.round(displayHeight * dpr);
    renderScale = Math.min(displayWidth / game.width, displayHeight / game.height);
    renderOffsetX = (displayWidth - game.width * renderScale) / 2;
    renderOffsetY = (displayHeight - game.height * renderScale) / 2;
    draw();
  }

  function clearControls() {
    keys.clear();
    pointers.clear();
    document.querySelectorAll(".direction").forEach(button => button.classList.remove("pressed"));
  }

  function updateDashboard() {
    document.getElementById("eaten-count").textContent = game.eaten;
    document.getElementById("size-label").textContent = ["", "黄貂鱼宝宝", "成长黄貂鱼", "大黄貂鱼", "黄貂鱼之王"][game.level];
    const next = game.eaten < 10 ? 10 : game.eaten < 30 ? 30 : game.eaten < 60 ? 60 : 110;
    document.getElementById("growth-label").textContent = game.state === "won" ? "110条挑战完成！"
      : game.state === "lost" ? `本局吃到 ${game.eaten} 条`
        : game.eaten >= 60 ? `再吃 ${next - game.eaten} 条就成功` : `再吃 ${next - game.eaten} 条就长大`;
    document.getElementById("progress-fill").style.width = `${game.eaten / game.goal * 100}%`;
    progress.setAttribute("aria-valuenow", game.eaten);
    pauseButton.disabled = game.state === "ready" || game.state === "won" || game.state === "lost";
    pauseButton.innerHTML = game.state === "paused" ? "▶ <span>继续</span>" : "Ⅱ <span>暂停</span>";
  }

  function showOverlay(kind) {
    const content = {
      paused: ["⏸️", "海底等你回来", "休息一下，喝口水吧", "黄貂鱼和印鱼伙伴正在原地等你。<br>准备好后，就继续刚才的探险。", "继续探险", "点击继续，或按空格，就能接着玩。"],
      lost: ["🐟", "大鱼更加厉害", "哎呀，被大鱼吃掉啦！", `这次吃到了 ${game.eaten} 条小鱼。<br>印鱼伙伴会陪你躲开大鱼，再挑战一次！`, "再试一次", "记住：只吃带“能吃”标记的小鱼。"],
      won: ["🏆", "完成110条挑战", "你是黄貂鱼之王！", "你和印鱼伙伴一起吃到了 110 条小鱼！<br>真棒！沙丁鱼群也被你发现了。", "再玩一次", "新的110条挑战，随时都可以开始。"]
    }[kind];
    document.getElementById("overlay-badge").textContent = content[0];
    document.getElementById("overlay-eyebrow").textContent = content[1];
    document.getElementById("overlay-title").textContent = content[2];
    document.getElementById("overlay-description").innerHTML = content[3];
    playButton.textContent = content[4];
    document.getElementById("overlay-note").textContent = content[5];
    document.getElementById("welcome-rules").hidden = true;
    overlay.hidden = false;
  }

  function startRound() {
    clearControls();
    game.start();
    effects.length = 0;
    document.getElementById("celebration").replaceChildren();
    window.clearTimeout(celebrationTimer);
    overlay.hidden = true;
    message.textContent = "出发啦！印鱼伙伴会一直跟着你。小鱼和鲷鱼 +1，螃蟹 +2，沙丁鱼群 +10！";
    updateDashboard();
    canvas.focus({ preventScroll: true });
  }

  function setPause(paused, automatic = false) {
    clearControls();
    if (paused && game.state === "playing") {
      game.pause();
      showOverlay("paused");
      message.textContent = automatic ? "已帮你暂停。回来后点击“继续探险”，小鱼不会偷偷游走。" : "休息一下吧！点击“继续探险”或按空格，接着玩。";
    } else if (!paused && game.state === "paused") {
      game.resume();
      overlay.hidden = true;
      message.textContent = "欢迎回来！继续寻找比你小的小鱼吧。";
      canvas.focus({ preventScroll: true });
    }
    updateDashboard();
  }

  function sound(notes) {
    if (!soundOn || !audio) return;
    if (audio.state !== "running") {
      audio.resume().then(() => {
        if (soundOn) sound(notes);
      }).catch(reportAudioError);
      return;
    }
    notes.forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const time = audio.currentTime + index * 0.11;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.07, time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(time);
      oscillator.stop(time + 0.2);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  }

  function reportAudioError(error) {
    console.error("游戏音效无法启用：", error);
    soundOn = false;
    soundButton.setAttribute("aria-pressed", "false");
    soundButton.innerHTML = "♪ <span>音效：关</span>";
    message.textContent = "浏览器暂时无法播放音效，不过你仍然可以继续玩。";
  }

  function celebrate() {
    const container = document.getElementById("celebration");
    container.replaceChildren();
    if (reducedMotion) return;
    const colors = ["#ffce67", "#a4efd1", "#fff7e1", "#fa9cab", "#99d6fa"];
    for (let index = 0; index < 38; index++) {
      const piece = document.createElement("i");
      piece.className = "confetti";
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.backgroundColor = colors[index % colors.length];
      piece.style.animationDelay = `${Math.random() * 0.45}s`;
      container.append(piece);
    }
    celebrationTimer = window.setTimeout(() => container.replaceChildren(), 3100);
  }

  function handleEvents(events) {
    for (const event of events) {
      if (event.type === "eat") {
        effects.push({ x: event.x, y: event.y, time: 0.85, text: `+${event.amount}`, color: "#fff4b3" });
        message.textContent = event.kind === "school"
          ? `吃到沙丁鱼群啦！一次增加 ${event.amount} 条，现在有 ${event.eaten} 条。`
          : event.kind === "crab"
            ? `吃到海底螃蟹啦！增加 ${event.amount} 条，现在有 ${event.eaten} 条。`
            : event.kind === "bream"
              ? `吃到一条粉金色鲷鱼啦！现在有 ${event.eaten} 条。`
            : ["真棒，吃到一条！继续游呀游。", "啊呜！黄貂鱼正在慢慢长大。", "又找到一条小鱼！你真会探索。"][event.eaten % 3];
        sound(event.kind === "school" ? [523, 659, 784] : event.kind === "crab" ? [440, 660] : [620, 820]);
      } else if (event.type === "grow") {
        effects.push({ x: game.player.x, y: game.player.y - 35, time: 1.4, text: "长大啦！", color: "#fff4b3" });
        const growthMessages = {
          2: "长大啦！现在可以吃更多小鱼了，继续向 30 条前进！",
          3: "变成大黄貂鱼啦！再吃 30 条，就能成为黄貂鱼之王。",
          4: "你已经是黄貂鱼之王！再吃 50 条，就完成110条挑战。"
        };
        const bonusPrefix = event.fromKind === "school" ? `吃到沙丁鱼群，增加 ${event.amount} 条！`
          : event.fromKind === "crab" ? `吃到螃蟹，增加 ${event.amount} 条！`
            : event.fromKind === "bream" ? "吃到鲷鱼啦！" : "";
        message.textContent = `${bonusPrefix}${growthMessages[event.level]}`;
        sound([523, 659, 784]);
      } else if (event.type === "eaten") {
        clearControls();
        effects.length = 0;
        showOverlay("lost");
        message.textContent = `被大鱼吃掉啦！这次吃到 ${event.score} 条。只吃有“能吃”标记的鱼，再试一次吧！`;
        sound([440, 330, 220]);
        playButton.focus({ preventScroll: true });
      } else if (event.type === "win") {
        clearControls();
        effects.length = 0;
        showOverlay("won");
        celebrate();
        message.textContent = "110条挑战成功！你吃到了 110 条小鱼，成为黄貂鱼之王！";
        sound([523, 659, 784, 1047]);
        playButton.focus({ preventScroll: true });
      }
    }
    if (events.length) updateDashboard();
  }

  function ellipse(x, y, rx, ry, color) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawBackground(time) {
    ctx.save();
    ctx.scale(game.width / 1000, 1);
    const gradient = ctx.createLinearGradient(0, 0, 0, game.height);
    gradient.addColorStop(0, "#64cad4");
    gradient.addColorStop(0.42, "#269fb8");
    gradient.addColorStop(1, "#096e91");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1000, game.height);

    for (let index = 0; index < 5; index++) {
      const x = 85 + index * 220;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 75, 0);
      ctx.lineTo(x + 230, game.height);
      ctx.lineTo(x - 50, game.height);
      ctx.closePath();
      ctx.fillStyle = "#d8fff00b";
      ctx.fill();
    }

    ctx.lineWidth = 2;
    for (let index = 0; index < 22; index++) {
      const x = (index * 137 + 27) % 1000 + Math.sin(time * 0.5 + index) * 12;
      const y = 560 - ((index * 83 + time * (12 + index % 5)) % 600);
      const radius = 2 + index % 5;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "#c8f9fb40";
      ctx.stroke();
      ellipse(x - radius * 0.3, y - radius * 0.3, 1, 1, "#ecffff66");
    }

    for (let index = 0; index < 6; index++) {
      const x = (index * 177 + time * 8) % 1150 - 70;
      drawSilhouette(x, 125 + index % 3 * 80, 9 + index % 2 * 4);
    }

    ctx.beginPath();
    ctx.moveTo(0, 525);
    ctx.bezierCurveTo(170, 486, 300, 556, 540, 519);
    ctx.bezierCurveTo(700, 491, 850, 517, 1000, 499);
    ctx.lineTo(1000, 560);
    ctx.lineTo(0, 560);
    ctx.closePath();
    ctx.fillStyle = "#e6d49b";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 550);
    ctx.bezierCurveTo(250, 512, 420, 579, 685, 537);
    ctx.bezierCurveTo(840, 520, 920, 550, 1000, 535);
    ctx.lineTo(1000, 560);
    ctx.lineTo(0, 560);
    ctx.closePath();
    ctx.fillStyle = "#f3e3b4";
    ctx.fill();

    for (const [x, size] of [[40, 85], [92, 60], [850, 66], [931, 99], [975, 65]]) drawPlant(x, 535, size, time);
    drawCoral(155, 532, 0.7, "#eb9caa");
    drawCoral(810, 529, 0.9, "#efaa95");
    drawStar(345, 543, 12, "#d69b68");
    drawStar(747, 543, 9, "#e0ad73");
    ellipse(610, 545, 18, 5, "#c2b78f");
    ellipse(620, 543, 11, 5, "#e9dec0");
    ellipse(240, 542, 9, 4, "#c6bc94");
    ctx.restore();
  }

  function drawSilhouette(x, y, radius) {
    ellipse(x, y, radius, radius * 0.45, "#06678224");
    ctx.beginPath();
    ctx.moveTo(x - radius * 0.7, y);
    ctx.lineTo(x - radius * 1.6, y - radius * 0.5);
    ctx.lineTo(x - radius * 1.6, y + radius * 0.5);
    ctx.fillStyle = "#06678224";
    ctx.fill();
  }

  function drawPlant(x, y, size, time) {
    ctx.lineCap = "round";
    for (let index = 0; index < 4; index++) {
      const height = size * (0.6 + index * 0.13);
      const sway = Math.sin(time * 1.3 + index + x) * 8;
      ctx.beginPath();
      ctx.moveTo(x + index * 6, y);
      ctx.bezierCurveTo(x - 15 + index * 7, y - height * 0.4, x + 20 + sway, y - height * 0.7, x + index * 5 + sway, y - height);
      ctx.strokeStyle = ["#218f85", "#3ba59b", "#66bab0", "#81c6a7"][index];
      ctx.lineWidth = 7 - index;
      ctx.stroke();
    }
  }

  function drawCoral(x, y, scale, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.lineWidth = 10;
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    for (const branch of [[0, 0, 0, -53], [0, -24, -22, -41], [-22, -41, -23, -59], [0, -35, 21, -51], [21, -51, 21, -67]]) {
      ctx.beginPath();
      ctx.moveTo(branch[0], branch[1]);
      ctx.lineTo(branch[2], branch[3]);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawStar(x, y, radius, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.3);
    ctx.beginPath();
    for (let index = 0; index < 10; index++) {
      const angle = index * Math.PI / 5 - Math.PI / 2;
      const r = index % 2 ? radius * 0.43 : radius;
      ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r * 0.65);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function drawStingrayBody(radius, palette, tailSway) {
    const wingWave = tailSway * radius * 1.8;

    ctx.save();
    ctx.rotate(tailSway * 0.35);
    ctx.beginPath();
    ctx.moveTo(-radius * 0.5, 0);
    ctx.bezierCurveTo(-radius * 0.95, -radius * 0.06, -radius * 1.35, radius * 0.12, -radius * 1.82, radius * 0.06);
    ctx.strokeStyle = "#bd8617";
    ctx.lineWidth = Math.max(2, radius * 0.11);
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-radius * 1.45, radius * 0.08);
    ctx.lineTo(-radius * 1.72, -radius * 0.14);
    ctx.lineTo(-radius * 1.6, radius * 0.16);
    ctx.closePath();
    ctx.fillStyle = "#c38b18";
    ctx.fill();
    ctx.restore();

    const gradient = ctx.createRadialGradient(radius * 0.25, -radius * 0.15, radius * 0.12, 0, 0, radius * 1.2);
    gradient.addColorStop(0, palette[0]);
    gradient.addColorStop(0.58, palette[1]);
    gradient.addColorStop(1, palette[2]);
    ctx.beginPath();
    ctx.moveTo(radius * 1.12, 0);
    ctx.bezierCurveTo(radius * 0.72, -radius * 0.2, radius * 0.28, -radius * 0.82, -radius * 0.1, -radius * 1.02 + wingWave);
    ctx.bezierCurveTo(-radius * 0.38, -radius * 1.08 + wingWave, -radius * 0.67, -radius * 0.62, -radius * 0.72, -radius * 0.18);
    ctx.quadraticCurveTo(-radius * 0.82, 0, -radius * 0.72, radius * 0.18);
    ctx.bezierCurveTo(-radius * 0.67, radius * 0.62, -radius * 0.38, radius * 1.08 - wingWave, -radius * 0.1, radius * 1.02 - wingWave);
    ctx.bezierCurveTo(radius * 0.28, radius * 0.82, radius * 0.72, radius * 0.2, radius * 1.12, 0);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-radius * 0.48, 0);
    ctx.quadraticCurveTo(radius * 0.08, -radius * 0.54, radius * 0.93, 0);
    ctx.quadraticCurveTo(radius * 0.08, radius * 0.54, -radius * 0.48, 0);
    ctx.fillStyle = "#ffe875";
    ctx.fill();

    for (const [x, y, size] of [[-0.25, -0.52, 0.1], [-0.38, 0.48, 0.08], [0.02, 0.63, 0.07], [0.08, -0.67, 0.07]]) {
      ellipse(radius * x, radius * y, radius * size, radius * size * 0.7, "#e1a91f88");
    }

    ellipse(radius * 0.43, -radius * 0.25, radius * 0.16, radius * 0.14, "#fffdf0");
    ellipse(radius * 0.48, -radius * 0.24, radius * 0.07, radius * 0.075, "#173e53");
    ellipse(radius * 0.51, -radius * 0.28, radius * 0.025, radius * 0.025, "#ffffff");
    ellipse(radius * 0.43, radius * 0.25, radius * 0.16, radius * 0.14, "#fffdf0");
    ellipse(radius * 0.48, radius * 0.24, radius * 0.07, radius * 0.075, "#173e53");
    ellipse(radius * 0.51, radius * 0.2, radius * 0.025, radius * 0.025, "#ffffff");
    ellipse(radius * 0.72, radius * 0.26, radius * 0.12, radius * 0.07, "#f3a88d");

    ctx.beginPath();
    ctx.moveTo(radius * 0.72, 0);
    ctx.quadraticCurveTo(radius * 0.88, radius * 0.16, radius * 1.01, 0);
    ctx.strokeStyle = "#795518";
    ctx.lineWidth = Math.max(1.5, radius * 0.045);
    ctx.lineCap = "round";
    ctx.stroke();
  }

  function drawSardineSchool(radius, tailSway) {
    const sardines = [
      [-0.72, -0.5], [-0.15, -0.58], [0.45, -0.42],
      [-0.98, -0.05], [-0.4, 0], [0.18, -0.02], [0.78, 0.06],
      [-0.7, 0.48], [-0.08, 0.5], [0.52, 0.43]
    ];
    const size = radius * 0.27;
    for (let index = 0; index < sardines.length; index++) {
      const [x, y] = sardines[index];
      ctx.save();
      ctx.translate(x * radius, y * radius + Math.sin(decorativeTime * 3 + index) * radius * 0.04);
      ctx.rotate(tailSway * (index % 2 ? -0.5 : 0.5));
      ctx.beginPath();
      ctx.moveTo(-size * 0.7, 0);
      ctx.lineTo(-size * 1.45, -size * 0.55);
      ctx.lineTo(-size * 1.45, size * 0.55);
      ctx.closePath();
      ctx.fillStyle = "#4d8fb0";
      ctx.fill();
      const gradient = ctx.createLinearGradient(0, -size, 0, size);
      gradient.addColorStop(0, "#d8f5f3");
      gradient.addColorStop(0.48, "#79bed0");
      gradient.addColorStop(1, "#3a82a7");
      ellipse(0, 0, size, size * 0.43, gradient);
      ellipse(size * 0.58, -size * 0.1, size * 0.12, size * 0.14, "#fffdf0");
      ellipse(size * 0.62, -size * 0.1, size * 0.05, size * 0.06, "#173e53");
      ctx.restore();
    }
  }

  function drawCrab(radius, legWave) {
    ctx.strokeStyle = "#bd5727";
    ctx.lineWidth = Math.max(2, radius * 0.13);
    ctx.lineCap = "round";
    for (let index = 0; index < 3; index++) {
      const x = (-0.52 + index * 0.4) * radius;
      const step = Math.sin(decorativeTime * 5 + index) * radius * 0.1;
      ctx.beginPath();
      ctx.moveTo(x, radius * 0.25);
      ctx.lineTo(x - radius * 0.28, radius * 0.7 + step);
      ctx.lineTo(x - radius * 0.48, radius * 0.78 - step);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, radius * 0.25);
      ctx.lineTo(x + radius * 0.22, radius * 0.68 - step);
      ctx.lineTo(x + radius * 0.4, radius * 0.76 + step);
      ctx.stroke();
    }

    ctx.save();
    ctx.rotate(legWave * 0.35);
    ctx.beginPath();
    ctx.moveTo(radius * 0.62, -radius * 0.2);
    ctx.lineTo(radius * 1.02, -radius * 0.55);
    ctx.stroke();
    ellipse(radius * 1.12, -radius * 0.62, radius * 0.28, radius * 0.2, "#ef7c37");
    ctx.beginPath();
    ctx.moveTo(radius * 1.08, -radius * 0.64);
    ctx.lineTo(radius * 1.35, -radius * 0.88);
    ctx.lineTo(radius * 1.24, -radius * 0.56);
    ctx.closePath();
    ctx.fillStyle = "#b94c25";
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(radius * 0.62, radius * 0.1);
    ctx.lineTo(radius * 1.02, radius * 0.42);
    ctx.stroke();
    ellipse(radius * 1.12, radius * 0.48, radius * 0.28, radius * 0.2, "#ef7c37");
    ctx.beginPath();
    ctx.moveTo(radius * 1.08, radius * 0.5);
    ctx.lineTo(radius * 1.35, radius * 0.72);
    ctx.lineTo(radius * 1.24, radius * 0.42);
    ctx.closePath();
    ctx.fillStyle = "#b94c25";
    ctx.fill();

    const shell = ctx.createLinearGradient(0, -radius, 0, radius);
    shell.addColorStop(0, "#ffb04f");
    shell.addColorStop(0.6, "#ef7835");
    shell.addColorStop(1, "#c65328");
    ellipse(0, 0, radius * 0.82, radius * 0.55, shell);
    ctx.beginPath();
    ctx.arc(0, radius * 0.02, radius * 0.48, Math.PI * 1.12, Math.PI * 1.88);
    ctx.strokeStyle = "#c75a29";
    ctx.lineWidth = Math.max(1.5, radius * 0.07);
    ctx.stroke();

    ctx.strokeStyle = "#bd5727";
    ctx.lineWidth = Math.max(1.5, radius * 0.08);
    ctx.beginPath();
    ctx.moveTo(radius * 0.18, -radius * 0.36);
    ctx.lineTo(radius * 0.2, -radius * 0.68);
    ctx.moveTo(radius * 0.5, -radius * 0.3);
    ctx.lineTo(radius * 0.58, -radius * 0.58);
    ctx.stroke();
    ellipse(radius * 0.2, -radius * 0.7, radius * 0.15, radius * 0.16, "#fffdf0");
    ellipse(radius * 0.23, -radius * 0.7, radius * 0.065, radius * 0.075, "#173e53");
    ellipse(radius * 0.58, -radius * 0.6, radius * 0.15, radius * 0.16, "#fffdf0");
    ellipse(radius * 0.61, -radius * 0.6, radius * 0.065, radius * 0.075, "#173e53");
    ctx.beginPath();
    ctx.moveTo(radius * 0.17, radius * 0.16);
    ctx.quadraticCurveTo(radius * 0.38, radius * 0.36, radius * 0.58, radius * 0.13);
    ctx.strokeStyle = "#7d351d";
    ctx.lineWidth = Math.max(1.5, radius * 0.06);
    ctx.stroke();
  }

  function drawSeaBream(radius, palette, tailSway) {
    ctx.save();
    ctx.translate(-radius * 0.78, 0);
    ctx.rotate(tailSway);
    ctx.beginPath();
    ctx.moveTo(radius * 0.08, 0);
    ctx.lineTo(-radius * 0.72, -radius * 0.62);
    ctx.quadraticCurveTo(-radius * 0.5, 0, -radius * 0.72, radius * 0.62);
    ctx.closePath();
    ctx.fillStyle = palette[2];
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(-radius * 0.45, -radius * 0.45);
    for (let index = 0; index < 5; index++) {
      const x = (-0.35 + index * 0.19) * radius;
      ctx.lineTo(x, -radius * (0.92 - index * 0.035));
      ctx.lineTo(x + radius * 0.1, -radius * 0.47);
    }
    ctx.lineTo(radius * 0.55, -radius * 0.37);
    ctx.closePath();
    ctx.fillStyle = "#d86f6e";
    ctx.fill();

    const gradient = ctx.createLinearGradient(0, -radius, 0, radius);
    gradient.addColorStop(0, palette[0]);
    gradient.addColorStop(0.52, palette[1]);
    gradient.addColorStop(1, palette[2]);
    ellipse(0, 0, radius * 1.08, radius * 0.76, gradient);
    ctx.beginPath();
    ctx.moveTo(-radius * 0.3, radius * 0.24);
    ctx.lineTo(radius * 0.02, radius * 0.82);
    ctx.quadraticCurveTo(radius * 0.38, radius * 0.48, radius * 0.25, radius * 0.18);
    ctx.closePath();
    ctx.fillStyle = "#de7b63";
    ctx.fill();

    ctx.strokeStyle = "#e09a68";
    ctx.lineWidth = Math.max(1, radius * 0.035);
    for (let row = -1; row <= 1; row++) {
      for (let column = -2; column <= 1; column++) {
        ctx.beginPath();
        ctx.arc(column * radius * 0.23, row * radius * 0.2, radius * 0.11, -0.9, 0.9);
        ctx.stroke();
      }
    }

    ellipse(radius * 0.6, -radius * 0.2, radius * 0.2, radius * 0.22, "#fffdf0");
    ellipse(radius * 0.67, -radius * 0.19, radius * 0.085, radius * 0.11, "#173e53");
    ellipse(radius * 0.7, -radius * 0.24, radius * 0.03, radius * 0.035, "#ffffff");
    ellipse(radius * 0.51, radius * 0.16, radius * 0.13, radius * 0.075, "#f6a29a");
    ctx.beginPath();
    ctx.moveTo(radius * 0.8, radius * 0.17);
    ctx.quadraticCurveTo(radius * 0.98, radius * 0.31, radius * 1.08, radius * 0.13);
    ctx.strokeStyle = "#70454a";
    ctx.lineWidth = Math.max(1.5, radius * 0.045);
    ctx.lineCap = "round";
    ctx.stroke();
  }

  function drawRemora(remora) {
    const radius = remora.radius;
    const tailSway = reducedMotion ? 0 : Math.sin(decorativeTime * 7 + remora.x / 45) * 0.12;
    ctx.save();
    ctx.translate(remora.x, remora.y);
    ctx.scale(remora.facing, 1);

    ctx.save();
    ctx.translate(-radius * 1.05, 0);
    ctx.rotate(tailSway);
    ctx.beginPath();
    ctx.moveTo(radius * 0.1, 0);
    ctx.lineTo(-radius * 0.78, -radius * 0.58);
    ctx.lineTo(-radius * 0.62, 0);
    ctx.lineTo(-radius * 0.78, radius * 0.58);
    ctx.closePath();
    ctx.fillStyle = "#315e72";
    ctx.fill();
    ctx.restore();

    const body = ctx.createLinearGradient(0, -radius, 0, radius);
    body.addColorStop(0, "#b9e5df");
    body.addColorStop(0.52, "#629baa");
    body.addColorStop(1, "#315e72");
    ellipse(0, 0, radius * 1.55, radius * 0.58, body);

    ctx.beginPath();
    ctx.moveTo(-radius * 0.35, radius * 0.15);
    ctx.lineTo(radius * 0.2, radius * 0.78);
    ctx.lineTo(radius * 0.5, radius * 0.18);
    ctx.closePath();
    ctx.fillStyle = "#477f91";
    ctx.fill();

    ellipse(radius * 0.28, -radius * 0.53, radius * 0.72, radius * 0.2, "#d8f2e9");
    ctx.strokeStyle = "#397080";
    ctx.lineWidth = Math.max(1, radius * 0.075);
    for (let index = -3; index <= 3; index++) {
      ctx.beginPath();
      ctx.moveTo((index * radius * 0.17) + radius * 0.28, -radius * 0.67);
      ctx.lineTo((index * radius * 0.17) + radius * 0.28, -radius * 0.4);
      ctx.stroke();
    }

    ellipse(radius * 0.92, -radius * 0.14, radius * 0.2, radius * 0.22, "#fffdf0");
    ellipse(radius * 0.99, -radius * 0.13, radius * 0.085, radius * 0.1, "#173e53");
    ellipse(radius * 1.02, -radius * 0.18, radius * 0.03, radius * 0.035, "#ffffff");
    ctx.beginPath();
    ctx.moveTo(radius * 1.02, radius * 0.17);
    ctx.quadraticCurveTo(radius * 1.18, radius * 0.3, radius * 1.34, radius * 0.13);
    ctx.strokeStyle = "#234b5c";
    ctx.lineWidth = Math.max(1.5, radius * 0.06);
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();

    const labelY = remora.y - radius - 18;
    tag(remora.x, labelY >= 12 ? labelY : remora.y + radius + 18, "印鱼伙伴", "#ddf7ee", "#285f69", game.width < 700 ? 14 : 12);
  }

  function drawFish(fish, player = false) {
    const radius = fish.radius;
    const facing = player ? fish.facing : fish.vx > 0 ? 1 : -1;
    const palette = player ? ["#fff7a8", "#ffd74a", "#e4aa1d"]
      : fish.kind === "big" ? ["#c0b2e9", "#8c78bc", "#645488"]
        : fish.kind === "school" ? ["#d8f5f3", "#79bed0", "#3a82a7"]
          : fish.kind === "crab" ? ["#ffb04f", "#ef7835", "#c65328"]
            : fish.kind === "bream" ? ["#ffe5a3", "#f5a271", "#cf626d"] : palettes[fish.color];
    const tailSway = reducedMotion ? 0 : Math.sin(decorativeTime * 8 + fish.x / 60) * 0.09;
    ctx.save();
    ctx.translate(fish.x, fish.y);
    ctx.scale(facing, 1);
    if (player) {
      drawStingrayBody(radius, palette, tailSway);
    } else if (fish.kind === "school") {
      drawSardineSchool(radius, tailSway);
    } else if (fish.kind === "crab") {
      drawCrab(radius, tailSway);
    } else if (fish.kind === "bream") {
      drawSeaBream(radius, palette, tailSway);
    } else {
      drawFishBody(radius, palette, tailSway);
    }
    ctx.restore();

    if (player) {
      const labelY = fish.y - radius * 1.08 - 16;
      tag(fish.x, labelY >= 12 ? labelY : fish.y + radius + 18, "你", "#fff5d6", "#785119", 19);
    } else if (fish.kind === "school") {
      tag(fish.x, fish.y - radius * 0.95 - 15, "沙丁鱼群 +10", "#d8f8f3", "#216679", game.width < 700 ? 14 : 11);
    } else if (fish.kind === "crab") {
      tag(fish.x, fish.y - radius * 0.9 - 15, "螃蟹 +2", "#fff0d5", "#8c3e1e", game.width < 700 ? 15 : 12);
    } else if (fish.kind === "bream") {
      tag(fish.x, fish.y - radius * 0.85 - 15, "鲷鱼 +1", "#fff0dd", "#8b4b50", game.width < 700 ? 15 : 12);
    } else {
      const edible = game.canEat(fish);
      tag(fish.x, fish.y - radius * 0.75 - 15, edible ? "✓ 能吃" : "大鱼", edible ? "#def8de" : "#efdeff", edible ? "#235f4a" : "#674d87", game.width < 700 ? 16 : 12);
    }
  }

  function drawFishBody(radius, palette, tailSway) {
    ctx.save();
    ctx.translate(-radius * 0.8, 0);
    ctx.rotate(tailSway);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-radius * 0.5, -radius * 0.3, -radius * 0.83, -radius * 0.58);
    ctx.quadraticCurveTo(-radius * 0.62, 0, -radius * 0.83, radius * 0.58);
    ctx.quadraticCurveTo(-radius * 0.5, radius * 0.3, 0, 0);
    ctx.fillStyle = palette[2];
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(-radius * 0.4, -radius * 0.48);
    ctx.quadraticCurveTo(-radius * 0.15, -radius * 1.1, radius * 0.35, -radius * 0.53);
    ctx.fillStyle = palette[2];
    ctx.fill();

    const gradient = ctx.createLinearGradient(0, -radius * 0.7, 0, radius * 0.7);
    gradient.addColorStop(0, palette[0]);
    gradient.addColorStop(0.7, palette[1]);
    gradient.addColorStop(1, palette[2]);
    ellipse(0, 0, radius * 1.12, radius * 0.72, gradient);
    ellipse(-radius * 0.22, radius * 0.16, radius * 0.26, radius * 0.2, `${palette[2]}80`);
    ellipse(radius * 0.59, -radius * 0.21, radius * 0.23, radius * 0.25, "#fffdf0");
    ellipse(radius * 0.66, -radius * 0.2, radius * 0.1, radius * 0.13, "#173e53");
    ellipse(radius * 0.69, -radius * 0.26, radius * 0.035, radius * 0.04, "#ffffff");
    ctx.beginPath();
    ctx.moveTo(radius * 0.75, radius * 0.2);
    ctx.quadraticCurveTo(radius * 0.94, radius * 0.38, radius * 1.04, radius * 0.16);
    ctx.strokeStyle = "#294e68";
    ctx.lineWidth = Math.max(1.5, radius * 0.045);
    ctx.lineCap = "round";
    ctx.stroke();
  }

  function tag(x, y, text, background, color, size) {
    ctx.save();
    ctx.font = `700 ${size}px "Microsoft YaHei", sans-serif`;
    const width = ctx.measureText(text).width + 14;
    ctx.fillStyle = background;
    ctx.beginPath();
    ctx.roundRect(x - width / 2, y - 11, width, 23, 10);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y + 1);
    ctx.restore();
  }

  function draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const background = ctx.createLinearGradient(0, 0, 0, displayHeight);
    background.addColorStop(0, "#57c4ce");
    background.addColorStop(1, "#096f91");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, displayWidth, displayHeight);
    ctx.save();
    ctx.translate(renderOffsetX, renderOffsetY);
    ctx.scale(renderScale, renderScale);
    drawBackground(decorativeTime);
    for (const fish of game.fish) drawFish(fish);
    drawRemora(game.companion);
    drawFish(game.player, true);
    for (const effect of effects) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, effect.time * 2);
      ctx.font = '800 24px "Microsoft YaHei", sans-serif';
      ctx.textAlign = "center";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#106c84";
      ctx.strokeText(effect.text, effect.x, effect.y);
      ctx.fillStyle = effect.color;
      ctx.fillText(effect.text, effect.x, effect.y);
      ctx.restore();
    }
    ctx.restore();
  }

  function frame(timestamp) {
    const dt = lastFrame === null ? 0 : Math.min((timestamp - lastFrame) / 1000, 0.05);
    lastFrame = timestamp;
    if (game.state === "playing") {
      const input = new Set([...keys, ...pointers.values()]);
      handleEvents(game.update(dt, input));
      for (let index = effects.length - 1; index >= 0; index--) {
        effects[index].time -= dt;
        effects[index].y -= dt * 27;
        if (effects[index].time <= 0) effects.splice(index, 1);
      }
    }
    if (!reducedMotion && game.state !== "paused") decorativeTime += dt;
    draw();
    window.requestAnimationFrame(frame);
  }

  playButton.addEventListener("click", () => {
    if (game.state === "paused") setPause(false);
    else startRound();
  });
  document.getElementById("restart-button").addEventListener("click", startRound);
  pauseButton.addEventListener("click", () => setPause(game.state === "playing"));
  soundButton.addEventListener("click", async () => {
    if (soundOn) {
      soundOn = false;
    } else {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) throw new Error("Web Audio API unavailable");
        audio = audio || new AudioContext();
        await audio.resume();
        soundOn = true;
      } catch (error) {
        reportAudioError(error);
        return;
      }
    }
    soundButton.setAttribute("aria-pressed", String(soundOn));
    soundButton.innerHTML = soundOn ? "♪ <span>音效：开</span>" : "♪ <span>音效：关</span>";
    if (soundOn) sound([660, 880]);
  });

  const movementCodes = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"]);
  window.addEventListener("keydown", event => {
    if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;
    if (event.target instanceof HTMLElement && event.target.matches("input, textarea, select, [contenteditable]")) return;
    if (movementCodes.has(event.code)) {
      if (game.state === "playing" || game.state === "paused") event.preventDefault();
      if (game.state === "playing") keys.add(event.code);
    } else if (event.code === "Space" || event.code === "KeyP" || event.code === "Escape") {
      if (event.code === "Space" && event.target instanceof HTMLElement && event.target.closest("button")) return;
      if (game.state === "playing" || game.state === "paused") {
        event.preventDefault();
        if (!event.repeat) setPause(game.state === "playing");
      }
    }
  });
  window.addEventListener("keyup", event => keys.delete(event.code));
  window.addEventListener("blur", () => {
    clearControls();
    if (game.state === "playing") setPause(true, true);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && game.state === "playing") setPause(true, true);
    lastFrame = null;
  });

  document.querySelectorAll(".direction").forEach(button => {
    button.addEventListener("pointerdown", event => {
      if (game.state !== "playing") return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, button.dataset.direction);
      button.classList.add("pressed");
    });
    const release = event => {
      pointers.delete(event.pointerId);
      if (![...pointers.values()].includes(button.dataset.direction)) button.classList.remove("pressed");
    };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
    button.addEventListener("click", event => {
      if (event.detail !== 0 || game.state !== "playing") return;
      handleEvents(game.update(0.05, new Set([button.dataset.direction])));
      draw();
    });
  });

  new ResizeObserver(resizeCanvas).observe(stage);
  updateDashboard();
  resizeCanvas();
  window.requestAnimationFrame(frame);
}
