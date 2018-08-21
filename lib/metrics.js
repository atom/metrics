const {CompositeDisposable} = require('atom')

const path = require('path')
const Reporter = require('./reporter')
const fs = require('fs-plus')
const grim = require('grim')
const {getDomain} = require('./repository-helpers')

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
    this.begin(sessionLength)
  },

  deactivate () {
    if (this.subscriptions != null) this.subscriptions.dispose()
  },

  serialize () {
    return {
      sessionLength: Date.now() - this.sessionStart
    }
  },

  provideReporter () {
    return {
      incrementCounter: Reporter.incrementCounter.bind(Reporter),
      addCustomEvent: Reporter.addCustomEvent.bind(Reporter),
      sendEvent: Reporter.sendEvent.bind(Reporter),
      sendTiming: Reporter.sendTiming.bind(Reporter),
      addTiming: Reporter.addTiming.bind(Reporter),
      sendException: Reporter.sendException.bind(Reporter)
    }
  },

  begin (sessionLength) {
    this.sessionStart = Date.now()

    if (sessionLength) { Reporter.sendEvent('window', 'ended', null, sessionLength) }
    Reporter.sendEvent('window', 'started')

    this.subscriptions.add(atom.onDidThrowError((event) => {
      let errorMessage = event
      if (typeof event !== 'string') { errorMessage = event.message }
      errorMessage = stripPath(errorMessage) || 'Unknown'
      errorMessage = errorMessage.replace('Uncaught ', '').slice(0, 150)
      Reporter.sendException(errorMessage)
    }))

    this.subscriptions.add(atom.textEditors.observe((editor) => {
      const grammar = editor.getGrammar()
      if (grammar) {
        Reporter.sendEvent('file', 'open', grammar.scopeName)
      }
    }))

    this.subscriptions.add(atom.config.onDidChange('core.telemetryConsent', ({newValue, oldValue}) => {
      if (newValue !== 'undecided') {
        Reporter.sendEvent('setting', 'core.telemetryConsent', newValue)
      }

      const notOptedIn = newValue !== 'limited'
      Reporter.getStore().setOptOut(notOptedIn)
    }))

    this.watchActivationOfOptionalPackages()
    this.watchLoadingOfUserDefinedKeyBindings()
    this.watchUserInitScriptChanges()
    this.watchUserStylesheetChanges()
    this.watchPaneItems()
    this.watchRepositories()
    this.watchCommands()
    this.watchDeprecations()

    if (atom.getLoadSettings().shellLoadTime != null) {
      // Only send shell load time for the first window
      Reporter.sendTiming('shell', 'load', atom.getLoadSettings().shellLoadTime)
    }

    process.nextTick(() =>
      // Wait until window is fully bootstrapped before sending the load time
      Reporter.sendTiming('core', 'load', atom.getWindowLoadTime())
    )
  },

  watchActivationOfOptionalPackages () {
    this.subscriptions.add(atom.packages.onDidActivateInitialPackages(() => {
      const optionalPackages = atom.packages.getActivePackages().filter((pack) => {
        return !atom.packages.isBundledPackage(pack.name)
      })

      Reporter.sendEvent(
        'package',
        'numberOptionalPackagesActivatedAtStartup',
        null,
        optionalPackages.length
      )
    }))
  },

  watchLoadingOfUserDefinedKeyBindings () {
    this.subscriptions.add(atom.keymaps.onDidLoadUserKeymap(() => {
      const userDefinedKeyBindings = atom.keymaps.getKeyBindings().filter((binding) => {
        return binding.source === atom.keymaps.getUserKeymapPath()
      })

      Reporter.sendEvent(
        'key-binding',
        'numberUserDefinedKeyBindingsLoadedAtStartup',
        null,
        userDefinedKeyBindings.length
      )
    }))
  },

  watchUserInitScriptChanges () {
    this.subscriptions.add(atom.workspace.observeTextEditors((editor) => {
      if (editor.getPath() === atom.getUserInitScriptPath()) {
        const onDidSaveSubscription = editor.onDidSave(() =>
          Reporter.sendEvent('customization', 'userInitScriptChanged')
        )

        this.subscriptions.add(editor.onDidDestroy(() => onDidSaveSubscription.dispose()))
      }
    }))
  },

  watchUserStylesheetChanges () {
    this.subscriptions.add(atom.workspace.observeTextEditors((editor) => {
      if (editor.getPath() === atom.styles.getUserStyleSheetPath()) {
        const onDidSaveSubscription = editor.onDidSave(() =>
          Reporter.sendEvent('customization', 'userStylesheetChanged')
        )

        this.subscriptions.add(editor.onDidDestroy(() => onDidSaveSubscription.dispose()))
      }
    }))
  },

  watchPaneItems () {
    this.subscriptions.add(atom.workspace.onDidAddPaneItem(({item}) => {
      if (!this.shouldIncludePanesAndCommands) return

      Reporter.sendPaneItem(item)
    }))
  },

  watchRepositories () {
    // TODO Once atom.project.observeRepositories ships to Atom's stable
    // channel (likely in Atom 1.30), remove this guard, and update the atom
    // engine version in package.json to the first Atom version that includes
    // atom.project.observeRepositories
    if (atom.project.observeRepositories == null) return

    this.subscriptions.add(atom.project.observeRepositories((repository) => {
      const domain = getDomain(repository.getOriginURL())
      Reporter.addCustomEvent('repository', { action: 'open', domain })
    }))
  },

  watchCommands () {
    this.subscriptions.add(atom.commands.onWillDispatch(commandEvent => {
      if (!this.shouldIncludePanesAndCommands) return

      const {type: eventName} = commandEvent
      if (commandEvent.detail != null && commandEvent.detail.jQueryTrigger) return

      if (eventName.startsWith('core:') || eventName.startsWith('editor:')) return

      if (!eventName.includes(':')) return

      if (eventName in IgnoredCommands) return

      Reporter.sendCommand(eventName)
    }))
  },

  watchDeprecations () {
    let packages
    this.deprecationCache = {}
    this.packageVersionCache = {}

    atom.packages.onDidActivateInitialPackages(() => {
      packages = atom.packages.getLoadedPackages()
      for (let pack of packages) {
        this.packageVersionCache[pack.name] = getPackageVersion(pack)
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
        this.packageVersionCache[pack.name] = getPackageVersion(pack)
      }
    })

    grim.on('updated', deprecation => {
      setImmediate(() => this.reportDeprecation(deprecation))
    })
  },

  reportDeprecation (deprecation) {
    const message = deprecation.getMessage().slice(0, 500)

    for (let __ in deprecation.stacks) {
      const stack = deprecation.stacks[__]
      const packageName = (stack.metadata && stack.metadata.packageName)
        ? stack.metadata.packageName
        : (this.getPackageName(stack) || '').toLowerCase()
      if (!packageName) continue

      if (!this.packageVersionCache[packageName]) {
        const pack = atom.packages.getLoadedPackage(packageName)
        this.packageVersionCache[packageName] = getPackageVersion(pack)
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

    for (let i = 0; i < stack.length; i++) {
      const fileName = this.getFileNameFromCallSite(stack[i])

      // Empty when it was run from the dev console
      if (!fileName) return

      // Continue to next stack entry if call is in node_modules
      if (fileName.includes(path.sep + 'node_modules' + path.sep)) continue

      for (let packageName in packagePaths) {
        const packagePath = packagePaths[packageName]
        const relativePath = path.relative(packagePath, fileName)
        if (!/^\.\./.test(relativePath)) {
          return packageName
        }
      }

      if (atom.getUserInitScriptPath() === fileName) {
        return 'init-script'
      }
    }
  },

  getPackagePathsByPackageName () {
    if (this.packagePathsByPackageName != null) return this.packagePathsByPackageName

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
const stripPath = message => message.replace(PathRE, '<path>')

const getPackageVersion = function (pack) {
  return (pack && pack.metadata && pack.metadata.version) || 'unknown'
}
