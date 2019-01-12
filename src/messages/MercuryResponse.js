const Message = require('./Message')

module.exports = class MercuryResponse extends Message {
    constructor () {
        super (
            'mercury.proto',
            'MercuryResponse'
        )
    }
}