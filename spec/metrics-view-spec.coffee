MetricsView = require '../lib/metrics-view'
RootView = require 'root-view'

# This spec is focused because it starts with an `f`. Remove the `f`
# to unfocus the spec.
#
# Press meta-alt-ctrl-s to run the specs
fdescribe "MetricsView", ->
  metrics = null

  beforeEach ->
    window.rootView = new RootView
    metrics = atom.activatePackage('metrics', immediate: true)

  describe "when the metrics:toggle event is triggered", ->
    it "attaches and then detaches the view", ->
      expect(rootView.find('.metrics')).not.toExist()
      rootView.trigger 'metrics:toggle'
      expect(rootView.find('.metrics')).toExist()
      rootView.trigger 'metrics:toggle'
      expect(rootView.find('.metrics')).not.toExist()
