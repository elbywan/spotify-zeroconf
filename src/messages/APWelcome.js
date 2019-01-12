const Message = require('./Message')

module.exports = class APWelcome extends Message {
    constructor () {
        super(
            'authentication.proto',
            'APWelcome'
        )
    }
}