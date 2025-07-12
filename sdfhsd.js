// Parámetros de configuración de la simulacion... Comentarios a continuación
let visibleCols = 70;       // Cantidad de columnas visibles en el canvas (visual)
let visibleRows = 70;       // Cantidad de filas visibles en el canvas (visual)
let cellSize = 12;          // Tamaño de cada celda en píxeles

// Estados posibles de cada celdaa
const STATE = {
  SANO: 0,
  INFECTADO: 1,
  MUERTO: 2,
  RECUPERADO: 3
};

// Mapa dinámico -> solo se almacenan celdas distintas a "SANO"
let worldGrid = new Map();     // Almacena el estado actual de cada celda
let worldTimers = new Map();   // Almacena la duración restante de infección por celdaa

// Parametros de control ajustables desde la interfaz
let infectionChance = 0.3;     // Probabilidad de infección
let infectionDuration = 10;    // Duración en ciclos de la infección
let deathChance = 0.5;         // Probabilidad de muerte tras infección
let frameRateVal = 10;         // Velocidad de actualización en FPS

// Control de ejecución
let isPaused = false;

// Configuraciones iniciales
let initialFocus = 'center';         // Forma de iniciar la infección
let neighborhoodType = 'moore';      // Tipo de vecindario (moore o von neumann)
let brushMode = false;               // Si se puede dibujar con el mouse
let brushInfecting = true;          // Define si el pincel infecta o sana

// Coordenadas para control de la cámara (mover con click derecho)
let cameraX = 0, cameraY = 0;
let lastMouseX = 0, lastMouseY = 0;


function setup() {
  // El canvas (visual) se crea con el tamaño de las celdas visibles
  const canvas = createCanvas(visibleCols * cellSize, visibleRows * cellSize);
  canvas.parent(document.body);

  frameRate(frameRateVal);
  setupGrid(); // Ahora inicializa los mapas...

  setupUI(); // Esta función debe estar definida para ser llamada...
}

function setupGrid() {
  // CAMBIO CLAVE -> Reiniciamos los mapas, no un array fijo
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
  // Donde aquí elegimos un "centro" conceptual para el inicio.
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
  // Brush no inicializa infectados automáticamente
}

// Función setupUI()
// Esta función se encarga de conectar todos los elementos de la interfaz de usuario (sliders, botones, selects, etc.)
// con la lógica del programa, de forma que cualquier cambio que el usuario realice en la interfaz
// afecte directamente a los parámetros y comportamiento de la simulación.
function setupUI() {
  // ==============================
  // Slider: Probabilidad de contagio
  // ==============================
  const icSlider = document.getElementById('infectionChance');     // Control deslizante del HTML
  const icVal = document.getElementById('infectionChanceVal');     // Texto que muestra el valor actual

  if (icSlider) { // Verificamos que el slider exista para evitar errores
    icSlider.value = infectionChance;                   // Inicializa el slider con el valor actual
    icVal.textContent = infectionChance;                // Muestra el valor numérico en pantalla

    // Evento: cuando el usuario mueve el slider
    icSlider.oninput = () => {
      infectionChance = parseFloat(icSlider.value);     // Actualiza la variable global
      icVal.textContent = infectionChance.toFixed(2);   // Muestra el nuevo valor, con 2 decimales
    };
  }

  // ==============================
  // Slider: Duración de la infección (en ciclos)
  // ==============================
  const idSlider = document.getElementById('infectionDuration');
  const idVal = document.getElementById('infectionDurationVal');

  if (idSlider) {
    idSlider.value = infectionDuration;
    idVal.textContent = infectionDuration;

    idSlider.oninput = () => {
      infectionDuration = parseInt(idSlider.value);     // Actualiza duración como número entero
      idVal.textContent = infectionDuration;
    };
  }

  // ==============================
  // Slider: Probabilidad de muerte
  // ==============================
  const deathSlider = document.getElementById('deathChance');
  const deathVal = document.getElementById('deathChanceVal');

  if (deathSlider) {
    deathSlider.value = deathChance;
    deathVal.textContent = deathChance;

    deathSlider.oninput = () => {
      deathChance = parseFloat(deathSlider.value);       // Actualiza la probabilidad de muerte
      deathVal.textContent = deathChance.toFixed(2);
    };
  }

  // ==============================
  // Slider: Velocidad de la simulación (FPS)
  // ==============================
  const fpsSlider = document.getElementById('frameRate');
  const fpsVal = document.getElementById('frameRateVal');

  if (fpsSlider) {
    fpsSlider.value = frameRateVal;
    fpsVal.textContent = frameRateVal;

    fpsSlider.oninput = () => {
      frameRateVal = parseInt(fpsSlider.value);         // Actualiza la velocidad de cuadros por segundo
      fpsVal.textContent = frameRateVal;
      frameRate(frameRateVal);                          // Aplica el nuevo frameRate en tiempo real
    };
  }

  // ==============================
  // Botón: Reiniciar simulación
  // ==============================
  const restartBtn = document.getElementById('restartBtn');
  if (restartBtn) {
    restartBtn.onclick = () => {
      setupGrid();  // Vuelve a inicializar el "mundo" (grid y estados)
    };
  }

  // ==============================
  // Botón: Pausar/Reanudar simulación
  // ==============================
  const pauseBtn = document.getElementById('pauseBtn');
  if (pauseBtn) {
    pauseBtn.onclick = () => {
      isPaused = !isPaused; // Alterna entre pausado y corriendo
      pauseBtn.textContent = isPaused ? 'Reanudar' : 'Pausar'; // Cambia el texto del botón
    };
  }

  // ==============================
  // Selector: Tipo de foco inicial (center, random, brush)
  // ==============================
  const initialFocusSelect = document.getElementById('initialFocus');
  if (initialFocusSelect) {
    initialFocusSelect.value = initialFocus;

    initialFocusSelect.onchange = () => {
      initialFocus = initialFocusSelect.value; // Actualiza la variable global
      setupGrid();                             // Reinicia la simulación con el nuevo foco
      brushMode = (initialFocus === 'brush');  // Si es modo pincel, habilita el brushMode
    };
  }

  // ==============================
  // Selector: Tipo de vecindario (Moore o Von Neumann)
  // ==============================
  const neighborhoodSelect = document.getElementById('neighborhood');
  if (neighborhoodSelect) {
    neighborhoodSelect.value = neighborhoodType;

    neighborhoodSelect.onchange = () => {
      neighborhoodType = neighborhoodSelect.value; // Cambia el tipo de vecindario en tiempo real
    };
  }
}


// ==============================
// FUNCIÓN PRINCIPAL DE DIBUJO Y ACTUALIZACIÓN
// ==============================

function draw() {
  background(220); // Limpia el canvas con un fondo gris claro (color 220)

  // Si la simulación no está en pausa, se actualiza el estado del mundo
  if (!isPaused) {
    updateSimulation(); // Calcula la evolución de la infección para un paso
  }

  drawGrid();      // Dibuja las celdas en pantalla, según su estado actual
  drawGridLines(); // Dibuja las líneas del grid visible (rejilla)
  drawInfo();      // Muestra en pantalla información como cantidad de infectados, muertos, recuperados
}

// ==============================
// FUNCIÓN DE ACTUALIZACIÓN DE LA SIMULACIÓN
// ==============================

function updateSimulation() {
  // Crea nuevos mapas para guardar el estado actualizado del mundo
  let newWorldGrid = new Map();       // Nuevo mapa de celdas activas (no sanas)
  let newWorldTimers = new Map();     // Nuevo mapa con los temporizadores de infección

  let cellsToProcess = new Set();     // Conjunto de celdas a analizar (las que pueden cambiar)

  // Paso 1: Agregar al conjunto todas las celdas activas (infectados, muertos, recuperados)
  // y también sus vecinos, ya que podrían infectarse
  for (let key of worldGrid.keys()) {
    let [x, y] = key.split(',').map(Number);

    cellsToProcess.add(`${x},${y}`); // Agrega la celda actual

    // Agrega los vecinos de esta celda (el vecindario depende del tipo seleccionado)
    let neighborsCoords = getNeighborCoordinates(x, y);
    for (let [nx, ny] of neighborsCoords) {
      cellsToProcess.add(`${nx},${ny}`); // Cada vecino es candidato a cambiar
    }
  }

  // Paso 2: Procesar cada celda que podría cambiar
  for (let key of cellsToProcess) {
    let [i, j] = key.split(',').map(Number);

    // Obtiene el estado actual de la celda y su temporizador
    let state = worldGrid.get(key) || STATE.SANO;   // Si no está en el mapa, es SANO
    let timer = worldTimers.get(key) || 0;

    let newState = state;
    let newTimer = timer;

    // === CASO 1: Celda sana ===
    if (state === STATE.SANO) {
      // Contamos cuántos vecinos están infectados
      let infectedNeighbors = countInfectedNeighbors(i, j);
      if (infectedNeighbors > 0) {
        // Calculamos la probabilidad acumulada de infección
        let prob = 1 - Math.pow(1 - infectionChance, infectedNeighbors);
        if (random() < prob) {
          // Se infecta
          newState = STATE.INFECTADO;
          newTimer = infectionDuration;
        }
      }

    // === CASO 2: Celda infectada ===
    } else if (state === STATE.INFECTADO) {
      newTimer--; // Disminuye el contador de infección

      if (newTimer <= 0) {
        // La infección termina, la persona muere o se recupera
        if (random() < deathChance) {
          newState = STATE.MUERTO;
        } else {
          newState = STATE.RECUPERADO;
        }
        newTimer = 0;
      }

    // === CASOS 3 y 4: MUERTO o RECUPERADO ===
    // No se actualizan, simplemente se mantienen
    }

    // Si el nuevo estado no es SANO, lo almacenamos en los nuevos mapas
    if (newState !== STATE.SANO) {
      newWorldGrid.set(key, newState);
      newWorldTimers.set(key, newTimer);
    }
  }

  // Finalmente, reemplazamos los mapas antiguos por los nuevos
  worldGrid = newWorldGrid;
  worldTimers = newWorldTimers;
}


// =============================================
// Función auxiliar que obtiene las coordenadas de los vecinos de una celda
// según el tipo de vecindario seleccionado (Moore o Von Neumann)
// =============================================
function getNeighborCoordinates(x, y) {
  let neighbors = [];

  if (neighborhoodType === 'moore') {
    // Vecindario de Moore: considera las 8 celdas alrededor (horizontal, vertical y diagonal)
    neighbors = [
      [x - 1, y - 1], [x, y - 1], [x + 1, y - 1],  // Arriba
      [x - 1, y],               [x + 1, y],        // Lados
      [x - 1, y + 1], [x, y + 1], [x + 1, y + 1]   // Abajo
    ];
  } else {
    // Vecindario de Von Neumann: solo considera las 4 celdas ortogonales (no diagonales)
    neighbors = [
      [x, y - 1],               // Arriba
      [x - 1, y], [x + 1, y],   // Izquierda y derecha
      [x, y + 1]                // Abajo
    ];
  }

  return neighbors; // Devuelve un arreglo de coordenadas [x, y] de vecinos
}


// =============================================
// Función que cuenta cuántos vecinos infectados tiene una celda específica
// =============================================
function countInfectedNeighbors(x, y) {
  let count = 0;

  // Obtener las coordenadas de los vecinos, según el tipo de vecindario
  let neighborsCoords = getNeighborCoordinates(x, y);

  for (const [nx, ny] of neighborsCoords) {
    // Revisamos en el mapa worldGrid si la celda vecina está infectada
    // Si no existe en el mapa, se asume que está sana y no se cuenta
    if (worldGrid.get(`${nx},${ny}`) === STATE.INFECTADO) {
      count++; // Sumamos si está infectado
    }
  }

  return count; // Retorna el número total de vecinos infectados
}


function drawGrid() {
  noStroke(); // Desactivar contornos para las celdas para que se vean lisas

  // Recorrer todas las celdas visibles en el canvas según visibleCols y visibleRows
  for (let i = 0; i < visibleCols; i++) {
    for (let j = 0; j < visibleRows; j++) {

      // Calcular la coordenada real en el "mundo" (considerando la posición de la cámara)
      // cameraX y cameraY indican la celda en el mundo que está en la esquina superior izquierda del canvas
      let world_i = cameraX + i;
      let world_j = cameraY + j;

      // Crear clave para buscar el estado en el Map worldGrid
      let key = `${world_i},${world_j}`;

      // Obtener el estado actual de esa celda
      // Si no está en el mapa, asumimos que es SANO (valor por defecto)
      let state = worldGrid.get(key) || STATE.SANO;

      // Cambiar el color de relleno según el estado de la celda
      switch (state) {
        case STATE.SANO:
          fill(0, 200, 0);  // Verde para sano
          break;
        case STATE.INFECTADO:
          fill(255, 0, 0);  // Rojo para infectado
          break;
        case STATE.MUERTO:
          fill(60, 40, 20); // Marrón oscuro para muerto
          break;
        case STATE.RECUPERADO:
          fill(0, 150, 255); // Azul para recuperado
          break;
      }

      // Dibujar el rectángulo que representa la celda en la posición i,j del canvas
      // El tamaño de cada celda es cellSize x cellSize píxeles
      rect(i * cellSize, j * cellSize, cellSize, cellSize);
    }
  }
}

// -----------------------------------------------------------

function drawGridLines() {
  stroke(150);       // Color gris para las líneas
  strokeWeight(1);   // Grosor de línea delgada

  // Dibujar líneas verticales para separar columnas visibles
  for (let i = 0; i <= visibleCols; i++) {
    line(i * cellSize, 0, i * cellSize, height);
  }

  // Dibujar líneas horizontales para separar filas visibles
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