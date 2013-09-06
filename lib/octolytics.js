(function () {
    var e, t, n, r;
    t = function (e) {
        if (console && console.log) return console.log(e)
    }, r = function (e) {
        if (console && console.warn) return console.warn(e)
    }, e = {
        host: "collector.githubapp.com",
        type: "page_view",
        dimensions: {},
        actor: {},
        image: new Image,
        recordPageView: function () {
            return this.applyMetaTags(), this.app == null ? (r("App not set, you are doing something wrong"), !1) : this.host == null ? (r("Host not set, you are doing something wrong"), !1) : (this.image.src = this._src(), !0)
        },
        setHost: function (e) {
            return this.host = e
        },
        setApp: function (e) {
            return this.app = e
        },
        setDimensions: function (e) {
            return this.dimensions = e
        },
        setActor: function (e) {
            return this.actor = e
        },
        push: function (e) {
            return this.applyCall(e)
        },
        _src: function () {
            return "https://" + this.host + "/" + this.app + "/" + this.type + "?" + this._queryString()
        },
        _queryString: function () {
            var e, t, n;
            return t = function () {
                var t, r;
                t = this._params(), r = [];
                for (e in t) n = t[e], r.push("dimensions[" + e + "]=" + n);
                return r
            }.call(this), t.push(this._dimensions()), t.push(this._actor()), t.join("&")
        },
        _params: function () {
            return {
                user_agent: this._encode(this._agent()),
                screen_resolution: this._encode(this._screenResolution()),
                pixel_ratio: this._encode(this._pixelRatio()),
                browser_resolution: this._encode(this._browserResolution()),
                timestamp: (new Date).getTime()
            }
        },
        _page: function () {
            try {
                return document.location.href
            } catch (e) {
                return ""
            }
        },
        _title: function () {
            try {
                return document.title
            } catch (e) {
                return ""
            }
        },
        _referrer: function () {
            var e;
            e = "";
            try {
                e = window.top.document.referrer
            } catch (t) {
                if (window.parent) try {
                    e = window.parent.document.referrer
                } catch (t) {}
            }
            return e === "" && (e = document.referrer), e
        },
        _agent: function () {
            try {
                return navigator.userAgent
            } catch (e) {
                return ""
            }
        },
        _screenResolution: function () {
            try {
                return screen.width + "x" + screen.height
            } catch (e) {
                return "unknown"
            }
        },
        _pixelRatio: function () {
            return window.devicePixelRatio
        },
        _browserResolution: function () {
            var e, t, n, r;
            try {
                return t = 0, e = 0, typeof window.innerWidth == "number" ? (t = window.innerWidth, e = window.innerHeight) : ((n = document.documentElement) != null ? n.clientWidth : void 0) != null ? (t = document.documentElement.clientWidth, e = document.documentElement.clientHeight) : ((r = document.body) != null ? r.clientWidth : void 0) != null && (t = document.body.clientWidth, e = document.body.clientHeight), t + "x" + e
            } catch (i) {
                return "unknown"
            }
        },
        _dimensions: function () {
            var e, t, n, r, i, s, o, u;
            t = [], u = this.dimensions;
            for (r in u) {
                i = u[r], e = "dimensions[" + r + "]";
                if (i.join)
                    for (s = 0, o = i.length; s < o; s++) n = i[s], t.push("" + e + "[]=" + this._encode(n));
                else t.push("" + e + "=" + this._encode(i))
            }
            return t.join("&")
        },
        _actor: function () {
            var e, t, n, r, i, s, o, u;
            t = [], u = this.actor;
            for (r in u) {
                i = u[r], e = "dimensions[actor_" + r + "]";
                if (i.join)
                    for (s = 0, o = i.length; s < o; s++) n = i[s], t.push("" + e + "[]=" + this._encode(n));
                else t.push("" + e + "=" + this._encode(i))
            }
            return t.join("&")
        },
        _encode: function (e) {
            return e != null ? window.encodeURIComponent(e) : ""
        },
        applyQueuedCalls: function (e) {
            var t, n, r, i;
            i = [];
            for (n = 0, r = e.length; n < r; n++) t = e[n], i.push(this.applyCall(t));
            return i
        },
        applyCall: function (e) {
            var t, n;
            return n = e[0], t = e.slice(1), this[n] ? this[n].apply(this, t) : r("" + n + " is not a valid method for github_analytics")
        },
        applyMetaTags: function () {
            var e;
            e = this.loadMetaTags();
            if (e.appId) return e.host && this.setHost(e.host), this.setApp(e.appId), this.setDimensions(e.dimensions), this.setActor(e.actor)
        },
        loadMetaTags: function () {
            var e, t, n, r, i, s;
            n = {
                dimensions: {},
                actor: {}
            }, s = document.getElementsByTagName("meta");
            for (r = 0, i = s.length; r < i; r++) {
                e = s[r];
                if (e.name && e.content)
                    if (t = e.name.match(this.octolyticsMetaTagName)) switch (t[1]) {
                    case "host":
                        n.host = e.content;
                        break;
                    case "app-id":
                        n.appId = e.content;
                        break;
                    case "dimension":
                        this._addField(n.dimensions, t[2], e);
                        break;
                    case "actor":
                        this._addField(n.actor, t[2], e)
                    }
            }
            return n
        },
        _addField: function (e, t, n) {
            var r;
            return n.attributes["data-array"] ? ((r = e[t]) == null && (e[t] = []), e[t].push(n.content)) : e[t] = n.content
        },
        octolyticsMetaTagName: /^octolytics-(host|app-id|dimension|actor)-?(.*)/
    }, window._octo ? window._octo.slice && (n = window._octo.slice(0), window._octo = e, window._octo.applyQueuedCalls(n)) : window._octo = e
}).call(this);
