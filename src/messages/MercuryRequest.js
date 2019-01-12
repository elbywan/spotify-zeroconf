const Message = require('./Message')

module.exports = class MercuryRequest extends Message {
    constructor () {
        super (
            'mercury.proto',
            'MercuryRequest'
        )
    }

    fromObject ({ uri, body = null, etag = null, contentType = null } = {}) {
        this.payload = {
            uri,
            body,
            etag,
            content_type: contentType
        }
    }
}