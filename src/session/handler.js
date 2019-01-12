const { logger } = require('../utils')

module.exports = async function ({ cmd, payload, session }) {
    switch(cmd) {
        case 0x4:
            // PacketPing
            // Send back same data with cmd 0x49
            logger.info('> Ping?')
            session.sendCommand(0x49, payload)
            break
        case 0x4a:
            // PacketPongAck
            // Ignore
            logger.info('> Pong.')
            break
        case 0x1b: {
            // PacketCountryCode
            const country = payload.toString('utf-8')
            logger.info('Country:', country)
            break
        }
        case 0xb2: {
            const message = await session.parseMercuryRequest(payload)
            const { statusCode, uri } = message.header.payload

            if(statusCode >= 400) {
                console.error(`!> Error code ${statusCode} for request ${uri}`)
            }

            const callback = session.mercury.callbacks.get(uri).shift()
            callback({ header: message.header.payload, payloads: message.payloads })
            break
        }
        case 0xb3:
        case 0xb4:
        case 0xb5:
            // Mercury
            break

    }
}