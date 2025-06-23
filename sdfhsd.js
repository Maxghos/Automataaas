// Parámetros de la simulación
let cols = 70;
let rows = 70;
let cellSize = 12;

const STATE = {
  SANO: 0,
  INFECTADO: 1,
  MUERTO: 2,
  RECUPERADO: 3
};

let grid = [];
let timers = [];

let infectionChance = 0.3;
let infectionDuration = 10;
let deathChance = 0.5;
let frameRateVal = 10;

let isPaused = false;

let initialFocus = 'center'; // 'center', 'random', 'brush'
let neighborhoodType = 'moore'; // 'moore' o 'vonneumann'

let brushMode = false;
let brushInfecting = true; // true: pintar infectado, false: pintar sano

function setup() {
  const canvas = createCanvas(cols * cellSize, rows * cellSize);
  canvas.parent(document.body);

  frameRate(frameRateVal);
  setupGrid();

  setupUI();
}

function setupGrid() {
  grid = new Array(cols);
  timers = new Array(cols);
  for (let i = 0; i < cols; i++) {
    grid[i] = new Array(rows).fill(STATE.SANO);
    timers[i] = new Array(rows).fill(0);
  }
  setInitialFocus();
}

function setInitialFocus() {
  if (initialFocus === 'center') {
    let cx = floor(cols / 2);
    let cy = floor(rows / 2);
    grid[cx][cy] = STATE.INFECTADO;
    timers[cx][cy] = infectionDuration;
  } else if (initialFocus === 'random') {
    let n = floor(random(5, 15));
    for (let k = 0; k < n; k++) {
      let x = floor(random(cols));
      let y = floor(random(rows));
      grid[x][y] = STATE.INFECTADO;
      timers[x][y] = infectionDuration;
    }
  }
  // brush no inicializa infectados automáticamente
}

function setupUI() {
  // Referencias HTML
  const icSlider = document.getElementById('infectionChance');
  const icVal = document.getElementById('infectionChanceVal');
  icSlider.value = infectionChance;
  icVal.textContent = infectionChance;

  icSlider.oninput = () => {
    infectionChance = parseFloat(icSlider.value);
    icVal.textContent = infectionChance.toFixed(2);
  };

  const idSlider = document.getElementById('infectionDuration');
  const idVal = document.getElementById('infectionDurationVal');
  idSlider.value = infectionDuration;
  idVal.textContent = infectionDuration;

  idSlider.oninput = () => {
    infectionDuration = parseInt(idSlider.value);
    idVal.textContent = infectionDuration;
  };

  const deathSlider = document.getElementById('deathChance');
  const deathVal = document.getElementById('deathChanceVal');
  deathSlider.value = deathChance;
  deathVal.textContent = deathChance;

  deathSlider.oninput = () => {
    deathChance = parseFloat(deathSlider.value);
    deathVal.textContent = deathChance.toFixed(2);
  };

  const fpsSlider = document.getElementById('frameRate');
  const fpsVal = document.getElementById('frameRateVal');
  fpsSlider.value = frameRateVal;
  fpsVal.textContent = frameRateVal;

  fpsSlider.oninput = () => {
    frameRateVal = parseInt(fpsSlider.value);
    fpsVal.textContent = frameRateVal;
    frameRate(frameRateVal);
  };

  document.getElementById('restartBtn').onclick = () => {
    setupGrid();
  };

  const pauseBtn = document.getElementById('pauseBtn');
  pauseBtn.onclick = () => {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? 'Reanudar' : 'Pausar';
  };

  const initialFocusSelect = document.getElementById('initialFocus');
  initialFocusSelect.value = initialFocus;
  initialFocusSelect.onchange = () => {
    initialFocus = initialFocusSelect.value;
    setupGrid();
    brushMode = (initialFocus === 'brush');
  };

  const neighborhoodSelect = document.getElementById('neighborhood');
  neighborhoodSelect.value = neighborhoodType;
  neighborhoodSelect.onchange = () => {
    neighborhoodType = neighborhoodSelect.value;
  };
}

function draw() {
  background(220);

  if (!isPaused) {
    updateSimulation();
  }

  drawGrid();
  drawGridLines();
  drawInfo();
}

function updateSimulation() {
  let newGrid = [];
  let newTimers = [];
  for (let i = 0; i < cols; i++) {
    newGrid[i] = [];
    newTimers[i] = [];
    for (let j = 0; j < rows; j++) {
      let state = grid[i][j];
      let timer = timers[i][j];

      if (state === STATE.SANO) {
        // Revisar vecinos para infección
        let infectedNeighbors = countInfectedNeighbors(i, j);
        if (infectedNeighbors > 0) {
          // Probabilidad de infectarse depende del número de infectados y chance
          let prob = 1 - Math.pow(1 - infectionChance, infectedNeighbors);
          if (random() < prob) {
            state = STATE.INFECTADO;
            timer = infectionDuration;
          }
        }
      } else if (state === STATE.INFECTADO) {
        timer--;
        if (timer <= 0) {
          if (random() < deathChance) {
            state = STATE.MUERTO;
          } else {
            state = STATE.RECUPERADO;
          }
          timer = 0;
        }
      }
      // MUERTO y RECUPERADO no cambian

      newGrid[i][j] = state;
      newTimers[i][j] = timer;
    }
  }
  grid = newGrid;
  timers = newTimers;
}

function countInfectedNeighbors(x, y) {
  let count = 0;

  let neighbors = [];
  if (neighborhoodType === 'moore') {
    // 8 vecinos (incluye diagonales)
    neighbors = [
      [x - 1, y - 1],
      [x, y - 1],
      [x + 1, y - 1],
      [x - 1, y],
      [x + 1, y],
      [x - 1, y + 1],
      [x, y + 1],
      [x + 1, y + 1]
    ];
  } else {
    // Von Neumann 4 vecinos
    neighbors = [
      [x, y - 1],
      [x - 1, y],
      [x + 1, y],
      [x, y + 1]
    ];
  }

  for (const [nx, ny] of neighbors) {
    if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
      if (grid[nx][ny] === STATE.INFECTADO) {
        count++;
      }
    }
  }

  return count;
}

function drawGrid() {
  noStroke();
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      switch (grid[i][j]) {
        case STATE.SANO:
          fill(0, 200, 0);
          break;
        case STATE.INFECTADO:
          fill(255, 0, 0);
          break;
        case STATE.MUERTO:
          fill(60, 40, 20);
          break;
        case STATE.RECUPERADO:
          fill(0, 150, 255);
          break;
      }
      rect(i * cellSize, j * cellSize, cellSize, cellSize);
    }
  }
}

function drawGridLines() {
  stroke(150);
  strokeWeight(1);
  for (let i = 0; i <= cols; i++) {
    line(i * cellSize, 0, i * cellSize, height);
  }
  for (let j = 0; j <= rows; j++) {
    line(0, j * cellSize, width, j * cellSize);
  }
}

function drawInfo() {
  fill(0);
  noStroke();
  textSize(12);

  let counts = {
    sano: 0,
    infectado: 0,
    muerto: 0,
    recuperado: 0
  };

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      switch (grid[i][j]) {
        case STATE.SANO:
          counts.sano++;
          break;
        case STATE.INFECTADO:
          counts.infectado++;
          break;
        case STATE.MUERTO:
          counts.muerto++;
          break;
        case STATE.RECUPERADO:
          counts.recuperado++;
          break;
      }
    }
  }

  text(`Celdas sanas: ${counts.sano}`, 10, height + 18);
  text(`Infectadas: ${counts.infectado}`, 120, height + 18);
  text(`Muertas: ${counts.muerto}`, 230, height + 18);
  text(`Recuperadas: ${counts.recuperado}`, 330, height + 18);
}
 

/******************************************************** */

function mousePressed() {
  if (!brushMode) return;

  let i = floor(mouseX / cellSize);
  let j = floor(mouseY / cellSize);

  if (i >= 0 && i < cols && j >= 0 && j < rows) {
    grid[i][j] = brushInfecting ? STATE.INFECTADO : STATE.SANO;
    timers[i][j] = brushInfecting ? infectionDuration : 0;
  }
}
