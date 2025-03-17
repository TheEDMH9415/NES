class CPU {
    constructor(memory) {
        this.pc = 0x8000;
        this.sp = 0xFF;
        this.a = 0;
        this.x = 0;
        this.y = 0;
        this.status = 0x20;
        this.memory = memory || window.memory;
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

    // Depurar el vector de NMI
    const nmiLow = this.memory.read(0xFFFA);
    const nmiHigh = this.memory.read(0xFFFB);
    const nmiVector = (nmiHigh << 8) | nmiLow;

    //console.log(`🔍 Vector de Reset: PC = 0x${this.pc.toString(16)}`);
   // console.log(`🔍 Vector de NMI: 0x${nmiVector.toString(16)}`);

    this.sp = 0xFD;
    this.a = 0;
    this.x = 0;
    this.y = 0;
    this.status = 0x20;
    this.running = true;
}
    
    readWord(address) {
    let low = this.memory.read(address);
    let high = this.memory.read(address + 1);
    return (high << 8) | low;
}

// Auxiliares

readByte(addr) {
    return this.memory.read(addr);
}

writeByte(addr, value) {
    this.memory.write(addr, value);
}    

    push(value) {
    this.memory.write(0x0100 + this.sp, value & 0xFF);
    this.sp = (this.sp - 1) & 0xFF; // Asegurar que el Stack Pointer es un byte
}

pop() {
    this.sp = (this.sp + 1) & 0xFF;
    return this.memory.read(0x0100 + this.sp);
}

pullStack() {
    return this.pop();
}

nmi() {
    //console.log(`🔵 NMI recibido en PC: 0x${this.pc.toString(16)}`);

    this.push((this.pc >> 8) & 0xFF); // Push de PC alto
    this.push(this.pc & 0xFF);       // Push de PC bajo
    this.push(this.status | 0x20);   // Push del registro de estado con bit 5 en 1

    this.status |= 0x04; // Deshabilitar interrupciones (I=1)
    this.pc = this.readWord(0xFFFA); // Leer el vector de NMI en 0xFFFA-0xFFFB
}

    updateFlags(value, setCarry = false, setOverflow = false) {
    value &= 0xFF; // Asegurar que es un byte

    // Zero (Z)
    this.status = (value === 0) ? (this.status | 0x02) : (this.status & ~0x02);

    // Negative (N)
    this.status = (value & 0x80) ? (this.status | 0x80) : (this.status & ~0x80);

    // Opcionalmente actualizar Carry y Overflow
    if (setCarry) {
        this.status |= 0x01; // C (Carry)
    } else {
        this.status &= ~0x01;
    }

    if (setOverflow) {
        this.status |= 0x40; // V (Overflow)
    } else {
        this.status &= ~0x40;
    }
}

    step() {
        if (!this.running) return 0;

        let opcode = this.memory.read(this.pc);
        if (opcode === undefined) {
            console.error(`❌ Error: Opcode indefinido en PC: 0x${this.pc.toString(16)}`);
            this.running = false;
            return 0;
        }

        console.log(`🔹 Ejecutando opcode: 0x${opcode.toString(16)} en PC: 0x${this.pc.toString(16)}`);
        this.pc++;

        let cycles = 0;

        switch (opcode) {
            case 0xA9: // LDA Immediate
                this.a = this.memory.read(this.pc);
                this.updateFlags(this.a); // ✅ Ahora está definido
                this.pc++;
                cycles = 2;
                break;
                
                case 0xAD: // LDA Absolute
    let addr = this.readWord(this.pc);
    this.pc += 2;
    this.a = this.memory.read(addr);
    this.updateFlags(this.a);
    cycles = 4;
    break;

            case 0x85: // STA Zero Page
                let addrZP_A = this.memory.read(this.pc);
                this.memory.write(addrZP_A, this.a);
                this.pc++;
                cycles = 3;
                break;

            case 0x8D: // STA Absolute
    let addrSTA = this.memory.read(this.pc) | (this.memory.read(this.pc + 1) << 8);
    this.memory.write(addrSTA, this.a);
    
    // 📝 Verifica si la CPU está escribiendo en 0x2000 (PPUCTRL)
    if (addrSTA === 0x2000) {
        console.log(`📝 CPU escribió en PPUCTRL: 0x${this.a.toString(16)}`);
    }

    this.pc += 2;
    cycles = 4;
    break;
                
            case 0x8E: // STX Absolute
    {
        let addrX = this.readWord(this.pc); // Leer 2 bytes como dirección absoluta
        this.pc += 2;
        this.memory.write(addrX, this.x);
        cycles = 4;
        break;
    }
                               
             case 0x8E: // STX Absolute
    {
        let addrSTX = this.readWord(this.pc); // ✅ Lee dirección absoluta (2 bytes)
        this.pc += 2;
        this.memory.write(addrSTX, this.x); // ✅ Escribe el valor de X en esa dirección
        console.log(`STX 0x${addr.toString(16)} -> X=0x${this.x.toString(16)}`);
        cycles = 4;
        break;
    }
    
            case 0x84: // STY Zero Page
    let addrZP_Y = this.memory.read(this.pc); // Obtener dirección en Zero Page
    this.pc++;
    this.memory.write(addrZP_Y, this.y); // Almacenar el valor de Y en esa dirección
    console.log(`STY 0x${addrZP_Y.toString(16)} -> Y=0x${this.y.toString(16)}`);
    cycles = 3;
    break;
    
            case 0x8C: // STY Absolute
    let addrY = this.readWord(this.pc); // ✅ Usa readWord para obtener la dirección de 16 bits
    this.pc += 2;
    this.memory.write(addrY, this.y); // Almacena el valor del registro Y en la dirección absoluta
    console.log(`STY 0x${addrY.toString(16)} -> Y=0x${this.y.toString(16)}`);
    cycles = 4; // STY Absolute tarda 4 ciclos
    break;

            case 0x69: // ADC Immediate
    {
        this.cycles += 2; // ✅ Agregar los ciclos correctos

        let valueADC = this.readByte(this.pc);
        this.pc++;
        let carry = (this.status & 0x01) ? 1 : 0;
        let result = this.a + valueADC + carry;

        // Overflow flag corregido
        let overflow = ((~(this.a ^ valueADC) & (this.a ^ result) & 0x80) !== 0) ? 0x40 : 0;
        this.status = (this.status & ~0x40) | overflow;

        this.updateFlags(result);
        this.a = result & 0xFF;
        console.log(`ADC Immediate -> A = 0x${this.a.toString(16)} (Added 0x${valueADC.toString(16)})`);
    }
    break;

            case 0xE9: // SBC Immediate
    {
        this.cycles += 2; // ✅ Agregar los ciclos correctos

        let subValue = this.readByte(this.pc);
        this.pc++;
        let borrow = (this.status & 0x01) ? 0 : 1;
        let subResult = this.a - subValue - borrow;

        // Overflow flag
        let overflow = ((this.a ^ subValue) & (this.a ^ subResult) & 0x80) ? 0x40 : 0;
        this.status = (this.status & ~0x40) | overflow;

        this.updateFlags(subResult);
        this.a = subResult & 0xFF;
        console.log(`SBC Immediate -> A = 0x${this.a.toString(16)} (Subtracted 0x${subValue.toString(16)})`);
    }
    break;
                
            case 0x29: // AND Immediate
    {
        this.cycles += 2; // ✅ Agregar los ciclos correctos

        let valueAND = this.readByte(this.pc);
        this.pc++;
        this.a = this.a & valueAND;
        this.updateFlags(this.a);

        console.log(`AND Immediate -> A = 0x${this.a.toString(16)} (AND 0x${valueAND.toString(16)})`);
    }
    break;   
    
            case 0x49: // EOR Immediate
    {
        this.cycles += 2; // ✅ Agregar los ciclos correctos

        let valueEOR = this.readByte(this.pc);
        this.pc++;
        this.a = this.a ^ valueEOR;
        this.updateFlags(this.a);

        console.log(`EOR Immediate -> A = 0x${this.a.toString(16)} (EOR 0x${valueEOR.toString(16)})`);
    }
    break;
    
            case 0x09: // ORA Immediate
    {
        this.cycles += 2; // ✅ Agregar los ciclos correctos

        let valueORA = this.readByte(this.pc);
        this.pc++;
        this.a = this.a | valueORA;
        this.updateFlags(this.a);

        console.log(`ORA Immediate -> A = 0x${this.a.toString(16)} (ORA 0x${valueORA.toString(16)})`);
    }
    break;
    
            case 0xC9: // CMP Immediate
    {
        this.cycles += 2; // ✅ Agregar los ciclos correctos

        let valueCMP = this.readByte(this.pc);
        this.pc++;
        let resultCMP = this.a - valueCMP;

        // Actualiza los flags
        this.status = (this.status & ~0x02) | ((resultCMP & 0xFF) === 0 ? 0x02 : 0); // Z (Zero)
        this.status = (this.status & ~0x80) | (resultCMP & 0x80 ? 0x80 : 0); // N (Negative)
        this.status = (this.status & ~0x01) | (this.a >= valueCMP ? 0x01 : 0); // C (Carry)

        console.log(`CMP Immediate -> A=0x${this.a.toString(16)} - 0x${valueCMP.toString(16)} | Resultado=0x${resultCMP.toString(16)}`);
    }
    break;
    
            case 0xE0: // CPX Immediate
    let valueCPX = this.readByte(this.pc);
    let resultCPX = this.x - valueCPX;

    // Actualiza los flags
    this.status = (this.status & ~0x02) | ((resultCPX & 0xFF) === 0 ? 0x02 : 0); // Z (Zero)
    this.status = (this.status & ~0x80) | (resultCPX & 0x80 ? 0x80 : 0); // N (Negative)
    this.status = (this.status & ~0x01) | (this.x >= valueCPX ? 0x01 : 0); // C (Carry)

    console.log(`CPX #0x${valueCPX.toString(16)} -> X=0x${this.x.toString(16)} | Resultado=0x${resultCPX.toString(16)}`);
    this.pc++;
    this.cycles += 2; // CPX Inmediato toma 2 ciclos
    break;
    
            case 0xC0: // CPY Immediate
    this.cycles += 2; // ✅ CPY Immediate tarda 2 ciclos

    let valueCPY = this.readByte(this.pc); // ✅ Usar readByte para mayor claridad y consistencia
    this.pc++;

    let resultCPY = this.y - valueCPY;

    // Actualización clara de los flags:
    // Zero Flag (Z)
    if ((resultCPY & 0xFF) === 0) {
        this.status |= 0x02;
    } else {
        this.status &= ~0x02;
    }

    // Negative Flag (N)
    if ((resultCPY & 0x80) !== 0) {
        this.status |= 0x80;
    } else {
        this.status &= ~0x80;
    }

    // Carry Flag (C)
    if (this.y >= valueCPY) {
        this.status |= 0x01;
    } else {
        this.status &= ~0x01;
    }

    console.log(`CPY #0x${valueCPY.toString(16)} -> Y=0x${this.y.toString(16)} | Resultado=0x${resultCPY.toString(16)}`);
    break;

            case 0x4C: // JMP Absolute
    this.cycles += 3; // ✅ JMP Absolute tarda 3 ciclos

    this.pc = this.readWord(this.pc); // ✅ Usamos readWord para leer dirección de 16 bits
    console.log(`JMP 0x${this.pc.toString(16)}`);
    break;

            case 0x20: // JSR Subrutina (Jump to SubRoutine)
    this.cycles += 6; // ✅ JSR tarda 6 ciclos

    let subAddress = this.readWord(this.pc); // ✅ Lee la dirección del subprograma
    let returnAddress = this.pc + 1; // ✅ Dirección de retorno (último byte de JSR)

    this.push((returnAddress >> 8) & 0xFF); // Guarda el byte alto
    this.push(returnAddress & 0xFF);       // Guarda el byte bajo

    this.pc = subAddress; // Salta a la subrutina
    console.log(`JSR 0x${subAddress.toString(16)}`);
    break;
                
            case 0x60: // RTS - Return from Subroutine
    this.cycles += 6; // ✅ RTS tarda 6 ciclos

    let lowRTS = this.pop();  // Saca el byte bajo de la dirección de retorno
    let highRTS = this.pop(); // Saca el byte alto de la dirección de retorno

    this.pc = ((highRTS << 8) | lowRTS) + 1; // Reconstruye la dirección y avanza 1 byte

    console.log(`RTS ejecutado -> Retorno a 0x${this.pc.toString(16)}`);
    break; 
    
             case 0x40: // RTI - Return from Interrupt
    this.cycles += 6; // ✅ RTI tarda 6 ciclos

    this.status = this.pullStack(); // Restaurar el registro de estado (P)
    this.status &= 0xEF; // Limpia el flag B (bit 4), ya que no se almacena en la pila

    let pcl = this.pullStack(); // Byte menos significativo del PC
    let pch = this.pullStack(); // Byte más significativo del PC
    this.pc = (pch << 8) | pcl; // Reconstruir PC

    console.log(`RTI -> PC=0x${this.pc.toString(16)} P=0x${this.status.toString(16)}`);
    break;    

            case 0x00: // BRK - Fuerza interrupción
    this.cycles += 7; // ✅ BRK consume 7 ciclos

    this.pc++; // Saltar el byte después del BRK (padding)
    this.push((this.pc >> 8) & 0xFF); // Push PC alto
    this.push(this.pc & 0xFF);        // Push PC bajo
    this.push(this.status | 0x10);    // Push status con flag Break activado

    this.status |= 0x04; // Setea el flag de interrupción (I)

    // Cargar nueva dirección desde el vector de interrupción
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
    this.cycles += 2; // ✅ SEI consume 2 ciclos
    this.status |= 0x04; // Activa el bit I (Interrupt Disable)
    console.log("SEI - Interrupciones deshabilitadas");
    break;

            case 0xD8: // CLD - Clear Decimal Mode
    this.cycles += 2; // ✅ CLD consume 2 ciclos
    this.status &= ~0x08; // Limpia el bit D (Decimal Mode)
    console.log("CLD - Modo decimal deshabilitado");
    break;

            case 0xA2: // LDX Immediate
    this.cycles += 2; // ✅ LDX Immediate consume 2 ciclos
    this.x = this.readByte(this.pc); // Alternativa más clara si ya tienes readByte()
    this.updateFlags(this.x);
    console.log(`LDX #0x${this.x.toString(16)}`);
    this.pc++;
    break;
                
             case 0xA6: // LDX Zero Page
    let addrZP = this.readByte(this.pc); // Leer dirección en la página cero
    this.x = this.readByte(addrZP); // Cargar el valor en X
    this.updateFlags(this.x); // Actualizar flags
    console.log(`LDX 0x${addrZP.toString(16)} -> X=0x${this.x.toString(16)}`);
    this.pc++; // Avanzar el contador de programa
    cycles = 3; // LDX (Zero Page) usa 3 ciclos
    break;   
    
             case 0xAE: // LDX Absolute
    let addrXAbs = this.readWord(this.pc); // Leer dirección absoluta
    this.x = this.readByte(addrXAbs); // Cargar el valor en X
    this.updateFlags(this.x); // Actualizar flags
    console.log(`LDX 0x${addrXAbs.toString(16)} -> X=0x${this.x.toString(16)}`);
    this.pc += 2; // Avanzar el contador de programa
    cycles = 4; // LDX (Absolute) usa 4 ciclos
    break;
                
             case 0xA0: // LDY Immediate
    this.y = this.readByte(this.pc); // Leer el valor inmediato
    this.updateFlags(this.y); // Actualizar flags
    console.log(`LDY #0x${this.y.toString(16)}`);
    this.pc++; // Avanzar el contador de programa
    cycles = 2; // LDY Immediate usa 2 ciclos
    break;
    
             case 0xA4: // LDY Zero Page
    let addrZP_Y_LDY = this.readByte(this.pc); // Leer dirección en Zero Page
    this.y = this.memory.read(addrZP_Y_LDY); // Cargar el valor en Y
    this.updateFlags(this.y); // Actualizar flags
    console.log(`LDY 0x${addrZP_Y_LDY.toString(16)} -> Y=0x${this.y.toString(16)}`);
    this.pc++; // Avanzar el contador de programa
    cycles = 3; // LDY Zero Page usa 3 ciclos
    break;
    
            case 0xAC: // LDY Absolute
    let addrYAbs = this.readWord(this.pc); // Leer dirección absoluta
    this.y = this.memory.read(addrYAbs); // Cargar el valor en Y
    this.updateFlags(this.y); // Actualizar flags
    console.log(`LDY 0x${addrYAbs.toString(16)} -> Y=0x${this.y.toString(16)}`);
    this.pc += 2; // Avanzar el contador de programa
    cycles = 4; // LDY Absolute usa 4 ciclos
    break;
    
            case 0x8A: // TXA - Transferir X a A
    this.a = this.x; // Copiar el valor de X a A
    this.updateFlags(this.a); // Actualizar los flags Zero y Negative
    console.log(`TXA -> A=0x${this.a.toString(16)}`);
    cycles = 2; // TXA usa 2 ciclos
    break;
    
           case 0xAA: // TAX - Transferir A a X
    this.x = this.a; // Copiar el valor de A a X
    this.updateFlags(this.x); // Actualizar los flags Zero y Negative
    console.log(`TAX -> X=0x${this.x.toString(16)}`);
    cycles = 2; // TAX usa 2 ciclos
    break;
    
           case 0x98: // TYA - Transferir Y a A
    this.a = this.y; // Copiar el valor de Y a A
    this.updateFlags(this.a); // Actualizar los flags Zero y Negative
    console.log(`TYA -> A=0x${this.a.toString(16)}`);
    cycles = 2; // TYA usa 2 ciclos
    break;
    
           case 0xA8: // TAY - Transferir A a Y
    this.y = this.a; // Copiar el valor de A a Y
    this.updateFlags(this.y); // Actualizar los flags Zero y Negative
    console.log(`TAY -> Y=0x${this.y.toString(16)}`);
    cycles = 2; // TAY usa 2 ciclos
    break;
    
           case 0xBA: // TSX - Transferir SP a X
    this.x = this.sp; // Copiar SP a X
    this.updateFlags(this.x); // Actualizar los flags Zero y Negative
    console.log(`TSX -> X=0x${this.x.toString(16)}`);
    cycles = 2; // TSX usa 2 ciclos
    break;
    
          case 0x9A: // TXS - Transferir X a SP
    this.sp = this.x; // Copiar X a SP
    console.log(`TXS -> SP=0x${this.sp.toString(16)}`);
    cycles = 2; //TXS usa 2 ciclos
    break;
    
          case 0x48: // PHA - Push Accumulator to Stack
    this.push(this.a);
    console.log(`PHA -> Pushed A=0x${this.a.toString(16)} to Stack at 0x${(0x100 + this.sp).toString(16)}`);
    cycles = 3;
    break;
    
          case 0x68: // PLA - Pull Accumulator from Stack
    this.a = this.pop(); // Recuperar el valor de la pila en A
    this.updateFlags(this.a); // Actualizar flags Z (Zero) y N (Negative)
    
    console.log(`PLA -> Pulled A=0x${this.a.toString(16)} from Stack at 0x${(0x100 + this.sp).toString(16)}`);
    
    cycles = 4; // PLA tarda 4 ciclos en ejecutarse
    break;  
    
         case 0x08: // PHP - Push Processor Status
    let processorStatus = this.status | 0x10; // El bit 4 (Break) siempre está activo en PHP
    this.push(processorStatus); // Usar `push()` para manejar la pila correctamente
    
    console.log(`PHP -> Pushed Status=0x${processorStatus.toString(16)} to Stack at 0x${(0x100 + this.sp + 1).toString(16)}`);

    cycles = 3; // PHP tarda 3 ciclos en ejecutarse
    break;
    
        case 0x28: // PLP - Pull Processor Status
    this.sp = (this.sp + 1) & 0xFF; // Incrementar SP (asegurando 8 bits)
    let status = this.pop(); // Extraer el estado desde la pila usando `pop()`

    // Asignar el valor directamente a `this.status`, ignorando el bit Break (0x10) y reservando el bit 5
    this.status = (status & 0xEF) | 0x20; // El bit 5 siempre es 1 en la CPU 6502

    console.log(`PLP -> Pulled Status=0x${this.status.toString(16)} from Stack at 0x${(0x100 + this.sp).toString(16)}`);

    cycles = 4; // PLP tarda 4 ciclos en ejecutarse
    break;
    
        case 0xCA: // DEX - Decrementar X
    this.x = (this.x - 1) & 0xFF; // Decrementar X asegurando 8 bits
    this.updateFlags(this.x); // Actualizar flags Zero y Negative
    console.log(`DEX -> X=0x${this.x.toString(16)}`);

    cycles = 2; // DEX tarda 2 ciclos en ejecutarse
    break;
    
       case 0x88: // DEY - Decrementar Y
    this.y = (this.y - 1) & 0xFF; // Decrementar Y asegurando 8 bits
    this.updateFlags(this.y); // Actualizar flags Zero y Negative
    console.log(`DEY -> Y=0x${this.y.toString(16)}`);

    cycles = 2; // DEY tarda 2 ciclos en ejecutarse
    break;
    
       case 0xE8: // INX - Incrementar X
    this.x = (this.x + 1) & 0xFF; // Incrementar X asegurando que sea un byte (8 bits)
    this.updateFlags(this.x); // Actualizar flags Zero y Negative
    console.log(`INX -> X=0x${this.x.toString(16)}`);

    cycles = 2; // INX tarda 2 ciclos en ejecutarse
    break;
    
      case 0xC8: // INY - Incrementar Y
    this.y = (this.y + 1) & 0xFF; // Incrementar Y asegurando que sea un byte (8 bits)
    this.updateFlags(this.y); // Actualizar flags Zero y Negative
    console.log(`INY -> Y=0x${this.y.toString(16)}`);

    cycles = 2; // INY tarda 2 ciclos en ejecutarse
    break;
    
      case 0xE6: // INC Zero Page
    let addrZP_INC = this.readByte(this.pc); // Leer dirección en Zero Page
    let valueZP_INC = (this.readByte(addrZP_INC) + 1) & 0xFF; // Incrementar valor y limitar a 8 bits
    this.memory.write(addrZP_INC, valueZP_INC); // Escribir de vuelta en la memoria
    this.updateFlags(valueZP_INC); // Actualizar los flags Zero y Negative

    console.log(`INC 0x${addrZP_INC.toString(16)} -> ${valueZP_INC.toString(16)}`);

    this.pc++; // Avanzar al siguiente byte en la memoria
    cycles = 5; // INC Zero Page tarda 5 ciclos
    break;

     case 0xEE: // INC Absolute
    let addrIncAbs = this.readWord(this.pc); // ✅ Leer dirección absoluta con readWord
    let valueIncAbs = (this.readByte(addrIncAbs) + 1) & 0xFF; // ✅ Leer valor, incrementar y limitar a 8 bits
    this.memory.write(addrIncAbs, valueIncAbs); // ✅ Escribir nuevo valor
    this.updateFlags(valueIncAbs); // ✅ Actualizar los flags Zero y Negative

    console.log(`INC 0x${addrIncAbs.toString(16)} -> ${valueIncAbs.toString(16)}`);

    this.pc += 2; // ✅ Avanzar 2 bytes en la memoria (dirección de 16 bits)
    cycles = 6; // ✅ INC Absolute tarda 6 ciclos
    break;

     case 0xF6: // INC Zero Page, X
    let addrZP_X_INC = (this.readByte(this.pc) + this.x) & 0xFF; // ✅ Dirección en Zero Page + X
    let valueZP_X_INC = (this.readByte(addrZP_X_INC) + 1) & 0xFF; // ✅ Leer valor y sumar 1
    this.memory.write(addrZP_X_INC, valueZP_X_INC); // ✅ Escribir nuevo valor
    this.updateFlags(valueZP_X_INC); // ✅ Actualizar flags Zero y Negative

    console.log(`INC 0x${addrZP_X_INC.toString(16)} -> ${valueZP_X_INC.toString(16)}`);

    this.pc++; // ✅ Instrucción de 2 bytes (1 para opcode + 1 para dirección)
    cycles = 6; // ✅ INC Zero Page, X tarda 6 ciclos
    break;

     case 0xFE: // INC Absolute, X
    let baseAddr = this.readWord(this.pc); // ✅ Leer dirección base con readWord
    let addrIncAbsX = (baseAddr + this.x) & 0xFFFF; // ✅ Sumar X y asegurar 16 bits
    let valueIncAbsX = (this.readByte(addrIncAbsX) + 1) & 0xFF; // ✅ Leer, incrementar y limitar a 8 bits
    this.memory.write(addrIncAbsX, valueIncAbsX); // ✅ Escribir nuevo valor
    this.updateFlags(valueIncAbsX); // ✅ Actualizar flags Zero y Negative

    console.log(`INC 0x${addrIncAbsX.toString(16)} -> ${valueIncAbsX.toString(16)}`);

    this.pc += 2; // ✅ Instrucción de 3 bytes (1 para opcode + 2 para dirección)
    cycles = 7; // ✅ INC Absolute, X tarda 7 ciclos
    break;
    
     case 0x0A: // ASL A - Shift Left Acumulator
    this.carryFlag = (this.a & 0x80) !== 0; // ✅ Guarda el bit 7 en la bandera de Carry
    this.a = (this.a << 1) & 0xFF; // ✅ Desplaza a la izquierda y mantiene en 8 bits
    this.updateFlags(this.a); // ✅ Actualiza los flags Zero y Negative

    console.log(`ASL A -> A=0x${this.a.toString(16)} Carry=${this.carryFlag ? 1 : 0}`);

    cycles = 2; // ✅ ASL Acumulador tarda 2 ciclos
    break;

    case 0x06: // ASL Zero Page
    let addrASL_ZP = this.readByte(this.pc++); // ✅ Dirección en Zero Page
    let valueASL_ZP = this.readByte(addrASL_ZP); // ✅ Leer valor en la dirección
    
    this.carryFlag = (valueASL_ZP & 0x80) !== 0; // ✅ Guarda el bit 7 en Carry
    valueASL_ZP = (valueASL_ZP << 1) & 0xFF; // ✅ Desplaza a la izquierda y mantiene en 8 bits

    this.writeByte(addrASL_ZP, valueASL_ZP); // ✅ Escribir de vuelta en memoria
    this.updateFlags(valueASL_ZP); // ✅ Actualizar flags Zero y Negative

    console.log(`ASL Zero Page -> [0x${addrASL_ZP.toString(16)}]=0x${valueASL_ZP.toString(16)} Carry=${this.carryFlag ? 1 : 0}`);

    cycles = 5; // ✅ ASL en Zero Page tarda 5 ciclos
    break;

    case 0x16: // ASL Zero Page,X
    let addrASL_ZPX = (this.readByte(this.pc++) + this.x) & 0xFF; // ✅ Dirección en Zero Page + X
    let valueASL_ZPX = this.readByte(addrASL_ZPX); // ✅ Leer valor en la dirección

    this.carryFlag = (valueASL_ZPX & 0x80) !== 0; // ✅ Guarda el bit 7 en Carry
    valueASL_ZPX = (valueASL_ZPX << 1) & 0xFF; // ✅ Desplaza a la izquierda y mantiene en 8 bits

    this.writeByte(addrASL_ZPX, valueASL_ZPX); // ✅ Escribir de vuelta en memoria
    this.updateFlags(valueASL_ZPX); // ✅ Actualizar flags Zero y Negative

    console.log(`ASL Zero Page,X -> [0x${addrASL_ZPX.toString(16)}]=0x${valueASL_ZPX.toString(16)} Carry=${this.carryFlag ? 1 : 0}`);

    cycles = 6; // ✅ ASL Zero Page,X tarda 6 ciclos
    break;

   case 0x0E: // ASL Absolute
    let addrASL_Abs = this.readWord(this.pc); // ✅ Usa readWord para obtener la dirección absoluta
    this.pc += 2; // ✅ Avanza el PC correctamente

    let valueASL_Abs = this.readByte(addrASL_Abs); // ✅ Leer el valor en la dirección
    this.carryFlag = (valueASL_Abs & 0x80) !== 0; // ✅ Guarda el bit 7 en Carry
    valueASL_Abs = (valueASL_Abs << 1) & 0xFF; // ✅ Desplaza a la izquierda y mantiene en 8 bits

    this.writeByte(addrASL_Abs, valueASL_Abs); // ✅ Escribir de vuelta en memoria
    this.updateFlags(valueASL_Abs); // ✅ Actualizar flags Zero y Negative

    console.log(`ASL Absolute -> [0x${addrASL_Abs.toString(16)}]=0x${valueASL_Abs.toString(16)} Carry=${this.carryFlag ? 1 : 0}`);

    cycles = 6; // ✅ ASL Absolute tarda 6 ciclos
    break;

    case 0x1E: // ASL Absolute,X
    let addrASL_AbsX = (this.readWord(this.pc) + this.x) & 0xFFFF; // ✅ Sumar X correctamente
    this.pc += 2; // ✅ Avanza el PC correctamente

    let valueASL_AbsX = this.readByte(addrASL_AbsX); // ✅ Leer el valor en la dirección
    this.carryFlag = (valueASL_AbsX & 0x80) !== 0; // ✅ Guarda el bit 7 en Carry
    valueASL_AbsX = (valueASL_AbsX << 1) & 0xFF; // ✅ Desplaza a la izquierda y mantiene en 8 bits

    this.writeByte(addrASL_AbsX, valueASL_AbsX); // ✅ Escribir de vuelta en memoria
    this.updateFlags(valueASL_AbsX); // ✅ Actualizar flags Zero y Negative

    console.log(`ASL Absolute,X -> [0x${addrASL_AbsX.toString(16)}]=0x${valueASL_AbsX.toString(16)} Carry=${this.carryFlag ? 1 : 0}`);

    cycles = 7; // ✅ ASL Absolute,X tarda 7 ciclos
    break;
    
    case 0x4A: // LSR Acumulador
    this.carryFlag = (this.a & 0x01) !== 0; // ✅ Guarda el bit 0 en la bandera de Carry
    this.a = (this.a >>> 1) & 0xFF; // ✅ Desplaza A a la derecha sin signo (manteniendo 8 bits)

    this.updateFlags(this.a); // ✅ Actualiza los flags Zero y Negative (N siempre será 0 en LSR)

    console.log(`LSR A -> A=0x${this.a.toString(16)} Carry=${this.carryFlag ? 1 : 0}`);

    cycles = 2; // ✅ LSR Acumulador tarda 2 ciclos
    break;

    case 0x46: // LSR Zero Page
    let addrZP_LSR = this.readByte(this.pc++); // ✅ Usa readByte para obtener la dirección en Zero Page
    let valueZP_LSR = this.readByte(addrZP_LSR); // ✅ Lee el valor en esa dirección

    this.carryFlag = (valueZP_LSR & 0x01) !== 0; // ✅ Guarda el bit 0 en Carry
    valueZP_LSR = (valueZP_LSR >>> 1) & 0xFF; // ✅ Desplaza a la derecha (sin signo)
    
    this.writeByte(addrZP_LSR, valueZP_LSR); // ✅ Escribe el resultado de vuelta en memoria
    this.updateFlags(valueZP_LSR); // ✅ Actualiza los flags Zero y Negative (N siempre es 0 en LSR)

    console.log(`LSR Zero Page -> [0x${addrZP_LSR.toString(16)}] = 0x${valueZP_LSR.toString(16)} Carry=${this.carryFlag ? 1 : 0}`);

    cycles = 5; // ✅ LSR Zero Page tarda 5 ciclos
    break;

    case 0x4E: // LSR Absolute
    {
        let addrLSRAbs = this.readWord(this.pc); // ✅ Usa readWord para obtener la dirección absoluta
        this.pc += 2; // ✅ Avanza el PC después de leer la dirección

        let valueLSRAbs = this.readByte(addrLSRAbs); // ✅ Lee el valor desde la dirección obtenida

        this.carryFlag = (valueLSRAbs & 0x01) !== 0; // ✅ Guarda el bit 0 en Carry
        valueLSRAbs = (valueLSRAbs >>> 1) & 0xFF; // ✅ Desplaza a la derecha (sin signo)

        this.writeByte(addrLSRAbs, valueLSRAbs); // ✅ Escribe el resultado en memoria
        this.updateFlags(valueLSRAbs); // ✅ Actualiza los flags Zero y Negative (N siempre es 0 en LSR)

        console.log(`LSR Absolute -> [0x${addrLSRAbs.toString(16).padStart(4, "0")}] = 0x${valueLSRAbs.toString(16)}`);

        cycles = 6; // ✅ LSR Absolute tarda 6 ciclos
    }
    break;
    
    case 0x2A: // ROL Acumulador
    this.cycles += 2; // ✅ ROL Acumulador consume 2 ciclos
    {
        let carry = (this.status & 0x01); // Obtener el Carry actual
        this.status = (this.status & ~0x01) | ((this.a >> 7) & 0x01); // Nuevo Carry = bit 7 del acumulador
        this.a = ((this.a << 1) & 0xFF) | carry; // Rotar a la izquierda con inserción del carry
        this.updateFlags(this.a); // Actualizar Z y N
        console.log(`ROL A -> A=0x${this.a.toString(16)}`);
    }
    break;

    case 0x26: // ROL Zero Page
    {
        this.cycles += 5; // ✅ 5 ciclos para ROL en Zero Page

        let addrZP_ROL = this.readByte(this.pc); // ✅ Usar readByte para mayor consistencia
        this.pc++;

        let valueZP = this.memory.read(addrZP_ROL); // Leer valor en memoria
        let carry = this.status & 0x01; // Obtener el Carry actual

        // Actualizar Carry con el bit 7 del valor original
        this.status = (this.status & ~0x01) | ((valueZP >> 7) & 0x01);

        // Rotar a la izquierda e insertar el Carry
        valueZP = ((valueZP << 1) & 0xFF) | carry;

        // Escribir el nuevo valor de vuelta en memoria
        this.memory.write(addrZP_ROL, valueZP);

        // Actualizar flags Z y N
        this.updateFlags(valueZP);

        console.log(`ROL 0x${addrZP_ROL.toString(16)} -> 0x${valueZP.toString(16)}`);
    }
    break;

    case 0x2E: // ROL Absolute
    {
        this.cycles += 6; // ✅ 6 ciclos para ROL en modo absoluto

        let addrROLAbs = this.readWord(this.pc); // ✅ Dirección absoluta
        this.pc += 2;

        let valueROLAbs = this.readByte(addrROLAbs); // Leer valor original
        let carry = this.status & 0x01; // Obtener el Carry actual

        // Actualizar Carry con el bit 7 del valor original
        this.status = (this.status & ~0x01) | ((valueROLAbs >> 7) & 0x01);

        // Rotar a la izquierda con Carry
        valueROLAbs = ((valueROLAbs << 1) & 0xFF) | carry;

        this.writeByte(addrROLAbs, valueROLAbs); // Escribir nuevo valor
        this.updateFlags(valueROLAbs); // Actualizar Z y N

        console.log(`ROL Absolute -> [0x${addrROLAbs.toString(16).padStart(4, "0")}] = 0x${valueROLAbs.toString(16)}`);
    }
    break;
    
    case 0x6A: // ROR Acumulador
    {
        this.cycles += 2; // ✅ 2 ciclos para ROR en modo acumulador

        let carryIn = (this.status & 0x01) << 7; // El Carry actual va al bit 7
        let carryOut = this.a & 0x01; // Bit 0 va al nuevo Carry

        this.a = (this.a >> 1) | carryIn; // Rota a la derecha con Carry
        this.a &= 0xFF; // Asegurarse de mantener el valor dentro de 8 bits

        // Actualizar el nuevo Carry en el status
        this.status = (this.status & ~0x01) | carryOut;

        this.updateFlags(this.a); // Actualiza flags Z y N

        console.log(`ROR A -> A=0x${this.a.toString(16)}`);
    }
    break;

    case 0x66: // ROR Zero Page
    {
        this.cycles += 5; // ✅ 5 ciclos para ROR en modo Zero Page

        let addrZP_ROR = this.readByte(this.pc); // Dirección en Zero Page
        let valueZP = this.readByte(addrZP_ROR); // Obtener el valor actual
        this.pc++;

        let carryIn = (this.status & 0x01) << 7; // Obtener Carry actual y moverlo a bit 7
        let carryOut = valueZP & 0x01; // Bit 0 va al nuevo Carry

        valueZP = (valueZP >> 1) | carryIn; // Rota a la derecha con Carry entrante
        valueZP &= 0xFF; // Asegurar 8 bits

        this.writeByte(addrZP_ROR, valueZP); // Escribir el nuevo valor
        this.status = (this.status & ~0x01) | carryOut; // Actualizar Carry Flag
        this.updateFlags(valueZP); // Actualizar Z y N

        console.log(`ROR 0x${addrZP_ROR.toString(16)} -> 0x${valueZP.toString(16)}`);
    }
    break;

    case 0x6E: // ROR Absolute
    {
        this.cycles += 6; // ✅ 6 ciclos para ROR en modo Absolute

        let addrRORAbs = this.readWord(this.pc); // Obtener dirección absoluta
        this.pc += 2;

        let valueRORAbs = this.readByte(addrRORAbs); // Leer valor de memoria

        let carryIn = (this.status & 0x01) << 7; // Obtener Carry actual y moverlo al bit 7
        let carryOut = valueRORAbs & 0x01; // Bit 0 se convierte en nuevo Carry

        valueRORAbs = (valueRORAbs >> 1) | carryIn; // Rota a la derecha con Carry entrante
        valueRORAbs &= 0xFF;

        this.writeByte(addrRORAbs, valueRORAbs); // Guardar el nuevo valor en memoria
        this.status = (this.status & ~0x01) | carryOut; // Actualizar Carry flag
        this.updateFlags(valueRORAbs); // Actualizar Z y N

        console.log(`ROR Absolute -> [0x${addrRORAbs.toString(16).padStart(4, "0")}] = 0x${valueRORAbs.toString(16)}`);
    }
    break;
        
    case 0x90: // BCC - Branch if Carry Clear
    {
        this.cycles += 2; // ✅ Ciclos base

        let offset = this.readByte(this.pc); // ✅ Usamos readByte
        this.pc++; // Avanzar PC

        if ((this.status & 0x01) === 0) { // Carry flag está limpio (C = 0)
            let signedOffset = offset < 0x80 ? offset : offset - 0x100; // Convertir a valor con signo
            let oldPC = this.pc;
            this.pc = (this.pc + signedOffset) & 0xFFFF; // Salto efectivo

            this.cycles += (oldPC & 0xFF00) !== (this.pc & 0xFF00) ? 2 : 1; // Ciclos adicionales por salto y cruce de página
            console.log(`BCC tomado -> Salta a 0x${this.pc.toString(16)}`);
        } else {
            console.log(`BCC no tomado -> Continúa en 0x${this.pc.toString(16)}`);
        }
    }
    break;
    
    case 0xB0: // BCS - Branch if Carry Set
    {
        let offset = this.readByte(this.pc); // ✅ Leer el desplazamiento con readByte
        this.pc++; // Avanzar el PC

        cycles = 2; // ✅ BCS usa 2 ciclos base

        if ((this.status & 0x01) !== 0) { // Si el flag Carry (C) está en 1
            let newPC = this.pc + (offset < 0x80 ? offset : offset - 0x100); // ✅ Convertir a valor con signo
            
            cycles += ((this.pc & 0xFF00) !== (newPC & 0xFF00)) ? 2 : 1; // ✅ Página cruzada = +2 ciclos, misma página = +1 ciclo

            console.log(`BCS tomado -> Salto a 0x${newPC.toString(16)}`);
            this.pc = newPC & 0xFFFF; // ✅ Mantener PC en 16 bits
        } else {
            console.log(`BCS no tomado -> Continúa en 0x${this.pc.toString(16)}`);
        }
    }
    break;
    
    case 0xF0: // BEQ - Branch if Equal (Zero flag set)
    {
        let offset = this.readByte(this.pc); // ✅ Leer el desplazamiento con readByte
        this.pc++; // Avanzar el PC

        cycles = 2; // ✅ BEQ usa 2 ciclos base

        if ((this.status & 0x02) !== 0) { // Si el flag Zero (Z) está en 1
            let newPC = this.pc + (offset < 0x80 ? offset : offset - 0x100); // ✅ Convertir a valor con signo
            
            cycles += ((this.pc & 0xFF00) !== (newPC & 0xFF00)) ? 2 : 1; // ✅ Página cruzada = +2 ciclos, misma página = +1 ciclo

            console.log(`BEQ tomado -> Salto a 0x${newPC.toString(16)}`);
            this.pc = newPC & 0xFFFF; // ✅ Mantener PC en 16 bits
        } else {
            console.log(`BEQ no tomado -> Continúa en 0x${this.pc.toString(16)}`);
        }
    }
    break;
    
    case 0x30: // BMI - Branch if Minus (Negative flag set)
    {
        let offset = this.readByte(this.pc); // ✅ Leer el desplazamiento con readByte
        this.pc++; // Avanzar el PC

        cycles = 2; // ✅ BMI usa 2 ciclos base

        if ((this.status & 0x80) !== 0) { // Si el flag Negative (N) está en 1
            let newPC = this.pc + (offset < 0x80 ? offset : offset - 0x100); // ✅ Convertir a valor con signo
            
            cycles += ((this.pc & 0xFF00) !== (newPC & 0xFF00)) ? 2 : 1; // ✅ Página cruzada = +2 ciclos, misma página = +1 ciclo

            console.log(`BMI tomado -> Salto a 0x${newPC.toString(16)}`);
            this.pc = newPC & 0xFFFF; // ✅ Mantener PC en 16 bits
        } else {
            console.log(`BMI no tomado -> Continúa en 0x${this.pc.toString(16)}`);
        }
    }
    break;
    
    case 0xD0: // BNE - Branch if Not Equal (Zero flag clear)
    {
        let offset = this.readByte(this.pc); // ✅ Leer el desplazamiento con readByte
        this.pc++; // Avanzar el PC

        cycles = 2; // ✅ BNE usa 2 ciclos base

        if ((this.status & 0x02) === 0) { // Si el flag Zero (Z) es 0
            let newPC = this.pc + (offset < 0x80 ? offset : offset - 0x100); // ✅ Convertir a valor con signo
            
            cycles += ((this.pc & 0xFF00) !== (newPC & 0xFF00)) ? 2 : 1; // ✅ Página cruzada = +2 ciclos, misma página = +1 ciclo

            console.log(`BNE tomado -> Salto a 0x${newPC.toString(16)}`);
            this.pc = newPC & 0xFFFF; // ✅ Mantener PC en 16 bits
        } else {
            console.log(`BNE no tomado -> Continúa en 0x${this.pc.toString(16)}`);
        }
    }
    break;
    
    case 0x10: // BPL - Branch if Plus (Negative flag clear)
    {
        let offset = this.readByte(this.pc); // ✅ Leer el desplazamiento con readByte
        this.pc++; // Avanzar el PC

        cycles = 2; // ✅ BPL usa 2 ciclos base

        if ((this.status & 0x80) === 0) { // Si el flag Negativo (N) es 0
            let newPC = this.pc + (offset < 0x80 ? offset : offset - 0x100); // ✅ Convertir a valor con signo
            
            cycles += ((this.pc & 0xFF00) !== (newPC & 0xFF00)) ? 2 : 1; // ✅ Página cruzada = +2 ciclos, misma página = +1 ciclo

            console.log(`BPL tomado -> Salto a 0x${newPC.toString(16)}`);
            this.pc = newPC & 0xFFFF; // ✅ Mantener PC en 16 bits
        } else {
            console.log(`BPL no tomado -> Continúa en 0x${this.pc.toString(16)}`);
        }
    }
    break;
    
    case 0x50: // BVC - Branch on Overflow Clear
    {
        let offset = this.readByte(this.pc); // ✅ Leer el byte de desplazamiento con readByte
        this.pc++; // Avanzar el PC

        cycles = 2; // ✅ BVC usa 2 ciclos base

        if ((this.status & 0x40) === 0) { // Si el flag Overflow (V) es 0
            let newPC = this.pc + (offset < 0x80 ? offset : offset - 0x100); // ✅ Convertir a valor con signo
            
            cycles += ((this.pc & 0xFF00) !== (newPC & 0xFF00)) ? 2 : 1; // ✅ Página cruzada = +2 ciclos, misma página = +1 ciclo

            console.log(`BVC tomado -> Salto a 0x${newPC.toString(16)}`);
            this.pc = newPC & 0xFFFF; // ✅ Mantener PC en 16 bits
        } else {
            console.log(`BVC no tomado -> Continúa en 0x${this.pc.toString(16)}`);
        }
    }
    break;
    
    case 0x70: // BVS - Branch on Overflow Set
    {
        let offset = this.readByte(this.pc); // ✅ Leer el byte de desplazamiento con readByte
        this.pc++; // Avanzar el PC

        cycles = 2; // ✅ BVS usa 2 ciclos base

        if ((this.status & 0x40) !== 0) { // Si el flag Overflow (V) es 1
            let newPC = this.pc + (offset < 0x80 ? offset : offset - 0x100); // ✅ Convertir a valor con signo
            
            cycles += ((this.pc & 0xFF00) !== (newPC & 0xFF00)) ? 2 : 1; // ✅ Página cruzada = +2 ciclos, misma página = +1 ciclo

            console.log(`BVS tomado -> Salto a 0x${newPC.toString(16)}`);
            this.pc = newPC & 0xFFFF; // ✅ Mantener PC en 16 bits
        } else {
            console.log(`BVS no tomado -> Continúa en 0x${this.pc.toString(16)}`);
        }
    }
    break;

            default:
    console.warn(`⚠️ Opcode desconocido: 0x${opcode.toString(16)} en PC: 0x${(this.pc - 1).toString(16)}`);
    return 2; // Opcional: Darle 2 ciclos para evitar congelamientos
    }
        
        return cycles;      
    }

    run() {
        if (!this.running) {
            console.error("❌ CPU detenida. Reinicia para continuar.");
            return;
        }

        let totalCycles = 0;
        while (totalCycles < 29780) {
            let cyclesUsed = this.step();
            totalCycles += cyclesUsed;

            for (let i = 0; i < cyclesUsed * 3; i++) {
                this.memory.ppu.clock(); //Esta linea fue cambiada de step a clock
            }
        }

        requestAnimationFrame(() => this.run());
    }
}

window.cpu = new CPU(window.memory);
console.log("✅ CPU inicializada correctamente.");