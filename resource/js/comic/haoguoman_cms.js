/*!
 * haoguoman_cms.js  v3.0.0-sync
 * 替代 /static/js/cms-2.0.1.min.js：解密 params，把整话图片地址一次性写进 <img src>。
 * 与 v2.x 的关键区别：**全程同步**。
 * v2 用 crypto.subtle 解密，Promise 要几毫秒后才 resolve；如果容器上已被写入“已完成”标记，
 * WebView / 保存工具在这几毫秒内抓 DOM 快照，就会得到“有标记、没图片”的文件，而且重新打开
 * 后会被标记挡住、永远不再渲染。本版改为内置 AES-128 同步实现，脚本执行完的同一帧img即就位。
 * 用法：
 *   <script src="https://page.44477444.xyz/resource/js/comic/haoguoman_cms.js?v=3.0.0"></script>
 */
(function (window, document) {
  'use strict';

  /* ======================= 版本标记（排查缓存用） ======================= */
  var VERSION = '3.0.0-sync';
  window.HGM_VERSION = VERSION;
  try {
    console.log('%c[haoguoman_cms] v' + VERSION + ' 已加载', 'color:#09f;font-weight:bold');
  } catch (e) {}
  /* =================================================================== */

  /* ============================ 配置区 ============================ */
  var CFG = {
    host: '',                    // 覆盖图床域名，留空则用密文里的 images_hosts[0]
    aesKey: '5V&RoR%Jf@pJPydF',  // 站点换 key 时改这里
    keepSize: true,              // 图片 403 时给个最小高度，防止整页塌成一条
    minHeight: 160
  };
  /* ============================================================== */

  /* ========================= AES-128-CBC（同步） ========================= */
  /* AES-BEGIN */

  var SBOX = hexToBytes(
    '637c777bf26b6fc53001672bfed7ab76ca82c97dfa5947f0add4a2af9ca472c0' +
    'b7fd9326363ff7cc34a5e5f171d8311504c723c31896059a071280e2eb27b275' +
    '09832c1a1b6e5aa0523bd6b329e32f8453d100ed20fcb15b6acbbe394a4c58cf' +
    'd0efaafb434d338545f9027f503c9fa851a3408f929d38f5bcb6da2110fff3d2' +
    'cd0c13ec5f974417c4a77e3d645d197360814fdc222a908846eeb814de5e0bdb' +
    'e0323a0a4906245cc2d3ac629195e479e7c8376d8dd54ea96c56f4ea657aae08' +
    'ba78252e1ca6b4c6e8dd741f4bbd8b8a703eb5664803f60e613557b986c11d9e' +
    'e1f8981169d98e949b1e87e9ce5528df8ca1890dbfe6426841992d0fb054bb16'
  );
  var INV_SBOX = null;
  var RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

  function hexToBytes(hex) {
    var n = hex.length >> 1;
    var out = new Uint8Array(n);
    for (var i = 0; i < n; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
    return out;
  }

  function invSbox() {
    if (INV_SBOX) return INV_SBOX;
    INV_SBOX = new Uint8Array(256);
    for (var i = 0; i < 256; i++) INV_SBOX[SBOX[i]] = i;
    return INV_SBOX;
  }

  // GF(2^8) 乘法
  function gm(a, b) {
    var p = 0;
    for (var i = 0; i < 8; i++) {
      if (b & 1) p ^= a;
      var hi = a & 0x80;
      a = (a << 1) & 0xff;
      if (hi) a ^= 0x1b;
      b >>= 1;
    }
    return p & 0xff;
  }

  function expandKey(key) {
    var w = new Uint8Array(176);
    w.set(key, 0);
    var t = new Uint8Array(4);
    for (var i = 4; i < 44; i++) {
      t[0] = w[i * 4 - 4]; t[1] = w[i * 4 - 3]; t[2] = w[i * 4 - 2]; t[3] = w[i * 4 - 1];
      if (i % 4 === 0) {
        var t0 = t[0];
        t[0] = SBOX[t[1]] ^ RCON[(i >> 2) - 1];
        t[1] = SBOX[t[2]];
        t[2] = SBOX[t[3]];
        t[3] = SBOX[t0];
      }
      for (var j = 0; j < 4; j++) w[i * 4 + j] = w[(i - 4) * 4 + j] ^ t[j];
    }
    return w;
  }

  function addRoundKey(s, w, round) {
    for (var i = 0; i < 16; i++) s[i] ^= w[round * 16 + i];
  }

  function invSubBytes(s) {
    var inv = invSbox();
    for (var i = 0; i < 16; i++) s[i] = inv[s[i]];
  }

  // 状态按列优先：state[4*c + r]
  function invShiftRows(s) {
    for (var r = 1; r < 4; r++) {
      var a0 = s[r], a1 = s[4 + r], a2 = s[8 + r], a3 = s[12 + r];
      var b = [a0, a1, a2, a3];
      for (var c = 0; c < 4; c++) s[4 * c + r] = b[(c - r + 4) & 3]; // 每行右移 r 位
    }
  }

  function invMixColumns(s) {
    for (var c = 0; c < 4; c++) {
      var i = c * 4;
      var a0 = s[i], a1 = s[i + 1], a2 = s[i + 2], a3 = s[i + 3];
      s[i] = gm(a0, 14) ^ gm(a1, 11) ^ gm(a2, 13) ^ gm(a3, 9);
      s[i + 1] = gm(a0, 9) ^ gm(a1, 14) ^ gm(a2, 11) ^ gm(a3, 13);
      s[i + 2] = gm(a0, 13) ^ gm(a1, 9) ^ gm(a2, 14) ^ gm(a3, 11);
      s[i + 3] = gm(a0, 11) ^ gm(a1, 13) ^ gm(a2, 9) ^ gm(a3, 14);
    }
  }

  function decryptBlock(input, w, out) {
    var s = new Uint8Array(16);
    for (var i = 0; i < 16; i++) s[i] = input[i];
    addRoundKey(s, w, 10);
    for (var round = 9; round >= 1; round--) {
      invShiftRows(s);
      invSubBytes(s);
      addRoundKey(s, w, round);
      invMixColumns(s);
    }
    invShiftRows(s);
    invSubBytes(s);
    addRoundKey(s, w, 0);
    for (var k = 0; k < 16; k++) out[k] = s[k];
  }

  // 明文 = AES-128-CBC(key, iv, ct)，PKCS#7 去填充
  function aesCbcDecrypt(keyBytes, iv, ct) {
    var w = expandKey(keyBytes);
    var blocks = ct.length >> 4;
    var out = new Uint8Array(blocks * 16);
    var tmp = new Uint8Array(16);
    var prev = iv;
    for (var b = 0; b < blocks; b++) {
      var off = b << 4;
      decryptBlock(ct.subarray(off, off + 16), w, tmp);
      for (var i = 0; i < 16; i++) out[off + i] = tmp[i] ^ prev[i];
      prev = ct.subarray(off, off + 16);
    }
    // 去 PKCS#7
    var pad = out[out.length - 1];
    if (pad < 1 || pad > 16 || pad > out.length) throw new Error('bad padding');
    return out.subarray(0, out.length - pad);
  }

  function b64ToBytes(b64) {
    var s = String(b64).replace(/\s+/g, '');
    var bin = window.atob(s);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function utf8Decode(bytes) {
    if (window.TextDecoder) {
      try { return new TextDecoder('utf-8').decode(bytes); } catch (e) {}
    }
    var out = '', i = 0;
    while (i < bytes.length) {
      var c = bytes[i++];
      if (c < 0x80) out += String.fromCharCode(c);
      else if (c < 0xe0) out += String.fromCharCode(((c & 0x1f) << 6) | (bytes[i++] & 0x3f));
      else if (c < 0xf0) out += String.fromCharCode(((c & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f));
      else {
        var cp = ((c & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
        cp -= 0x10000;
        out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
      }
    }
    return out;
  }

  /* AES-END */
  /* ====================================================================== */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // 同步解密：base64(IV[16] + 密文) -> JSON
  function parseParams() {
    var p = window.params;
    if (!p) throw new Error('页面里没有 params 变量');
    if (typeof p === 'object') return p;           // 已被别的脚本解过
    var raw = b64ToBytes(p);
    if (raw.length < 32 || ((raw.length - 16) & 15)) throw new Error('密文长度异常：' + raw.length);
    var key = new Uint8Array(CFG.aesKey.length);
    for (var i = 0; i < key.length; i++) key[i] = CFG.aesKey.charCodeAt(i) & 0xff;
    var plain = aesCbcDecrypt(key, raw.subarray(0, 16), raw.subarray(16));
    return JSON.parse(utf8Decode(plain));
  }

  function buildUrl(item, data) {
    var p = String(item == null ? '' : item);
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(p)) return p;
    var host = CFG.host || data.images_domain || (data.images_hosts || [])[0] || data.cdnurl || '';
    if (!host) return p;
    var path = p;
    if (data.images_base64) {
      var bytes = utf8Bytes(p), bin = '';
      for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      path = window.btoa(bin);
    }
    return host.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
  }

  function utf8Bytes(str) {
    var s = String(str), out = [], i, c;
    for (i = 0; i < s.length; i++) {
      c = s.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
        var cp = 0x10000 + ((c - 0xd800) << 10) + (s.charCodeAt(++i) - 0xdc00);
        out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
      } else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return new Uint8Array(out);
  }

  /* ---------------- 渲染：src 直接等于真实地址 ---------------- */
  function render(box, data) {
    var list = (data && data.chapter_images) || [];
    if (!list.length) {
      box.innerHTML = '<div class="chapter-tips">暂无章节图片</div>';
      return 0;
    }
    var real = [], i;
    for (i = 0; i < list.length; i++) real.push(buildUrl(list[i], data));

    var altBase = [data.comic_name, data.chapter_title].filter(Boolean).join(' ');
    var keep = CFG.keepSize ? ' style="min-height:' + CFG.minHeight + 'px"' : '';
    var html = '';
    for (i = 0; i < real.length; i++) {
      html += '<div class="chapter-image" data-index="' + i + '"' + keep + '>' +
        '<img src="' + esc(real[i]) + '" alt="' + esc(altBase + ' ' + (i + 1)) + '">' +
        '</div>';
    }

    if (box.classList) {
      box.classList.remove('chapter-image-placeholder', 'reader-stage', 'loading');
      box.classList.add('chapter-images');
    }
    box.innerHTML = html;
    window.HGM_IMAGES = real;
    window.HGM_PARAMS = data;
    window.HGM_COUNT = real.length;

    var total = document.querySelector('.chapter-total');
    if (total) total.textContent = real.length;
    return real.length;
  }

  /**
   * 同步执行。三种情况都会重新渲染：
   *   1. 没有标记
   *   2. 有标记但容器里没有 <img>（被过早快照的坏状态）
   *   3. 有标记但参数被换过（换章节复用同一份 DOM）
   */
  function start(box) {
    if (!box) return false;
    var done = box.getAttribute('data-hgm-done') === '1';
    if (done && box.querySelector('img')) return false;   // 真正完成了才跳过

    try {
      var data = parseParams();
      var host = (window.location && window.location.host) || '';
      if (data.host && host && data.host !== host) {
        try { console.warn('[hgm] 密文签发给 ' + data.host + '，当前 ' + host); } catch (e) {}
      }
      var n = render(box, data);
      box.setAttribute('data-hgm-done', '1');             // 只在成功后打标记
      box.removeAttribute('data-hgm-error');
      window.HGM_ERROR = '';
      window.HGM_READY = true;
      try { document.dispatchEvent(new Event('hgm:ready')); } catch (e) {}
      return n > 0;
    } catch (e) {
      // 失败：不打成功标记，把原因写进 DOM，方便在保存下来的页面里直接看到
      window.HGM_READY = false;
      window.HGM_ERROR = e && e.message ? e.message : String(e);
      box.removeAttribute('data-hgm-done');
      box.setAttribute('data-hgm-error', window.HGM_ERROR);
      box.innerHTML = '<div class="chapter-tips">图片地址解析失败：' + esc(window.HGM_ERROR) + '</div>';
      try { console.error('[haoguoman_cms]', e); } catch (e2) {}
      try { document.dispatchEvent(new Event('hgm:error')); } catch (e3) {}
      return false;
    }
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
    get: function () {},
    show: function () {}
  };

  /* ---------------- 启动：同步、且多个时机兜底 ---------------- */
  function boot() {
    start(document.querySelector('.chapter-images'));
  }

  boot(); // 脚本在 </body> 前，容器与 params 都已就绪 —— 同一帧完成渲染
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  window.addEventListener('load', boot);
})(window, document);
