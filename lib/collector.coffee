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
    getPackageData: ->
      atom.getLoadedPackages().map (pack) ->
        name: pack.name
        loadTime: pack.loadTime
        activateTime: pack.activateTime

    # Private
    getThemeData: ->
      atom.themes.getLoadedThemes().map (theme) ->
        name: theme.name
        loadTime: theme.loadTime
        activateTime: theme.activateTime

    # Public: Returns an object containing data with only simple values.
    getDimensions: () ->
      window_path: @getPath()
      session_id: @getSessionId()
      actor_login: @getUser()
      user_agent: @getUserAgent()
      screen_resolution: @getScreenResolution()
      pixel_ratio: @getPixelRatio()
      browser_resolution: @getBrowserResolution()

    # Public: Returns an object containing data with complex (nested) values.
    getContext: () ->
        packages: @getPackageData()
        themes: @getThemeData()
