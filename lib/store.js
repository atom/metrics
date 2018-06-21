const telemetry = require('telemetry-github');

const store = new telemetry.StatsStore('atom', atom.getVersion(), atom.inDevMode(), () => "access_token");
const hasOptedOut = atom.config.get('core.telemetryConsent') === 'limited' ? false : true
store.setOptOut(hasOptedOut)

module.exports = store;
