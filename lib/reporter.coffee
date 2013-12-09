os = require 'os'
request = require 'request'

module.exports =
  class Reporter
    @sendActivateEvent: ->
      params =
        timestamp: Date.now() / 1000
        dimensions:
          window_path: atom.project.getPath()
          actor_login: process.env.USER
          user_agent: navigator.userAgent
          screen_resolution: screen.width + "x" + screen.height
          pixel_ratio: window.devicePixelRatio
          version: atom.getVersion()
          cpus: os.cpus()?.length ? 0
          memory: os.totalmem() ? 0
        context:
          packages: @getPackageData()
          themes: @getThemeData()

      @send('activate', params)

    @sendDeactivateEvent: (sessionLength) ->
      params =
        timestamp: Date.now() / 1000
        dimensions:
          actor_login: process.env.USER
          user_agent: navigator.userAgent
          version: atom.getVersion()
        measures:
          session_length: sessionLength

      @send('deactivate', params)

    @send: (eventType, params) ->
      @request
        method: 'POST'
        url: "https://collector.githubapp.com/atom/#{eventType}"
        headers: 'Content-Type' : 'application/vnd.github-octolytics+json'
        body: JSON.stringify(params)

    # Private
    @request: (options) ->
      request options, -> # Callback prevents errors from going to the console

    # Private
    @getPackageData: ->
      atom.packages.getLoadedPackages().map (pack) ->
        name: pack.name
        loadTime: pack.loadTime
        activateTime: pack.activateTime

    # Private
    @getThemeData: ->
      atom.themes.getLoadedThemes().map (theme) ->
        name: theme.name
        loadTime: theme.loadTime
        activateTime: theme.activateTime
