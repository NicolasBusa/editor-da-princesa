import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApplication } from './backend/application.mjs';
import { localStore, supabaseStore } from './backend/storage.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
try { process.loadEnvFile(path.join(root, '.env')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const production = process.env.NODE_ENV === 'production';
const configured = [process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, process.env.PRESET_LIBRARY_ID];
if (configured.some(Boolean) && !configured.every(Boolean)) throw new Error('Preencha SUPABASE_URL, SUPABASE_SECRET_KEY e PRESET_LIBRARY_ID juntos.');
if (production && !configured.every(Boolean)) throw new Error('Configure o Supabase antes de iniciar em produção.');
const store = configured.every(Boolean) ? supabaseStore({ url: configured[0], key: configured[1], libraryId: configured[2] }) : localStore(path.join(root, '.runtime/presets.json'));
const port = Number(process.env.PORT || 4173), host = process.env.HOST || '127.0.0.1';
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida.');
const server = createApplication({ root, store, password: process.env.APP_PASSWORD || '1309', origin: process.env.APP_ORIGIN, production });
server.on('error', error => { console.error(`Não foi possível iniciar: ${error.code}`); process.exitCode = 1; });
server.listen(port, host, () => {
  console.log(`Editor da Princesa: http://${host}:${port}`);
  console.log(store.mode === 'supabase' ? 'Presets: Supabase configurado.' : 'Presets: armazenamento local de desenvolvimento. Supabase não conectado.');
});
