const GRID_SIZE = 10;
const MAX_ATTEMPTS = 7;

const boardEl = document.getElementById("board");
const attemptsEl = document.getElementById("attempts");
const hintEl = document.getElementById("hint");
const resetBtn = document.getElementById("reset-btn");

let targetX, targetY;
let attempts = 0;
let gameOver = false;

function initGame() {
  targetX = Math.floor(Math.random() * GRID_SIZE);
  targetY = Math.floor(Math.random() * GRID_SIZE);
  attempts = 0;
  gameOver = false;

  updateAttemptsDisplay();
  hintEl.textContent = "게임을 시작하려면 칸을 클릭하세요.";
  hintEl.style.color = "#2c3444";

  renderBoard();
}

function updateAttemptsDisplay() {
  const remaining = MAX_ATTEMPTS - attempts;
  attemptsEl.textContent = `${remaining} / ${MAX_ATTEMPTS}회`;
}

function renderBoard() {
  boardEl.innerHTML = "";
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
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

  attempts += 1;
  updateAttemptsDisplay();

  const distance = Math.abs(targetX - clickedX) + Math.abs(targetY - clickedY);

  cell.classList.remove("blue", "orange", "red", "gold");
  cell.classList.add("disabled");

  if (distance === 0) {
    cell.classList.add("gold");
    cell.textContent = "★";
    hintEl.textContent = `축하합니다! ${attempts}번 만에 보물을 찾았습니다!`;
    hintEl.style.color = "#b8860b";
    endGame(true);
    return;
  } else if (distance <= 2) {
    cell.classList.add("red");
    hintEl.textContent = "매우 뜨거워요! 바로 근처입니다!";
    hintEl.style.color = "#ff5252";
  } else if (distance <= 5) {
    cell.classList.add("orange");
    hintEl.textContent = "따뜻해지고 있어요.";
    hintEl.style.color = "#ff9f43";
  } else {
    cell.classList.add("blue");
    hintEl.textContent = "너무 차가워요. 멀리 있습니다.";
    hintEl.style.color = "#4a90e2";
  }

  if (attempts >= MAX_ATTEMPTS) {
    revealTreasure();
    hintEl.textContent = "게임 오버! 보물을 찾지 못했습니다.";
    hintEl.style.color = "#ff5252";
    endGame(false);
  }
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

function endGame(won) {
  gameOver = true;
  document.querySelectorAll(".cell").forEach((cell) => {
    cell.classList.add("disabled");
  });
}

resetBtn.addEventListener("click", initGame);

initGame();
