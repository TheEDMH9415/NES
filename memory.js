class Memory {
    constructor() {
        this.ram = new Uint8Array(0x800); // 2 KB de RAM interna
        this.mapper = null;
        this.ppu = null; // Referencia a la PPU
    }

    setMapper(mapper) {
        this.mapper = mapper;
        console.log("✅ Mapper configurado correctamente.");
    }

    setPPU(ppu) {
        this.ppu = ppu;
        console.log("✅ PPU conectada correctamente a la memoria.");
    }

    read(address) {
        if (address < 0x2000) {
            return this.ram[address % 0x800]; // Mirroring de RAM
        } 
        else if (address >= 0x2000 && address <= 0x2007) {
            if (this.ppu) {
                return this.ppu.readRegister(address);
            } else {
                console.warn(`⚠️ Advertencia: Se intentó leer de la PPU en 0x${address.toString(16)}, pero no está inicializada.`);
                return 0;
            }
        } 
        else if (address >= 0x8000) {
            if (this.mapper) {
                return this.mapper.read(address);
            } else {
                console.warn(`⚠️ Advertencia: Intento de leer dirección 0x${address.toString(16)} sin mapper.`);
                return 0xFF;
            }
        }

        console.warn(`⚠️ Advertencia: Lectura en dirección desconocida: 0x${address.toString(16)}`);
        return 0;
    }

    write(address, value) {
        if (value < 0 || value > 0xFF) {
            console.error(`❌ ERROR: Valor fuera de rango en escritura: 0x${value.toString(16)} en 0x${address.toString(16)}`);
            return;
        }

        if (address < 0x2000) {
            this.ram[address % 0x800] = value; // Mirroring de RAM
        } 
        else if (address >= 0x2000 && address <= 0x2007) {
            if (this.ppu) {
                this.ppu.writeRegister(address, value);
            } else {
                console.warn(`⚠️ Advertencia: Se intentó escribir en la PPU en 0x${address.toString(16)}, pero no está inicializada.`);
            }
        } 
        else if (address >= 0x8000) {
            if (this.mapper) {
                this.mapper.write(address, value);
            } else {
                console.warn(`⚠️ Advertencia: Intento de escribir en dirección 0x${address.toString(16)} sin mapper.`);
            }
        } 
        else {
            console.warn(`⚠️ Advertencia: Escritura en dirección desconocida: 0x${address.toString(16)}`);
        }
    }

    dumpMemory(start, end) {
        if (start < 0 || end >= 0x10000 || start > end) {
            console.error("❌ ERROR: Rango de memoria inválido para volcado.");
            return;
        }

        console.log(`📜 Volcado de memoria desde 0x${start.toString(16)} hasta 0x${end.toString(16)}`);
        for (let i = start; i <= end; i += 16) {
            let line = `0x${i.toString(16).padStart(4, '0')}: `;
            for (let j = 0; j < 16 && i + j <= end; j++) {
                line += `${this.read(i + j).toString(16).padStart(2, '0')} `;
            }
            console.log(line);
        }
    }
}

// Inicializar la memoria globalmente
window.memory = new Memory();
console.log("✅ Memoria inicializada correctamente.");