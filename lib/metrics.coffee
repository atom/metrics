Collector = require './collector'
Reporter = require './reporter'

module.exports =
  collector: new Collector()
  reporter: new Reporter()

  activate: (state) ->
    @reporter.send('activate', @collector.getDimensions(), @collector.getContext())

  deactivate: ->
    @reporter.send('deactivate', @collector.getDimensions(), @collector.getContext())
