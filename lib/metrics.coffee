Guid = require 'guid'

module.exports =
  activate: ({sessionLength}) ->
    atom.config.set('metrics.userId', Guid.raw()) unless atom.config.get('metrics.userId')
    @sessionStart = Date.now()
    process.nextTick ->
      Reporter = require './reporter'
      Reporter.sendEndedEvent(sessionLength) if sessionLength
      Reporter.sendStartedEvent()
      Reporter.sendLoadTimeEvent()

  serialize: ->
    sessionLength: Date.now() - @sessionStart
