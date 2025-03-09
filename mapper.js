class MapperNROM {
    constructor(prgROM, chrROM) {
        this.prgROM = prgROM;
        this.chrROM = chrROM;
        this.prgBanks = prgROM.length / 0x4000;
    }

    read(address) {
        if (address >= 0x8000) {
            let index = (this.prgBanks === 1) ? (address - 0x8000) % 0x4000 : (address - 0x8000);
            return this.prgROM[index];
        } else if (address < 0x2000) {
            return this.chrROM ? this.chrROM[address] : 0;
        }
        return 0;
    }

    write(address, value) {
        if (address < 0x2000 && this.chrROM) {
            this.chrROM[address] = value;
        }
    }
}

class MapperMMC1 {
    constructor(prgROM, chrROM) {
        this.prgROM = prgROM;
        this.chrROM = chrROM;
        this.shiftRegister = 0x10;
        this.control = 0x0C;
        this.prgBank = 0;
        this.chrBank = 0;
    }

    read(address) {
        if (address >= 0x8000) {
            let bankOffset = (this.prgBank * 0x4000) % this.prgROM.length;
            return this.prgROM[bankOffset + (address - 0x8000)];
        } else if (address < 0x2000) {
            return this.chrROM ? this.chrROM[address + (this.chrBank * 0x2000)] : 0;
        }
        return 0;
    }

    write(address, value) {
        if (address >= 0x8000) {
            if (value & 0x80) {
                this.shiftRegister = 0x10;
                this.control |= 0x0C;
                return;
            }

            let complete = this.shiftRegister & 1;
            this.shiftRegister = (this.shiftRegister >> 1) | ((value & 1) << 4);

            if (complete) {
                let reg = (address >> 13) & 3;
                switch (reg) {
                    case 0: this.control = this.shiftRegister & 0x1F; break;
                    case 1: this.chrBank = this.shiftRegister & 0x1F; break;
                    case 2: this.prgBank = this.shiftRegister & 0x0F; break;
                }
                this.shiftRegister = 0x10;
            }
        }
    }
}

class MapperMMC3 {
    constructor(prgROM, chrROM) {
        this.prgROM = prgROM;
        this.chrROM = chrROM;
        this.prgBanks = prgROM.length / 0x2000;
        this.chrBanks = chrROM.length / 0x400;

        // Registros internos
        this.bankSelect = 0;
        this.bankRegisters = new Uint8Array(8);
        this.mirroring = 0;
        this.irqCounter = 0;
        this.irqReload = 0;
        this.irqEnable = false;
        this.irqPending = false;
        this.prgMode = 0;
        this.chrMode = 0;
    }

    read(address) {
        if (address >= 0x8000) {
            let bank;
            if (address < 0xA000) {
                bank = this.prgMode ? (this.prgBanks - 2) : this.bankRegisters[6];
            } else if (address < 0xC000) {
                bank = this.bankRegisters[7];
            } else if (address < 0xE000) {
                bank = this.prgMode ? this.bankRegisters[6] : (this.prgBanks - 2);
            } else {
                bank = this.prgBanks - 1; // Último banco siempre fijo
            }
            return this.prgROM[(bank * 0x2000) + (address % 0x2000)];
        } else if (address < 0x2000) {
            let bankIndex = (address < 0x1000) ? 0 : 1;
            if (this.chrMode) bankIndex ^= 4;
            let bank = this.bankRegisters[bankIndex] % this.chrBanks;
            return this.chrROM[(bank * 0x1000) + (address % 0x1000)];
        }
        return 0;
    }

    write(address, value) {
        if (address >= 0x8000) {
            if (address % 2 === 0) {
                this.bankSelect = value & 0x07;
                this.prgMode = (value & 0x40) >> 6;
                this.chrMode = (value & 0x80) >> 7;
            } else {
                this.bankRegisters[this.bankSelect] = value;
            }
        } else if (address >= 0xA000 && address < 0xC000) {
            if (address % 2 === 0) {
                this.mirroring = value & 1;
            }
        } else if (address >= 0xC000 && address < 0xE000) {
            if (address % 2 === 0) {
                this.irqReload = value;
            } else {
                this.irqCounter = 0;
            }
        } else if (address >= 0xE000) {
            this.irqEnable = !(address % 2);
            if (!this.irqEnable) {
                this.irqPending = false;
            }
        }
    }

    tickScanline() {
        if (this.irqCounter === 0) {
            this.irqCounter = this.irqReload;
        } else {
            this.irqCounter--;
        }

        if (this.irqCounter === 0 && this.irqEnable) {
            this.irqPending = true;
        }
    }
}