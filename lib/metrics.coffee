crypto = require 'crypto'
Reporter = require './reporter'

IgnoredCommands =
  'vim-mode:move-up': true
  'vim-mode:move-down': true
  'vim-mode:move-left': true
  'vim-mode:move-right': true

module.exports =
  config:
    sendUsageStatistics:
      description: "Allow Atom to send general, pseudonymized information including file
        types, commands used, screen size, and various timing information via 
        Google Analytics."
      default: false,
      type: "boolean"
    sendExceptions:
      description: "Allow atom to report all unhandled exceptions including error message and 
        stack trace via Google Analytics."
      default: true,
      type: "boolean"

  activate: ({sessionLength}) ->
    @ensureUserInfo =>
      @begin(sessionLength)
      @configErrorSubscription = atom.config.onDidChange 'metrics.sendExceptions', (sendExceptions) =>
        if sendExceptions.newValue
          @startErrorSubscription()
        else
          @stopErrorSubscription()

      @configUsageSubscription = atom.config.onDidChange 'metrics.sendUsageStatistics', (sendUsageStatistics) =>
        if sendUsageStatistics.newValue
          @startUsageSubscription()
        else
          @stopUsageSubscription()

  deactivate: ->
    @configErrorSubscription?.dispose()
    @configUsageSubscription?.dispose()
    @stopErrorSubscription()
    @stopUsageSubscription()

  serialize: ->
    sessionLength: Date.now() - @sessionStart

  provideReporter: ->
    sendEvent: Reporter.sendEvent.bind(Reporter)
    sendTiming: Reporter.sendTiming.bind(Reporter)
    sendException: Reporter.sendException.bind(Reporter)

  startErrorSubscription: ->
    @errorSubscription = atom.onDidThrowError (event) ->
      errorMessage = event
      errorMessage = event.message if typeof event isnt 'string'
      errorMessage = stripPath(errorMessage) or 'Unknown'
      errorMessage = errorMessage.replace('Uncaught ', '').slice(0, 150)
      Reporter.sendException(errorMessage)

  stopErrorSubscription: ->
    @errorSubscription?.dispose()

  startUsageSubscription: ->
    @paneItemSubscription = atom.workspace.onDidAddPaneItem ({item}) ->
      Reporter.sendPaneItem(item)

    @commandSubscription = atom.commands.onWillDispatch (commandEvent) ->
      {type: eventName} = commandEvent
      return if commandEvent.detail?.jQueryTrigger
      return if eventName.startsWith('core:') or eventName.startsWith('editor:')
      return unless eventName.indexOf(':') > -1
      return if eventName of IgnoredCommands
      Reporter.sendCommand(eventName)

  stopUsageSubscription: ->
    @paneItemSubscription?.dispose()
    @commandSubscription?.dispose()

  begin: (sessionLength) ->
    @sessionStart = Date.now()

    if atom.config.get("metrics.sendExceptions")
      @startErrorSubscription()

    return unless atom.config.get("metrics.sendUsageStatistics")

    @startUsageSubscription()

    Reporter.sendEvent('window', 'ended', null, sessionLength) if sessionLength
    Reporter.sendEvent('window', 'started')
    
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
