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
* The name of each view class or atom configuration file opened in a pane, e.g. `EditorView`, `SettingsView`,
  `MarkdownPreviewView`, and `UserKeymap`. No other pane item information is collected.
* Exception messages (without paths)
* Commands run (save core commands)
* The amount of time the current window was open for
* The amount of time the current window took to load
* The amount of time the app took to launch
* The app's release channel (stable, beta, dev)
* Deprecations: package name and version of each deprecation

[GA]: http://www.google.com/analytics
[MAC]: http://en.wikipedia.org/wiki/MAC_address
[RFC4122]: http://www.ietf.org/rfc/rfc4122.txt
