{WorkspaceView} = require 'atom'
Reporter = require '../lib/reporter'

describe "Metrics", ->
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

  it "reports events", ->
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

  describe "reporting exceptions", ->
    beforeEach ->
      spyOn(atom, 'openDevTools')
      spyOn(atom, 'executeJavaScriptInDevTools')
      waitsForPromise ->
        atom.packages.activatePackage('metrics')

      waitsFor ->
        Reporter.request.callCount > 0

    it "reports an exception with the correct type", ->
      message = "Uncaught TypeError: Cannot call method 'getScreenRow' of undefined"
      window.onerror(message)

      [requestArgs] = Reporter.request.mostRecentCall.args
      expect(requestArgs.url).toContain "t=exception"
      expect(requestArgs.url).toContain "exd=TypeError"

    describe "when the message has no clear type", ->
      it "reports an exception with the correct type", ->
        message = ""
        window.onerror(message)

        [requestArgs] = Reporter.request.mostRecentCall.args
        expect(requestArgs.url).toContain "t=exception"
        expect(requestArgs.url).toContain "exd=Unknown"

  describe "start date", ->
    createStartDate = ->
      startDate = new Date
      year = startDate.getFullYear()
      month = startDate.getMonth() + 1
      date = startDate.getDate()
      zerofill = (value, zeros) ->
        (new Array(zeros + 1).join('0') + value).slice(-zeros)
      "#{year}#{zerofill(month, 2)}#{zerofill(date, 2)}"

    describe "when the user has no metrics data in any storage", ->
      it "generates a new start date", ->
        waitsForPromise ->
          atom.packages.activatePackage('metrics')

        waitsFor ->
          Reporter.request.callCount > 0

        runs ->
          [requestArgs] = Reporter.request.calls[0].args
          expect(requestArgs.url).toContain "cd1=#{createStartDate()}"

    describe "when start date is already in local storage", ->
      it "uses the start date from localStorage", ->
        localStorage.setItem('metrics.userId', 'omgthatguy')
        localStorage.setItem('metrics.sd', '20120201')

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
