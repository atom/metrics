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

    grim.on 'updated', (deprecation) ->
      setImmediate ->
        for path, stack of deprecation.stacks
          packageName = stack.metadata?.packageName
          pack = atom.packages.getLoadedPackage(packageName)
          version = pack?.metadata?.version
          Reporter.sendEvent('deprecation', packageName, version) if packageName?
          break

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

PathRE = /'?((\/|\\|[a-z]:\\)[^\s']+)+'?/ig
stripPath = (message) ->
  message.replace(PathRE, '<path>')
