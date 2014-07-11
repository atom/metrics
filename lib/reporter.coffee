https = require 'https'
path = require 'path'
querystring = require 'querystring'

_ = require 'underscore-plus'

module.exports =
  class Reporter
    @sendEvent: (category, name, value) ->
      params =
        t: 'event'
        ec: category
        ea: name
        ev: value

      @send(params)

    @sendTiming: (category, name, value) ->
      params =
        t: 'timing'
        utc: category
        utv: name
        utt: value

      @send(params)

    @viewNameForPaneItem: (item) ->
      name = item.getViewClass?().name ? item.constructor.name
      itemPath = item.getPath?()

      return name unless path.dirname(itemPath) is atom.getConfigDirPath()

      extension = path.extname(itemPath)
      switch path.basename(itemPath, extension)
        when 'config'
          name = 'UserConfig'     if extension in ['.json', '.cson']
        when 'init'
          name = 'UserInitScript' if extension in ['.js', '.coffee']
        when 'keymap'
          name = 'UserKeymap'     if extension in ['.json', '.cson']
        when 'snippets'
          name = 'UserSnippets'   if extension in ['.json', '.cson']
        when 'styles'
          name = 'UserStylesheet' if extension in ['.css', '.less']
      name

    @sendPaneItem: (item) ->
      params =
        t: 'appview'
        cd: @viewNameForPaneItem(item)
        dt: item.getGrammar?().name
      @send(params)

    @send: (params) ->
      _.extend(params, @defaultParams())
      @request
        method: 'POST'
        hostname: 'www.google-analytics.com'
        path: "/collect?#{querystring.stringify(params)}"
        headers:
          'User-Agent': navigator.userAgent

    @request: (options) ->
      request = https.request(options)
      request.on 'error', -> # This prevents errors from going to the console
      request.end()

    @defaultParams: ->
      v: 1
      tid: "UA-3769691-33"
      cid: atom.config.get('metrics.userId')
      an: 'atom'
      av: atom.getVersion()
      sr: "#{screen.width}x#{screen.height}"
