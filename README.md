## Metrics package [![Build Status](https://travis-ci.org/atom/metrics.svg?branch=master)](https://travis-ci.org/atom/metrics)

A package that reports usage information to [Google Analytics][GA].

If you do not want this information reported, you can disable this package.
Open the Settings View by running the `Settings View: Open` command from the
Command Palette, go to the Packages section, and then find and disable the
Metrics package.

### Collected Data

* A unique UUID v4 random identifier is generated according to [RFC4122][RFC4122]
* The screen width and height
* The version of Atom being used
* The name of each item opened in a pane such as `EditorView`, `SettingsView`,
  and `MarkdownPreviewView`
* Exception messages (without paths)
* Commands run (save core commands)
* The amount of time the current window was open for
* The amount of time the current window took to load
* The amount of time the app took to launch
* Deprecations: package name and version of each deprecation

[GA]: http://www.google.com/analytics
[MAC]: http://en.wikipedia.org/wiki/MAC_address
[RFC4122]: http://www.ietf.org/rfc/rfc4122.txt
