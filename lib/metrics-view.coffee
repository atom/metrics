{$$, View} = require 'space-pen'

module.exports =
class MetricsView extends View
  @content: ->
    @div class: 'metrics overlay from-top', =>
      @div "The Metrics package is Alive! It's ALIVE!", class: "message"

  initialize: (serializeState) ->
    rootView.command "metrics:toggle", => @toggle()

  # Returns an object that can be retrieved when package is activated
  serialize: ->

  # Tear down any state and detach
  destroy: ->
    @detach()

  toggle: ->
    console.log "MetricsView was toggled!"
    if @hasParent()
      @detach()
    else
      rootView.append(this)

