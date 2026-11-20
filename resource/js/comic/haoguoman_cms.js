/*!
 * haoguoman_cms.js  v2.0
 * 替代 /static/js/cms-2.0.1.min.js：解密 params，把整话图片地址一次性写进 <img src>。
 * 本版只做一件事：让 DOM 里的 <img> 拥有正确的图片地址。
 * 不代理、不本地化、不做错误占位 —— 图片能不能显示（CDN 只认 haoguoman8.com 的 Referer，会 403）不关心。
 * 用法：
 *   <script src="https://page.44477444.xyz/resource/js/comic/haoguoman_cms.js"></script>
 */
(function (window, document) {
  'use strict';

  /* ============================ 配置区 ============================ */
  var CFG = {
    host: '',                    // 覆盖图床域名，留空则用密文里的 images_hosts[0]
    aesKey: '5V&RoR%Jf@pJPydF',  // 站点换 key 时改这里
    keepSize: true               // 只影响版面：图片 403 时给个最小高度，防止整页塌成一条。纯取地址可设 false
  };
  /* ============================================================== */

  /* ---------------- 基础工具 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function b64ToBytes(b64) {
    var bin = window.atob(String(b64).replace(/\s+/g, ''));
    var u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }

  // UTF-8 -> base64（等价于原版的 btoa(unescape(encodeURIComponent(s))))
  function utf8ToB64(str) {
    var bytes = new TextEncoder().encode(String(str));
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return window.btoa(bin);
  }

  /* ---------------- 解密（AES-128-CBC） ----------------
   * 密文 = base64( IV[16字节] + 密文 )
   * key  = ascii("5V&RoR%Jf@pJPydF")
   * 明文 = JSON：{ host, comic_name, chapter_title, chapter_images: [...], images_hosts: [...] }
   */
  function decryptByWebCrypto(b64) {
    var c = window.crypto;
    var subtle = c && (c.subtle || c.webkitSubtle);
    if (!subtle || !window.TextDecoder) return null;
    var raw = b64ToBytes(b64);
    return subtle
      .importKey('raw', new TextEncoder().encode(CFG.aesKey), { name: 'AES-CBC' }, false, ['decrypt'])
      .then(function (key) {
        return subtle.decrypt({ name: 'AES-CBC', iv: raw.subarray(0, 16) }, key, raw.subarray(16));
      })
      .then(function (buf) {
        return JSON.parse(new TextDecoder('utf-8').decode(buf));
      });
  }

  function decryptByCryptoJS(b64) {
    var C = window.CryptoJS;
    if (!C || !C.AES || !C.lib || !C.lib.WordArray) return null;
    var raw = b64ToBytes(b64);
    var out = C.AES.decrypt(
      { ciphertext: C.lib.WordArray.create(raw.subarray(16)) },
      C.enc.Utf8.parse(CFG.aesKey),
      { iv: C.lib.WordArray.create(raw.subarray(0, 16)), mode: C.mode.CBC, padding: C.pad.Pkcs7 }
    );
    return JSON.parse(out.toString(C.enc.Utf8));
  }

  function getParams() {
    var p = window.params;
    if (!p) return Promise.reject(new Error('页面里没有 params 变量，不是章节页？'));
    if (typeof p === 'object') return Promise.resolve(p); // 原版 cms.js 已经解密过了

    var b64 = String(p);
    var done = decryptByWebCrypto(b64);
    if (done) {
      return done['catch'](function () {
        var r = decryptByCryptoJS(b64);
        if (!r) throw new Error('解密失败：浏览器无 crypto.subtle，也没加载 crypto-js');
        return r;
      });
    }
    var legacy = decryptByCryptoJS(b64);
    if (legacy) return Promise.resolve(legacy);
    return Promise.reject(new Error('解密失败：浏览器无 crypto.subtle，也没加载 crypto-js'));
  }

  /* ---------------- 拼真实图片地址 ---------------- */
  function buildUrl(item, data) {
    var p = String(item == null ? '' : item);
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(p)) return p; // 已是绝对地址（本站在用这种）
    var host = CFG.host || data.images_domain || (data.images_hosts || [])[0] || data.cdnurl || '';
    var path = data.images_base64 ? utf8ToB64(p) : p;
    return host ? host.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '') : p;
  }

  /* ---------------- 渲染：src 直接等于真实地址 ---------------- */
  function render(box, data) {
    var list = (data && data.chapter_images) || [];
    if (!list.length) {
      box.innerHTML = '<div class="chapter-tips">暂无章节图片</div>';
      return;
    }

    var real = [], i;
    for (i = 0; i < list.length; i++) real.push(buildUrl(list[i], data));

    var altBase = [data.comic_name, data.chapter_title].filter(Boolean).join(' ');
    var keep = CFG.keepSize ? ' style="min-height:160px"' : '';
    var html = '';
    for (i = 0; i < real.length; i++) {
      html +=
        '<div class="chapter-image" data-index="' + i + '"' + keep + '>' +
        '<img src="' + esc(real[i]) + '" alt="' + esc(altBase + ' ' + (i + 1)) + '">' +
        '</div>';
    }

    if (box.classList) {
      box.classList.remove('chapter-image-placeholder', 'reader-stage', 'loading');
      box.classList.add('chapter-images');
    }
    box.innerHTML = html;
    box.setAttribute('data-hgm-done', '1');

    // 地址清单，控制台可直接 copy(HGM_IMAGES.join('\n'))
    window.HGM_IMAGES = real;
    window.HGM_PARAMS = data;

    var total = document.querySelector('.chapter-total');
    if (total) total.textContent = real.length;
  }

  function start(box) {
    if (!box || box.getAttribute('data-hgm-done')) return Promise.resolve();
    box.setAttribute('data-hgm-done', '1');

    return getParams()
      .then(function (data) {
        var pageHost = (window.location && window.location.host) || '';
        if (data.host && pageHost && data.host !== pageHost) {
          console.warn('[hgm] 密文签发给 ' + data.host + '，当前 ' + pageHost);
        }
        render(box, data);
      })
      ['catch'](function (e) {
        box.removeAttribute('data-hgm-done');
        box.innerHTML = '<div class="chapter-tips">图片地址解析失败：' + esc(e.message) + '</div>';
        console.error('[haoguoman_cms]', e);
      });
  }

  /* ---------------- 兼容原 CMS 接口（global.min.js 会调用） ---------------- */
  var CMS = window.CMS || {};
  window.CMS = CMS;

  CMS.init = function () {
    start(document.querySelector('.chapter-images'));
  };

  CMS.chapter = CMS.chapter || {};
  CMS.chapter.init = function (el) {
    var box = el && el.jquery ? el[0] : el || document.querySelector('.chapter-images');
    start(box);
  };

  // 阅读进度 “3/18”
  CMS.chapter.no = function () {
    var nodes = document.querySelectorAll('.chapter-image');
    if (!nodes.length) return;
    var label = document.querySelector('.j-read-i');
    if (!label) return;
    var update = function () {
      var idx = 1;
      for (var i = 0; i < nodes.length; i++) {
        var r = nodes[i].getBoundingClientRect();
        if (r.bottom > 0) { idx = i + 1; break; }
      }
      label.textContent = idx;
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  };

  // 末尾追加“下一话”
  CMS.chapter.next = function () {
    var detail = document.querySelector('.chapter-detail');
    if (!detail || detail.querySelector('[data-reader-next]')) return;
    var a = document.querySelector('.j-chapter-next');
    var href = a ? a.getAttribute('href') : '';
    if (!href || href.indexOf('javascript') === 0) return;
    var box = document.createElement('div');
    box.className = 'chapter-next';
    box.setAttribute('data-reader-next', '');
    box.innerHTML = '<a class="button is-warning is-rounded" href="' + esc(href) + '">下一话</a>';
    detail.appendChild(box);
  };

  CMS.cookie = {
    get: function (name) {
      var parts = String(document.cookie || '').split('; ');
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].indexOf(name + '=') === 0) {
          try { return decodeURIComponent(parts[i].slice(name.length + 1)); } catch (e) { return null; }
        }
      }
      return null;
    },
    set: function (name, value) {
      if (!/^[a-zA-Z0-9_]+$/.test(name)) return;
      var v = encodeURIComponent(String(value));
      if (v.length > 3600) return;
      document.cookie = name + '=' + v + '; Max-Age=2592000; Path=/; SameSite=Lax';
    },
    clear: function (name) {
      if (!/^[a-zA-Z0-9_]+$/.test(name)) return;
      document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax';
    }
  };

  CMS.history = {
    add: function () {
      var p = window.HGM_PARAMS;
      if (!p || !p.comic_id || p.comic_status !== 'normal') return;
      var d = new Date();
      var stamp = [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()].join('-');
      var row = [p.comic_id, p.comic_name, p.comic_image || '', p.comic_url || '',
        p.chapter_id || p.chapter_url, p.chapter_title, p.chapter_url || '', stamp].map(function (x) {
        return String(x == null ? '' : x).replace(/\^\^|###/g, ' ').slice(0, 500);
      });
      var rows = (CMS.cookie.get('_history') || '').split('###').filter(Boolean).map(function (r) {
        return r.split('^^');
      }).filter(function (r) { return r[0] !== row[0]; });
      rows.unshift(row);
      CMS.cookie.set('_history', rows.slice(0, 20).map(function (r) { return r.join('^^'); }).join('###'));
    },
    get: function () { /* 首页“继续阅读”用，章节页不需要 */ },
    show: function () { /* 同上 */ }
  };

  /* ---------------- 启动 ---------------- */
  var boot = function () {
    start(document.querySelector('.chapter-images'));
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  // $(function(){ CMS.init(); global.init() }) 里还会再调一次，start() 有幂等保护
})(window, document);
