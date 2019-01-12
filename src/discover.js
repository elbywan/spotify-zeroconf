const crypto = require('crypto')
const EventEmitter = require('events')
const express = require('express')
const bodyParser = require('body-parser')
const mdns = require('mdns')
const { getBlobFromAuth, getCredentialsFromBlob } = require('./decrypt')

class Discover {
    constructor ({ name = 'Spotify device', port = 44929 } = {}) {
        this.name = name
        this.port = port
        this.deviceId = crypto.createHash('sha1').update(name).digest('hex')
        this.diffieHellman = crypto.getDiffieHellman('modp1')
        this.diffieHellman.generateKeys()
        this.emitter = new EventEmitter()

        this.start()
    }

    start () {
        const txtRecord = {
            Version: '1.0',
            CPath: '/'
        }

        // advertise a http server on port 44929
        this.ad = mdns.createAdvertisement(mdns.tcp('spotify-connect'), this.port, {
            name: this.name,
            txtRecord: txtRecord
        })
        this.ad.start()

        // setup the http server
        this.app = express()
        this.app.use(bodyParser.urlencoded({ extended: true }))
        this.app.get('*', (req, res) => {
            if (req.query.action === 'getInfo') {
                var answer = {
                    status: 101,
                    statusString: 'ERROR-OK',
                    spotifyError: 0,
                    version: '2.1.0',
                    deviceID: this.deviceId,
                    remoteName: this.name,
                    activeUser: '',
                    publicKey: this.diffieHellman.getPublicKey().toString('base64'),
                    deviceType: 'UNKNOWN',
                    libraryVersion: '0.1.0',
                    accountReq: 'PREMIUM',
                    brandDisplayName: 'librespot',
                    modelDisplayName: 'librespot'
                }
                res.send(answer)
            }
        })
        this.app.post('*', (req, res) => {
            if (req.body.action === 'addUser') {
                this.emitter.emit('connected', req.body);
                var answer = {
                    status: 101,
                    spotifyError: 0,
                    statusString: 'ERROR-OK'
                };
                res.send(answer)
            }
            else
                res.status(404).send('Not Found')
        })
        this.server = this.app.listen(44929, '0.0.0.0')
    }
    stop () {
        this.ad.stop()
        this.server.close()
    }
}

module.exports = function(options, { stopWhenDiscovered = true } = {}) {
    return new Promise(resolve => {
        const discover = new Discover(options)
        discover.emitter.on('connected', auth => {
            const blob = getBlobFromAuth(auth, discover.diffieHellman)
            const credentials = getCredentialsFromBlob(blob, auth.userName, discover.deviceId)
            if(stopWhenDiscovered)
                discover.stop()
            return resolve(credentials)
        })
    })
}