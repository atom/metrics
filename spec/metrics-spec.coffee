$ = require 'jquery'
Reporter = require '../lib/reporter'
grim = require 'grim'

describe "Metrics", ->
  [workspaceElement] = []
  beforeEach ->
    workspaceElement = atom.views.getView(atom.workspace)

    spyOn(Reporter, 'request')

    storage = {}
    spyOn(localStorage, 'setItem').andCallFake (key, value) ->
      storage[key] = value
    spyOn(localStorage, 'getItem').andCallFake (key) ->
      storage[key]

    Reporter.commandCount = undefined

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
      [url] = Reporter.request.calls[0].args
      expect(url).toBeDefined()

  describe "sending commands", ->
    beforeEach ->
      waitsForPromise ->
        atom.packages.activatePackage('metrics')

      waitsFor ->
        Reporter.request.callCount > 0

    it "reports commands dispatched via atom.commands", ->
      command = 'some-package:a-command'

      atom.commands.dispatch(workspaceElement, command, null)
      expect(Reporter.commandCount[command]).toBe 1

      [url] = Reporter.request.mostRecentCall.args
      expect(url).toContain "ec=command"
      expect(url).toContain "ea=some-package"
      expect(url).toContain "el=some-package%3Aa-command"
      expect(url).toContain "ev=1"

      atom.commands.dispatch(workspaceElement, command, null)
      expect(Reporter.commandCount[command]).toBe 2

      [url] = Reporter.request.mostRecentCall.args
      expect(url).toContain "ev=2"

    it "does not report editor: and core: commands", ->
      Reporter.request.reset()
      atom.commands.dispatch(workspaceElement, 'core:move-up', null)
      expect(Reporter.request).not.toHaveBeenCalled()

      atom.commands.dispatch(workspaceElement, 'editor:move-to-end-of-line', null)
      expect(Reporter.request).not.toHaveBeenCalled()

    it "does not report non-namespaced commands", ->
      Reporter.request.reset()
      atom.commands.dispatch(workspaceElement, 'dragover', null)
      expect(Reporter.request).not.toHaveBeenCalled()

    it "does not report vim-mode:* movement commands", ->
      Reporter.request.reset()
      atom.commands.dispatch(workspaceElement, 'vim-mode:move-up', null)
      atom.commands.dispatch(workspaceElement, 'vim-mode:move-down', null)
      atom.commands.dispatch(workspaceElement, 'vim-mode:move-left', null)
      atom.commands.dispatch(workspaceElement, 'vim-mode:move-right', null)
      expect(Reporter.request).not.toHaveBeenCalled()

    it "does not report commands triggered via jquery", ->
      Reporter.request.reset()
      $(workspaceElement).trigger('some-package:a-command')
      expect(Reporter.request).not.toHaveBeenCalled()

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
      window.onerror(message, 'abc', 2, 3, {ok: true})

      [url] = Reporter.request.mostRecentCall.args
      expect(url).toContain "t=exception"
      expect(url).toContain "exd=TypeError"

    describe "when the message has no clear type", ->
      it "reports an exception with the correct type", ->
        message = ""
        window.onerror(message, 2, 3, {ok: true})

        [url] = Reporter.request.mostRecentCall.args
        expect(url).toContain "t=exception"
        expect(url).toContain "exd=Unknown"

    describe "when there are paths in the exception", ->
      it "strips unix paths surrounded in quotes", ->
        message = "Error: ENOENT, unlink '/Users/someguy/path/file.js'"
        window.onerror(message, 2, 3, {ok: true})
        [url] = Reporter.request.mostRecentCall.args
        expect(decodeURIComponent(url)).toContain "exd=Error: ENOENT, unlink <path>"

      it "strips unix paths without quotes", ->
        message = "Uncaught Error: spawn /Users/someguy.omg/path/file-09238_ABC-Final-Final.js ENOENT"
        window.onerror(message, 2, 3, {ok: true})
        [url] = Reporter.request.mostRecentCall.args
        expect(decodeURIComponent(url)).toContain "exd=Error: spawn <path> ENOENT"

      it "strips windows paths without quotes", ->
        message = "Uncaught Error: spawn c:\\someguy.omg\\path\\file-09238_ABC-Fin%%$#()al-Final.js ENOENT"
        window.onerror(message, 2, 3, {ok: true})
        [url] = Reporter.request.mostRecentCall.args
        expect(decodeURIComponent(url)).toContain "exd=Error: spawn <path> ENOENT"

      it "strips windows paths surrounded in quotes", ->
        message = "Uncaught Error: EACCES 'c:\\someguy.omg\\path\\file-09238_ABC-Fin%%$#()al-Final.js'"
        window.onerror(message, 2, 3, {ok: true})
        [url] = Reporter.request.mostRecentCall.args
        expect(decodeURIComponent(url)).toContain "exd=Error: EACCES <path>"

  describe "reporting deprecations", ->
    beforeEach ->
      waitsForPromise ->
        atom.packages.activatePackage('metrics')

      waitsFor ->
        Reporter.request.callCount > 0

    it "reports a deprecation with metadata specified", ->
      Reporter.request.reset()
      jasmine.snapshotDeprecations()
      grim.deprecate('bad things are bad', packageName: 'somepackage')
      jasmine.restoreDeprecationsSnapshot()

      waitsFor ->
        Reporter.request.callCount > 0

      runs ->
        [url] = Reporter.request.mostRecentCall.args
        expect(url).toContain "t=event"
        expect(url).toContain "ec=deprecation"
        expect(url).toContain "ea=somepackage"
        expect(url).toContain "el=unknown"

    it "reports a deprecation without metadata specified", ->
      Reporter.request.reset()
      jasmine.snapshotDeprecations()
      anotherLineInTheStack = -> grim.deprecate('bad things are bad')
      anotherLineInTheStack()
      jasmine.restoreDeprecationsSnapshot()

      waitsFor ->
        Reporter.request.callCount > 0

      runs ->
        [url] = Reporter.request.mostRecentCall.args
        expect(url).toContain "t=event"
        expect(url).toContain "ec=deprecation"
        expect(url).toContain "ea=metrics"
        expect(url).toMatch "el=[0-9]+\.[0-9]+\.[0-9]+"

    it "does not report when deprecation has no package name specified", ->
      Reporter.request.reset()
      jasmine.snapshotDeprecations()
      grim.deprecate('bad things are bad', packageName: null)
      jasmine.restoreDeprecationsSnapshot()
      callCount = Reporter.request.callCount

      waits 1

      runs ->
        expect(Reporter.request.callCount).toBe callCount

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

  describe "the metrics-reporter service", ->
    reporterService = null
    beforeEach ->
      waitsForPromise ->
        atom.packages.activatePackage('metrics').then (pack) ->
          reporterService = pack.mainModule.provideReporter()

      waitsFor ->
        Reporter.request.callCount > 0

      runs ->
        Reporter.request.reset()

    describe "::sendEvent", ->
      it "makes a request", ->
        reporterService.sendEvent('cat', 'action', 'label')
        expect(Reporter.request).toHaveBeenCalled()

    describe "::sendTiming", ->
      it "makes a request", ->
        reporterService.sendEvent('cat', 'name')
        expect(Reporter.request).toHaveBeenCalled()

    describe "::sendException", ->
      it "makes a request", ->
        reporterService.sendException('desc')
        expect(Reporter.request).toHaveBeenCalled()
