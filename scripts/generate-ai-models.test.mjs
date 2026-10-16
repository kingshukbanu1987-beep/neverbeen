import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('model manifest discovers only exact-name album-root MP3s and keeps premium photos separate', () => {
  const root = mkdtempSync(join(tmpdir(), 'neverbeen-preview-'));
  try {
    mkdirSync(join(root, 'scripts'), { recursive: true });
    copyFileSync(
      new URL('./generate-ai-models.mjs', import.meta.url),
      join(root, 'scripts/generate-ai-models.mjs'),
    );
    const album = join(root, 'public/NeverBeenModels/TestModel');
    mkdirSync(join(album, 'PremiumContent'), { recursive: true });
    writeFileSync(join(album, 'profile.json'), JSON.stringify({ name: 'Test Model' }));
    writeFileSync(join(album, 'Test Model.jpg'), 'fixture');
    writeFileSync(join(album, 'PremiumContent/secret.jpg'), 'fixture');
    writeFileSync(join(album, 'PremiumContent/Test Model.mp3'), 'fixture');
    writeFileSync(join(album, 'TestModel.mp3'), 'fixture');
    const generate = () => {
      execFileSync(process.execPath, [join(root, 'scripts/generate-ai-models.mjs')], {
        stdio: 'pipe',
      });
      return readFileSync(join(root, 'src/app/pages/ai-models/ai-model-data.ts'), 'utf8');
    };
    const profile = () =>
      JSON.parse(
        generate()
          .split('export const aiModelProfiles: AiModelProfile[] = ')[1]
          .trim()
          .replace(/;$/, '')
          .replace(/,\s*\]$/, ']'),
      )[0];
    assert.equal(profile().previewMusic, undefined);
    writeFileSync(join(album, 'Test Model.mp3'), 'fixture');
    const model = profile();
    assert.equal(model.previewMusic, '/NeverBeenModels/TestModel/Test%20Model.mp3');
    assert.deepEqual(
      model.photos.map((photo) => photo.src),
      ['/NeverBeenModels/TestModel/Test%20Model.jpg'],
    );
    assert.deepEqual(
      model.premiumPhotos.map((photo) => photo.src),
      ['/NeverBeenModels/TestModel/PremiumContent/secret.jpg'],
    );
    rmSync(join(album, 'Test Model.mp3'));
    assert.equal(profile().previewMusic, undefined);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
