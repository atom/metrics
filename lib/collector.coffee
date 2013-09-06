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
      takenFromOctolytics = `function() {
        var e, t, n, r;
        try {
            return t = 0, e = 0, typeof window.innerWidth == "number" ? (t = window.innerWidth, e = window.innerHeight) : ((n = document.documentElement) != null ? n.clientWidth : void 0) != null ? (t = document.documentElement.clientWidth, e = document.documentElement.clientHeight) : ((r = document.body) != null ? r.clientWidth : void 0) != null && (t = document.body.clientWidth, e = document.body.clientHeight), t + "x" + e
        } catch (i) {
            return "unknown"
        }
      }`
      takenFromOctolytics()

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
        packages: @getPackages()
      _.extend(data, additionalData)
