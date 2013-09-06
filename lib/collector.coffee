_ = require 'underscore'

module.exports =
  class Collector
    constructor: ->
      @sessionId = new Date().getTime()

    # Private
    getPath: ->
      global.project.getPath()

    # Private
    getUser: ->
      process.env.USER

    # Private
    getSessionId: ->
      @sessionId

    # Public: Returns an object containing all data collected.
    getData: (additionalData) ->
      data =
        window_path: @getPath()
        session_id: @getSessionId()
        actor_login: @getUser()
        user_agent: 'Atom v25.0.0'
        screen_resolution: '2560x1440'
        pixel_ratio: 1
        browser_resolution: '1360x923'
      _.extend(data, additionalData)
