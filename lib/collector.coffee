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

    # Private
    getUserAgent: ->
      navigator.userAgent

    # Private
    getScreenResolution: ->
      screen.width + "x" + screen.height

    # Private
    getPixelRatio: ->
      window.devicePixelRatio

    # Private
    getBrowserResolution: ->
      try
        width = 0
        height = 0

        if typeof window.innerWidth is 'number'
          width  = window.innerWidth
          height = window.innerHeight
        else if document.documentElement?.clientWidth?
          width  = document.documentElement.clientWidth
          height = document.documentElement.clientHeight
        else if document.body?.clientWidth?
          width  = document.body.clientWidth
          height = document.body.clientHeight

        width + 'x' + height
      catch e
        'unknown'

    # Private
    getPackages: ->
      _.keys(atom.activePackages)

    # Public: Returns an object containing all data collected.
    getData: (additionalData) ->
      data =
        window_path: @getPath()
        session_id: @getSessionId()
        actor_login: @getUser()
        user_agent: @getUserAgent()
        screen_resolution: @getScreenResolution()
        pixel_ratio: @getPixelRatio()
        browser_resolution: @getBrowserResolution()
        packages: JSON.stringify(@getPackages())
      _.extend(data, additionalData)
