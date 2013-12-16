request = require 'request'
{_} = require 'atom'

module.exports =
  class Reporter
    @sendEvent: (name, value)->
      params =
        t: 'event'
        ec: 'session'
        ea: name
        ev: value

      @send(params)

    @sendTiming: (name, value)->
      params =
        t: 'timing'
        utc: 'app'
        utv: name
        utt: value

      @send(params)

    @sendView: (name) ->
      params =
        t: 'appview'
        cd: name

      @send(params)

    # Private
    @send: (params) ->
      _.extend(params, @defaultParams())
      @request
        method: 'POST'
        url: "https://www.google-analytics.com/collect"
        headers:
          'User-Agent': navigator.userAgent
        qs: params

    @request: (options) ->
      request options, -> # Callback prevents errors from going to the console

    @defaultParams: ->
      v: 1
      tid: "UA-3769691-33"
      cid: atom.config.get('metrics.userId')
      an: 'atom'
      av: atom.getVersion()
      sr: screen.width + "x" + screen.height
