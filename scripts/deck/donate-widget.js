/* Live donations for the deck: a fixed QR in the top-right corner on every slide (below the
   language toggle), and a toast that drops in under it when someone gives, then fades out.
   Kept in its own file so index.html only needs one <script> line.
   Polls window.DONATE_API (or ?api=), defaulting to DONATE_URL.
   If window.SITE_URL is set, a matching "official website" QR card sits in the bottom-left. */
(function () {
  var CSS = `
.dw{position:fixed;z-index:6;right:max(16px,env(safe-area-inset-right,0px));top:calc(max(12px,env(safe-area-inset-top,0px)) + 44px);
  display:flex;flex-direction:column;align-items:flex-end;gap:10px;pointer-events:none}
.dw-toasts{display:flex;flex-direction:column;align-items:flex-end;gap:8px}
.dw-toast{pointer-events:auto;width:clamp(240px,20vw,340px);border-radius:20px;padding:14px 18px;text-align:left;border:1px solid var(--accent);
  background:radial-gradient(120% 90% at 100% 0%,rgba(143,184,255,.30),transparent 60%),#0c1830;box-shadow:0 20px 60px -20px rgba(69,134,240,.7);
  animation:dw-in .6s var(--ease) both}
.dw-toast.out{animation:dw-out .9s var(--ease) both}
.dw-toast .t{font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent-2)}
.dw-toast .w{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-top:4px;font-size:clamp(16px,1.3vw,22px);font-weight:500}
.dw-toast .w b{font-weight:300;color:var(--accent-2);font-variant-numeric:tabular-nums;flex:none}
.dw-toast .w span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dw-toast .m{margin:4px 0 0;font-size:clamp(13px,1vw,16px);color:var(--muted);overflow-wrap:anywhere}
@keyframes dw-in{from{opacity:0;transform:translateY(-16px) scale(.96)}to{opacity:1;transform:none}}
@keyframes dw-out{to{opacity:0;transform:translateY(8px)}}
.dw-qr{pointer-events:auto;display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 14px 12px;border-radius:24px;
  background:var(--surface);border:1px solid var(--border-strong)}
.dw-qr .code{width:clamp(180px,14vw,280px);aspect-ratio:1;border-radius:16px;background:#fff;padding:10px;animation:pulse 2.6s ease-out infinite}
.dw-qr .code img,.dw-qr .code canvas{width:100%!important;height:auto!important;display:block}
.dw-qr .lbl{font-family:var(--font-mono);font-size:clamp(11px,.8vw,14px);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.dw-total{display:flex;align-items:baseline;justify-content:space-between;gap:8px;width:100%;padding:0 4px}
.dw-qr[hidden],.dw-total[hidden],.dw-qr .code[hidden],.dw-qr .scan[hidden]{display:none}
.dw-total .n{font-size:clamp(16px,1.25vw,24px);font-weight:400;letter-spacing:-0.01em;line-height:1.2;font-variant-numeric:tabular-nums;
  background:linear-gradient(100deg,var(--accent) 10%,var(--accent-2) 90%);-webkit-background-clip:text;background-clip:text;color:transparent}
.dw-total.bump .n{animation:dw-bump 1.2s var(--ease)}
@keyframes dw-bump{30%{filter:drop-shadow(0 0 10px rgba(69,134,240,.9))}}
@media (prefers-reduced-motion: reduce){.dw-toast,.dw-toast.out,.dw-qr .code,.dw-total.bump .n{animation:none}}
/* Official-website QR: mirrors the donate card, pinned bottom-left. */
.dw-site{position:fixed;z-index:6;left:max(16px,env(safe-area-inset-left,0px));bottom:calc(max(16px,env(safe-area-inset-bottom,0px)) + 56px)}
.dw-site .code{width:var(--dwq,clamp(110px,8vw,150px))}
.dw-site[hidden]{display:none}
/* Keep the corner QR on every slide, including ones that hide it via body.bigqr in index.html. */
html body #dw #dw-qr{opacity:1!important;visibility:visible!important}
`;

  var MARKUP = `
<aside class="dw" id="dw" aria-label="Live donations">
  <div class="dw-qr" id="dw-qr" hidden>
    <div class="code" id="dw-code"></div>
    <span class="lbl scan" id="dw-scan"><span class="zh">掃碼捐贈</span><span class="en">Scan to give</span></span>
    <div class="dw-total" id="dw-total" hidden>
      <span class="lbl"><span class="zh">已募得</span><span class="en">Raised</span></span>
      <span class="n" id="dw-total-n"></span>
    </div>
  </div>
  <div class="dw-toasts" id="dw-toasts" role="status" aria-live="polite"></div>
</aside>
<aside class="dw-qr dw-site" id="dw-site" aria-label="Official website" hidden>
  <div class="code" id="dw-site-code"></div>
  <span class="lbl"><span class="zh">官方網站</span><span class="en">Visit our site</span></span>
</aside>`;

  var POLL_MS = 3000, TIMEOUT_MS = 5000, SHOW_MS = 5000, COUNT_MS = 1200;

  var style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  document.body.insertAdjacentHTML('beforeend', MARKUP);

  var site = window.DONATE_URL || '';
  var api = window.DONATE_API || site;
  var apiParam = /[?&]api=([^&#]+)/.exec(location.search);
  if (apiParam) { try { api = decodeURIComponent(apiParam[1]); } catch { /* keep the default */ } }
  api = api.replace(/\/$/, '');

  var qr = document.getElementById('dw-qr');
  var codeEl = document.getElementById('dw-code');
  var scanEl = document.getElementById('dw-scan');
  var toasts = document.getElementById('dw-toasts');
  var totalBox = document.getElementById('dw-total');
  var totalEl = document.getElementById('dw-total-n');

  var hasQr = false;
  if (site && window.QRCode) {
    try {
      new QRCode(codeEl, {
        text: site, width: 280, height: 280, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M,
      });
      hasQr = true;
    } catch { /* fall through: no QR */ }
  }
  var siteUrl = window.SITE_URL || '';
  if (siteUrl && window.QRCode) {
    try {
      new QRCode(document.getElementById('dw-site-code'), {
        text: siteUrl, width: 280, height: 280, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M,
      });
      document.getElementById('dw-site').hidden = false;
    } catch { /* no site QR */ }
  }

  codeEl.hidden = scanEl.hidden = !hasQr;
  qr.hidden = !hasQr; // shown later if only the total is available

  if (!api) return;

  function twd(n) { return 'NT$' + Math.round(n).toLocaleString('en-US'); }
  function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

  // Count up from whatever is on screen right now to the new total.
  var target = null, current = 0, frame;
  function setTotal(next) {
    if (target === null) {
      target = current = next;
      totalEl.textContent = twd(next);
      totalBox.hidden = false;
      qr.hidden = false;
      return;
    }
    if (next === target) return;
    if (next > target) {
      totalBox.classList.remove('bump');
      void totalBox.offsetWidth;
      totalBox.classList.add('bump');
    }
    var from = current, start = performance.now();
    target = next;
    cancelAnimationFrame(frame);
    (function step(now) {
      var t = Math.min(1, (now - start) / COUNT_MS);
      current = from + (next - from) * (1 - Math.pow(1 - t, 3));
      totalEl.textContent = twd(current);
      if (t < 1) frame = requestAnimationFrame(step);
    })(start);
  }

  function toast(t) {
    var el = document.createElement('div');
    el.className = 'dw-toast';
    el.innerHTML =
      '<div class="t"><span class="zh">剛剛捐贈</span><span class="en">Just donated</span></div>' +
      '<div class="w"><span>' + esc(t.name || 'Anonymous') + '</span><b>+' + twd(t.amount) + '</b></div>' +
      (t.message ? '<p class="m">' + esc(t.message) + '</p>' : '');
    toasts.appendChild(el);
    // Short screens fit fewer toasts under the QR card.
    var max = window.innerHeight < 900 ? 2 : 3;
    while (toasts.children.length > max) toasts.removeChild(toasts.firstChild);
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { el.remove(); }, 900);
    }, SHOW_MS);
  }

  // `baseline` means the next response only records what's already there (first load, or
  // returning to the tab) instead of toasting gifts that happened while nobody was watching.
  var seen = new Set(), baseline = true, timer, generation = 0;
  function poll() {
    clearTimeout(timer);
    var gen = ++generation;
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var abortT = ctrl && setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
    fetch(api + '/api/balance', { cache: 'no-store', signal: ctrl && ctrl.signal })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        if (gen !== generation || !d) return;
        if (typeof d.balance === 'number') setTotal(d.balance);
        var recent = Array.isArray(d.recent) ? d.recent : [];
        var fresh = recent.filter(function (t) { return !seen.has(t.id); });
        fresh.forEach(function (t) { seen.add(t.id); });
        if (!baseline) fresh.reverse().forEach(toast);
        baseline = false;
      })
      .catch(function () {})
      .then(function () {
        clearTimeout(abortT);
        if (gen === generation && !document.hidden) timer = setTimeout(poll, POLL_MS);
      });
  }
  document.addEventListener('visibilitychange', function () {
    clearTimeout(timer);
    if (document.hidden) { generation++; return; } // drop any in-flight response
    baseline = true;
    poll();
  });
  poll();
})();
