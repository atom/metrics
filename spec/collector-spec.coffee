{_} = require 'atom'
Collector = require '../lib/collector'

describe "Collector", ->
  subject = null
  beforeEach ->
    subject = new Collector

  describe "getDimensions", ->
    it "collects several basic attributes", ->
      dimensions = subject.getDimensions()
      keys = _.keys(dimensions)

      expect(keys).toContain 'user_agent'
      expect(keys).toContain 'screen_resolution'
      expect(keys).toContain 'pixel_ratio'
      expect(keys).toContain 'browser_resolution'
      expect(keys).toContain 'window_path'
      expect(keys).toContain 'session_id'
      expect(keys).toContain 'actor_login'

  describe "getContext", ->
    describe "with an activated package", ->
      beforeEach ->
        atom.loadPackage('metrics')
        atom.activatePackage('metrics')
        pack = atom.getLoadedPackage('metrics')
        spyOn(atom, 'getLoadedPackages').andReturn([pack])

      it "creates a request with package data", ->
        context = subject.getContext()
        expect(context.packages[0].name).toEqual 'metrics'
        expect(context.packages[0].loadTime).toBeDefined
        expect(context.packages[0].activateTime).toBeDefined
