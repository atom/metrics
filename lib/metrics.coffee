Guid = require 'guid'

module.exports =
  configDefaults:
    userId: Guid.raw()

  activate: ({sessionLength}) ->
    @sessionStart = Date.now()
    process.nextTick ->
      Reporter = require './reporter'
      Reporter.sendEndedEvent(sessionLength) if sessionLength
      Reporter.sendStartedEvent()
      Reporter.sendLoadTimeEvent()

  serialize: ->
    sessionLength: Date.now() - @sessionStart
