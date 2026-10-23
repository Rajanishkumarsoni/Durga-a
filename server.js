// Durga Enterprises: zero-dependency Node server (Node 18+). Run: node server.js
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const NOTIFY_WEBHOOK = process.env.NOTIFY_WEBHOOK || '';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const FILE = path.join(DATA_DIR, 'requests.json');
const SERVICES = ['Lighting installation', 'Switches & sockets', 'Electrical panels', 'Electrical repairs', 'Other'];
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };
fs.mkdirSync(DATA_DIR, { recursive: true });

const load = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; } };
const save = (rows) => { fs.writeFileSync(FILE + '.tmp', JSON.stringify(rows, null, 2)); fs.renameSync(FILE + '.tmp', FILE); };
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

function isAdmin(req) {
  if (!ADMIN_TOKEN) return false;
  const given = (req.headers.authorization || '').replace(/^Bearer /, '');
  const a = Buffer.from(given), b = Buffer.from(ADMIN_TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function readBody(req) {
  return new Promise((ok, no) => {
    let d = '';
    req.on('data', c => { d += c; if (d.length > 10000) { no(new Error('too big')); req.destroy(); } });
    req.on('end', () => { try { ok(JSON.parse(d || '{}')); } catch (e) { no(e); } });
  });
}
const hits = new Map(); // simple per-IP limit: 5 requests per hour
function limited(ip) {
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < 3600e3);
  list.push(now); hits.set(ip, list); return list.length > 5;
}

async function api(req, res, url) {
  if (req.method === 'POST' && url.pathname === '/api/requests') {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    if (limited(ip)) return json(res, 429, { error: 'Too many requests. Please try again later.' });
    let b; try { b = await readBody(req); } catch { return json(res, 400, { error: 'Invalid request.' }); }
    if (b.website) return json(res, 200, { ok: true }); // honeypot: bots fill this
    const name = clean(b.name, 80), phone = clean(b.phone, 20), service = clean(b.service, 40), message = clean(b.message, 1000);
    const digits = phone.replace(/\D/g, '');
    if (name.length < 2) return json(res, 400, { error: 'Please enter your name.' });
    if (digits.length < 10 || digits.length > 13) return json(res, 400, { error: 'Please enter a valid phone number.' });
    if (!SERVICES.includes(service)) return json(res, 400, { error: 'Please choose a service.' });
    const row = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), name, phone, service, message, status: 'new' };
    const rows = load(); rows.unshift(row); save(rows);
    if (NOTIFY_WEBHOOK) fetch(NOTIFY_WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: `New request: ${name}, ${phone}, ${service}. ${message}` }) }).catch(() => {});
    return json(res, 201, { ok: true });
  }
  if (!isAdmin(req)) return json(res, 401, { error: 'Unauthorized' });
  if (req.method === 'GET' && url.pathname === '/api/requests') return json(res, 200, load());
  const m = url.pathname.match(/^\/api\/requests\/([\w-]+)$/);
  if (m && req.method === 'PATCH') {
    const rows = load(), r = rows.find(x => x.id === m[1]);
    if (!r) return json(res, 404, { error: 'Not found' });
    r.status = r.status === 'done' ? 'new' : 'done'; save(rows); return json(res, 200, r);
  }
  if (m && req.method === 'DELETE') { save(load().filter(x => x.id !== m[1])); return json(res, 200, { ok: true }); }
  json(res, 404, { error: 'Not found' });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) return api(req, res, url).catch(() => json(res, 500, { error: 'Server error' }));
  let p = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[\/\\])+/, '');
  if (p === '/' || p === path.sep) p = '/index.html';
  const file = path.join(__dirname, 'public', p);
  if (!file.startsWith(path.join(__dirname, 'public'))) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  });
}).listen(PORT, () => console.log('Durga Enterprises running on port ' + PORT + (ADMIN_TOKEN ? '' : ' (set ADMIN_TOKEN to enable the admin page)')));
