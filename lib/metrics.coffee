Collector = require './collector'

module.exports =
  activate: (state) ->
    @collector = new Collector()
    @collector.log(action: 'activate')

  deactivate: ->
    @collector.log(action: 'deactivate')
