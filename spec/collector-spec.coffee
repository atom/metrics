_ = require 'underscore'
Collector = require '../lib/collector'

describe "Collector", ->
  subject = null
  beforeEach ->
    subject = new Collector

  describe "getData", ->
    beforeEach ->

    it "creates a request with the proper options", ->
      console.log subject.getData()
      keys = _.keys(subject.getData())
      expect(keys).toContain 'user_agent'
      expect(keys).toContain 'screen_resolution'
      expect(keys).toContain 'pixel_ratio'
      expect(keys).toContain 'browser_resolution'
      expect(keys).toContain 'window_path'
      expect(keys).toContain 'session_id'
      expect(keys).toContain 'actor_login'
