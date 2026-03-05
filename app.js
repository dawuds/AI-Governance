/* === AI Governance Explorer — Application Logic === */

const state = {
  frameworks: null,
  frameworkData: {},    // keyed by framework id
  controls: null,       // { domains, library }
  frameworkMap: null,
  route: { view: 'overview' },
};

const cache = new Map();

async function fetchJSON(path) {
  if (cache.has(path)) return cache.get(path);
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cache.set(path, data);
    return data;
  } catch (e) {
    console.warn(`Failed to load ${path}:`, e);
    return null;
  }
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function debounce(fn, ms) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

// === Routing ===

function parseRoute() {
  const hash = location.hash.slice(1) || '';
  if (!hash) return { view: 'overview' };
  if (hash.startsWith('search/')) return { view: 'search', query: decodeURIComponent(hash.slice(7)) };
  if (hash === 'frameworks') return { view: 'frameworks' };
  if (hash.startsWith('framework/')) return { view: 'framework-detail', id: hash.slice(10) };
  if (hash === 'controls') return { view: 'controls' };
  if (hash.startsWith('control/')) return { view: 'control-detail', slug: hash.slice(8) };
  if (hash === 'risk-taxonomy') return { view: 'risk-taxonomy' };
  if (hash === 'crosswalks') return { view: 'crosswalks' };
  return { view: 'overview' };
}

function updateNav() {
  document.querySelectorAll('.nav-link').forEach(el => {
    const view = el.dataset.view;
    el.classList.toggle('active',
      view === state.route.view ||
      (view === 'overview' && state.route.view === 'search') ||
      (view === 'frameworks' && state.route.view === 'framework-detail') ||
      (view === 'controls' && state.route.view === 'control-detail')
    );
  });
}

// === Render Dispatcher ===

function render() {
  state.route = parseRoute();
  const app = document.getElementById('app');
  updateNav();

  switch (state.route.view) {
    case 'overview': renderOverview(app); break;
    case 'frameworks': renderFrameworks(app); break;
    case 'framework-detail': renderFrameworkDetail(app, state.route.id); break;
    case 'controls': renderControls(app); break;
    case 'control-detail': renderControlDetail(app, state.route.slug); break;
    case 'risk-taxonomy': renderRiskTaxonomy(app); break;
    case 'crosswalks': renderCrosswalks(app); break;
    case 'search': renderSearch(app, state.route.query); break;
    default: renderOverview(app);
  }
  window.scrollTo(0, 0);
}

// === Overview ===

function renderOverview(el) {
  const fws = state.frameworks || [];
  const tier1 = fws.filter(f => f.tier === 1);
  const tier2 = fws.filter(f => f.tier === 2);
  const binding = fws.filter(f => f.binding);
  const home = fws.find(f => f.isHome);
  const controlCount = state.controls ? state.controls.library.length : 0;
  const domainCount = state.controls ? state.controls.domains.length : 0;

  el.innerHTML = `<div class="main">
    <div class="stats-row">
      <div class="stat-card"><div class="stat-value">${fws.length}</div><div class="stat-label">Frameworks</div></div>
      <div class="stat-card"><div class="stat-value">${tier1.length}</div><div class="stat-label">Tier 1 (Full)</div></div>
      <div class="stat-card"><div class="stat-value">${binding.length}</div><div class="stat-label">Binding Laws</div></div>
      <div class="stat-card"><div class="stat-value">${controlCount}</div><div class="stat-label">Controls</div></div>
      <div class="stat-card"><div class="stat-value">${domainCount}</div><div class="stat-label">Domains</div></div>
    </div>

    ${home ? `
    <div class="detail-section">
      <div class="section-header">
        <div class="section-title">Home Framework</div>
        <div class="section-subtitle">Anchor framework for cross-framework comparison</div>
      </div>
      <a href="#framework/${home.id}" class="card card-clickable" style="border-left: 4px solid #DC2626;">
        <div class="card-header">
          <div>
            <div class="card-title">${esc(home.name)}</div>
            <div class="card-subtitle">${esc(home.shortName)} — ${esc(home.jurisdiction)}</div>
          </div>
          <span class="badge badge-home">HOME</span>
        </div>
        <div class="card-body">${esc(home.description)}</div>
        <div class="card-badges">
          <span class="badge badge-tier1">Tier 1</span>
          <span class="badge ${home.binding ? 'badge-binding' : 'badge-voluntary'}">${home.binding ? 'Binding' : 'Voluntary'}</span>
          <span class="badge badge-type">${esc(home.type)}</span>
          <span class="badge badge-jurisdiction">${esc(home.jurisdiction)}</span>
        </div>
        <div class="card-meta">
          <span class="card-meta-item">${home.primaryUnitCount} ${home.primaryUnit}s</span>
          <span class="card-meta-item">${esc(home.issuingBody)}</span>
          ${home.effectiveDate ? `<span class="card-meta-item">Effective: ${home.effectiveDate}</span>` : ''}
        </div>
      </a>
    </div>` : ''}

    <div class="detail-section">
      <div class="section-header">
        <div class="section-title">Tier 1 Frameworks — Full Extraction</div>
        <div class="section-subtitle">Article/clause-level extraction for provision-level cross-referencing</div>
      </div>
      <div class="grid-2">
        ${tier1.filter(f => !f.isHome).map(f => renderFrameworkCard(f)).join('')}
      </div>
    </div>

    <div class="detail-section">
      <div class="section-header">
        <div class="section-title">Tier 2 Frameworks — Summary</div>
        <div class="section-subtitle">Key provisions and comparison data</div>
      </div>
      <div class="grid-2">
        ${tier2.map(f => renderFrameworkCard(f)).join('')}
      </div>
    </div>

    ${domainCount > 0 ? `
    <div class="detail-section">
      <div class="section-header">
        <div class="section-title">Control Domains</div>
        <div class="section-subtitle">${controlCount} controls across ${domainCount} governance domains</div>
      </div>
      <div class="grid-3">
        ${state.controls.domains.map(d => {
          const count = state.controls.library.filter(c => c.domain === d.slug).length;
          return `<div class="card card-clickable" onclick="location.hash='controls'">
            <div class="card-title">${esc(d.name)}</div>
            <div class="card-body">${esc(d.description)}</div>
            <div class="card-meta"><span class="card-meta-item">${count} controls</span></div>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}
  </div>`;
}

function renderFrameworkCard(f) {
  const colorClass = getFrameworkColorClass(f.jurisdiction);
  return `<a href="#framework/${f.id}" class="card card-clickable ${colorClass}">
    <div class="card-header">
      <div>
        <div class="card-title">${esc(f.shortName)}</div>
        <div class="card-subtitle">${esc(f.name)}</div>
      </div>
    </div>
    <div class="card-body">${esc(f.description)}</div>
    <div class="card-badges">
      <span class="badge badge-tier${f.tier}">Tier ${f.tier}</span>
      <span class="badge ${f.binding ? 'badge-binding' : f.status === 'proposed' ? 'badge-proposed' : 'badge-voluntary'}">${f.binding ? 'Binding' : f.status === 'proposed' ? 'Proposed' : 'Voluntary'}</span>
      <span class="badge badge-type">${esc(f.type)}</span>
      <span class="badge badge-jurisdiction">${esc(f.jurisdiction)}</span>
      ${f.isHome ? '<span class="badge badge-home">HOME</span>' : ''}
      ${f.sourceType === 'constructed-indicative' ? '<span class="badge badge-constructed" title="Content constructed from public summaries, not from the paywalled standard">Indicative</span>' : ''}
    </div>
    <div class="card-meta">
      <span class="card-meta-item">${f.primaryUnitCount} ${f.primaryUnit}s</span>
      <span class="card-meta-item">${esc(f.issuingBody)}</span>
      ${f.effectiveDate ? `<span class="card-meta-item">${f.effectiveDate}</span>` : ''}
    </div>
  </a>`;
}

function getFrameworkColorClass(jurisdiction) {
  const map = { 'MY': 'fw-my', 'EU': 'fw-eu', 'US': 'fw-us', 'SG': 'fw-sg', 'CN': 'fw-cn', 'UK': 'fw-uk', 'CA': 'fw-ca', 'International': 'fw-intl' };
  return map[jurisdiction] || '';
}

// === Frameworks List ===

function renderFrameworks(el) {
  const fws = state.frameworks || [];
  const tier1 = fws.filter(f => f.tier === 1);
  const tier2 = fws.filter(f => f.tier === 2);

  el.innerHTML = `<div class="main">
    <div class="section-header">
      <div class="section-title">AI Governance Frameworks</div>
      <div class="section-subtitle">${fws.length} frameworks across ${new Set(fws.map(f => f.jurisdiction)).size} jurisdictions</div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Tier 1 — Full Extraction (${tier1.length})</div>
      <div class="grid-2">
        ${tier1.map(f => renderFrameworkCard(f)).join('')}
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Tier 2 — Summary (${tier2.length})</div>
      <div class="grid-2">
        ${tier2.map(f => renderFrameworkCard(f)).join('')}
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Comparison Table</div>
      <div style="overflow-x:auto;">
        <table class="mapping-table">
          <thead>
            <tr>
              <th>Framework</th>
              <th>Jurisdiction</th>
              <th>Type</th>
              <th>Binding</th>
              <th>Primary Units</th>
              <th>Effective Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${fws.map(f => `<tr>
              <td><a href="#framework/${f.id}">${esc(f.shortName)}</a></td>
              <td><span class="badge badge-jurisdiction">${esc(f.jurisdiction)}</span></td>
              <td>${esc(f.type)}</td>
              <td><span class="badge ${f.binding ? 'badge-binding' : 'badge-voluntary'}">${f.binding ? 'Yes' : 'No'}</span></td>
              <td>${f.primaryUnitCount} ${f.primaryUnit}s</td>
              <td>${f.effectiveDate || '—'}</td>
              <td>${esc(f.status)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
}

// === Framework Detail ===

async function renderFrameworkDetail(el, id) {
  const fw = (state.frameworks || []).find(f => f.id === id);
  if (!fw) {
    el.innerHTML = `<div class="main"><div class="empty-state"><div class="empty-state-text">Framework not found: ${esc(id)}</div><a href="#frameworks">Back to frameworks</a></div></div>`;
    return;
  }

  el.innerHTML = `<div class="main"><div class="loading"><div class="spinner"></div><span>Loading ${esc(fw.shortName)} data…</span></div></div>`;

  // Load framework-specific data
  if (!state.frameworkData[id]) {
    const data = await fetchJSON(`frameworks/${id}/index.json`);
    if (data) state.frameworkData[id] = data;
  }

  const fwData = state.frameworkData[id];
  const colorClass = getFrameworkColorClass(fw.jurisdiction);

  // Get mapped controls
  const mappedControls = [];
  if (state.frameworkMap && state.frameworkMap.frameworkToControls[id]) {
    const provMap = state.frameworkMap.frameworkToControls[id];
    const controlSlugs = new Set();
    for (const provisions of Object.values(provMap)) {
      for (const slug of provisions) controlSlugs.add(slug);
    }
    if (state.controls) {
      for (const c of state.controls.library) {
        if (controlSlugs.has(c.slug)) mappedControls.push(c);
      }
    }
  }

  el.innerHTML = `<div class="main">
    <div class="breadcrumb">
      <a href="#frameworks">Frameworks</a>
      <span class="breadcrumb-sep">/</span>
      <span>${esc(fw.shortName)}</span>
    </div>

    <div class="detail-header" style="border-left: 4px solid; padding-left: 1rem;" class="${colorClass}">
      <div class="detail-title">${esc(fw.name)}</div>
      <div class="detail-subtitle">${esc(fw.description)}</div>
      <div class="detail-badges">
        <span class="badge badge-tier${fw.tier}">Tier ${fw.tier}</span>
        <span class="badge ${fw.binding ? 'badge-binding' : fw.status === 'proposed' ? 'badge-proposed' : 'badge-voluntary'}">${fw.binding ? 'Binding' : fw.status === 'proposed' ? 'Proposed' : 'Voluntary'}</span>
        <span class="badge badge-type">${esc(fw.type)}</span>
        <span class="badge badge-jurisdiction">${esc(fw.jurisdiction)}</span>
        ${fw.isHome ? '<span class="badge badge-home">HOME</span>' : ''}
        ${fw.sourceType === 'constructed-indicative' ? '<span class="badge badge-constructed" title="Content constructed from public summaries">Indicative</span>' : ''}
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-card"><div class="stat-value">${fw.primaryUnitCount}</div><div class="stat-label">${fw.primaryUnit}s</div></div>
      <div class="stat-card"><div class="stat-value">${mappedControls.length}</div><div class="stat-label">Mapped Controls</div></div>
      <div class="stat-card"><div class="stat-value">${fw.binding ? 'Yes' : 'No'}</div><div class="stat-label">Binding</div></div>
      <div class="stat-card"><div class="stat-value">${fw.effectiveDate || '—'}</div><div class="stat-label">Effective</div></div>
    </div>

    <div class="card" style="margin-bottom: 1.5rem;">
      <table class="mapping-table">
        <tbody>
          <tr><td style="font-weight:600;width:140px;">Issuing Body</td><td>${esc(fw.issuingBody)}</td></tr>
          <tr><td style="font-weight:600;">Type</td><td>${esc(fw.type)}</td></tr>
          <tr><td style="font-weight:600;">Status</td><td>${esc(fw.status)}</td></tr>
          ${fw.sourceUrl ? `<tr><td style="font-weight:600;">Source</td><td><a href="${esc(fw.sourceUrl)}" target="_blank" rel="noopener">${esc(fw.sourceUrl)}</a></td></tr>` : ''}
          ${fw.tags ? `<tr><td style="font-weight:600;">Tags</td><td>${fw.tags.map(t => `<span class="badge badge-domain">${esc(t)}</span>`).join(' ')}</td></tr>` : ''}
        </tbody>
      </table>
    </div>

    ${fwData && fwData.principles ? renderPrinciplesList(fwData.principles) : ''}

    ${mappedControls.length > 0 ? `
    <div class="detail-section">
      <div class="detail-section-title">Mapped Controls (${mappedControls.length})</div>
      <div class="grid-2">
        ${mappedControls.map(c => renderControlCard(c)).join('')}
      </div>
    </div>` : ''}
  </div>`;
}

function renderPrinciplesList(principles) {
  return `<div class="detail-section">
    <div class="detail-section-title">Principles (${principles.length})</div>
    <div class="grid-2">
      ${principles.map(p => `
        <div class="principle-card">
          <div class="principle-number">Principle ${p.number}</div>
          <div class="principle-name">${esc(p.name)}</div>
          <div class="principle-definition">"${esc(p.definition)}"</div>
          <div class="card-body">${esc(p.description)}</div>
          ${p.keyElements ? `
          <ul class="item-list" style="margin-top:0.75rem;">
            ${p.keyElements.map(e => `<li>${esc(e)}</li>`).join('')}
          </ul>` : ''}
        </div>
      `).join('')}
    </div>
  </div>`;
}

// === Controls ===

function renderControls(el) {
  if (!state.controls) {
    el.innerHTML = `<div class="main"><div class="empty-state"><div class="empty-state-text">Controls data not loaded</div></div></div>`;
    return;
  }

  const { domains, library } = state.controls;

  el.innerHTML = `<div class="main">
    <div class="section-header">
      <div class="section-title">Unified Control Library</div>
      <div class="section-subtitle">${library.length} controls across ${domains.length} governance domains</div>
    </div>

    <div class="stats-row">
      <div class="stat-card"><div class="stat-value">${library.length}</div><div class="stat-label">Total Controls</div></div>
      <div class="stat-card"><div class="stat-value">${library.filter(c => c.type === 'preventive').length}</div><div class="stat-label">Preventive</div></div>
      <div class="stat-card"><div class="stat-value">${library.filter(c => c.type === 'detective').length}</div><div class="stat-label">Detective</div></div>
      <div class="stat-card"><div class="stat-value">${library.filter(c => c.type === 'corrective').length}</div><div class="stat-label">Corrective</div></div>
    </div>

    ${domains.map(d => {
      const domainControls = library.filter(c => c.domain === d.slug);
      if (domainControls.length === 0) return '';
      return `
      <div class="accordion-item open">
        <button class="accordion-trigger" data-accordion>
          <span>${esc(d.name)} <span style="color:var(--text-muted);font-weight:400;">(${domainControls.length})</span></span>
          <span class="chevron">▶</span>
        </button>
        <div class="accordion-content">
          <p style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:0.75rem;">${esc(d.description)}</p>
          <div class="grid-2">
            ${domainControls.map(c => renderControlCard(c)).join('')}
          </div>
        </div>
      </div>`;
    }).join('')}

    <div class="detail-section" style="margin-top:1.5rem;">
      <div class="detail-section-title">Coverage Matrix</div>
      <div style="overflow-x:auto;">
        <table class="mapping-table">
          <thead>
            <tr>
              <th>Control</th>
              <th>NGAIGE</th>
              <th>EU AI Act</th>
              <th>NIST RMF</th>
              <th>ISO 42001</th>
            </tr>
          </thead>
          <tbody>
            ${library.map(c => {
              const m = c.frameworkMappings || {};
              return `<tr>
                <td><a href="#control/${c.slug}">${esc(c.name)}</a></td>
                <td>${m['malaysia-ngaige'] ? `<span class="coverage-cell coverage-full" title="${m['malaysia-ngaige'].join(', ')}">●</span>` : '<span class="coverage-cell coverage-none">—</span>'}</td>
                <td>${m['eu-ai-act'] ? `<span class="coverage-cell coverage-full" title="${m['eu-ai-act'].join(', ')}">●</span>` : '<span class="coverage-cell coverage-none">—</span>'}</td>
                <td>${m['nist-ai-rmf'] ? `<span class="coverage-cell coverage-full" title="${m['nist-ai-rmf'].join(', ')}">●</span>` : '<span class="coverage-cell coverage-none">—</span>'}</td>
                <td>${m['iso-42001'] ? `<span class="coverage-cell coverage-full" title="${m['iso-42001'].join(', ')}">●</span>` : '<span class="coverage-cell coverage-none">—</span>'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
}

function renderControlCard(c) {
  const domain = state.controls ? state.controls.domains.find(d => d.slug === c.domain) : null;
  return `<a href="#control/${c.slug}" class="card card-clickable">
    <div class="card-header">
      <div class="card-title">${esc(c.name)}</div>
    </div>
    <div class="card-body">${esc(c.description)}</div>
    <div class="card-badges">
      ${domain ? `<span class="badge badge-domain">${esc(domain.name)}</span>` : ''}
      <span class="badge badge-${c.type}">${esc(c.type)}</span>
      <span class="badge badge-${c.layer}">${esc(c.layer)}</span>
    </div>
    <div class="card-meta">
      ${c.frameworkMappings ? `<span class="card-meta-item">${Object.keys(c.frameworkMappings).length} frameworks</span>` : ''}
    </div>
  </a>`;
}

// === Control Detail ===

function renderControlDetail(el, slug) {
  if (!state.controls) {
    el.innerHTML = `<div class="main"><div class="empty-state"><div class="empty-state-text">Controls not loaded</div></div></div>`;
    return;
  }

  const c = state.controls.library.find(x => x.slug === slug);
  if (!c) {
    el.innerHTML = `<div class="main"><div class="empty-state"><div class="empty-state-text">Control not found: ${esc(slug)}</div><a href="#controls">Back to controls</a></div></div>`;
    return;
  }

  const domain = state.controls.domains.find(d => d.slug === c.domain);
  const fws = state.frameworks || [];

  el.innerHTML = `<div class="main">
    <div class="breadcrumb">
      <a href="#controls">Controls</a>
      <span class="breadcrumb-sep">/</span>
      ${domain ? `<span>${esc(domain.name)}</span><span class="breadcrumb-sep">/</span>` : ''}
      <span>${esc(c.name)}</span>
    </div>

    <div class="detail-header">
      <div class="detail-title">${esc(c.name)}</div>
      <div class="detail-subtitle">${esc(c.description)}</div>
      <div class="detail-badges">
        ${domain ? `<span class="badge badge-domain">${esc(domain.name)}</span>` : ''}
        <span class="badge badge-${c.type}">${esc(c.type)}</span>
        <span class="badge badge-${c.layer}">${esc(c.layer)}</span>
      </div>
    </div>

    ${c.keyActivities && c.keyActivities.length > 0 ? `
    <div class="detail-section">
      <div class="detail-section-title">Key Activities</div>
      <ul class="item-list">
        ${c.keyActivities.map(a => `<li>${esc(a)}</li>`).join('')}
      </ul>
    </div>` : ''}

    ${c.maturity ? `
    <div class="detail-section">
      <div class="detail-section-title">Maturity Levels</div>
      <div class="grid-3">
        <div class="card">
          <div class="card-title" style="color:var(--warning);">Basic</div>
          <div class="card-body">${esc(c.maturity.basic)}</div>
        </div>
        <div class="card">
          <div class="card-title" style="color:var(--accent);">Mature</div>
          <div class="card-body">${esc(c.maturity.mature)}</div>
        </div>
        <div class="card">
          <div class="card-title" style="color:var(--success);">Advanced</div>
          <div class="card-body">${esc(c.maturity.advanced)}</div>
        </div>
      </div>
    </div>` : ''}

    ${c.frameworkMappings ? `
    <div class="detail-section">
      <div class="detail-section-title">Framework Mappings</div>
      <table class="mapping-table">
        <thead>
          <tr><th>Framework</th><th>Mapped Provisions</th></tr>
        </thead>
        <tbody>
          ${Object.entries(c.frameworkMappings).map(([fwId, provisions]) => {
            const fw = fws.find(f => f.id === fwId);
            return `<tr>
              <td><a href="#framework/${fwId}">${fw ? esc(fw.shortName) : esc(fwId)}</a></td>
              <td>${provisions.map(p => `<span class="badge badge-domain">${esc(p)}</span>`).join(' ')}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>` : ''}

    ${c.toolExamples && c.toolExamples.length > 0 ? `
    <div class="detail-section">
      <div class="detail-section-title">Tool Examples</div>
      <div class="card-badges">
        ${c.toolExamples.map(t => `<span class="badge badge-type">${esc(t)}</span>`).join('')}
      </div>
    </div>` : ''}
  </div>`;
}

// === Risk Taxonomy (placeholder for Phase 4) ===

function renderRiskTaxonomy(el) {
  el.innerHTML = `<div class="main">
    <div class="section-header">
      <div class="section-title">AI Risk Taxonomy</div>
      <div class="section-subtitle">Risk domains with framework coverage analysis</div>
    </div>
    <div class="empty-state">
      <div class="empty-state-icon">&#9888;</div>
      <div class="empty-state-text">Risk taxonomy data coming in Phase 4</div>
      <div class="empty-state-hint">Will include ~11 risk domains, ~24 subcategories, and framework coverage heatmap</div>
    </div>
  </div>`;
}

// === Crosswalks (placeholder for Phase 2-3) ===

function renderCrosswalks(el) {
  el.innerHTML = `<div class="main">
    <div class="section-header">
      <div class="section-title">Cross-Framework Mappings</div>
      <div class="section-subtitle">Interactive cross-framework mapping explorer</div>
    </div>
    <div class="empty-state">
      <div class="empty-state-icon">&#128279;</div>
      <div class="empty-state-text">Crosswalk data coming in Phase 2-3</div>
      <div class="empty-state-hint">Will include NGAIGE ↔ EU AI Act, trilateral EU-NIST-ISO mapping, and global comparison</div>
    </div>
  </div>`;
}

// === Search ===

function renderSearch(el, query) {
  const q = (query || '').toLowerCase();
  const results = [];

  // Search frameworks
  for (const f of (state.frameworks || [])) {
    if (matchText(q, f.name, f.shortName, f.description, f.jurisdiction, f.type, f.issuingBody)) {
      results.push({ type: 'Framework', title: f.shortName, subtitle: f.name, hash: `#framework/${f.id}`, text: f.description });
    }
  }

  // Search framework data (principles)
  for (const [fwId, fwData] of Object.entries(state.frameworkData)) {
    if (fwData.principles) {
      for (const p of fwData.principles) {
        if (matchText(q, p.name, p.definition, p.description, ...(p.keyElements || []))) {
          const fw = (state.frameworks || []).find(f => f.id === fwId);
          results.push({ type: `${fw ? fw.shortName : fwId} Principle`, title: p.name, subtitle: p.definition, hash: `#framework/${fwId}`, text: p.description });
        }
      }
    }
  }

  // Search controls
  if (state.controls) {
    for (const c of state.controls.library) {
      if (matchText(q, c.name, c.description, c.domain, c.type, ...(c.keyActivities || []))) {
        results.push({ type: 'Control', title: c.name, subtitle: c.domain, hash: `#control/${c.slug}`, text: c.description });
      }
    }

    for (const d of state.controls.domains) {
      if (matchText(q, d.name, d.description)) {
        results.push({ type: 'Domain', title: d.name, subtitle: '', hash: '#controls', text: d.description });
      }
    }
  }

  // Update search input
  const searchInput = document.getElementById('search-input');
  if (searchInput && searchInput.value !== query) searchInput.value = query || '';

  el.innerHTML = `<div class="main">
    <div class="section-header">
      <div class="section-title">Search Results</div>
      <div class="section-subtitle">${results.length} result${results.length !== 1 ? 's' : ''} for "${esc(query)}"</div>
    </div>

    ${results.length === 0 ? `
    <div class="empty-state">
      <div class="empty-state-text">No results found</div>
      <div class="empty-state-hint">Try different keywords or browse frameworks and controls</div>
    </div>` : `
    <div class="card">
      ${results.map(r => `
        <div class="search-result">
          <div class="search-result-type">${esc(r.type)}</div>
          <div class="search-result-title"><a href="${r.hash}">${esc(r.title)}</a></div>
          ${r.subtitle ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.25rem;">${esc(r.subtitle)}</div>` : ''}
          <div class="search-result-excerpt">${highlightMatch(r.text || '', q)}</div>
        </div>
      `).join('')}
    </div>`}
  </div>`;
}

function matchText(q, ...texts) {
  for (const t of texts) {
    if (t && t.toLowerCase().includes(q)) return true;
  }
  return false;
}

function highlightMatch(text, q) {
  if (!text || !q) return esc(text);
  const escaped = esc(text);
  const idx = escaped.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return escaped.substring(0, 200) + (escaped.length > 200 ? '…' : '');
  const start = Math.max(0, idx - 60);
  const end = Math.min(escaped.length, idx + q.length + 100);
  let snippet = (start > 0 ? '…' : '') + escaped.substring(start, end) + (end < escaped.length ? '…' : '');
  // Highlight match
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return snippet.replace(re, '<mark>$1</mark>');
}

// === Event Handlers ===

function handleClick(e) {
  // Accordion
  const accHeader = e.target.closest('[data-accordion]');
  if (accHeader) {
    accHeader.closest('.accordion-item').classList.toggle('open');
    return;
  }

  // Tab buttons
  const tabBtn = e.target.closest('.tab-btn');
  if (tabBtn) {
    const tabName = tabBtn.dataset.tab;
    const container = tabBtn.closest('.tabs')?.parentElement || document;
    container.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === tabBtn));
    container.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tabName}`));
    return;
  }
}

function handleSearch(e) {
  const query = e.target.value.trim();
  if (query.length >= 2) {
    location.hash = `#search/${encodeURIComponent(query)}`;
  } else if (!query) {
    location.hash = '#';
  }
}

// === Init ===

async function init() {
  // Load core data
  const [frameworksData, domainsData, libraryData, frameworkMapData] = await Promise.all([
    fetchJSON('frameworks/index.json'),
    fetchJSON('controls/domains.json'),
    fetchJSON('controls/library.json'),
    fetchJSON('controls/framework-map.json'),
  ]);

  state.frameworks = frameworksData ? frameworksData.frameworks : [];
  state.controls = {
    domains: domainsData ? domainsData.domains : [],
    library: libraryData ? libraryData.controls : [],
  };
  state.frameworkMap = frameworkMapData || null;

  // Pre-load home framework data
  const home = state.frameworks.find(f => f.isHome);
  if (home) {
    const homeData = await fetchJSON(`frameworks/${home.id}/index.json`);
    if (homeData) state.frameworkData[home.id] = homeData;
  }

  // Set up event listeners
  window.addEventListener('hashchange', render);
  document.addEventListener('click', handleClick);
  document.getElementById('search-input').addEventListener('input', debounce(handleSearch, 300));

  render();
}

init().catch(err => {
  console.error('Init failed:', err);
  document.getElementById('app').innerHTML = `<div class="main"><div class="empty-state"><div class="empty-state-text">Failed to load application data</div><div class="empty-state-hint">${esc(err.message)}</div></div></div>`;
});
