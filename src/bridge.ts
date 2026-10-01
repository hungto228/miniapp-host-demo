// Script chạy trong WebView trước khi trang load.
// - Gom console.log/warn/error + lỗi JS, gửi về host theo lô mỗi 300ms.
// - window.host.getSession(): Promise trả { token, expiresAt, user }.
// Không chứa token: host chỉ trả session sau khi kiểm tra origin.
export const BRIDGE_SCRIPT = `
(function () {
  if (window.host) return;
  var queue = [];
  var waiting = [];
  function send(m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
  function fmt(a) {
    if (typeof a === 'string') return a;
    if (a instanceof Error) return a.stack || a.message;
    try { return JSON.stringify(a); } catch (e) { return String(a); }
  }
  function push(level, args) {
    if (queue.length >= 50) return; // chống spam làm nghẽn bridge
    queue.push({ level: level, msg: [].map.call(args, fmt).join(' ').slice(0, 1000) });
  }
  ['log', 'warn', 'error'].forEach(function (level) {
    var orig = console[level];
    console[level] = function () { orig.apply(console, arguments); push(level, arguments); };
  });
  window.addEventListener('error', function (e) {
    push('error', [e.message + ' (' + e.filename + ':' + e.lineno + ')']);
  });
  window.addEventListener('unhandledrejection', function (e) {
    push('error', ['Unhandled rejection:', e.reason]);
  });
  setInterval(function () {
    if (queue.length) { send({ type: 'log', items: queue }); queue = []; }
  }, 300);
  window.host = {
    getSession: function () {
      return new Promise(function (resolve) {
        waiting.push(resolve);
        if (waiting.length === 1) send({ type: 'getSession' });
      });
    },
    _deliver: function (session) {
      var w = waiting; waiting = [];
      w.forEach(function (resolve) { resolve(session); });
    },
  };
})();
true;
`;
