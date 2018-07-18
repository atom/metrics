const {getDomain} = require('../lib/repository-helpers')

describe('getDomain', () => {
  it('detects whitelisted domains for HTTPS URLs', () => {
    expect(getDomain('https://github.com/electron/node')).toBe('github.com')
    expect(getDomain('https://gitlab.com/electron/node')).toBe('gitlab.com')
    expect(getDomain('https://bitbucket.org/electron/node')).toBe('bitbucket.org')
    expect(getDomain('https://foo.visualstudio.com/electron/node')).toBe('visualstudio.com')
    expect(getDomain('https://git-codecommit.us-east-1.amazonaws.com/electron/node')).toBe('amazonaws.com')
  })

  it('returns "other" for non-whitelisted domain in HTTPS URLs', () => {
    expect(getDomain('https://example.com/electron/node')).toBe('other')
    expect(getDomain('https://localhost/electron/node')).toBe('other')
  })

  it('detects whitelisted domains for SSH URLs', () => {
    expect(getDomain('git@github.com:electron/node.git')).toBe('github.com')
    expect(getDomain('git@gitlab.com/electron/node')).toBe('gitlab.com')
    expect(getDomain('git@bitbucket.org/electron/node')).toBe('bitbucket.org')
    expect(getDomain('git@foo.visualstudio.com/electron/node')).toBe('visualstudio.com')
    expect(getDomain('git@git-codecommit.us-east-1.amazonaws.com/electron/node')).toBe('amazonaws.com')
  })

  it('returns "other" for non-whitelisted domain in ssh:// URLs', () => {
    expect(getDomain('git@example.com:electron/node.git')).toBe('other')
    expect(getDomain('git@localhost:electron/node.git')).toBe('other')
  })

  it('returns "other" for local filesystem URLs', () => {
    expect(getDomain('electron/node.git')).toBe('other')
    expect(getDomain('/srv/git/node.git')).toBe('other')
    expect(getDomain('file:///srv/git/node.git')).toBe('other')
    expect(getDomain('file:///srv/git/github.com.git')).toBe('other')
  })

  it('detects whitelisted domains for oddball URLs', () => {
    expect(getDomain('https://github.com/bitbucket.org/visualstudio.com.gitlab.com')).toBe('github.com')
    expect(getDomain('https://bitbucket.org/github.com/visualstudio.com.gitlab.com')).toBe('bitbucket.org')
  })

  it('returns "other" for non-whitelisted domain in oddball URLs', () => {
    expect(getDomain('🙀')).toBe('other')
    expect(getDomain(null)).toBe('other')
  })
})
