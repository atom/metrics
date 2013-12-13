Guid = require 'guid'

module.exports =
  activate: ({sessionLength}) ->
    atom.config.set('metrics.userId', Guid.raw()) unless atom.config.get('metrics.userId')
    @sessionStart = Date.now()
    process.nextTick ->
      Reporter = require './reporter'
      Reporter.sendEndedEvent(sessionLength) if sessionLength
      Reporter.sendStartedEvent()
      Reporter.sendWindowLoadTimeEvent()
      Reporter.sendShellLoadTimeEvent()
      atom.workspaceView.on 'editor:attached', (event, editorView) ->
        Reporter.sendEditorAppView()

  serialize: ->
    sessionLength: Date.now() - @sessionStart
