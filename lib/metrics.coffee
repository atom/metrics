crypto = require 'crypto'
Reporter = require './reporter'

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

  begin: (sessionLength) ->
    @sessionStart = Date.now()

    Reporter.sendEvent('window', 'ended', sessionLength) if sessionLength
    Reporter.sendEvent('window', 'started')
    @paneItemSubscription = atom.workspace.onDidAddPaneItem ({item}) ->
      Reporter.sendPaneItem(item)

    @errorSubscription = atom.onDidThrowError (errorMessage) ->
      errorType = errorMessage.split(':')[0] or 'Unknown'
      errorType = errorType.replace('Uncaught ', '').slice(0, 150)
      Reporter.sendException(errorType)

    @commandSubscription = atom.commands.onWillDispatch (commandEvent) ->
      {type: eventName} = commandEvent
      return if commandEvent.detail?.jQueryTrigger
      return if eventName.startsWith('core:') or eventName.startsWith('editor:')
      return unless eventName.indexOf(':') > -1
      return if eventName of IgnoredCommands
      Reporter.sendCommand(eventName)

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
        localStorage.setItem('metrics.sd', @createStartDate())
        callback()

  createUserId: (callback) ->
    require('getmac').getMac (error, macAddress) =>
      if error?
        callback require('node-uuid').v4()
      else
        callback crypto.createHash('sha1').update(macAddress, 'utf8').digest('hex')

  getTodaysDate: -> new Date

  createStartDate: (startDate) ->
    startDate ?= @getTodaysDate()
    year = startDate.getFullYear()
    month = startDate.getMonth() + 1
    date = startDate.getDate()
    weekNumber = @getWeekNumber(startDate)
    "#{year}#{@zerofill(month, 2)}#{@zerofill(date, 2)},#{@zerofill(weekNumber, 3)}"

  getWeekNumber: (date) ->
    date ?= @getTodaysDate()
    oneJan = new Date(date.getFullYear(), 0, 1)
    weekNumber = Math.ceil((((date - oneJan) / 86400000) + oneJan.getDay() + 1) / 7)
    weekNumber = 101 if weekNumber is 53
    weekNumber + 100 * (date.getFullYear() - 2014)

  zerofill: (value, zeros) ->
    (new Array(zeros + 1).join('0') + value).slice(-zeros)
