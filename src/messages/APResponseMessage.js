const HandshakeMessage = require('./HandshakeMessage')

module.exports = class APResponseMessage extends HandshakeMessage {
    constructor () {
        super (
            'keyexchange.proto',
            'APResponseMessage'
        )
    }
}