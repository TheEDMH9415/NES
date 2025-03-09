document.addEventListener("DOMContentLoaded", () => {
    const NES = {
        canvas: document.getElementById("nes-canvas"),
        ctx: null,
        romInput: document.getElementById("rom-loader"),
        loadButton: document.getElementById("load-rom"),
        cpu: null,
        memory: null,
        ppu: null,
        running: false,
    };

    // Validar el canvas
    if (!NES.canvas) {
        console.error("❌ No se encontró el elemento <canvas>.");
        return;
    }
    NES.ctx = NES.canvas.getContext("2d");

    // Cargar ROM
    NES.loadButton.addEventListener("click", () => {
        const file = NES.romInput.files[0];
        if (!file) {
            console.warn("⚠️ No se seleccionó ninguna ROM.");
            return;
        }

        if (!file.name.toLowerCase().endsWith(".nes")) {
            console.warn("⚠️ Archivo no válido. Debe ser .nes");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const romData = new Uint8Array(event.target.result);
            if (romData.length < 16) {
                console.error("❌ Error: ROM inválida.");
                return;
            }
            console.log(`📥 ROM cargada: ${romData.length} bytes`);
            loadROM(romData);
        };
        reader.readAsArrayBuffer(file);
    });

    // Cargar la ROM en memoria
    function loadROM(romData) {
    console.log("📂 Procesando ROM...");

    if (typeof Memory === "undefined" || typeof CPU === "undefined" || typeof PPU === "undefined") {
        console.error("❌ Error: Memory, CPU o PPU no están definidos.");
        return;
    }

    // Crear instancias en el orden correcto
    NES.memory = new Memory();
    NES.ppu = new PPU(NES.memory); // 🔹 Crear la PPU antes de la CPU
    NES.memory.setPPU(NES.ppu); // 🔹 Conectar la PPU a la memoria
    NES.cpu = new CPU(NES.memory); // 🔹 Crear la CPU después de la PPU

    if (!NES.memory || !NES.cpu || !NES.ppu) {
        console.error("❌ Error: No se pudo inicializar los componentes.");
        return;
    }

    // Detectar mapper
    const mapperType = ((romData[7] & 0xF0) | (romData[6] >> 4));
    console.log(`🛠️ Mapper detectado: ${mapperType}`);

    // Obtener tamaño de PRG y CHR
    const prgSize = romData[4] * 0x4000;
    const chrSize = romData[5] * 0x2000;
    console.log(`PRG-ROM: ${prgSize} bytes, CHR-ROM: ${chrSize} bytes`);

    if (prgSize === 0) {
        console.error("❌ Error: PRG-ROM inválido.");
        return;
    }

    const prgROM = romData.slice(16, 16 + prgSize);
    const chrROM = (chrSize > 0) ? romData.slice(16 + prgSize, 16 + prgSize + chrSize) : new Uint8Array(0x2000);

    let mapper;
    switch (mapperType) {
        case 0:
            mapper = new MapperNROM(prgROM, chrROM);
            break;
        case 1:
            mapper = new MapperMMC1(prgROM, chrROM);
            break;
        case 4:
            mapper = new MapperMMC3(prgROM, chrROM);
            break;
        default:
            console.warn(`⚠️ Mapper ${mapperType} no soportado.`);
            return;
    }

    // Asignar el mapper a la memoria
    NES.memory.setMapper(mapper);
    console.log(`✅ Mapper ${mapperType} asignado correctamente.`);

    // Iniciar el emulador
    initNES();
}

    function initNES() {
        console.log("🔍 Inicializando NES...");
        
        if (!NES.cpu || !NES.memory || !NES.ppu) {
            console.error("❌ Error: Componentes no inicializados.");
            return;
        }

        try {
            NES.cpu.reset();
            NES.running = true;
            console.log("✅ Emulador en ejecución.");
            requestAnimationFrame(mainLoop);
        } catch (error) {
            console.error("❌ Error al iniciar el emulador:", error);
        }
    }

    function mainLoop() {
        if (!NES.running) return;

        // Aquí iría la ejecución del ciclo del CPU y la actualización del PPU
        requestAnimationFrame(mainLoop);
    }
});