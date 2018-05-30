const path = require('path')
const querystring = require('querystring')

const extend = function (target, ...propertyMaps) {
  for (let propertyMap of propertyMaps) {
    for (let key in propertyMap) {
      const value = propertyMap[key]
      target[key] = value
    }
  }
  return target
}

const post = function (url) {
  const xhr = new XMLHttpRequest()
  xhr.open('POST', url)
  xhr.send(null)
}

const getReleaseChannel = function () {
  const version = atom.getVersion()
  if (version.indexOf('beta') > -1) {
    return 'beta'
  } else if (version.indexOf('dev') > -1) {
    return 'dev'
  } else {
    return 'stable'
  }
}

const getOsArch = function () {
  // 32-bit node.exe's os.arch() returns 'x86' on 64-Windows
  if ((process.platform === 'win32') && (process.env.PROCESSOR_ARCHITEW6432 === 'AMD64')) return 'x64'

  return process.arch
}

module.exports =
class Reporter {
  static sendEvent (category, action, label, value) {
    const params = {
      t: 'event',
      ec: category,
      ea: action
    }
    if (label != null) { params.el = label }
    if (value != null) { params.ev = value }

    this.send(params)
  }

  static sendTiming (category, name, value) {
    const params = {
      t: 'timing',
      utc: category,
      utv: name,
      utt: value
    }

    this.send(params)
  }

  static sendException (description) {
    const params = {
      t: 'exception',
      exd: description,
      exf: atom.inDevMode() ? '0' : '1'
    }

    this.send(params)
  }

  static sendPaneItem (item) {
    const params = {
      t: 'appview',
      cd: this.viewNameForPaneItem(item)
    }

    const grammarName = item.getGrammar && item.getGrammar() && item.getGrammar().name
    if (grammarName) {
      params.dt = grammarName
    }
    this.send(params)
  }

  static sendCommand (commandName) {
    if (this.commandCount == null) { this.commandCount = {} }
    if (this.commandCount[commandName] == null) { this.commandCount[commandName] = 0 }
    this.commandCount[commandName]++

    const params = {
      t: 'event',
      ec: 'command',
      ea: commandName.split(':')[0],
      el: commandName,
      ev: this.commandCount[commandName]
    }

    this.send(params)
  }

  // Private
  static send (params) {
    if (global.navigator.onLine) {
      extend(params, {
        v: 1,
        aip: 1,
        tid: 'UA-3769691-33',
        cid: localStorage.getItem('metrics.userId'),
        an: 'atom',
        av: atom.getVersion()
      })

      if (this.consented()) extend(params, this.consentedParams())

      if (this.consented() || this.isTelemetryConsentChoice(params)) {
        this.request(`https://ssl.google-analytics.com/collect?${querystring.stringify(params)}`)
      }
    }
  }

  // Private
  static request (url) {
    post(url)
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
  static consentedParams () {
    const memUse = process.memoryUsage()
    return {
      // cd1: was start date, removed
      cd2: getOsArch(),
      cd3: process.arch,
      cm1: memUse.heapUsed >> 20, // Convert bytes to megabytes
      cm2: Math.round((memUse.heapUsed / memUse.heapTotal) * 100),
      sr: `${screen.width}x${screen.height}`,
      vp: `${innerWidth}x${innerHeight}`,
      aiid: getReleaseChannel()
    }
  }

  // Private
  viewNameForPaneItem (item) {
    let left
    let name = (left = (typeof item.getViewClass === 'function' ? item.getViewClass().name : undefined)) != null ? left : item.constructor.name
    const itemPath = typeof item.getPath === 'function' ? item.getPath() : undefined

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
