Reporter = require './reporter'

module.exports =
  activate: ({sessionLength}) ->
    @sessionStart = Date.now()
    Reporter.sendDeactivateEvent(sessionLength) if sessionLength
    Reporter.sendActivateEvent()

  serialize: ->
    sessionLength: Date.now() - @sessionStart
