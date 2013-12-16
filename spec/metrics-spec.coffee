{WorkspaceView} = require 'atom'
Reporter = require '../lib/reporter'

describe "Metrics", ->
  beforeEach ->
    atom.workspaceView = new WorkspaceView

  it "reports event", ->
    spyOn(Reporter, 'request')
    atom.packages.activatePackage('metrics')

    waitsFor ->
      console.log Reporter.request.callCount
      Reporter.request.callCount is 3

    runs ->
      Reporter.request.reset()
      atom.packages.deactivatePackage('metrics')
      atom.packages.activatePackage('metrics')

    waitsFor ->
      console.log Reporter.request.callCount
      Reporter.request.callCount is 4

    runs ->
      [requestArgs] = Reporter.request.calls[0].args
      expect(requestArgs.method).toBe 'POST'
      expect(requestArgs.qs).toBeDefined()
