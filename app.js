/* === AI Governance Explorer — Application Logic === */

const state = {
  frameworks: null,
  frameworkData: {},    // keyed by framework id
  controls: null,       // { domains, library }
  frameworkMap: null,
  penalties: null,
  crosswalks: null,
  riskTaxonomy: null,   // { categories, coverage, useCases }
  riskManagement: null, // { methodology, matrix, register, checklist, treatment }
  route: { view: 'overview' },
};

const cache = new Map();

function renderFetchError(el, url, error) {
  el.innerHTML = '<div class="fetch-error">' +
    '<h2>Failed to load data</h2>' +
    '<p>Could not fetch <strong>' + esc(url) + '</strong></p>' +
    (error ? '<p class="error-detail">' + esc(String(error)) + '</p>' : '') +
    '<button onclick="location.reload()">Retry</button>' +
    '</div>';
}

async function fetchJSON(path) {
  if (cache.has(path)) return cache.get(path);
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cache.set(path, data);
    return data;
  } catch (e) {
    console.error(`Failed to load ${path}:`, e);
    const app = document.getElementById('app');
    if (app) renderFetchError(app, path, e);
    return null;
  }
}

function showError(el, message, detail) {
  el.innerHTML = `<div class="error-state">
    <h2>Failed to load data</h2>
    <p class="error-message">${esc(detail || message)}</p>
    <button onclick="location.reload()">Retry</button>
  </div>`;
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
  if (!hash || hash === 'overview') return { view: 'overview' };
  if (hash.startsWith('search/')) return { view: 'search', query: decodeURIComponent(hash.slice(7)) };
  if (hash === 'framework') return { view: 'framework' };
  if (hash === 'frameworks') return { view: 'framework' }; // legacy redirect
  if (hash.startsWith('framework/')) return { view: 'framework-detail', id: hash.slice(10) };
  if (hash === 'controls') return { view: 'controls' };
  if (hash.startsWith('control/')) return { view: 'control-detail', slug: hash.slice(8) };
  if (hash === 'risk') return { view: 'risk' };
  if (hash === 'risk-taxonomy') return { view: 'risk', sub: 'taxonomy' }; // legacy redirect
  if (hash === 'risk-management') return { view: 'risk', sub: 'methodology' }; // legacy redirect
  if (hash.startsWith('risk/')) return { view: 'risk', sub: hash.slice(5) };
  if (hash === 'comparison') return { view: 'comparison' };
  if (hash === 'framework-comparison') return { view: 'comparison' }; // legacy redirect
  if (hash === 'reference') return { view: 'reference' };
  if (hash.startsWith('reference/')) return { view: 'reference', sub: hash.slice(10) };
  if (hash === 'crosswalks') return { view: 'reference', sub: 'crosswalks' }; // legacy redirect
  if (hash === 'penalties') return { view: 'reference', sub: 'penalties' }; // legacy redirect
  if (hash === 'artifacts') return { view: 'reference', sub: 'artifacts' }; // legacy redirect
  return { view: 'overview' };
}

function updateNav() {
  document.querySelectorAll('.nav-link').forEach(el => {
    const view = el.dataset.view;
    el.classList.toggle('active',
      view === state.route.view ||
      (view === 'overview' && state.route.view === 'search') ||
      (view === 'framework' && state.route.view === 'framework-detail') ||
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
    case 'framework': renderFrameworks(app); break;
    case 'framework-detail': renderFrameworkDetail(app, state.route.id); break;
    case 'controls': renderControls(app); break;
    case 'control-detail': renderControlDetail(app, state.route.slug); break;
    case 'risk': renderRisk(app, state.route.sub); break;
    case 'comparison': renderFrameworkComparison(app); break;
    case 'reference': renderReference(app, state.route.sub); break;
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
    <div class="stats-banner">
      <div class="stat-card"><div class="stat-value">${fws.length}</div><div class="stat-label">Frameworks</div></div>
      <div class="stat-card"><div class="stat-value">${tier1.length}</div><div class="stat-label">Tier 1 (Full)</div></div>
      <div class="stat-card"><div class="stat-value">${binding.length}</div><div class="stat-label">Binding Laws</div></div>
      <div class="stat-card"><div class="stat-value">${controlCount}</div><div class="stat-label">Controls</div></div>
      <div class="stat-card"><div class="stat-value">${domainCount}</div><div class="stat-label">Domains</div></div>
    </div>

    ${home ? `
    <div class="detail-section">
      <div class="section-header">
        <div class="page-title">Home Framework</div>
        <div class="page-sub">Anchor framework for cross-framework comparison</div>
      </div>
      <a href="#framework/${home.id}" class="control-card" style="border-left: 4px solid #DC2626;">
        <div class="control-card-header">
          <div>
            <div class="control-card-title">${esc(home.name)}</div>
            <div class="control-card-desc">${esc(home.shortName)} — ${esc(home.jurisdiction)}</div>
          </div>
          <span class="badge badge-home">HOME</span>
        </div>
        <div class="control-card-desc">${esc(home.description)}</div>
        <div class="control-card-meta">
          <span class="badge badge-tier1">Tier 1</span>
          <span class="badge ${home.binding ? 'badge-binding' : 'badge-voluntary'}">${home.binding ? 'Binding' : 'Voluntary'}</span>
          <span class="badge badge-type">${esc(home.type)}</span>
          <span class="badge badge-jurisdiction">${esc(home.jurisdiction)}</span>
        </div>
        <div class="control-card-meta">
          <span class="control-card-meta-item">${home.primaryUnitCount} ${home.primaryUnit}s</span>
          <span class="control-card-meta-item">${esc(home.issuingBody)}</span>
          ${home.effectiveDate ? `<span class="control-card-meta-item">Effective: ${home.effectiveDate}</span>` : ''}
        </div>
      </a>
    </div>` : ''}

    <div class="detail-section">
      <div class="section-header">
        <div class="page-title">Tier 1 Frameworks — Full Extraction</div>
        <div class="page-sub">Article/clause-level extraction for provision-level cross-referencing</div>
      </div>
      <div class="control-grid">
        ${tier1.filter(f => !f.isHome).map(f => renderFrameworkCard(f)).join('')}
      </div>
    </div>

    <div class="detail-section">
      <div class="section-header">
        <div class="page-title">Tier 2 Frameworks — Summary</div>
        <div class="page-sub">Key provisions and comparison data</div>
      </div>
      <div class="control-grid">
        ${tier2.map(f => renderFrameworkCard(f)).join('')}
      </div>
    </div>

    ${domainCount > 0 ? `
    <div class="detail-section">
      <div class="section-header">
        <div class="page-title">Control Domains</div>
        <div class="page-sub">${controlCount} controls across ${domainCount} governance domains</div>
      </div>
      <div class="control-grid">
        ${state.controls.domains.map(d => {
          const count = state.controls.library.filter(c => c.domain === d.slug).length;
          return `<div class="control-card" onclick="location.hash='controls'">
            <div class="control-card-title">${esc(d.name)}</div>
            <div class="control-card-desc">${esc(d.description)}</div>
            <div class="control-card-meta"><span class="control-card-meta-item">${count} controls</span></div>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}
  </div>`;
}

function renderFrameworkCard(f) {
  const colorClass = getFrameworkColorClass(f.jurisdiction);
  return `<a href="#framework/${f.id}" class="control-card ${colorClass}">
    <div class="control-card-header">
      <div>
        <div class="control-card-title">${esc(f.shortName)}</div>
        <div class="control-card-desc">${esc(f.name)}</div>
      </div>
    </div>
    <div class="control-card-desc">${esc(f.description)}</div>
    <div class="control-card-meta">
      <span class="badge badge-tier${f.tier}">Tier ${f.tier}</span>
      <span class="badge ${f.binding ? 'badge-binding' : f.status === 'proposed' ? 'badge-proposed' : 'badge-voluntary'}">${f.binding ? 'Binding' : f.status === 'proposed' ? 'Proposed' : 'Voluntary'}</span>
      <span class="badge badge-type">${esc(f.type)}</span>
      <span class="badge badge-jurisdiction">${esc(f.jurisdiction)}</span>
      ${f.isHome ? '<span class="badge badge-home">HOME</span>' : ''}
      ${f.sourceType === 'constructed-indicative' ? '<span class="badge badge-constructed" title="Content constructed from public summaries, not from the paywalled standard">Indicative</span>' : ''}
    </div>
    <div class="control-card-meta">
      <span class="control-card-meta-item">${f.primaryUnitCount} ${f.primaryUnit}s</span>
      <span class="control-card-meta-item">${esc(f.issuingBody)}</span>
      ${f.effectiveDate ? `<span class="control-card-meta-item">${f.effectiveDate}</span>` : ''}
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
      <div class="page-title">AI Governance Frameworks</div>
      <div class="page-sub">${fws.length} frameworks across ${new Set(fws.map(f => f.jurisdiction)).size} jurisdictions</div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Tier 1 — Full Extraction (${tier1.length})</div>
      <div class="control-grid">
        ${tier1.map(f => renderFrameworkCard(f)).join('')}
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Tier 2 — Summary (${tier2.length})</div>
      <div class="control-grid">
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
    el.innerHTML = `<div class="main"><div class="empty-state"><div class="empty-state-text">Framework not found: ${esc(id)}</div><a href="#framework">Back to frameworks</a></div></div>`;
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
      <a href="#framework">Frameworks</a>
      <span class="breadcrumb-sep">/</span>
      <span>${esc(fw.shortName)}</span>
    </div>

    <div class="detail-header ${colorClass}" style="border-left: 4px solid; padding-left: 1rem;">
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

    <div class="stats-banner">
      <div class="stat-card"><div class="stat-value">${fw.primaryUnitCount}</div><div class="stat-label">${fw.primaryUnit}s</div></div>
      <div class="stat-card"><div class="stat-value">${mappedControls.length}</div><div class="stat-label">Mapped Controls</div></div>
      <div class="stat-card"><div class="stat-value">${fw.binding ? 'Yes' : 'No'}</div><div class="stat-label">Binding</div></div>
      <div class="stat-card"><div class="stat-value">${fw.effectiveDate || '—'}</div><div class="stat-label">Effective</div></div>
    </div>

    <div class="control-card" style="margin-bottom: 1.5rem;">
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

    ${fwData && fwData.subcategories ? renderSubcategoriesList(fwData) : ''}

    ${fwData && fwData.clauses ? renderClausesList(fwData) : ''}

    ${fwData && fwData.articles ? renderArticlesList(fwData, id) : ''}

    ${fwData && fwData.keyProvisions ? renderKeyProvisions(fwData) : ''}

    ${fwData && fwData.sections ? renderSections(fwData) : ''}

    ${fwData && fwData.keyShifts ? renderKeyShifts(fwData) : ''}

    ${fwData && fwData.aida ? renderCanadaAI(fwData) : ''}

    ${fwData && fwData.keyDesignChoices ? renderDesignChoices(fwData) : ''}

    ${mappedControls.length > 0 ? `
    <div class="detail-section">
      <div class="detail-section-title">Mapped Controls (${mappedControls.length})</div>
      <div class="control-grid">
        ${mappedControls.map(c => renderControlCard(c)).join('')}
      </div>
    </div>` : ''}
  </div>`;

  // Load supplementary data for EU AI Act
  if (id === 'eu-ai-act') {
    loadEuAiActSupplementary(el);
  }
}

async function loadEuAiActSupplementary(el) {
  const [chaptersData, annexesData, riskData] = await Promise.all([
    fetchJSON('frameworks/eu-ai-act/chapters.json'),
    fetchJSON('frameworks/eu-ai-act/annexes.json'),
    fetchJSON('frameworks/eu-ai-act/risk-classification.json'),
  ]);

  // Insert chapters section
  if (chaptersData) {
    const chaptersHtml = `<div class="detail-section" id="eu-chapters">
      <div class="detail-section-title">Chapters (${chaptersData.chapters.length})</div>
      ${chaptersData.chapters.map(ch => `
        <div class="accordion-item">
          <button class="accordion-trigger" data-accordion>
            <span>Chapter ${ch.number}: ${esc(ch.title)} <span style="color:var(--text-muted);font-weight:400;">(Art. ${ch.articleRange})</span></span>
            <span class="chevron">&#9654;</span>
          </button>
          <div class="accordion-content">
            <p style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:0.5rem;">${esc(ch.description)}</p>
            ${ch.effectiveDate ? `<p style="font-size:0.75rem;color:var(--warning);margin-bottom:0.5rem;">Effective: ${ch.effectiveDate}</p>` : ''}
            ${ch.sections ? ch.sections.map(s => `<div style="font-size:0.8125rem;color:var(--text-secondary);padding:0.25rem 0;"><span class="badge badge-domain" style="margin-right:0.5rem;">Section ${s.section}</span>${esc(s.title)} (Art. ${s.articles})</div>`).join('') : ''}
          </div>
        </div>
      `).join('')}
    </div>`;

    const mappedSection = el.querySelector('.detail-section:last-child');
    if (mappedSection) mappedSection.insertAdjacentHTML('beforebegin', chaptersHtml);
  }

  // Insert risk classification
  if (riskData) {
    const riskHtml = `<div class="detail-section" id="eu-risk">
      <div class="detail-section-title">Risk Classification Tiers</div>
      <div class="control-grid">
        ${riskData.riskTiers.map(t => {
          const tierColors = { 'prohibited': 'var(--danger)', 'high-risk': 'var(--warning)', 'limited-risk': 'var(--info)', 'minimal-risk': 'var(--success)', 'gpai': 'var(--purple)' };
          const color = tierColors[t.tier] || 'var(--accent)';
          return `<div class="control-card" style="border-left:4px solid ${color};">
            <div class="control-card-title" style="color:${color};">${esc(t.name)}</div>
            <div class="control-card-desc">${esc(t.description)}</div>
            <div class="control-card-meta" style="margin-top:0.5rem;">
              <span class="control-card-meta-item">${esc(t.legalBasis)}</span>
              ${t.effectiveDate ? `<span class="control-card-meta-item">${t.effectiveDate}</span>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
      ${riskData.phasedTimeline ? `
      <div style="margin-top:1rem;">
        <div style="font-size:0.875rem;font-weight:600;margin-bottom:0.5rem;">Phased Application Timeline</div>
        <table class="mapping-table">
          <thead><tr><th>Months</th><th>Date</th><th>Scope</th></tr></thead>
          <tbody>
            ${riskData.phasedTimeline.map(p => `<tr>
              <td style="font-weight:600;">${p.months}</td>
              <td>${p.date}</td>
              <td>${esc(p.scope)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}
    </div>`;

    const chaptersSection = el.querySelector('#eu-chapters');
    if (chaptersSection) chaptersSection.insertAdjacentHTML('afterend', riskHtml);
  }

  // Insert annexes
  if (annexesData) {
    const annexHtml = `<div class="detail-section" id="eu-annexes">
      <div class="detail-section-title">Annexes (${annexesData.annexes.length})</div>
      ${annexesData.annexes.map(a => `
        <div class="accordion-item">
          <button class="accordion-trigger" data-accordion>
            <span>Annex ${a.number}: ${esc(a.title)}</span>
            <span class="chevron">&#9654;</span>
          </button>
          <div class="accordion-content">
            <p style="font-size:0.8125rem;color:var(--text-secondary);">${esc(a.description)}</p>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem;">Referenced by: ${esc(a.referencedBy)}</div>
            ${a.categories ? `<ul class="item-list" style="margin-top:0.5rem;">${a.categories.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
          </div>
        </div>
      `).join('')}
    </div>`;

    const riskSection = el.querySelector('#eu-risk') || el.querySelector('#eu-chapters');
    if (riskSection) riskSection.insertAdjacentHTML('afterend', annexHtml);
  }
}

function renderPrinciplesList(principles) {
  return `<div class="detail-section">
    <div class="detail-section-title">Principles (${principles.length})</div>
    <div class="control-grid">
      ${principles.map(p => `
        <div class="principle-card">
          <div class="principle-number">Principle ${p.number}</div>
          <div class="principle-name">${esc(p.name)}</div>
          <div class="principle-definition">"${esc(p.definition)}"</div>
          <div class="control-card-desc">${esc(p.description)}</div>
          ${p.keyElements ? `
          <ul class="item-list" style="margin-top:0.75rem;">
            ${p.keyElements.map(e => `<li>${esc(e)}</li>`).join('')}
          </ul>` : ''}
        </div>
      `).join('')}
    </div>
  </div>`;
}

function renderSubcategoriesList(fwData) {
  const subs = fwData.subcategories || [];
  if (subs.length === 0) return '';

  // Group by function
  const funcs = {};
  for (const s of subs) {
    if (!funcs[s.function]) funcs[s.function] = [];
    funcs[s.function].push(s);
  }

  return `<div class="detail-section">
    <div class="detail-section-title">Subcategories (${subs.length})</div>
    ${Object.entries(funcs).map(([fn, items]) => `
      <div class="accordion-item">
        <button class="accordion-trigger" data-accordion>
          <span>${esc(fn)} <span style="color:var(--text-muted);font-weight:400;">(${items.length} subcategories)</span></span>
          <span class="chevron">&#9654;</span>
        </button>
        <div class="accordion-content">
          <table class="mapping-table">
            <thead><tr><th style="width:120px;">ID</th><th>Description</th></tr></thead>
            <tbody>
              ${items.map(s => `<tr>
                <td style="font-weight:600;font-family:var(--mono);font-size:0.75rem;">${esc(s.id)}</td>
                <td style="font-size:0.8125rem;">${esc(s.title)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `).join('')}
  </div>`;
}

function renderClausesList(fwData) {
  const clauses = fwData.clauses || [];
  if (clauses.length === 0) return '';

  return `<div class="detail-section">
    <div class="detail-section-title">Clauses (${clauses.length})</div>
    ${fwData.sourceType === 'constructed-indicative' ? `<div class="control-card" style="margin-bottom:1rem;border-left:4px solid var(--warning);"><div class="control-card-desc" style="color:var(--warning);">Content constructed from publicly available summaries. Verify against the purchased ISO standard.</div></div>` : ''}
    ${clauses.map(c => `
      <div class="accordion-item">
        <button class="accordion-trigger" data-accordion>
          <span>Clause ${esc(c.id)}: ${esc(c.title)}</span>
          <span class="chevron">&#9654;</span>
        </button>
        <div class="accordion-content">
          <p style="font-size:0.8125rem;color:var(--text-secondary);">${esc(c.summary)}</p>
          ${c.subclauses ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.5rem;">Subclauses: ${c.subclauses.join(', ')}</div>` : ''}
        </div>
      </div>
    `).join('')}
  </div>`;
}

function renderArticlesList(fwData, fwId) {
  const articles = fwData.articles || [];
  if (articles.length === 0) return '';

  // Group by chapter
  const chapters = {};
  for (const a of articles) {
    const ch = a.chapter || 0;
    if (!chapters[ch]) chapters[ch] = [];
    chapters[ch].push(a);
  }

  return `<div class="detail-section">
    <div class="detail-section-title">Articles (${articles.length})</div>
    ${Object.entries(chapters).map(([chNum, arts]) => `
      <div class="accordion-item">
        <button class="accordion-trigger" data-accordion>
          <span>Chapter ${chNum} <span style="color:var(--text-muted);font-weight:400;">(${arts.length} article${arts.length !== 1 ? 's' : ''})</span></span>
          <span class="chevron">&#9654;</span>
        </button>
        <div class="accordion-content">
          <table class="mapping-table">
            <thead><tr><th style="width:80px;">Article</th><th>Title</th><th>Summary</th></tr></thead>
            <tbody>
              ${arts.map(a => `<tr>
                <td style="font-weight:600;white-space:nowrap;">Art. ${a.number}</td>
                <td style="font-weight:500;">${esc(a.title)}</td>
                <td style="font-size:0.75rem;">${esc(a.summary)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `).join('')}
  </div>`;
}

// === Tier 2 Framework Renderers ===

function renderKeyProvisions(fwData) {
  const provisions = fwData.keyProvisions || [];
  if (provisions.length === 0) return '';
  return `<div class="detail-section">
    <div class="detail-section-title">Key Provisions (${provisions.length})</div>
    ${fwData.structure ? `<div class="control-card" style="margin-bottom:1rem;">
      <div class="control-card-desc">${fwData.structure.totalArticles} Articles across ${fwData.structure.totalChapters} Chapters</div>
      <table class="data-table">
        <thead><tr><th>Chapter</th><th>Title</th><th>Articles</th></tr></thead>
        <tbody>${fwData.structure.chapters.map(ch => `<tr><td style="font-weight:600;">${ch.number}</td><td>${esc(ch.title)}</td><td>${esc(ch.articleRange)}</td></tr>`).join('')}</tbody>
      </table>
    </div>` : ''}
    ${provisions.map(p => `
      <div class="accordion-item">
        <div class="accordion-header" data-accordion>
          <span class="accordion-icon"></span>
          <span class="accordion-title">${esc(p.name)}</span>
          ${p.articles ? `<span class="badge badge-domain">${p.articles.join(', ')}</span>` : ''}
        </div>
        <div class="accordion-body">
          <p style="margin:0;font-size:0.8125rem;color:var(--text-secondary);">${esc(p.description)}</p>
        </div>
      </div>
    `).join('')}
  </div>`;
}

function renderSections(fwData) {
  const sections = fwData.sections || [];
  if (sections.length === 0 || fwData.keyProvisions) return '';
  return `<div class="detail-section">
    <div class="detail-section-title">Sections (${sections.length})</div>
    ${sections.map(s => `
      <div class="accordion-item">
        <div class="accordion-header" data-accordion>
          <span class="accordion-icon"></span>
          <span class="accordion-title">Section ${s.number}: ${esc(s.title)}</span>
        </div>
        <div class="accordion-body">
          <p style="margin:0;font-size:0.8125rem;color:var(--text-secondary);">${esc(s.description)}</p>
        </div>
      </div>
    `).join('')}
  </div>`;
}

function renderKeyShifts(fwData) {
  const shifts = fwData.keyShifts || [];
  if (shifts.length === 0) return '';
  const revokes = fwData.revokes;
  return `<div class="detail-section">
    <div class="detail-section-title">Key Policy Shifts</div>
    ${revokes ? `<div class="control-card" style="margin-bottom:1rem;border-left:4px solid var(--warning);">
      <div class="control-card-desc">Revokes: ${esc(revokes.executiveOrder)} — ${esc(revokes.title)}</div>
      <div style="font-size:0.75rem;color:var(--text-muted);">Signed: ${revokes.signedDate}. Also revoked OMB memoranda: ${revokes.ombMemorandaRevoked.join(', ')}</div>
    </div>` : ''}
    <div class="control-card">
      <ul style="margin:0;padding-left:1.25rem;">
        ${shifts.map(s => `<li style="margin-bottom:0.375rem;font-size:0.8125rem;">${esc(s)}</li>`).join('')}
      </ul>
    </div>
    ${fwData.actionPlan ? `<div class="control-card" style="margin-top:1rem;">
      <div class="control-card-desc">${esc(fwData.actionPlan.title)}</div>
      <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.5rem;">Published: ${fwData.actionPlan.publishedDate}</div>
      <div style="font-size:0.8125rem;">${fwData.actionPlan.pillars.map(p => `<span class="badge badge-domain">${esc(p)}</span>`).join(' ')}</div>
    </div>` : ''}
  </div>`;
}

function renderCanadaAI(fwData) {
  const aida = fwData.aida;
  const vc = fwData.voluntaryCode;
  return `<div class="detail-section">
    <div class="detail-section-title">AIDA (${esc(aida.status.toUpperCase())})</div>
    <div class="control-card" style="border-left:4px solid var(--danger);margin-bottom:1rem;">
      <div class="control-card-desc">${esc(aida.fullName)}</div>
      <div style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:0.5rem;">Part of ${esc(aida.parentBill)} — ${esc(aida.statusDetail)}</div>
      <div class="control-card-desc" style="margin-top:0.75rem;">What AIDA Would Have Required:</div>
      <ul style="margin:0;padding-left:1.25rem;">
        ${aida.proposedRequirements.map(r => `<li style="margin-bottom:0.25rem;font-size:0.8125rem;">${esc(r)}</li>`).join('')}
      </ul>
    </div>

    <div class="detail-section-title">Voluntary Code of Conduct (${esc(vc.status.toUpperCase())})</div>
    <div class="control-card">
      <div class="control-card-desc">${esc(vc.fullName)}</div>
      <div style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:0.5rem;">Published: ${vc.publishedDate} — ${esc(vc.statusDetail)}</div>
      <div style="margin-top:0.5rem;">${vc.principles.map(p => `<span class="badge badge-domain">${esc(p)}</span>`).join(' ')}</div>
    </div>
  </div>`;
}

function renderDesignChoices(fwData) {
  const choices = fwData.keyDesignChoices || [];
  if (choices.length === 0) return '';
  return `<div class="detail-section">
    <div class="detail-section-title">Key Design Choices</div>
    <div class="control-card">
      <ul style="margin:0;padding-left:1.25rem;">
        ${choices.map(c => `<li style="margin-bottom:0.375rem;font-size:0.8125rem;">${esc(c)}</li>`).join('')}
      </ul>
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
      <div class="page-title">Unified Control Library</div>
      <div class="page-sub">${library.length} controls across ${domains.length} governance domains</div>
    </div>

    <div class="stats-banner">
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
          <p style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:0.75rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border)">${esc(d.description)}</p>
          <ul class="clause-list">
            ${domainControls.map(c => `
              <li><a class="clause-link" href="#control/${c.slug}">
                <span class="clause-title">${esc(c.name)}</span>
                <span class="badge badge-type">${esc(c.type)}</span>
                <span class="badge badge-category">${esc(c.layer)}</span>
              </a></li>`).join('')}
          </ul>
        </div>
      </div>`;
    }).join('')}

    <div class="detail-section" style="margin-top:1.5rem;">
      <div class="detail-section-title">Coverage Matrix</div>
      <div style="overflow-x:auto;">
        ${(() => {
          const fws = state.frameworks || [];
          const fwShortNames = { 'malaysia-ngaige': 'NGAIGE', 'eu-ai-act': 'EU AI Act', 'nist-ai-rmf': 'NIST RMF', 'iso-42001': 'ISO 42001', 'singapore-maigf': 'SG MAIGF', 'oecd-ai-principles': 'OECD', 'unesco-ai-ethics': 'UNESCO', 'china-genai': 'China GenAI', 'uk-ai-framework': 'UK AI', 'us-ai-policy': 'US AI', 'canada-ai': 'Canada AI' };
          const fwIds = fws.map(f => f.id);
          return `<table class="mapping-table">
          <thead>
            <tr>
              <th>Control</th>
              ${fwIds.map(id => `<th title="${esc(fws.find(f => f.id === id)?.name || id)}">${esc(fwShortNames[id] || id)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${library.map(c => {
              const m = c.frameworkMappings || {};
              return `<tr>
                <td><a href="#control/${c.slug}">${esc(c.name)}</a></td>
                ${fwIds.map(id => `<td>${m[id] ? `<span class="coverage-cell coverage-full" title="${m[id].join(', ')}">●</span>` : '<span class="coverage-cell coverage-none">—</span>'}</td>`).join('')}
              </tr>`;
            }).join('')}
          </tbody>
        </table>`;
        })()}
      </div>
    </div>
  </div>`;
}

function renderControlCard(c) {
  const domain = state.controls ? state.controls.domains.find(d => d.slug === c.domain) : null;
  return `<a href="#control/${c.slug}" class="control-card">
    <div class="control-card-header">
      <div class="control-card-title">${esc(c.name)}</div>
    </div>
    <div class="control-card-desc">${esc(c.description)}</div>
    <div class="control-card-meta">
      ${domain ? `<span class="badge badge-domain">${esc(domain.name)}</span>` : ''}
      <span class="badge badge-${c.type}">${esc(c.type)}</span>
      <span class="badge badge-${c.layer}">${esc(c.layer)}</span>
    </div>
    <div class="control-card-meta">
      ${c.frameworkMappings ? `<span class="control-card-meta-item">${Object.keys(c.frameworkMappings).length} frameworks</span>` : ''}
    </div>
  </a>`;
}

// === Control Detail ===

async function renderControlDetail(el, slug) {
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

  // Load artifact and evidence data for audit package
  if (!state.artifactInventory) {
    state.artifactInventory = await fetchJSON('artifacts/inventory.json') || {};
  }
  if (!state.evidenceIndex) {
    state.evidenceIndex = await fetchJSON('evidence/index.json') || {};
  }

  // Build artifact index from categories structure
  const controlSlug = c.slug;
  const artifactIndex = {};
  (state.artifactInventory.categories || []).forEach(cat => {
    (cat.artifacts || []).forEach(a => { artifactIndex[a.id] = a; });
  });
  const linkedArtifacts = Object.values(artifactIndex)
    .filter(a => Array.isArray(a.controlSlugs) && a.controlSlugs.includes(controlSlug))
    .sort((a, b) => (b.mandatory ? 1 : 0) - (a.mandatory ? 1 : 0));

  // Find evidence for this control
  const linkedArtifactIds = new Set(linkedArtifacts.map(a => a.id));
  const linkedEvidence = [];
  (state.evidenceIndex.evidence || []).forEach(grp => {
    if (grp.controlSlug === controlSlug) {
      (grp.items || []).forEach(item => {
        if (linkedEvidence.find(e => e.id === item.id)) return;
        const itemArtifacts = item.artifactSlugs || [];
        if (!itemArtifacts.length || itemArtifacts.some(id => linkedArtifactIds.has(id))) {
          linkedEvidence.push(item);
        }
      });
    }
  });

  // Load requirements data
  if (!state.requirementsIndex) {
    state.requirementsIndex = await fetchJSON('requirements/index.json') || {};
  }
  const controlReqs = (state.requirementsIndex.requirements || []).find(r => r.controlSlug === controlSlug);

  // Build audit package HTML — Evidence FIRST, then Artifacts (auditor flow)
  const auditPackageHTML = (linkedArtifacts.length || linkedEvidence.length) ? `
    <section class="audit-package">
      <h2 class="audit-package-title">
        Audit Package
        <span class="audit-package-counts">
          <span class="badge badge-evidence">${linkedEvidence.length} evidence items</span>
          <span class="badge badge-artifacts">${linkedArtifacts.length} artifacts</span>
        </span>
      </h2>

      ${linkedEvidence.length ? `
      <div class="accordion">
        <div class="accordion-item">
          <button class="accordion-trigger" aria-expanded="true">
            <span>Evidence Checklist (${linkedEvidence.length})</span>
            <span class="accordion-icon">&#9660;</span>
          </button>
          <div class="accordion-content" role="region">
            ${linkedEvidence.map(ev => `
            <div class="evidence-item">
              <div class="evidence-item-header">
                <span class="evidence-id">${esc(ev.id)}</span>
                <span class="evidence-item-name">${esc(ev.name)}</span>
              </div>
              <p class="evidence-item-desc">${esc(ev.description || '')}</p>
              ${(ev.whatGoodLooksLike && ev.whatGoodLooksLike.length) || (ev.commonGaps && ev.commonGaps.length) ? `
              <div class="evidence-detail-grid">
                ${ev.whatGoodLooksLike && ev.whatGoodLooksLike.length ? `
                <div class="evidence-block evidence-good">
                  <div class="evidence-block-label">What Good Looks Like</div>
                  <ul>${ev.whatGoodLooksLike.map(w => `<li>${esc(w)}</li>`).join('')}</ul>
                </div>` : ''}
                ${ev.commonGaps && ev.commonGaps.length ? `
                <div class="evidence-block evidence-gap">
                  <div class="evidence-block-label">Common Gaps</div>
                  <ul>${ev.commonGaps.map(g => `<li>${esc(g)}</li>`).join('')}</ul>
                </div>` : ''}
              </div>` : ''}
              ${ev.artifactSlugs && ev.artifactSlugs.length ? `
              <div class="evidence-item-meta">
                <span class="meta-item"><strong>Linked Artifacts:</strong> ${ev.artifactSlugs.map(aId => {
                  const art = artifactIndex[aId];
                  return art ? esc(art.name) : esc(aId);
                }).join(', ')}</span>
              </div>` : ''}
            </div>`).join('')}
          </div>
        </div>
      </div>` : ''}

      ${linkedArtifacts.length ? `
      <div class="accordion">
        <div class="accordion-item">
          <button class="accordion-trigger" aria-expanded="true">
            <span>Required Artifacts (${linkedArtifacts.length})</span>
            <span class="accordion-icon">&#9660;</span>
          </button>
          <div class="accordion-content" role="region">
            ${linkedArtifacts.map(a => `
            <div class="artifact-card">
              <div class="artifact-card-header">
                <span class="artifact-card-name">${esc(a.name)}</span>
                <div class="artifact-card-badges">
                  <span class="badge ${a.mandatory ? 'badge-mandatory' : 'badge-optional'}">${a.mandatory ? 'Mandatory' : 'Optional'}</span>
                  ${a.format ? `<span class="badge badge-category">${esc(a.format)}</span>` : ''}
                </div>
              </div>
              <p class="artifact-card-desc">${esc(a.description || '')}</p>
              <div class="artifact-card-meta">
                <span class="meta-item"><strong>ID:</strong> ${esc(a.id)}</span>
              </div>
            </div>`).join('')}
          </div>
        </div>
      </div>` : ''}
    </section>` : '';

  // Build source provisions from framework mappings
  const sourceProvisionsHTML = c.frameworkMappings ? `
    <section class="detail-section">
      <h2 class="detail-section-title">Source Provisions</h2>
      <div class="provision-links">
        ${Object.entries(c.frameworkMappings).map(([fwId, provisions]) => {
          const fw = fws.find(f => f.id === fwId);
          return provisions.map(p => `
            <a href="#framework/${fwId}" class="provision-link">
              <span class="provision-id">${esc(p)}</span>
              <span class="provision-title">${fw ? esc(fw.shortName) : esc(fwId)}</span>
            </a>`).join('');
        }).join('')}
      </div>
    </section>` : '';

  el.innerHTML = `<div class="main">
    <nav class="breadcrumbs">
      <a href="#controls">Controls</a>
      <span class="sep">/</span>
      ${domain ? `<span>${esc(domain.name)}</span><span class="sep">/</span>` : ''}
      <span class="current">${esc(c.name)}</span>
    </nav>

    <article class="control-detail">
      <header class="control-detail-header">
        <div class="control-detail-id-row">
          ${domain ? `<span class="badge badge-domain">${esc(domain.name)}</span>` : ''}
          <span class="badge badge-type-${c.type}">${esc(c.type)}</span>
          <span class="badge badge-category">${esc(c.layer)}</span>
        </div>
        <h1 class="control-detail-title">${esc(c.name)}</h1>
        <p class="control-detail-desc">${esc(c.description)}</p>
      </header>

      <!-- Section 1: Requirements -->
      ${controlReqs ? `
      <section class="detail-section">
        <h2 class="detail-section-title">Requirements</h2>
        <div class="requirements-grid">
          ${controlReqs.legal && controlReqs.legal.length ? `
          <div class="requirement-block requirement-legal">
            <div class="requirement-block-label">Legal / Regulatory</div>
            <ul>${controlReqs.legal.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
          </div>` : ''}
          ${controlReqs.technical && controlReqs.technical.length ? `
          <div class="requirement-block requirement-technical">
            <div class="requirement-block-label">Technical</div>
            <ul>${controlReqs.technical.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
          </div>` : ''}
          ${controlReqs.governance && controlReqs.governance.length ? `
          <div class="requirement-block requirement-governance">
            <div class="requirement-block-label">Governance</div>
            <ul>${controlReqs.governance.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
          </div>` : ''}
        </div>
      </section>` : ''}

      <!-- Section 2: Key Activities -->
      ${c.keyActivities && c.keyActivities.length > 0 ? `
      <section class="detail-section">
        <h2 class="detail-section-title">Key Activities</h2>
        <ul class="activity-list">
          ${c.keyActivities.map(a => `<li>${esc(a)}</li>`).join('')}
        </ul>
      </section>` : ''}

      <!-- Section 3: Maturity Levels -->
      ${c.maturity ? `
      <section class="detail-section">
        <h2 class="detail-section-title">Maturity Levels</h2>
        <div class="maturity-grid">
          <div class="maturity-card maturity-basic">
            <div class="maturity-label">Basic</div>
            <p>${esc(c.maturity.basic)}</p>
          </div>
          <div class="maturity-card maturity-mature">
            <div class="maturity-label">Mature</div>
            <p>${esc(c.maturity.mature)}</p>
          </div>
          <div class="maturity-card maturity-advanced">
            <div class="maturity-label">Advanced</div>
            <p>${esc(c.maturity.advanced)}</p>
          </div>
        </div>
      </section>` : ''}

      <!-- Section 4: Audit Package -->
      ${auditPackageHTML}

      <!-- Section 5: Framework Mappings -->
      ${c.frameworkMappings ? `
      <section class="detail-section">
        <h2 class="detail-section-title">Framework Mappings</h2>
        <div class="fw-mappings">
          ${Object.entries(c.frameworkMappings).map(([fwId, provisions]) => {
            const fw = fws.find(f => f.id === fwId);
            return `<div class="fw-mapping-row">
              <span class="fw-label"><a href="#framework/${fwId}" style="color:inherit;text-decoration:none;">${fw ? esc(fw.shortName) : esc(fwId)}</a></span>
              <span class="fw-codes">${provisions.join(', ')}</span>
            </div>`;
          }).join('')}
        </div>
      </section>` : ''}

      <!-- Section 6: Source Provisions -->
      ${sourceProvisionsHTML}
    </article>
  </div>`;
}

// === Risk Taxonomy ===

async function renderRiskTaxonomy(el) {
  el.innerHTML = `<div class="main"><div class="loading"><div class="spinner"></div><span>Loading risk taxonomy…</span></div></div>`;

  if (!state.riskTaxonomy) {
    const [cats, cov, uc] = await Promise.all([
      fetchJSON('risk-taxonomy/categories.json'),
      fetchJSON('risk-taxonomy/framework-coverage.json'),
      fetchJSON('risk-taxonomy/use-cases.json'),
    ]);
    state.riskTaxonomy = { categories: cats, coverage: cov, useCases: uc };
  }

  const { categories, coverage, useCases } = state.riskTaxonomy;
  if (!categories) {
    el.innerHTML = `<div class="main"><div class="empty-state"><div class="empty-state-text">Risk taxonomy data not available</div></div></div>`;
    return;
  }

  const domains = categories.domains || [];
  const totalSubs = domains.reduce((n, d) => n + (d.subcategories || []).length, 0);
  const covData = coverage ? coverage.coverage : {};
  const covFws = Object.keys(covData);
  const fwLabels = { 'malaysia-ngaige': 'NGAIGE', 'eu-ai-act': 'EU AI Act', 'nist-ai-rmf': 'NIST RMF', 'iso-42001': 'ISO 42001' };
  const levelClass = l => l === 'strong' ? 'cov-strong' : l === 'moderate' ? 'cov-moderate' : l === 'weak' ? 'cov-weak' : 'cov-none';
  const levelIcon = l => l === 'strong' ? '●' : l === 'moderate' ? '◐' : l === 'weak' ? '○' : '—';

  // Tabs: Coverage Matrix | Risk Domains | High-Risk Use Cases
  el.innerHTML = `<div class="main">
    <div class="section-header">
      <div class="page-title">AI Risk Taxonomy</div>
      <div class="page-sub">${domains.length} risk domains, ${totalSubs} subcategories — framework coverage analysis</div>
    </div>

    <div class="tabs">
      <button class="tab-btn active" data-tab="coverage-matrix">Coverage Matrix</button>
      <button class="tab-btn" data-tab="risk-domains">Risk Domains (${domains.length})</button>
      <button class="tab-btn" data-tab="use-cases">High-Risk Use Cases</button>
    </div>

    <div class="tab-panel active" id="tab-coverage-matrix">
      <div class="control-card">
        <div class="control-card-title">Framework Risk Coverage Heatmap</div>
        <div class="risk-legend">
          <span class="risk-legend-item"><span class="cov-strong">●</span> Strong</span>
          <span class="risk-legend-item"><span class="cov-moderate">◐</span> Moderate</span>
          <span class="risk-legend-item"><span class="cov-weak">○</span> Weak</span>
          <span class="risk-legend-item"><span class="cov-none">—</span> None</span>
        </div>
        <div class="table-scroll">
          <table class="data-table coverage-table">
            <thead>
              <tr>
                <th>Risk Domain</th>
                ${covFws.map(fw => `<th class="coverage-th">${esc(fwLabels[fw] || fw)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${domains.map(d => {
                return `<tr>
                  <td><strong>${esc(d.name)}</strong></td>
                  ${covFws.map(fw => {
                    const cell = covData[fw] && covData[fw][d.id] ? covData[fw][d.id] : { level: 'none', notes: '' };
                    return `<td class="coverage-td"><span class="cov-cell ${levelClass(cell.level)}" title="${esc(cell.notes)}">${levelIcon(cell.level)}</span></td>`;
                  }).join('')}
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div class="coverage-notes">
          <div class="control-card-desc">Coverage Notes</div>
          ${covFws.map(fw => {
            const fwCov = covData[fw] || {};
            const gaps = domains.filter(d => !fwCov[d.id] || fwCov[d.id].level === 'none').map(d => d.name);
            return gaps.length ? `<div class="coverage-note"><strong>${esc(fwLabels[fw] || fw)}</strong> — gaps: ${gaps.map(g => esc(g)).join(', ')}</div>` : '';
          }).join('')}
        </div>
      </div>
    </div>

    <div class="tab-panel" id="tab-risk-domains">
      ${domains.map(d => `
        <div class="accordion-item open">
          <div class="accordion-header" data-accordion>
            <span class="accordion-icon"></span>
            <span class="accordion-title">${esc(d.name)}</span>
            <span class="badge badge-domain">${(d.subcategories || []).length} subcategories</span>
          </div>
          <div class="accordion-body">
            <p style="margin:0 0 1rem;color:var(--text-secondary)">${esc(d.description)}</p>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Subcategory</th>
                  ${covFws.map(fw => `<th class="coverage-th">${esc(fwLabels[fw] || fw)}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${(d.subcategories || []).map(s => `
                  <tr>
                    <td>${esc(s.name)}</td>
                    ${covFws.map(fw => {
                      const fc = s.frameworkCoverage && s.frameworkCoverage[fw];
                      if (fc && fc.covered) {
                        return `<td class="coverage-td"><span class="cov-cell cov-strong" title="${(fc.provisions || []).join(', ')}">✓</span></td>`;
                      }
                      return `<td class="coverage-td"><span class="cov-cell cov-none">—</span></td>`;
                    }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="tab-panel" id="tab-use-cases">
      <div class="control-card">
        <div class="control-card-title">High-Risk AI Use Cases</div>
        <p style="margin:0 0 1rem;color:var(--text-secondary)">Use cases classified as high-risk under the EU AI Act (Annex III) and associated risk domains.</p>
      </div>
      ${(useCases && useCases.categories ? useCases.categories : []).map(cat => `
        <div class="accordion-item">
          <div class="accordion-header" data-accordion>
            <span class="accordion-icon"></span>
            <span class="accordion-title">${esc(cat.name)}</span>
            <span class="badge">${esc(cat.euAnnexIII)}</span>
            <span class="badge badge-domain">${(cat.useCases || []).length} use cases</span>
          </div>
          <div class="accordion-body">
            <ul style="margin:0 0 0.75rem;padding-left:1.25rem;">
              ${(cat.useCases || []).map(u => `<li style="margin-bottom:0.25rem;">${esc(u)}</li>`).join('')}
            </ul>
            <div style="font-size:0.75rem;color:var(--text-muted);">
              <strong>Risk domains:</strong> ${(cat.riskDomains || []).map(rd => {
                const dom = domains.find(d => d.id === rd);
                return `<span class="badge badge-domain">${esc(dom ? dom.name : rd)}</span>`;
              }).join(' ')}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>`;
}

// === Risk Management ===

async function renderRiskManagement(el) {
  el.innerHTML = `<div class="main"><div class="loading"><div class="spinner"></div><span>Loading risk management data…</span></div></div>`;

  if (!state.riskManagement) {
    const [methodology, matrix, register, checklist, treatment] = await Promise.all([
      fetchJSON('risk-management/methodology.json'),
      fetchJSON('risk-management/risk-matrix.json'),
      fetchJSON('risk-management/risk-register.json'),
      fetchJSON('risk-management/checklist.json'),
      fetchJSON('risk-management/treatment-options.json'),
    ]);
    state.riskManagement = { methodology, matrix, register, checklist, treatment };
  }

  const { methodology, matrix, register, checklist, treatment } = state.riskManagement;
  if (!methodology) {
    el.innerHTML = `<div class="main"><div class="empty-state"><div class="empty-state-text">Risk management data not available</div></div></div>`;
    return;
  }

  const riskCount = register ? register.risks.length : 0;
  const checkCount = checklist ? checklist.phases.reduce((n, p) => n + p.items.length, 0) : 0;
  const treatCount = treatment ? treatment.strategies.length : 0;
  const matrixLevels = matrix ? matrix.riskLevels : [];
  const riskLevelColor = (level) => {
    const l = matrixLevels.find(m => m.id === level);
    return l ? l.color : 'var(--text-muted)';
  };
  const riskLevelLabel = (score) => {
    if (!matrix) return 'Unknown';
    for (const l of matrixLevels) {
      if (score >= l.scoreRange[0] && score <= l.scoreRange[1]) return l.label;
    }
    return 'Unknown';
  };
  const riskLevelId = (score) => {
    if (!matrix) return 'low';
    for (const l of matrixLevels) {
      if (score >= l.scoreRange[0] && score <= l.scoreRange[1]) return l.id;
    }
    return 'low';
  };

  // Build 5x5 matrix display
  const matrixHTML = matrix ? (() => {
    const matrixMap = {};
    matrix.matrix.forEach(c => { matrixMap[`${c.likelihood}-${c.impact}`] = c; });
    let rows = '';
    for (let l = 5; l >= 1; l--) {
      const lLabel = matrix.axes.likelihood.scale.find(s => s.score === l);
      let cells = '';
      for (let i = 1; i <= 5; i++) {
        const c = matrixMap[`${l}-${i}`];
        const color = c ? riskLevelColor(c.level) : '#6B7280';
        cells += `<td class="matrix-cell" style="background-color:${color}20;border-left:3px solid ${color};" title="${c ? c.level.toUpperCase() + ' (' + c.score + ')' : ''}">${c ? c.score : ''}</td>`;
      }
      rows += `<tr><td class="matrix-label">${lLabel ? esc(lLabel.label) : l}</td>${cells}</tr>`;
    }
    const impactHeaders = matrix.axes.impact.scale.map(s => `<th class="matrix-header">${esc(s.label)}</th>`).join('');
    return `<table class="data-table matrix-table">
      <thead><tr><th></th>${impactHeaders}</tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="6" style="text-align:center;font-size:0.75rem;color:var(--text-muted);padding-top:0.5rem;">Impact →</td></tr></tfoot>
    </table>
    <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem;">← Likelihood</div>`;
  })() : '';

  // Build risk register summary
  const categories = register ? [...new Set(register.risks.map(r => r.category))] : [];
  const catCounts = {};
  categories.forEach(c => { catCounts[c] = register.risks.filter(r => r.category === c).length; });

  el.innerHTML = `<div class="main">
    <div class="section-header">
      <div class="page-title">AI Risk Management</div>
      <div class="page-sub">${riskCount} risks, ${checkCount} checklist items, ${treatCount} treatment strategies</div>
    </div>

    <div class="tabs">
      <button class="tab-btn active" data-tab="rm-methodology">Methodology</button>
      <button class="tab-btn" data-tab="rm-register">Risk Register (${riskCount})</button>
      <button class="tab-btn" data-tab="rm-checklist">Checklist (${checkCount})</button>
      <button class="tab-btn" data-tab="rm-treatment">Treatment Options</button>
    </div>

    <!-- Methodology Tab -->
    <div class="tab-panel active" id="tab-rm-methodology">
      <div class="control-card" style="margin-bottom:1rem;">
        <div class="control-card-title">${esc(methodology.approach.name)}</div>
        <div class="control-card-desc">${esc(methodology.approach.basis)}</div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Assessment Phases</div>
        ${methodology.approach.phases.map(p => `
          <div class="accordion-item">
            <button class="accordion-trigger" data-accordion>
              <span>Phase ${p.phase}: ${esc(p.name)}</span>
              <span class="chevron">&#9654;</span>
            </button>
            <div class="accordion-content">
              <p style="margin:0 0 0.75rem;color:var(--text-secondary)">${esc(p.description)}</p>
              <ul class="item-list">
                ${p.activities.map(a => `<li>${esc(a)}</li>`).join('')}
              </ul>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="control-grid" style="margin-top:1rem;">
        <div class="control-card">
          <div class="control-card-title">Likelihood Scale</div>
          <table class="data-table">
            <thead><tr><th>Score</th><th>Label</th><th>Description</th></tr></thead>
            <tbody>
              ${methodology.likelihoodScale.levels.map(l => `<tr>
                <td><strong>${l.score}</strong></td>
                <td>${esc(l.label)}</td>
                <td style="font-size:0.75rem;">${esc(l.description)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="control-card">
          <div class="control-card-title">Impact Scale</div>
          <table class="data-table">
            <thead><tr><th>Score</th><th>Label</th><th>Regulatory</th></tr></thead>
            <tbody>
              ${methodology.impactScale.levels.map(l => `<tr>
                <td><strong>${l.score}</strong></td>
                <td>${esc(l.label)}</td>
                <td style="font-size:0.75rem;">${esc(l.dimensions.regulatory)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      ${matrix ? `
      <div class="detail-section" style="margin-top:1rem;">
        <div class="detail-section-title">Risk Matrix (5x5)</div>
        <div class="control-card">
          <div class="risk-legend" style="margin-bottom:1rem;">
            ${matrixLevels.map(l => `<span class="risk-legend-item"><span style="color:${l.color};font-weight:700;">&#9679;</span> ${esc(l.label)} (${l.scoreRange[0]}-${l.scoreRange[1]})</span>`).join('')}
          </div>
          <div class="table-scroll">${matrixHTML}</div>
        </div>
      </div>` : ''}

      <div class="detail-section" style="margin-top:1rem;">
        <div class="detail-section-title">AI-Specific Risk Factors</div>
        ${methodology.aiSpecificRiskFactors.factors.map(f => `
          <div class="accordion-item">
            <button class="accordion-trigger" data-accordion>
              <span>${esc(f.id)}: ${esc(f.name)}</span>
              <span class="chevron">&#9654;</span>
            </button>
            <div class="accordion-content">
              <p style="margin:0 0 0.75rem;color:var(--text-secondary)">${esc(f.description)}</p>
              <div class="control-grid">
                <div>
                  <div style="font-size:0.75rem;font-weight:600;color:var(--danger);margin-bottom:0.5rem;">High Risk Indicators</div>
                  <ul class="item-list audit-gaps-list">
                    ${f.highRiskIndicators.map(i => `<li>${esc(i)}</li>`).join('')}
                  </ul>
                </div>
                <div>
                  <div style="font-size:0.75rem;font-weight:600;color:var(--success);margin-bottom:0.5rem;">Low Risk Indicators</div>
                  <ul class="item-list">
                    ${f.lowRiskIndicators.map(i => `<li>${esc(i)}</li>`).join('')}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Risk Register Tab -->
    <div class="tab-panel" id="tab-rm-register">
      <div class="stats-banner" style="margin-bottom:1rem;">
        ${categories.map(c => `<div class="stat-card"><div class="stat-value">${catCounts[c]}</div><div class="stat-label">${esc(c)}</div></div>`).join('')}
      </div>

      <div class="control-card" style="margin-bottom:1rem;">
        <div class="control-card-title">Risk Summary</div>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Risk</th>
                <th>Category</th>
                <th>Inherent</th>
                <th>Residual</th>
                <th>Treatment</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              ${(register ? register.risks : []).map(r => {
                const iLevel = riskLevelId(r.inherentRisk);
                const rLevel = riskLevelId(r.residualRisk);
                return `<tr>
                  <td><code>${esc(r.id)}</code></td>
                  <td>${esc(r.title)}</td>
                  <td><span class="badge badge-domain">${esc(r.category)}</span></td>
                  <td><span class="badge" style="background-color:${riskLevelColor(iLevel)}20;color:${riskLevelColor(iLevel)};border:1px solid ${riskLevelColor(iLevel)}40;">${r.inherentRisk} ${riskLevelLabel(r.inherentRisk)}</span></td>
                  <td><span class="badge" style="background-color:${riskLevelColor(rLevel)}20;color:${riskLevelColor(rLevel)};border:1px solid ${riskLevelColor(rLevel)}40;">${r.residualRisk} ${riskLevelLabel(r.residualRisk)}</span></td>
                  <td><span class="badge badge-type">${esc(r.treatment)}</span></td>
                  <td style="font-size:0.75rem;">${esc(r.owner)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      ${(register ? register.risks : []).map(r => `
        <div class="accordion-item">
          <button class="accordion-trigger" data-accordion>
            <span>${esc(r.id)}: ${esc(r.title)}</span>
            <span class="badge" style="background-color:${riskLevelColor(riskLevelId(r.inherentRisk))}20;color:${riskLevelColor(riskLevelId(r.inherentRisk))};border:1px solid ${riskLevelColor(riskLevelId(r.inherentRisk))}40;">${r.inherentRisk} → ${r.residualRisk}</span>
          </button>
          <div class="accordion-content">
            <p style="margin:0 0 0.75rem;color:var(--text-secondary)">${esc(r.description)}</p>
            <div class="control-grid">
              <div class="control-card">
                <div class="control-card-title" style="font-size:0.8rem;">Inherent Risk</div>
                <div style="font-size:0.75rem;">Likelihood: ${r.likelihood} | Impact: ${r.impact} | Score: <strong>${r.inherentRisk}</strong> (${riskLevelLabel(r.inherentRisk)})</div>
              </div>
              <div class="control-card">
                <div class="control-card-title" style="font-size:0.8rem;">Residual Risk</div>
                <div style="font-size:0.75rem;">Likelihood: ${r.residualLikelihood} | Impact: ${r.residualImpact} | Score: <strong>${r.residualRisk}</strong> (${riskLevelLabel(r.residualRisk)})</div>
              </div>
            </div>
            <div style="margin-top:0.75rem;">
              <div style="font-size:0.75rem;font-weight:600;margin-bottom:0.25rem;">Existing Controls</div>
              <ul class="item-list" style="font-size:0.75rem;">
                ${r.existingControls.map(c => `<li>${esc(c)}</li>`).join('')}
              </ul>
            </div>
            <div style="margin-top:0.75rem;">
              <div style="font-size:0.75rem;font-weight:600;margin-bottom:0.25rem;">Treatment Plan</div>
              <p style="font-size:0.75rem;margin:0;color:var(--text-secondary);">${esc(r.treatmentPlan)}</p>
            </div>
            <div style="margin-top:0.5rem;font-size:0.7rem;color:var(--text-muted);">
              <strong>Category:</strong> ${esc(r.category)} |
              <strong>Treatment:</strong> ${esc(r.treatment)} |
              <strong>Owner:</strong> ${esc(r.owner)} |
              <strong>Review:</strong> ${esc(r.reviewDate)} |
              <strong>Frameworks:</strong> ${r.frameworkRef.map(f => esc(f)).join(', ')}
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Checklist Tab -->
    <div class="tab-panel" id="tab-rm-checklist">
      ${checklist ? checklist.phases.map(p => `
        <div class="accordion-item open">
          <button class="accordion-trigger" data-accordion>
            <span>${esc(p.phase)}</span>
            <span class="badge badge-domain">${p.items.length} items</span>
          </button>
          <div class="accordion-content">
            <p style="margin:0 0 0.75rem;color:var(--text-secondary)">${esc(p.description)}</p>
            <table class="data-table">
              <thead>
                <tr><th>ID</th><th>Check Item</th><th>Category</th><th>Risk Area</th></tr>
              </thead>
              <tbody>
                ${p.items.map(item => `<tr>
                  <td><code>${esc(item.id)}</code></td>
                  <td>
                    <div style="font-weight:500;">${esc(item.title)}</div>
                    <div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.25rem;">${esc(item.description)}</div>
                  </td>
                  <td><span class="badge badge-type">${esc(item.category)}</span></td>
                  <td><span class="badge badge-domain">${esc(item.riskCategory)}</span></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `).join('') : '<div class="empty-state"><div class="empty-state-text">Checklist not available</div></div>'}
    </div>

    <!-- Treatment Options Tab -->
    <div class="tab-panel" id="tab-rm-treatment">
      ${treatment ? treatment.strategies.map(s => `
        <div class="accordion-item open">
          <button class="accordion-trigger" data-accordion>
            <span>${esc(s.name)}</span>
            <span class="chevron">&#9654;</span>
          </button>
          <div class="accordion-content">
            <p style="margin:0 0 0.75rem;color:var(--text-secondary)">${esc(s.description)}</p>

            <div style="margin-bottom:0.75rem;">
              <div style="font-size:0.75rem;font-weight:600;margin-bottom:0.25rem;">When to Use</div>
              <ul class="item-list" style="font-size:0.75rem;">
                ${s.whenToUse.map(w => `<li>${esc(w)}</li>`).join('')}
              </ul>
            </div>

            ${s.mandatoryAvoidance ? `
            <div class="control-card" style="border-left:4px solid var(--danger);margin-bottom:0.75rem;">
              <div class="control-card-title" style="color:var(--danger);">Mandatory Avoidance — EU AI Act Art. 5 Prohibited Practices</div>
              <ul class="item-list audit-gaps-list" style="font-size:0.75rem;">
                ${s.mandatoryAvoidance.prohibitedPractices.map(p => `<li>${esc(p)}</li>`).join('')}
              </ul>
            </div>` : ''}

            ${s.limitations ? `
            <div style="margin-bottom:0.75rem;">
              <div style="font-size:0.75rem;font-weight:600;margin-bottom:0.25rem;">Limitations</div>
              <ul class="item-list audit-gaps-list" style="font-size:0.75rem;">
                ${s.limitations.map(l => `<li>${esc(l)}</li>`).join('')}
              </ul>
            </div>` : ''}

            ${s.mitigationCategories ? `
            <div style="margin-bottom:0.75rem;">
              <div style="font-size:0.75rem;font-weight:600;margin-bottom:0.5rem;">Mitigation Categories</div>
              <div class="control-grid">
                ${s.mitigationCategories.map(mc => `
                  <div class="control-card">
                    <div class="control-card-title" style="font-size:0.8rem;">${esc(mc.category)}</div>
                    <ul class="item-list" style="font-size:0.7rem;">
                      ${mc.examples.map(e => `<li>${esc(e)}</li>`).join('')}
                    </ul>
                  </div>
                `).join('')}
              </div>
            </div>` : ''}

            ${s.requirements ? `
            <div style="margin-bottom:0.75rem;">
              <div style="font-size:0.75rem;font-weight:600;margin-bottom:0.25rem;">Requirements</div>
              <ul class="item-list" style="font-size:0.75rem;">
                ${s.requirements.map(r => `<li>${esc(r)}</li>`).join('')}
              </ul>
            </div>` : ''}

            <div>
              <div style="font-size:0.75rem;font-weight:600;margin-bottom:0.5rem;">AI-Specific Examples</div>
              ${s.aiExamples.map(ex => `
                <div class="control-card" style="margin-bottom:0.5rem;">
                  <div style="font-weight:500;font-size:0.8rem;">${esc(ex.scenario)}</div>
                  <div style="font-size:0.75rem;margin:0.25rem 0;color:var(--text-secondary);"><strong>Action:</strong> ${esc(ex.action)}</div>
                  <div style="font-size:0.7rem;color:var(--text-muted);"><strong>Rationale:</strong> ${esc(ex.rationale)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `).join('') : '<div class="empty-state"><div class="empty-state-text">Treatment options not available</div></div>'}
    </div>
  </div>`;
}

// === Crosswalks ===

async function renderCrosswalks(el) {
  el.innerHTML = `<div class="main"><div class="loading"><div class="spinner"></div><span>Loading crosswalk data…</span></div></div>`;

  if (!state.crosswalks) {
    const data = await fetchJSON('crosswalks/malaysia-international.json');
    state.crosswalks = data;
  }

  const cw = state.crosswalks;
  if (!cw) {
    el.innerHTML = `<div class="main"><div class="empty-state"><div class="empty-state-text">Crosswalk data not available</div></div></div>`;
    return;
  }

  const alignColors = { strong: 'var(--success)', moderate: 'var(--warning)', weak: 'var(--text-muted)' };

  el.innerHTML = `<div class="main">
    <div class="section-header">
      <div class="page-title">${esc(cw.title)}</div>
      <div class="page-sub">${esc(cw.description)}</div>
    </div>

    <div class="control-card" style="margin-bottom:1rem;padding:0.75rem 1rem;">
      <div style="font-size:0.75rem;color:var(--text-muted);display:flex;gap:1.5rem;flex-wrap:wrap;">
        <span><span style="color:var(--success);font-weight:600;">&#9679;</span> Strong — Direct correspondence</span>
        <span><span style="color:var(--warning);font-weight:600;">&#9679;</span> Moderate — Partial coverage</span>
        <span><span style="color:var(--text-muted);font-weight:600;">&#9679;</span> Weak — Tangential</span>
      </div>
    </div>

    ${cw.mappings.map(m => `
      <div class="accordion-item open">
        <button class="accordion-trigger" data-accordion>
          <span>Principle ${m.principleNumber}: ${esc(m.principleName)}</span>
          <span class="chevron">&#9654;</span>
        </button>
        <div class="accordion-content">
          <table class="mapping-table">
            <thead><tr><th>Framework</th><th>Provisions</th><th>Alignment</th><th>Summary</th></tr></thead>
            <tbody>
              ${Object.entries(m.frameworkMappings).map(([fwId, mapping]) => {
                const fw = (state.frameworks || []).find(f => f.id === fwId);
                const color = alignColors[mapping.alignment] || 'var(--text-muted)';
                return `<tr>
                  <td><a href="#framework/${fwId}">${fw ? esc(fw.shortName) : esc(fwId)}</a></td>
                  <td>${mapping.provisions.map(p => `<span class="badge badge-domain">${esc(p)}</span>`).join(' ')}</td>
                  <td><span style="color:${color};font-weight:600;">&#9679; ${esc(mapping.alignment)}</span></td>
                  <td style="font-size:0.75rem;">${esc(mapping.summary)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `).join('')}

    ${await renderTrilateralCrosswalk()}
  </div>`;
}

async function renderTrilateralCrosswalk() {
  const data = await fetchJSON('crosswalks/eu-nist-iso.json');
  if (!data) return '';

  const fws = state.frameworks || [];

  return `<div class="detail-section" style="margin-top:2rem;">
    <div class="detail-section-title">${esc(data.title)}</div>
    <p style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:1rem;">${esc(data.description)}</p>
    <div style="overflow-x:auto;">
      <table class="mapping-table">
        <thead>
          <tr>
            <th>Theme</th>
            <th>EU AI Act</th>
            <th>NIST AI RMF</th>
            <th>ISO 42001</th>
          </tr>
        </thead>
        <tbody>
          ${data.mappings.map(m => `<tr>
            <td style="font-weight:600;">${esc(m.theme)}</td>
            <td>
              <div>${m.euAiAct.provisions.map(p => `<span class="badge badge-domain">${esc(p)}</span>`).join(' ')}</div>
              <div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.25rem;">${esc(m.euAiAct.summary)}</div>
            </td>
            <td>
              <div>${m.nistAiRmf.provisions.map(p => `<span class="badge badge-domain">${esc(p)}</span>`).join(' ')}</div>
              <div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.25rem;">${esc(m.nistAiRmf.summary)}</div>
            </td>
            <td>
              <div>${m.iso42001.provisions.map(p => `<span class="badge badge-domain">${esc(p)}</span>`).join(' ')}</div>
              <div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.25rem;">${esc(m.iso42001.summary)}</div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>

  ${await renderGlobalComparison()}
  ${await renderGapAnalysis()}`;
}

async function renderGlobalComparison() {
  const data = await fetchJSON('crosswalks/global-comparison.json');
  if (!data) return '';

  return `<div class="detail-section" style="margin-top:2rem;">
    <div class="detail-section-title">${esc(data.title)}</div>
    <p style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:1rem;">${esc(data.description)}</p>
    ${data.dimensions.map(dim => `
      <div class="accordion-item">
        <div class="accordion-header" data-accordion>
          <span class="accordion-icon"></span>
          <span class="accordion-title">${esc(dim.name)}</span>
        </div>
        <div class="accordion-body">
          <div class="table-scroll">
            <table class="data-table">
              <thead><tr><th>Framework</th><th>Value</th><th>Detail</th></tr></thead>
              <tbody>
                ${Object.entries(dim.comparison).map(([fwId, entry]) => {
                  const fw = (state.frameworks || []).find(f => f.id === fwId);
                  return `<tr>
                    <td><a href="#framework/${fwId}">${fw ? esc(fw.shortName) : esc(fwId)}</a></td>
                    <td style="font-weight:600;white-space:nowrap;">${esc(entry.value)}</td>
                    <td style="font-size:0.75rem;">${esc(entry.detail)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `).join('')}
  </div>`;
}

async function renderGapAnalysis() {
  const data = await fetchJSON('crosswalks/gap-analysis.json');
  if (!data) return '';

  return `<div class="detail-section" style="margin-top:2rem;">
    <div class="detail-section-title">${esc(data.title)}</div>
    <p style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:1rem;">${esc(data.description)}</p>

    <div class="control-card" style="margin-bottom:1.5rem;">
      <div class="control-card-title">Cross-Cutting Gaps</div>
      ${(data.crossCuttingGaps || []).map(g => `
        <div style="margin-bottom:0.75rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border);">
          <div style="font-weight:600;margin-bottom:0.25rem;">${esc(g.domain)}</div>
          <div style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:0.25rem;">${esc(g.description)}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">Affected: ${g.frameworksWithGap.map(fw => {
            const f = (state.frameworks || []).find(x => x.id === fw);
            return f ? f.shortName : fw;
          }).join(', ')}</div>
        </div>
      `).join('')}
    </div>

    ${Object.entries(data.gapsByFramework || {}).map(([fwId, gap]) => `
      <div class="accordion-item">
        <div class="accordion-header" data-accordion>
          <span class="accordion-icon"></span>
          <span class="accordion-title">${esc(gap.frameworkName)}</span>
          <span class="badge" style="background:var(--danger-bg);color:var(--danger);">${(gap.criticalGaps || []).length} critical</span>
          <span class="badge" style="background:var(--warning-bg);color:var(--warning);">${(gap.partialGaps || []).length} partial</span>
        </div>
        <div class="accordion-body">
          ${(gap.criticalGaps || []).length > 0 ? `
            <div class="control-card-desc">Critical Gaps</div>
            ${gap.criticalGaps.map(g => `<div style="margin-bottom:0.5rem;font-size:0.8125rem;"><span class="badge" style="background:var(--danger-bg);color:var(--danger);">${esc(g.domain)}</span> ${esc(g.description)}</div>`).join('')}
          ` : ''}
          ${(gap.partialGaps || []).length > 0 ? `
            <div class="control-card-desc" style="margin-top:0.75rem;">Partial Gaps</div>
            ${gap.partialGaps.map(g => `<div style="margin-bottom:0.5rem;font-size:0.8125rem;"><span class="badge" style="background:var(--warning-bg);color:var(--warning);">${esc(g.domain)}</span> ${esc(g.description)}</div>`).join('')}
          ` : ''}
          ${(gap.recommendations || []).length > 0 ? `
            <div class="control-card-desc" style="margin-top:0.75rem;">Recommendations</div>
            <ul style="margin:0;padding-left:1.25rem;">
              ${gap.recommendations.map(r => `<li style="margin-bottom:0.25rem;font-size:0.8125rem;">${esc(r)}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      </div>
    `).join('')}
  </div>`;
}

// === Framework Comparison Matrix ===

async function renderFrameworkComparison(el) {
  el.innerHTML = `<div class="main"><div class="loading"><div class="spinner"></div><span>Loading comparison matrix…</span></div></div>`;

  const data = await fetchJSON('crosswalks/comparison-matrix.json');
  if (!data) {
    el.innerHTML = `<div class="main"><div class="empty-state"><div class="empty-state-text">Comparison matrix data not available</div></div></div>`;
    return;
  }

  const fws = data.frameworks || [];
  const dims = data.dimensions || [];

  const strengthClass = (s) => s === 'strong' ? 'cm-strong' : s === 'partial' ? 'cm-partial' : 'cm-none';
  const strengthLabel = (s) => s === 'strong' ? 'Strong' : s === 'partial' ? 'Partial' : 'Not addressed';

  el.innerHTML = `<div class="main">
    <div class="section-header">
      <div class="page-title">${esc(data.title)}</div>
      <div class="page-sub">${esc(data.description)}</div>
    </div>

    <div class="control-card" style="margin-bottom:1rem;padding:0.75rem 1rem;">
      <div style="font-size:0.75rem;color:var(--text-muted);display:flex;gap:1.5rem;flex-wrap:wrap;">
        <span class="risk-legend-item"><span class="cm-legend cm-strong"></span> Strong — comprehensive/binding requirements</span>
        <span class="risk-legend-item"><span class="cm-legend cm-partial"></span> Partial — addressed but limited</span>
        <span class="risk-legend-item"><span class="cm-legend cm-none"></span> Not addressed</span>
      </div>
    </div>

    <div class="comparison-matrix-scroll">
      <table class="comparison-matrix-table">
        <thead>
          <tr>
            <th class="cm-dimension-header">Dimension</th>
            ${fws.map(fw => `<th class="cm-fw-header"><a href="#framework/${fw.id}">${esc(fw.shortName)}</a><div class="cm-fw-jurisdiction">${esc(fw.jurisdiction)}</div></th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${dims.map(dim => `<tr>
            <td class="cm-dimension-cell"><div class="cm-dimension-name">${esc(dim.name)}</div></td>
            ${fws.map(fw => {
              const cell = dim.cells[fw.id];
              if (!cell) return '<td class="cm-cell"><span class="cm-indicator cm-none"></span></td>';
              return `<td class="cm-cell ${strengthClass(cell.strength)}">
                <div class="cm-indicator-row"><span class="cm-indicator ${strengthClass(cell.strength)}" title="${strengthLabel(cell.strength)}">${cell.strength === 'strong' ? '●' : cell.strength === 'partial' ? '◐' : '—'}</span></div>
                <div class="cm-cell-summary">${esc(cell.summary)}</div>
              </td>`;
            }).join('')}
          </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <div class="detail-section" style="margin-top:1.5rem;">
      <div class="detail-section-title">Coverage Summary</div>
      <div class="control-grid">
        ${fws.map(fw => {
          const strongCount = dims.filter(d => d.cells[fw.id] && d.cells[fw.id].strength === 'strong').length;
          const partialCount = dims.filter(d => d.cells[fw.id] && d.cells[fw.id].strength === 'partial').length;
          const noneCount = dims.filter(d => !d.cells[fw.id] || d.cells[fw.id].strength === 'none').length;
          return `<div class="control-card">
            <div class="control-card-title"><a href="#framework/${fw.id}" style="color:inherit;text-decoration:none;">${esc(fw.shortName)}</a></div>
            <div class="control-card-desc">${esc(fw.jurisdiction)}</div>
            <div class="cm-summary-bar" style="margin-top:0.75rem;">
              <div class="cm-summary-segment cm-strong" style="flex:${strongCount};" title="${strongCount} strong"></div>
              <div class="cm-summary-segment cm-partial" style="flex:${partialCount};" title="${partialCount} partial"></div>
              <div class="cm-summary-segment cm-none" style="flex:${noneCount};" title="${noneCount} not addressed"></div>
            </div>
            <div class="cm-summary-counts">
              <span class="cm-count cm-strong">${strongCount} strong</span>
              <span class="cm-count cm-partial">${partialCount} partial</span>
              <span class="cm-count cm-none">${noneCount} gaps</span>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

// === Penalties ===

async function renderPenalties(el) {
  el.innerHTML = `<div class="main"><div class="loading"><div class="spinner"></div><span>Loading penalties data…</span></div></div>`;

  if (!state.penalties) {
    const data = await fetchJSON('penalties/index.json');
    state.penalties = data;
  }

  if (!state.penalties || !state.penalties.penalties) {
    el.innerHTML = `<div class="main"><div class="empty-state"><div class="empty-state-text">Penalties data not available</div></div></div>`;
    return;
  }

  const penalties = state.penalties.penalties;

  el.innerHTML = `<div class="main">
    <div class="section-header">
      <div class="page-title">Enforcement & Penalties</div>
      <div class="page-sub">${penalties.length} framework${penalties.length !== 1 ? 's' : ''} with penalty provisions</div>
    </div>

    ${penalties.map(p => {
      const tierColors = ['var(--danger)', 'var(--warning)', 'var(--info)', 'var(--success)'];
      return `<div class="detail-section">
        <div class="detail-section-title">${esc(p.frameworkName)}</div>
        <div class="control-card" style="margin-bottom:1rem;">
          <table class="mapping-table">
            <tbody>
              <tr><td style="font-weight:600;width:160px;">Jurisdiction</td><td><span class="badge badge-jurisdiction">${esc(p.jurisdiction)}</span></td></tr>
              <tr><td style="font-weight:600;">Legal Basis</td><td>${esc(p.legalBasis)}</td></tr>
              <tr><td style="font-weight:600;">Enforcement Body</td><td>${esc(p.enforcementBody)}</td></tr>
            </tbody>
          </table>
        </div>

        ${p.tiers ? `<div class="control-grid">
          ${p.tiers.map((t, i) => {
            const color = tierColors[i] || 'var(--accent)';
            return `<div class="control-card" style="border-left:4px solid ${color};">
              <div class="control-card-title" style="color:${color};">Tier ${t.tier}: ${esc(t.label)}</div>
              <div class="control-card-desc" style="font-size:0.8125rem;">${esc(t.trigger)}</div>
              ${t.maxFixedFormatted ? `<div style="margin-top:0.75rem;">
                <table class="mapping-table">
                  <tbody>
                    <tr><td style="font-weight:600;width:140px;">Max Fixed Fine</td><td style="font-weight:600;">${esc(t.maxFixedFormatted)}</td></tr>
                    ${t.maxTurnoverPct ? `<tr><td style="font-weight:600;">Max Turnover %</td><td style="font-weight:600;">${t.maxTurnoverPct}% of global annual turnover</td></tr>` : ''}
                    ${t.appliedAs ? `<tr><td style="font-weight:600;">Applied As</td><td style="font-size:0.8125rem;">${esc(t.appliedAs)}</td></tr>` : ''}
                  </tbody>
                </table>
              </div>` : ''}
              ${t.penalties ? `<ul class="item-list" style="margin-top:0.75rem;">
                ${t.penalties.map(pen => `<li>${esc(pen)}</li>`).join('')}
              </ul>` : ''}
            </div>`;
          }).join('')}
        </div>` : ''}

        ${p.euInstitutions ? `<div style="margin-top:1rem;">
          <div class="control-card">
            <div class="control-card-title">EU Institutions</div>
            <table class="mapping-table">
              <tbody>
                <tr><td style="font-weight:600;width:160px;">Legal Basis</td><td>${esc(p.euInstitutions.legalBasis)}</td></tr>
                <tr><td style="font-weight:600;">Max Fine</td><td style="font-weight:600;">${esc(p.euInstitutions.maxFineFormatted)}</td></tr>
                <tr><td style="font-weight:600;">Enforcement Body</td><td>${esc(p.euInstitutions.enforcementBody)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>` : ''}

        ${p.gpaiSpecific ? `<div style="margin-top:1rem;">
          <div class="control-card">
            <div class="control-card-title">GPAI-Specific Penalties</div>
            <table class="mapping-table">
              <tbody>
                <tr><td style="font-weight:600;width:160px;">Legal Basis</td><td>${esc(p.gpaiSpecific.legalBasis)}</td></tr>
                <tr><td style="font-weight:600;">Enforcement Body</td><td>${esc(p.gpaiSpecific.enforcementBody)}</td></tr>
              </tbody>
            </table>
            <div class="control-grid" style="margin-top:0.75rem;">
              ${p.gpaiSpecific.tiers.map((gt, i) => `<div class="control-card" style="border-left:4px solid ${tierColors[i + 1] || 'var(--accent)'};">
                <div class="control-card-desc" style="font-size:0.8125rem;">${esc(gt.trigger)}</div>
                <table class="mapping-table" style="margin-top:0.5rem;">
                  <tbody>
                    <tr><td style="font-weight:600;width:120px;">Max Fixed</td><td style="font-weight:600;">EUR ${gt.maxFixed.toLocaleString()}</td></tr>
                    <tr><td style="font-weight:600;">Max Turnover</td><td style="font-weight:600;">${gt.maxTurnoverPct}%</td></tr>
                  </tbody>
                </table>
              </div>`).join('')}
            </div>
          </div>
        </div>` : ''}

        ${p.notes && p.notes.length > 0 ? `<div class="control-card" style="margin-top:1rem;">
          <div class="control-card-desc">Notes</div>
          <ul class="item-list">
            ${p.notes.map(n => `<li>${esc(n)}</li>`).join('')}
          </ul>
        </div>` : ''}
      </div>`;
    }).join('')}
  </div>`;
}

// === Risk (Unified — absorbs Risk Taxonomy + Risk Management) ===

async function renderRisk(el, sub) {
  const activeSub = sub || 'taxonomy';

  // Load both data sets
  el.innerHTML = `<div class="main"><div class="loading"><div class="spinner"></div><span>Loading risk data…</span></div></div>`;

  if (!state.riskTaxonomy) {
    const [cats, cov, uc] = await Promise.all([
      fetchJSON('risk-taxonomy/categories.json'),
      fetchJSON('risk-taxonomy/framework-coverage.json'),
      fetchJSON('risk-taxonomy/use-cases.json'),
    ]);
    state.riskTaxonomy = { categories: cats, coverage: cov, useCases: uc };
  }

  if (!state.riskManagement) {
    const [methodology, matrix, register, checklist, treatment] = await Promise.all([
      fetchJSON('risk-management/methodology.json'),
      fetchJSON('risk-management/risk-matrix.json'),
      fetchJSON('risk-management/risk-register.json'),
      fetchJSON('risk-management/checklist.json'),
      fetchJSON('risk-management/treatment-options.json'),
    ]);
    state.riskManagement = { methodology, matrix, register, checklist, treatment };
  }

  if (!state.riskTaxonomy.categories && !state.riskManagement.methodology) {
    showError(el, 'Risk data not available', 'Could not load risk taxonomy or risk management data');
    return;
  }

  const { categories, coverage, useCases } = state.riskTaxonomy;
  const { methodology, matrix, register, checklist, treatment } = state.riskManagement;
  const domains = categories ? categories.domains || [] : [];
  const totalSubs = domains.reduce((n, d) => n + (d.subcategories || []).length, 0);
  const riskCount = register ? register.risks.length : 0;
  const checkCount = checklist ? checklist.phases.reduce((n, p) => n + p.items.length, 0) : 0;
  const treatCount = treatment ? treatment.strategies.length : 0;

  const covData = coverage ? coverage.coverage : {};
  const covFws = Object.keys(covData);
  const fwLabels = { 'malaysia-ngaige': 'NGAIGE', 'eu-ai-act': 'EU AI Act', 'nist-ai-rmf': 'NIST RMF', 'iso-42001': 'ISO 42001' };
  const levelClass = l => l === 'strong' ? 'cov-strong' : l === 'moderate' ? 'cov-moderate' : l === 'weak' ? 'cov-weak' : 'cov-none';
  const levelIcon = l => l === 'strong' ? '●' : l === 'moderate' ? '◐' : l === 'weak' ? '○' : '—';

  const matrixLevels = matrix ? matrix.riskLevels : [];
  const riskLevelColor = (level) => {
    const l = matrixLevels.find(m => m.id === level);
    return l ? l.color : 'var(--text-muted)';
  };
  const riskLevelLabel = (score) => {
    if (!matrix) return 'Unknown';
    for (const l of matrixLevels) {
      if (score >= l.scoreRange[0] && score <= l.scoreRange[1]) return l.label;
    }
    return 'Unknown';
  };
  const riskLevelId = (score) => {
    if (!matrix) return 'low';
    for (const l of matrixLevels) {
      if (score >= l.scoreRange[0] && score <= l.scoreRange[1]) return l.id;
    }
    return 'low';
  };

  // Build 5x5 matrix
  const matrixHTML = matrix ? (() => {
    const matrixMap = {};
    matrix.matrix.forEach(c => { matrixMap[`${c.likelihood}-${c.impact}`] = c; });
    let rows = '';
    for (let l = 5; l >= 1; l--) {
      const lLabel = matrix.axes.likelihood.scale.find(s => s.score === l);
      let cells = '';
      for (let i = 1; i <= 5; i++) {
        const c = matrixMap[`${l}-${i}`];
        const color = c ? riskLevelColor(c.level) : '#6B7280';
        cells += `<td class="matrix-cell" style="background-color:${color}20;border-left:3px solid ${color};" title="${c ? c.level.toUpperCase() + ' (' + c.score + ')' : ''}">${c ? c.score : ''}</td>`;
      }
      rows += `<tr><td class="matrix-label">${lLabel ? esc(lLabel.label) : l}</td>${cells}</tr>`;
    }
    const impactHeaders = matrix.axes.impact.scale.map(s => `<th class="matrix-header">${esc(s.label)}</th>`).join('');
    return `<table class="data-table matrix-table">
      <thead><tr><th></th>${impactHeaders}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  })() : '';

  const riskCategories = register ? [...new Set(register.risks.map(r => r.category))] : [];
  const catCounts = {};
  riskCategories.forEach(c => { catCounts[c] = register.risks.filter(r => r.category === c).length; });

  const subTabs = [
    { id: 'taxonomy', label: `Taxonomy (${domains.length})` },
    { id: 'register', label: `Risk Register (${riskCount})` },
    { id: 'matrix', label: 'Matrix' },
    { id: 'checklist', label: `Checklist (${checkCount})` },
    { id: 'treatment', label: `Treatment (${treatCount})` },
  ];

  el.innerHTML = `<div class="main">
    <div class="section-header">
      <div class="page-title">AI Risk Management</div>
      <div class="page-sub">${domains.length} risk domains, ${riskCount} risks, ${checkCount} checklist items</div>
    </div>

    <div class="sub-tabs">
      ${subTabs.map(t => `<button class="sub-tab ${t.id === activeSub ? 'active' : ''}" data-sub="${t.id}" onclick="location.hash='#risk/${t.id}'">${t.label}</button>`).join('')}
    </div>

    <!-- Taxonomy sub-panel -->
    <div class="sub-panel ${activeSub === 'taxonomy' ? 'active' : ''}" data-subpanel="taxonomy">
      ${categories ? `
      <div class="control-card" style="margin-bottom:1rem;">
        <div class="control-card-title">Framework Risk Coverage Heatmap</div>
        <div class="risk-legend">
          <span class="risk-legend-item"><span class="cov-strong">●</span> Strong</span>
          <span class="risk-legend-item"><span class="cov-moderate">◐</span> Moderate</span>
          <span class="risk-legend-item"><span class="cov-weak">○</span> Weak</span>
          <span class="risk-legend-item"><span class="cov-none">—</span> None</span>
        </div>
        <div class="table-scroll">
          <table class="data-table coverage-table">
            <thead>
              <tr>
                <th>Risk Domain</th>
                ${covFws.map(fw => `<th class="coverage-th">${esc(fwLabels[fw] || fw)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${domains.map(d => `<tr>
                <td><strong>${esc(d.name)}</strong></td>
                ${covFws.map(fw => {
                  const cell = covData[fw] && covData[fw][d.id] ? covData[fw][d.id] : { level: 'none', notes: '' };
                  return `<td class="coverage-td"><span class="cov-cell ${levelClass(cell.level)}" title="${esc(cell.notes)}">${levelIcon(cell.level)}</span></td>`;
                }).join('')}
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      ${domains.map(d => `
        <div class="accordion-item">
          <div class="accordion-header" data-accordion>
            <span class="accordion-icon"></span>
            <span class="accordion-title">${esc(d.name)}</span>
            <span class="badge badge-domain">${(d.subcategories || []).length} subcategories</span>
          </div>
          <div class="accordion-body">
            <p style="margin:0 0 1rem;color:var(--text-secondary)">${esc(d.description)}</p>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Subcategory</th>
                  ${covFws.map(fw => `<th class="coverage-th">${esc(fwLabels[fw] || fw)}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${(d.subcategories || []).map(s => `<tr>
                  <td>${esc(s.name)}</td>
                  ${covFws.map(fw => {
                    const fc = s.frameworkCoverage && s.frameworkCoverage[fw];
                    if (fc && fc.covered) {
                      return `<td class="coverage-td"><span class="cov-cell cov-strong" title="${(fc.provisions || []).join(', ')}">✓</span></td>`;
                    }
                    return `<td class="coverage-td"><span class="cov-cell cov-none">—</span></td>`;
                  }).join('')}
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `).join('')}

      ${(useCases && useCases.categories ? useCases.categories : []).length > 0 ? `
      <div class="detail-section" style="margin-top:1.5rem;">
        <div class="detail-section-title">High-Risk AI Use Cases</div>
        ${(useCases.categories || []).map(cat => `
          <div class="accordion-item">
            <div class="accordion-header" data-accordion>
              <span class="accordion-icon"></span>
              <span class="accordion-title">${esc(cat.name)}</span>
              <span class="badge">${esc(cat.euAnnexIII)}</span>
              <span class="badge badge-domain">${(cat.useCases || []).length} use cases</span>
            </div>
            <div class="accordion-body">
              <ul style="margin:0 0 0.75rem;padding-left:1.25rem;">
                ${(cat.useCases || []).map(u => `<li style="margin-bottom:0.25rem;">${esc(u)}</li>`).join('')}
              </ul>
              <div style="font-size:0.75rem;color:var(--text-muted);">
                <strong>Risk domains:</strong> ${(cat.riskDomains || []).map(rd => {
                  const dom = domains.find(d => d.id === rd);
                  return `<span class="badge badge-domain">${esc(dom ? dom.name : rd)}</span>`;
                }).join(' ')}
              </div>
            </div>
          </div>
        `).join('')}
      </div>` : ''}
      ` : '<div class="empty-state"><div class="empty-state-text">Risk taxonomy data not available</div></div>'}
    </div>

    <!-- Register sub-panel -->
    <div class="sub-panel ${activeSub === 'register' ? 'active' : ''}" data-subpanel="register">
      ${register ? `
      <div class="stats-banner" style="margin-bottom:1rem;">
        ${riskCategories.map(c => `<div class="stat-card"><div class="stat-value">${catCounts[c]}</div><div class="stat-label">${esc(c)}</div></div>`).join('')}
      </div>
      <div class="control-card" style="margin-bottom:1rem;">
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr><th>ID</th><th>Risk</th><th>Category</th><th>Inherent</th><th>Residual</th><th>Treatment</th><th>Owner</th></tr>
            </thead>
            <tbody>
              ${register.risks.map(r => {
                const iLevel = riskLevelId(r.inherentRisk);
                const rLevel = riskLevelId(r.residualRisk);
                return `<tr>
                  <td><code>${esc(r.id)}</code></td>
                  <td>${esc(r.title)}</td>
                  <td><span class="badge badge-domain">${esc(r.category)}</span></td>
                  <td><span class="badge" style="background-color:${riskLevelColor(iLevel)}20;color:${riskLevelColor(iLevel)};border:1px solid ${riskLevelColor(iLevel)}40;">${r.inherentRisk} ${riskLevelLabel(r.inherentRisk)}</span></td>
                  <td><span class="badge" style="background-color:${riskLevelColor(rLevel)}20;color:${riskLevelColor(rLevel)};border:1px solid ${riskLevelColor(rLevel)}40;">${r.residualRisk} ${riskLevelLabel(r.residualRisk)}</span></td>
                  <td><span class="badge badge-category">${esc(r.treatment)}</span></td>
                  <td style="font-size:0.75rem;">${esc(r.owner)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
      ${register.risks.map(r => `
        <div class="accordion-item">
          <button class="accordion-trigger" data-accordion>
            <span>${esc(r.id)}: ${esc(r.title)}</span>
            <span class="badge" style="background-color:${riskLevelColor(riskLevelId(r.inherentRisk))}20;color:${riskLevelColor(riskLevelId(r.inherentRisk))};">${r.inherentRisk} → ${r.residualRisk}</span>
          </button>
          <div class="accordion-content">
            <p style="margin:0 0 0.75rem;color:var(--text-secondary)">${esc(r.description)}</p>
            <div class="control-grid">
              <div class="control-card">
                <div class="control-card-title" style="font-size:0.8rem;">Inherent Risk</div>
                <div style="font-size:0.75rem;">Likelihood: ${r.likelihood} | Impact: ${r.impact} | Score: <strong>${r.inherentRisk}</strong></div>
              </div>
              <div class="control-card">
                <div class="control-card-title" style="font-size:0.8rem;">Residual Risk</div>
                <div style="font-size:0.75rem;">Likelihood: ${r.residualLikelihood} | Impact: ${r.residualImpact} | Score: <strong>${r.residualRisk}</strong></div>
              </div>
            </div>
            <div style="margin-top:0.75rem;">
              <div style="font-size:0.75rem;font-weight:600;margin-bottom:0.25rem;">Existing Controls</div>
              <ul class="item-list" style="font-size:0.75rem;">
                ${r.existingControls.map(c => `<li>${esc(c)}</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      `).join('')}
      ` : '<div class="empty-state"><div class="empty-state-text">Risk register not available</div></div>'}
    </div>

    <!-- Matrix sub-panel -->
    <div class="sub-panel ${activeSub === 'matrix' ? 'active' : ''}" data-subpanel="matrix">
      ${matrix ? `
      <div class="control-card">
        <div class="control-card-title">5×5 Risk Matrix</div>
        <div class="risk-legend" style="margin-bottom:1rem;">
          ${matrixLevels.map(l => `<span class="risk-legend-item"><span style="color:${l.color};font-weight:700;">&#9679;</span> ${esc(l.label)} (${l.scoreRange[0]}-${l.scoreRange[1]})</span>`).join('')}
        </div>
        <div class="table-scroll">${matrixHTML}</div>
      </div>
      ${methodology ? `
      <div class="control-grid" style="margin-top:1rem;">
        <div class="control-card">
          <div class="control-card-title">Likelihood Scale</div>
          <table class="data-table">
            <thead><tr><th>Score</th><th>Label</th><th>Description</th></tr></thead>
            <tbody>
              ${methodology.likelihoodScale.levels.map(l => `<tr>
                <td><strong>${l.score}</strong></td>
                <td>${esc(l.label)}</td>
                <td style="font-size:0.75rem;">${esc(l.description)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="control-card">
          <div class="control-card-title">Impact Scale</div>
          <table class="data-table">
            <thead><tr><th>Score</th><th>Label</th><th>Regulatory</th></tr></thead>
            <tbody>
              ${methodology.impactScale.levels.map(l => `<tr>
                <td><strong>${l.score}</strong></td>
                <td>${esc(l.label)}</td>
                <td style="font-size:0.75rem;">${esc(l.dimensions.regulatory)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}
      ` : '<div class="empty-state"><div class="empty-state-text">Risk matrix not available</div></div>'}
    </div>

    <!-- Checklist sub-panel -->
    <div class="sub-panel ${activeSub === 'checklist' ? 'active' : ''}" data-subpanel="checklist">
      ${checklist ? checklist.phases.map(p => `
        <div class="accordion-item open">
          <button class="accordion-trigger" data-accordion>
            <span>${esc(p.phase)}</span>
            <span class="badge badge-domain">${p.items.length} items</span>
          </button>
          <div class="accordion-content">
            <p style="margin:0 0 0.75rem;color:var(--text-secondary)">${esc(p.description)}</p>
            <table class="data-table">
              <thead>
                <tr><th>ID</th><th>Check Item</th><th>Category</th><th>Risk Area</th></tr>
              </thead>
              <tbody>
                ${p.items.map(item => `<tr>
                  <td><code>${esc(item.id)}</code></td>
                  <td>
                    <div style="font-weight:500;">${esc(item.title)}</div>
                    <div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.25rem;">${esc(item.description)}</div>
                  </td>
                  <td><span class="badge badge-category">${esc(item.category)}</span></td>
                  <td><span class="badge badge-domain">${esc(item.riskCategory)}</span></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `).join('') : '<div class="empty-state"><div class="empty-state-text">Checklist not available</div></div>'}
    </div>

    <!-- Treatment sub-panel -->
    <div class="sub-panel ${activeSub === 'treatment' ? 'active' : ''}" data-subpanel="treatment">
      ${treatment ? treatment.strategies.map(s => `
        <div class="accordion-item open">
          <button class="accordion-trigger" data-accordion>
            <span>${esc(s.name)}</span>
            <span class="accordion-icon">&#9660;</span>
          </button>
          <div class="accordion-content">
            <p style="margin:0 0 0.75rem;color:var(--text-secondary)">${esc(s.description)}</p>
            <div style="margin-bottom:0.75rem;">
              <div style="font-size:0.75rem;font-weight:600;margin-bottom:0.25rem;">When to Use</div>
              <ul class="item-list" style="font-size:0.75rem;">
                ${s.whenToUse.map(w => `<li>${esc(w)}</li>`).join('')}
              </ul>
            </div>
            ${s.mandatoryAvoidance ? `
            <div class="control-card" style="border-left:4px solid var(--danger);margin-bottom:0.75rem;">
              <div class="control-card-title" style="color:var(--danger);">Mandatory Avoidance — EU AI Act Art. 5</div>
              <ul class="item-list" style="font-size:0.75rem;">
                ${s.mandatoryAvoidance.prohibitedPractices.map(p => `<li>${esc(p)}</li>`).join('')}
              </ul>
            </div>` : ''}
            ${s.mitigationCategories ? `
            <div class="control-grid">
              ${s.mitigationCategories.map(mc => `
                <div class="control-card">
                  <div class="control-card-title" style="font-size:0.8rem;">${esc(mc.category)}</div>
                  <ul class="item-list" style="font-size:0.7rem;">
                    ${mc.examples.map(e => `<li>${esc(e)}</li>`).join('')}
                  </ul>
                </div>
              `).join('')}
            </div>` : ''}
            <div style="margin-top:0.75rem;">
              <div style="font-size:0.75rem;font-weight:600;margin-bottom:0.5rem;">AI-Specific Examples</div>
              ${s.aiExamples.map(ex => `
                <div class="control-card" style="margin-bottom:0.5rem;">
                  <div style="font-weight:500;font-size:0.8rem;">${esc(ex.scenario)}</div>
                  <div style="font-size:0.75rem;margin:0.25rem 0;color:var(--text-secondary);"><strong>Action:</strong> ${esc(ex.action)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `).join('') : '<div class="empty-state"><div class="empty-state-text">Treatment options not available</div></div>'}
    </div>
  </div>`;
}

// === Reference (Unified — absorbs Crosswalks, Penalties, Artifacts, Perspectives) ===

async function renderReference(el, sub) {
  const activeSub = sub || 'crosswalks';

  el.innerHTML = `<div class="main"><div class="loading"><div class="spinner"></div><span>Loading reference data…</span></div></div>`;

  // Load crosswalks
  if (!state.crosswalks) {
    state.crosswalks = await fetchJSON('crosswalks/malaysia-international.json');
  }
  // Load penalties
  if (!state.penalties) {
    state.penalties = await fetchJSON('penalties/index.json');
  }
  // Load artifacts
  if (!state.artifactInventory) {
    state.artifactInventory = await fetchJSON('artifacts/inventory.json') || {};
  }

  const cw = state.crosswalks;
  const penalties = state.penalties ? state.penalties.penalties || [] : [];
  const alignColors = { strong: 'var(--success)', moderate: 'var(--warning)', weak: 'var(--text-muted)' };

  // Build artifact list
  const artCategories = state.artifactInventory.categories || [];
  let allArtifacts = [];
  artCategories.forEach(cat => {
    (cat.artifacts || []).forEach(a => {
      allArtifacts.push({ ...a, categoryLabel: cat.name || cat.category || '' });
    });
  });
  // Fallback: if no .categories, try keys
  if (allArtifacts.length === 0) {
    Object.keys(state.artifactInventory).filter(k => k !== '_meta').forEach(cat => {
      const items = state.artifactInventory[cat];
      if (Array.isArray(items)) {
        items.forEach(a => { allArtifacts.push({ ...a, categoryLabel: cat }); });
      }
    });
  }

  const subTabs = [
    { id: 'crosswalks', label: 'Crosswalks' },
    { id: 'penalties', label: `Penalties (${penalties.length})` },
    { id: 'artifacts', label: `Artifacts (${allArtifacts.length})` },
  ];

  el.innerHTML = `<div class="main">
    <div class="section-header">
      <div class="page-title">Reference</div>
      <div class="page-sub">Cross-framework mappings, enforcement penalties, and compliance artifacts</div>
    </div>

    <div class="sub-tabs">
      ${subTabs.map(t => `<button class="sub-tab ${t.id === activeSub ? 'active' : ''}" data-sub="${t.id}" onclick="location.hash='#reference/${t.id}'">${t.label}</button>`).join('')}
    </div>

    <!-- Crosswalks sub-panel -->
    <div class="sub-panel ${activeSub === 'crosswalks' ? 'active' : ''}" data-subpanel="crosswalks">
      ${cw ? `
      <div class="control-card" style="margin-bottom:1rem;padding:0.75rem 1rem;">
        <div style="font-size:0.75rem;color:var(--text-muted);display:flex;gap:1.5rem;flex-wrap:wrap;">
          <span><span style="color:var(--success);font-weight:600;">&#9679;</span> Strong — Direct correspondence</span>
          <span><span style="color:var(--warning);font-weight:600;">&#9679;</span> Moderate — Partial coverage</span>
          <span><span style="color:var(--text-muted);font-weight:600;">&#9679;</span> Weak — Tangential</span>
        </div>
      </div>
      ${cw.mappings.map(m => `
        <div class="accordion-item">
          <button class="accordion-trigger" data-accordion>
            <span>Principle ${m.principleNumber}: ${esc(m.principleName)}</span>
            <span class="accordion-icon">&#9660;</span>
          </button>
          <div class="accordion-content">
            <table class="mapping-table">
              <thead><tr><th>Framework</th><th>Provisions</th><th>Alignment</th><th>Summary</th></tr></thead>
              <tbody>
                ${Object.entries(m.frameworkMappings).map(([fwId, mapping]) => {
                  const fw = (state.frameworks || []).find(f => f.id === fwId);
                  const color = alignColors[mapping.alignment] || 'var(--text-muted)';
                  return `<tr>
                    <td><a href="#framework/${fwId}">${fw ? esc(fw.shortName) : esc(fwId)}</a></td>
                    <td>${mapping.provisions.map(p => `<span class="badge badge-domain">${esc(p)}</span>`).join(' ')}</td>
                    <td><span style="color:${color};font-weight:600;">&#9679; ${esc(mapping.alignment)}</span></td>
                    <td style="font-size:0.75rem;">${esc(mapping.summary)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `).join('')}
      ` : '<div class="empty-state"><div class="empty-state-text">Crosswalk data not available</div></div>'}
    </div>

    <!-- Penalties sub-panel -->
    <div class="sub-panel ${activeSub === 'penalties' ? 'active' : ''}" data-subpanel="penalties">
      ${penalties.length ? penalties.map(p => {
        const tierColors = ['var(--danger)', 'var(--warning)', 'var(--info)', 'var(--success)'];
        return `<div class="detail-section">
          <div class="detail-section-title">${esc(p.frameworkName)}</div>
          <div class="control-card" style="margin-bottom:1rem;">
            <table class="mapping-table">
              <tbody>
                <tr><td style="font-weight:600;width:160px;">Jurisdiction</td><td><span class="badge badge-jurisdiction">${esc(p.jurisdiction)}</span></td></tr>
                <tr><td style="font-weight:600;">Legal Basis</td><td>${esc(p.legalBasis)}</td></tr>
                <tr><td style="font-weight:600;">Enforcement Body</td><td>${esc(p.enforcementBody)}</td></tr>
              </tbody>
            </table>
          </div>
          ${p.tiers ? `<div class="control-grid">
            ${p.tiers.map((t, i) => {
              const color = tierColors[i] || 'var(--accent)';
              return `<div class="control-card" style="border-left:4px solid ${color};">
                <div class="control-card-title" style="color:${color};">Tier ${t.tier}: ${esc(t.label)}</div>
                <div class="control-card-desc" style="font-size:0.8125rem;">${esc(t.trigger)}</div>
                ${t.maxFixedFormatted ? `<div style="margin-top:0.75rem;">
                  <table class="mapping-table">
                    <tbody>
                      <tr><td style="font-weight:600;width:140px;">Max Fixed Fine</td><td style="font-weight:600;">${esc(t.maxFixedFormatted)}</td></tr>
                      ${t.maxTurnoverPct ? `<tr><td style="font-weight:600;">Max Turnover %</td><td style="font-weight:600;">${t.maxTurnoverPct}% of global annual turnover</td></tr>` : ''}
                    </tbody>
                  </table>
                </div>` : ''}
              </div>`;
            }).join('')}
          </div>` : ''}
        </div>`;
      }).join('') : '<div class="empty-state"><div class="empty-state-text">Penalties data not available</div></div>'}
    </div>

    <!-- Artifacts sub-panel -->
    <div class="sub-panel ${activeSub === 'artifacts' ? 'active' : ''}" data-subpanel="artifacts">
      ${allArtifacts.length ? `
      <div class="control-grid">
        ${allArtifacts.map(a => `
          <div class="artifact-card">
            <div class="artifact-card-header">
              <span class="artifact-card-name">${esc(a.name)}</span>
              <div class="artifact-card-badges">
                ${a.mandatory ? '<span class="badge badge-mandatory">Mandatory</span>' : '<span class="badge badge-optional">Optional</span>'}
                ${a.format ? `<span class="badge badge-category">${esc(a.format)}</span>` : ''}
              </div>
            </div>
            <p class="artifact-card-desc">${esc(a.description || '')}</p>
            <div class="artifact-card-meta">
              <span class="meta-item"><strong>Category:</strong> ${esc(a.categoryLabel)}</span>
            </div>
          </div>
        `).join('')}
      </div>` : '<div class="empty-state"><div class="empty-state-text">No artifacts available</div></div>'}
    </div>
  </div>`;
}

// === Search ===

async function renderSearch(el, query) {
  const q = (query || '').toLowerCase();
  const results = [];

  // Search frameworks
  for (const f of (state.frameworks || [])) {
    if (matchText(q, f.name, f.shortName, f.description, f.jurisdiction, f.type, f.issuingBody)) {
      results.push({ type: 'Framework', title: f.shortName, subtitle: f.name, hash: `#framework/${f.id}`, text: f.description });
    }
  }

  // Search framework data (principles and articles)
  for (const [fwId, fwData] of Object.entries(state.frameworkData)) {
    const fw = (state.frameworks || []).find(f => f.id === fwId);
    if (fwData.principles) {
      for (const p of fwData.principles) {
        if (matchText(q, p.name, p.definition, p.description, ...(p.keyElements || []))) {
          results.push({ type: `${fw ? fw.shortName : fwId} Principle`, title: p.name, subtitle: p.definition, hash: `#framework/${fwId}`, text: p.description });
        }
      }
    }
    if (fwData.articles) {
      for (const a of fwData.articles) {
        if (matchText(q, a.title, a.summary, a.id)) {
          results.push({ type: `${fw ? fw.shortName : fwId} Article`, title: `Art. ${a.number}: ${a.title}`, subtitle: `Chapter ${a.chapter}`, hash: `#framework/${fwId}`, text: a.summary });
        }
      }
    }
    if (fwData.subcategories) {
      for (const s of fwData.subcategories) {
        if (matchText(q, s.id, s.title, s.function, s.category)) {
          results.push({ type: `${fw ? fw.shortName : fwId} Subcategory`, title: s.id, subtitle: s.function, hash: `#framework/${fwId}`, text: s.title });
        }
      }
    }
    if (fwData.clauses) {
      for (const c of fwData.clauses) {
        if (matchText(q, c.id, c.title, c.summary)) {
          results.push({ type: `${fw ? fw.shortName : fwId} Clause`, title: `Clause ${c.id}: ${c.title}`, subtitle: '', hash: `#framework/${fwId}`, text: c.summary });
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

  // Lazy-load additional data layers for search
  if (!state.evidenceIndex) {
    state.evidenceIndex = await fetchJSON('evidence/index.json') || {};
  }
  if (!state.artifactInventory) {
    state.artifactInventory = await fetchJSON('artifacts/inventory.json') || {};
  }
  if (!state.requirementsIndex) {
    state.requirementsIndex = await fetchJSON('requirements/index.json') || {};
  }
  if (!state.riskManagement) {
    const [methodology, matrix, register, checklist, treatment] = await Promise.all([
      fetchJSON('risk-management/methodology.json'),
      fetchJSON('risk-management/risk-matrix.json'),
      fetchJSON('risk-management/risk-register.json'),
      fetchJSON('risk-management/checklist.json'),
      fetchJSON('risk-management/treatment-options.json'),
    ]);
    state.riskManagement = { methodology, matrix, register, checklist, treatment };
  }
  if (!state.penalties) {
    state.penalties = await fetchJSON('penalties/index.json');
  }

  // Search evidence items
  for (const grp of (state.evidenceIndex.evidence || [])) {
    for (const item of (grp.items || [])) {
      if (matchText(q, item.name, item.description, item.id, item.type)) {
        const ctrl = state.controls ? state.controls.library.find(c => c.slug === grp.controlSlug) : null;
        results.push({ type: 'Evidence', title: item.name, subtitle: ctrl ? ctrl.name : grp.controlSlug, hash: ctrl ? `#control/${grp.controlSlug}` : '#controls', text: item.description });
      }
    }
  }

  // Search artifacts
  for (const cat of (state.artifactInventory.categories || [])) {
    for (const a of (cat.artifacts || [])) {
      if (matchText(q, a.name, a.description, a.id)) {
        results.push({ type: 'Artifact', title: a.name, subtitle: cat.name, hash: '#controls', text: a.description });
      }
    }
  }

  // Search requirements
  for (const req of (state.requirementsIndex.requirements || [])) {
    const allText = [...(req.legal || []), ...(req.technical || []), ...(req.governance || [])].join(' ');
    if (matchText(q, allText, req.controlSlug)) {
      const ctrl = state.controls ? state.controls.library.find(c => c.slug === req.controlSlug) : null;
      const matchedReq = [...(req.legal || []), ...(req.technical || []), ...(req.governance || [])].find(r => r.toLowerCase().includes(q)) || '';
      results.push({ type: 'Requirement', title: ctrl ? ctrl.name : req.controlSlug, subtitle: 'Requirement', hash: ctrl ? `#control/${req.controlSlug}` : '#controls', text: matchedReq });
    }
  }

  // Search risk register
  if (state.riskManagement && state.riskManagement.register) {
    for (const risk of (state.riskManagement.register.risks || [])) {
      if (matchText(q, risk.title, risk.description, risk.treatmentPlan, risk.id, risk.category)) {
        results.push({ type: 'Risk', title: risk.title, subtitle: `${risk.inherentRiskLevel} risk`, hash: '#risk', text: risk.description });
      }
    }
  }

  // Search risk taxonomy
  if (state.riskTaxonomy && state.riskTaxonomy.categories) {
    for (const d of (state.riskTaxonomy.categories.domains || [])) {
      if (matchText(q, d.name, d.description)) {
        results.push({ type: 'Risk Domain', title: d.name, subtitle: '', hash: '#risk', text: d.description });
      }
      for (const s of (d.subcategories || [])) {
        if (matchText(q, s.name, s.id)) {
          results.push({ type: 'Risk Subcategory', title: s.name, subtitle: d.name, hash: '#risk', text: '' });
        }
      }
    }
  }
  if (state.riskTaxonomy && state.riskTaxonomy.useCases) {
    for (const cat of (state.riskTaxonomy.useCases.categories || [])) {
      const allUC = (cat.useCases || []).join(' ');
      if (matchText(q, cat.name, cat.euAnnexIII, allUC)) {
        results.push({ type: 'Use Case Category', title: cat.name, subtitle: cat.euAnnexIII, hash: '#risk', text: (cat.useCases || []).join('; ') });
      }
    }
  }

  // Search penalties
  if (state.penalties && state.penalties.penalties) {
    for (const p of state.penalties.penalties) {
      for (const tier of (p.tiers || [])) {
        if (matchText(q, tier.label, tier.trigger, p.frameworkName)) {
          results.push({ type: 'Penalty', title: `${p.frameworkName}: ${tier.label}`, subtitle: tier.maxFixedFormatted || '', hash: '#reference/penalties', text: tier.trigger });
        }
      }
    }
  }

  // Update search input
  const searchInput = document.getElementById('search-input');
  if (searchInput && searchInput.value !== query) searchInput.value = query || '';

  el.innerHTML = `<div class="main">
    <div class="section-header">
      <div class="page-title">Search Results</div>
      <div class="page-sub">${results.length} result${results.length !== 1 ? 's' : ''} for "${esc(query)}"</div>
    </div>

    ${results.length === 0 ? `
    <div class="empty-state">
      <div class="empty-state-text">No results found</div>
      <div class="empty-state-hint">Try different keywords or browse frameworks and controls</div>
    </div>` : `
    <div class="control-card">
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
  // Standard accordion (aria-expanded)
  const trigger = e.target.closest('.accordion-trigger');
  if (trigger && trigger.hasAttribute('aria-expanded')) {
    const expanded = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', !expanded);
    const content = trigger.nextElementSibling;
    if (content) content.hidden = expanded;
    return;
  }

  // Legacy accordion (data-accordion + .open class)
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

  // Sub-tab buttons
  const subTab = e.target.closest('.sub-tab');
  if (subTab && !subTab.hasAttribute('onclick')) {
    const subName = subTab.dataset.sub;
    const container = subTab.closest('.main') || document;
    container.querySelectorAll('.sub-tab').forEach(b => b.classList.toggle('active', b === subTab));
    container.querySelectorAll('.sub-panel').forEach(p => p.classList.toggle('active', p.dataset.subpanel === subName));
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
  showError(document.getElementById('app'), 'Failed to load application data', err.message);
});

// === Export Functions ===

function exportToPDF() {
  document.body.classList.add('printing');
  window.print();
  document.body.classList.remove('printing');
}

function exportToCSV() {
  const view = state.route.view;
  let data = [];
  let filename = `export-${view}-${new Date().toISOString().slice(0,10)}.csv`;

  if (view === 'controls') {
    const list = state.controls.library || state.controls;
    data = list.map(c => ({
      ID: c.id || '',
      Name: c.name,
      Domain: c.domain,
      Description: c.description.replace(/\n/g, ' ')
    }));
  } else if (view === 'risk') {
    const list = state.riskManagement?.register?.risks || [];
    data = list.map(r => ({
      ID: r.id,
      Risk: r.title,
      Impact: r.impact,
      Likelihood: r.likelihood,
      Level: r.inherentRisk
    }));
  } else {
    alert('CSV export only supported for Controls and Risk Register views.');
    return;
  }

  if (data.length === 0) {
    alert('No data found to export.');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function renderArtifacts(el) {
  if (!state.artifactInventory) {
    state.artifactInventory = await fetchJSON('artifacts/inventory.json') || {};
  }
  
  const categories = Object.keys(state.artifactInventory).filter(k => k !== '_meta');
  let allArtifacts = [];
  categories.forEach(cat => {
    state.artifactInventory[cat].forEach(a => {
      allArtifacts.push({ ...a, categoryLabel: cat });
    });
  });

  el.innerHTML = `
    <div class="view-header">
      <h1>Compliance Artifacts & Templates</h1>
      <p>A comprehensive library of AI governance document templates, policies, and assessment forms.</p>
    </div>
    
    <div class="filter-bar">
      <div class="filter-group">
        <label>Category:</label>
        <select id="artifact-category-filter">
          <option value="all">All Categories</option>
          ${categories.map(c => `<option value="${c}">${c.charAt(0).toUpperCase() + c.slice(1)}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="artifacts-grid" id="artifacts-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">
      ${allArtifacts.map(a => renderArtifactCard(a)).join('')}
    </div>
  `;

  document.getElementById('artifact-category-filter').addEventListener('change', (e) => {
    const cat = e.target.value;
    const filtered = cat === 'all' ? allArtifacts : allArtifacts.filter(a => a.categoryLabel === cat);
    document.getElementById('artifacts-list').innerHTML = filtered.map(a => renderArtifactCard(a)).join('');
  });
}

function renderArtifactCard(a) {
  return `
    <div class="control-card artifact-card">
      <div class="control-card-header">
        <div class="artifact-icon" style="font-size: 2rem; margin-right: 1rem;">${a.categoryLabel === 'policies' ? '📜' : '📋'}</div>
        <div>
          <div class="control-card-title">${esc(a.name)}</div>
          <div class="control-card-desc">${esc(a.categoryLabel.toUpperCase())}</div>
        </div>
      </div>
      <div class="control-card-desc">
        <p>${esc(a.description)}</p>
        <div class="artifact-meta" style="margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted);">
          <span><strong>Format:</strong> ${esc(a.format)}</span>
          ${a.mandatory ? '<span class="tag tag-mandatory" style="background: var(--red-light); color: var(--red); padding: 0.1rem 0.4rem; border-radius: 4px; margin-left: 0.5rem; font-weight: bold;">Mandatory</span>' : ''}
        </div>
      </div>
      <div class="card-footer" style="margin-top: 1.5rem; border-top: 1px solid var(--border); padding-top: 1rem;">
        <a href="templates/${a.slug}.md" class="btn-secondary" target="_blank">View Template</a>
      </div>
    </div>
  `;
}
