Collector = require './collector'
Reporter = require './reporter'

module.exports =
  collector: new Collector()
  reporter: new Reporter()

  activate: (state) ->
    @reporter.send(@collector.getData(action: 'activate'))

  deactivate: ->
    @reporter.send(@collector.getData(action: 'deactivate'))
