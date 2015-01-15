$ = require 'jquery'
Reporter = require '../lib/reporter'

describe "Metrics", ->
  [metrics, workspaceElement] = []
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
      [requestArgs] = Reporter.request.calls[0].args
      expect(requestArgs.type).toBe 'POST'
      expect(requestArgs.url).toBeDefined()

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

      [requestArgs] = Reporter.request.mostRecentCall.args
      expect(requestArgs.url).toContain "ec=command"
      expect(requestArgs.url).toContain "ea=some-package"
      expect(requestArgs.url).toContain "el=some-package%3Aa-command"
      expect(requestArgs.url).toContain "ev=1"

      atom.commands.dispatch(workspaceElement, command, null)
      expect(Reporter.commandCount[command]).toBe 2

      [requestArgs] = Reporter.request.mostRecentCall.args
      expect(requestArgs.url).toContain "ev=2"

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

      [requestArgs] = Reporter.request.mostRecentCall.args
      expect(requestArgs.url).toContain "t=exception"
      expect(requestArgs.url).toContain "exd=TypeError"

    describe "when the message has no clear type", ->
      it "reports an exception with the correct type", ->
        message = ""
        window.onerror(message, 2, 3, {ok: true})

        [requestArgs] = Reporter.request.mostRecentCall.args
        expect(requestArgs.url).toContain "t=exception"
        expect(requestArgs.url).toContain "exd=Unknown"

    describe "when there are paths in the exception", ->
      it "strips unix paths surrounded in quotes", ->
        message = "Error: ENOENT, unlink '/Users/someguy/path/file.js'"
        window.onerror(message, 2, 3, {ok: true})
        [requestArgs] = Reporter.request.mostRecentCall.args
        expect(decodeURIComponent(requestArgs.url)).toContain "exd=Error: ENOENT, unlink <path>"

      it "strips unix paths without quotes", ->
        message = "Uncaught Error: spawn /Users/someguy.omg/path/file-09238_ABC-Final-Final.js ENOENT"
        window.onerror(message, 2, 3, {ok: true})
        [requestArgs] = Reporter.request.mostRecentCall.args
        expect(decodeURIComponent(requestArgs.url)).toContain "exd=Error: spawn <path> ENOENT"

      it "strips windows paths without quotes", ->
        message = "Uncaught Error: spawn c:\\someguy.omg\\path\\file-09238_ABC-Fin%%$#()al-Final.js ENOENT"
        window.onerror(message, 2, 3, {ok: true})
        [requestArgs] = Reporter.request.mostRecentCall.args
        expect(decodeURIComponent(requestArgs.url)).toContain "exd=Error: spawn <path> ENOENT"

      it "strips windows paths surrounded in quotes", ->
        message = "Uncaught Error: EACCES 'c:\\someguy.omg\\path\\file-09238_ABC-Fin%%$#()al-Final.js'"
        window.onerror(message, 2, 3, {ok: true})
        [requestArgs] = Reporter.request.mostRecentCall.args
        expect(decodeURIComponent(requestArgs.url)).toContain "exd=Error: EACCES <path>"

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
