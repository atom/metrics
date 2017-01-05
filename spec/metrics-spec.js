/** @babel */

import {it, fit, ffit, fffit, beforeEach, afterEach, conditionPromise} from './helpers/async-spec-helpers'
import $ from 'jquery'
import Reporter from '../lib/reporter'
import grim from 'grim'

describe("Metrics", async () => {
  let workspaceElement = []
  beforeEach(() => {
    workspaceElement = atom.views.getView(atom.workspace)

    spyOn(Reporter, 'request')

    let storage = {}
    spyOn(localStorage, 'setItem').andCallFake((key, value) => storage[key] = value)
    spyOn(localStorage, 'getItem').andCallFake(key => storage[key])

    Reporter.commandCount = undefined
    spyOn(Reporter, 'consented').andReturn(true)
  })

  afterEach(async () => await atom.packages.deactivatePackage('metrics'))

  it("reports events", async () => {
    await atom.packages.activatePackage('metrics')
    await conditionPromise(() => Reporter.request.callCount === 2)

    Reporter.request.reset()
    await atom.packages.deactivatePackage('metrics')
    await atom.packages.activatePackage('metrics')
    await conditionPromise(() => Reporter.request.callCount === 3)

    let url = Reporter.request.calls[0].args[0]
    expect(url).toBeDefined()
  })

  it("reports over SSL", async () => {
    await atom.packages.activatePackage('metrics')
    await conditionPromise(() => Reporter.request.callCount > 0)

    let url = Reporter.request.mostRecentCall.args[0]
    expect(url).toMatch('^https:\/\/ssl.google-analytics.com\/collect\?')
  })

  it("reports actual processor architecture", async () => {
    let expectedArch = process.env.PROCESSOR_ARCHITECTURE === 'AMD64' ? 'x64' : process.arch

    await atom.packages.activatePackage('metrics')
    await conditionPromise(() => Reporter.request.callCount > 0)

    let url = Reporter.request.mostRecentCall.args[0]
    expect(url).toContain(`cd2=${expectedArch}`)
  })

  it("specifies anonymization", async () => {
    await atom.packages.activatePackage('metrics')
    await conditionPromise(() => Reporter.request.callCount > 0)

    let url = Reporter.request.mostRecentCall.args[0]
    expect(url).toContain('&aip=1&')
  })

  it("specifies screen resolution", async () => {
    await atom.packages.activatePackage('metrics')
    await conditionPromise(() => Reporter.request.callCount > 0)

    let url = Reporter.request.mostRecentCall.args[0]
    expect(url).toContain(`&sr=${screen.width}x${screen.height}&`)
  })

  it("specifies window resolution", async () => {
    await atom.packages.activatePackage('metrics')
    await conditionPromise(() => Reporter.request.callCount > 0)

    let url = Reporter.request.mostRecentCall.args[0]
    expect(url).toContain(`&vp=${innerWidth}x${innerHeight}&`)
  })

  it("specifies heap usage in MB and %", async () => {
    spyOn(process, 'memoryUsage').andReturn({heapTotal: 234567890, heapUsed: 123456789})

    await atom.packages.activatePackage('metrics')
    await conditionPromise(() => Reporter.request.callCount > 0)

    let url = Reporter.request.mostRecentCall.args[0]
    expect(url).toContain("&cm1=117&")
    expect(url).toContain("&cm2=53&")
  })

  describe("reporting release channel", async () => {
    beforeEach(() => localStorage.setItem('metrics.userId', 'a'))

    it("reports the dev release channel", async () => {
      spyOn(atom, 'getVersion').andReturn('1.0.2-dev-dedbeef')

      await atom.packages.activatePackage('metrics')
      await conditionPromise(() => Reporter.request.callCount > 0)

      let url = Reporter.request.mostRecentCall.args[0]
      expect(url).toContain("aiid=dev")
    })

    it("reports the beta release channel", async () => {
      spyOn(atom, 'getVersion').andReturn('1.0.2-beta1')

      await atom.packages.activatePackage('metrics')
      await conditionPromise(() => Reporter.request.callCount > 0)

      let url = Reporter.request.mostRecentCall.args[0]
      expect(url).toContain("aiid=beta")
    })

    it("reports the stable release channel", async () => {
      spyOn(atom, 'getVersion').andReturn('1.0.2')

      await atom.packages.activatePackage('metrics')
      await conditionPromise(() => Reporter.request.callCount > 0)

      let url = Reporter.request.mostRecentCall.args[0]
      expect(url).toContain("aiid=stable")
    })
  })

  describe("reporting commands", async () => {
    describe("when the user is NOT chosen to send commands", async () => {
      beforeEach(async () => {
        localStorage.setItem('metrics.userId', 'a')
        await atom.packages.activatePackage('metrics')
        await conditionPromise(() => Reporter.request.callCount > 0)

        let Metrics = atom.packages.getLoadedPackage('metrics').mainModule
        Metrics.shouldIncludePanesAndCommands = false
      })

      it("does not watch for commands", async () => {
        let command = 'some-package:a-command'

        atom.commands.dispatch(workspaceElement, command, null)
        expect(Reporter.commandCount).toBeUndefined()
      })
    })

    describe("when the user is chosen to send commands", async () => {
      beforeEach(async () => {
        localStorage.setItem('metrics.userId', 'd')

        await atom.packages.activatePackage('metrics')

        let Metrics = atom.packages.getLoadedPackage('metrics').mainModule
        Metrics.shouldIncludePanesAndCommands = true
      })

      it("reports commands dispatched via atom.commands", () => {
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
        expect(url).toContain("ev=2")
      })

      it("does not report editor: and core: commands", () => {
        Reporter.request.reset()
        atom.commands.dispatch(workspaceElement, 'core:move-up', null)
        expect(Reporter.request).not.toHaveBeenCalled()

        atom.commands.dispatch(workspaceElement, 'editor:move-to-end-of-line', null)
        expect(Reporter.request).not.toHaveBeenCalled()
      })

      it("does not report non-namespaced commands", () => {
        Reporter.request.reset()
        atom.commands.dispatch(workspaceElement, 'dragover', null)
        expect(Reporter.request).not.toHaveBeenCalled()
      })

      it("does not report vim-mode:* movement commands", () => {
        Reporter.request.reset()
        atom.commands.dispatch(workspaceElement, 'vim-mode:move-up', null)
        atom.commands.dispatch(workspaceElement, 'vim-mode:move-down', null)
        atom.commands.dispatch(workspaceElement, 'vim-mode:move-left', null)
        atom.commands.dispatch(workspaceElement, 'vim-mode:move-right', null)
        expect(Reporter.request).not.toHaveBeenCalled()
      })

      it("does not report commands triggered via jquery", () => {
        Reporter.request.reset()
        $(workspaceElement).trigger('some-package:a-command')
        expect(Reporter.request).not.toHaveBeenCalled()
      })
    })
  })

  describe("reporting exceptions", async () => {
    beforeEach(async () => {
      spyOn(atom, 'openDevTools').andReturn(Promise.resolve())
      spyOn(atom, 'executeJavaScriptInDevTools')
      await atom.packages.activatePackage('metrics')
      await conditionPromise(() => Reporter.request.callCount > 0)
    })

    it("reports an exception with the correct type", () => {
      let message = "Uncaught TypeError: Cannot call method 'getScreenRow' of undefined"
      window.onerror(message, 'abc', 2, 3, {ok: true})

      let url = Reporter.request.mostRecentCall.args[0]
      expect(url).toContain("t=exception")
      expect(url).toContain("exd=TypeError")
    })

    describe("when the message has no clear type", () =>
      it("reports an exception with the correct type", () => {
        let message = ""
        window.onerror(message, 2, 3, {ok: true})

        let url = Reporter.request.mostRecentCall.args[0]
        expect(url).toContain("t=exception")
        expect(url).toContain("exd=Unknown")
      })
    )

    describe("when there are paths in the exception", () => {
      it("strips unix paths surrounded in quotes", () => {
        let message = "Error: ENOENT, unlink '/Users/someguy/path/file.js'"
        window.onerror(message, 2, 3, {ok: true})
        let url = Reporter.request.mostRecentCall.args[0]
        expect(decodeURIComponent(url)).toContain("exd=Error: ENOENT, unlink <path>")
      })

      it("strips unix paths without quotes", () => {
        let message = "Uncaught Error: spawn /Users/someguy.omg/path/file-09238_ABC-Final-Final.js ENOENT"
        window.onerror(message, 2, 3, {ok: true})
        let url = Reporter.request.mostRecentCall.args[0]
        expect(decodeURIComponent(url)).toContain("exd=Error: spawn <path> ENOENT")
      })

      it("strips windows paths without quotes", () => {
        let message = "Uncaught Error: spawn c:\\someguy.omg\\path\\file-09238_ABC-Fin%%$#()al-Final.js ENOENT"
        window.onerror(message, 2, 3, {ok: true})
        let url = Reporter.request.mostRecentCall.args[0]
        expect(decodeURIComponent(url)).toContain("exd=Error: spawn <path> ENOENT")
      })

      it("strips windows paths surrounded in quotes", () => {
        let message = "Uncaught Error: EACCES 'c:\\someguy.omg\\path\\file-09238_ABC-Fin%%$#()al-Final.js'"
        window.onerror(message, 2, 3, {ok: true})
        let url = Reporter.request.mostRecentCall.args[0]
        expect(decodeURIComponent(url)).toContain("exd=Error: EACCES <path>")
      })
    })
  })

  describe("reporting deprecations", async () => {
    beforeEach(async () => {
      await atom.packages.activatePackage('metrics')
      await conditionPromise(() => Reporter.request.callCount > 0)
    })

    it("reports a deprecation with metadata specified", async () => {
      Reporter.request.reset()
      jasmine.snapshotDeprecations()
      grim.deprecate('bad things are bad', {packageName: 'somepackage'})
      jasmine.restoreDeprecationsSnapshot()

      await conditionPromise(() => Reporter.request.callCount > 0)

      let url = Reporter.request.mostRecentCall.args[0]
      expect(url).toContain("t=event")
      expect(url).toContain("ec=deprecation")
      expect(url).toContain("ea=somepackage%40unknown")
      expect(url).toContain("el=bad%20things%20are%20bad")
    })

    it("reports a deprecation without metadata specified", async () => {
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

      await conditionPromise(() => Reporter.request.callCount > 0)

      let url = Reporter.request.mostRecentCall.args[0]
      expect(url).toContain("t=event")
      expect(url).toContain("ec=deprecation")
      expect(url).toMatch("ea=metrics%40[0-9]+\.[0-9]+\.[0-9]+")
      expect(url).toContain("el=bad%20things%20are%20bad")
    })
  })

  describe("reporting pane items", async () => {
    describe("when the user is NOT chosen to send events", async () => {
      beforeEach(async () => {
        localStorage.setItem('metrics.userId', 'a')
        localStorage.setItem('metrics.panesAndCommands', false)
        spyOn(Reporter, 'sendPaneItem')

        await atom.packages.activatePackage('metrics')

        await conditionPromise(() => Reporter.request.callCount > 0)
      })

      it("will not report pane items", async () => {
        await atom.workspace.open('file1.txt')

        expect(Reporter.sendPaneItem.callCount).toBe(0)
      })
    })

    describe("when the user IS chosen to send events", async () => {
      beforeEach(async () => {
        localStorage.setItem('metrics.userId', 'd')
        localStorage.setItem('metrics.panesAndCommands', true)
        spyOn(Reporter, 'sendPaneItem')

        await atom.packages.activatePackage('metrics')
        await conditionPromise(() => Reporter.request.callCount > 0)
      })

      it("will report pane items", async () => {
        await atom.workspace.open('file1.txt')

        expect(Reporter.sendPaneItem.callCount).toBe(1)
      })
    })
  })

  describe("when deactivated", async () =>
    it("stops reporting pane items", async () => {
      localStorage.setItem('metrics.userId', 'd')
      spyOn(Reporter, 'sendPaneItem')

      await atom.packages.activatePackage('metrics')

      let Metrics = atom.packages.getLoadedPackage('metrics').mainModule
      Metrics.shouldIncludePanesAndCommands = true
      await conditionPromise(() => Reporter.request.callCount > 0)

      await atom.workspace.open('file1.txt')
      await conditionPromise(() => Reporter.request.callCount > 0)

      Reporter.sendPaneItem.reset()
      await atom.packages.deactivatePackage('metrics')
      await atom.workspace.open('file2.txt')

      expect(Reporter.sendPaneItem.callCount).toBe(0)
    })
  )

  describe("the metrics-reporter service", async () => {
    let reporterService = null
    beforeEach(async () => {
      await atom.packages.activatePackage('metrics').then(pack => reporterService = pack.mainModule.provideReporter())
      await conditionPromise(() => Reporter.request.callCount > 0)
      Reporter.request.reset()
    })

    describe("::sendEvent", () =>
      it("makes a request", () => {
        reporterService.sendEvent('cat', 'action', 'label')
        expect(Reporter.request).toHaveBeenCalled()
      })
    )

    describe("::sendTiming", () =>
      it("makes a request", () => {
        reporterService.sendEvent('cat', 'name')
        expect(Reporter.request).toHaveBeenCalled()
      })
    )

    describe("::sendException", () =>
      it("makes a request", () => {
        reporterService.sendException('desc')
        expect(Reporter.request).toHaveBeenCalled()
      })
    )
  })
})
