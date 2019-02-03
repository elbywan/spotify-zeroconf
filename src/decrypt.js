const crypto = require('crypto')
const { BufferReader } = require('./utils')

/* Extract and decrypt the blob from the payload */
function getBlobFromAuth (auth, diffieHellman) {
    const { blob: base64Blob, clientKey } = auth

    const encryptedBlob = Buffer.from(base64Blob, 'base64')
    const shared_secret = diffieHellman.computeSecret(Buffer.from(clientKey, 'base64'))

    // IV = encrypted_blob[:0x10]
    const iv = encryptedBlob.slice(0, 16)
    // expected_mac = encrypted_blob[-0x14:]
    const expected_mac = encryptedBlob.slice(encryptedBlob.length - 20)
    // encrypted = encrypted_blob[0x10:-0x14]
    const encrypted = encryptedBlob.slice(16, encryptedBlob.length - 20)

    // base_key = SHA1(shared_secret)
    const base_key = crypto.createHash('sha1').update(shared_secret).digest().slice(0, 16)
    // checksum_key = HMAC-SHA1(base_key, "checksum")
    const checksum_key = crypto.createHmac('sha1', base_key).update('checksum').digest()
    // encryption_key = HMAC-SHA1(base_key, "encryption")[:0x10]
    const encryption_key = crypto.createHmac('sha1', base_key).update('encryption').digest().slice(0, 16)

    // mac = HMAC-SHA1(checksum_key, encrypted)
    const mac = crypto.createHmac('sha1', checksum_key).update(encrypted).digest()

    /* "mac" and "expected mac" are supposed to be equal */
    if(mac.toString('hex') !== expected_mac.toString('hex'))
        process.exit(1)

    // blob = AES128-CTR-DECRYPT(encryption_key, IV, encrypted)
    const decipher = crypto.createDecipheriv('aes-128-ctr', encryption_key, iv)
    let blob = decipher.update(encrypted)
    blob += decipher.final('hex')

    return blob
}

function getCredentialsFromBlob (base64Blob, userName, deviceId) {
    // data = b64_decode(blob)
    const data = Buffer.from(base64Blob, 'base64')
    // base_key = PBKDF2(SHA1(deviceID), username, 0x100, 1)
    const base_key = crypto.pbkdf2Sync(crypto.createHash('sha1').update(deviceId).digest(), userName, 256, 20, 'sha1')
    // key = SHA1(base_key) || htonl(len(base_key))
    const base_key_hashed = crypto.createHash('sha1').update(base_key).digest()
    const base_key_length = Buffer.allocUnsafe(4)
    base_key_length.writeInt32BE(20)
    const key = Buffer.concat([
        base_key_hashed,
        base_key_length
    ])
    // login_data = AES192-DECRYPT(key, data)
    const dataDecipher = crypto.createDecipheriv('aes-192-ecb', key, '')
    dataDecipher.setAutoPadding(false)
    let login_data = dataDecipher.update(data)
    login_data = Buffer.concat([ login_data, dataDecipher.final() ])

    /* Deobfuscate */
    const l = login_data.length
    for (let i = 0; i < l - 16; i++)
        login_data[l - i - 1] ^= login_data[l - i - 17]

    const reader = new BufferReader(login_data)
    reader.readByte()
    reader.readBytes()
    reader.readByte()
    const auth_type = reader.readInt()
    reader.readByte()
    const auth_data = reader.readBytes()

    return {
        username: userName,
        auth_type,
        auth_data: auth_data.toString('base64'),
        device_id: deviceId
    }
}

module.exports = {
    getBlobFromAuth,
    getCredentialsFromBlob
}