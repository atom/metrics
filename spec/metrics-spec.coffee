Reporter = require '../lib/reporter'

describe "Metrics", ->
  describe "when metrics are enabled", ->
    beforeEach ->
      atom.config.set('metrics.sendData', true)

    it "reports activation events", ->
      spyOn(Reporter, 'request')
      atom.packages.activatePackage('metrics')

      waitsFor ->
        Reporter.request.callCount is 1

      runs ->
        requestArgs = Reporter.request.calls[0].args[0]
        expect(requestArgs.method).toBe 'POST'
        expect(requestArgs.qs).toBeDefined()

    it "reports deactivation events", ->
      spyOn(Reporter, 'request')
      atom.packages.activatePackage('metrics')

      waitsFor ->
        Reporter.request.callCount is 1

      runs ->
        Reporter.request.reset()
        atom.packages.deactivatePackage('metrics')
        atom.packages.activatePackage('metrics')

      waitsFor ->
        Reporter.request.callCount is 2

      runs ->
        [requestArgs] = Reporter.request.calls[0].args
        expect(requestArgs.method).toBe 'POST'
        expect(requestArgs.qs).toBeDefined()

  describe "when metrics are disabled", ->
    beforeEach ->
      atom.config.set('metrics.sendData', false)

    it "reports activation events", ->
      spyOn(Reporter, 'request')
      atom.packages.activatePackage('metrics')
      expect(Reporter.request).not.toHaveBeenCalled()

    it "reports deactivation events", ->
      atom.packages.activatePackage('metrics')
      spyOn(Reporter, 'request')
      atom.packages.deactivatePackage('metrics')
      atom.packages.activatePackage('metrics')
      expect(Reporter.request.callCount).toBe 0
