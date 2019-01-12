const Long = require('long')
const HandshakeMessage = require('./HandshakeMessage')

module.exports = class ClientHello extends HandshakeMessage {

    constructor () {
        super (
            'keyexchange.proto',
            'ClientHello'
        )
    }

    fromObject ({ publicKey }) {
        const nonce = Buffer.allocUnsafe(16);
        for(let i = 0; i < 16; i++) {
            nonce[i] = Math.floor(Math.random() * 0xFF)
        }

        this.payload = {
            buildInfo: {
                product: this.protoRoot.getEnum('Product').PRODUCT_PARTNER,
                platform: this.protoRoot.getEnum('Platform').PLATFORM_LINUX_X86,
                version: Long.fromString('0x10800000000', 16)
            },
            cryptosuitesSupported: [ this.protoRoot.getEnum('Cryptosuite').CRYPTO_SUITE_SHANNON ],
            loginCryptoHello: {
                diffieHellman: {
                    gc: publicKey,
                    serverKeysKnown: 1
                }
            },
            clientNonce: nonce,
            padding: Buffer.from([0x1e])
        }
    }
}