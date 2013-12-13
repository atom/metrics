os = require 'os'
request = require 'request'
{_} = require 'atom'

module.exports =
  class Reporter
    @defaultParams: ->
      v: 1
      tid: "UA-3769691-33"
      cid: atom.config.get('metrics.userId')
      an: 'atom'
      av: atom.getVersion()
      sr: screen.width + "x" + screen.height

    @sendStartedEvent: ->
      params =
        t: 'event'
        ec: 'session'
        ea: 'started'

      @send(params)

    @sendEndedEvent: (sessionLength) ->
      params =
        t: 'event'
        ec: 'session'
        ea: 'ended'
        ev: sessionLength

      @send(params)

    @sendLoadTimeEvent: ->
      params =
        t: 'timing'
        utc: 'app'
        utv: 'load'
        utt: atom.getWindowLoadTime()

      @send(params)

    @sendEditorAppView: ->
      params =
        t: 'appview'
        cd: 'editor'

      @send(params)

    @send: (params) ->
      _.extend(params, @defaultParams())

      @request
        method: 'POST'
        url: "https://www.google-analytics.com/collect"
        qs: params

    # Private
    @request: (options) ->
      request options, -> # Callback prevents errors from going to the console
