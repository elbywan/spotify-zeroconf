module.exports = function BufferReader (buffer) {
    let offset = 0
    const reader = {
        readByte () {
            return buffer.readUInt8(offset++)
        },
        readInt () {
            const lo = reader.readByte()
            if ((lo & 0x80) === 0)
                return lo
            const hi = reader.readByte()
            return lo & 0x7f | hi << 7
        },
        readBytes () {
            const length = reader.readInt()
            const bytes = buffer.slice(offset, offset + length)
            offset += length
            return bytes
        }
    }
    return reader
}