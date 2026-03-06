const PREFECTURES = ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];

const PRESETS = {
  latLng:      `{\n  "geocode": {\n    "lat": {{lat}},\n    "lng": {{lng}}\n  }\n}`,
  withAddress: `{\n  "geocode": {\n    "lat": {{lat}},\n    "lng": {{lng}}\n  },\n  "postalCode": "{{postalCode}}",\n  "address": {\n    "prefecture": "{{prefecture}}",\n    "address1": "{{address1}}",\n    "address2": "{{address2}}",\n    "building": "{{building}}"\n  }\n}`,
  full:        `{\n  "query": "{{query}}",\n  "formattedAddress": "{{formattedAddress}}",\n  "geocode": {\n    "lat": {{lat}},\n    "lng": {{lng}}\n  },\n  "postalCode": "{{postalCode}}",\n  "placeId": "{{placeId}}",\n  "locationType": "{{locationType}}",\n  "address": {\n    "prefecture": "{{prefecture}}",\n    "address1": "{{address1}}",\n    "address2": "{{address2}}",\n    "building": "{{building}}"\n  }\n}`,
};

/* ── Theme ── */
const THEME_CYCLE = ['system', 'light', 'dark'];
const THEME_LABELS = { system: '\u25D1 Auto', light: '\u2600 Light', dark: '\u263E Dark' };

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(pref) {
  const resolved = pref === 'system' ? getSystemTheme() : pref;
  document.documentElement.setAttribute('data-theme', resolved);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = THEME_LABELS[pref];
}

function cycleTheme() {
  const current = localStorage.getItem('geo_theme') || 'system';
  const next = THEME_CYCLE[(THEME_CYCLE.indexOf(current) + 1) % THEME_CYCLE.length];
  localStorage.setItem('geo_theme', next);
  applyTheme(next);
}

// Apply saved theme immediately to avoid flash
applyTheme(localStorage.getItem('geo_theme') || 'system');
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if ((localStorage.getItem('geo_theme') || 'system') === 'system') applyTheme('system');
});

let currentData = null;
let candidates  = [];
let history     = JSON.parse(localStorage.getItem('geo_history') || '[]');

/* ── API Key ── */
function getApiKey() { return localStorage.getItem('geo_api_key') || ''; }

function saveKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (!key) return;
  localStorage.setItem('geo_api_key', key);
  updateKeyStatus();
  const body = document.getElementById('apikeyBody');
  if (body.classList.contains('open')) toggleApiKey();
  showToast('APIキーを保存しました');
}

function updateKeyStatus() {
  const el = document.getElementById('keyStatus');
  if (getApiKey()) { el.textContent = '保存済み'; el.className = 'key-status saved'; }
  else             { el.textContent = '未設定';   el.className = 'key-status'; }
}

function toggleApiKey() {
  const body   = document.getElementById('apikeyBody');
  const toggle = document.getElementById('apikeyToggle');
  const open   = body.classList.toggle('open');
  toggle.textContent = open ? '詳細 ▲' : '詳細 ▼';
}

function toggleVarRef() {
  const body  = document.getElementById('varrefBody');
  const arrow = document.getElementById('varrefArrow');
  const open  = body.classList.toggle('open');
  arrow.textContent = open ? '▲' : '▼';
}

window.onload = () => {
  const saved = getApiKey();
  if (saved) {
    document.getElementById('apiKeyInput').value = saved;
  } else {
    toggleApiKey();
  }
  updateKeyStatus();
  renderHistory();

  /* ── Event listeners ── */
  document.getElementById('apikeyHeader').addEventListener('click', toggleApiKey);
  document.getElementById('saveKeyBtn').addEventListener('click', saveKey);
  document.getElementById('searchBtn').addEventListener('click', search);
  document.getElementById('queryInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.repeat && !e.isComposing) search();
  });
  document.getElementById('presetLatLng').addEventListener('click', () => applyPreset('latLng'));
  document.getElementById('presetWithAddress').addEventListener('click', () => applyPreset('withAddress'));
  document.getElementById('presetFull').addEventListener('click', () => applyPreset('full'));
  document.getElementById('templateInput').addEventListener('input', updateResult);
  document.getElementById('varrefToggleBtn').addEventListener('click', toggleVarRef);
  document.getElementById('copyBtn').addEventListener('click', copyResult);
  document.getElementById('themeToggle').addEventListener('click', cycleTheme);
};

/* ── Address parsing ── */
function parseAddressComponents(components) {
  const get = (...types) => {
    const c = components.find(c => types.every(t => c.types.includes(t)));
    return c ? c.long_name : '';
  };
  const prefecture = PREFECTURES.find(p => components.some(c => c.long_name === p)) || get('administrative_area_level_1');
  const postalCode = get('postal_code');
  const locality   = get('locality') || get('administrative_area_level_2');
  const sublocal1  = get('sublocality', 'sublocality_level_1');
  const sublocal2  = get('sublocality', 'sublocality_level_2');
  const sublocal3  = get('sublocality', 'sublocality_level_3');
  const sublocal4  = get('sublocality', 'sublocality_level_4');
  const address1   = [locality, sublocal1].filter(Boolean).join('');
  const premise    = get('premise');
  const address2   = [[sublocal2, sublocal3, sublocal4].filter(Boolean).join(''), premise].filter(Boolean).join('');
  const building   = get('establishment') || get('point_of_interest') || '';
  return { postalCode, prefecture, address1, address2, building };
}

function buildData(r, query) {
  const loc = r.geometry.location;
  return {
    query,
    formattedAddress: r.formatted_address,
    lat: loc.lat, lng: loc.lng,
    placeId: r.place_id,
    locationType: r.geometry.location_type,
    ...parseAddressComponents(r.address_components),
  };
}

/* ── Search ── */
async function search() {
  const query  = document.getElementById('queryInput').value.trim();
  const apiKey = getApiKey();
  if (!query)  return;
  if (!apiKey) { showToast('API Key を先に保存してください'); return; }

  setLoading(true);

  try {
    const res  = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&language=ja&key=${apiKey}`);
    const data = await res.json();

    hideCandidates();

    if (data.status !== 'OK' || !data.results.length) {
      showResult(null, data.status); return;
    }

    const results = data.results.slice(0, 5);
    candidates = results.map(r => buildData(r, query));
    renderCandidates(candidates);
    selectCandidate(candidates[0], 0, candidates);
  } catch(e) {
    hideCandidates();
    showResult(null, 'NETWORK_ERROR');
  } finally {
    setLoading(false);
  }
}

/* ── Candidates ── */
function renderCandidates(items) {
  document.getElementById('candidates').classList.add('visible');
  document.getElementById('candidatesPlaceholder').classList.add('hidden');
  const list = document.getElementById('candidateList');
  list.innerHTML = '';
  items.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = `candidate-item${i === 0 ? ' active' : ''}`;
    el.id = `cand-${i}`;
    el.onclick = () => selectCandidate(candidates[i], i, candidates);
    const dot  = document.createElement('span'); dot.className  = 'candidate-dot';
    const addr = document.createElement('span'); addr.className = 'candidate-addr'; addr.textContent = item.formattedAddress;
    const type = document.createElement('span'); type.className = 'candidate-type'; type.textContent = item.locationType;
    el.append(dot, addr, type);
    list.appendChild(el);
  });
}

function selectCandidate(data, index, items) {
  currentData = data;
  if (items.length > 1) {
    items.forEach((_, i) => {
      const el = document.getElementById(`cand-${i}`);
      if (el) el.className = `candidate-item${i === index ? ' active' : ''}`;
    });
  }
  showResult(data, 'OK');
  addHistory(data);
}

function hideCandidates() {
  document.getElementById('candidates').classList.remove('visible');
  document.getElementById('candidatesPlaceholder').classList.remove('hidden');
  document.getElementById('candidateList').innerHTML = '';
  candidates = [];
}

/* ── Result ── */
function showResult(data, status) {
  const badge  = document.getElementById('statusBadge');
  const place  = document.getElementById('resultPlace');
  const output = document.getElementById('jsonOutput');
  badge.textContent = status;
  badge.className   = status === 'OK' ? 'badge ok' : 'badge error';
  if (!data) {
    place.textContent = '見つかりませんでした';
    output.innerHTML  = syntaxHL(JSON.stringify({ error: status }, null, 2));
  } else {
    place.textContent = data.formattedAddress;
    output.innerHTML  = syntaxHL(renderTemplate(data));
  }
}

/* ── Template ── */
function renderTemplate(data) {
  const tpl = document.getElementById('templateInput').value;
  return tpl.replace(/{{(\w+)}}/g, (_, key) => data[key] ?? '');
}

function updateResult() {
  if (currentData) document.getElementById('jsonOutput').innerHTML = syntaxHL(renderTemplate(currentData));
}

function applyPreset(name) {
  document.getElementById('templateInput').value = PRESETS[name];
  updateResult();
}

function copyResult() {
  if (!currentData) return;
  navigator.clipboard.writeText(renderTemplate(currentData));
  showToast('コピーしました ✓');
}

/* ── Util ── */
function setLoading(v) {
  document.getElementById('loading').className  = v ? 'loading visible' : 'loading';
  document.getElementById('searchBtn').disabled = v;
}

function syntaxHL(json) {
  return json
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, m => {
      if (/^"/.test(m)) return /:$/.test(m) ? `<span class="jk">${m}</span>` : `<span class="js">${m}</span>`;
      if (/true|false/.test(m)) return `<span class="jb">${m}</span>`;
      if (/null/.test(m))       return `<span class="jl">${m}</span>`;
      return `<span class="jn">${m}</span>`;
    });
}

function addHistory(item) {
  history = [item, ...history.filter(h => h.query !== item.query)].slice(0, 8);
  localStorage.setItem('geo_history', JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('historyList');
  list.innerHTML = '';
  if (!history.length) {
    const empty = document.createElement('span');
    empty.className = 'history-empty';
    empty.textContent = 'まだ履歴がありません';
    list.appendChild(empty);
    return;
  }
  history.forEach(h => {
    const el = document.createElement('div');
    el.className = 'history-item';
    el.onclick = () => loadHistory(h);

    const dot = document.createElement('span'); dot.className = 'history-dot';

    const body = document.createElement('div'); body.className = 'history-body';
    const name = document.createElement('span'); name.className = 'history-name'; name.textContent = h.query;
    const addr = document.createElement('span'); addr.className = 'history-addr'; addr.textContent = h.formattedAddress || '';
    body.append(name, addr);

    const coords = document.createElement('span'); coords.className = 'history-coords'; coords.textContent = `${h.lat.toFixed(4)}, ${h.lng.toFixed(4)}`;

    el.append(dot, body, coords);
    list.appendChild(el);
  });
}

function loadHistory(item) {
  document.getElementById('queryInput').value = item.query;
  hideCandidates();
  currentData = item;
  showResult(item, 'OK');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show';
  setTimeout(() => t.className = 'toast', 2000);
}
