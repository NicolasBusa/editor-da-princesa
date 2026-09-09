import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { STICKERS } from '../stickers.js';

test('custom sticker folders become three distinct categories', async () => {
  const expected = { animais: 20, entretenimento: 15, musica: 16 };
  for (const [category, count] of Object.entries(expected)) {
    const items = STICKERS.filter(item => item.category === category);
    assert.equal(items.length, count, category);
    assert.equal(new Set(items.map(item => item.id)).size, count, `IDs únicos em ${category}`);
    for (const item of items) {
      const file = fileURLToPath(new URL(`../${item.src.replace('./', '')}`, import.meta.url));
      await access(file);
      assert((await stat(file)).size > 10_000, `${item.src} não está vazio`);
      const thumbnail = fileURLToPath(new URL(`../${item.thumbnail.replace('./', '')}`, import.meta.url));
      await access(thumbnail);
      assert((await stat(thumbnail)).size > 1_000, `${item.thumbnail} não está vazio`);
    }
  }
});

test('all sticker IDs are globally unique', () => {
  assert.equal(new Set(STICKERS.map(item => item.id)).size, STICKERS.length);
  assert.equal(STICKERS.length, 67);
});
