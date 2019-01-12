const wretch = require('wretch').default
const request = wretch('http://apresolve.spotify.com').polyfills({
    fetch: require('node-fetch')
})

module.exports = {
    async getEnpoint() {
        const { ap_list } = await request.get().json()
        const randomEndpointIndex = Math.floor(Math.random() * ap_list.length)
        return ap_list[randomEndpointIndex]
    }
}