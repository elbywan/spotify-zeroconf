const MercuryMessage = require('./MercuryMessage')

module.exports = class MercuryManager {
    constructor (session) {
        this.sequence = 0
        this.session = session
        this.callbacks = new Map()
    }

    async send (options, payloads, callback) {
        const request = new MercuryMessage(this.sequence++)
        await request.init(options, payloads)
        this.session.sendCommand(0xb2, request.build())

        let requestCallbacks = this.callbacks.get(options.uri)
        if(!requestCallbacks) {
            requestCallbacks = []
            this.callbacks.set(options.uri, requestCallbacks)
        }
        requestCallbacks.push(response => {
            if(typeof callback === 'function') {
                callback(response)
            }
            this.callbacks.get(options.uri)
        })
    }

    async parse (payload) {
        const message = new MercuryMessage(this.sequence++)
        await message.from(payload)
        return message
    }
}