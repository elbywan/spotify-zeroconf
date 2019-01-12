const Message = require('./Message')

module.exports = class ClientResponseEncrypted extends Message {
    constructor () {
        super (
            'authentication.proto',
            'ClientResponseEncrypted'
        )
    }

    fromObject (credentials) {
        this.payload = {
            loginCredentials: {
                username: credentials.username,
                typ: credentials.auth_type,
                authData: credentials.auth_data
            },
            systemInfo: {
                cpuFamily: 0x00,
                os: 0x00,
                informationString: 'spotify_js',
                deviceId: credentials.device_id,
                versionString: '0.0.1'
            }
        }
    }
}