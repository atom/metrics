Reporter = require '../lib/reporter'

describe "Reporter", ->
  subject = null
  beforeEach ->
    subject = new Reporter

  describe "send", ->
    beforeEach ->
      spyOn(subject, 'request')
      subject.send('event', key: 'value')

    it "creates a request with the proper options", ->
      expect(subject.request).toHaveBeenCalled()
      expect(subject.request.calls[0].args[0].method).toBe 'POST'
      expect(subject.request.calls[0].args[0].url).toBe 'https://collector.githubapp.com/atom/event'
      expect(subject.request.calls[0].args[0].headers['Content-Type']).toBe 'application/json; charset=utf-8'
      expect(subject.request.calls[0].args[0].body).toContain '"dimensions":{"key":"value"}'
      expect(subject.request.calls[0].args[0].body).toContain '"timestamp":'
