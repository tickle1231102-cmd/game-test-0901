const STAGE_CONFIGS = {
  1: { size: 6, attempts: 8 },
  2: { size: 8, attempts: 7 },
};
const DEFAULT_STAGE_CONFIG = { size: 10, attempts: 6 }; // Lv.3 이상

const SKILLS = {
  radar: { cost: 30, minLevel: 1, label: "레이더 스캔" },
  lineDetect: { cost: 50, minLevel: 2, label: "행/열 탐지" },
  refill: { cost: 40, minLevel: 3, label: "기회 충전" },
};

const TREASURE_ITEMS = {
  1: { emoji: "🧭", name: "낡은 나침반" },
  2: { emoji: "🪙", name: "고대 동전" },
  3: { emoji: "🏆", name: "황금 성배" },
  4: { emoji: "💎", name: "빛나는 보석" },
  5: { emoji: "👑", name: "전설의 왕관" },
};

function getTreasureItem(level) {
  return TREASURE_ITEMS[level] || { emoji: "📦", name: `미지의 보물 Lv.${level}` };
}

function getTitle(maxLevel) {
  if (maxLevel >= 5) return "전설의 트레저헌터";
  if (maxLevel >= 3) return "마스터 탐험가";
  if (maxLevel >= 2) return "노련한 탐험가";
  if (maxLevel >= 1) return "견습 탐험가";
  return "초보 탐험가";
}

// DOM refs
const boardEl = document.getElementById("board");
const stageEl = document.getElementById("stage");
const heartsEl = document.getElementById("hearts");
const goldEl = document.getElementById("gold");
const titleEl = document.getElementById("title");
const comboEl = document.getElementById("combo");
const hintEl = document.getElementById("hint");
const rewardEl = document.getElementById("reward");
const resetBtn = document.getElementById("reset-btn");
const nextStageBtn = document.getElementById("next-stage-btn");
const dogamToggleBtn = document.getElementById("dogam-toggle");
const dogamPanel = document.getElementById("dogam-panel");
const skillButtons = {
  radar: document.getElementById("skill-radar"),
  lineDetect: document.getElementById("skill-line"),
  refill: document.getElementById("skill-refill"),
};

// Run state (resets on "다시 시작")
let stage = 1;
let gridSize, maxAttempts;
let targetX, targetY;
let attempts = 0;
let gameOver = false;
let gold = 0;
let combo = 0;
let feverPending = false; // fever earned by previous clear, applies to the NEXT stage
let feverActiveThisStage = false;
let radarArmed = false;
let skillsUsed = { radar: false, lineDetect: false, refill: false };

// Meta progression (persists across "다시 시작")
let maxLevelCleared = 0;
let collectedLevels = new Set();

function getStageConfig(level) {
  return STAGE_CONFIGS[level] || DEFAULT_STAGE_CONFIG;
}

function startStage(level) {
  stage = level;
  const config = getStageConfig(stage);
  gridSize = config.size;
  maxAttempts = config.attempts;

  targetX = Math.floor(Math.random() * gridSize);
  targetY = Math.floor(Math.random() * gridSize);
  attempts = 0;
  gameOver = false;
  radarArmed = false;
  skillsUsed = { radar: false, lineDetect: false, refill: false };

  stageEl.textContent = `Lv.${stage}`;
  updateHeartsDisplay();
  updateGoldDisplay();
  nextStageBtn.classList.add("hidden");
  rewardEl.classList.add("hidden");
  rewardEl.textContent = "";

  renderBoard();

  feverActiveThisStage = feverPending;
  feverPending = false;

  if (feverActiveThisStage) {
    const quadrant = getQuadrant(targetX, targetY, gridSize);
    hintEl.textContent = `🔥 피버! 보물은 ${quadrant} 구역에 있는 것 같아요!`;
    hintEl.style.color = "#e17055";
  } else {
    hintEl.textContent = "게임을 시작하려면 칸을 클릭하세요.";
    hintEl.style.color = "#2c3444";
  }

  updateComboDisplay();
  updateSkillButtons();
}

function resetGame() {
  gold = 0;
  combo = 0;
  feverPending = false;
  updateComboDisplay();
  startStage(1);
}

function goToNextStage() {
  startStage(stage + 1);
}

function getQuadrant(x, y, size) {
  const mid = (size - 1) / 2;
  const vertical = y <= mid ? "상단" : "하단";
  const horizontal = x <= mid ? "좌" : "우";
  return `${horizontal}${vertical}`;
}

function updateHeartsDisplay() {
  const remaining = maxAttempts - attempts;
  let display = "";
  for (let i = 0; i < maxAttempts; i++) {
    display += i < remaining ? "❤️" : "🤍";
  }
  heartsEl.textContent = display;
}

function updateGoldDisplay() {
  goldEl.textContent = `${gold}G`;
}

function updateComboDisplay() {
  comboEl.textContent = feverActiveThisStage ? `Combo x${combo} 🔥` : `Combo x${combo}`;
}

function updateTitleDisplay() {
  titleEl.textContent = getTitle(maxLevelCleared);
}

function isSkillAvailable(key) {
  const skill = SKILLS[key];
  return (
    !gameOver &&
    !skillsUsed[key] &&
    stage >= skill.minLevel &&
    gold >= skill.cost
  );
}

function updateSkillButtons() {
  Object.keys(SKILLS).forEach((key) => {
    const btn = skillButtons[key];
    btn.disabled = !isSkillAvailable(key);
    btn.classList.toggle("armed", key === "radar" && radarArmed);
  });
}

function useSkill(key) {
  if (!isSkillAvailable(key)) return;

  if (key === "radar") {
    gold -= SKILLS.radar.cost;
    skillsUsed.radar = true;
    radarArmed = true;
    hintEl.textContent = "스캔할 칸을 클릭하세요. (3x3 범위 탐지, 기회 소모 없음)";
    hintEl.style.color = "#8891a3";
    updateGoldDisplay();
    updateSkillButtons();
    return;
  }

  if (key === "lineDetect") {
    gold -= SKILLS.lineDetect.cost;
    skillsUsed.lineDetect = true;
    const useRow = Math.random() < 0.5;
    document.querySelectorAll(".cell").forEach((cell) => {
      const cx = parseInt(cell.dataset.x, 10);
      const cy = parseInt(cell.dataset.y, 10);
      if ((useRow && cy === targetY) || (!useRow && cx === targetX)) {
        cell.classList.add("line-hint");
      }
    });
    hintEl.textContent = useRow
      ? `보물이 있는 가로줄(Row ${targetY + 1})이 표시되었습니다!`
      : `보물이 있는 세로줄(Col ${targetX + 1})이 표시되었습니다!`;
    hintEl.style.color = "#6c5ce7";
    updateGoldDisplay();
    updateSkillButtons();
    return;
  }

  if (key === "refill") {
    gold -= SKILLS.refill.cost;
    skillsUsed.refill = true;
    maxAttempts += 2;
    hintEl.textContent = "기회가 2회 충전되었습니다!";
    hintEl.style.color = "#00b894";
    updateGoldDisplay();
    updateHeartsDisplay();
    updateSkillButtons();
    return;
  }
}

function renderBoard() {
  boardEl.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
  boardEl.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
  boardEl.innerHTML = "";
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.addEventListener("click", onCellClick);
      boardEl.appendChild(cell);
    }
  }
}

function onCellClick(e) {
  if (gameOver) return;

  const cell = e.currentTarget;
  if (cell.classList.contains("disabled")) return;

  const clickedX = parseInt(cell.dataset.x, 10);
  const clickedY = parseInt(cell.dataset.y, 10);

  if (radarArmed) {
    radarArmed = false;
    const inRange =
      Math.abs(targetX - clickedX) <= 1 && Math.abs(targetY - clickedY) <= 1;
    hintEl.textContent = inRange
      ? "🔍 레이더 결과: 이 칸 주변(3x3)에 보물이 있음!"
      : "🔍 레이더 결과: 이 칸 주변(3x3)에 보물이 없음.";
    hintEl.style.color = inRange ? "#00b894" : "#8891a3";
    cell.classList.add("scanned");
    setTimeout(() => cell.classList.remove("scanned"), 900);
    updateSkillButtons();
    return;
  }

  attempts += 1;
  updateHeartsDisplay();

  const distance = Math.abs(targetX - clickedX) + Math.abs(targetY - clickedY);

  cell.classList.remove("blue", "orange", "red", "gold");
  cell.classList.add("disabled");

  if (distance === 0) {
    cell.classList.add("gold");
    cell.textContent = "★";
    handleWin(attempts);
    return;
  } else if (distance <= 2) {
    cell.classList.add("red");
    hintEl.textContent = "매우 뜨거워요! 바로 근처입니다!";
    hintEl.style.color = "#ff4d4d";
  } else if (distance <= 4) {
    cell.classList.add("orange");
    hintEl.textContent = "따뜻해지고 있어요.";
    hintEl.style.color = "#ffa502";
  } else {
    cell.classList.add("blue");
    hintEl.textContent = "너무 차가워요. 멀리 있습니다.";
    hintEl.style.color = "#70a1ff";
  }

  if (attempts >= maxAttempts) {
    revealTreasure();
    hintEl.textContent = "게임 오버! 보물을 찾지 못했습니다.";
    hintEl.style.color = "#ff4d4d";
    handleLose();
  }
}

function handleWin(attemptsUsed) {
  combo += 1;
  const comboMultiplier = 1 + Math.max(0, combo - 1) * 0.5;
  const remaining = maxAttempts - attemptsUsed;
  const baseGold = 50 + remaining * 10;
  const earnedGold = Math.round(baseGold * comboMultiplier);
  gold += earnedGold;

  maxLevelCleared = Math.max(maxLevelCleared, stage);
  collectedLevels.add(stage);
  const item = getTreasureItem(stage);

  feverPending = combo >= 2;

  hintEl.textContent = `축하합니다! ${attemptsUsed}번 만에 보물을 찾았습니다!`;
  hintEl.style.color = "#b8860b";

  rewardEl.classList.remove("hidden");
  rewardEl.textContent = `+${earnedGold}G (콤보 x${comboMultiplier.toFixed(1)}) · 보물 획득: ${item.emoji} ${item.name}${
    feverPending ? " · 🔥 다음 스테이지 피버 발동!" : ""
  }`;

  updateGoldDisplay();
  updateComboDisplay();
  updateTitleDisplay();
  renderDogam();
  endGame();
  nextStageBtn.classList.remove("hidden");
}

function handleLose() {
  combo = 0;
  feverPending = false;
  updateComboDisplay();
  endGame();
}

function revealTreasure() {
  const targetCell = document.querySelector(
    `.cell[data-x="${targetX}"][data-y="${targetY}"]`
  );
  if (targetCell && !targetCell.classList.contains("gold")) {
    targetCell.classList.add("revealed");
    targetCell.textContent = "★";
  }
}

function endGame() {
  gameOver = true;
  radarArmed = false;
  document.querySelectorAll(".cell").forEach((cell) => {
    cell.classList.add("disabled");
  });
  updateSkillButtons();
}

function renderDogam() {
  dogamPanel.innerHTML = "";
  const levels = Object.keys(TREASURE_ITEMS).map(Number).sort((a, b) => a - b);
  levels.forEach((level) => {
    const item = TREASURE_ITEMS[level];
    const collected = collectedLevels.has(level);
    const slot = document.createElement("div");
    slot.className = `dogam-slot ${collected ? "collected" : "locked"}`;
    slot.innerHTML = `
      <span class="dogam-emoji">${collected ? item.emoji : "❔"}</span>
      <span class="dogam-name">${collected ? item.name : `Lv.${level} 미발견`}</span>
    `;
    dogamPanel.appendChild(slot);
  });
}

resetBtn.addEventListener("click", resetGame);
nextStageBtn.addEventListener("click", goToNextStage);
dogamToggleBtn.addEventListener("click", () => {
  dogamPanel.classList.toggle("hidden");
});
Object.keys(SKILLS).forEach((key) => {
  skillButtons[key].addEventListener("click", () => useSkill(key));
});

updateTitleDisplay();
renderDogam();
startStage(1);
