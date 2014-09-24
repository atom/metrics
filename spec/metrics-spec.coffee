{WorkspaceView} = require 'atom'
Reporter = require '../lib/reporter'

describe "Metrics", ->
  beforeEach ->
    atom.workspaceView = new WorkspaceView
    spyOn(Reporter, 'request')

  it "reports event", ->
    waitsForPromise ->
      atom.packages.activatePackage('metrics')

    waitsFor ->
      Reporter.request.callCount is 2

    runs ->
      Reporter.request.reset()
      atom.packages.deactivatePackage('metrics')

    waitsForPromise ->
      atom.packages.activatePackage('metrics')

    waitsFor ->
      Reporter.request.callCount is 3

    runs ->
      [requestArgs] = Reporter.request.calls[0].args
      expect(requestArgs.type).toBe 'POST'
      expect(requestArgs.url).toBeDefined()

  describe "when deactivated", ->
    it "stops reporting pane items", ->
      spyOn(Reporter, 'sendPaneItem')

      waitsForPromise ->
        atom.packages.activatePackage('metrics')

      waitsForPromise ->
        atom.workspace.open('file1.txt')

      runs ->
        expect(Reporter.sendPaneItem.callCount).toBe 1
        Reporter.sendPaneItem.reset()
        atom.packages.deactivatePackage('metrics')

      waitsForPromise ->
        atom.workspace.open('file2.txt')

      runs ->
        expect(Reporter.sendPaneItem.callCount).toBe 0
