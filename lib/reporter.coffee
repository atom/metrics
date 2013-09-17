request = require 'request'

module.exports =
  class Reporter
    constructor: ->
      @request = request

    send: (eventType, data) ->
      params = timestamp: new Date().getTime()
      params.dimensions = data

      @request
        method: 'POST'
        url: "https://collector.githubapp.com/atom/#{eventType}"
        headers:
          'Content-Type' : 'application/vnd.github-octolytics+json'
        body: JSON.stringify(params)
