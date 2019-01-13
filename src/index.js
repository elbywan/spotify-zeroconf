const fs = require('fs')
const spotifyDiscover = require('./discover')
const Session = require('./session')
const { web, logger } = require('./utils')

const DEFAULTS = {
    scope: [
        'user-read-playback-state',
        'user-read-private',
        'user-read-birthdate',
        'user-read-email',
        'playlist-read-private',
        'user-library-read',
        'user-library-modify',
        'user-top-read',
        'playlist-read-collaborative',
        'playlist-modify-public',
        'playlist-modify-private',
        'user-follow-read',
        'user-follow-modify',
        'user-read-currently-playing',
        'user-modify-playback-state',
        'user-read-recently-played'
    ].join(','),
    deviceName: 'Spotify Zeroconf'
}

async function spotifyZeroconf ({
    clientId,
    scope = DEFAULTS.scope,
    deviceName = DEFAULTS.deviceName,
    noCache = false,
    authType = 'token'
} = {}) {
    try {
        let address = 'ap.spotify.com'
        let port = 80
        try {
            const fullAddress = await web.getEnpoint();
            [ address, port ] = fullAddress.split(':')
        } catch (error) {
            console.error(error)
            console.error('Error occured, using the default endpoint.')
        }

        logger.info('Connecting to address ' + address + ':' + port + ' …')

        const session = new Session({
            address,
            port
        })

        await session.handshake()

        let credentials = {}
        if(!noCache && fs.existsSync('credentials.json')) {
            credentials = JSON.parse(fs.readFileSync('credentials.json', 'utf-8'))
        } else {
            credentials = await spotifyDiscover({ name: deviceName })
        }

        await session.authenticate(credentials)

        session.startHandlerLoop()

        return new Promise((resolve, reject) => {
            session.sendMercuryRequest({
                uri: encodeURI(`hm://keymaster/${authType}/authenticated?client_id=${clientId}&scope=${scope}`),
                method: 'GET'
            }, ({ header, payloads }) => {
                if(header.statusCode < 300 && header.statusCode >= 200) {
                    const credentials = JSON.parse(payloads[0].toString())
                    session.close()
                    resolve(credentials)
                } else {
                    reject(header.statusCode)
                }
            })
        })
    } catch (error) {
        console.error(error)
    }
}

module.exports = spotifyZeroconf