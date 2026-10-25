import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('includes all travel images, nested paths and encoded filenames, ignoring non-images', () => {
  const root = mkdtempSync(join(tmpdir(), 'neverbeen-travel-'));
  try {
    for (const dir of ['scripts', 'public/travel/More places', 'src/app/home/hero']) {
      mkdirSync(join(root, dir), { recursive: true });
    }
    copyFileSync(new URL('./generate-travel.mjs', import.meta.url), join(root, 'scripts/generate-travel.mjs'));
    for (const name of ['a.jpg', 'b.PNG', 'More places/beach #1.webp', '.hidden.jpg', '.gitkeep', 'notes.txt']) {
      writeFileSync(join(root, 'public/travel', name), 'fixture');
    }
    const generate = () => execFileSync(process.execPath, [join(root, 'scripts/generate-travel.mjs')]);
    const readSources = () => JSON.parse(readFileSync(join(root, 'src/app/home/hero/travel-images.ts'), 'utf8').match(/= ([\s\S]*);/)[1]);
    generate();
    assert.deepEqual(readSources(), ['/travel/More%20places/beach%20%231.webp', '/travel/a.jpg', '/travel/b.PNG']);
    writeFileSync(join(root, 'public/travel/new.jpeg'), 'fixture');
    rmSync(join(root, 'public/travel/a.jpg'));
    generate();
    assert.deepEqual(readSources(), ['/travel/More%20places/beach%20%231.webp', '/travel/b.PNG', '/travel/new.jpeg']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
