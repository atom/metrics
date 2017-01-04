/** @babel */

import $ from 'jquery'
import Reporter from '../lib/reporter'
import grim from 'grim'

describe("Metrics", () => {
  let workspaceElement = []
  beforeEach(() => {
    workspaceElement = atom.views.getView(atom.workspace)

    spyOn(Reporter, 'request')

    let storage = {}
    spyOn(localStorage, 'setItem').andCallFake((key, value) => storage[key] = value)
    spyOn(localStorage, 'getItem').andCallFake(key => storage[key])

    Reporter.commandCount = undefined
    return spyOn(Reporter, 'consented').andReturn(true)
  })

  afterEach(() => atom.packages.deactivatePackage('metrics'))

  it("reports events", () => {
    waitsForPromise(() => atom.packages.activatePackage('metrics'))

    waitsFor(() => Reporter.request.callCount === 2)

    runs(() => {
      Reporter.request.reset()
      return atom.packages.deactivatePackage('metrics')
    })

    waitsForPromise(() => atom.packages.activatePackage('metrics'))

    waitsFor(() => Reporter.request.callCount === 3)

    return runs(() => {
      let url = Reporter.request.calls[0].args[0]
      return expect(url).toBeDefined()
    })
  })

  it("reports over SSL",() => {
    waitsForPromise(() => atom.packages.activatePackage('metrics'))

    waitsFor(() => Reporter.request.callCount > 0)

    return runs(function() {
      let url = Reporter.request.mostRecentCall.args[0]
      return expect(url).toMatch('^https:\/\/ssl.google-analytics.com\/collect\?')
    })
  })

  it("reports actual processor architecture",() => {
    let expectedArch = process.env.PROCESSOR_ARCHITECTURE === 'AMD64' ? 'x64' : process.arch

    waitsForPromise(() => atom.packages.activatePackage('metrics'))

    waitsFor(() => Reporter.request.callCount > 0)

    return runs(function() {
      let url = Reporter.request.mostRecentCall.args[0]
      return expect(url).toContain(`cd2=${expectedArch}`)
    })
  })

  it("specifies anonymization",() => {
    waitsForPromise(() => atom.packages.activatePackage('metrics'))

    waitsFor(() => Reporter.request.callCount > 0)

    return runs(function() {
      let url = Reporter.request.mostRecentCall.args[0]
      return expect(url).toContain('&aip=1&')
    })
  })

  it("specifies screen resolution",() => {
    waitsForPromise(() => atom.packages.activatePackage('metrics'))

    waitsFor(() => Reporter.request.callCount > 0)

    return runs(function() {
      let url = Reporter.request.mostRecentCall.args[0]
      return expect(url).toContain(`&sr=${screen.width}x${screen.height}&`)
    })
  })

  it("specifies window resolution",() => {
    waitsForPromise(() => atom.packages.activatePackage('metrics'))

    waitsFor(() => Reporter.request.callCount > 0)

    return runs(function() {
      let url = Reporter.request.mostRecentCall.args[0]
      return expect(url).toContain(`&vp=${innerWidth}x${innerHeight}&`)
    })
  })

  it("specifies heap usage in MB and %",() => {
    spyOn(process, 'memoryUsage').andReturn({heapTotal: 234567890, heapUsed: 123456789})

    waitsForPromise(() => atom.packages.activatePackage('metrics'))

    waitsFor(() => Reporter.request.callCount > 0)

    return runs(function() {
      let url = Reporter.request.mostRecentCall.args[0]
      expect(url).toContain("&cm1=117&")
      return expect(url).toContain("&cm2=53&")
    })
  })

  describe("reporting release channel",() => {
    beforeEach(() => localStorage.setItem('metrics.userId', 'a'))

    it("reports the dev release channel",() => {
      spyOn(atom, 'getVersion').andReturn('1.0.2-dev-dedbeef')
      waitsForPromise(() => atom.packages.activatePackage('metrics'))

      waitsFor(() => Reporter.request.callCount > 0)

      return runs(function() {
        let url = Reporter.request.mostRecentCall.args[0]
        return expect(url).toContain("aiid=dev")
      })
    })

    it("reports the beta release channel",() => {
      spyOn(atom, 'getVersion').andReturn('1.0.2-beta1')
      waitsForPromise(() => atom.packages.activatePackage('metrics'))

      waitsFor(() => Reporter.request.callCount > 0)

      return runs(function() {
        let url = Reporter.request.mostRecentCall.args[0]
        return expect(url).toContain("aiid=beta")
      })
    })

    return it("reports the stable release channel",() => {
      spyOn(atom, 'getVersion').andReturn('1.0.2')
      waitsForPromise(() => atom.packages.activatePackage('metrics'))

      waitsFor(() => Reporter.request.callCount > 0)

      return runs(function() {
        let url = Reporter.request.mostRecentCall.args[0]
        return expect(url).toContain("aiid=stable")
      })
    })
  })

  describe("reporting commands",() => {
    describe("when the user is NOT chosen to send commands",() => {
      beforeEach(function() {
        localStorage.setItem('metrics.userId', 'a')

        waitsForPromise(() => atom.packages.activatePackage('metrics'))

        waitsFor(() => Reporter.request.callCount > 0)

        return runs(function() {
          let Metrics = atom.packages.getLoadedPackage('metrics').mainModule
          return Metrics.shouldIncludePanesAndCommands = false
        })
      })

      return it("does not watch for commands",() => {
        let command = 'some-package:a-command'

        atom.commands.dispatch(workspaceElement, command, null)
        return expect(Reporter.commandCount).toBeUndefined()
      })
    })

    return describe("when the user is chosen to send commands",() => {
      beforeEach(function() {
        localStorage.setItem('metrics.userId', 'd')

        waitsForPromise(() => atom.packages.activatePackage('metrics'))

        return runs(function() {
          let Metrics = atom.packages.getLoadedPackage('metrics').mainModule
          return Metrics.shouldIncludePanesAndCommands = true
        })
      })

      it("reports commands dispatched via atom.commands",() => {
        let command = 'some-package:a-command'

        atom.commands.dispatch(workspaceElement, command, null)
        expect(Reporter.commandCount[command]).toBe(1)

        let url = Reporter.request.mostRecentCall.args[0]
        expect(url).toContain("ec=command")
        expect(url).toContain("ea=some-package")
        expect(url).toContain("el=some-package%3Aa-command")
        expect(url).toContain("ev=1")

        atom.commands.dispatch(workspaceElement, command, null)
        expect(Reporter.commandCount[command]).toBe(2)

        url = Reporter.request.mostRecentCall.args[0]
        return expect(url).toContain("ev=2")
      })

      it("does not report editor: and core: commands",() => {
        Reporter.request.reset()
        atom.commands.dispatch(workspaceElement, 'core:move-up', null)
        expect(Reporter.request).not.toHaveBeenCalled()

        atom.commands.dispatch(workspaceElement, 'editor:move-to-end-of-line', null)
        return expect(Reporter.request).not.toHaveBeenCalled()
      })

      it("does not report non-namespaced commands",() => {
        Reporter.request.reset()
        atom.commands.dispatch(workspaceElement, 'dragover', null)
        return expect(Reporter.request).not.toHaveBeenCalled()
      })

      it("does not report vim-mode:* movement commands",() => {
        Reporter.request.reset()
        atom.commands.dispatch(workspaceElement, 'vim-mode:move-up', null)
        atom.commands.dispatch(workspaceElement, 'vim-mode:move-down', null)
        atom.commands.dispatch(workspaceElement, 'vim-mode:move-left', null)
        atom.commands.dispatch(workspaceElement, 'vim-mode:move-right', null)
        return expect(Reporter.request).not.toHaveBeenCalled()
      })

      return it("does not report commands triggered via jquery",() => {
        Reporter.request.reset()
        $(workspaceElement).trigger('some-package:a-command')
        return expect(Reporter.request).not.toHaveBeenCalled()
      })
    })
  })

  describe("reporting exceptions",() => {
    beforeEach(function() {
      spyOn(atom, 'openDevTools').andReturn(Promise.resolve())
      spyOn(atom, 'executeJavaScriptInDevTools')
      waitsForPromise(() => atom.packages.activatePackage('metrics'))

      return waitsFor(() => Reporter.request.callCount > 0)
    })

    it("reports an exception with the correct type",() => {
      let message = "Uncaught TypeError: Cannot call method 'getScreenRow' of undefined"
      window.onerror(message, 'abc', 2, 3, {ok: true})

      let url = Reporter.request.mostRecentCall.args[0]
      expect(url).toContain("t=exception")
      return expect(url).toContain("exd=TypeError")
    })

    describe("when the message has no clear type", () =>
      it("reports an exception with the correct type",() => {
        let message = ""
        window.onerror(message, 2, 3, {ok: true})

        let url = Reporter.request.mostRecentCall.args[0]
        expect(url).toContain("t=exception")
        return expect(url).toContain("exd=Unknown")
      })
    )

    return describe("when there are paths in the exception",() => {
      it("strips unix paths surrounded in quotes",() => {
        let message = "Error: ENOENT, unlink '/Users/someguy/path/file.js'"
        window.onerror(message, 2, 3, {ok: true})
        let url = Reporter.request.mostRecentCall.args[0]
        return expect(decodeURIComponent(url)).toContain("exd=Error: ENOENT, unlink <path>")
      })

      it("strips unix paths without quotes",() => {
        let message = "Uncaught Error: spawn /Users/someguy.omg/path/file-09238_ABC-Final-Final.js ENOENT"
        window.onerror(message, 2, 3, {ok: true})
        let url = Reporter.request.mostRecentCall.args[0]
        return expect(decodeURIComponent(url)).toContain("exd=Error: spawn <path> ENOENT")
      })

      it("strips windows paths without quotes",() => {
        let message = "Uncaught Error: spawn c:\\someguy.omg\\path\\file-09238_ABC-Fin%%$#()al-Final.js ENOENT"
        window.onerror(message, 2, 3, {ok: true})
        let url = Reporter.request.mostRecentCall.args[0]
        return expect(decodeURIComponent(url)).toContain("exd=Error: spawn <path> ENOENT")
      })

      return it("strips windows paths surrounded in quotes",() => {
        let message = "Uncaught Error: EACCES 'c:\\someguy.omg\\path\\file-09238_ABC-Fin%%$#()al-Final.js'"
        window.onerror(message, 2, 3, {ok: true})
        let url = Reporter.request.mostRecentCall.args[0]
        return expect(decodeURIComponent(url)).toContain("exd=Error: EACCES <path>")
      })
    })
  })

  describe("reporting deprecations",() => {
    beforeEach(function() {
      waitsForPromise(() => atom.packages.activatePackage('metrics'))

      return waitsFor(() => Reporter.request.callCount > 0)
    })

    it("reports a deprecation with metadata specified",() => {
      Reporter.request.reset()
      jasmine.snapshotDeprecations()
      grim.deprecate('bad things are bad', {packageName: 'somepackage'})
      jasmine.restoreDeprecationsSnapshot()

      waitsFor(() => Reporter.request.callCount > 0)

      return runs(function() {
        let url = Reporter.request.mostRecentCall.args[0]
        expect(url).toContain("t=event")
        expect(url).toContain("ec=deprecation")
        expect(url).toContain("ea=somepackage%40unknown")
        return expect(url).toContain("el=bad%20things%20are%20bad")
      })
    })

    return it("reports a deprecation without metadata specified",() => {
      Reporter.request.reset()
      jasmine.snapshotDeprecations()

      let stack = [
        {
          fileName: '/Applications/Atom.app/pathwatcher.js',
          functionName: 'foo',
          location: '/Applications/Atom.app/pathwatcher.js:10:5'
        },
        {
          fileName: '/Users/me/.atom/packages/metrics/lib/metrics.js',
          functionName: 'bar',
          location: '/Users/me/.atom/packages/metrics/lib/metrics.js:161:5'
        }
      ]
      let deprecation = {
        message: "bad things are bad",
        stacks: [stack]
      }
      grim.addSerializedDeprecation(deprecation)

      spyOn(atom.packages.getLoadedPackage('metrics').mainModule, 'getPackagePathsByPackageName').andReturn({
        metrics: '/Users/me/.atom/packages/metrics'})

      jasmine.restoreDeprecationsSnapshot()

      waitsFor(() => Reporter.request.callCount > 0)

      return runs(function() {
        let url = Reporter.request.mostRecentCall.args[0]
        expect(url).toContain("t=event")
        expect(url).toContain("ec=deprecation")
        expect(url).toMatch("ea=metrics%40[0-9]+\.[0-9]+\.[0-9]+")
        return expect(url).toContain("el=bad%20things%20are%20bad")
      })
    })
  })

  describe("reporting pane items",() => {
    describe("when the user is NOT chosen to send events",() => {
      beforeEach(function() {
        localStorage.setItem('metrics.userId', 'a')
        localStorage.setItem('metrics.panesAndCommands', false)
        spyOn(Reporter, 'sendPaneItem')

        waitsForPromise(() => atom.packages.activatePackage('metrics'))

        return waitsFor(() => Reporter.request.callCount > 0)
      })

      return it("will not report pane items",() => {
        waitsForPromise(() => atom.workspace.open('file1.txt'))

        return runs(() => expect(Reporter.sendPaneItem.callCount).toBe(0))
      })
    })

    return describe("when the user IS chosen to send events",() => {
      beforeEach(function() {
        localStorage.setItem('metrics.userId', 'd')
        localStorage.setItem('metrics.panesAndCommands', true)
        spyOn(Reporter, 'sendPaneItem')

        waitsForPromise(() => atom.packages.activatePackage('metrics'))

        return waitsFor(() => Reporter.request.callCount > 0)
      })

      return it("will report pane items",() => {
        waitsForPromise(() => atom.workspace.open('file1.txt'))

        return runs(() => expect(Reporter.sendPaneItem.callCount).toBe(1))
      })
    })
  })

  describe("when deactivated", () =>
    it("stops reporting pane items",() => {
      localStorage.setItem('metrics.userId', 'd')
      spyOn(Reporter, 'sendPaneItem')

      waitsForPromise(() => atom.packages.activatePackage('metrics'))

      waitsFor(function() {
        let Metrics = atom.packages.getLoadedPackage('metrics').mainModule
        Metrics.shouldIncludePanesAndCommands = true
        return Reporter.request.callCount > 0
      })

      waitsForPromise(() => atom.workspace.open('file1.txt'))

      waitsFor(() => Reporter.request.callCount > 0)

      runs(function() {
        Reporter.sendPaneItem.reset()
        return atom.packages.deactivatePackage('metrics')
      })

      waitsForPromise(() => atom.workspace.open('file2.txt'))

      return runs(() => expect(Reporter.sendPaneItem.callCount).toBe(0))
    })
  )

  return describe("the metrics-reporter service",() => {
    let reporterService = null
    beforeEach(function() {
      waitsForPromise(() =>
        atom.packages.activatePackage('metrics').then(pack => reporterService = pack.mainModule.provideReporter())
      )

      waitsFor(() => Reporter.request.callCount > 0)

      return runs(() => Reporter.request.reset())
    })

    describe("::sendEvent", () =>
      it("makes a request",() => {
        reporterService.sendEvent('cat', 'action', 'label')
        return expect(Reporter.request).toHaveBeenCalled()
      })
    )

    describe("::sendTiming", () =>
      it("makes a request",() => {
        reporterService.sendEvent('cat', 'name')
        return expect(Reporter.request).toHaveBeenCalled()
      })
    )

    return describe("::sendException", () =>
      it("makes a request",() => {
        reporterService.sendException('desc')
        return expect(Reporter.request).toHaveBeenCalled()
      })
    )
  })
})
