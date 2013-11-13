request = require 'request'

module.exports =
  class Reporter
    @send: (eventType, sessionId) ->
      @request
        method: 'POST'
        url: "https://collector.githubapp.com/atom/#{eventType}"
        headers: 'Content-Type' : 'application/vnd.github-octolytics+json'
        body: JSON.stringify(@buildParams(sessionId))

    # Private
    @request: (options) ->
      request options, -> # Callback prevents errors from going to the console

    # Private
    @buildParams: (sessionId) ->
      params =
        timestamp: new Date().getTime() / 1000
        dimensions: # object containing data with only simple values.
          window_path: atom.project.getPath()
          session_id: sessionId
          actor_login: process.env.USER
          user_agent: navigator.userAgent
          screen_resolution: screen.width + "x" + screen.height
          pixel_ratio: window.devicePixelRatio
        context: # object containing data with complex (nested) values.
          packages: @getPackageData()
          themes: @getThemeData()

    # Private
    @getPackageData: ->
      atom.getLoadedPackages().map (pack) ->
        name: pack.name
        loadTime: pack.loadTime
        activateTime: pack.activateTime

    # Private
    @getThemeData: ->
      atom.themes.getLoadedThemes().map (theme) ->
        name: theme.name
        loadTime: theme.loadTime
        activateTime: theme.activateTime
