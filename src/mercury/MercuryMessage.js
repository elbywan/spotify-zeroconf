const {
    MercuryHeader
} = require('../messages')

module.exports = class MercuryMessage {
    constructor(sequence) {
        this.sequence = sequence
    }

    async init (options, payloads = []) {
        this.header = await new MercuryHeader().init()
        this.header.from(options)
        this.payloads = payloads
    }

    build () {
        const seqLength = Buffer.alloc(2)
        seqLength.writeUInt16BE(4)

        const seq = Buffer.alloc(4)
        seq.writeUInt32BE(this.sequence)

        const flags = Buffer.alloc(1)
        flags.writeUInt8(0x01)

        const partsCount = Buffer.alloc(2)
        partsCount.writeUInt16BE(1 + this.payloads.length)

        const headerBuffer = this.header.encode()
        const headerLength = Buffer.alloc(2)
        headerLength.writeUInt16BE(headerBuffer.length)

       return Buffer.concat([
            seqLength,
            seq,
            flags,
            partsCount,
            headerLength,
            headerBuffer,
            Buffer.concat(this.payloads.reduce((acc, part) => {
                const partLength = Buffer.alloc(2)
                partLength.writeUInt16BE(part.length)
                acc.push(partLength)
                acc.push(part)
                return acc
            }, []))
        ])
    }

    async from (buffer) {
        let offset = 0
        // eslint-disable-next-line
        let seq = 0

        const seqLength = buffer.readUInt16BE(offset)

        offset += 2
        if(seqLength === 2) {
            seq = buffer.readUInt16BE(offset)
        } else if(seqLength === 4) {
            seq = buffer.readUInt32BE(offset)
        }
        offset += seqLength

        // eslint-disable-next-line
        const flags = buffer.readUInt8(offset)
        offset++

        const partsCount = buffer.readUInt16BE(offset)
        offset += 2

        const headerLength = buffer.readUInt16BE(offset)
        offset += 2

        this.header = await new MercuryHeader().init()
        this.header.from(buffer.slice(offset, offset + headerLength))
        offset += headerLength

        this.payloads = []
        for(let i = 0; i < partsCount - 1; i++) {
            const partLength = buffer.readUInt16BE(offset)
            offset += 2
            const payload = buffer.slice(offset, offset + partLength)
            offset += partLength
            this.payloads.push(payload)
        }
    }
}