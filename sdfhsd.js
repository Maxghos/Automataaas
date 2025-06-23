// Parámetros de la simulación
let visibleCols = 70; // Celdas visibles en el ancho del canvas
let visibleRows = 70; // Celdas visibles en el alto del canvas
let cellSize = 12;

const STATE = {
  SANO: 0,
  INFECTADO: 1,
  MUERTO: 2,
  RECUPERADO: 3
};

// **CAMBIO CLAVE: Usamos Mapas para un grid dinámico y disperso**
let worldGrid = new Map();   // Almacena solo celdas no-SANO. Clave: "x,y", Valor: STATE
let worldTimers = new Map(); // Almacena temporizadores para celdas no-SANO. Clave: "x,y", Valor: tiempo

let infectionChance = 0.3;
let infectionDuration = 10;
let deathChance = 0.5;
let frameRateVal = 10;

let isPaused = false;

let initialFocus = 'center'; // 'center', 'random', 'brush'
let neighborhoodType = 'moore'; // 'moore' o 'vonneumann'

let brushMode = false;
let brushInfecting = true; // true: pintar infectado, false: pintar sano

// Variables para el panning (movimiento de la cámara)
let cameraX = 0; // Coordenada X de la celda en la esquina superior izquierda del canvas
let cameraY = 0; // Coordenada Y de la celda en la esquina superior izquierda del canvas
let lastMouseX = 0;
let lastMouseY = 0;

function setup() {
  // El canvas se crea con el tamaño de las celdas visibles
  const canvas = createCanvas(visibleCols * cellSize, visibleRows * cellSize);
  canvas.parent(document.body);

  frameRate(frameRateVal);
  setupGrid(); // Ahora inicializa los Mapas

  setupUI(); // Esta función debe estar definida para ser llamada
}

function setupGrid() {
  // **CAMBIO CLAVE: Reiniciamos los Mapas, no un array fijo**
  worldGrid = new Map();
  worldTimers = new Map();
  setInitialFocus();

  // Posicionar la cámara inicialmente en (0,0) o centrarla alrededor del foco inicial.
  // Aquí la centramos en (0,0) del mundo conceptualmente infinito.
  cameraX = 0 - floor(visibleCols / 2);
  cameraY = 0 - floor(visibleRows / 2);
}

function setInitialFocus() {
  // Ahora las coordenadas pueden ser negativas o muy grandes, representando un mundo infinito.
  // Aquí elegimos un "centro" conceptual para el inicio.
  if (initialFocus === 'center') {
    // El centro conceptual es (0,0) en este modelo de mundo infinito
    worldGrid.set("0,0", STATE.INFECTADO);
    worldTimers.set("0,0", infectionDuration);
  } else if (initialFocus === 'random') {
    let n = floor(random(5, 15));
    for (let k = 0; k < n; k++) {
      // Coordenadas aleatorias que pueden ser negativas o positivas
      let x = floor(random(-visibleCols, visibleCols)); // Rango inicial alrededor de 0
      let y = floor(random(-visibleRows, visibleRows));
      let key = `${x},${y}`;
      worldGrid.set(key, STATE.INFECTADO);
      worldTimers.set(key, infectionDuration);
    }
  }
  // brush no inicializa infectados automáticamente
}

// **Función setupUI (RE-INCLUIDA Y COMPLETA)**
function setupUI() {
  // Referencias HTML
  const icSlider = document.getElementById('infectionChance');
  const icVal = document.getElementById('infectionChanceVal');
  if (icSlider) { // Añadimos una verificación para evitar errores si el elemento no existe
    icSlider.value = infectionChance;
    icVal.textContent = infectionChance;

    icSlider.oninput = () => {
      infectionChance = parseFloat(icSlider.value);
      icVal.textContent = infectionChance.toFixed(2);
    };
  }

  const idSlider = document.getElementById('infectionDuration');
  const idVal = document.getElementById('infectionDurationVal');
  if (idSlider) {
    idSlider.value = infectionDuration;
    idVal.textContent = infectionDuration;

    idSlider.oninput = () => {
      infectionDuration = parseInt(idSlider.value);
      idVal.textContent = infectionDuration;
    };
  }

  const deathSlider = document.getElementById('deathChance');
  const deathVal = document.getElementById('deathChanceVal');
  if (deathSlider) {
    deathSlider.value = deathChance;
    deathVal.textContent = deathChance;

    deathSlider.oninput = () => {
      deathChance = parseFloat(deathSlider.value);
      deathVal.textContent = deathChance.toFixed(2);
    };
  }

  const fpsSlider = document.getElementById('frameRate');
  const fpsVal = document.getElementById('frameRateVal');
  if (fpsSlider) {
    fpsSlider.value = frameRateVal;
    fpsVal.textContent = frameRateVal;

    fpsSlider.oninput = () => {
      frameRateVal = parseInt(fpsSlider.value);
      fpsVal.textContent = frameRateVal;
      frameRate(frameRateVal);
    };
  }

  const restartBtn = document.getElementById('restartBtn');
  if (restartBtn) {
    restartBtn.onclick = () => {
      setupGrid();
    };
  }

  const pauseBtn = document.getElementById('pauseBtn');
  if (pauseBtn) {
    pauseBtn.onclick = () => {
      isPaused = !isPaused;
      pauseBtn.textContent = isPaused ? 'Reanudar' : 'Pausar';
    };
  }

  const initialFocusSelect = document.getElementById('initialFocus');
  if (initialFocusSelect) {
    initialFocusSelect.value = initialFocus;
    initialFocusSelect.onchange = () => {
      initialFocus = initialFocusSelect.value;
      setupGrid();
      brushMode = (initialFocus === 'brush');
    };
  }

  const neighborhoodSelect = document.getElementById('neighborhood');
  if (neighborhoodSelect) {
    neighborhoodSelect.value = neighborhoodType;
    neighborhoodSelect.onchange = () => {
      neighborhoodType = neighborhoodSelect.value;
    };
  }
}

function draw() {
  background(220);

  if (!isPaused) {
    updateSimulation(); // Opera en los Mapas de worldGrid
  }

  drawGrid();
  drawGridLines(); // Las líneas se dibujan para el canvas visible
  drawInfo(); // drawInfo debe contar del worldGrid (todos los elementos en el Map)
}

function updateSimulation() {
  // **CAMBIO CLAVE: La lógica de actualización para un grid disperso**
  let newWorldGrid = new Map();
  let newWorldTimers = new Map();
  let cellsToProcess = new Set(); // Conjunto de celdas a considerar para el siguiente estado

  // Añadir todas las celdas actualmente no-SANO y sus vecinos al conjunto de celdas a procesar
  for (let key of worldGrid.keys()) {
    let [x, y] = key.split(',').map(Number);
    cellsToProcess.add(`${x},${y}`); // La celda actual

    // Añadir vecinos también, ya que su estado puede cambiar
    let neighborsCoords = getNeighborCoordinates(x, y);
    for (let [nx, ny] of neighborsCoords) {
      cellsToProcess.add(`${nx},${ny}`);
    }
  }

  for (let key of cellsToProcess) {
    let [i, j] = key.split(',').map(Number);
    let state = worldGrid.get(key) || STATE.SANO; // Si no está en el Map, es SANO
    let timer = worldTimers.get(key) || 0; // Si no está, temporizador es 0

    let newState = state;
    let newTimer = timer;

    if (state === STATE.SANO) {
      let infectedNeighbors = countInfectedNeighbors(i, j); // Opera en worldGrid (Map)
      if (infectedNeighbors > 0) {
        let prob = 1 - Math.pow(1 - infectionChance, infectedNeighbors);
        if (random() < prob) {
          newState = STATE.INFECTADO;
          newTimer = infectionDuration;
        }
      }
    } else if (state === STATE.INFECTADO) {
      newTimer--;
      if (newTimer <= 0) {
        if (random() < deathChance) {
          newState = STATE.MUERTO;
        } else {
          newState = STATE.RECUPERADO;
        }
        newTimer = 0;
      }
    }
    // MUERTO y RECUPERADO no cambian

    // Solo almacenar en el nuevo Map si el estado no es SANO
    if (newState !== STATE.SANO) {
      newWorldGrid.set(key, newState);
      newWorldTimers.set(key, newTimer);
    }
  }

  worldGrid = newWorldGrid;
  worldTimers = newWorldTimers;
}

// Función auxiliar para obtener coordenadas de vecinos
function getNeighborCoordinates(x, y) {
  let neighbors = [];
  if (neighborhoodType === 'moore') {
    neighbors = [
      [x - 1, y - 1], [x, y - 1], [x + 1, y - 1],
      [x - 1, y], [x + 1, y],
      [x - 1, y + 1], [x, y + 1], [x + 1, y + 1]
    ];
  } else {
    neighbors = [
      [x, y - 1], [x - 1, y], [x + 1, y], [x, y + 1]
    ];
  }
  return neighbors;
}

function countInfectedNeighbors(x, y) {
  let count = 0;
  let neighborsCoords = getNeighborCoordinates(x, y);

  for (const [nx, ny] of neighborsCoords) {
    // Al ser un mundo infinito, no hay límites fijos de worldCols/worldRows aquí.
    // Simplemente comprobamos si la celda existe y está infectada.
    if (worldGrid.get(`${nx},${ny}`) === STATE.INFECTADO) {
      count++;
    }
  }
  return count;
}

function drawGrid() {
  noStroke();
  // Dibujar solo las celdas visibles en el canvas
  for (let i = 0; i < visibleCols; i++) {
    for (let j = 0; j < visibleRows; j++) {
      // Calcular la coordenada de la celda en el mundo
      let world_i = cameraX + i;
      let world_j = cameraY + j;
      let key = `${world_i},${world_j}`;

      // Obtener el estado del Map, si no existe, es SANO
      let state = worldGrid.get(key) || STATE.SANO;

      switch (state) {
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
      // Dibujar la celda en la posición relativa al canvas
      rect(i * cellSize, j * cellSize, cellSize, cellSize);
    }
  }
}

function drawGridLines() {
  stroke(150);
  strokeWeight(1);
  // Dibujar líneas para la vista actual del canvas (visibleCols x visibleRows)
  for (let i = 0; i <= visibleCols; i++) {
    line(i * cellSize, 0, i * cellSize, height);
  }
  for (let j = 0; j <= visibleRows; j++) {
    line(0, j * cellSize, width, j * cellSize);
  }
}

function drawInfo() {
  fill(0);
  noStroke();
  textSize(12);

  let counts = {
    infectado: 0,
    muerto: 0,
    recuperado: 0
  };

  // Contar el estado de las celdas sobre todo el worldGrid (Map)
  // En un mundo infinito, el número de celdas sanas no es un número fijo
  // Por lo tanto, solo contamos las celdas que están explícitamente en el mapa.
  for (let state of worldGrid.values()) {
    switch (state) {
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

  // Posicionamiento de la información debajo del canvas, asumiendo un espacio adicional
  // en el HTML para que el canvas tenga altura suficiente.
  text(`Infectadas: ${counts.infectado}`, 10, height + 18);
  text(`Muertas: ${counts.muerto}`, 120, height + 18);
  text(`Recuperadas: ${counts.recuperado}`, 230, height + 18);
}

/******************************************************** */

// Modificación de mousePressed para manejar el inicio del arrastre de la cámara y el pincel
function mousePressed() {
  lastMouseX = mouseX;
  lastMouseY = mouseY;

  // Si estamos en modo pincel y se presiona el botón izquierdo del mouse
  if (brushMode && mouseButton === LEFT) {
    // Calcular la coordenada de la celda en el mundo
    let world_i = cameraX + floor(mouseX / cellSize);
    let world_j = cameraY + floor(mouseY / cellSize);
    let key = `${world_i},${world_j}`;

    // Actualizar el estado en el Map
    worldGrid.set(key, brushInfecting ? STATE.INFECTADO : STATE.SANO);
    worldTimers.set(key, brushInfecting ? infectionDuration : 0);

    // Si la celda se vuelve SANO, la eliminamos del Map para mantenerlo disperso y eficiente
    if (worldGrid.get(key) === STATE.SANO) {
      worldGrid.delete(key);
      worldTimers.delete(key);
    }
  }
}

// Función mouseDragged para el arrastre de la cámara o el pincel
function mouseDragged() {
  // Si NO estamos en modo pincel Y se está arrastrando el botón derecho del mouse
  if (!brushMode && mouseButton === RIGHT) {
    let dx = mouseX - lastMouseX; // Diferencia en X
    let dy = mouseY - lastMouseY; // Diferencia en Y

    // Mover la cámara en función del arrastre (en píxeles, luego convertir a celdas)
    // No hay límites estrictos para cameraX/Y en un mundo "infinito"
    cameraX -= floor(dx / cellSize);
    cameraY -= floor(dy / cellSize);

    lastMouseX = mouseX;
    lastMouseY = mouseY;
  }
  // Si estamos en modo pincel Y se está arrastrando el botón izquierdo del mouse
  else if (brushMode && mouseButton === LEFT) {
    let world_i = cameraX + floor(mouseX / cellSize);
    let world_j = cameraY + floor(mouseY / cellSize);
    let key = `${world_i},${world_j}`;

    // Actualizar el estado en el Map
    worldGrid.set(key, brushInfecting ? STATE.INFECTADO : STATE.SANO);
    worldTimers.set(key, brushInfecting ? infectionDuration : 0);

    // Si la celda se vuelve SANO, la eliminamos del Map para mantenerlo disperso
    if (worldGrid.get(key) === STATE.SANO) {
      worldGrid.delete(key);
      worldTimers.delete(key);
    }
  }
}