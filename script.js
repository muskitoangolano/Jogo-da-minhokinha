// 🔧 CONFIGURE SEU FIREBASE AQUI 🔧
const firebaseConfig = {
apiKey: "AIzaSyAs_uFMFNrkTZjx4AAIvi6oOpSRDAcdNxY",
authDomain: "jogodaminhokinha.firebaseapp.com",
databaseURL: "https://jogodaminhokinha-default-rtdb.firebaseio.com",
projectId: "jogodaminhokinha",
appId: "1:1084697716718:web:5ee24c3671f7492a5050ff"
};

// Inicialize o Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Elementos do DOM
const usernameForm = document.getElementById("usernameForm");
const usernameInput = document.getElementById("usernameInput");
const startGameBtn = document.getElementById("startGameBtn");
const countdownOverlay = document.getElementById("countdownOverlay");
const countdownText = document.getElementById("countdownText");
const gameOverText = document.getElementById("gameOver");
const scoreDisplay = document.getElementById("scoreDisplay");
const topScoresList = document.getElementById("topScores");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Variáveis do jogo
let lastTimestamp = 0;
let score = 0;
let speedInterval = 100;
const minSpeed = 20;
let snake, food, dx, dy, running = false;
let animationFrameId;
let currentUsername = "";

// Ajusta o canvas
function resize() {
  const size = Math.min(window.innerWidth * 0.9, 600);
  canvas.width = size;
  canvas.height = size;
}
window.addEventListener('resize', resize);
resize();

// Configurações do jogo
const gridSize = 20;

// Carrega nome da sessão
window.onload = () => {
  currentUsername = sessionStorage.getItem("username");
  if (currentUsername) {
    usernameForm.style.display = "none";
    usernameInput.value = currentUsername;
  } else {
    usernameForm.style.display = "flex";
  }
  loadTopScores();
};

// Validação do campo de nome
usernameInput.addEventListener("input", () => {
  startGameBtn.disabled = !usernameInput.value.trim();
});

// Salva nome e inicia contagem regressiva
startGameBtn.addEventListener("click", () => {
  currentUsername = usernameInput.value.trim();
  if (currentUsername) {
    sessionStorage.setItem("username", currentUsername);
    startCountdown();
  } else {
    alert("Digite um nome válido!");
  }
});

// Contagem regressiva de 3 segundos
function startCountdown() {
  let count = 3;
  countdownText.textContent = count;
  usernameForm.style.display = "none";
  countdownOverlay.style.display = "flex";

  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownText.textContent = count;
    } else {
      clearInterval(interval);
      countdownOverlay.style.display = "none";
      initGame();
    }
  }, 1000);
}

// Inicializa o jogo
function initGame() {
  snake = [{x: 10, y: 10}];
  dx = 1; dy = 0;
  score = 0;
  speedInterval = 100;
  lastTimestamp = 0;
  updateScore();
  placeFood();
  running = true;
  gameOverText.style.display = "none";
  animationFrameId = requestAnimationFrame(gameLoop);
}

// Posiciona comida
function placeFood() {
  let valid = false;
  while (!valid) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    valid = !snake.some(part => part.x === x && part.y === y);
    food = { x, y };
  }
}

// Atualiza pontuação
function updateScore() {
  scoreDisplay.textContent = `Pontos: ${score}`;
}

// Desenha o jogo
function draw() {
  const size = canvas.width / gridSize;
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Comida
  ctx.fillStyle = "#f00";
  ctx.fillRect(food.x * size, food.y * size, size, size);

  // Cobrinha
  ctx.fillStyle = "#0f0";
  snake.forEach(part => {
    ctx.fillRect(part.x * size, part.y * size, size, size);
  });
}

// Som ao comer bloco
function playEatSound() {
  const context = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = context.createOscillator();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(800, context.currentTime);
  oscillator.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.1);
}

// Loop do jogo
function gameLoop(timestamp) {
  if (!running) return;

  if (timestamp - (lastTimestamp || 0) < speedInterval) {
    animationFrameId = requestAnimationFrame(gameLoop);
    return;
  }
  lastTimestamp = timestamp;

  const head = { x: snake[0].x + dx, y: snake[0].y + dy };

  // Verifica colisão
  if (
    head.x < 0 || head.x >= gridSize ||
    head.y < 0 || head.y >= gridSize ||
    snake.some(part => part.x === head.x && part.y === head.y)
  ) {
    running = false;
    gameOverText.style.display = "block";
    submitScore(score);
    return;
  }

  snake.unshift(head);

  // Comeu comida?
  if (head.x === food.x && head.y === food.y) {
    score++;
    updateScore();
    playEatSound();
    if (navigator.vibrate) navigator.vibrate(100);

    if (score < 10) {
      if (score % 3 === 0 && speedInterval > 60) speedInterval -= 5;
    } else {
      if (score % 2 === 0 && speedInterval > minSpeed) speedInterval -= 10;
    }
    placeFood();
  } else {
    snake.pop();
  }

  draw();
  animationFrameId = requestAnimationFrame(gameLoop);
}

// Envia pontuação com nome
function submitScore(finalScore) {
  const scoresRef = database.ref("scores");
  scoresRef.push({ 
    score: finalScore,
    username: currentUsername,
    timestamp: Date.now()
  }).catch(error => {
    console.error("Erro ao salvar pontuação:", error);
  });
}

// Carrega as melhores pontuações
function loadTopScores() {
  const scoresRef = database.ref("scores");
  scoresRef.orderByChild("score").limitToLast(10).on("value", snapshot => {
    const scores = [];
    snapshot.forEach(child => {
      const data = child.val();
      scores.push({ score: data.score, username: data.username });
    });
    scores.sort((a, b) => b.score - a.score).slice(0, 10);
    topScoresList.innerHTML = scores.map((entry, i) => 
      `${i+1}º - ${entry.username}: ${entry.score} pontos`
    ).join("<br>");
  }, error => {
    console.error("Erro ao carregar pontuação:", error);
  });
}

// Controles
function handleDirection(dir) {
  if (!running) initGame();
  if (dir === 'up' && dy !== 1) { dx = 0; dy = -1; }
  if (dir === 'down' && dy !== -1) { dx = 0; dy = 1; }
  if (dir === 'left' && dx !== 1) { dx = -1; dy = 0; }
  if (dir === 'right' && dx !== -1) { dx = 1; dy = 0; }
}

// Eventos dos botões
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleDirection(btn.dataset.dir);
  }, { passive: false });
  
  btn.addEventListener('click', () => {
    handleDirection(btn.dataset.dir);
  });
});

// Teclado
window.addEventListener('keydown', (e) => {
  const keyMap = {
    ArrowUp: 'up', w: 'up', W: 'up',
    ArrowDown: 'down', s: 'down', S: 'down',
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right'
  };
  if (keyMap[e.key]) handleDirection(keyMap[e.key]);
});

// Reinicia ao clicar
canvas.addEventListener('click', () => {
  if (!running) initGame();
});