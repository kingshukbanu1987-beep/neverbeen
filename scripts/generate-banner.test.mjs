import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('includes all banner images, nested paths and encoded filenames, ignoring non-images', () => {
  const root = mkdtempSync(join(tmpdir(), 'neverbeen-banner-'));
  try {
    for (const dir of ['scripts', 'public/banner/More portraits', 'src/app/home/hero']) {
      mkdirSync(join(root, dir), { recursive: true });
    }
    copyFileSync(new URL('./generate-banner.mjs', import.meta.url), join(root, 'scripts/generate-banner.mjs'));
    for (const name of ['a.jpg', 'b.PNG', 'More portraits/face #1.webp', '.hidden.jpg', '.gitkeep', 'notes.txt']) {
      writeFileSync(join(root, 'public/banner', name), 'fixture');
    }
    const generate = () => execFileSync(process.execPath, [join(root, 'scripts/generate-banner.mjs')]);
    const readSources = () => JSON.parse(readFileSync(join(root, 'src/app/home/hero/banner-images.ts'), 'utf8').match(/= ([\s\S]*);/)[1]);
    generate();
    assert.deepEqual(readSources(), ['/banner/More%20portraits/face%20%231.webp', '/banner/a.jpg', '/banner/b.PNG']);
    writeFileSync(join(root, 'public/banner/new.jpeg'), 'fixture');
    rmSync(join(root, 'public/banner/a.jpg'));
    generate();
    assert.deepEqual(readSources(), ['/banner/More%20portraits/face%20%231.webp', '/banner/b.PNG', '/banner/new.jpeg']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
