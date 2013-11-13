Reporter = require './reporter'

module.exports =
  activate: ({sessionLength}) ->
    @sessionStart = new Date().getTime()
    Reporter.sendDeactivateEvent(sessionLength) if sessionLength
    Reporter.sendActivateEvent()

  serialize: ->
    sessionLength: new Date().getTime() - @sessionStart
