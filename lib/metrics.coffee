{CompositeDisposable} = require 'atom'

path = require 'path'
Reporter = require './reporter'
fs = require 'fs-plus'
grim = require 'grim'

IgnoredCommands =
  'vim-mode:move-up': true
  'vim-mode:move-down': true
  'vim-mode:move-left': true
  'vim-mode:move-right': true

module.exports =
  activate: ({sessionLength}) ->
    @subscriptions = new CompositeDisposable
    @shouldIncludePanesAndCommands = Math.random() < 0.05
    @ensureClientId => @begin(sessionLength)

  deactivate: ->
    @subscriptions?.dispose()

  serialize: ->
    sessionLength: Date.now() - @sessionStart

  provideReporter: ->
    sendEvent: Reporter.sendEvent.bind(Reporter)
    sendTiming: Reporter.sendTiming.bind(Reporter)
    sendException: Reporter.sendException.bind(Reporter)

  begin: (sessionLength) ->
    @sessionStart = Date.now()

    Reporter.sendEvent('window', 'ended', null, sessionLength) if sessionLength
    Reporter.sendEvent('window', 'started')

    @subscriptions.add atom.onDidThrowError (event) ->
      errorMessage = event
      errorMessage = event.message if typeof event isnt 'string'
      errorMessage = stripPath(errorMessage) or 'Unknown'
      errorMessage = errorMessage.replace('Uncaught ', '').slice(0, 150)
      Reporter.sendException(errorMessage)

    @subscriptions.add atom.textEditors.observe (editor) ->
      grammar = editor.getGrammar()
      Reporter.sendEvent 'file', 'open', grammar.scopeName if grammar

    @subscriptions.add atom.config.onDidChange 'core.telemetryConsent', ({newValue, oldValue}) ->
      Reporter.sendEvent 'setting', 'core.telemetryConsent', newValue unless newValue is 'undecided'

    @watchPaneItems()
    @watchCommands()
    @watchDeprecations()

    if atom.getLoadSettings().shellLoadTime?
      # Only send shell load time for the first window
      Reporter.sendTiming('shell', 'load', atom.getLoadSettings().shellLoadTime)

    process.nextTick ->
      # Wait until window is fully bootstrapped before sending the load time
      Reporter.sendTiming('core', 'load', atom.getWindowLoadTime())

  ensureClientId: (callback) ->
    # Incorrectly previously called userId. It's actually a clientId (i.e. not across devices)
    if localStorage.getItem('metrics.userId')
      callback()
    else if atom.config.get('metrics.userId')
      # legacy. Users who had the metrics id in their config file
      localStorage.setItem('metrics.userId', atom.config.get('metrics.userId'))
      callback()
    else
      @createClientId (clientId) ->
        localStorage.setItem('metrics.userId', clientId)
        callback()

  createClientId: (callback) ->
    callback require('node-uuid').v4()

  getClientId: ->
    localStorage.getItem('metrics.userId')

  watchPaneItems: ->
    @subscriptions.add atom.workspace.onDidAddPaneItem ({item}) =>
      return unless @shouldIncludePanesAndCommands
      Reporter.sendPaneItem(item)

  watchCommands: ->
    @subscriptions.add atom.commands.onWillDispatch (commandEvent) =>
      return unless @shouldIncludePanesAndCommands
      {type: eventName} = commandEvent
      return if commandEvent.detail?.jQueryTrigger
      return if eventName.startsWith('core:') or eventName.startsWith('editor:')
      return unless eventName.indexOf(':') > -1
      return if eventName of IgnoredCommands
      Reporter.sendCommand(eventName)

  watchDeprecations: ->
    @deprecationCache = {}
    @packageVersionCache = {}

    atom.packages.onDidActivateInitialPackages =>
      packages = atom.packages.getLoadedPackages()
      for pack in packages
        @packageVersionCache[pack.name] = pack?.metadata?.version or 'unknown'

      # Reports initial deprecations as deprecations may have happened before metrics activation.
      setImmediate =>
        for deprecation in grim.getDeprecations()
          @reportDeprecation(deprecation)
        return

      return

    atom.packages.onDidLoadPackage (pack) =>
      unless @packageVersionCache[pack.name]
        @packageVersionCache[pack.name] = pack?.metadata?.version or 'unknown'

    grim.on 'updated', (deprecation) =>
      setImmediate => @reportDeprecation(deprecation)

  reportDeprecation: (deprecation) ->
    message = deprecation.getMessage()[0...500]

    for __, stack of deprecation.stacks
      packageName = stack.metadata?.packageName ? (@getPackageName(stack) or '').toLowerCase()
      continue unless packageName

      unless @packageVersionCache[packageName]
        pack = atom.packages.getLoadedPackage(packageName)
        @packageVersionCache[packageName] = pack?.metadata?.version or 'unknown'

      version = @packageVersionCache[packageName]
      nameAndVersion = "#{packageName}@#{version}"

      unless @deprecationCache[nameAndVersion + message]?
        @deprecationCache[nameAndVersion + message] = true
        Reporter.sendEvent('deprecation-v3', nameAndVersion, message)

    return

  getFileNameFromCallSite: (callsite) ->
    callsite.fileName ? callsite.getFileName()

  getPackageName: (stack) ->
    packagePaths = @getPackagePathsByPackageName()

    for i in [1...stack.length]
      fileName = @getFileNameFromCallSite(stack[i])
      # Empty when it was run from the dev console
      return unless fileName
      # Continue to next stack entry if call is in node_modules
      continue if fileName.includes(path.sep + "node_modules" + path.sep)
      for packageName, packagePath of packagePaths
        relativePath = path.relative(packagePath, fileName)
        return packageName unless /^\.\./.test(relativePath)
      return "init-script" if atom.getUserInitScriptPath() is fileName
    return

  getPackagePathsByPackageName: ->
    return @packagePathsByPackageName if @packagePathsByPackageName?
    @packagePathsByPackageName = {}
    for pack in atom.packages.getLoadedPackages()
      @packagePathsByPackageName[pack.name] = pack.path
      if pack.path.indexOf('.atom/dev/packages') > -1 or pack.path.indexOf('.atom/packages') > -1
        @packagePathsByPackageName[pack.name] = fs.absolute(pack.path)
    @packagePathsByPackageName

PathRE = /'?((\/|\\|[a-z]:\\)[^\s']+)+'?/ig
stripPath = (message) ->
  message.replace(PathRE, '<path>')
