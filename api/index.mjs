import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequestHandler } from '../backend/application.mjs';
import { supabaseStore } from '../backend/storage.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'PRESET_LIBRARY_ID', 'APP_PASSWORD', 'APP_SESSION_SECRET'];
for (const key of required) if (!process.env[key]) throw new Error(`Variável obrigatória ausente: ${key}`);

const store = supabaseStore({
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_SECRET_KEY,
  libraryId: process.env.PRESET_LIBRARY_ID,
});

export default createRequestHandler({
  root,
  store,
  password: process.env.APP_PASSWORD,
  sessionSecret: process.env.APP_SESSION_SECRET,
  production: true,
  dynamicOrigin: true,
});
