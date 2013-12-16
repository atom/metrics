Guid = require 'guid'
Reporter = require './reporter'

module.exports =
  activate: ({sessionLength}) ->
    atom.config.set('metrics.userId', Guid.raw()) unless atom.config.get('metrics.userId')
    @sessionStart = Date.now()

    Reporter.sendEvent('ended', sessionLength) if sessionLength
    Reporter.sendEvent('started')
    Reporter.sendTiming('shell-load', atom.getLoadSettings().shellLoadTime)
    atom.workspaceView.on 'pane:item-added', (event, item) ->
      name = item.getViewClass?().name ? item.constructor.name
      Reporter.sendView(name)

    process.nextTick ->
      # Wait until window is fully bootstrapped before sending the load time
      Reporter.sendTiming('core-load', atom.getWindowLoadTime())

  serialize: ->
    sessionLength: Date.now() - @sessionStart
