const state = { gallery: { assets: [] }, selectedIndex: 0, generatedCount: 0, serverConfig: null };

const elements = {
  form: document.querySelector('#generate-form'),
  list: document.querySelector('#asset-list'),
  title: document.querySelector('#asset-title'),
  image: document.querySelector('#sprite-preview'),
  cache: document.querySelector('#cache-status'),
  downloadFrame: document.querySelector('#download-frame'),
  text: document.querySelector('#text-input'),
  assetType: document.querySelector('#asset-type'),
  style: document.querySelector('#style'),
  size: document.querySelector('#size'),
  backend: document.querySelector('#backend'),
  forceRegenerate: document.querySelector('#force-regenerate'),
  generateButton: document.querySelector('#generate-button'),
  formStatus: document.querySelector('#form-status'),
  preset: document.querySelector('#preset-id'),
  subject: document.querySelector('#subject'),
  framePath: document.querySelector('#frame-path'),
  atlasPath: document.querySelector('#atlas-path'),
  promptSections: document.querySelector('#prompt-sections'),
  qualityReports: document.querySelector('#quality-reports'),
  command: document.querySelector('#active-command'),
  copy: document.querySelector('#copy-command'),
};

async function init() {
  state.serverConfig = await loadServerConfig();
  state.gallery = await loadGallery();
  renderList();
  renderSelected();
  applyServerConfig(state.serverConfig);
  elements.copy.addEventListener('click', copyCommand);
  elements.form.addEventListener('submit', generateAsset);
  elements.backend.addEventListener('change', () => updateBackendModeStatus(elements.backend.value));
}

async function loadServerConfig() {
  try {
    const response = await fetch('/api/health', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to load server health: ${response.status}`);
    return response.json();
  } catch (error) {
    return { defaultBackendId: elements.backend.value, offlineStaticMode: true };
  }
}

function applyServerConfig(config) {
  if (config?.defaultBackendId && hasBackendOption(config.defaultBackendId)) {
    elements.backend.value = config.defaultBackendId;
  }
  updateBackendModeStatus(elements.backend.value);
}

function hasBackendOption(backendId) {
  return Array.from(elements.backend.options).some((option) => option.value === backendId);
}

function updateBackendModeStatus(backendId) {
  if (backendId === 'chat-svg' || backendId === 'image-api') {
    setStatus(`Real API mode enabled: ${backendId}. This will call your configured API and consume quota.`, 'pending');
    return;
  }
  setStatus(`Offline mode enabled: ${backendId}. No model API call will be made.`, 'success');
}

async function loadGallery() {
  try {
    const response = await fetch('demo-gallery.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to load demo-gallery.json: ${response.status}`);
    return response.json();
  } catch (error) {
    if (window.DEMO_GALLERY) return window.DEMO_GALLERY;
    return { generatedAt: new Date().toISOString(), assets: [] };
  }
}

async function generateAsset(event) {
  event.preventDefault();
  setLoading(true, `Generating with ${elements.backend.value}...`);

  const payload = {
    text: elements.text.value.trim(),
    assetType: elements.assetType.value,
    style: elements.style.value,
    size: elements.size.value,
    backendId: elements.backend.value,
    forceRegenerate: elements.forceRegenerate.checked,
  };

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    if (!response.ok || body.status !== 'success') {
      throw new Error(body.error?.message || `Generation failed: HTTP ${response.status}`);
    }

    const asset = normalizeGeneratedAsset(body, payload);
    state.gallery.assets.unshift(asset);
    state.selectedIndex = 0;
    renderList();
    renderSelected();
    setStatus(`Generated ${asset.assetId}. cache=${asset.cacheStatus}`, 'success');
  } catch (error) {
    setStatus(`${error.message}. 如果 API 限额，请临时切回 codex-local。`, 'error');
  } finally {
    setLoading(false);
  }
}

function normalizeGeneratedAsset(body, payload) {
  state.generatedCount += 1;
  const size = parseSize(payload.size);
  return {
    id: `generated-${state.generatedCount}`,
    assetId: body.assetId,
    assetType: body.assetType,
    text: payload.text,
    style: payload.style,
    size,
    backendId: body.backendId,
    cacheStatus: body.cacheStatus,
    cacheKey: body.cacheKey,
    presetId: body.recipe?.presetId || body.generationPacket?.presetId || '-',
    subject: body.recipe?.subject || body.generationPacket?.subject || '-',
    promptSections: body.generationPacket?.promptSections || [],
    qualityReports: body.qualityReports || [],
    paths: {
      frame: body.outputUrls?.frame,
      spritesheet: body.outputUrls?.spritesheet,
      atlas: body.outputUrls?.atlas,
      run: body.outputUrls?.run,
    },
  };
}

function renderList() {
  elements.list.innerHTML = '';
  if (!state.gallery.assets.length) {
    elements.list.innerHTML = '<p class="empty-list">No assets yet. Generate one from the form.</p>';
    return;
  }
  state.gallery.assets.forEach((asset, index) => {
    const button = document.createElement('button');
    button.className = `asset-button${index === state.selectedIndex ? ' active' : ''}`;
    button.type = 'button';
    button.innerHTML = `<strong>${escapeHtml(asset.assetId)}</strong><small>${escapeHtml(asset.assetType)} / ${escapeHtml(asset.presetId)} / ${escapeHtml(asset.cacheStatus)}</small>`;
    button.addEventListener('click', () => {
      state.selectedIndex = index;
      renderList();
      renderSelected();
    });
    elements.list.append(button);
  });
}

function renderSelected() {
  const asset = state.gallery.assets[state.selectedIndex];
  if (!asset) {
    elements.title.textContent = 'No asset';
    elements.image.removeAttribute('src');
    elements.cache.textContent = 'none';
    elements.downloadFrame.href = '#';
    elements.downloadFrame.download = 'asset.svg';
    elements.downloadFrame.setAttribute('aria-disabled', 'true');
    return;
  }

  elements.title.textContent = asset.assetId;
  elements.image.src = asset.paths.frame;
  elements.image.alt = `${asset.assetId} generated preview`;
  elements.cache.textContent = asset.cacheStatus;
  elements.preset.textContent = asset.presetId;
  elements.subject.textContent = asset.subject;
  elements.framePath.textContent = asset.paths.frame;
  elements.atlasPath.textContent = asset.paths.atlas;
  elements.downloadFrame.href = asset.paths.frame;
  elements.downloadFrame.download = `${safeFileName(asset.assetId)}-${safeFileName(asset.paths.frame.split('/').pop() || 'frame.svg')}`;
  elements.downloadFrame.removeAttribute('aria-disabled');
  elements.command.textContent = buildCommand({ ...asset, backendId: elements.backend.value });
  renderPromptSections(asset.promptSections);
  renderQualityReports(asset.qualityReports);
}

function renderPromptSections(sections = []) {
  elements.promptSections.innerHTML = '';
  if (!sections.length) {
    elements.promptSections.innerHTML = '<section class="section-box"><p>No prompt sections recorded.</p></section>';
    return;
  }
  sections.forEach((section) => {
    const box = document.createElement('section');
    box.className = 'section-box';
    box.innerHTML = `<h3>${escapeHtml(section.id)}</h3><ul>${section.rules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join('')}</ul>`;
    elements.promptSections.append(box);
  });
}

function renderQualityReports(reports = []) {
  elements.qualityReports.innerHTML = '';
  if (!reports.length) {
    elements.qualityReports.innerHTML = '<section class="section-box"><p>No quality report recorded for this backend.</p></section>';
    return;
  }
  reports.forEach((report) => {
    const box = document.createElement('section');
    box.className = 'section-box';
    const warningList = report.warnings?.length ? report.warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join('') : '<li>none</li>';
    const errorList = report.errors?.length ? report.errors.map((item) => `<li>${escapeHtml(item)}</li>`).join('') : '<li>none</li>';
    box.innerHTML = `<h3>${escapeHtml(report.frameId)} / ${report.passed ? 'passed' : 'failed'}</h3><p>Errors</p><ul>${errorList}</ul><p>Warnings</p><ul>${warningList}</ul>`;
    elements.qualityReports.append(box);
  });
}

function buildCommand(asset) {
  return `E:\\node_22\\node.exe src\\demo\\demo-runner.mjs --workspace demo-workspace-${asset.id} --backend ${asset.backendId} --skip-backend-compare --text "${asset.text}" --asset-type ${asset.assetType} --style ${asset.style} --size ${asset.size.width}x${asset.size.height}`;
}

async function copyCommand() {
  await navigator.clipboard.writeText(elements.command.textContent);
  elements.copy.textContent = 'Copied';
  window.setTimeout(() => { elements.copy.textContent = 'Copy'; }, 900);
}

function setLoading(isLoading, message) {
  elements.generateButton.disabled = isLoading;
  elements.generateButton.textContent = isLoading ? 'Generating...' : 'Generate Asset';
  if (message) setStatus(message, 'pending');
}

function setStatus(message, tone = 'pending') {
  elements.formStatus.textContent = message;
  elements.formStatus.dataset.tone = tone;
}

function parseSize(value) {
  const [width, height] = String(value).split('x').map((item) => Number(item));
  return { width, height };
}

function safeFileName(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

init().catch((error) => {
  document.body.innerHTML = `<main class="shell"><section class="preview-card"><h1>Workbench load failed</h1><p>${escapeHtml(error.message)}</p></section></main>`;
});
