require './octolytics'

module.exports =
  class Reporter
    constructor: (event, user, data) ->
      window._octo.setApp('atom')
      window._octo.setHost('collector-staging.githubapp.com')

      window._octo.setActor
        login: user

      window._octo.setDimensions(data)
      window._octo.push([event])
