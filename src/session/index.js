const crypto = require('crypto')
const EventEmitter = require('events')
const Shannon = require('shannon-bindings')

const Client = require('./client')
const { logger } = require('../utils')
const handler = require('./handler')
const mercury = require('../mercury')
const {
    ClientHello,
    APResponseMessage,
    ClientResponsePlainText,
    ClientResponseEncrypted,
    APWelcome,
    APLoginFailed
} = require('../messages')


module.exports = class Session extends EventEmitter {

    constructor ({
        address = 'ap.spotify.com',
        port = 80
    } = {}) {
        super()
        this.address = address
        this.port = port
        this.diffie = crypto.getDiffieHellman('modp1')
        this.diffie.generateKeys()
        this.client = new Client(address, port)
        this.send = {
            nonce: 0
        }
        this.recv = {
            nonce : 0
        }
        this.mercury = new mercury.MercuryManager(this)
    }

    close () {
        this.destroyed = true
        this.client.destroy()
    }

    async handshake () {
        await this.client.connect()

        const clientHello = await new ClientHello().init()
        clientHello.from({ publicKey: this.diffie.getPublicKey() })
        const clientHelloBuffer = clientHello.encode()

        const clientHelloMessageLength = Buffer.alloc(4)
        clientHelloMessageLength.writeInt32BE(2 + 4 + clientHelloBuffer.length)
        const clientHelloPayload = Buffer.concat([
            Buffer.from([0x00, 0x04]),
            clientHelloMessageLength,
            clientHelloBuffer
        ])
        this.client.write(clientHelloPayload)

        const apResponsePayload = await this.client.readHandshakePayload()

        const apResponseMessage = await new APResponseMessage().init()
        apResponseMessage.from(apResponsePayload)

        const { challenge, loginFailed } = apResponseMessage.payload

        if(loginFailed) {
            throw new Error('Login failed, code', loginFailed)
        }

        const sharedKey = this.diffie.computeSecret(challenge.loginCryptoChallenge.diffieHellman.gs)
        const packets = Buffer.concat([
            clientHelloPayload,
            apResponsePayload
        ])

        const accumulator = []
        for(let i = 1; i < 6; i++) {
            const target = Buffer.concat([
                packets,
                Buffer.from([i])
            ])
            const iteration = crypto.createHmac('sha1', sharedKey).update(target).digest()
            accumulator.push(iteration)
        }

        const challengeKeysBuffer = Buffer.concat(accumulator)
        const challengeHmac = crypto.createHmac('sha1', challengeKeysBuffer.slice(0, 20)).update(packets).digest()

        this.send.shannon = new Shannon(challengeKeysBuffer.slice(20, 52))
        this.recv.shannon = new Shannon(challengeKeysBuffer.slice(52, 84))

        const clientResponse = await new ClientResponsePlainText().init()
        clientResponse.from({ hmac: challengeHmac })
        const clientResponseBuffer = clientResponse.encode()

        const clientResponseMessageLength = Buffer.alloc(4)
        clientResponseMessageLength.writeInt32BE(4 + clientResponseBuffer.length)
        const clientResponsePayload = Buffer.concat([
            clientResponseMessageLength,
            clientResponseBuffer
        ])
        this.client.write(clientResponsePayload)
    }

    async authenticate (credentials) {
        const clientResponse = await new ClientResponseEncrypted().init()
        clientResponse.from(credentials)
        const encodedResponse = clientResponse.encode()
        this.sendCommand(0xab, encodedResponse)
        const response = await this.receiveCommand()

        if(response.cmd === 0xac) {
            const apWelcome = await new APWelcome().init()
            apWelcome.from(response.payload)
            // logger.info(apWelcome.payload)
            logger.info('> Authentication Successful with user', apWelcome.payload.canonicalUsername)
        } else if(response.cmd === 0xad) {
            const apFailed = await new APLoginFailed().init()
            apFailed.from(response.payload)
            logger.info(`> Authentication failed.${apFailed.errorDescription ? ' Reason: ' + apFailed.errorDescription : ''} Code: ${apFailed.errorCode})`)
        } else {
            logger.info('> Authentication failed.')
        }
    }

    async startHandlerLoop () {
        while (!this.client.destroyed && !this.client.destroyed) {
            const { cmd, payload } = await this.receiveCommand()
            handler({ cmd, payload, session: this })
        }
    }

    receiveCommand () {
        const nonce = Buffer.allocUnsafe(4)
        nonce.writeUInt32BE(this.recv.nonce++)
        this.recv.shannon.nonce(nonce)
        return this.client.readEncryptedPayload(this.recv.shannon)
    }

    sendCommand (cmd, request) {
        const size = Buffer.allocUnsafe(2)
        size.writeUInt16BE(request.length)
        const nonce = Buffer.allocUnsafe(4)
        nonce.writeUInt32BE(this.send.nonce++)
        this.send.shannon.nonce(nonce)

        let payload = Buffer.concat([
            Buffer.from([cmd]),
            size,
            request
        ])
        const mac = Buffer.allocUnsafe(4)

        this.send.shannon.encrypt(payload)
        this.send.shannon.finish(mac)

        payload = Buffer.concat([
            payload,
            mac
        ])

        return this.client.write(payload)
    }

    async sendMercuryRequest (options, payloads, callback) {
        if(!callback && typeof payloads === 'function') {
            callback = payloads
            payloads = []
        }
        await this.mercury.send(options, payloads, callback)
    }

    parseMercuryRequest (payload) {
        return this.mercury.parse(payload)
    }
}
