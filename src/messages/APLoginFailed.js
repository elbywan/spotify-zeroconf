const Message = require('./Message')

module.exports = class APLoginFailed extends Message {
    constructor () {
        super(
            'keyexchange.proto',
            'APLoginFailed'
        )
    }
}