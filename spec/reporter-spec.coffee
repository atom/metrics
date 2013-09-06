Reporter = require '../lib/reporter'

fdescribe "Reporter", ->
  subject = null
  beforeEach ->
    subject = new Reporter

  describe "send", ->
    beforeEach ->
      spyOn(subject, 'request')
      subject.send(key: 'value')

    it "creates a request with the proper options", ->
      expect(subject.request).toHaveBeenCalled()
      expect(subject.request.calls[0].args[0].url).toBe 'https://collector-staging.githubapp.com/atom/page_view'
      expect(subject.request.calls[0].args[0].qs['dimensions[key]']).toBe 'value'
      expect(subject.request.calls[0].args[0].qs['dimensions[timestamp]']).not.toBeNull()
