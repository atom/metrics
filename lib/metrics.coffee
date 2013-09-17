Collector = require './collector'
Reporter = require './reporter'

module.exports =
  collector: new Collector()
  reporter: new Reporter()

  activate: (state) ->
    @reporter.send('activate', @collector.getData())

  deactivate: ->
    @reporter.send('deactivate', @collector.getData())
