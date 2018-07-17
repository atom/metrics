/** @babel */

import {it, fit, ffit, fffit, beforeEach, afterEach, conditionPromise} from './helpers/async-spec-helpers' // eslint-disable-line no-unused-vars
import Reporter from '../lib/reporter'
import fs from 'fs-plus'
import grim from 'grim'
import path from 'path'
import temp from 'temp'

temp.track()

const telemetry = require('telemetry-github')

const store = new telemetry.StatsStore('atom', '1.2.3', true)

describe('Metrics', () => {
  let workspaceElement = []

  const assertCommandNotReported = (commandName, additionalArgs) => {
    Reporter.request.reset()

    atom.commands.dispatch(workspaceElement, commandName, additionalArgs)
    expect(Reporter.request).not.toHaveBeenCalled()
    expect(Reporter.addCustomEvent).not.toHaveBeenCalled()
  }

  const eventReportedPromise = ({category, action, value}) => {
    const googleAnalyticsPromise = conditionPromise(() => {
      return Reporter.request.calls.find((call) => {
        const url = call.args[0]
        return url.includes('t=event') &&
          url.includes(`ec=${category}`) &&
          url.includes(`ea=${action}`) &&
          (url.includes(`ev=${value}`) || value == null)
      })
    })

    const telemetryPromise = conditionPromise(() => {
      return Reporter.addCustomEvent.calls.find((call) => {
        const eventType = call.args[0]
        const eventObject = call.args[1]
        return eventType === category &&
          eventObject.t === 'event' &&
          eventObject.ea === action &&
          eventObject.ev === value
      })
    })

    return Promise.all([googleAnalyticsPromise, telemetryPromise])
  }

  beforeEach(() => {
    workspaceElement = atom.views.getView(atom.workspace)

    spyOn(Reporter, 'request')
    spyOn(Reporter, 'addCustomEvent').andCallThrough()
    spyOn(Reporter, 'getStore').andCallFake(() => store)

    let storage = {}
    spyOn(global.localStorage, 'setItem').andCallFake((key, value) => { storage[key] = value })
    spyOn(global.localStorage, 'getItem').andCallFake(key => storage[key])

    Reporter.commandCount = undefined
    spyOn(Reporter, 'consented').andReturn(true)
  })

  afterEach(async () => {
    atom.packages.deactivatePackage('metrics')
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

  describe('event metadata', async () => {
    beforeEach(() => {
      spyOn(store, 'addTiming')
    })
    const assertMetadataSent = async (expectedName, expectedValue) => {
      await atom.packages.activatePackage('metrics')

      await conditionPromise(() => Reporter.request.callCount > 0)
      const url = Reporter.request.mostRecentCall.args[0]
      expect(url).toContain(`${expectedName}=${expectedValue}`)

      await conditionPromise(() => Reporter.addCustomEvent.callCount > 0)
      let metadata = Reporter.addCustomEvent.mostRecentCall.args[1]
      expect(metadata[expectedName]).toEqual(expectedValue)

      await conditionPromise(() => store.addTiming.callCount > 0)
      metadata = store.addTiming.mostRecentCall.args[2]
      expect(metadata[expectedName]).toEqual(expectedValue)
    }
    it('reports actual processor architecture', async () => {
      const expectedArch = process.env.PROCESSOR_ARCHITEW6432 === 'AMD64' ? 'x64' : process.arch
      await assertMetadataSent('cd2', expectedArch)
    })

    it('specifies anonymization', async () => {
      // it appears that aip is a value that only needs to be sent
      // to Google Analytics, so no need to use the assertMetadataSent helper here.
      await atom.packages.activatePackage('metrics')
      await conditionPromise(() => Reporter.request.callCount > 0)

      let url = Reporter.request.mostRecentCall.args[0]
      expect(url).toContain('&aip=1&')
    })

    it('specifies screen resolution', async () => {
      const expectedScreenResolution = `${window.screen.width}x${window.screen.height}`
      await assertMetadataSent('sr', expectedScreenResolution)
    })

    it('specifies window resolution', async () => {
      const expectedWindowResolution = `${window.innerWidth}x${window.innerHeight}`
      await assertMetadataSent('vp', expectedWindowResolution)
    })

    it('specifies heap usage in MB and %', async () => {
      spyOn(process, 'memoryUsage').andReturn({heapTotal: 234567890, heapUsed: 123456789})

      const heapUsedInMb = 117
      const heapUsedPercentage = 53
      await assertMetadataSent('cm1', heapUsedInMb)
      await assertMetadataSent('cm2', heapUsedPercentage)
    })
  })

  describe('reporting release channel', async () => {
    beforeEach(() => global.localStorage.setItem('metrics.userId', 'a'))

    it('reports the dev release channel', async () => {
      spyOn(atom, 'getVersion').andReturn('1.0.2-dev-dedbeef')

      await atom.packages.activatePackage('metrics')
      await conditionPromise(() => Reporter.request.callCount > 0)

      let url = Reporter.request.mostRecentCall.args[0]
      expect(url).toContain('aiid=dev')
      let event = Reporter.addCustomEvent.mostRecentCall.args[1]
      expect(event.aiid).toEqual('dev')
    })

    it('reports the beta release channel', async () => {
      spyOn(atom, 'getVersion').andReturn('1.0.2-beta1')

      await atom.packages.activatePackage('metrics')
      await conditionPromise(() => Reporter.request.callCount > 0)

      let url = Reporter.request.mostRecentCall.args[0]
      expect(url).toContain('aiid=beta')
      let event = Reporter.addCustomEvent.mostRecentCall.args[1]
      expect(event.aiid).toEqual('beta')
    })

    it('reports the stable release channel', async () => {
      spyOn(atom, 'getVersion').andReturn('1.0.2')

      await atom.packages.activatePackage('metrics')
      await conditionPromise(() => Reporter.request.callCount > 0)

      let url = Reporter.request.mostRecentCall.args[0]
      expect(url).toContain('aiid=stable')
      let event = Reporter.addCustomEvent.mostRecentCall.args[1]
      expect(event.aiid).toEqual('stable')
    })

    it('reports the nightly release channel', async () => {
      spyOn(atom, 'getVersion').andReturn('1.0.2-nightly55')

      await atom.packages.activatePackage('metrics')
      await conditionPromise(() => Reporter.request.callCount > 0)

      let url = Reporter.request.mostRecentCall.args[0]
      expect(url).toContain('aiid=nightly')
      let event = Reporter.addCustomEvent.mostRecentCall.args[1]
      expect(event.aiid).toEqual('nightly')
    })

    it('reports an arbitrary release channel', async () => {
      spyOn(atom, 'getVersion').andReturn('1.0.2-sushi1')

      await atom.packages.activatePackage('metrics')
      await conditionPromise(() => Reporter.request.callCount > 0)

      let url = Reporter.request.mostRecentCall.args[0]
      expect(url).toContain('aiid=sushi')
      let event = Reporter.addCustomEvent.mostRecentCall.args[1]
      expect(event.aiid).toEqual('sushi')
    })

    it('reports an unrecognized release channel', async () => {
      spyOn(atom, 'getVersion').andReturn('wat.0.2')

      await atom.packages.activatePackage('metrics')
      await conditionPromise(() => Reporter.request.callCount > 0)

      let url = Reporter.request.mostRecentCall.args[0]
      expect(url).toContain('aiid=unrecognized')
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
        expect(args[0]).toEqual('command')
        let event = args[1]
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
        expect(Reporter.addCustomEvent.mostRecentCall.args[1].ev).toEqual(2)
      })

      it('does not report editor: and core: commands', () => {
        assertCommandNotReported('core:move-up')
        assertCommandNotReported('editor:move-to-end-of-line')
      })

      it('does not report non-namespaced commands', () => {
        assertCommandNotReported('dragover')
      })

      it('does not report vim-mode:* movement commands', () => {
        assertCommandNotReported('vim-mode:move-up')
        assertCommandNotReported('vim-mode:move-down')
        assertCommandNotReported('vim-mode:move-left')
        assertCommandNotReported('vim-mode:move-right')
      })

      it('does not report commands triggered via jquery', () => {
        assertCommandNotReported('some-package:a-command', {jQueryTrigger: 'trigger'})
      })
    })
  })

  describe('reporting timings', async () => {
    it('reports timing metrics', async () => {
      spyOn(Reporter, 'addTiming')
      spyOn(Reporter, 'sendTiming').andCallThrough()
      await atom.packages.activatePackage('metrics')
      const expectedLoadTime = atom.getWindowLoadTime()

      const sendTimingArgs = Reporter.sendTiming.mostRecentCall.args
      expect(sendTimingArgs[0]).toEqual('core')
      expect(sendTimingArgs[1]).toEqual('load')
      expect(sendTimingArgs[2]).toEqual(expectedLoadTime)

      const addTimingArgs = Reporter.addTiming.mostRecentCall.args
      expect(addTimingArgs[0]).toEqual('load')
      expect(addTimingArgs[1]).toEqual(expectedLoadTime)
      expect(addTimingArgs[2]).toEqual({category: 'core'})
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
        let message = "Error: ENOENT, unlink '/Users/someuser/path/file.js'"
        window.onerror(message, 2, 3, {ok: true})
        let url = Reporter.request.mostRecentCall.args[0]
        expect(decodeURIComponent(url)).toContain('exd=Error: ENOENT, unlink <path>')
      })

      it('strips unix paths without quotes', () => {
        let message = 'Uncaught Error: spawn /Users/someuser.omg/path/file-09238_ABC-Final-Final.js ENOENT'
        window.onerror(message, 2, 3, {ok: true})
        let url = Reporter.request.mostRecentCall.args[0]
        expect(decodeURIComponent(url)).toContain('exd=Error: spawn <path> ENOENT')
      })

      it('strips windows paths without quotes', () => {
        let message = 'Uncaught Error: spawn c:\\someuser.omg\\path\\file-09238_ABC-Fin%%$#()al-Final.js ENOENT'
        window.onerror(message, 2, 3, {ok: true})
        let url = Reporter.request.mostRecentCall.args[0]
        expect(decodeURIComponent(url)).toContain('exd=Error: spawn <path> ENOENT')
      })

      it('strips windows paths surrounded in quotes', () => {
        let message = "Uncaught Error: EACCES 'c:\\someuser.omg\\path\\file-09238_ABC-Fin%%$#()al-Final.js'"
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
      expect(args[0]).toEqual('deprecation-v3')

      const eventObject = args[1]
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
        Reporter.sendEvent.reset()
        await atom.packages.emitter.emit('did-add-pane')

        expect(Reporter.sendPaneItem.callCount).toBe(0)
        expect(Reporter.sendEvent.callCount).toBe(0)
        expect(Reporter.addCustomEvent.callCount).toBe(0)
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

  describe('reporting activation of optional packages', () => {
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

        await eventReportedPromise({
          'category': 'package',
          'action': 'numberOptionalPackagesActivatedAtStartup',
          'value': 1
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

        await eventReportedPromise({
          'category': 'package',
          'action': 'numberOptionalPackagesActivatedAtStartup',
          'value': 0
        })
      })
    })
  })

  describe('reporting presence of user-defined key bindings', () => {
    describe('when user-defined key bindings are present', () => {
      it('reports the number of user-defined key bindings loaded at startup', async () => {
        await atom.packages.activatePackage('metrics')

        // Manually trigger the keymap loading that Atom performs at startup.
        // (We don't want to weigh down this test with running through the
        // entire Atom startup process.)
        const keymapFixturePath = path.join(__dirname, 'fixtures', 'keymaps', 'custom-keymap.cson')
        spyOn(atom.keymaps, 'getUserKeymapPath').andReturn(keymapFixturePath)
        atom.keymaps.loadUserKeymap()

        await eventReportedPromise({
          'category': 'key-binding',
          'action': 'numberUserDefinedKeyBindingsLoadedAtStartup',
          'value': 3
        })
      })

      afterEach(() => {
        atom.keymaps.destroy()
      })
    })

    describe('when no user-defined key bindings are present', () => {
      it('reports that zero user-defined key bindings were loaded', async () => {
        await atom.packages.activatePackage('metrics')

        // Manually trigger the keymap loading that Atom performs at startup.
        // (We don't want to weigh down this test with running through the
        // entire Atom startup process.)
        const keymapFixturePath = path.join(__dirname, 'fixtures', 'keymaps', 'default-keymap.cson')
        spyOn(atom.keymaps, 'getUserKeymapPath').andReturn(keymapFixturePath)
        atom.keymaps.loadUserKeymap()

        await eventReportedPromise({
          'category': 'key-binding',
          'action': 'numberUserDefinedKeyBindingsLoadedAtStartup',
          'value': 0
        })
      })

      afterEach(() => {
        atom.keymaps.destroy()
      })
    })
  })

  describe('reporting customization of user init script', () => {
    it('reports event when init script changes', async () => {
      const tempDir = fs.realpathSync(temp.mkdirSync())
      const userInitScriptPath = path.join(tempDir, 'init.js')
      fs.writeFileSync(userInitScriptPath, '')

      spyOn(atom, 'getUserInitScriptPath').andReturn(userInitScriptPath)

      await atom.packages.activatePackage('metrics')

      const editor = await atom.workspace.open(userInitScriptPath)
      editor.setText("console.log('hello world')")
      editor.save()

      await eventReportedPromise({
        'category': 'customization',
        'action': 'userInitScriptChanged'
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
        const args = ['yass queen!', { woo: 'hoo' }]
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

    describe('::addTiming', () =>
      it('sends timing to StatsStore', () => {
        spyOn(store, 'addTiming')
        const eventType = 'appStart'
        const timingInMilliseconds = 42
        const metadata = {glitter: 'beard'}
        const args = [eventType, timingInMilliseconds, metadata]
        reporterService.addTiming(eventType, timingInMilliseconds, metadata)
        expect(store.addTiming).toHaveBeenCalledWith(...args)
      })
    )

    describe('::sendTiming', () =>
      it('makes a request', () => {
        reporterService.sendEvent('cat', 'name')
        expect(Reporter.request).toHaveBeenCalled()
      })
    )

    describe('::setGitHubUser', () =>
      it('sets the gitHubUser', () => {
        spyOn(store, 'setGitHubUser')
        const gitHubUser = 'beyonce'
        reporterService.setGitHubUser(gitHubUser)
        expect(store.setGitHubUser).toHaveBeenCalledWith(gitHubUser)
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
