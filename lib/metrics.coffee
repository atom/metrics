crypto = require 'crypto'
Reporter = require './reporter'

module.exports =
  activate: ({sessionLength}) ->
    unless atom.config.get('metrics.userId')
      @getUserId (userId) -> atom.config.set('metrics.userId', userId)
      @begin(sessionLength)
    else
      @begin(sessionLength)

  serialize: ->
    sessionLength: Date.now() - @sessionStart

  begin: (sessionLength) ->
    @sessionStart = Date.now()

    Reporter.sendEvent('window', 'ended', sessionLength) if sessionLength
    Reporter.sendEvent('window', 'started')
    atom.workspaceView.on 'pane:item-added', (event, item) ->
      name = item.getViewClass?().name ? item.constructor.name
      Reporter.sendView(name)

    if atom.getLoadSettings().shellLoadTime?
      # Only send shell load time for the first window
      Reporter.sendTiming('shell', 'load', atom.getLoadSettings().shellLoadTime)

    process.nextTick ->
      # Wait until window is fully bootstrapped before sending the load time
      Reporter.sendTiming('core', 'load', atom.getWindowLoadTime())


  getUserId: (callback) ->
    require('getmac').getMac (error, macAddress) =>
      if error?
        callback require('guid').raw()
      else
        callback crypto.createHash('sha1').update(macAddress, 'utf8').digest('hex')
