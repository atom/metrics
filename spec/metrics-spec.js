/** @babel */

import {it, fit, ffit, fffit, beforeEach, afterEach, conditionPromise} from './helpers/async-spec-helpers' // eslint-disable-line no-unused-vars
import Reporter from '../lib/reporter'
import store from '../lib/store'
import grim from 'grim'
import path from 'path'

describe('Metrics', async () => {
  let workspaceElement = []
  const assertNotCalledHelper = (commandName, additionalArgs) => {
    Reporter.request.reset()

    atom.commands.dispatch(workspaceElement, commandName, additionalArgs)
    expect(Reporter.request).not.toHaveBeenCalled()
    expect(Reporter.addCustomEvent).not.toHaveBeenCalled()
  }
  beforeEach(() => {
    workspaceElement = atom.views.getView(atom.workspace)

    spyOn(Reporter, 'request')
    spyOn(Reporter, 'addCustomEvent').andCallThrough()

    let storage = {}
    spyOn(global.localStorage, 'setItem').andCallFake((key, value) => { storage[key] = value })
    spyOn(global.localStorage, 'getItem').andCallFake(key => storage[key])

    Reporter.commandCount = undefined
    spyOn(Reporter, 'consented').andReturn(true)
  })

  afterEach(async () => {
    atom.packages.deactivatePackage('metrics')
    Reporter.addCustomEvent.reset()
  })

  it('reports consent opt-out changes', async () => {
    await atom.packages.activatePackage('metrics')
    spyOn(store, 'setOptOut')
    spyOn(Reporter, 'sendEvent')
    await atom.config.set('core.telemetryConsent', 'no')
    expect(Reporter.sendEvent.mostRecentCall.args).toEqual(['setting', 'core.telemetryConsent', 'no'])
    expect(store.setOptOut.mostRecentCall.args[0]).toEqual(true)
  })

  it('reports consent opt-in changes', async () => {
    await atom.packages.activatePackage('metrics')
    spyOn(store, 'setOptOut')
    spyOn(Reporter, 'sendEvent')
    await atom.config.set('core.telemetryConsent', 'limited')

    expect(Reporter.sendEvent.mostRecentCall.args).toEqual(['setting', 'core.telemetryConsent', 'limited'])
    expect(store.setOptOut.mostRecentCall.args[0]).toEqual(false)
  })

  it('reports events', async () => {
    jasmine.useRealClock()
    await atom.packages.activatePackage('metrics')
    await conditionPromise(() => Reporter.request.callCount === 2)

    Reporter.request.reset()
    await atom.packages.deactivatePackage('metrics')
    await atom.packages.activatePackage('metrics')
    await conditionPromise(() => Reporter.request.callCount === 3)

    let url = Reporter.request.calls[0].args[0]
    expect(url).toBeDefined()
  })

  it('reports over SSL', async () => {
    await atom.packages.activatePackage('metrics')
    await conditionPromise(() => Reporter.request.callCount > 0)

    let url = Reporter.request.mostRecentCall.args[0]
    expect(url).toMatch(/^https:\/\/ssl.google-analytics.com\/collect\?/)
  })

  it('reports actual processor architecture', async () => {
    let expectedArch = process.env.PROCESSOR_ARCHITEW6432 === 'AMD64' ? 'x64' : process.arch

    await atom.packages.activatePackage('metrics')
    await conditionPromise(() => Reporter.request.callCount > 0)

    let url = Reporter.request.mostRecentCall.args[0]
    expect(url).toContain(`cd2=${expectedArch}`)
  })

  it('specifies anonymization', async () => {
    await atom.packages.activatePackage('metrics')
    await conditionPromise(() => Reporter.request.callCount > 0)

    let url = Reporter.request.mostRecentCall.args[0]
    expect(url).toContain('&aip=1&')
  })

  it('specifies screen resolution', async () => {
    await atom.packages.activatePackage('metrics')
    await conditionPromise(() => Reporter.request.callCount > 0)

    let url = Reporter.request.mostRecentCall.args[0]
    expect(url).toContain(`&sr=${window.screen.width}x${window.screen.height}&`)
  })

  it('specifies window resolution', async () => {
    await atom.packages.activatePackage('metrics')
    await conditionPromise(() => Reporter.request.callCount > 0)

    let url = Reporter.request.mostRecentCall.args[0]
    expect(url).toContain(`&vp=${window.innerWidth}x${window.innerHeight}&`)
  })

  it('specifies heap usage in MB and %', async () => {
    spyOn(process, 'memoryUsage').andReturn({heapTotal: 234567890, heapUsed: 123456789})

    await atom.packages.activatePackage('metrics')
    await conditionPromise(() => Reporter.request.callCount > 0)

    let url = Reporter.request.mostRecentCall.args[0]
    expect(url).toContain('&cm1=117&')
    expect(url).toContain('&cm2=53&')
  })

  describe('reporting release channel', async () => {
    beforeEach(() => global.localStorage.setItem('metrics.userId', 'a'))

    it('reports the dev release channel', async () => {
      spyOn(atom, 'getVersion').andReturn('1.0.2-dev-dedbeef')

      await atom.packages.activatePackage('metrics')
      await conditionPromise(() => Reporter.request.callCount > 0)

      let url = Reporter.request.mostRecentCall.args[0]
      expect(url).toContain('aiid=dev')
    })

    it('reports the beta release channel', async () => {
      spyOn(atom, 'getVersion').andReturn('1.0.2-beta1')

      await atom.packages.activatePackage('metrics')
      await conditionPromise(() => Reporter.request.callCount > 0)

      let url = Reporter.request.mostRecentCall.args[0]
      expect(url).toContain('aiid=beta')
    })

    it('reports the stable release channel', async () => {
      spyOn(atom, 'getVersion').andReturn('1.0.2')

      await atom.packages.activatePackage('metrics')
      await conditionPromise(() => Reporter.request.callCount > 0)

      let url = Reporter.request.mostRecentCall.args[0]
      expect(url).toContain('aiid=stable')
    })
  })

  describe('reporting commands', async () => {
    describe('when shouldIncludePanesAndCommands is false', async () => {
      beforeEach(async () => {
        global.localStorage.setItem('metrics.userId', 'a')
        await atom.packages.activatePackage('metrics')
        await conditionPromise(() => Reporter.request.callCount > 0)

        const {mainModule} = atom.packages.getLoadedPackage('metrics')
        mainModule.shouldIncludePanesAndCommands = false
      })

      it('does not watch for commands', async () => {
        let command = 'some-package:a-command'

        atom.commands.dispatch(workspaceElement, command, null)
        expect(Reporter.commandCount).toBeUndefined()
      })
    })

    describe('when shouldIncludePanesAndCommands is true', async () => {
      beforeEach(async () => {
        global.localStorage.setItem('metrics.userId', 'd')
        await atom.packages.activatePackage('metrics')

        const {mainModule} = atom.packages.getLoadedPackage('metrics')
        mainModule.shouldIncludePanesAndCommands = true
        Reporter.addCustomEvent.reset()
      })

      it('reports commands dispatched via atom.commands', () => {
        let command = 'some-package:a-command'

        atom.commands.dispatch(workspaceElement, command, null)
        expect(Reporter.commandCount[command]).toBe(1)

        const args = Reporter.addCustomEvent.mostRecentCall.args
        expect(args[1]).toEqual('command')
        let event = args[0]
        expect(event.t).toEqual('event')
        expect(event.ec).toEqual('command')
        expect(event.ea).toEqual('some-package')
        expect(event.el).toEqual('some-package:a-command')

        let url = Reporter.request.mostRecentCall.args[0]
        expect(url).toContain('ec=command')
        expect(url).toContain('ea=some-package')
        expect(url).toContain('el=some-package%3Aa-command')
        expect(url).toContain('ev=1')

        atom.commands.dispatch(workspaceElement, command, null)
        expect(Reporter.commandCount[command]).toBe(2)

        url = Reporter.request.mostRecentCall.args[0]
        expect(url).toContain('ev=2')
        expect(Reporter.addCustomEvent.mostRecentCall.args[0].ev).toEqual(2)
      })

      it('does not report editor: and core: commands', () => {
        assertNotCalledHelper('core:move-up')
        assertNotCalledHelper('editor:move-to-end-of-line')
      })

      it('does not report non-namespaced commands', () => {
        assertNotCalledHelper('dragover')
      })

      it('does not report vim-mode:* movement commands', () => {
        assertNotCalledHelper('vim-mode:move-up')
        assertNotCalledHelper('vim-mode:move-down')
        assertNotCalledHelper('vim-mode:move-left')
        assertNotCalledHelper('vim-mode:move-right')
      })

      it('does not report commands triggered via jquery', () => {
        assertNotCalledHelper('some-package:a-command', {jQueryTrigger: 'trigger'})
      })
    })
  })

  describe('reporting exceptions', async () => {
    beforeEach(async () => {
      spyOn(atom, 'openDevTools').andReturn(Promise.resolve())
      spyOn(atom, 'executeJavaScriptInDevTools')
      await atom.packages.activatePackage('metrics')
      await conditionPromise(() => Reporter.request.callCount > 0)
    })

    it('reports an exception with the correct type', () => {
      let message = "Uncaught TypeError: Cannot call method 'getScreenRow' of undefined"
      window.onerror(message, 'abc', 2, 3, {ok: true})

      let url = Reporter.request.mostRecentCall.args[0]
      expect(url).toContain('t=exception')
      expect(url).toContain('exd=TypeError')
    })

    describe('when the message has no clear type', () =>
      it('reports an exception with the correct type', () => {
        let message = ''
        window.onerror(message, 2, 3, {ok: true})

        let url = Reporter.request.mostRecentCall.args[0]
        expect(url).toContain('t=exception')
        expect(url).toContain('exd=Unknown')
      })
    )

    describe('when there are paths in the exception', () => {
      it('strips unix paths surrounded in quotes', () => {
        let message = "Error: ENOENT, unlink '/Users/someguy/path/file.js'"
        window.onerror(message, 2, 3, {ok: true})
        let url = Reporter.request.mostRecentCall.args[0]
        expect(decodeURIComponent(url)).toContain('exd=Error: ENOENT, unlink <path>')
      })

      it('strips unix paths without quotes', () => {
        let message = 'Uncaught Error: spawn /Users/someguy.omg/path/file-09238_ABC-Final-Final.js ENOENT'
        window.onerror(message, 2, 3, {ok: true})
        let url = Reporter.request.mostRecentCall.args[0]
        expect(decodeURIComponent(url)).toContain('exd=Error: spawn <path> ENOENT')
      })

      it('strips windows paths without quotes', () => {
        let message = 'Uncaught Error: spawn c:\\someguy.omg\\path\\file-09238_ABC-Fin%%$#()al-Final.js ENOENT'
        window.onerror(message, 2, 3, {ok: true})
        let url = Reporter.request.mostRecentCall.args[0]
        expect(decodeURIComponent(url)).toContain('exd=Error: spawn <path> ENOENT')
      })

      it('strips windows paths surrounded in quotes', () => {
        let message = "Uncaught Error: EACCES 'c:\\someguy.omg\\path\\file-09238_ABC-Fin%%$#()al-Final.js'"
        window.onerror(message, 2, 3, {ok: true})
        let url = Reporter.request.mostRecentCall.args[0]
        expect(decodeURIComponent(url)).toContain('exd=Error: EACCES <path>')
      })
    })
  })

  describe('reporting deprecations', async () => {
    beforeEach(async () => {
      await atom.packages.activatePackage('metrics')
      await conditionPromise(() => Reporter.request.callCount > 0)
    })

    it('reports a deprecation with metadata specified', async () => {
      Reporter.request.reset()
      jasmine.snapshotDeprecations()
      const deprecationMessage = 'bad things are bad'
      grim.deprecate(deprecationMessage, {packageName: 'somepackage'})
      jasmine.restoreDeprecationsSnapshot()

      await conditionPromise(() => Reporter.request.callCount > 0)

      let url = Reporter.request.mostRecentCall.args[0]
      expect(url).toContain('t=event')
      expect(url).toContain('ec=deprecation')
      expect(url).toContain('ea=somepackage%40unknown')
      expect(url).toContain('el=bad%20things%20are%20bad')

      await conditionPromise(() => Reporter.addCustomEvent.callCount > 0)
      const args = Reporter.addCustomEvent.mostRecentCall.args
      expect(args[1]).toEqual('deprecation-v3')

      const eventObject = args[0]
      expect(eventObject.t).toEqual('event')
      expect(eventObject.ec).toEqual('deprecation-v3')
      expect(eventObject.ea).toEqual('somepackage@unknown')
      expect(eventObject.el).toEqual(deprecationMessage)
    })

    it('reports a deprecation without metadata specified', async () => {
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
        message: 'bad things are bad',
        stacks: [stack]
      }
      grim.addSerializedDeprecation(deprecation)

      spyOn(atom.packages.getLoadedPackage('metrics').mainModule, 'getPackagePathsByPackageName').andReturn({
        metrics: '/Users/me/.atom/packages/metrics'})

      jasmine.restoreDeprecationsSnapshot()

      await conditionPromise(() => Reporter.request.callCount > 0)

      let url = Reporter.request.mostRecentCall.args[0]
      expect(url).toContain('t=event')
      expect(url).toContain('ec=deprecation')
      expect(url).toMatch(/ea=metrics%40[0-9]+\.[0-9]+\.[0-9]+/)
      expect(url).toContain('el=bad%20things%20are%20bad')
    })
  })

  describe('reporting pane items', async () => {
    describe('when shouldIncludePanesAndCommands is false', async () => {
      beforeEach(async () => {
        spyOn(Reporter, 'sendPaneItem')
        spyOn(Reporter, 'sendEvent')

        const {mainModule} = await atom.packages.activatePackage('metrics')

        mainModule.shouldIncludePanesAndCommands = false

        await conditionPromise(() => Reporter.request.callCount > 0)
      })

      it('will not report pane items', async () => {
        Reporter.addCustomEvent.reset()
        Reporter.sendEvent.reset()

        await atom.workspace.open('file1.txt')

        expect(Reporter.sendPaneItem.callCount).toBe(0)
        // the file open events are still getting published, because we are subscribed
        // to file open events separately in the begin method.
        // todo: figure out if we intend to send file events even when shouldIncludePanesAndCommands
        // is false, or if this is a bug.

        // expect(Reporter.sendEvent.callCount).toBe(0)
        // expect(Reporter.addCustomEvent.callCount).toBe(0)
      })
    })

    describe('when shouldIncludePanesAndCommands is true', async () => {
      beforeEach(async () => {
        const {mainModule} = await atom.packages.activatePackage('metrics')
        mainModule.shouldIncludePanesAndCommands = true

        await conditionPromise(() => Reporter.request.callCount > 0)
        await conditionPromise(() => Reporter.addCustomEvent.callCount > 0)
      })

      it('will report pane items', async () => {
        await atom.workspace.open('file1.txt')
        const paneItemCalls = Reporter.request.calls.filter((call) => {
          const url = call.args[0]
          return url.includes('t=appview') && url.includes('cd=TextEditor')
        })
        expect(paneItemCalls.length).toBe(1)
      })
    })
  })

  describe('reporting activation of optional packages', async () => {
    describe('when optional packages are present', () => {
      let originalPackageDirPaths = atom.packages.packageDirPaths

      beforeEach(() => {
        const packageFixturePath = path.join(__dirname, 'fixtures', 'packages')
        atom.packages.packageDirPaths.push(packageFixturePath)
      })

      it('reports the number of optional packages activated at startup', async () => {
        await atom.packages.activatePackage('metrics')
        expect(atom.packages.isBundledPackage('metrics')).toBe(true)

        await atom.packages.activatePackage('example')
        expect(atom.packages.isBundledPackage('example')).toBe(false)

        // Mimic the event that is emitted when Atom finishes loading all
        // packages at startup. (We don't want to weigh down this test with the
        // overhead of actually load _all_ packages.)
        atom.packages.emitter.emit('did-activate-initial-packages')

        await conditionPromise(() => {
          return Reporter.request.calls.find((call) => {
            const url = call.args[0]
            return url.includes('t=event') &&
              url.includes('ec=package') &&
              url.includes('ea=numberOptionalPackagesActivatedAtStartup') &&
              url.includes('ev=1')
          })
        })
        await conditionPromise(() => {
          return Reporter.addCustomEvent.calls.find((call) => {
            const eventObject = call.args[0]
            const eventName = call.args[1]
            return eventName === 'package' &&
             eventObject.t === 'event' &&
             eventObject.ea === 'numberOptionalPackagesActivatedAtStartup' &&
             eventObject.ev === 1
          })
        })
      })

      afterEach(() => {
        atom.packages.packageDirPaths = originalPackageDirPaths
      })
    })

    describe('when only bundled packages are present', () => {
      it('reports a quantity of zero when the user has no optional packages enabled', async () => {
        await atom.packages.activatePackage('metrics')
        expect(atom.packages.isBundledPackage('metrics')).toBe(true)

        // Mimic the event that is emitted when Atom finishes loading all
        // packages at startup. (We don't want to weigh down this test with the
        // overhead of actually load _all_ packages.)
        atom.packages.emitter.emit('did-activate-initial-packages')

        await conditionPromise(() => {
          return Reporter.request.calls.find((call) => {
            const url = call.args[0]
            return url.includes('t=event') &&
              url.includes('ec=package') &&
              url.includes('ea=numberOptionalPackagesActivatedAtStartup') &&
              url.includes('ev=0')
          })
        })
        await conditionPromise(() => {
          return Reporter.addCustomEvent.calls.find((call) => {
            const eventObject = call.args[0]
            const eventName = call.args[1]
            return eventName === 'package' &&
             eventObject.t === 'event' &&
             eventObject.ea === 'numberOptionalPackagesActivatedAtStartup' &&
             eventObject.ev === 0
          })
        })
      })
    })
  })

  describe('when deactivated', async () =>
    it('stops reporting pane items', async () => {
      global.localStorage.setItem('metrics.userId', 'd')
      spyOn(Reporter, 'sendPaneItem')

      const {mainModule} = await atom.packages.activatePackage('metrics')
      mainModule.shouldIncludePanesAndCommands = true
      await conditionPromise(() => Reporter.request.callCount > 0)

      await atom.workspace.open('file1.txt')
      await conditionPromise(() => Reporter.request.callCount > 0)

      Reporter.sendPaneItem.reset()
      await atom.packages.deactivatePackage('metrics')
      await atom.workspace.open('file2.txt')

      expect(Reporter.sendPaneItem.callCount).toBe(0)
    })
  )

  describe('the metrics-reporter service', async () => {
    let reporterService = null
    beforeEach(async () => {
      await atom.packages.activatePackage('metrics').then(pack => {
        reporterService = pack.mainModule.provideReporter()
      })

      await conditionPromise(() => Reporter.request.callCount > 0)
      Reporter.request.reset()
    })

    describe('::sendEvent', () =>
      it('makes a request', () => {
        reporterService.sendEvent('cat', 'action', 'label')
        expect(Reporter.request).toHaveBeenCalled()
      })
    )

    describe('::addCustomEvent', () =>
      it('adds a custom event', () => {
        spyOn(store, 'addCustomEvent')
        const args = [{ woo: 'hoo' }, 'yass queen!']
        reporterService.addCustomEvent(...args)
        expect(store.addCustomEvent).toHaveBeenCalledWith(...args)
      })
    )

    describe('::incrementCounter', () =>
      it('increments a counter', () => {
        spyOn(store, 'incrementCounter')
        const counterName = 'commits'
        reporterService.incrementCounter(counterName)
        expect(store.incrementCounter).toHaveBeenCalledWith(counterName)
      })
    )

    describe('::sendTiming', () =>
      it('makes a request', () => {
        reporterService.sendEvent('cat', 'name')
        expect(Reporter.request).toHaveBeenCalled()
      })
    )

    describe('::sendException', () =>
      it('makes a request', () => {
        reporterService.sendException('desc')
        expect(Reporter.request).toHaveBeenCalled()
      })
    )
  })
})
