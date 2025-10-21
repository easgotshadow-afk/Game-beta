const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const restartBtn = document.getElementById("restartBtn");

let currentPlayer = null;
let playerData = JSON.parse(localStorage.getItem("flappyPlayers")) || {};

document.getElementById("startGameBtn").addEventListener("click", () => {
  const nameInput = document.getElementById("playerName");
  const name = nameInput.value.trim() || "Guest";

  currentPlayer = name;

  if (!playerData[name]) {
    playerData[name] = { highScore: 0, gamesPlayed: 0, items: [] };
  }

  // ✅ ใช้ไอเทมที่ซื้อไว้ก่อนหน้า
  applyPlayerItems();

  document.getElementById("playerForm").style.display = "none";
  bgMusic.play();
  update();
});


// เสียง
const flapSound = new Audio("cartoon-jump-6462.mp3");
const hitSound = new Audio("game-over-417465.mp3");
const bgMusic = new Audio("pallet-town-pokemon-red-amp-blue-lofi-410591.mp3");
const coinSound = new Audio("coin-257878.mp3"); // ใส่ชื่อไฟล์เสียงจริงของคุณ
coinSound.volume = 0.5; // ปรับความดังตามชอบ
bgMusic.loop = true;
bgMusic.volume = 0.4;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ตัวละคร
let bird = { x: 100, y: 200, width: 100, height: 100, dy: 0, padding: 20 };
let gravity = 0.5;
let jump = -10;
let pipes = [];
let pipeWidth = 50;
let pipeGap = 250;
let coinsCollected = 0; // เหรียญที่เก็บได้
let score = 0;
let gameOver = false;
let hitPlayed = false;
let particles = [];
let skyTime = 0;
let timeOfDay = 0; // 0 - 1 คือ 0% ถึง 100% ของวัน
let daySpeed = 0.001; // ความเร็วเวลาที่ผ่านไป
let invincibleTime = 0; // เวลาที่เหลือในวินาที
let stars = [];





// โหลดภาพ
const birdImg = new Image();
birdImg.src = "player.png";
const birdSprite = new Image();
birdSprite.src = "birds2.png"; // sprite sheet ของนกฝูง

// เมฆ
let clouds = [
  { x: 100, y: 80, size: 50 },
  { x: 400, y: 120, size: 40 },
  { x: 700, y: 60, size: 60 }
];

// ท่อเริ่มต้น
pipes.push({ x: canvas.width, y: Math.random() * (canvas.height - pipeGap) });

// ภูเขา
let mountains = [
  { color: "#6ea56f", height: 200, speed: 0.2 }, // ชั้นหน้า
  { color: "#4e8b57", height: 300, speed: 0.15 }, // ชั้นกลาง
  { color: "#2f6038", height: 400, speed: 0.1 }   // ชั้นหลัง
];


// 🕊️ ฝูงนก
let bgBirds = [];
const BIRD_FRAME_WIDTH = 64;
const BIRD_FRAME_HEIGHT = 64;
let birdFrame = 0;
let birdFrameDelay = 0;

for (let i = 0; i < 6; i++) {
  bgBirds.push({
    x: Math.random() * canvas.width,
    y: Math.random() * 250 + 50,
    speed: Math.random() * 2 + 1,
    scale: Math.random() * 0.5 + 0.5
  });
}

// วาดนกฝูง
function drawRealisticBirds() {
  birdFrameDelay++;
  if (birdFrameDelay % 8 === 0) birdFrame = (birdFrame + 1) % 4;

  bgBirds.forEach(b => {
    ctx.drawImage(
      birdSprite,
      birdFrame * BIRD_FRAME_WIDTH, 0, BIRD_FRAME_WIDTH, BIRD_FRAME_HEIGHT,
      b.x, b.y, BIRD_FRAME_WIDTH * b.scale, BIRD_FRAME_HEIGHT * b.scale
    );
    b.x -= b.speed;
    if (b.x < -BIRD_FRAME_WIDTH) {
      b.x = canvas.width + Math.random() * 100;
      b.y = Math.random() * 250 + 50;
    }
  });
}

// พื้นหลัง
function drawBackground() {
  // สีช่วงต่าง ๆ ของวัน
  const morningTop = {r: 120, g: 180, b: 255};
  const morningBottom = {r: 255, g: 200, b: 150};

  const dayTop = {r: 70, g: 180, b: 255};
  const dayBottom = {r: 180, g: 220, b: 255};

  const eveningTop = {r: 255, g: 100, b: 200};
  const eveningBottom = {r: 255, g: 180, b: 120};

  const nightTop = {r: 10, g: 10, b: 40};
  const nightBottom = {r: 50, g: 50, b: 80};

  // timeOfDay: 0 - 1
  let topColor, bottomColor;

  if (timeOfDay < 0.25) { // เช้า -> กลางวัน
    const t = timeOfDay / 0.25;
    topColor = lerpColor(morningTop, dayTop, t);
    bottomColor = lerpColor(morningBottom, dayBottom, t);
  } else if (timeOfDay < 0.5) { // กลางวัน -> เย็น
    const t = (timeOfDay - 0.25) / 0.25;
    topColor = lerpColor(dayTop, eveningTop, t);
    bottomColor = lerpColor(dayBottom, eveningBottom, t);
  } else if (timeOfDay < 0.75) { // เย็น -> กลางคืน
    const t = (timeOfDay - 0.5) / 0.25;
    topColor = lerpColor(eveningTop, nightTop, t);
    bottomColor = lerpColor(eveningBottom, nightBottom, t);
  } else { // กลางคืน -> เช้า
    const t = (timeOfDay - 0.75) / 0.25;
    topColor = lerpColor(nightTop, morningTop, t);
    bottomColor = lerpColor(nightBottom, morningBottom, t);
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, `rgb(${topColor.r}, ${topColor.g}, ${topColor.b})`);
  gradient.addColorStop(1, `rgb(${bottomColor.r}, ${bottomColor.g}, ${bottomColor.b})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ฟังก์ชันช่วยคำนวณสีแบบไล่
function lerpColor(c1, c2, t) {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t)
  };
}



// เมฆ
function drawCloud(x, y, size) {
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
  ctx.arc(x + size * 0.4, y + size * 0.2, size * 0.5, 0, Math.PI * 2);
  ctx.arc(x - size * 0.4, y + size * 0.1, size * 0.5, 0, Math.PI * 2);
  ctx.arc(x, y - size * 0.2, size * 0.4, 0, Math.PI * 2);
  ctx.fill();
}
function drawClouds() {
  clouds.forEach(c => {
    drawCloud(c.x, c.y, c.size);
    c.x -= 0.5;
    if (c.x + c.size < 0) c.x = canvas.width + c.size;
  });
}

// ภูเขา
function drawMountains() {
mountains.forEach(m => {
  const grad = ctx.createLinearGradient(0, canvas.height - m.height - 50, 0, canvas.height);
  grad.addColorStop(0, m.color); // สีด้านบน
  grad.addColorStop(1, "#1e3b20"); // สีด้านล่าง (เงา)
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  for (let x = 0; x <= canvas.width; x += 100) {
    const y = canvas.height - m.height + Math.sin((x + skyTime * 200 * m.speed) * 0.01) * 50;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fill();
});

}
function drawStars() {
  // กำหนดช่วงเวลาให้ดาวค่อย ๆ ปรากฏและหายไป
  // timeOfDay 0.5 = เย็น, 0.75 = กลางคืนเต็ม, 1 = เช้า
  let alphaMultiplier = 0;

  if (timeOfDay >= 0.5 && timeOfDay < 0.6) { 
    // ดาวค่อย ๆ โผล่ช่วงเย็น
    alphaMultiplier = (timeOfDay - 0.5) / 0.1;
  } else if (timeOfDay >= 0.6 && timeOfDay < 0.9) {
    // ดาวเต็ม
    alphaMultiplier = 1;
  } else if (timeOfDay >= 0.9 && timeOfDay <= 1) {
    // ดาวค่อย ๆ หายช่วงเช้า
    alphaMultiplier = 1 - (timeOfDay - 0.9) / 0.1;
  } else {
    alphaMultiplier = 0;
  }

  stars.forEach(star => {
    const alpha = alphaMultiplier * (0.5 + 0.5 * Math.sin(timeOfDay * 20 + star.brightness * 10));
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}


// นกผู้เล่น
function drawBird() {
  ctx.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
}

// ท่อ
function drawPipe(x, y, isBottom) {
  const capHeight = 30;
  ctx.fillStyle = "#1ca500";
  ctx.fillRect(x, isBottom ? y : 0, pipeWidth, isBottom ? canvas.height - y : y);

  if (isBottom) {
    ctx.fillStyle = "#2bd600";
    ctx.fillRect(x - 5, y - capHeight, pipeWidth + 10, capHeight);
    ctx.fillStyle = "#118000";
    ctx.fillRect(x - 5, y - capHeight, pipeWidth + 10, 6);
  } else {
    ctx.fillStyle = "#2bd600";
    ctx.fillRect(x - 5, y, pipeWidth + 10, capHeight);
    ctx.fillStyle = "#118000";
    ctx.fillRect(x - 5, y + capHeight - 6, pipeWidth + 10, 6);
  }
}

function drawPipes() {
  pipes.forEach(pipe => {
    drawPipe(pipe.x, pipe.y, false);
    drawPipe(pipe.x, pipe.y + pipeGap, true);
  });
}

// คะแนน
function drawScore() {
  const padding = 30; // เพิ่ม padding ให้ห่างจากขอบ
  ctx.fillStyle = "black";
  ctx.font = "30px Arial";
  ctx.textAlign = "left"; // จัดซ้าย
  ctx.fillText("Score: " + score, padding, 50);
  ctx.fillText("Coins: " + coinsCollected, padding, 90);
}


// กระโดด
function flap() {
  bird.dy = jump;
  flapSound.currentTime = 0;
  flapSound.play();
}

// ระเบิด
function drawExplosion(x, y) {
  for (let i = 0; i < 30; i++) {
    particles.push({
      x, y,
      radius: Math.random() * 5 + 2,
      color: `hsl(${Math.random() * 60}, 100%, 50%)`,
      speedX: (Math.random() - 0.5) * 10,
      speedY: (Math.random() - 0.5) * 10,
      alpha: 1
    });
  }
}



function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.speedX;
    p.y += p.speedY;
    p.alpha -= 0.02;
    if (p.alpha <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  particles.forEach(p => {
    ctx.beginPath();
    ctx.fillStyle = `rgba(255, ${Math.floor(100 + Math.random() * 155)}, 0, ${p.alpha})`;
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ปุ่ม Restart
function showRestartButton() {
  restartBtn.style.display = "block";
}

function resetGame() {
  bird = { x: 100, y: 200, width: 100, height: 100, dy: 0, padding: 20 };
  pipes = [{ x: canvas.width, y: Math.random() * (canvas.height - pipeGap) }];
  score = 0;
  gameOver = false;
  hitPlayed = false;
  particles = [];
  restartBtn.style.display = "none";
  bgMusic.currentTime = 0;
  bgMusic.play();
  update();
}

restartBtn.addEventListener("click", resetGame);

// โหลดภาพครบก่อนเริ่มเกม
const imagesToLoad = [birdImg, birdSprite];
let loadedImages = 0;
imagesToLoad.forEach(img => {
  img.onload = () => {
    loadedImages++;
    if (loadedImages === imagesToLoad.length) {
      update(); // เริ่มเกมหลังโหลดภาพครบ
    }
  };
});


// สร้างดาวตอนเริ่มเกม (แค่ครั้งเดียว)
for (let i = 0; i < 100; i++) {
  stars.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height * 0.5, // ครึ่งบนของหน้าจอ
    radius: Math.random() * 2 + 1,
    brightness: Math.random()
  });
}

// ลูปหลัก
function update() {
  // อัปเดตเวลา
  timeOfDay += daySpeed;
  if (timeOfDay > 1) timeOfDay = 0;

  if (gameOver && particles.length === 0) {
  // อัปเดตสถิติ
  if (currentPlayer) {
    const player = playerData[currentPlayer];
    player.gamesPlayed++;
    if (score > player.highScore) {
      player.highScore = score;
    }
    localStorage.setItem("flappyPlayers", JSON.stringify(playerData));

    // แสดงสถิติ
    const statsDiv = document.getElementById("stats");
    statsDiv.innerHTML = `
      👤 ${currentPlayer}<br>
      🏆 High Score: ${player.highScore}<br>
      🎮 Games Played: ${player.gamesPlayed}
    `;
  }

  setTimeout(showRestartButton, 300);
  return;
}

  ctx.clearRect(0, 0, canvas.width, canvas.height);

// วาดพื้นหลังก่อน
drawBackground();
drawStars();
// วาดพระอาทิตย์และพระจันทร์
drawSun();
drawMoon();

// วาดภูเขา เมฆ ฝูงนก
drawMountains();
drawClouds();
drawRealisticBirds();

// ตัวละครและท่อ
drawBird();
drawPipes();


// คะแนนและอนิเมชัน
drawScore();
updateParticles();
drawParticles();

  bird.dy += gravity;
  bird.y += bird.dy;

  pipes.forEach(pipe => pipe.x -= 3);

  if (pipes[pipes.length - 1].x < canvas.width - 300) {
  // สร้างท่อใหม่
  const newPipe = { 
    x: canvas.width, 
    y: Math.random() * (canvas.height - pipeGap),
    width: Math.random() * 50 + 50 // กว้างแบบสุ่ม 50-100
  };
  pipes.push(newPipe);

  addCoin(newPipe); // ✅ เพิ่มเหรียญ



}


  if (pipes[0].x + pipeWidth < 0) {
    pipes.shift();
    score++;
  }
// ===== อัปเดตเหรียญ =====
coins.forEach(coin => {
  // เลื่อนเหรียญ
  coin.x -= 3;

  // ตรวจชนกับนก
  const dx = bird.x + bird.width / 2 - coin.x;
  const dy = bird.y + bird.height / 2 - coin.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < coinRadius + bird.width / 2 && !coin.collected) {
    coin.collected = true;
    coinsCollected += 1;
    score += 5; // คะแนนเพิ่มเมื่อเก็บเหรียญ
    coinSound.currentTime = 0; // รีเซ็ตเสียง
    coinSound.play(); // เล่นเสียงเก็บเหรียญ
}

});

// ลบเหรียญที่ออกนอกหน้าจอ
coins = coins.filter(coin => coin.x + coinRadius > 0);

// วาดเหรียญ
drawCoins();


  // ตรวจชนท่อ
pipes.forEach(pipe => {
  if (
    bird.x + bird.padding < pipe.x + pipeWidth &&
    bird.x + bird.width - bird.padding > pipe.x &&
    (bird.y + bird.padding < pipe.y ||
     bird.y + bird.height - bird.padding > pipe.y + pipeGap)
  ) {
    if(!invincible){ // ถ้าไม่อมตะค่อย Game Over
      if (!gameOver) drawExplosion(bird.x + bird.width / 2, bird.y + bird.height / 2);
      gameOver = true;
      if (!hitPlayed) {
        hitSound.currentTime = 0;
        hitSound.play();
        hitPlayed = true;
      }
    }
  }
});


  // ขอบบน-ล่าง
  if (bird.y + bird.height > canvas.height || bird.y < 0) {
    gameOver = true;
    if (!hitPlayed) {
      hitSound.currentTime = 0;
      hitSound.play();
      hitPlayed = true;
    }
  }

  drawBird();
  drawPipes();
  drawScore();
  updateParticles();
  drawParticles();
 // ===== เพิ่มตอนท้าย update() ก่อน requestAnimationFrame(update); =====
if (invincible) {
  invincibleTime -= 1/60; // ลดเวลาตาม FPS 60
  if (invincibleTime <= 0) {
    invincible = false;
    invincibleTime = 0;
  }

  // วาดเวลานับถอยหลังบนหน้าจอ ตรงกลางบน
  ctx.fillStyle = "yellow";
  ctx.font = "40px Arial";
  ctx.textAlign = "center"; // จัดตรงกลาง
  ctx.fillText(`Invincible: ${Math.ceil(invincibleTime)}s`, canvas.width / 2, 50);
}


  requestAnimationFrame(update);
}

// กด Space หรือคลิก
document.addEventListener("keydown", e => {
  if (e.code === "Space") {
    e.preventDefault();
    flap();
    if (bgMusic.paused) bgMusic.play();
  }
});
document.addEventListener("click", () => {
  flap();
  if (bgMusic.paused) bgMusic.play();
});
function drawSun() {
  const sunRadius = 50;
  const amplitude = canvas.height * 0.6; // ความสูงสุดที่พระอาทิตย์ขึ้น
  const sunX = canvas.width / 2 + Math.cos(timeOfDay * 2 * Math.PI - Math.PI/2) * (canvas.width / 2);
  const sunY = canvas.height * 0.8 - Math.sin(timeOfDay * 2 * Math.PI - Math.PI/2) * amplitude;

  ctx.fillStyle = "yellow";
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
  ctx.fill();
}
function drawMoon() {
  const moonRadius = 40;
  const amplitude = canvas.height * 0.6;
  const moonX = canvas.width / 2 + Math.cos(timeOfDay * 2 * Math.PI - Math.PI/2 + Math.PI) * (canvas.width / 2);
  const moonY = canvas.height * 0.8 - Math.sin(timeOfDay * 2 * Math.PI - Math.PI/2 + Math.PI) * amplitude;

  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
  ctx.fill();
}
let coins = [];
const coinRadius = 15;

// สร้างเหรียญเมื่อสร้างท่อใหม่
function addCoin(pipe) {
  const coinY = pipe.y + Math.random() * (pipeGap - 50); // วางเหรียญในช่องว่าง
  coins.push({
    x: pipe.x + pipeWidth / 2,
    y: coinY,
    collected: false
  });
}
function drawCoins() {
  coins.forEach(coin => {
    if (!coin.collected) {
      ctx.fillStyle = "gold";
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, coinRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}
function showAllPlayers() {
  let statsHTML = "<h3>🏅 Leaderboard</h3>";

  // แปลง object เป็น array แล้วเรียงคะแนนมาก -> น้อย
  let sortedPlayers = Object.entries(playerData).sort((a, b) => b[1].highScore - a[1].highScore);

  // เอาแค่ 5 อันดับแรก
  sortedPlayers.slice(0, 5).forEach(([name, data], i) => {
    statsHTML += `${i + 1}. ${name} — 🏆 ${data.highScore} | 🎮 ${data.gamesPlayed}<br>`;
  });

  document.getElementById("stats").innerHTML = statsHTML;
}


// ✅ เรียกฟังก์ชันนี้เวลาเข้าเกมใหม่
showAllPlayers();
document.getElementById("resetBtn").addEventListener("click", () => {
  if (confirm("แน่ใจว่าจะรีเซ็ตข้อมูลทั้งหมด?")) {
    // เปลี่ยนจาก "playerData" เป็น "flappyPlayers"
    localStorage.removeItem("flappyPlayers");
    playerData = {};
    showAllPlayers();
  }
});


const shopItems = [
  { 
    name: "Invincible 10s", 
    cost: 10, 
    effect: () => { 
      invincible = true;
      invincibleTime = 10; // 10 วินาที
    } 
  }
];


// ตัวแปรสำหรับอมตะ
let invincible = false;


// ปุ่มเปิดร้าน
document.getElementById("openShopBtn").addEventListener("click", openShop);

function openShop() {
  if (!currentPlayer) {
    alert("Please start the game first!");
    return;
  }

  const shopDiv = document.getElementById("shopItems");
  shopDiv.innerHTML = "";
  shopItems.forEach((item, index) => {
    // ไม่เช็ค owned แล้ว ให้ซื้อได้ทุกครั้ง
    shopDiv.innerHTML += `
      <div style="margin-bottom:8px;">
        ${item.name} — ${item.cost} 🪙
        <button onclick="buyItem(${index})">Buy</button>
      </div>
    `;
  });
  document.getElementById("shop").style.display = "block";
}

function buyItem(index) {
  const item = shopItems[index];

  if (coinsCollected >= item.cost) {
    coinsCollected -= item.cost;

    if (!playerData[currentPlayer].items) playerData[currentPlayer].items = [];
    playerData[currentPlayer].items.push(item.name);
    localStorage.setItem("flappyPlayers", JSON.stringify(playerData));

    // เพิ่มเวลาแทนรีเซ็ต
    if (item.name === "Invincible 10s") {
      invincible = true;
      invincibleTime += 10; // ซื้อซ้ำเพิ่มเวลา
    } else {
      item.effect();
    }

    openShop();

    alert(`You bought ${item.name} and it's now active!`);
  } else {
    alert("Not enough coins!");
  }
}



function buyItem(index) {
  const item = shopItems[index];

  if (coinsCollected >= item.cost) {
    coinsCollected -= item.cost;

    // บันทึกไอเทมที่ซื้อของผู้เล่น
    if (!playerData[currentPlayer].items) playerData[currentPlayer].items = [];
    playerData[currentPlayer].items.push(item.name);
    localStorage.setItem("flappyPlayers", JSON.stringify(playerData));

    // ใช้ไอเทมทันที
    item.effect();

    // รีเฟรชหน้าร้านค้า
    openShop();

    alert(`You bought ${item.name} and it's now active!`);
  } else {
    alert("Not enough coins!");
  }
}

// ใช้ไอเทมของผู้เล่นตอนเริ่มเกม
function applyPlayerItems() {
  if (currentPlayer && playerData[currentPlayer].items) {
    playerData[currentPlayer].items.forEach(name => {
      const item = shopItems.find(i => i.name === name);
      if (item) item.effect();
    });
  }
}
function closeShop() {
  const shopDiv = document.getElementById("shop");
  shopDiv.style.display = "none";
}
document.getElementById("openShopBtn").addEventListener("click", () => {
  const shopDiv = document.getElementById("shop");
  if (!currentPlayer) {
    alert("Please start the game first!");
    return;
  }
  shopDiv.style.display = "block";
});
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
ctx.lineWidth = 3;
ctx.beginPath();
ctx.moveTo(0, canvas.height);
for (let x = 0; x <= canvas.width; x += 100) {
  const y = canvas.height - m.height + Math.sin((x + skyTime * 200 * m.speed) * 0.01) * 50;
  ctx.lineTo(x, y);
}
ctx.stroke();
for (let i = 0; i < 100; i++) {
  stars.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height * 0.5, // ครึ่งบน
    radius: Math.random() * 2 + 1,
    brightness: Math.random()
  });
}
