Guid = require 'guid'
Reporter = require './reporter'

module.exports =
  activate: ({sessionLength}) ->
    atom.config.set('metrics.userId', Guid.raw()) unless atom.config.get('metrics.userId')
    @sessionStart = Date.now()

    Reporter.sendEvent('ended', sessionLength) if sessionLength
    Reporter.sendEvent('started')
    Reporter.sendTiming('core-load', atom.getWindowLoadTime())
    Reporter.sendTiming('shell-load', atom.getLoadSettings().shellLoadTime)
    atom.workspaceView.on 'editor:attached', (event, editorView) ->
      Reporter.sendView('EditorView')

  serialize: ->
    sessionLength: Date.now() - @sessionStart
