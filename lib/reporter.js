const path = require('path')
const telemetry = require('telemetry-github')

const extend = function (target, ...propertyMaps) {
  for (let propertyMap of propertyMaps) {
    for (let key in propertyMap) {
      const value = propertyMap[key]
      target[key] = value
    }
  }
  return target
}

const getReleaseChannel = function () {
  const version = atom.getVersion()
  const match = version.match(/\d+\.\d+\.\d+(-([a-z]+)(\d+|-\w{4,})?)?$/)
  if (!match) {
    return 'unrecognized'
  } else if (match[2]) {
    return match[2]
  }

  return 'stable'
}

const getOsArch = function () {
  // 32-bit node.exe's os.arch() returns 'x86' on 64-Windows
  if ((process.platform === 'win32') && (process.env.PROCESSOR_ARCHITEW6432 === 'AMD64')) return 'x64'

  return process.arch
}

let store

module.exports =
class Reporter {
  static incrementCounter (counterName) {
    this.getStore().incrementCounter(counterName)
  }

  static addCustomEvent (eventType, event) {
    extend(event, this.getEventMetadata())
    this.getStore().addCustomEvent(eventType, event)
  }

  static addTiming (eventType, durationInMilliseconds, metadata = {}) {
    extend(metadata, this.getEventMetadata())
    this.getStore().addTiming(eventType, durationInMilliseconds, metadata)
  }

  // Deprecated: use addCustomEvent instead.
  static sendEvent (category, action, label, value) {
    const params = {
      t: 'event',
      ec: category,
      ea: action
    }
    if (label != null) { params.el = label }
    if (value != null) { params.ev = value }

    this.addCustomEvent(category, params)
  }

  // Deprecated: use addTiming instead.
  static sendTiming (category, name, value) {
    this.addTiming(name, value, {category})
  }

  static sendException (description) {
    const eventType = 'exception'
    const params = {
      t: eventType,
      exd: description,
      exf: atom.inDevMode() ? '0' : '1'
    }
    this.addCustomEvent(eventType, params)
  }

  static sendPaneItem (item) {
    const eventType = 'appview'
    const params = {
      t: eventType,
      cd: this.viewNameForPaneItem(item)
    }

    const grammarName = item.getGrammar && item.getGrammar() && item.getGrammar().name
    if (grammarName) {
      params.dt = grammarName
    }

    this.addCustomEvent(eventType, params)
  }

  static sendCommand (commandName) {
    const eventType = 'command'
    if (this.commandCount == null) { this.commandCount = {} }
    if (this.commandCount[commandName] == null) { this.commandCount[commandName] = 0 }
    this.commandCount[commandName]++

    const params = {
      t: 'event',
      ec: eventType,
      ea: commandName.split(':')[0],
      el: commandName,
      ev: this.commandCount[commandName]
    }

    this.addCustomEvent(eventType, params)
  }

  // Private
  static getStore () {
    if (!store) {
      store = new telemetry.StatsStore('atom', atom.getVersion(), atom.inDevMode())
      const notOptedIn = atom.config.get('core.telemetryConsent') !== 'limited'
      store.setOptOut(notOptedIn)
    }
    return store
  }

  // Private
  static consented () {
    return atom.config.get('core.telemetryConsent') === 'limited'
  }

  // Private
  static isTelemetryConsentChoice (params) {
    return (params.t === 'event') && (params.ec === 'setting') && (params.ea === 'core.telemetryConsent')
  }

  // Private
  static getEventMetadata () {
    const memUse = process.memoryUsage()
    return {
      // cd1: was start date, removed
      cd2: getOsArch(),
      cd3: process.arch,
      cm1: memUse.heapUsed >> 20, // Convert bytes to megabytes
      cm2: Math.round((memUse.heapUsed / memUse.heapTotal) * 100),
      sr: `${window.screen.width}x${window.screen.height}`,
      vp: `${window.innerWidth}x${window.innerHeight}`,
      aiid: getReleaseChannel()
    }
  }

  // Private
  static viewNameForPaneItem (item) {
    let name = (item.getViewClass && item.getViewClass().name) || item.constructor.name
    const itemPath = item.getPath && item.getPath()

    if ((itemPath == null) || (path.dirname(itemPath) !== atom.getConfigDirPath())) { return name }

    const extension = path.extname(itemPath)
    switch (path.basename(itemPath, extension)) {
      case 'config':
        if (['.json', '.cson'].includes(extension)) { name = 'UserConfig' }
        break
      case 'init':
        if (['.js', '.coffee'].includes(extension)) { name = 'UserInitScript' }
        break
      case 'keymap':
        if (['.json', '.cson'].includes(extension)) { name = 'UserKeymap' }
        break
      case 'snippets':
        if (['.json', '.cson'].includes(extension)) { name = 'UserSnippets' }
        break
      case 'styles':
        if (['.css', '.less'].includes(extension)) { name = 'UserStylesheet' }
        break
    }
    return name
  }
}
