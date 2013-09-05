MetricsView = require './metrics-view'

module.exports =
  metricsView: null

  activate: (state) ->
    @metricsView = new MetricsView(state.metricsViewState)

  deactivate: ->
    @metricsView.destroy()

  serialize: ->
    metricsViewState: @metricsView.serialize()
