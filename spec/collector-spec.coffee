_ = require 'underscore'
Collector = require '../lib/collector'

describe "Collector", ->
  subject = null
  beforeEach ->
    subject = new Collector

  describe "getData", ->
    it "creates a request with the proper options", ->
      data = subject.getData()
      keys = _.keys(data)

      expect(keys).toContain 'user_agent'
      expect(keys).toContain 'screen_resolution'
      expect(keys).toContain 'pixel_ratio'
      expect(keys).toContain 'browser_resolution'
      expect(keys).toContain 'window_path'
      expect(keys).toContain 'session_id'
      expect(keys).toContain 'actor_login'

      expect(keys).toContain 'packages'
      expect(data.packages).toEqual '[]'

      expect(keys).toContain 'themes'
      expect(data.packages).toEqual '[]'

    describe "with a package", ->
      beforeEach ->
        atom.loadPackage('metrics')
        atom.activatePackage('metrics')

      it "creates a request with package data", ->
        data = subject.getData()
        packages = JSON.parse(data.packages)
        expect(packages[0].name).toEqual 'metrics'
        expect(packages[0].loadTime).toBeDefined
        expect(packages[0].activateTime).toBeDefined
