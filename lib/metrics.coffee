module.exports =
  activate: ({sessionLength}) ->
    @sessionStart = Date.now()
    process.nextTick ->
      Reporter = require './reporter'
      Reporter.sendDeactivateEvent(sessionLength) if sessionLength
      Reporter.sendActivateEvent()

  serialize: ->
    sessionLength: Date.now() - @sessionStart
