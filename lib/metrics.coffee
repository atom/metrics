Reporter = require './reporter'
guid = require 'guid'

module.exports =
  activate: (state) ->
    @sessionId = guid.create().toString()
    Reporter.send('activate', @sessionId)

  deactivate: ->
    Reporter.send('deactivate', @sessionId)
