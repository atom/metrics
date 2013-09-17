metrics = require '../lib/metrics'

describe "Metrics", ->
  describe "upon loading", ->
    beforeEach ->
      spyOn(metrics.reporter, 'send')
      metrics.activate()

    it "reports a page view", ->
      expect(metrics.reporter.send).toHaveBeenCalled()
      expect(metrics.reporter.send.calls[0].args[0]).toEqual 'activate'
      expect(metrics.reporter.send.calls[0].args[1]).toEqual metrics.collector.getData()

  describe "upon unloading", ->
    beforeEach ->
      spyOn(metrics.reporter, 'send')
      metrics.deactivate()

    it "reports a page view", ->
      expect(metrics.reporter.send).toHaveBeenCalled()
      expect(metrics.reporter.send.calls[0].args[0]).toEqual 'deactivate'
      expect(metrics.reporter.send.calls[0].args[1]).toEqual metrics.collector.getData()
