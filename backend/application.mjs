import http from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { presetName, validateRecipe } from '../preset-model.js';

const digest = value => createHash('sha256').update(value).digest();
const cookieName = 'princess_session';
const lifetime = 7 * 86400 * 1000;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const publicFiles = new Set(['/login.html', '/login.js', '/access.css', '/pwa.js', '/pwa.css', '/service-worker.js', '/offline.html', '/manifest.webmanifest', '/assets/mascot.svg']);
const isPublicRoute = route => publicFiles.has(route) || route.startsWith('/assets/pwa/');
const editorExtensions = new Set(['mobile-editor.js', 'mobile-editor.css', 'text-editor.js']);
const rootFiles = new Set(['index.html', 'app.js', 'styles.css', 'studio.css', 'camera-library.js', 'controls.js', 'decorations.js', 'model.js', 'photo-engine.js', 'processing.js', 'renderer.js', 'stickers.js', 'studio-ui.js', 'processor-worker.js', 'preset-model.js', 'presets.js', 'presets.css']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createRequestHandler({ root, store, password = '1309', origin, production = false, dynamicOrigin = false, sessionSecret }) {
  if (production && !dynamicOrigin && (!origin || new URL(origin).protocol !== 'https:')) throw new Error('APP_ORIGIN HTTPS é obrigatório em produção.');
  if (sessionSecret && sessionSecret.length < 32) throw new Error('APP_SESSION_SECRET precisa ter pelo menos 32 caracteres.');
  const sessions = new Map(), revoked = new Map(), attempts = new Map();
  const passwordHash = digest(password);
  const prune = () => { const now = Date.now(); for (const [k,v] of sessions) if (v <= now) sessions.delete(k); for (const [k,v] of revoked) if (v <= now) revoked.delete(k); for (const [k,v] of attempts) if (v.until <= now) attempts.delete(k); };
  const tokenFrom = request => request.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1) || '';
  const tokenKey = token => digest(token).toString('hex');
  const sign = payload => createHmac('sha256', sessionSecret).update(payload).digest('base64url');
  const issueToken = expiry => {
    if (!sessionSecret) return randomBytes(32).toString('hex');
    const payload = Buffer.from(JSON.stringify({ expiry, nonce: randomBytes(18).toString('base64url') })).toString('base64url');
    return `${payload}.${sign(payload)}`;
  };
  const validToken = token => {
    if (!token || revoked.has(tokenKey(token))) return false;
    if (!sessionSecret) return (sessions.get(tokenKey(token)) || 0) > Date.now();
    try {
      const [payload, signature, extra] = token.split('.');
      if (!payload || !signature || extra) return false;
      const actual = Buffer.from(signature, 'base64url'), expected = Buffer.from(sign(payload), 'base64url');
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
      const value = JSON.parse(Buffer.from(payload, 'base64url').toString());
      return Number.isFinite(value.expiry) && value.expiry > Date.now();
    } catch { return false; }
  };
  const cookie = (token, age) => `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${production ? '; Secure' : ''}`;
  const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
  async function body(request) {
    if (!request.headers['content-type']?.startsWith('application/json')) throw Object.assign(new Error('Envie JSON.'), { status: 415 });
    const chunks = []; let length = 0;
    for await (const chunk of request) { length += chunk.length; if (length > 32768) throw Object.assign(new Error('Dados muito grandes.'), { status: 413 }); chunks.push(chunk); }
    try { const value = JSON.parse(Buffer.concat(chunks).toString()); if (!value || typeof value !== 'object' || Array.isArray(value)) throw 0; return value; } catch { throw Object.assign(new Error('Dados inválidos.'), { status: 400 }); }
  }
  return async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'");
    try {
      prune();
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const token = tokenFrom(req), key = tokenKey(token), authenticated = validToken(token);
      if (pathname.startsWith('/api/')) {
        if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) return json(res, 405, { error: 'Método não permitido.' });
        if (req.method !== 'GET') {
          const expected = origin || `${production ? 'https' : 'http'}://${req.headers.host}`;
          if (req.headers.origin !== expected || req.headers['sec-fetch-site'] === 'cross-site') return json(res, 403, { error: 'Origem não permitida.' });
        }
        if (pathname === '/api/login' && req.method === 'POST') {
          const forwarded = dynamicOrigin && typeof req.headers['x-vercel-forwarded-for'] === 'string' ? req.headers['x-vercel-forwarded-for'].split(',')[0].trim() : '';
          const ip = forwarded || req.socket.remoteAddress || 'unknown', now = Date.now();
          const rate = attempts.get(ip) || { count: 0, until: now + 15 * 60000 };
          if (rate.count >= 8) { res.setHeader('Retry-After', Math.ceil((rate.until - now) / 1000)); return json(res, 429, { error: 'Muitas tentativas. Aguarde 15 minutos para tentar novamente.' }); }
          const data = await body(req); rate.count++; attempts.set(ip, rate);
          if (typeof data.password !== 'string' || !timingSafeEqual(digest(data.password), passwordHash)) return json(res, 401, { error: 'Essa senha não abriu a porta. Tente novamente.' });
          attempts.delete(ip); sessions.delete(key);
          const nextToken = issueToken(now + lifetime); if (!sessionSecret) sessions.set(tokenKey(nextToken), now + lifetime);
          res.setHeader('Set-Cookie', cookie(nextToken, lifetime / 1000)); return json(res, 200, { ok: true });
        }
        if (!authenticated) return json(res, 401, { error: 'Entre novamente para acessar seus presets.' });
        if (pathname === '/api/session' && req.method === 'GET') return json(res, 200, { authenticated: true, storage: store.mode });
        if (pathname === '/api/logout' && req.method === 'POST') { sessions.delete(key); if (token) revoked.set(key, Date.now() + lifetime); res.setHeader('Set-Cookie', cookie('', 0)); return json(res, 200, { ok: true }); }
        if (pathname === '/api/presets' && req.method === 'GET') return json(res, 200, { presets: await store.list(), storage: store.mode });
        const match = pathname.match(/^\/api\/presets\/([^/]+)$/);
        if ((pathname === '/api/presets' && req.method === 'POST') || (match && req.method === 'PATCH')) {
          if (match && !uuid.test(match[1])) return json(res, 400, { error: 'Preset inválido.' });
          const data = await body(req), validated = {};
          try {
            if (req.method === 'POST' || data.name !== undefined) validated.name = presetName(data.name);
            if (req.method === 'POST' || data.recipe !== undefined) validated.recipe = validateRecipe(data.recipe);
            if (!Object.keys(validated).length) throw new Error('Nenhuma alteração informada.');
          } catch (e) { return json(res, 400, { error: e.message }); }
          const row = match ? await store.update(match[1], validated) : await store.create(validated);
          return json(res, row ? (match ? 200 : 201) : 404, row ? { preset: row } : { error: 'Este preset já foi removido.' });
        }
        if (match && req.method === 'DELETE' && uuid.test(match[1])) { const row = await store.remove(match[1]); return json(res, row ? 200 : 404, row ? { ok: true } : { error: 'Este preset já foi removido.' }); }
        return json(res, 404, { error: 'Não encontrado.' });
      }
      if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { error: 'Método não permitido.' });
      if (/[\\\0:]/.test(pathname) || pathname.split('/').some(p => p.startsWith('.'))) return json(res, 404, { error: 'Não encontrado.' });
      let route = pathname === '/' ? '/index.html' : pathname;
      if (!authenticated && !isPublicRoute(route)) {
        if (route === '/index.html') { res.writeHead(302, { Location: '/login.html' }); return res.end(); }
        return json(res, 401, { error: 'Entre para abrir o editor.' });
      }
      if (authenticated && route === '/login.html') { res.writeHead(302, { Location: '/' }); return res.end(); }
      if (route === '/dev/profile-comparison' || route === '/dev/profile-comparison/') route = '/dev/profile-comparison/index.html';
      const allowed = isPublicRoute(route) || rootFiles.has(route.slice(1)) || editorExtensions.has(route.slice(1)) || /^\/(assets|cameraProfiles|filmEngine)\//.test(route) || (!production && (route.startsWith('/dev/') || route === '/tests/fixtures/synthetic-scenes.png'));
      if (!allowed || !mime[path.extname(route)]) return json(res, 404, { error: 'Não encontrado.' });
      const filename = await realpath(path.resolve(root, `.${route}`)), relative = path.relative(root, filename);
      if (relative.startsWith('..') || path.isAbsolute(relative)) return json(res, 404, { error: 'Não encontrado.' });
      const info = await stat(filename); if (!info.isFile()) return json(res, 404, { error: 'Não encontrado.' });
      if (route === '/service-worker.js') res.setHeader('Service-Worker-Allowed', '/');
      res.writeHead(200, { 'Content-Type': mime[path.extname(route)], 'Content-Length': info.size });
      if (req.method === 'HEAD') return res.end();
      const stream = createReadStream(filename); stream.on('error', () => res.destroy()); res.on('close', () => stream.destroy()); stream.pipe(res);
    } catch (error) {
      if (res.headersSent || res.destroyed) return;
      const status = error.status || (['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : error instanceof URIError ? 400 : 503);
      json(res, status, { error: error.status ? error.message : status === 503 ? 'Não foi possível acessar os presets. Confira a conexão e tente novamente.' : 'Não encontrado.' });
    }
  };
}

export function createApplication(options) {
  return http.createServer(createRequestHandler(options));
}
