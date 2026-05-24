import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildDemoGallery, DEMO_GALLERY_CASES } from '../src/demo/demo-gallery.mjs';

test('demo gallery builds five asset samples with existing manifest paths', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'asset-gallery-'));
  try {
    const manifestPath = join(workspace, 'demo-gallery.json');
    const gallery = await buildDemoGallery({ workspace, manifestPath, backendId: 'codex-local' });

    assert.equal(gallery.assets.length, 5);
    assert.deepEqual(gallery.assets.map((asset) => asset.presetId), [
      'knight_character',
      'slime_monster',
      'gem_item',
      'grass_tile',
      'heart_ui_icon',
    ]);

    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    assert.equal(manifest.assets.length, DEMO_GALLERY_CASES.length);

    for (const asset of manifest.assets) {
      await stat(join(workspace, asset.paths.frame));
      await stat(join(workspace, asset.paths.spritesheet));
      await stat(join(workspace, asset.paths.atlas));
      assert.ok(asset.promptSections.length > 0);
      assert.ok(Array.isArray(asset.qualityReports));
    }
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('static workbench files and bundled gallery manifest are present', async () => {
  const root = process.cwd();
  const html = await readFile(join(root, 'ui', 'index.html'), 'utf8');
  const css = await readFile(join(root, 'ui', 'styles.css'), 'utf8');
  const js = await readFile(join(root, 'ui', 'app.js'), 'utf8');
  const galleryJs = await readFile(join(root, 'ui', 'demo-gallery.js'), 'utf8');
  const manifest = JSON.parse(await readFile(join(root, 'ui', 'demo-gallery.json'), 'utf8'));

  assert.match(html, /Text-to-2D Asset Workbench/);
  assert.match(css, /#020617/);
  assert.match(css, /#22C55E/i);
  assert.match(js, /demo-gallery\.json/);
  assert.match(js, /window\.DEMO_GALLERY/);
  assert.match(galleryJs, /window\.DEMO_GALLERY/);
  assert.equal(manifest.assets.length, 5);
});
