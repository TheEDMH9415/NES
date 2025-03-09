class CPU {
    constructor(memory) {
        this.pc = 0x8000; // Program Counter
        this.sp = 0xFF; // Stack Pointer
        this.a = 0; // Acumulador
        this.x = 0; // Registro X
        this.y = 0; // Registro Y
        this.status = 0x20; // Flag "Unused" siempre activo en 6502
        this.memory = memory || window.memory; // Referencia a la memoria
        this.running = false;
    }

    reset() {
        if (!this.memory) {
            console.error("❌ Error: La memoria no está inicializada.");
            return;
        }

        const low = this.memory.read(0xFFFC);
        const high = this.memory.read(0xFFFD);
        this.pc = (high << 8) | low;

        if (this.pc < 0x8000 || this.pc > 0xFFFF) {
            console.error(`❌ Error: Dirección de inicio no válida: 0x${this.pc.toString(16)}`);
            return;
        }

        this.sp = 0xFD;
        this.a = 0;
        this.x = 0;
        this.y = 0;
        this.status = 0x20; // Flag "Unused"
        this.running = true;
        console.log(`✅ CPU reiniciada. PC: 0x${this.pc.toString(16)}`);
    }

    push(value) {
        if (!this.memory) return;
        this.memory.write(0x0100 + this.sp, value & 0xFF);
        this.sp = (this.sp - 1) & 0xFF;
    }

    pop() {
        if (!this.memory) return 0;
        this.sp = (this.sp + 1) & 0xFF;
        return this.memory.read(0x0100 + this.sp);
    }

    updateFlags(result) {
        result &= 0xFF;
        this.status = (this.status & ~0x02) | (result === 0 ? 0x02 : 0); // Flag Z (Zero)
        this.status = (this.status & ~0x80) | (result & 0x80 ? 0x80 : 0); // Flag N (Negative)
    }

    executeNextInstruction() {
        if (!this.running) return;

        if (this.pc < 0x8000 || this.pc > 0xFFFF) {
            console.error(`❌ Error: PC fuera de rango: 0x${this.pc.toString(16)}`);
            this.running = false;
            return;
        }

        let opcode = this.memory.read(this.pc);
        if (opcode === undefined) {
            console.error(`❌ Error: Opcode indefinido en PC: 0x${this.pc.toString(16)}`);
            this.running = false;
            return;
        }

        console.log(`🔹 Ejecutando opcode: 0x${opcode.toString(16)} en PC: 0x${this.pc.toString(16)}`);
        this.pc++;

        switch (opcode) {
            case 0xA9: // LDA Immediate
                this.a = this.memory.read(this.pc);
                this.updateFlags(this.a);
                console.log(`LDA #0x${this.a.toString(16)}`);
                this.pc++;
                break;
                
             case 0x85: // STA Zero Page
    let addrZP_A = this.memory.read(this.pc); // Obtener dirección en Zero Page
    this.memory.write(addrZP_A, this.a); // Almacenar el valor de A en esa dirección
    console.log(`STA 0x${addrZP_A.toString(16)} -> A=0x${this.a.toString(16)}`);
    this.pc++;
    break;    

            case 0x8D: // STA Absolute
                let addr = this.memory.read(this.pc) | (this.memory.read(this.pc + 1) << 8);
                this.memory.write(addr, this.a);
                console.log(`STA 0x${addr.toString(16)} -> ${this.a.toString(16)}`);
                this.pc += 2;
                break;
                
            case 0x86: // STX Zero Page
    let addrZP_X = this.memory.read(this.pc); // Obtener dirección en Zero Page
    this.memory.write(addrZP_X, this.x); // Almacenar el valor de X en esa dirección
    console.log(`STX 0x${addrZP_X.toString(16)} -> X=0x${this.x.toString(16)}`);
    this.pc++;
    break;
                               
             case 0x8E: // STX Absolute
    let addrX = this.memory.read(this.pc) | (this.memory.read(this.pc + 1) << 8);
    this.memory.write(addrX, this.x);
    console.log(`STX 0x${addrX.toString(16)} -> X=0x${this.x.toString(16)}`);
    this.pc += 2;
    break;
    
            case 0x84: // STY Zero Page
    let addrZP_Y = this.memory.read(this.pc); // Obtener dirección en Zero Page
    this.memory.write(addrZP_Y, this.y); // Almacenar el valor de Y en esa dirección
    console.log(`STY 0x${addrZP_Y.toString(16)} -> Y=0x${this.y.toString(16)}`);
    this.pc++;
    break;
    
            case 0x8C: // STY Absolute
    let addrY = this.memory.read(this.pc) | (this.memory.read(this.pc + 1) << 8);
    this.memory.write(addrY, this.y);
    console.log(`STY 0x${addrY.toString(16)} -> Y=0x${this.y.toString(16)}`);
    this.pc += 2;
    break;

            case 0x69: // ADC Immediate
    let value = this.memory.read(this.pc);
    let carry = (this.status & 0x01) ? 1 : 0;
    let result = this.a + value + carry;

    // Overflow flag
    let overflow = (~(this.a ^ value) & (this.a ^ result) & 0x80) ? 0x40 : 0;
    this.status = (this.status & ~0x40) | overflow;

    this.updateFlags(result);
    this.a = result & 0xFF;
    console.log(`ADC #0x${value.toString(16)} -> A=0x${this.a.toString(16)}`);
    this.pc++;
    break;

            case 0xE9: // SBC Immediate
                let subValue = this.memory.read(this.pc);
                let borrow = (this.status & 0x01) ? 0 : 1;
                let subResult = this.a - subValue - borrow;
                this.updateFlags(subResult);
                this.a = subResult & 0xFF;
                console.log(`SBC #0x${subValue.toString(16)} -> A=0x${this.a.toString(16)}`);
                this.pc++;
                break;
                
            case 0x29: // AND Immediate
    let valueAND = this.memory.read(this.pc);
    this.a = this.a & valueAND;
    this.updateFlags(this.a);
    console.log(`AND #0x${valueAND.toString(16)} -> A=0x${this.a.toString(16)}`);
    this.pc++;
    break;   
    
            case 0x49: // EOR Immediate
    let valueEOR = this.memory.read(this.pc);
    this.a = this.a ^ valueEOR;
    this.updateFlags(this.a);
    console.log(`EOR #0x${valueEOR.toString(16)} -> A=0x${this.a.toString(16)}`);
    this.pc++;
    break;
    
            case 0x09: // ORA Immediate
    let valueORA = this.memory.read(this.pc);
    this.a = this.a | valueORA;
    this.updateFlags(this.a);
    console.log(`ORA #0x${valueORA.toString(16)} -> A=0x${this.a.toString(16)}`);
    this.pc++;
    break;
    
            case 0xC9: // CMP Immediate
    let valueCMP = this.memory.read(this.pc);
    let resultCMP = this.a - valueCMP;

    // Actualiza los flags
    this.status = (this.status & ~0x02) | ((resultCMP & 0xFF) === 0 ? 0x02 : 0); // Z (Zero)
    this.status = (this.status & ~0x80) | (resultCMP & 0x80 ? 0x80 : 0); // N (Negative)
    this.status = (this.status & ~0x01) | (this.a >= valueCMP ? 0x01 : 0); // C (Carry)

    console.log(`CMP #0x${valueCMP.toString(16)} -> A=0x${this.a.toString(16)} | Resultado=0x${resultCMP.toString(16)}`);
    this.pc++;
    break;
    
            case 0xE0: // CPX Immediate
    let valueCPX = this.memory.read(this.pc);
    let resultCPX = this.x - valueCPX;

    // Actualiza los flags
    this.status = (this.status & ~0x02) | ((resultCPX & 0xFF) === 0 ? 0x02 : 0); // Z (Zero)
    this.status = (this.status & ~0x80) | (resultCPX & 0x80 ? 0x80 : 0); // N (Negative)
    this.status = (this.status & ~0x01) | (this.x >= valueCPX ? 0x01 : 0); // C (Carry)

    console.log(`CPX #0x${valueCPX.toString(16)} -> X=0x${this.x.toString(16)} | Resultado=0x${resultCPX.toString(16)}`);
    this.pc++;
    break;
    
            case 0xC0: // CPY Immediate
    let valueCPY = this.memory.read(this.pc);
    let resultCPY = this.y - valueCPY;

    // Actualiza los flags
    this.status = (this.status & ~0x02) | ((resultCPY & 0xFF) === 0 ? 0x02 : 0); // Z (Zero)
    this.status = (this.status & ~0x80) | (resultCPY & 0x80 ? 0x80 : 0); // N (Negative)
    this.status = (this.status & ~0x01) | (this.y >= valueCPY ? 0x01 : 0); // C (Carry)

    console.log(`CPY #0x${valueCPY.toString(16)} -> Y=0x${this.y.toString(16)} | Resultado=0x${resultCPY.toString(16)}`);
    this.pc++;
    break;

            case 0x4C: // JMP Absolute
                this.pc = this.memory.read(this.pc) | (this.memory.read(this.pc + 1) << 8);
                console.log(`JMP 0x${this.pc.toString(16)}`);
                break;

            case 0x20: // JSR Subrutina
                let subAddress = this.memory.read(this.pc) | (this.memory.read(this.pc + 1) << 8);
                let returnAddress = this.pc + 1;
                this.push((returnAddress >> 8) & 0xFF);
                this.push(returnAddress & 0xFF);
                this.pc = subAddress;
                console.log(`JSR 0x${subAddress.toString(16)}`);
                break;
                
            case 0x60: // RTS - Return from Subroutine
    let lowRTS = this.pop(); // Saca el byte bajo de la dirección de retorno
    let highRTS = this.pop(); // Saca el byte alto de la dirección de retorno
    this.pc = ((highRTS << 8) | lowRTS) + 1; // Reconstruye la dirección y avanza 1 byte

    console.log(`RTS ejecutado -> Retorno a 0x${this.pc.toString(16)}`);
    break; 
    
             case 0x40: // RTI - Return from Interrupt
    {
        this.status = this.pullStack(); // Restaurar el registro de estado (P)
        this.status &= 0xEF; // Limpia el flag B (Bit 4), ya que no se almacena en la pila
        let pcl = this.pullStack(); // Byte menos significativo del PC
        let pch = this.pullStack(); // Byte más significativo del PC
        this.pc = (pch << 8) | pcl; // Reconstruir PC
        console.log(`RTI -> PC=0x${this.pc.toString(16)} P=0x${this.status.toString(16)}`);
    }
    break;    

             case 0x00: // BRK
    this.pc++; // Saltar el byte después del BRK
    this.push((this.pc >> 8) & 0xFF);
    this.push(this.pc & 0xFF);
    this.push(this.status | 0x10); // Flag Break activado
    this.status |= 0x04; // Deshabilita interrupciones
    this.pc = this.memory.read(0xFFFE) | (this.memory.read(0xFFFF) << 8);
    console.log(`⚠️ BRK ejecutado - PC cambiado a: 0x${this.pc.toString(16)}`);
    break;
    
            case 0xEA: // NOP (No Operation)
    this.cycles += 2; // NOP consume 2 ciclos
    break;
    
            case 0x18: // CLC (Clear Carry Flag)
    this.status &= ~0x01; // Poner el bit C en 0
    this.cycles += 2; // CLC siempre toma 2 ciclos
    break;
    
            case 0x38: // SEC (Set Carry Flag)
    this.status |= 0x01; // Poner el bit C en 1
    this.cycles += 2; // SEC siempre toma 2 ciclos
    break;
           
            case 0xF8: // SED (Set Decimal Flag)
    this.status |= 0x08; // Poner el bit D en 1
    this.cycles += 2; // SED siempre toma 2 ciclos
    break;
    
            case 0x58: // CLI (Clear Interrupt Disable)
    this.status &= ~0x04; // Poner el bit I en 0
    this.cycles += 2; // CLI toma 2 ciclos
    break;
    
            case 0xB8: // CLV (Clear Overflow Flag)
    this.status &= ~0x40; // Poner el bit V en 0
    this.cycles += 2; // CLV toma 2 ciclos
    break;

            case 0x78: // SEI - Set Interrupt Disable
                this.status |= 0x04;
                console.log("SEI - Interrupciones deshabilitadas");
                break;

            case 0xD8: // CLD - Clear Decimal Mode
                this.status &= ~0x08;
                console.log("CLD - Modo decimal deshabilitado");
                break;

            case 0xA2: // LDX Immediate
                this.x = this.memory.read(this.pc);
                this.updateFlags(this.x);
                console.log(`LDX #0x${this.x.toString(16)}`);
                this.pc++;
                break;
                
             case 0xA6: // LDX Zero Page
    let addrZP = this.memory.read(this.pc); // Leer dirección en la página cero
    this.x = this.memory.read(addrZP); // Cargar el valor en X
    this.updateFlags(this.x); // Actualizar flags
    console.log(`LDX 0x${addrZP.toString(16)} -> X=0x${this.x.toString(16)}`);
    this.pc++; // Avanzar el contador de programa
    break;   
    
             case 0xAE: // LDX Absolute
    let addrAbs = this.memory.read(this.pc) | (this.memory.read(this.pc + 1) << 8); // Obtener dirección absoluta
    this.x = this.memory.read(addrAbs); // Cargar el valor en X
    this.updateFlags(this.x); // Actualizar flags
    console.log(`LDX 0x${addrAbs.toString(16)} -> X=0x${this.x.toString(16)}`);
    this.pc += 2; // Avanzar el contador de programa
    break;
                
             case 0xA0: // LDY Immediate
    this.y = this.memory.read(this.pc);
    this.updateFlags(this.y);
    console.log(`LDY #0x${this.y.toString(16)}`);
    this.pc++;
    break;
    
             case 0xA4: // LDY Zero Page
    let addrZP_Y_LDY = this.memory.read(this.pc); // Obtener dirección de la Zero Page
    this.y = this.memory.read(addrZP_Y_LDY); // Cargar el valor en Y
    this.updateFlags(this.y); // Actualizar flags
    console.log(`LDY 0x${addrZP_Y.toString(16)} -> Y=0x${this.y.toString(16)}`);
    this.pc++;
    break;
    
            case 0xAC: // LDY Absolute
    let addrAbs_Y = this.memory.read(this.pc) | (this.memory.read(this.pc + 1) << 8); // Obtener dirección absoluta
    this.y = this.memory.read(addrAbs_Y); // Cargar el valor en Y
    this.updateFlags(this.y); // Actualizar flags
    console.log(`LDY 0x${addrAbs_Y.toString(16)} -> Y=0x${this.y.toString(16)}`);
    this.pc += 2;
    break;
    
            case 0x8A: // TXA - Transferir X a A
    this.a = this.x; // Copiar el valor de X a A
    this.updateFlags(this.a); // Actualizar los flags Zero y Negative
    console.log(`TXA -> A=0x${this.a.toString(16)}`);
    break;
    
           case 0xAA: // TAX - Transferir A a X
    this.x = this.a; // Copiar el valor de A a X
    this.updateFlags(this.x); // Actualizar los flags Zero y Negative
    console.log(`TAX -> X=0x${this.x.toString(16)}`);
    break;
    
           case 0x98: // TYA - Transferir Y a A
    this.a = this.y; // Copiar el valor de Y a A
    this.updateFlags(this.a); // Actualizar los flags Zero y Negative
    console.log(`TYA -> A=0x${this.a.toString(16)}`);
    break;
    
           case 0xA8: // TAY - Transferir A a Y
    this.y = this.a; // Copiar el valor de A a Y
    this.updateFlags(this.y); // Actualizar los flags Zero y Negative
    console.log(`TAY -> Y=0x${this.y.toString(16)}`);
    break;
    
           case 0xBA: // TSX - Transferir SP a X
    this.x = this.sp; // Copiar SP a X
    this.updateFlags(this.x); // Actualizar flags Zero y Negative
    console.log(`TSX -> X=0x${this.x.toString(16)}`);
    break;
    
          case 0x9A: // TXS - Transferir X a SP
    this.sp = this.x; // Copiar X a SP
    console.log(`TXS -> SP=0x${this.sp.toString(16)}`);
    break;
    
          case 0x48: // PHA - Push A to Stack
    this.memory[0x100 + this.sp] = this.a; // Guardar A en la pila
    this.sp = (this.sp - 1) & 0xFF; // Decrementar SP (asegurando 8 bits)
    console.log(`PHA -> Pushed A=0x${this.a.toString(16)} to Stack at 0x${(0x100 + this.sp + 1).toString(16)}`);
    break;
    
          case 0x68: // PLA - Pull A from Stack
    this.sp = (this.sp + 1) & 0xFF; // Incrementar SP (asegurando 8 bits)
    this.a = this.memory[0x100 + this.sp]; // Recuperar el valor de la pila en A
    
    // Actualizar los flags Z (Zero) y N (Negative)
    this.zeroFlag = (this.a === 0);
    this.negativeFlag = (this.a & 0x80) !== 0;

    console.log(`PLA -> Pulled A=0x${this.a.toString(16)} from Stack at 0x${(0x100 + this.sp).toString(16)}`);
    break;  
    
         case 0x08: // PHP - Push Processor Status
    let processorStatus = 
        (this.carryFlag ? 0x01 : 0) |
        (this.zeroFlag ? 0x02 : 0) |
        (this.interruptDisableFlag ? 0x04 : 0) |
        (this.decimalModeFlag ? 0x08 : 0) |
        0x10 | // Flag Break siempre activo cuando se usa PHP
        (this.overflowFlag ? 0x40 : 0) |
        (this.negativeFlag ? 0x80 : 0);

    this.memory[0x100 + this.sp] = processorStatus; // Guardar el estado en la pila
    this.sp = (this.sp - 1) & 0xFF; // Decrementar SP
    console.log(`PHP -> Pushed Status=0x${processorStatus.toString(16)} to Stack`);
    break;
    
        case 0x28: // PLP - Pull Processor Status
    this.sp = (this.sp + 1) & 0xFF; // Incrementa el Stack Pointer (SP)
    let status = this.memory[0x100 + this.sp]; // Extrae el estado desde la pila

    // Asigna los flags según el valor extraído
    this.carryFlag = (status & 0x01) !== 0;
    this.zeroFlag = (status & 0x02) !== 0;
    this.interruptDisableFlag = (status & 0x04) !== 0;
    this.decimalModeFlag = (status & 0x08) !== 0;
    this.breakFlag = (status & 0x10) !== 0;
    this.overflowFlag = (status & 0x40) !== 0;
    this.negativeFlag = (status & 0x80) !== 0;

  console.log(`PLP -> Pulled Status=0x${status.toString(16)} from Stack at 0x${(0x100 + this.sp).toString(16)}`);
    break;
    
        case 0xCA: // DEX - Decrementar X
    this.x = (this.x - 1) & 0xFF; // Decrementa X asegurando que se mantenga en 8 bits
    this.updateFlags(this.x); // Actualiza los flags Zero y Negative
    console.log(`DEX -> X=0x${this.x.toString(16)}`);
    break;
    
       case 0x88: // DEY - Decrementar Y
    this.y = (this.y - 1) & 0xFF; // Decrementa Y asegurando que se mantenga en 8 bits
    this.updateFlags(this.y); // Actualiza los flags Zero y Negative
    console.log(`DEY -> Y=0x${this.y.toString(16)}`);
    break;
    
       case 0xE8: // INX - Incrementar X
    this.x = (this.x + 1) & 0xFF; // Incrementa X asegurando que se mantenga en 8 bits
    this.updateFlags(this.x); // Actualiza los flags Zero y Negative
    console.log(`INX -> X=0x${this.x.toString(16)}`);
    break;
    
      case 0xC8: // INY - Increment Y Register
    this.y = (this.y + 1) & 0xFF; // Incrementa Y y mantiene en rango de 8 bits
    this.updateFlags(this.y); // Actualiza los flags Z y N
    console.log(`INY -> Y=0x${this.y.toString(16)}`);
    break;
    
      case 0xE6: // INC Zero Page
    let addrZP_INC = this.memory.read(this.pc); // Obtener dirección en Zero Page
    let valueZP_INC = (this.memory.read(addrZP_INC) + 1) & 0xFF; // Incrementar y limitar a 8 bits
    this.memory.write(addrZP_INC, valueZP_INC); // Escribir de vuelta en la memoria
    this.updateFlags(valueZP_INC);
    console.log(`INC 0x${addrZP_INC.toString(16)} -> ${valueZP_INC.toString(16)}`);
    this.pc++;
    break;

     case 0xEE: // INC Absolute
    let addrABS_INC = this.memory.read(this.pc) | (this.memory.read(this.pc + 1) << 8); // Dirección absoluta
    let valueABS_INC = (this.memory.read(addrABS_INC) + 1) & 0xFF; // Incrementar
    this.memory.write(addrABS_INC, valueABS_INC);
    this.updateFlags(valueABS_INC);
    console.log(`INC 0x${addrABS_INC.toString(16)} -> ${valueABS_INC.toString(16)}`);
    this.pc += 2;
    break;

     case 0xF6: // INC Zero Page, X
    let addrZP_X_INC = (this.memory.read(this.pc) + this.x) & 0xFF; // Dirección en Zero Page + X
    let valueZP_X_INC = (this.memory.read(addrZP_X_INC) + 1) & 0xFF;
    this.memory.write(addrZP_X_INC, valueZP_X_INC);
    this.updateFlags(valueZP_X_INC);
    console.log(`INC 0x${addrZP_X_INC.toString(16)} -> ${valueZP_X_INC.toString(16)}`);
    this.pc++;
    break;

     case 0xFE: // INC Absolute, X
    let addrABS_X_INC = (this.memory.read(this.pc) | (this.memory.read(this.pc + 1) << 8)) + this.x;
    let valueABS_X_INC = (this.memory.read(addrABS_X_INC) + 1) & 0xFF;
    this.memory.write(addrABS_X_INC, valueABS_X_INC);
    this.updateFlags(valueABS_X_INC);
    console.log(`INC 0x${addrABS_X_INC.toString(16)} -> ${valueABS_X_INC.toString(16)}`);
    this.pc += 2;
    break;
    
     case 0x0A: // ASL A - Acumulador
    this.carry = (this.a & 0x80) !== 0; // Guarda el bit 7 en la bandera de Carry
    this.a = (this.a << 1) & 0xFF; // Desplaza a la izquierda y mantiene en 8 bits
    this.updateFlags(this.a); // Actualiza los flags Z y N
    console.log(`ASL A -> A=0x${this.a.toString(16)}`);
    break;

    case 0x06: // ASL operando en memoria (modo Zero Page)
    addr = this.readByte(this.pc++); // Dirección de Zero Page
    value = this.readByte(addr);
    this.carry = (value & 0x80) !== 0;
    value = (value << 1) & 0xFF;
    this.writeByte(addr, value);
    this.updateFlags(value);
    console.log(`ASL Zero Page -> [0x${addr.toString(16)}]=0x${value.toString(16)}`);
    break;

    case 0x16: // ASL Zero Page,X
    addr = (this.readByte(this.pc++) + this.x) & 0xFF;
    value = this.readByte(addr);
    this.carry = (value & 0x80) !== 0;
    value = (value << 1) & 0xFF;
    this.writeByte(addr, value);
    this.updateFlags(value);
    console.log(`ASL Zero Page,X -> [0x${addr.toString(16)}]=0x${value.toString(16)}`);
    break;

    case 0x0E: // ASL Absolute
    addr = this.readWord(this.pc);
    this.pc += 2;
    value = this.readByte(addr);
    this.carry = (value & 0x80) !== 0;
    value = (value << 1) & 0xFF;
    this.writeByte(addr, value);
    this.updateFlags(value);
    console.log(`ASL Absolute -> [0x${addr.toString(16)}]=0x${value.toString(16)}`);
    break;

    case 0x1E: // ASL Absolute,X
    addr = (this.readWord(this.pc) + this.x) & 0xFFFF;
    this.pc += 2;
    value = this.readByte(addr);
    this.carry = (value & 0x80) !== 0;
    value = (value << 1) & 0xFF;
    this.writeByte(addr, value);
    this.updateFlags(value);
    console.log(`ASL Absolute,X -> [0x${addr.toString(16)}]=0x${value.toString(16)}`);
    break;
    
    case 0x4A: // LSR Acumulador
    this.status = (this.status & ~0x01) | (this.a & 0x01); // Guarda el bit 0 en el flag de acarreo
    this.a = (this.a >>> 1) & 0xFF; // Desplaza A a la derecha
    this.updateFlags(this.a); // Actualiza los flags Z y N
    console.log(`LSR A -> A=0x${this.a.toString(16)}`);
    break;

    case 0x46: // LSR Zeropage
    let addrZP_LSR = this.memory.read(this.pc); // Dirección en Zero Page
    let valueZP = this.memory.read(addrZP_LSR); // Obtener el valor en esa dirección
    this.status = (this.status & ~0x01) | (valueZP & 0x01); // Guarda el bit 0 en Carry
    valueZP = (valueZP >>> 1) & 0xFF; // Desplaza a la derecha (sin signo)
    this.memory.write(addrZP_LSR, valueZP); // CORRECCIÓN: Guardar el valor correctamente
    this.updateFlags(valueZP); // Actualizar los flags
    console.log(`LSR 0x${addrZP_LSR.toString(16)} -> ${valueZP.toString(16)}`); // CORRECCIÓN
    this.pc++;
    break;

    case 0x4E: // LSR Absolute
    {
        let addrAbs_LSR = this.memory.read(this.pc) | (this.memory.read(this.pc + 1) << 8);
        let valueAbs = this.memory.read(addrAbs_LSR);
        this.status = (this.status & ~0x01) | (valueAbs & 0x01); // Guarda el bit 0 en Carry
        valueAbs = (valueAbs >>> 1) & 0xFF; // Desplaza a la derecha
        this.memory.write(addrAbs_LSR, valueAbs);
        this.updateFlags(valueAbs);
        console.log(`LSR 0x${addrAbs_LSR.toString(16).padStart(4, "0")} -> ${valueAbs.toString(16)}`);
        this.pc += 3; // CORREGIDO: La instrucción ocupa 3 bytes
    }
    break;
    
    case 0x2A: // ROL Acumulador
    {
        let carry = (this.status & 0x01); // Obtiene el flag de acarreo
        this.status = (this.status & ~0x01) | ((this.a >> 7) & 0x01); // Guarda el bit 7 en Carry
        this.a = ((this.a << 1) & 0xFF) | carry; // Rota a la izquierda e inserta Carry en bit 0
        this.updateFlags(this.a); // Actualiza los flags Z y N
        console.log(`ROL A -> A=0x${this.a.toString(16)}`);
    }
    break;

    case 0x26: // ROL Zeropage
    {
        let addrZP_ROL = this.memory.read(this.pc); // Dirección en Zero Page
        let valueZP = this.memory.read(addrZP_ROL); // Obtener el valor en esa dirección
        let carry = (this.status & 0x01); // Obtener el Carry actual
        this.status = (this.status & ~0x01) | ((valueZP >> 7) & 0x01); // Guardar bit 7 en Carry
        valueZP = ((valueZP << 1) & 0xFF) | carry; // Rotar a la izquierda con el Carry
        this.memory.write(addrZP_ROL, valueZP); // Guardar el nuevo valor en la memoria
        this.updateFlags(valueZP); // Actualizar los flags
        console.log(`ROL 0x${addrZP_ROL.toString(16)} -> ${valueZP.toString(16)}`); // CORRECCIÓN
        this.pc++;
    }
    break;

    case 0x2E: // ROL Absolute
    {
        let addrAbs_ROL = this.memory.read(this.pc) | (this.memory.read(this.pc + 1) << 8);
        let valueAbs = this.memory.read(addrAbs_ROL);
        let carry = (this.status & 0x01);
        this.status = (this.status & ~0x01) | ((valueAbs >> 7) & 0x01);
        valueAbs = ((valueAbs << 1) & 0xFF) | carry;
        this.memory.write(addrAbs_ROL, valueAbs);
        this.updateFlags(valueAbs);
        console.log(`ROL 0x${addrAbs_ROL.toString(16).padStart(4, "0")} -> ${valueAbs.toString(16)}`);
        this.pc += 3; // CORREGIDO: La instrucción ocupa 3 bytes
    }
    break;
    
    case 0x6A: // ROR Acumulador
    {
        let carry = (this.status & 0x01) << 7; // Obtiene el flag de Carry y lo coloca en bit 7
        this.status = (this.status & ~0x01) | (this.a & 0x01); // Guarda el bit 0 en Carry
        this.a = (this.a >> 1) | carry; // Rota a la derecha e inserta Carry en bit 7
        this.updateFlags(this.a); // Actualiza los flags Z y N
        console.log(`ROR A -> A=0x${this.a.toString(16)}`);
    }
    break;

    case 0x66: // ROR Zeropage
    {
        let addrZP_ROR = this.memory.read(this.pc); // Dirección en Zero Page
        let valueZP = this.memory.read(addrZP_ROR); // Obtener el valor en esa dirección
        let carry = (this.status & 0x01) << 7; // Obtener el Carry y moverlo a bit 7
        this.status = (this.status & ~0x01) | (valueZP & 0x01); // Guardar el Carry en el flag C
        valueZP = (valueZP >> 1) | carry; // Rotar a la derecha con el nuevo carry
        this.memory.write(addrZP_ROR, valueZP); // CORRECCIÓN: Escribir en la dirección correcta
        this.updateFlags(valueZP); // Actualizar flags
        console.log(`ROR 0x${addrZP_ROR.toString(16)} -> ${valueZP.toString(16)}`);
        this.pc++;
    }
    break;

    case 0x6E: // ROR Absolute
    {
        let addrAbs_ROR = this.memory.read(this.pc) | (this.memory.read(this.pc + 1) << 8);
        let valueAbs = this.memory.read(addrAbs_ROR);
        let carry = (this.status & 0x01) << 7;
        this.status = (this.status & ~0x01) | (valueAbs & 0x01);
        valueAbs = (valueAbs >> 1) | carry;
        this.memory.write(addrAbs_ROR, valueAbs);
        this.updateFlags(valueAbs);
        console.log(`ROR 0x${addrAbs_ROR.toString(16).padStart(4, "0")} -> ${valueAbs.toString(16)}`);
        this.pc += 3; // CORRECCIÓN: Se avanza 3 bytes (1 de opcode + 2 de dirección)
    }
    break;
    
    case 0x90: // BCC - Branch if Carry Clear
    {
        let offset = this.memory.read(this.pc); // Leer el desplazamiento
        this.pc++; // Avanzar el PC

        if ((this.status & 0x01) === 0) { // Si el flag Carry (C) está en 0
            let newPC = this.pc + (offset < 0x80 ? offset : offset - 0x100); // Convertir a valor con signo
            console.log(`BCC tomado -> Salto a 0x${newPC.toString(16)}`);
            this.pc = newPC & 0xFFFF; // Asegurar que el PC se mantenga en 16 bits
        } else {
            console.log(`BCC no tomado -> Continúa en 0x${this.pc.toString(16)}`);
        }
    }
    break;
    
    case 0xB0: // BCS - Branch if Carry Set
    {
        let offset = this.memory.read(this.pc); // Leer el desplazamiento
        this.pc++; // Avanzar el PC

        if ((this.status & 0x01) !== 0) { // Si el flag Carry (C) está en 1
            let newPC = this.pc + (offset < 0x80 ? offset : offset - 0x100); // Convertir a valor con signo
            console.log(`BCS tomado -> Salto a 0x${newPC.toString(16)}`);
            this.pc = newPC & 0xFFFF; // Asegurar que el PC se mantenga en 16 bits
        } else {
            console.log(`BCS no tomado -> Continúa en 0x${this.pc.toString(16)}`);
        }
    }
    break;
    
    case 0xF0: // BEQ - Branch if Equal (Zero flag set)
    {
        let offset = this.memory.read(this.pc); // Leer el desplazamiento
        this.pc++; // Avanzar el PC

        if ((this.status & 0x02) !== 0) { // Si el flag Zero (Z) está en 1
            let newPC = this.pc + (offset < 0x80 ? offset : offset - 0x100); // Convertir a valor con signo
            console.log(`BEQ tomado -> Salto a 0x${newPC.toString(16)}`);
            this.pc = newPC & 0xFFFF; // Asegurar que el PC se mantenga en 16 bits
        } else {
            console.log(`BEQ no tomado -> Continúa en 0x${this.pc.toString(16)}`);
        }
    }
    break;
    
    case 0x30: // BMI - Branch if Minus (Negative flag set)
    {
        let offset = this.memory.read(this.pc); // Leer el desplazamiento
        this.pc++; // Avanzar el PC

        if ((this.status & 0x80) !== 0) { // Si el flag Negative (N) está en 1
            let newPC = this.pc + (offset < 0x80 ? offset : offset - 0x100); // Convertir a valor con signo
            console.log(`BMI tomado -> Salto a 0x${newPC.toString(16)}`);
            this.pc = newPC & 0xFFFF; // Asegurar que el PC se mantenga en 16 bits
        } else {
            console.log(`BMI no tomado -> Continúa en 0x${this.pc.toString(16)}`);
        }
    }
    break;
    
    case 0xD0: // BNE - Branch if Not Equal (Zero flag clear)
    {
        let offset = this.memory.read(this.pc); // Leer el desplazamiento
        this.pc++; // Avanzar el PC

        if ((this.status & 0x02) === 0) { // Si el flag Zero (Z) es 0
            let newPC = this.pc + (offset < 0x80 ? offset : offset - 0x100); // Convertir a valor con signo
            console.log(`BNE tomado -> Salto a 0x${newPC.toString(16)}`);
            this.pc = newPC & 0xFFFF; // Asegurar que el PC se mantenga en 16 bits
        } else {
            console.log(`BNE no tomado -> Continúa en 0x${this.pc.toString(16)}`);
        }
    }
    break;
    
    case 0x10: // BPL - Branch if Plus (Negative flag clear)
    {
        let offset = this.memory.read(this.pc); // Leer el desplazamiento
        this.pc++; // Avanzar el PC

        if ((this.status & 0x80) === 0) { // Si el flag Negativo (N) es 0
            let newPC = this.pc + (offset < 0x80 ? offset : offset - 0x100); // Convertir a valor con signo
            console.log(`BPL tomado -> Salto a 0x${newPC.toString(16)}`);
            this.pc = newPC & 0xFFFF; // Asegurar que el PC se mantenga en 16 bits
        } else {
            console.log(`BPL no tomado -> Continúa en 0x${this.pc.toString(16)}`);
        }
    }
    break;
    
    case 0x50: // BVC (Branch on Overflow Clear)
    {
        let offset = this.memory.read(this.pc); // Leer el byte de offset
        if ((this.status & 0x40) === 0) { // Si el bit V (Overflow) es 0
            let oldPC = this.pc + 1;
            let newPC = oldPC + (offset < 0x80 ? offset : offset - 0x100); // Sign extension
            if ((oldPC & 0xFF00) !== (newPC & 0xFF00)) this.cycles++; // Penalización de página
            this.pc = newPC;
        } else {
            this.pc++; // Si no salta, solo avanza el PC
        }
        this.cycles++; // Todas las ramas consumen al menos 2 ciclos
    }
    break;
    
    case 0x70: // BVS (Branch on Overflow Set)
    {
        let offset = this.memory.read(this.pc); // Leer el byte de offset
        if ((this.status & 0x40) !== 0) { // Si el bit V (Overflow) es 1
            let oldPC = this.pc + 1;
            let newPC = oldPC + (offset < 0x80 ? offset : offset - 0x100); // Sign extension
            if ((oldPC & 0xFF00) !== (newPC & 0xFF00)) this.cycles++; // Penalización de página
            this.pc = newPC;
        } else {
            this.pc++; // Si no salta, solo avanza el PC
        }
        this.cycles++; // Todas las ramas consumen al menos 2 ciclos
    }
    break;

            default:
                console.error(`❌ Opcode desconocido: 0x${opcode.toString(16)}`);
                this.running = false;
        }
    }

    run() {
        if (!this.running) {
            console.error("❌ CPU detenida. Reinicia para continuar.");
            return;
        }

        for (let i = 0; i < 1000 && this.running; i++) {
            this.executeNextInstruction();
        }

        if (this.running) {
            requestAnimationFrame(() => this.run());
        }
    }
}

window.cpu = new CPU(window.memory);
console.log("✅ CPU inicializada correctamente.");