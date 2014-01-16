Reporter = require './reporter'

module.exports =
  activate: ({sessionLength}) ->
    unless atom.config.get('metrics.userId')
      atom.config.set('metrics.userId', require('guid').raw())

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

  serialize: ->
    sessionLength: Date.now() - @sessionStart
