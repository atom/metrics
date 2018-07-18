const getDomain = function (gitURL) {
  const patternsToDomains = [
    [/(https:\/\/|@)github\.com/, 'github.com'],
    [/(https:\/\/|@)gitlab\.com/, 'gitlab.com'],
    [/(https:\/\/|@)bitbucket\.org/, 'bitbucket.org'],
    [/(https:\/\/|@).*\.visualstudio\.com/, 'visualstudio.com'],
    [/(https:\/\/|@)git-codecommit\..*\.amazonaws\.com/, 'amazonaws.com']
  ]

  for (let [pattern, domain] of patternsToDomains) {
    if (pattern.test(gitURL)) return domain
  }

  return 'other'
}

module.exports = {getDomain}
