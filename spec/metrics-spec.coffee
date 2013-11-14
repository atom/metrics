Reporter = require '../lib/reporter'

describe "Metrics", ->
  it "reports activation events", ->
    spyOn(Reporter, 'request')
    atom.packages.activatePackage('metrics')
    expect(Reporter.request).toHaveBeenCalled()

    requestArgs = Reporter.request.calls[0].args[0]
    body = JSON.parse(requestArgs.body)

    expect(requestArgs.method).toBe 'POST'
    expect(requestArgs.url).toBe 'https://collector.githubapp.com/atom/activate'
    expect(requestArgs.headers['Content-Type']).toBe 'application/vnd.github-octolytics+json'
    expect(body.dimensions).toBeDefined()
    expect(body.context).toBeDefined()
    expect(body.timestamp).toBeDefined()

  it "reports deactivation events", ->
    atom.packages.activatePackage('metrics')
    spyOn(Reporter, 'request')
    atom.packages.deactivatePackage('metrics')
    expect(Reporter.request).toHaveBeenCalled()

    requestArgs = Reporter.request.calls[0].args[0]
    body = JSON.parse(requestArgs.body)
    expect(requestArgs.url).toBe 'https://collector.githubapp.com/atom/deactivate'
    expect(body.dimensions).toBeDefined()
    expect(body.measures.session_length).toBeGreaterThan 0
