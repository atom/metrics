{WorkspaceView} = require 'atom'
Reporter = require '../lib/reporter'

describe "Metrics", ->
  beforeEach ->
    atom.workspaceView = new WorkspaceView

  it "reports start event", ->
    spyOn(Reporter, 'request')
    atom.packages.activatePackage('metrics')

    waitsFor ->
      Reporter.request.callCount is 2

    runs ->
      requestArgs = Reporter.request.calls[0].args[0]
      expect(requestArgs.method).toBe 'POST'
      expect(requestArgs.qs).toBeDefined()

  it "reports end event", ->
    spyOn(Reporter, 'request')
    atom.packages.activatePackage('metrics')

    waitsFor ->
      Reporter.request.callCount is 2

    runs ->
      Reporter.request.reset()
      atom.packages.deactivatePackage('metrics')
      atom.packages.activatePackage('metrics')

    waitsFor ->
      Reporter.request.callCount is 3

    runs ->
      [requestArgs] = Reporter.request.calls[0].args
      expect(requestArgs.method).toBe 'POST'
      expect(requestArgs.qs).toBeDefined()
