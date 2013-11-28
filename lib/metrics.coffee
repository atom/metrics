Reporter = require './reporter'

module.exports =
  activate: ({sessionLength}) ->
    @showMetricsDialog() unless atom.config.set('metrics.sendData')?

    if atom.config.get('metrics.sendData')
      @sessionStart = Date.now()
      Reporter.sendDeactivateEvent(sessionLength) if sessionLength
      Reporter.sendActivateEvent()

  serialize: ->
    sessionLength: Date.now() - @sessionStart

  showMetricsDialog: ->
    result = atom.confirm
      message: "Send Data to GitHub"
      detailedMessage: "You can help us improve Atom by allowing us send information about how it's working and how you use it.\n\nThis information is for internal use only and will not be made public.",
      buttons: ["Sure", "No Thanks"]

    if result == 0
      atom.config.set('metrics.sendData', true)
    else
      atom.config.set('metrics.sendData', false)
