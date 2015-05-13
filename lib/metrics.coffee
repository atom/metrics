crypto = require 'crypto'
Reporter = require './reporter'
grim = require 'grim'

IgnoredCommands =
  'vim-mode:move-up': true
  'vim-mode:move-down': true
  'vim-mode:move-left': true
  'vim-mode:move-right': true

module.exports =
  activate: ({sessionLength}) ->
    @ensureUserInfo =>
      @begin(sessionLength)

  deactivate: ->
    @errorSubscription?.dispose()
    @paneItemSubscription?.dispose()
    @commandSubscription?.dispose()

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
    @paneItemSubscription = atom.workspace.onDidAddPaneItem ({item}) ->
      Reporter.sendPaneItem(item)

    @errorSubscription = atom.onDidThrowError (event) ->
      errorMessage = event
      errorMessage = event.message if typeof event isnt 'string'
      errorMessage = stripPath(errorMessage) or 'Unknown'
      errorMessage = errorMessage.replace('Uncaught ', '').slice(0, 150)
      Reporter.sendException(errorMessage)

    @commandSubscription = atom.commands.onWillDispatch (commandEvent) ->
      {type: eventName} = commandEvent
      return if commandEvent.detail?.jQueryTrigger
      return if eventName.startsWith('core:') or eventName.startsWith('editor:')
      return unless eventName.indexOf(':') > -1
      return if eventName of IgnoredCommands
      Reporter.sendCommand(eventName)

    @watchDeprecations()

    if atom.getLoadSettings().shellLoadTime?
      # Only send shell load time for the first window
      Reporter.sendTiming('shell', 'load', atom.getLoadSettings().shellLoadTime)

    process.nextTick ->
      # Wait until window is fully bootstrapped before sending the load time
      Reporter.sendTiming('core', 'load', atom.getWindowLoadTime())

  ensureUserInfo: (callback) ->
    if localStorage.getItem('metrics.userId')
      callback()
    else if atom.config.get('metrics.userId')
      # legacy. Users who had the metrics id in their config file
      localStorage.setItem('metrics.userId', atom.config.get('metrics.userId'))
      callback()
    else
      @createUserId (userId) =>
        localStorage.setItem('metrics.userId', userId)
        callback()

  createUserId: (callback) ->
    createUUID = -> callback require('node-uuid').v4()
    try
      require('getmac').getMac (error, macAddress) =>
        if error?
          createUUID()
        else
          callback crypto.createHash('sha1').update(macAddress, 'utf8').digest('hex')
    catch e
      createUUID()

  # TODO: Remove these deprecation tracking methods after we remove 1.0 deprecations
  watchDeprecations: ->
    grim.on 'updated', (deprecation) =>
      setImmediate =>
        packageNames = {}
        for stack in deprecation.getStacks()
          packageName = stack.metadata?.packageName ? (@getPackageName(stack) or '').toLowerCase()
          if packageName
            pack = atom.packages.getLoadedPackage(packageName)
            version = pack?.metadata?.version
            packageNames[packageName] = version or 'unknown'

        for packageName, version of packageNames
          Reporter.sendEvent('deprecation', packageName, version) if packageName?

        return

  getPackageName: (stack) ->
    resourcePath = atom.getLoadSettings().resourcePath
    packagePaths = @getPackagePathsByPackageName()
    for packageName, packagePath of packagePaths
      if packagePath.indexOf('.atom/dev/packages') > -1 or packagePath.indexOf('.atom/packages') > -1
        packagePaths[packageName] = fs.absolute(packagePath)

    for i in [1...stack.length]
      {functionName, location, fileName} = stack[i]
      # Empty when it was run from the dev console
      return unless fileName
      # Continue to next stack entry if call is in node_modules
      continue if fileName.includes(path.sep + "node_modules" + path.sep)
      for packageName, packagePath of packagePaths
        relativePath = path.relative(packagePath, fileName)
        return packageName unless /^\.\./.test(relativePath)
      return "Your local #{path.basename(fileName)} file" if atom.getUserInitScriptPath() is fileName
    return

  getPackagePathsByPackageName: ->
    return @packagePathsByPackageName if @packagePathsByPackageName?
    @packagePathsByPackageName = {}
    for pack in atom.packages.getLoadedPackages()
      @packagePathsByPackageName[pack.name] = pack.path
    @packagePathsByPackageName

PathRE = /'?((\/|\\|[a-z]:\\)[^\s']+)+'?/ig
stripPath = (message) ->
  message.replace(PathRE, '<path>')
