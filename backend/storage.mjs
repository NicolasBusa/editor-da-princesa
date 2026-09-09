import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export function localStore(filename) {
  let queue = Promise.resolve();
  const read = async () => { try { return JSON.parse(await readFile(filename, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return []; throw e; } };
  function mutate(operation) {
    const job = queue.then(async () => {
      const rows = await read(), result = operation(rows);
      await mkdir(dirname(filename), { recursive: true });
      const temporary = `${filename}.${randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify(rows), { mode: 0o600 });
      await rename(temporary, filename);
      return result;
    });
    queue = job.catch(() => {}); return job;
  }
  return {
    mode: 'local',
    list: async () => { await queue; return (await read()).sort((a,b) => b.updated_at.localeCompare(a.updated_at)); },
    create: data => mutate(rows => { if (rows.length >= 500) throw new Error('Limite de 500 presets atingido.'); const now = new Date().toISOString(), row = { id: randomUUID(), ...data, created_at: now, updated_at: now }; rows.push(row); return row; }),
    update: (id, data) => mutate(rows => { const row = rows.find(r => r.id === id); if (!row) return null; Object.assign(row, data, { updated_at: new Date().toISOString() }); return row; }),
    remove: id => mutate(rows => { const index = rows.findIndex(r => r.id === id); if (index < 0) return null; return rows.splice(index, 1)[0]; }),
  };
}

export function supabaseStore({ url, key, libraryId, fetcher = fetch }) {
  const endpoint = new URL('/rest/v1/princess_presets', url);
  if (endpoint.protocol !== 'https:' || !/^[0-9a-f-]{36}$/i.test(libraryId) || !key) throw new Error('Configuração do Supabase inválida.');
  async function request(method, id, data, offset = 0) {
    const target = new URL(endpoint);
    target.searchParams.set('library_id', `eq.${libraryId}`);
    target.searchParams.set('select', 'id,name,recipe,created_at,updated_at');
    if (id) target.searchParams.set('id', `eq.${id}`);
    if (method === 'GET') { target.searchParams.set('order', 'updated_at.desc,id.asc'); target.searchParams.set('limit', '100'); target.searchParams.set('offset', String(offset)); }
    const headers = { apikey: key, 'Content-Type': 'application/json', Prefer: 'return=representation' };
    if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;
    const response = await fetcher(target, { method, headers, body: data ? JSON.stringify({ ...data, library_id: libraryId, updated_at: new Date().toISOString() }) : undefined, signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('Não foi possível acessar os presets no Supabase. Tente novamente.');
    const rows = await response.json();
    return method === 'GET' ? rows : rows[0] || null;
  }
  async function list() {
    const rows = [];
    for (;;) { const page = await request('GET', null, null, rows.length); rows.push(...page); if (page.length < 100) return rows; }
  }
  return { mode: 'supabase', list, create: data => request('POST', null, data), update: (id, data) => request('PATCH', id, data), remove: id => request('DELETE', id) };
}
