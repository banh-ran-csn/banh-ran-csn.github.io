// Minimal Chrome DevTools Protocol driver shared by the browser test scripts (e2e, robust, layout, perf).
// One headless Chrome per run; each page() is a tab with its own viewport. No dependencies (Node 22 fetch/WebSocket).
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const vis = (sel) => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && !e.closest('[hidden]'); })()`;
export const txt = (sel) => `(document.querySelector(${JSON.stringify(sel)})?.innerText || '')`;

export function launch(port = 9231) {
  const chrome = process.env.CHROME;
  if (!chrome) throw new Error('set CHROME to a chrome-headless-shell binary');
  const proc = spawn(chrome, ['--no-sandbox', '--hide-scrollbars', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required',
    `--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1', 'about:blank'], { stdio: 'ignore' });
  const errors = [];
  const pages = {};

  async function page(label, url, width, height, { before = null } = {}) {
    let t;
    for (let i = 0; i < 50 && !t; i++) {
      try { t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json(); } catch { await sleep(200); }
    }
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener('open', r));
    let id = 0;
    const pending = new Map();
    const dialogs = [];
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
      if (m.method === 'Runtime.exceptionThrown') errors.push(`${label}: ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`);
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(`${label}: console.error ${m.params.args.map((a) => a.value ?? a.description).join(' ')}`);
      if (m.method === 'Page.javascriptDialogOpening') {
        dialogs.push(m.params.message);
        send('Page.handleJavaScriptDialog', { accept: true });
      }
    });
    const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Network.enable');
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    // Record every sound file the page asks to play.
    await send('Page.addScriptToEvaluateOnNewDocument', { source: '(() => { const A = window.Audio; window.__played = []; window.Audio = function (u) { window.__played.push(String(u)); return new A(u); }; })();' });
    if (before) await send('Page.addScriptToEvaluateOnNewDocument', { source: before });
    await send('Page.navigate', { url });
    const p = {
      label, send, dialogs,
      async eval(expr) {
        const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
        if (r.result?.exceptionDetails) throw new Error(`${label} eval: ${r.result.exceptionDetails.exception?.description}`);
        return r.result?.result?.value;
      },
      text: (sel) => p.eval(`document.querySelector(${JSON.stringify(sel)})?.innerText ?? null`),
      click: (sel) => p.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) throw new Error('no ${sel}'); if (e.disabled) throw new Error('disabled ${sel}'); e.click(); return true; })()`),
      async until(expr, what, ms = 15000) {
        const end = Date.now() + ms;
        while (Date.now() < end) { if (await p.eval(expr).catch(() => false)) return; await sleep(150); }
        throw new Error(`${label}: timed out waiting for ${what}`);
      },
      async shot(file) {
        await sleep(700); // let transitions finish
        const r = await send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(file, Buffer.from(r.result.data, 'base64'));
      },
      viewport: (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 }),
      offline: (on) => send('Network.emulateNetworkConditions', { offline: on, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }),
      cpu: (rate) => send('Emulation.setCPUThrottlingRate', { rate }),
      reload: () => send('Page.reload', { ignoreCache: true }),
    };
    pages[label] = p;
    return p;
  }

  async function dump() {
    for (const [k, p] of Object.entries(pages)) {
      console.log(k, await p.eval(`JSON.stringify({ phase: document.querySelector('#qLevel')?.innerText, banner: document.querySelector('#banner')?.innerText, net: document.querySelector('#netBanner')?.hidden, status: document.querySelector('#status')?.innerText, secs: document.querySelector('#secs')?.innerText, answered: document.querySelector('#answered')?.innerText, ctl: [...document.querySelectorAll('.controls .btn')].map((b) => b.innerText + (b.disabled ? '(x)' : '') + (b.hidden ? '(h)' : '')) })`).catch((x) => x.message));
    }
  }

  return { page, errors, pages, dump, close: () => proc.kill() };
}
