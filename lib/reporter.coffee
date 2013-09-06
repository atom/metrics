request = require 'request'

module.exports =
  class Reporter
    constructor: ->
      @request = request

    send: (data) ->
      params = timestamp: new Date().getTime()
      for key, value of data
        params["dimensions[#{key}]"] = value

      @request
        url: "https://collector-staging.githubapp.com/atom/page_view"
        qs: params
