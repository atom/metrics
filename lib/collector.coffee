_ = require 'underscore'

module.exports =
  class Collector
    constructor: ->
      @sessionId = new Date().getTime()

    # Public: Logs out the data that will be sent.
    log: ->
      console.debug JSON.stringify(@getData())

    # Private
    getPath: ->
      global.project.getPath()

    # Public: Returns the name of the currently logged in user.
    getUser: ->
      process.env.USER

    getSessionId: ->
      @sessionId

    # Public: Returns an object containing all data collected.
    getData: (additionalData) ->
      data =
        windowPath: @getPath()
        sessionId: @getSessionId()
      _.extend(data, additionalData)
