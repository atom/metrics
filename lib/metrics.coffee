Collector = require './collector'
Reporter = require './reporter'

module.exports =
  activate: (state) ->
    @collector = new Collector()
    # FIXME: you have to use 'recordPageView'
    new Reporter('recordPageView', @collector.getUser(), @collector.getData())

  deactivate: ->
    # FIXME: you have to use 'recordPageView'
    new Reporter('recordPageView', @collector.getUser(), @collector.getData())
