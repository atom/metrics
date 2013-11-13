Reporter = require '../lib/reporter'

describe "Metrics", ->
  beforeEach ->
    spyOn(Reporter, 'request')
    atom.packages.activatePackage('metrics')

  it "creates a request with the proper options", ->
    expect(Reporter.request).toHaveBeenCalled()

    requestArgs = Reporter.request.calls[0].args[0]
    body = JSON.parse(requestArgs.body)

    expect(requestArgs.method).toBe 'POST'
    expect(requestArgs.url).toBe 'https://collector.githubapp.com/atom/activate'
    expect(requestArgs.headers['Content-Type']).toBe 'application/vnd.github-octolytics+json'
    expect(body.dimensions).toBeDefined()
    expect(body.context).toBeDefined()
    expect(body.timestamp).toBeDefined()

    Reporter.request.reset()

    atom.packages.deactivatePackage('metrics')
    expect(Reporter.request).toHaveBeenCalled()
    requestArgs = Reporter.request.calls[0].args[0]
    expect(requestArgs.url).toBe 'https://collector.githubapp.com/atom/deactivate'
