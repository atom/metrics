{WorkspaceView} = require 'atom'
Reporter = require '../lib/reporter'

describe "Metrics", ->
  metrics = null
  beforeEach ->
    atom.workspaceView = new WorkspaceView
    spyOn(Reporter, 'request')

    storage = {}
    spyOn(localStorage, 'setItem').andCallFake (key, value) ->
      storage[key] = value
    spyOn(localStorage, 'getItem').andCallFake (key) ->
      storage[key]

  afterEach ->
    atom.packages.deactivatePackage('metrics')

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

  describe "start date", ->
    describe "metrics.getWeekNumber()", ->
      beforeEach ->
        waitsForPromise ->
          atom.packages.activatePackage('metrics')
        runs ->
          metrics = atom.packages.getActivePackage('metrics').mainModule

      it "generates week of the year number beginning in 2014", ->
        expect(metrics.getWeekNumber(new Date(2014, 0, 1))).toBe 1
        expect(metrics.getWeekNumber(new Date(2014, 3, 25))).toBe 17
        expect(metrics.getWeekNumber(new Date(2014, 11, 27))).toBe 52
        expect(metrics.getWeekNumber(new Date(2014, 11, 28))).toBe 101
        expect(metrics.getWeekNumber(new Date(2014, 11, 31))).toBe 101

        expect(metrics.getWeekNumber(new Date(2015, 0, 1))).toBe 101
        expect(metrics.getWeekNumber(new Date(2015, 0, 4))).toBe 102
        expect(metrics.getWeekNumber(new Date(2015, 11, 31))).toBe 201

        expect(metrics.getWeekNumber(new Date(2016, 0, 1))).toBe 201

    describe "when the user has no metrics data in any storage", ->
      it "generates a new start date", ->
        spyOn(metrics, 'getTodaysDate').andReturn(new Date(2014, 3, 25))

        waitsForPromise ->
          atom.packages.activatePackage('metrics')

        waitsFor ->
          Reporter.request.callCount > 0

        runs ->
          metrics = atom.packages.getActivePackage('metrics').mainModule
          [requestArgs] = Reporter.request.calls[0].args
          expect(requestArgs.url).toContain "cd1=20140425%2C017"

    describe "when start date is already in local storage", ->
      it "uses the start date from localStorage", ->
        localStorage.setItem('metrics.userId', 'omgthatguy')
        localStorage.setItem('metrics.sd', '20120201,5')

        waitsForPromise ->
          atom.packages.activatePackage('metrics')

        waitsFor ->
          Reporter.request.callCount > 0

        runs ->
          [requestArgs] = Reporter.request.calls[0].args
          expect(requestArgs.url).toContain "cid=omgthatguy"
          expect(requestArgs.url).toContain "cd1=20120201"

    describe "when a userId is in config and no start date is specified (users before Nov 2014)", ->
      beforeEach ->
        config = {}
        spyOn(atom.config, 'set').andCallFake (key, value) ->
          config[key] = value
        spyOn(atom.config, 'get').andCallFake (key) ->
          config[key]

      it "does not generate a start date", ->
        atom.config.set('metrics.userId', 'omgthatguy')

        waitsForPromise ->
          atom.packages.activatePackage('metrics')

        waitsFor ->
          Reporter.request.callCount > 0

        runs ->
          [requestArgs] = Reporter.request.calls[0].args
          expect(requestArgs.url).toContain "cid=omgthatguy"
          expect(requestArgs.url).not.toContain "cd1="

          expect(localStorage.getItem('metrics.userId')).toBe 'omgthatguy'
          expect(localStorage.getItem('metrics.sd')).toBeUndefined()

  it "reports event", ->
    waitsForPromise ->
      atom.packages.activatePackage('metrics')

    waitsFor ->
      Reporter.request.callCount is 2

  describe "when deactivated", ->
    it "stops reporting pane items", ->
      spyOn(Reporter, 'sendPaneItem')

      waitsForPromise ->
        atom.packages.activatePackage('metrics')

      waitsFor ->
        Reporter.request.callCount > 0

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
