const NES_PALETTE = [
    "#7C7C7C", "#0000FC", "#0000BC", "#4428BC", "#940084", "#A80020", "#A81000", "#881400",
    "#503000", "#007800", "#006800", "#005800", "#004058", "#000000", "#000000", "#000000",
    "#BCBCBC", "#0078F8", "#0058F8", "#6844FC", "#D800CC", "#E40058", "#F83800", "#E45C10",
    "#AC7C00", "#00B800", "#00A800", "#00A844", "#008888", "#000000", "#000000", "#000000",
    "#F8F8F8", "#3CBCFC", "#6888FC", "#9878F8", "#F878F8", "#F85898", "#F87858", "#FCA044",
    "#F8B800", "#B8F818", "#58D854", "#58F898", "#00E8D8", "#787878", "#000000", "#000000",
    "#FCFCFC", "#A4E4FC", "#B8B8F8", "#D8B8F8", "#F8B8F8", "#F8A4C0", "#F0D0B0", "#FCE0A8",
    "#F8D878", "#D8F878", "#B8F8B8", "#B8F8D8", "#00FCFC", "#F8D8F8", "#000000", "#000000"
];

class PPU {
    constructor(chrSize = 0x2000) {
        this.chrMemory = new Uint8Array(chrSize);
        this.nametables = new Uint8Array(0x800);
        this.paletteRAM = new Uint8Array(32);
        this.oam = new Uint8Array(256);
        this.oamaddr = 0x00;
        this.ppuscrollX = 0x00;
        this.ppuscrollY = 0x00;
        this.scrollLatch = false;

        this.ppuctrl = 0x00;
        this.ppumask = 0x00;
        this.ppustatus = 0x00;

        this.ppuaddr = 0x0000;
        this.addressLatch = false;

        this.baseNametableAddress = 0x2000;
        this.vramIncrement = 1;
        this.spritePatternTable = 0x0000;
        this.backgroundPatternTable = 0x0000;
        this.spriteSize = 8;
        this.generateNMI = false;

        this.greyscale = false;
        this.showBackgroundLeft = false;
        this.showSpritesLeft = false;
        this.showBackground = false;
        this.showSprites = false;
        this.emphasizeRed = false;
        this.emphasizeGreen = false;
        this.emphasizeBlue = false;

        this.vblank = false;
        this.sprite0Hit = false;
        this.spriteOverflow = false;

        this.bufferedData = 0;
        this.mirroringType = "horizontal";
    }

    getNametableAddress(addr) {
        let index = (addr - 0x2000) & 0xFFF;
        switch (this.mirroringType) {
            case "horizontal":
                return (index & 0x400) ? (index & 0x3FF) + 0x400 : index & 0x3FF;
            case "vertical":
                return index & 0x7FF;
            case "four-screen":
                return index;
            default:
                return index & 0x3FF;
        }
    }

    getColorFromPalette(index) {
        return NES_PALETTE[this.paletteRAM[index & 0x1F] % 64];
    }

    writePPUADDR(value) {
        if (!this.addressLatch) {
            this.ppuaddr = (this.ppuaddr & 0x00FF) | ((value & 0x3F) << 8);
        } else {
            this.ppuaddr = (this.ppuaddr & 0xFF00) | value;
        }
        this.addressLatch = !this.addressLatch;
    }

    writePPUSCROLL(value) {
        if (!this.scrollLatch) {
            this.ppuscrollX = value;
        } else {
            this.ppuscrollY = value;
        }
        this.scrollLatch = !this.scrollLatch;
    }

    readPPUDATA() {
        let addr = this.ppuaddr & 0x3FFF;
        let data;

        if (addr < 0x2000) {
            data = this.chrMemory[addr];
        } else if (addr >= 0x3F00) {
            data = this.paletteRAM[addr & 0x1F];
        } else {
            let nametableAddr = this.getNametableAddress(addr);
            data = this.bufferedData;
            this.bufferedData = this.nametables[nametableAddr];
        }

        this.ppuaddr = (this.ppuaddr + this.vramIncrement) & 0xFFFF;
        return data;
    }

    decodeTile(tileIndex) {
        let tileData = Array.from({ length: 8 }, () => Array(8).fill(0));
        let baseAddr = tileIndex * 16;

        for (let row = 0; row < 8; row++) {
            let bitplane1 = this.chrMemory[baseAddr + row];
            let bitplane2 = this.chrMemory[baseAddr + row + 8];

            for (let col = 0; col < 8; col++) {
                let bit1 = (bitplane1 >> (7 - col)) & 1;
                let bit2 = (bitplane2 >> (7 - col)) & 1;
                tileData[row][col] = (bit2 << 1) | bit1;
            }
        }
        return tileData;
    }

    renderBackground(ctx) {
    if (!this.showBackground) return;
    //console.log("Dibujando fondo...");
    //console.log("Dibujando fondo...");
//console.log("Nametables Length:", this.nametables.length);

    for (let tileY = 0; tileY < 30; tileY++) {
        for (let tileX = 0; tileX < 32; tileX++) {
            let tileIndex = this.nametables[tileY * 32 + tileX]; // Índice del tile en la nametable
            let paletteIndex = this.getAttributeTableIndex(tileX, tileY); // Índice de la paleta
            let tileData = this.decodeTile(tileIndex + (this.backgroundPatternTable >> 12)); // Se ajusta la tabla de patrones

            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    let colorIndex = tileData[row][col]; // Índice del color dentro del tile
                    if (colorIndex === 0) continue; // Ignora color 0 (transparente)

                    let color = this.getColorFromPalette(paletteIndex, colorIndex); // Obtiene el color final
                    ctx.fillStyle = color;
                    ctx.fillRect((tileX * 8) + col, (tileY * 8) + row, 1, 1);
                }
            }
        }
    }
}

    renderSprites(ctx) {
    if (!this.showSprites) return;
    //console.log("Dibujando sprites...");

    for (let i = 0; i < 64; i++) {
        let y = this.oam[i * 4] - 1;
        let tileIndex = this.oam[i * 4 + 1];
        let attributes = this.oam[i * 4 + 2];
        let x = this.oam[i * 4 + 3];

        let flipHorizontal = (attributes & 0b01000000) !== 0;
        let flipVertical = (attributes & 0b10000000) !== 0;
        let paletteIndex = 4 + (attributes & 0b11); // Paletas de sprites están en $3F10 - $3F1F

        let tileData = this.decodeTile(tileIndex + (this.spritePatternTable >> 12));

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                let srcRow = flipVertical ? 7 - row : row;
                let srcCol = flipHorizontal ? 7 - col : col;

                let colorIndex = tileData[srcRow][srcCol];
                if (colorIndex === 0) continue; // Color 0 es transparente en sprites

                let color = this.getColorFromPalette(paletteIndex, colorIndex);
                ctx.fillStyle = color;
                ctx.fillRect(x + col, y + row, 1, 1);
            }
        }
    }
}
    
    getAttributeTableIndex(tileX, tileY) {
    let nametableIndex = ((tileY >= 30) ? 2 : 0) | ((tileX >= 32) ? 1 : 0);
    let attrTableBase = 0x23C0 + (nametableIndex * 0x400);

    let attrX = Math.floor((tileX % 32) / 4);
    let attrY = Math.floor((tileY % 30) / 4);
    let attrIndex = attrY * 8 + attrX;
    let attrByte = this.nametables[this.getNametableAddress(attrTableBase + attrIndex)];

    let shift = ((tileY % 4) >= 2 ? 4 : 0) + ((tileX % 4) >= 2 ? 2 : 0);
    return (attrByte >> shift) & 0b11;
}

    renderScreen(ctx) {
        if (!ctx) {
            console.error("Error: Contexto de canvas no válido");
            return;
        }

        console.log("Renderizando frame...");
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, 256, 240);

        this.renderBackground(ctx);
        this.renderSprites(ctx);

        setTimeout(() => this.setVBlank(), 16);
        requestAnimationFrame(() => this.renderScreen(ctx));
} 

    setVBlank() {
        this.vblank = true;
        this.ppustatus |= 0b10000000;
        if (this.generateNMI) {
            console.log("Generando NMI...");
        }
    }

    loadCHR(data) {
        if (data.length > this.chrMemory.length) {
            console.error("Error: CHR-ROM demasiado grande para la memoria PPU");
            return;
        }
        this.chrMemory.set(data);
    }

    setMirroring(type) {
        this.mirroringType = type;
    }
    
    writePPUCTRL(value) {
        this.ppuctrl = value;
        this.baseNametableAddress = 0x2000 + ((value & 0b00000011) << 10);
        this.vramIncrement = (value & 0b00000100) ? 32 : 1;
        this.spritePatternTable = (value & 0b00001000) ? 0x1000 : 0x0000;
        this.backgroundPatternTable = (value & 0b00010000) ? 0x1000 : 0x0000;
        this.spriteSize = (value & 0b00100000) ? 16 : 8;
        this.generateNMI = !!(value & 0b10000000);
    }

    writePPUMASK(value) {
        this.ppumask = value;
        this.greyscale = !!(value & 0b00000001);
        this.showBackgroundLeft = !!(value & 0b00000010);
        this.showSpritesLeft = !!(value & 0b00000100);
        this.showBackground = !!(value & 0b00001000);
        this.showSprites = !!(value & 0b00010000);
        this.emphasizeRed = !!(value & 0b00100000);
        this.emphasizeGreen = !!(value & 0b01000000);
        this.emphasizeBlue = !!(value & 0b10000000);
    }

    readPPUSTATUS() {
        const status = (this.vblank ? 0x80 : 0x00)
            | (this.sprite0Hit ? 0x40 : 0x00)
            | (this.spriteOverflow ? 0x20 : 0x00)
            | (this.ppustatus & 0x1F);
        this.vblank = false;
        this.addressLatch = false;
        return status;
    }

    writeOAMADDR(value) {
        this.oamaddr = value;
    }

    writeOAMDATA(value) {
        this.oam[this.oamaddr] = value;
        this.oamaddr = (this.oamaddr + 1) & 0xFF;
    }

    readOAMDATA() {
        return this.oam[this.oamaddr];
    }
    
    //Esta parte de aca esta en proceso de Trabajo y Validacion en la CPU ---->
       
    writeRegister(addr, value) {
        switch (addr & 0x2007) {
            case 0x2000: this.writePPUCTRL(value); break;
            case 0x2001: this.writePPUMASK(value); break;
            case 0x2003: this.writeOAMADDR(value); break;
            case 0x2004: this.writeOAMDATA(value); break;
            case 0x2005: this.writePPUSCROLL(value); break;
            case 0x2006: this.writePPUADDR(value); break;
            case 0x2007:
                let writeAddr = this.ppuaddr & 0x3FFF;
                if (writeAddr < 0x2000) {
                    this.chrMemory[writeAddr] = value;
                } else if (writeAddr >= 0x3F00) {
                    this.paletteRAM[writeAddr & 0x1F] = value;
                } else {
                    let ntAddr = this.getNametableAddress(writeAddr);
                    this.nametables[ntAddr] = value;
                }
                this.ppuaddr = (this.ppuaddr + this.vramIncrement) & 0xFFFF;
                break;
        }
    }

    readRegister(addr) {
        switch (addr & 0x2007) {
            case 0x2002: return this.readPPUSTATUS();
            case 0x2004: return this.readOAMDATA();
            case 0x2007: return this.readPPUDATA();
            default: return 0; // Registros de escritura como PPUCTRL/PPUMASK devuelven 0 en lectura
        }
    }
}

// Verifica si el canvas está correctamente configurado
const canvas = document.getElementById("nes-canvas");
const ctx = canvas ? canvas.getContext("2d") : null;

if (!ctx) {
    console.error("No se pudo obtener el contexto del canvas.");
} else {
    console.log("Canvas configurado correctamente.");
}

const ppu = new PPU();
ppu.setMirroring("horizontal");

for (let i = 0; i < ppu.nametables.length; i++) {
    ppu.nametables[i] = i % 256;
}

for (let i = 0; i < 16; i++) {
    ppu.chrMemory[i] = 0b10101010;
    ppu.chrMemory[i + 8] = 0b01010101;
}

ppu.showBackground = true;
ppu.showSprites = true;

console.log("Llamando a renderScreen");
ppu.renderScreen(ctx);