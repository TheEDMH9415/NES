console.log("✅ input.js ha sido cargado correctamente");

const keys = {
    up: false,
    down: false,
    left: false,
    right: false,
    a: false,
    b: false,
    select: false,
    start: false,
};

// Mapeo de teclas físicas a controles de la NES
const keyMap = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    z: "b",
    x: "a",
    Enter: "start",
    Shift: "select",
};

// Captura de eventos de teclado (optimizados)
document.addEventListener("keydown", (event) => {
    const keyAction = keyMap[event.key];
    if (keyAction && !keys[keyAction]) { // Evita múltiples registros de la misma tecla
        keys[keyAction] = true;
        console.log(`🔹 Tecla presionada: ${event.key} → ${keyAction}`);
        event.preventDefault();
    }
});

document.addEventListener("keyup", (event) => {
    const keyAction = keyMap[event.key];
    if (keyAction) {
        keys[keyAction] = false;
        console.log(`🔻 Tecla liberada: ${event.key}`);
    }
});

// Función para agregar eventos a botones táctiles
function addButtonListener(id, action) {
    const button = document.getElementById(id);
    if (!button) {
        console.warn(`⚠️ Advertencia: El botón "${id}" no existe en el HTML.`);
        return;
    }

    const press = () => {
        if (!keys[action]) {
            keys[action] = true;
            console.log(`🟢 Botón presionado: ${action}`);
        }
    };

    const release = () => {
        if (keys[action]) {
            keys[action] = false;
            console.log(`🔴 Botón liberado: ${action}`);
        }
    };

    button.addEventListener("mousedown", press);
    button.addEventListener("mouseup", release);
    button.addEventListener("mouseleave", release);

    button.addEventListener("touchstart", (event) => {
        event.preventDefault();
        press();
    });

    button.addEventListener("touchend", release);
}

// Agregar eventos a todos los botones de la interfaz
const buttonActions = ["up", "down", "left", "right", "a", "b", "start", "select"];
buttonActions.forEach(action => addButtonListener(`btn-${action}`, action));

// Verificar que `keys` se lee en cada frame para evitar retrasos
function updateInput() {
    Object.entries(keys).forEach(([key, value]) => {
        if (value) console.log(`🎮 ${key.toUpperCase()} activo`);
    });
}

// Llamar esta función en cada frame
function gameLoop() {
    updateInput();
    requestAnimationFrame(gameLoop);
}

// Iniciar el loop
gameLoop();