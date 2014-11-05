{$} = require 'atom'
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

    @sendException: (description) ->
      params =
        t: 'exception'
        exd: description
        exf: if atom.inDevMode() then '0' else '1'

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
        dt: item.getGrammar?()?.name
      @send(params)

    @sendCommand: (commandName) ->
      @commandCount ?= {}
      @commandCount[commandName] ?= 0
      @commandCount[commandName]++

      params =
        t: 'event'
        ec: 'command'
        ea: commandName.split(':')[0]
        el: commandName
        ev: @commandCount[commandName]

      @send(params)

    @send: (params) ->
      _.extend(params, @defaultParams())
      @request
        type: 'POST'
        url: "https://www.google-analytics.com/collect?#{querystring.stringify(params)}"

    @request: (options) ->
      $.ajax(options) if navigator.onLine

    @defaultParams: ->
      params = {}
      params.cd1 = startDate if startDate = localStorage.getItem('metrics.sd')

      # https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters
      _.extend params,
        v: 1
        tid: "UA-3769691-33"
        cid: localStorage.getItem('metrics.userId')
        an: 'atom'
        av: atom.getVersion()
        sr: "#{screen.width}x#{screen.height}"
