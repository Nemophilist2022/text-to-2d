const state = { gallery: null, selectedIndex: 0 };

const elements = {
  list: document.querySelector('#asset-list'),
  title: document.querySelector('#asset-title'),
  image: document.querySelector('#sprite-preview'),
  cache: document.querySelector('#cache-status'),
  text: document.querySelector('#text-input'),
  assetType: document.querySelector('#asset-type'),
  style: document.querySelector('#style'),
  size: document.querySelector('#size'),
  backend: document.querySelector('#backend'),
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
  state.gallery = await loadGallery();
  renderList();
  renderSelected();
  elements.copy.addEventListener('click', copyCommand);
}

async function loadGallery() {
  try {
    const response = await fetch('demo-gallery.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to load demo-gallery.json: ${response.status}`);
    return response.json();
  } catch (error) {
    if (window.DEMO_GALLERY) return window.DEMO_GALLERY;
    throw error;
  }
}

function renderList() {
  elements.list.innerHTML = '';
  state.gallery.assets.forEach((asset, index) => {
    const button = document.createElement('button');
    button.className = `asset-button${index === state.selectedIndex ? ' active' : ''}`;
    button.type = 'button';
    button.innerHTML = `<strong>${asset.assetId}</strong><small>${asset.assetType} / ${asset.presetId}</small>`;
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
  elements.title.textContent = asset.assetId;
  elements.image.src = asset.paths.frame;
  elements.image.alt = `${asset.assetId} generated preview`;
  elements.cache.textContent = asset.cacheStatus;
  elements.text.value = asset.text;
  elements.assetType.value = asset.assetType;
  elements.style.value = asset.style;
  elements.size.value = `${asset.size.width}x${asset.size.height}`;
  elements.backend.value = asset.backendId;
  elements.preset.textContent = asset.presetId;
  elements.subject.textContent = asset.subject;
  elements.framePath.textContent = asset.paths.frame;
  elements.atlasPath.textContent = asset.paths.atlas;
  elements.command.textContent = buildCommand(asset);
  renderPromptSections(asset.promptSections);
  renderQualityReports(asset.qualityReports);
}

function renderPromptSections(sections) {
  elements.promptSections.innerHTML = '';
  sections.forEach((section) => {
    const box = document.createElement('section');
    box.className = 'section-box';
    box.innerHTML = `<h3>${section.id}</h3><ul>${section.rules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join('')}</ul>`;
    elements.promptSections.append(box);
  });
}

function renderQualityReports(reports) {
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
    box.innerHTML = `<h3>${report.frameId} / ${report.passed ? 'passed' : 'failed'}</h3><p>Errors</p><ul>${errorList}</ul><p>Warnings</p><ul>${warningList}</ul>`;
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

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

init().catch((error) => {
  document.body.innerHTML = `<main class="shell"><section class="preview-card"><h1>Gallery load failed</h1><p>${escapeHtml(error.message)}</p></section></main>`;
});
