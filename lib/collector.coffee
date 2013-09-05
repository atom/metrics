_ = require 'underscore'

module.exports =
  class Collector
    constructor: ->
      @sessionId = new Date().getTime()

    # Public: Logs out the data that will be sent.
    log: (additionalData) ->
      console.debug JSON.stringify(@getData(additionalData))

    # Private
    getPath: ->
      global.project.getPath()

    # Private
    getUsername: ->
      process.env.USER

    getSessionId: ->
      @sessionId

    # Private
    getData: (additionalData)->
      data =
        windowPath: @getPath()
        username: @getUsername()
        sessionId: @getSessionId()
      _.extend(data, additionalData)
