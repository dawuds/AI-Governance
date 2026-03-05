/* === AI Governance Explorer — Application Logic === */

const state = {
  frameworks: null,
  frameworkData: {},    // keyed by framework id
  controls: null,       // { domains, library }
  frameworkMap: null,
  penalties: null,
  crosswalks: null,
  riskTaxonomy: null,   // { categories, coverage, useCases }
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
      <div class="grid-2">
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
      <div class="grid-2">
        ${riskData.riskTiers.map(t => {
          const tierColors = { 'prohibited': 'var(--danger)', 'high-risk': 'var(--warning)', 'limited-risk': 'var(--info)', 'minimal-risk': 'var(--success)', 'gpai': 'var(--purple)' };
          const color = tierColors[t.tier] || 'var(--accent)';
          return `<div class="card" style="border-left:4px solid ${color};">
            <div class="card-title" style="color:${color};">${esc(t.name)}</div>
            <div class="card-body">${esc(t.description)}</div>
            <div class="card-meta" style="margin-top:0.5rem;">
              <span class="card-meta-item">${esc(t.legalBasis)}</span>
              ${t.effectiveDate ? `<span class="card-meta-item">${t.effectiveDate}</span>` : ''}
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
    ${fwData.sourceType === 'constructed-indicative' ? `<div class="card" style="margin-bottom:1rem;border-left:4px solid var(--warning);"><div class="card-body" style="color:var(--warning);">Content constructed from publicly available summaries. Verify against the purchased ISO standard.</div></div>` : ''}
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
    ${fwData.structure ? `<div class="card" style="margin-bottom:1rem;">
      <div class="card-subtitle">${fwData.structure.totalArticles} Articles across ${fwData.structure.totalChapters} Chapters</div>
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
    ${revokes ? `<div class="card" style="margin-bottom:1rem;border-left:4px solid var(--warning);">
      <div class="card-subtitle">Revokes: ${esc(revokes.executiveOrder)} — ${esc(revokes.title)}</div>
      <div style="font-size:0.75rem;color:var(--text-muted);">Signed: ${revokes.signedDate}. Also revoked OMB memoranda: ${revokes.ombMemorandaRevoked.join(', ')}</div>
    </div>` : ''}
    <div class="card">
      <ul style="margin:0;padding-left:1.25rem;">
        ${shifts.map(s => `<li style="margin-bottom:0.375rem;font-size:0.8125rem;">${esc(s)}</li>`).join('')}
      </ul>
    </div>
    ${fwData.actionPlan ? `<div class="card" style="margin-top:1rem;">
      <div class="card-subtitle">${esc(fwData.actionPlan.title)}</div>
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
    <div class="card" style="border-left:4px solid var(--error);margin-bottom:1rem;">
      <div class="card-subtitle">${esc(aida.fullName)}</div>
      <div style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:0.5rem;">Part of ${esc(aida.parentBill)} — ${esc(aida.statusDetail)}</div>
      <div class="card-subtitle" style="margin-top:0.75rem;">What AIDA Would Have Required:</div>
      <ul style="margin:0;padding-left:1.25rem;">
        ${aida.proposedRequirements.map(r => `<li style="margin-bottom:0.25rem;font-size:0.8125rem;">${esc(r)}</li>`).join('')}
      </ul>
    </div>

    <div class="detail-section-title">Voluntary Code of Conduct (${esc(vc.status.toUpperCase())})</div>
    <div class="card">
      <div class="card-subtitle">${esc(vc.fullName)}</div>
      <div style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:0.5rem;">Published: ${vc.publishedDate} — ${esc(vc.statusDetail)}</div>
      <div style="margin-top:0.5rem;">${vc.principles.map(p => `<span class="badge badge-domain">${esc(p)}</span>`).join(' ')}</div>
    </div>
  </div>`;
}

function renderDesignChoices(fwData) {
  const choices = fwData.keyDesignChoices || [];
  if (choices.length === 0 || fwData.principles) return '';
  return `<div class="detail-section">
    <div class="detail-section-title">Key Design Choices</div>
    <div class="card">
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

  // Build audit package HTML
  const auditPackageHTML = (linkedArtifacts.length || linkedEvidence.length) ? `
    <div class="detail-section audit-package">
      <div class="detail-section-title">Audit Package</div>
      <div class="audit-package-stats">
        <div class="audit-stat">
          <span class="audit-stat-value">${linkedArtifacts.length}</span>
          <span class="audit-stat-label">Artifact${linkedArtifacts.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="audit-stat">
          <span class="audit-stat-value">${linkedEvidence.length}</span>
          <span class="audit-stat-label">Evidence Item${linkedEvidence.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      ${linkedArtifacts.length ? `
      <div class="accordion-item">
        <button class="accordion-trigger" data-accordion>
          <span>Artifacts (${linkedArtifacts.length})</span>
          <span class="chevron">&#9654;</span>
        </button>
        <div class="accordion-content">
          <table class="mapping-table">
            <thead>
              <tr><th>ID</th><th>Name</th><th>Format</th><th>Description</th></tr>
            </thead>
            <tbody>
              ${linkedArtifacts.map(a => `<tr>
                <td><code>${esc(a.id)}</code></td>
                <td>${esc(a.name)}</td>
                <td><span class="badge badge-type">${esc(a.format || '')}</span></td>
                <td>${esc(a.description || '')}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}

      ${linkedEvidence.length ? `
      <div class="accordion-item">
        <button class="accordion-trigger" data-accordion>
          <span>Evidence Items (${linkedEvidence.length})</span>
          <span class="chevron">&#9654;</span>
        </button>
        <div class="accordion-content">
          ${linkedEvidence.map(ev => `
          <div class="audit-evidence-card">
            <div class="audit-evidence-header">
              <code>${esc(ev.id)}</code>
              <span class="badge badge-type">${esc(ev.type || '')}</span>
            </div>
            <div class="audit-evidence-name">${esc(ev.name)}</div>
            <div class="audit-evidence-desc">${esc(ev.description || '')}</div>
            ${ev.artifactSlugs && ev.artifactSlugs.length ? `
            <div class="audit-evidence-artifacts">
              <span class="audit-evidence-artifacts-label">Linked artifacts:</span>
              ${ev.artifactSlugs.map(aId => {
                const art = artifactIndex[aId];
                return `<span class="badge badge-domain">${art ? esc(art.name) : esc(aId)}</span>`;
              }).join(' ')}
            </div>` : ''}
            ${ev.whatGoodLooksLike && ev.whatGoodLooksLike.length ? `
            <div class="accordion-item audit-inner-accordion">
              <button class="accordion-trigger" data-accordion>
                <span>What good looks like</span>
                <span class="chevron">&#9654;</span>
              </button>
              <div class="accordion-content">
                <ul class="item-list">
                  ${ev.whatGoodLooksLike.map(w => `<li>${esc(w)}</li>`).join('')}
                </ul>
              </div>
            </div>` : ''}
            ${ev.commonGaps && ev.commonGaps.length ? `
            <div class="accordion-item audit-inner-accordion">
              <button class="accordion-trigger" data-accordion>
                <span>Common gaps</span>
                <span class="chevron">&#9654;</span>
              </button>
              <div class="accordion-content">
                <ul class="item-list audit-gaps-list">
                  ${ev.commonGaps.map(g => `<li>${esc(g)}</li>`).join('')}
                </ul>
              </div>
            </div>` : ''}
          </div>`).join('')}
        </div>
      </div>` : ''}
    </div>` : '';

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

    ${auditPackageHTML}
  </div>`;
}

// === Risk Taxonomy (placeholder for Phase 4) ===

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
      <div class="section-title">AI Risk Taxonomy</div>
      <div class="section-subtitle">${domains.length} risk domains, ${totalSubs} subcategories — framework coverage analysis</div>
    </div>

    <div class="tabs">
      <button class="tab-btn active" data-tab="coverage-matrix">Coverage Matrix</button>
      <button class="tab-btn" data-tab="risk-domains">Risk Domains (${domains.length})</button>
      <button class="tab-btn" data-tab="use-cases">High-Risk Use Cases</button>
    </div>

    <div class="tab-panel active" id="tab-coverage-matrix">
      <div class="card">
        <div class="card-title">Framework Risk Coverage Heatmap</div>
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
          <div class="card-subtitle">Coverage Notes</div>
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
      <div class="card">
        <div class="card-title">High-Risk AI Use Cases</div>
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
      <div class="section-title">${esc(cw.title)}</div>
      <div class="section-subtitle">${esc(cw.description)}</div>
    </div>

    <div class="card" style="margin-bottom:1rem;padding:0.75rem 1rem;">
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

    <div class="card" style="margin-bottom:1.5rem;">
      <div class="card-title">Cross-Cutting Gaps</div>
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
          <span class="badge" style="background:var(--error-bg);color:var(--error);">${(gap.criticalGaps || []).length} critical</span>
          <span class="badge" style="background:var(--warning-bg);color:var(--warning);">${(gap.partialGaps || []).length} partial</span>
        </div>
        <div class="accordion-body">
          ${(gap.criticalGaps || []).length > 0 ? `
            <div class="card-subtitle">Critical Gaps</div>
            ${gap.criticalGaps.map(g => `<div style="margin-bottom:0.5rem;font-size:0.8125rem;"><span class="badge" style="background:var(--error-bg);color:var(--error);">${esc(g.domain)}</span> ${esc(g.description)}</div>`).join('')}
          ` : ''}
          ${(gap.partialGaps || []).length > 0 ? `
            <div class="card-subtitle" style="margin-top:0.75rem;">Partial Gaps</div>
            ${gap.partialGaps.map(g => `<div style="margin-bottom:0.5rem;font-size:0.8125rem;"><span class="badge" style="background:var(--warning-bg);color:var(--warning);">${esc(g.domain)}</span> ${esc(g.description)}</div>`).join('')}
          ` : ''}
          ${(gap.recommendations || []).length > 0 ? `
            <div class="card-subtitle" style="margin-top:0.75rem;">Recommendations</div>
            <ul style="margin:0;padding-left:1.25rem;">
              ${gap.recommendations.map(r => `<li style="margin-bottom:0.25rem;font-size:0.8125rem;">${esc(r)}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      </div>
    `).join('')}
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

  // Search risk taxonomy
  if (state.riskTaxonomy && state.riskTaxonomy.categories) {
    for (const d of (state.riskTaxonomy.categories.domains || [])) {
      if (matchText(q, d.name, d.description)) {
        results.push({ type: 'Risk Domain', title: d.name, subtitle: '', hash: '#risk-taxonomy', text: d.description });
      }
      for (const s of (d.subcategories || [])) {
        if (matchText(q, s.name, s.id)) {
          results.push({ type: 'Risk Subcategory', title: s.name, subtitle: d.name, hash: '#risk-taxonomy', text: '' });
        }
      }
    }
  }
  if (state.riskTaxonomy && state.riskTaxonomy.useCases) {
    for (const cat of (state.riskTaxonomy.useCases.categories || [])) {
      const allUC = (cat.useCases || []).join(' ');
      if (matchText(q, cat.name, cat.euAnnexIII, allUC)) {
        results.push({ type: 'Use Case Category', title: cat.name, subtitle: cat.euAnnexIII, hash: '#risk-taxonomy', text: (cat.useCases || []).join('; ') });
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
