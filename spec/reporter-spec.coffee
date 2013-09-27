Reporter = require '../lib/reporter'

describe "Reporter", ->
  subject = null
  beforeEach ->
    subject = new Reporter

  describe "send", ->
    beforeEach ->
      spyOn(subject, 'request')
      subject.send('event', { key: 'value' }, { packages: [{loadTime: 1, name: "foobar"}] })

    it "creates a request with the proper options", ->
      expect(subject.request).toHaveBeenCalled()
      expect(subject.request.calls[0].args[0].method).toBe 'POST'
      expect(subject.request.calls[0].args[0].url).toBe 'https://collector.githubapp.com/atom/event'
      expect(subject.request.calls[0].args[0].headers['Content-Type']).toBe 'application/vnd.github-octolytics+json'
      expect(subject.request.calls[0].args[0].body).toContain '"dimensions":{"key":"value"}'
      expect(subject.request.calls[0].args[0].body).toContain '"context":{"packages":[{"loadTime":1,"name":"foobar"}]}'
      expect(subject.request.calls[0].args[0].body).toContain '"timestamp":'
