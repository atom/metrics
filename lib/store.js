const telemetry = require('telemetry-github')

const store = new telemetry.StatsStore('atom', atom.getVersion(), atom.inDevMode(), () => '')
const notOptedIn = atom.config.get('core.telemetryConsent') !== 'limited'
store.setOptOut(notOptedIn)

module.exports = store
