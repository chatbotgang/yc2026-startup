/* Live donations for the deck: a fixed QR in the top-right corner on every slide (below the
   language toggle), and a toast that drops in under it when someone gives, then fades out.
   Kept in its own file so index.html only needs one <script> line.
   Polls window.DONATE_API (or ?api=), defaulting to DONATE_URL. */
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
.dw-total[hidden]{display:none}
.dw-total .n{font-size:clamp(16px,1.25vw,24px);font-weight:400;letter-spacing:-0.01em;line-height:1.2;font-variant-numeric:tabular-nums;
  background:linear-gradient(100deg,var(--accent) 10%,var(--accent-2) 90%);-webkit-background-clip:text;background-clip:text;color:transparent}
.dw-total.bump .n{animation:dw-bump 1.2s var(--ease)}
@keyframes dw-bump{30%{filter:drop-shadow(0 0 10px rgba(69,134,240,.9))}}
@media (prefers-reduced-motion: reduce){.dw-toast,.dw-toast.out,.dw-qr .code,.dw-total.bump .n{animation:none}}
`;

  var MARKUP = `
<aside class="dw" id="dw" aria-label="Live donations">
  <div class="dw-qr" id="dw-qr" hidden>
    <div class="code" id="dw-code"></div>
    <span class="lbl"><span class="zh">掃碼捐贈</span><span class="en">Scan to give</span></span>
    <div class="dw-total" id="dw-total" hidden>
      <span class="lbl"><span class="zh">已募得</span><span class="en">Raised</span></span>
      <span class="n" id="dw-total-n" aria-live="polite"></span>
    </div>
  </div>
  <div class="dw-toasts" id="dw-toasts" role="status" aria-live="polite"></div>
</aside>`;

  var POLL_MS = 3000, SHOW_MS = 5000, MAX_TOASTS = 3;

  var style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  document.body.insertAdjacentHTML('beforeend', MARKUP);

  var site = (window.DONATE_URL || '').replace(/\/$/, '');
  var apiParam = /[?&]api=([^&#]+)/.exec(location.search);
  var api = (apiParam ? decodeURIComponent(apiParam[1]) : window.DONATE_API || site).replace(/\/$/, '');
  var toasts = document.getElementById('dw-toasts');
  var qr = document.getElementById('dw-qr');

  var codeEl = document.getElementById('dw-code');
  if (site && window.QRCode) {
    new QRCode(codeEl, {
      text: site, width: 280, height: 280, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M,
    });
    qr.hidden = false;
  } else {
    codeEl.hidden = true;
  }

  if (!api) return;
  var totalBox = document.getElementById('dw-total');
  var totalEl = document.getElementById('dw-total-n');
  var shown = null, frame;

  // Count up from the shown total to the new one.
  function setTotal(next) {
    if (shown === null) {
      shown = next;
      totalEl.textContent = twd(next);
      totalBox.hidden = false;
      qr.hidden = false;
      return;
    }
    if (next === shown) return;
    var from = shown, start = performance.now();
    shown = next;
    if (next > from) {
      totalBox.classList.remove('bump');
      void totalBox.offsetWidth;
      totalBox.classList.add('bump');
    }
    cancelAnimationFrame(frame);
    (function step(now) {
      var t = Math.min(1, (now - start) / 1200);
      totalEl.textContent = twd(from + (next - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(step);
    })(start);
  }

  function twd(n) { return 'NT$' + Math.round(n).toLocaleString('en-US'); }
  function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

  function toast(t) {
    var el = document.createElement('div');
    el.className = 'dw-toast';
    el.innerHTML =
      '<div class="t"><span class="zh">剛剛捐贈</span><span class="en">Just donated</span></div>' +
      '<div class="w"><span>' + esc(t.name || 'Anonymous') + '</span><b>+' + twd(t.amount) + '</b></div>' +
      (t.message ? '<p class="m">' + esc(t.message) + '</p>' : '');
    toasts.appendChild(el);
    while (toasts.children.length > MAX_TOASTS) toasts.removeChild(toasts.firstChild);
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { el.remove(); }, 900);
    }, SHOW_MS);
  }

  var seen = null, timer;
  function poll() {
    fetch(api + '/api/balance', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        var recent = (d && d.recent) || [];
        if (typeof d.balance === 'number') setTotal(d.balance);
        if (seen === null) { // first load: remember existing gifts, don't replay them
          seen = new Set(recent.map(function (t) { return t.id; }));
          return;
        }
        recent.filter(function (t) { return !seen.has(t.id); }).reverse().forEach(function (t) {
          seen.add(t.id);
          toast(t);
        });
      })
      .catch(function () {})
      .then(function () { if (!document.hidden) timer = setTimeout(poll, POLL_MS); });
  }
  document.addEventListener('visibilitychange', function () {
    clearTimeout(timer);
    if (!document.hidden) poll();
  });
  poll();
})();
