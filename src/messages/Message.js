const path = require('path')
const protobuf = require('protobufjs')

module.exports = class Message {

    constructor (protoFile, typeName) {
        this.protoFile = protoFile
        this.typeName = typeName
    }

    async init () {
        this.protoRoot = await protobuf.load(path.join(__dirname,  '../proto/',  this.protoFile))
        this.type = this.protoRoot.lookupType(this.typeName)
        return this
    }

    fromObject (object) {
        this.payload = {...object}
    }

    from (argument) {
        if(argument instanceof Buffer) {
            this.payload = this.type.decode(argument)
        } else {
            this.fromObject(argument)
        }
    }

    encode () {
        const messageObject = this.type.create(this.payload)
        const err = this.type.verify(messageObject)

        if(err)
            throw err

        return this.type.encode(messageObject).finish()
    }
}