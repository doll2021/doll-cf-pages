var CMS = {
    init: function() {
        CMS.common.view()
    },
    common: {
        view: function() {
            var t = document.querySelector("[data-comic-view]");
            if (t && "1" !== t.getAttribute("data-view-sent")) {
                var e = t.getAttribute("data-comic-view")
                  , r = t.getAttribute("data-view-page");
                if (e && !/[\/\\?#\r\n]/.test(e) && r && "function" == typeof window.fetch) {
                    t.setAttribute("data-view-sent", "1");
                    try {
                        var a = "comic:view:v1:" + r;
                        if ("1" === window.sessionStorage.getItem(a))
                            return;
                        window.sessionStorage.setItem(a, "1")
                    } catch (t) {}
                    window.fetch("/_comic/view", {
                        method: "POST",
                        credentials: "same-origin",
                        keepalive: !0,
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded"
                        },
                        body: "comic_key=" + encodeURIComponent(e)
                    }).catch(function() {})
                }
            }
        }
    },
    chapter: {
        init: function(t) {
            params = this.decrypt(params),
            CMS.history.add();
            var e, r = params.chapter_images || [], a = params.chapter_local_images || [], n = function() {
                var t = params.images_hosts || [];
                if (params.images_domain)
                    return params.images_domain;
                if (t.length)
                    return t[0];
                return params.cdnurl || ""
            }(), o = "theme" === t.attr("data-loader"), i = t.attr("data-loader-template"), c = i ? document.querySelector(i) : null, s = !!(c && c.content && c.content.firstElementChild);
            if (t.removeClass("chapter-image-placeholder reader-stage").addClass("chapter-images"),
            "down" === params.comic_status) {
                var l = "string" == typeof params.ranking_url && /^\/(?![\/\\])/.test(params.ranking_url) && !/[\\\x00-\x20]/.test(params.ranking_url) ? params.ranking_url : ""
                  , d = l ? '<p>可以去<a href="' + C(l) + '">排行榜</a>看看</p>' : "";
                return t.html('<div class="chapter-tips"><h2>抱歉，漫画下架了</h2>' + d + "</div>"),
                !1
            }
            if (!r.length)
                return t.html('<div class="chapter-tips">暂无章节图片</div>'),
                !1;
            function f(t, e) {
                m(t, 100),
                t.removeClass("loading is-retry").addClass("loaded"),
                s && (t.removeClass(t.attr("data-remove-class") || ""),
                t.find(".loading-content").remove(),
                e.removeClass("opacity-0").show()),
                o && (t.find(".progress-container, .loading-message").remove(),
                e.show()),
                t.find(".chapter-loading").fadeOut(160, function() {
                    $(this).remove()
                })
            }
            function u(t, e) {
                p(t, '<span class="chapter-error">加载失败，点击重试</span>'),
                t.addClass("is-retry").off("click.cmsChapter").on("click.cmsChapter", function() {
                    t.removeClass("is-retry").off("click.cmsChapter"),
                    e()
                })
            }
            function h(t, e) {
                t.removeClass("is-retry").off("click.cmsChapter"),
                p(t, '<span class="chapter-error">' + (e ? "图片错误，等待站长修复" : "加载失败，无效图片") + "</span>")
            }
            function m(t, e) {
                e = Math.max(0, Math.min(100, e || 0)),
                t.find(".chapter-progress").css("--chapter-progress-percent", e + "%"),
                t.find(".chapter-progress-text, .progress-text").text(e + "%")
            }
            function p(t, e) {
                t.find(".chapter-message, .loading-message p").html(e)
            }
            function g(t) {
                return t ? /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(t) ? t : n ? params.images_base64 ? v(n, function(t) {
                    try {
                        return btoa(unescape(encodeURIComponent(t)))
                    } catch (e) {
                        return t
                    }
                }(t)) : v(n, t) : t : ""
            }
            function v(t, e) {
                return t ? t.replace(/\/+$/, "") + "/" + String(e).replace(/^\/+/, "") : e
            }
            function C(t) {
                return String(t).replace(/[&<>"']/g, function(t) {
                    return {
                        "&": "&amp;",
                        "<": "&lt;",
                        ">": "&gt;",
                        '"': "&quot;",
                        "'": "&#39;"
                    }[t]
                })
            }
            // ★ 修改1：关闭 XHR 模式，走非 XHR 分支
            params.xhr_mode = !1,
            e = "",
            $.each(r, function(t, r) {
                var a = g(r)
                  , n = params.xhr_mode ? "" : ' data-original="' + C(a) + '"';
                if (s) {
                    var i = c.content.firstElementChild.cloneNode(!0);
                    i.setAttribute("data-index", t),
                    params.xhr_mode || i.setAttribute("data-original", a);
                    for (var l = i.querySelectorAll("[id]"), d = 0; d < l.length; d++)
                        l[d].removeAttribute("id");
                    var f = i.querySelector("img");
                    // ★ 修改2：模板分支，直接把真实地址写进 src
                    return f && f.setAttribute("src", a),
                    void (e += i.outerHTML)
                }
                var u = '<div class="chapter-progress' + (params.xhr_mode ? "" : " chapter-progress-spinner") + '">' + (params.xhr_mode ? '<div class="chapter-progress-text">0%</div>' : "") + "</div>";
                // ★ 修改3：非模板分支，<img> 标签直接带 src
                e += '<div class="chapter-image loading" data-index="' + t + '"' + n + ">" + (o ? '<div class="progress-container"><svg class="progress-ring" width="150" height="150"><circle class="progress-ring__background" r="45" cx="50" cy="50"></circle><circle class="progress-ring__circle" r="45" cx="50" cy="50"></circle></svg><div class="progress-text">0%</div></div><div class="loading-message"><p class="chapter-message">正在加载图片，请稍候</p></div>' : '<div class="chapter-loading">' + u + '<div class="chapter-message">正在加载图片，请稍候</div></div>') + '<img alt="" referrerpolicy="no-referrer" src="' + C(a) + '"' + (o ? ' style="display:none"' : "") + "></div>"
            }),
            t.html(e),
            params.xhr_mode ? function() {
                var e = 5
                  , o = 0
                  , i = []
                  , c = []
                  , s = null
                  , l = -1;
                function d() {
                    var e = C();
                    if (e !== l) {
                        l = e,
                        w(t.find(".chapter-image").eq(e), !0);
                        for (var r = 1; r <= 3; r++) {
                            var a = t.find(".chapter-image").eq(e + r);
                            a.length && w(a, !1)
                        }
                    }
                }
                function C() {
                    var e = 0;
                    return t.find(".chapter-image").each(function(t) {
                        if (this.getBoundingClientRect().bottom > 0)
                            return e = t,
                            !1
                    }),
                    e
                }
                function w(t, e) {
                    if (t.length) {
                        var r = t.data("xhrState");
                        "loaded" !== r && "loading" !== r && "failed" !== r && ("queued" === r ? e && "high" !== t.data("xhrPriority") && (W(c, t),
                        i.push(t),
                        t.data("xhrPriority", "high")) : (t.data({
                            xhrState: "queued",
                            xhrPriority: e ? "high" : "preload"
                        }),
                        (e ? i : c).push(t)),
                        y())
                    }
                }
                function y() {
                    for (; o < e && (i.length || c.length); ) {
                        var t = i.shift() || c.shift();
                        t && "loaded" !== t.data("xhrState") && "loading" !== t.data("xhrState") && (o++,
                        t.data("xhrState", "loading"),
                        x(t, !1, function() {
                            o = Math.max(0, o - 1),
                            y()
                        }))
                    }
                }
                function W(t, e) {
                    for (var r = t.length - 1; r >= 0; r--)
                        t[r][0] === e[0] && t.splice(r, 1)
                }
                function x(t, e, o) {
                    var i = parseInt(t.data("index"), 10)
                      , c = e ? a[i] : r[i]
                      , s = e ? function(t) {
                        if (!t || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(t) || !n)
                            return t || "";
                        return v(n, t)
                    }(c) : g(c)
                      , l = new XMLHttpRequest
                      , d = null
                      , C = null
                      , y = !1
                      , W = null
                      , b = t.find("img");
                    if (!s)
                        return k("failed"),
                        void h(t);
                    function k(e) {
                        y || (y = !0,
                        clearTimeout(C),
                        clearInterval(d),
                        b.off("load").off("error"),
                        W && (URL.revokeObjectURL(W),
                        W = null),
                        t.data({
                            xhrState: e,
                            xhrPriority: ""
                        }),
                        "function" == typeof o && o())
                    }
                    m(t, 0),
                    p(t, "正在加载图片，请稍候"),
                    d = function(t, e) {
                        var r = 0;
                        return setInterval(function() {
                            r = Math.min(e, r + Math.ceil(8 * Math.random())),
                            m(t, r)
                        }, 180)
                    }(t, 85),
                    C = setTimeout(function() {
                        k("error"),
                        l.abort(),
                        u(t, function() {
                            w(t, !0)
                        })
                    }, 3e4),
                    l.onprogress = function(e) {
                        y || e.lengthComputable && (clearInterval(d),
                        m(t, Math.round(e.loaded / e.total * 100)))
                    }
                    ,
                    l.onload = function() {
                        if (!y)
                            if (clearTimeout(C),
                            clearInterval(d),
                            l.status >= 200 && l.status < 300) {
                                m(t, 95),
                                p(t, "下载完成，正在显示图片"),
                                C = setTimeout(function() {
                                    k("error"),
                                    u(t, function() {
                                        w(t, !0)
                                    })
                                }, 3e4);
                                try {
                                    W = URL.createObjectURL(l.response),
                                    b.off("load").off("error").one("load", function() {
                                        y || (f(t, b),
                                        k("loaded"))
                                    }).one("error", function() {
                                        y || (k("error"),
                                        u(t, function() {
                                            w(t, !0)
                                        }))
                                    }).attr("src", W)
                                } catch (e) {
                                    k("error"),
                                    u(t, function() {
                                        w(t, !0)
                                    })
                                }
                            } else
                                e || 403 !== l.status && 404 !== l.status || !a[i] ? l.status >= 400 && l.status < 500 && 408 !== l.status && 429 !== l.status ? (h(t, l.status),
                                k("failed")) : (k("error"),
                                u(t, function() {
                                    w(t, !0)
                                })) : (y = !0,
                                x(t, !0, o))
                    }
                    ,
                    l.onerror = function() {
                        y || (clearTimeout(C),
                        clearInterval(d),
                        k("error"),
                        u(t, function() {
                            w(t, !0)
                        }))
                    }
                    ,
                    l.open("GET", s, !0),
                    l.responseType = "blob",
                    l.send()
                }
                d(),
                $(window).off("scroll.cmsChapterXhr resize.cmsChapterXhr").on("scroll.cmsChapterXhr resize.cmsChapterXhr", function() {
                    clearTimeout(s),
                    s = setTimeout(d, 80)
                })
            }() : function() {
                var e = null
                  , r = -1;
                // ★ 修改4：把懒加载改成一次性遍历全部图片
                function a() {
                    t.find(".chapter-image").each(function(index) {
                        o(index);
                    });
                }
                function n() {
                    var e = 0;
                    return t.find(".chapter-image").each(function(t) {
                        if (this.getBoundingClientRect().bottom > 0)
                            return e = t,
                            !1
                    }),
                    e
                }
                function o(e, r) {
                    var a = t.find(".chapter-image").eq(e);
                    if (a.length) {
                        var n = a.data("imgState");
                        if (r || "loading" !== n && "loaded" !== n) {
                            var i = a.find("img")
                              , c = a.data("original");
                            c ? (a.data("imgState", "loading"),
                            p(a, "正在加载图片，请稍候"),
                            i.off(".cmsChapterImg").removeAttr("src").on("load.cmsChapterImg", function() {
                                a.data("imgState", "loaded"),
                                f(a, i)
                            }).on("error.cmsChapterImg", function() {
                                a.data("imgState", "error"),
                                u(a, function() {
                                    o(e, !0)
                                })
                            }).attr({
                                src: c,
                                loading: "lazy"
                            })) : h(a)
                        }
                    }
                }
                a(),
                $(window).off("scroll.cmsChapterImg resize.cmsChapterImg").on("scroll.cmsChapterImg resize.cmsChapterImg", function() {
                    clearTimeout(e),
                    e = setTimeout(a, 80)
                })
            }()
        },
        decrypt: function(t) {
            var e, r, a, n, o, i = "jsjiami.com.v7", c = s;
            function s(t, e) {
                var r = l();
                return s = function(e, a) {
                    var n = r[e -= 236];
                    if (void 0 === s.dvZTWi) {
                        s.YqgKom = function(t, e) {
                            var r, a, n = [], o = 0, i = "";
                            for (t = function(t) {
                                for (var e, r, a = "", n = "", o = 0, i = 0; r = t.charAt(i++); ~r && (e = o % 4 ? 64 * e + r : r,
                                o++ % 4) ? a += String.fromCharCode(255 & e >> (-2 * o & 6)) : 0)
                                    r = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=".indexOf(r);
                                for (var c = 0, s = a.length; c < s; c++)
                                    n += "%" + ("00" + a.charCodeAt(c).toString(16)).slice(-2);
                                return decodeURIComponent(n)
                            }(t),
                            a = 0; a < 256; a++)
                                n[a] = a;
                            for (a = 0; a < 256; a++)
                                o = (o + n[a] + e.charCodeAt(a % e.length)) % 256,
                                r = n[a],
                                n[a] = n[o],
                                n[o] = r;
                            a = 0,
                            o = 0;
                            for (var c = 0; c < t.length; c++)
                                o = (o + n[a = (a + 1) % 256]) % 256,
                                r = n[a],
                                n[a] = n[o],
                                n[o] = r,
                                i += String.fromCharCode(t.charCodeAt(c) ^ n[(n[a] + n[o]) % 256]);
                            return i
                        }
                        ,
                        t = arguments,
                        s.dvZTWi = !0
                    }
                    var o = e + r[0]
                      , i = t[o];
                    return i ? n = i : (void 0 === s.aPHNcw && (s.aPHNcw = !0),
                    n = s.YqgKom(n, a),
                    t[o] = n),
                    n
                }
                ,
                s(t, e)
            }
            function l() {
                var t = [i, "eHTXjsheNjlxiXramLih.SthcQoYbm.evG7CGwWX==", "WQJdUCobgG", "jmkJWObOWQH8b2ZcImo2W5zVWPW", "hCkSWOuaxLJcHmkkW7jsD8kU", "W4X/W4BcUCkdiZVdQmk6bSo9W7O", "WQvwfCoqECo6u8oOxbynbSonW7ldQ0m", "WQ1CjmooWOLieSk3WPu", "WRddHCoKW4nPDq", "W41CWRW", "WOlcQJxcPaC", "ceP7W4xdTJH3mqOWW5e", "WPifWR3cJ8oKW6ZcQ1uk", "aq/dIqzh", "ra8ppSkYiSkdqa"].concat(["W6hdIgVcJa", "W6JcRmk+ASk+eG", "W49/W4BcU8kbjNFdLmkMgmoIW6FdQq", "WONcJ3rwWPXweCowW5pdRSkRW5O", "WPubWRZdVmoWW4ZcK2Kuzq", "sCo2W5e", "W6FcT8k5", "W492W4FcVCo7wGJdLmk5eq", "s8kqW6FdPeO", "WOBcPbtcOXdcN0BdSa", "W7hcRmoGWOlcJ8kTW5j2xq", "WOulcua6W5NdIg3cHetdHCk4", "wgDDwcK8W54Ywbrmta", "W6n0qCoREmoph8oeqW", "DCkvWOtcHmkzFCoYvq"].concat(["EXO5WPNdSKu", "w2vyaef7W7mYqa", "dZKi", "WQy0bL5Yfmk3ka", "WOVcGNbuW6qPp8oHW43dOW", "W4H6W4FcUSo1CWJdL8kYhG", "w8o3W4brfq", "tauplCk/o8ky", "qvFcKYHKqComW4i0", "W5XGWPW", "WPjPWOu", "Emk2W6tdVW", "iCoOWQBcSK8DWPpcVb0+Ca"]));
                return (l = function() {
                    return t
                }
                )()
            }
            e = 768,
            r = 194,
            e >>= 2,
            n = "hs",
            o = "hs",
            function(t, i, c, l, d) {
                var f = s;
                o += d = "up",
                n = c(n = (l = "tfi") + n),
                o = c(o),
                c = 0;
                for (var u = t(); --r + i; )
                    try {
                        l = -parseInt(f(257, "j]4X")) / 1 * (parseInt(f(248, "5OGl")) / 2) + parseInt(f(244, "oaQC")) / 3 + parseInt(f(274, "V73S")) / 4 * (-parseInt(f(245, "YGhV")) / 5) + parseInt(f(270, "xAS3")) / 6 + -parseInt(f(264, "qx*6")) / 7 * (parseInt(f(268, "MxH$")) / 8) + -parseInt(f(253, "j]4X")) / 9 + parseInt(f(259, "Ixx@")) / 10 * (parseInt(f(252, "#*re")) / 11)
                    } catch (t) {
                        l = c
                    } finally {
                        if (d = u[n](),
                        e <= r)
                            c ? a ? l = d : a = d : c = d;
                        else if (c == a.replace(/[TwHWCYQLxhGtreXNSlb=]/g, "")) {
                            if (l === i) {
                                u["un" + n](d);
                                break
                            }
                            u[o](d)
                        }
                    }
            }(l, 107868, function(t, e, r, a, n, o, i) {
                return (t = (t = (t = arguments[0])[e = "split"](""))[r = "reverse"]("v"))[a = "join"]("")
            }),
            l && (i = 6309);
            var d = CryptoJS[c(246, "2Nzt")][c(256, "gV5g")][c(236, "$#fp")](t)
              , f = CryptoJS.lib[c(251, "h#[b")][c(275, "h@n#")](d.words[c(239, "qx*6")](0, 16))
              , u = d[c(262, "2Nzt")][c(249, "whkC")](4)
              , h = CryptoJS[c(265, "IYfU")].Hex[c(254, "GpdQ")](CryptoJS[c(247, "U5C8")].WordArray[c(242, "U5C8")](u))
              , m = CryptoJS[c(266, "Di(2")][c(241, "bSFD")].parse(c(273, "GpdQ"))
              , p = CryptoJS[c(276, "*YTR")][c(263, "ce1B")]({
                ciphertext: CryptoJS.enc.Hex.parse(h)
            }, m, {
                iv: f
            })[c(250, "$#fp")](CryptoJS[c(258, "j]4X")].Utf8)
              , g = JSON.parse(p);
            return g[c(269, "ZydB")] === window[c(240, "ce1B")][c(267, "MxH$")] ? g : []
        }
    }
};
!function(t) {
    function e() {
        return window.jQuery
    }
    function r(t, e) {
        if (!t || "#" === String(t).charAt(0))
            return "";
        try {
            var r = new URL(String(t || ""),window.location.href);
            return !/^https?:$/.test(r.protocol) || e && r.origin !== window.location.origin ? "" : e ? r.pathname + r.search + r.hash : r.href
        } catch (t) {
            return ""
        }
    }
    t.cookie = {
        get: function(t) {
            for (var e = String(document.cookie || "").split(";"), r = 0; r < e.length; r++) {
                var a = e[r].trim()
                  , n = t + "=";
                if (0 === a.indexOf(n))
                    try {
                        return decodeURIComponent(a.slice(n.length))
                    } catch (t) {
                        return null
                    }
            }
            return null
        },
        set: function(t, e) {
            if (/^[a-zA-Z0-9_]+$/.test(t)) {
                var r = encodeURIComponent(String(e));
                r.length > 3600 || (document.cookie = t + "=" + r + "; Max-Age=2592000; Path=/; SameSite=Lax")
            }
        },
        clear: function(t) {
            /^[a-zA-Z0-9_]+$/.test(t) && (document.cookie = t + "=; Max-Age=0; Path=/; SameSite=Lax")
        }
    },
    t.history = {
        rows: function() {
            return (t.cookie.get("_history") || "").split("###").filter(Boolean).map(function(t) {
                return t.split("^^")
            }).filter(function(t) {
                return 8 === t.length && t[0] && r(t[3], !0) && r(t[6], !0)
            }).slice(0, 20)
        },
        save: function(e) {
            var r;
            do {
                if (r = e.map(function(t) {
                    return t.join("^^")
                }).join("###") + (e.length ? "###" : ""),
                encodeURIComponent(r).length <= 3600)
                    break;
                e.pop()
            } while (e.length);
            e.length || (r = ""),
            t.cookie.set("_history", r)
        },
        add: function() {
            if ("object" == typeof params && params.comic_id && "normal" === params.comic_status) {
                var e = r(params.comic_url, !0)
                  , a = r(params.chapter_url, !0);
                if (e && a) {
                    var n = new Date
                      , o = [n.getFullYear(), n.getMonth(), n.getDate(), n.getHours(), n.getMinutes(), n.getSeconds()].join("-")
                      , i = [params.comic_id, params.comic_name, r(params.comic_image, !1), e, params.chapter_id || a, params.chapter_title, a, o].map(function(t) {
                        return String(t || "").replace(/\^\^|###/g, " ").slice(0, 500)
                    })
                      , c = t.history.rows().filter(function(t) {
                        return t[0] !== i[0]
                    });
                    c.unshift(i),
                    t.history.save(c.slice(0, 20))
                }
            }
        },
        get: function(a) {
            var n = e();
            if (n) {
                var o = t.history.rows().find(function(t) {
                    return t[0] === String(a)
                });
                o && n(".j-read").attr("href", r(o[6], !0)).text("继续阅读")
            }
        },
        show: function() {
            var a = e();
            if (a && a("#hContent").length && !a("#hContent").data("history-ready")) {
                var n, o = a("#hContent").data("history-ready", !0);
                o.html('<em></em><div class="hCont"><div class="hHead"><span><a href="#" id="hClose">关闭</a></span><a href="#" id="hClear">清空所有记录</a></div><div class="hList" id="hList"></div></div>'),
                a("#hTitle").on("mouseenter.comicHistory click.comicHistory", function(t) {
                    t.preventDefault(),
                    clearTimeout(n),
                    i(),
                    o.show()
                }).on("mouseleave.comicHistory", function() {
                    n = setTimeout(function() {
                        o.hide()
                    }, 200)
                }),
                o.on("mouseenter", function() {
                    clearTimeout(n)
                }).on("mouseleave", function() {
                    o.hide()
                }),
                o.find("#hClose").on("click", function(t) {
                    t.preventDefault(),
                    o.hide()
                }),
                o.find("#hClear").on("click", function(e) {
                    e.preventDefault(),
                    t.cookie.clear("_history"),
                    i()
                })
            }
            function i() {
                var e = o.find("#hList").empty()
                  , n = t.history.rows();
                n.length || e.append(a('<div class="hNone">').text("暂时没有观看记录!")),
                n.forEach(function(n) {
                    var o = a("<li>")
                      , c = a('<span class="hDelete">').text("X").on("click", function() {
                        t.history.save(t.history.rows().filter(function(t) {
                            return t[0] !== n[0]
                        })),
                        i()
                    });
                    o.append(c, a('<p class="big">').append(a("<a>").attr("href", r(n[3], !0)).text(n[1])), a('<p class="fr">').append(a('<a class="red">').attr("href", r(n[6], !0)).text(n[5]))),
                    e.append(o)
                }),
                e.toggleClass("hListMax", n.length > 5)
            }
        }
    },
    t.lazy = {
        init: function() {
            var t = e();
            t && t.fn.lazyload && (t(".lazy").lazyload({
                effect: "fadeIn",
                threshold: 200,
                failurelimit: 5,
                skip_invisible: !1
            }),
            t(".lazy-bg").lazyload({
                load: function() {
                    t(this).css("background-image", 'url("' + t(this).data("original") + '")')
                }
            }))
        }
    },
    t.common.back = function() {
        var t = e();
        t && t(".j-back").off("click.comicBack").on("click.comicBack", function(t) {
            t.preventDefault(),
            r(document.referrer, !0) && window.history.length > 1 ? window.history.back() : window.location.href = "/"
        })
    }
    ,
    t.chapter.no = function() {
        var t, r = e();
        r && (r(window).off("scroll.comicPage").on("scroll.comicPage", function() {
            clearTimeout(t),
            t = setTimeout(a, 100)
        }),
        a());
        function a() {
            var t = 1;
            r(".chapter-image").each(function(e) {
                var r = this.getBoundingClientRect();
                if (r.bottom > 0 && r.top < window.innerHeight)
                    return t = e + 1,
                    !1
            }),
            r(".j-read-i").text(t)
        }
    }
    ,
    t.chapter.next = function() {
        var t = e();
        if (t && "object" == typeof params && "normal" === params.comic_status) {
            var a = t(".chapter-detail");
            if (a.length && !a.find("[data-reader-next]").length) {
                var n = r(t(".j-chapter-next").first().attr("href"), !0)
                  , o = t("<div data-reader-next>").addClass(n ? "chapter-next" : "chapter-tips");
                n ? o.append(t('<a class="button is-warning is-rounded">').attr("href", n).text("下一话")) : o.text("已经阅读到最后一话，敬请期待更新"),
                a.append(o)
            }
        }
    }
    ,
    t.chapter.toolbar = function() {
        var t = e();
        t && t("body").off("click.comicToolbar").on("click.comicToolbar", ".chapter-images", function(e) {
            t(e.target).closest("a,button").length || t(".top-toolbar,.bottom-toolbar").each(function() {
                var e = t(this)
                  , r = {};
                r[e.hasClass("top-toolbar") ? "top" : "bottom"] = e.data("comic-hidden") ? 0 : -e.outerHeight(),
                e.stop(!0).animate(r, 200).data("comic-hidden", !e.data("comic-hidden"))
            })
        })
    }
    ;
    var a = t.init;
    t.init = function() {
        a();
        var n = e();
        n && (t.lazy.init(),
        window.ClipboardJS && n(".j-share").length && !t._clipboard && (t._clipboard = new window.ClipboardJS(".j-share",{
            text: function() {
                return window.location.href
            }
        }),
        t._clipboard.on("success", function() {
            window.layer && window.layer.msg("链接已复制")
        })),
        n.fn.qrcode && n(".j-qrcode").each(function() {
            var t = n(this);
            t.data("comic-qr") || t.data("comic-qr", !0).qrcode({
                text: t.attr("data-url") || window.location.href,
                render: "canvas",
                width: t.attr("data-width") || 120,
                height: t.attr("data-height") || 120,
                typeNumber: -1,
                correctLevel: 0,
                background: "#ffffff",
                foreground: "#000000"
            })
        }),
        n(".category-filter,#category-filter").off("click.comicFilter", "a").on("click.comicFilter", "a", function(t) {
            var e = r(n(this).data("url") || n(this).attr("href"), !0);
            e && (t.preventDefault(),
            window.location.href = e)
        }))
    }
}(CMS);