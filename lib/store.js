const telemetry = require('telemetry-github')

const store = new telemetry.StatsStore('atom', atom.getVersion(), atom.inDevMode(), () => '')
const hasOptedOut = !atom.config.get('core.telemetryConsent') === 'limited'
store.setOptOut(hasOptedOut)

module.exports = store
