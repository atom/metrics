/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS202: Simplify dynamic range loops
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {CompositeDisposable} = require('atom')

const path = require('path')
const Reporter = require('./reporter')
const fs = require('fs-plus')
const grim = require('grim')

const IgnoredCommands = {
  'vim-mode:move-up': true,
  'vim-mode:move-down': true,
  'vim-mode:move-left': true,
  'vim-mode:move-right': true
}

module.exports = {
  activate ({sessionLength}) {
    this.subscriptions = new CompositeDisposable()
    this.shouldIncludePanesAndCommands = Math.random() < 0.05
    return this.ensureClientId(() => this.begin(sessionLength))
  },

  deactivate () {
    return (this.subscriptions != null ? this.subscriptions.dispose() : undefined)
  },

  serialize () {
    return {sessionLength: Date.now() - this.sessionStart}
  },

  provideReporter () {
    return {
      sendEvent: Reporter.sendEvent.bind(Reporter),
      sendTiming: Reporter.sendTiming.bind(Reporter),
      sendException: Reporter.sendException.bind(Reporter)
    }
  },

  begin (sessionLength) {
    this.sessionStart = Date.now()

    if (sessionLength) { Reporter.sendEvent('window', 'ended', null, sessionLength) }
    Reporter.sendEvent('window', 'started')

    this.subscriptions.add(atom.onDidThrowError(function (event) {
      let errorMessage = event
      if (typeof event !== 'string') { errorMessage = event.message }
      errorMessage = stripPath(errorMessage) || 'Unknown'
      errorMessage = errorMessage.replace('Uncaught ', '').slice(0, 150)
      return Reporter.sendException(errorMessage)
    })
    )

    this.subscriptions.add(atom.textEditors.observe(function (editor) {
      const grammar = editor.getGrammar()
      if (grammar) { return Reporter.sendEvent('file', 'open', grammar.scopeName) }
    })
    )

    this.subscriptions.add(atom.config.onDidChange('core.telemetryConsent', function ({newValue, oldValue}) {
      if (newValue !== 'undecided') { return Reporter.sendEvent('setting', 'core.telemetryConsent', newValue) }
    })
    )

    this.watchPaneItems()
    this.watchCommands()
    this.watchDeprecations()

    if (atom.getLoadSettings().shellLoadTime != null) {
      // Only send shell load time for the first window
      Reporter.sendTiming('shell', 'load', atom.getLoadSettings().shellLoadTime)
    }

    return process.nextTick(() =>
      // Wait until window is fully bootstrapped before sending the load time
      Reporter.sendTiming('core', 'load', atom.getWindowLoadTime())
    )
  },

  ensureClientId (callback) {
    // Incorrectly previously called userId. It's actually a clientId (i.e. not across devices)
    if (localStorage.getItem('metrics.userId')) {
      return callback()
    } else if (atom.config.get('metrics.userId')) {
      // legacy. Users who had the metrics id in their config file
      localStorage.setItem('metrics.userId', atom.config.get('metrics.userId'))
      return callback()
    } else {
      return this.createClientId(function (clientId) {
        localStorage.setItem('metrics.userId', clientId)
        return callback()
      })
    }
  },

  createClientId (callback) {
    return callback(require('node-uuid').v4())
  },

  getClientId () {
    return localStorage.getItem('metrics.userId')
  },

  watchPaneItems () {
    return this.subscriptions.add(atom.workspace.onDidAddPaneItem(({item}) => {
      if (!this.shouldIncludePanesAndCommands) { return }
      return Reporter.sendPaneItem(item)
    })
    )
  },

  watchCommands () {
    return this.subscriptions.add(atom.commands.onWillDispatch(commandEvent => {
      if (!this.shouldIncludePanesAndCommands) { return }
      const {type: eventName} = commandEvent
      if (commandEvent.detail != null ? commandEvent.detail.jQueryTrigger : undefined) { return }
      if (eventName.startsWith('core:') || eventName.startsWith('editor:')) { return }
      if (!(eventName.indexOf(':') > -1)) { return }
      if (eventName in IgnoredCommands) { return }
      return Reporter.sendCommand(eventName)
    })
    )
  },

  watchDeprecations () {
    let packages
    this.deprecationCache = {}
    this.packageVersionCache = {}

    atom.packages.onDidActivateInitialPackages(() => {
      packages = atom.packages.getLoadedPackages()
      for (let pack of packages) {
        this.packageVersionCache[pack.name] = __guard__(pack != null ? pack.metadata : undefined, x => x.version) || 'unknown'
      }

      // Reports initial deprecations as deprecations may have happened before metrics activation.
      setImmediate(() => {
        for (let deprecation of grim.getDeprecations()) {
          this.reportDeprecation(deprecation)
        }
      })
    })

    atom.packages.onDidLoadPackage(pack => {
      if (!this.packageVersionCache[pack.name]) {
        return this.packageVersionCache[pack.name] = __guard__(pack != null ? pack.metadata : undefined, x => x.version) || 'unknown'
      }
    })

    return grim.on('updated', deprecation => {
      return setImmediate(() => this.reportDeprecation(deprecation))
    })
  },

  reportDeprecation (deprecation) {
    const message = deprecation.getMessage().slice(0, 500)

    for (let __ in deprecation.stacks) {
      const stack = deprecation.stacks[__]
      const packageName = (stack.metadata != null ? stack.metadata.packageName : undefined) != null ? (stack.metadata != null ? stack.metadata.packageName : undefined) : (this.getPackageName(stack) || '').toLowerCase()
      if (!packageName) { continue }

      if (!this.packageVersionCache[packageName]) {
        const pack = atom.packages.getLoadedPackage(packageName)
        this.packageVersionCache[packageName] = __guard__(pack != null ? pack.metadata : undefined, x => x.version) || 'unknown'
      }

      const version = this.packageVersionCache[packageName]
      const nameAndVersion = `${packageName}@${version}`

      if (this.deprecationCache[nameAndVersion + message] == null) {
        this.deprecationCache[nameAndVersion + message] = true
        Reporter.sendEvent('deprecation-v3', nameAndVersion, message)
      }
    }
  },

  getFileNameFromCallSite (callsite) {
    return callsite.fileName != null ? callsite.fileName : callsite.getFileName()
  },

  getPackageName (stack) {
    const packagePaths = this.getPackagePathsByPackageName()

    for (let i = 1, end = stack.length, asc = end >= 1; asc ? i < end : i > end; asc ? i++ : i--) {
      const fileName = this.getFileNameFromCallSite(stack[i])
      // Empty when it was run from the dev console
      if (!fileName) { return }
      // Continue to next stack entry if call is in node_modules
      if (fileName.includes(path.sep + 'node_modules' + path.sep)) { continue }
      for (let packageName in packagePaths) {
        const packagePath = packagePaths[packageName]
        const relativePath = path.relative(packagePath, fileName)
        if (!/^\.\./.test(relativePath)) { return packageName }
      }
      if (atom.getUserInitScriptPath() === fileName) { return 'init-script' }
    }
  },

  getPackagePathsByPackageName () {
    if (this.packagePathsByPackageName != null) { return this.packagePathsByPackageName }
    this.packagePathsByPackageName = {}
    for (let pack of atom.packages.getLoadedPackages()) {
      this.packagePathsByPackageName[pack.name] = pack.path
      if ((pack.path.indexOf('.atom/dev/packages') > -1) || (pack.path.indexOf('.atom/packages') > -1)) {
        this.packagePathsByPackageName[pack.name] = fs.absolute(pack.path)
      }
    }
    return this.packagePathsByPackageName
  }
}

const PathRE = /'?((\/|\\|[a-z]:\\)[^\s']+)+'?/ig
var stripPath = message => message.replace(PathRE, '<path>')

function __guard__ (value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined
}
