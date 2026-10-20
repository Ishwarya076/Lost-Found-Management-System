const pages = [
  ['Dashboard', '⌂'],
  ['Report Lost', '＋'],
  ['Report Found', '✦'],
  ['Browse Items', '⌕'],
  ['Smart Matching', '✧'],
  ['My Claims', '☷'],
  ['Notifications', '♧'],
  ['Admin & Analytics', '▤']
];

let items = [], claims = [], notices = [], page = 'Dashboard';

const $ = id => document.getElementById(id);
const safe = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(msg) {
  if (!$('toast')) return;
  $('toast').textContent = msg;
  $('toast').className = 'show';
  setTimeout(() => $('toast').className = '', 2800);
}

async function api(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw Error(data.error || 'Request failed');
  return data;
}

async function refresh() {
  const data = await api('/api/state');
  items = data.items;
  claims = data.claims;
  notices = data.notices;
  render();
}

function go(p) {
  page = p;
  document.querySelectorAll('.nav').forEach(x => x.classList.toggle('active', x.dataset.page === p));
  if ($('heading'))$('heading').textContent = p === 'Dashboard' ? 'Good to see you! 👋' : p;
  if ($('subheading'))$('subheading').textContent = p === 'Dashboard' ? 'Helping lost things find their way home.' : 'Manage your ' + p.toLowerCase() + ' in one simple workspace.';
  render();
}

function panel(title, body, action = '') {
  return `<section class="panel"><div class="panelhead"><h2>${title}</h2>${action}</div>${body}</section>`;
}

function stat(label, value, icon) {
  return `<div class="stat"><span>${label}</span><i class="icon">${icon}</i><strong>${value}</strong><small>Current reports</small></div>`;
}

function stats() {
  return `<div class="stats">${stat('Lost items', items.filter(x => x.type === 'Lost').length, '⌑')}${stat('Found items', items.filter(x => x.type === 'Found').length, '✦')}${stat('Pending claims', claims.filter(x => x.status === 'Pending').length, '☷')}${stat('Recovered', items.filter(x => x.status === 'Recovered').length, '✓')}</div>`;
}

function icon(category) {
  return ({ Bags: '🎒', Electronics: '🎧', Keys: '🔑', Wallets: '👛', Bottles: '🧴', IDs: '🪪', Books: '📚', Clothing: '👕' })[category] || '📦';
}

function photo(i) {
  return i.image ? `<img class="itemphoto" src="${safe(i.image)}" alt="${safe(i.title)}" loading="lazy">` : icon(i.category);
}

function card(i) {
  return `<div class="card">
    <div class="art">
      ${photo(i)}
      <span class="pill ${i.type === 'Found' ? 'found' : ''}">${i.type}</span>
    </div>
    <div class="cardbody">
      <b>${safe(i.title)}</b>
      <p>${safe(i.description)}</p>
      <small>⌖ ${safe(i.location)} · ${safe(i.date)}</small>
      <div style="display:flex; gap:8px; margin-top:10px;">
        <button class="outline" style="flex:1;" onclick="details(${i.id})">${i.type === 'Found' ? 'Claim / Details' : 'View details'}</button>
        <button class="outline" style="color:#ef4444; border-color:#fca5a5;" onclick="deleteReport(${i.id}, '${safe(i.title)}')">🗑 Delete</button>
      </div>
    </div>
  </div>`;
}

async function deleteReport(id, title) {
  if (confirm(`Are you sure you want to remove/delete "${title}"? This action cannot be undone.`)) {
    try {
      await api(`/api/items/${id}`, { method: 'DELETE' });
      toast('Report removed successfully!');
      await refresh();
    } catch (e) {
      toast(e.message);
    }
  }
}

async function details(id) {
  const i = items.find(x => x.id === id);
  if (!i) return;
  if (i.type === 'Lost') {
    alert(`LOST REPORT\n\nItem: ${i.title}\nDescription: ${i.description}\nLocation last seen: ${i.location}\nDate: ${i.date}\n\nThis is a Lost report. Claims can only be submitted against a Found report.`);
    return;
  }
  const proof = prompt(`${i.title}\n${i.description}\nFound at: ${i.location}\n\nTo claim this found item, describe a unique identifying detail (at least 8 characters):`);
  if (proof === null) return;
  if (proof.trim().length < 8) return toast('Provide at least 8 characters of ownership proof.');
  try {
    await api('/api/claims', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: id, proof: proof.trim() })
    });
    toast('Claim submitted for review');
    await refresh();
    go('My Claims');
  } catch (e) {
    toast(e.message);
  }
}

function dashboard() {
  return stats() + `<div class="grid"><div>${panel('Recently reported items', items.length ? `<div class="cards">${items.slice(0, 6).map(card).join('')}</div>` : '<div class="empty">No reports yet. Add your first lost or found item.</div>', `<button class="outline" onclick="go('Browse Items')">View all →</button>`)}</div><div>${panel('Recent activity', notices.length ? notices.slice(0, 5).map(n => `<div class="activity"><i>✧</i><div><b>${safe(n.text)}</b><p>${safe(n.date)}</p></div></div>`).join('') : '<div class="empty">No activity yet.</div>')}${panel('How it works', '<div class="activity"><i>1</i><div><b>Report</b><p>Describe the item and upload its photo.</p></div></div><div class="activity"><i>2</i><div><b>Match</b><p>Only the same item type is suggested.</p></div></div><div class="activity"><i>3</i><div><b>Claim or Delete</b><p>Provide proof to claim or delete if you found your item.</p></div></div>')}</div></div>`;
}

function form(type) {
  const lost = type === 'Lost';
  return panel(`${lost ? '🔎 Report a Lost Item' : '📸 Report a Found Item'}`, `<div class="report-intro ${lost ? 'lost-intro' : 'found-intro'}"><span class="report-emoji">${lost ? '🧳' : '🙌'}</span><div><b>${lost ? 'Did you lose something?' : 'Did you find something?'}</b><p>${lost ? 'Post a photo of the item as you remember it, along with identifying details.' : 'Help its owner recognise it by uploading a photo you took after finding it.'}</p></div></div><form id="itemForm"><div class="fields"><div class="field"><label>Item name *</label><input name="title" required placeholder="${lost ? 'e.g. My black backpack' : 'e.g. Black backpack found'}"></div><div class="field"><label>Category *</label><select name="category" required>${['Bags', 'Electronics', 'Keys', 'Wallets', 'Bottles', 'IDs', 'Books', 'Clothing', 'Other'].map(x => `<option>${x}</option>`).join('')}</select></div><div class="field"><label>${lost ? 'Where did you lose it? *' : 'Where did you find it? *'}</label><input name="location" required placeholder="e.g. Library, near the entrance"></div><div class="field"><label>${lost ? 'Date lost *' : 'Date found *'}</label><input type="date" name="date" required value="${new Date().toLocaleDateString('en-CA')}"></div><div class="field full"><label>Details *</label><textarea name="description" required placeholder="Colour, brand, unique marks, contents (avoid sharing private information)"></textarea></div><div class="field full photo-field"><label>${lost ? 'Upload a photo of the item you previously owned *' : 'Upload a photo of the item after you found it *'}</label><input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" id="imageInput" required><div id="preview"></div><small class="muted">Photo required · JPG, PNG, WEBP or GIF · Maximum 5 MB.</small></div></div><div class="actions"><button class="primary" type="submit">${lost ? 'Publish Lost Report' : 'Publish Found Report'} ✨</button><button type="reset" class="outline">Clear form</button></div></form>`);
}

function browse() {
  return panel('All item reports', `<div class="filters"><input id="filterText" placeholder="Search items, locations, categories..."><select id="filterType"><option>All</option><option>Lost</option><option>Found</option></select></div><div id="listArea"></div>`);
}

function rows(data) {
  return data.length ? `<div class="tablewrap"><table><thead><tr><th>ITEM</th><th>TYPE</th><th>LOCATION</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>${data.map(i => `<tr><td><div class="tableitem">${i.image ? `<img src="${safe(i.image)}" alt="Item">` : `<span>${icon(i.category)}</span>`}<b>${safe(i.title)}</b></div></td><td>${i.type}</td><td>${safe(i.location)}</td><td><span class="badge ${i.status === 'Open' ? 'pending' : ''}">${safe(i.status)}</span></td><td><div style="display:flex; gap:6px;"><button class="outline" onclick="details(${i.id})">${i.type === 'Found' ? 'Claim / Details' : 'View Details'}</button><button class="outline" style="color:#ef4444; border-color:#fca5a5;" onclick="deleteReport(${i.id}, '${safe(i.title)}')">🗑 Delete</button></div></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No items found.</div>';
}

const stop = new Set(['a', 'an', 'the', 'my', 'lost', 'found', 'black', 'white', 'blue', 'brown', 'red', 'green', 'silver', 'gold', 'small', 'large', 'new', 'old', 'with', 'and', 'item', 'wireless']);
const aliases = { backpack: 'bag', rucksack: 'bag', handbag: 'bag', purse: 'wallet', billfold: 'wallet', earbuds: 'earphones', airpods: 'earphones', headset: 'headphones', mobile: 'phone', smartphone: 'phone', cellphone: 'phone', keys: 'key', bottle: 'bottle', wallet: 'wallet' };

function typeWords(i) {
  return i.title.toLowerCase().match(/[a-z0-9]+/g)?.filter(w => !stop.has(w)).map(w => aliases[w] || w) || [];
}

function score(a, b) {
  if (a.category !== b.category) return 0;
  let aa = typeWords(a), bb = typeWords(b);
  if (!aa.length || !bb.length || !aa.some(w => bb.includes(w))) return 0;
  let s = 70;
  if (a.location.trim().toLowerCase() === b.location.trim().toLowerCase()) s += 20;
  let words = a.description.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !stop.has(w));
  if (words.some(w => b.description.toLowerCase().includes(w))) s += 10;
  return s;
}

function matches() {
  let pairs = [];
  for (const a of items.filter(x => x.type === 'Lost' && x.status !== 'Recovered'))
    for (const b of items.filter(x => x.type === 'Found' && x.status !== 'Recovered')) {
      let s = score(a, b);
      if (s) pairs.push({ a, b, s });
    }
  pairs.sort((x, y) => y.s - x.s);
  return panel('Smart matching suggestions', `<p class="muted">Strict rule-based matching: same category AND same item type/name. Location and description improve the score.</p>${pairs.length ? pairs.map(x => `<div class="match"><div class="match-photos">${x.a.image ? `<img src="${safe(x.a.image)}" alt="Lost item">` : icon(x.a.category)} ↔ ${x.b.image ? `<img src="${safe(x.b.image)}" alt="Found item">` : icon(x.b.category)}</div><b>${safe(x.a.title)} ↔ ${safe(x.b.title)}</b><p>${safe(x.a.location)} / ${safe(x.b.location)} ·${x.s}% match score</p><div class="bar"><span style="width:${x.s}%"></span></div><button class="outline" onclick="details(${x.b.id})">Submit claim</button></div>`).join('') : '<div class="empty">No matching item types yet. Report both a lost and found item of the same type.</div>'}`);
}

function claimsPage() {
  return panel('Claim requests', claims.length ? rowsClaims() : '<div class="empty">No claims yet. Browse an item and select View details to claim it.</div>');
}

function rowsClaims() {
  return claims.length ? `<div class="tablewrap"><table><tr><th>ITEM</th><th>OWNERSHIP PROOF</th><th>STATUS</th><th>DEMO REVIEW</th></tr>${claims.map(c => `<tr><td>${safe(c.title)}</td><td>${safe(c.proof)}</td><td><span class="badge ${c.status === 'Pending' ? 'pending' : ''}">${safe(c.status)}</span></td><td>${c.status === 'Pending' ? `<button class="outline" onclick="review(${c.id},'Approved')">Approve</button> <button class="outline" onclick="review(${c.id},'Rejected')">Reject</button>` : 'Reviewed'}</td></tr>`).join('')}</table></div>` : '<div class="empty">No claims yet.</div>';
}

async function review(id, status) {
  try {
    await api(`/api/claims/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    toast('Claim ' + status.toLowerCase());
    await refresh();
  } catch (e) {
    toast(e.message);
  }
}

function exportCSV() {
  const csv = [['Name', 'Type', 'Category', 'Location', 'Date', 'Status', 'Image URL'], ...items.map(i => [i.title, i.type, i.category, i.location, i.date, i.status, i.image])].map(r => r.map(v => '"' + String(v).replaceAll('"', '""') + '"').join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'lost-found-reports.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

function render() {
  let html = '';
  switch (page) {
    case 'Dashboard': html = dashboard(); break;
    case 'Report Lost': html = form('Lost'); break;
    case 'Report Found': html = form('Found'); break;
    case 'Browse Items': html = browse(); break;
    case 'Smart Matching': html = matches(); break;
    case 'My Claims': html = claimsPage(); break;
    case 'Notifications': html = panel('Notifications', notices.length ? notices.map(n => `<div class="activity"><i>✧</i><div><b>${safe(n.text)}</b><p>${safe(n.date)}</p></div></div>`).join('') : '<div class="empty">No notifications yet.</div>'); break;
    case 'Admin & Analytics': html = stats() + panel('Reports and moderation', `<button class="primary" onclick="exportCSV()">↓ Export CSV report</button><br><br>${rows(items)}`); break;
  }
  
  if ($('app'))$('app').innerHTML = html;

  if (page === 'Browse Items') {
    function apply() {
      let q = $('filterText').value.toLowerCase(), t =$('filterType').value;
      $('listArea').innerHTML = rows(items.filter(i => (t === 'All' || i.type === t) && [i.title, i.category, i.location, i.description].some(s => s.toLowerCase().includes(q))));
    }
    if ($('filterText') && $('filterType')) {$('filterText').oninput = apply;
      $('filterType').onchange = apply;
      apply();
    }
  }

  const f = $('itemForm');
  if (f) {
    $('imageInput').onchange = e => {
      const file = e.target.files[0];
      $('preview').innerHTML = '';
      if (file) {
        let url = URL.createObjectURL(file);
        let img = document.createElement('img');
        img.src = url;
        img.className = 'uploadpreview';
        img.onload = () => URL.revokeObjectURL(url);
        $('preview').appendChild(img);
      }
    };
    f.onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(f);
      fd.set('type', page === 'Report Lost' ? 'Lost' : 'Found');
      try {
        await api('/api/items', { method: 'POST', body: fd });
        toast('Report and item photo published!');
        await refresh();
        go('Browse Items');
      } catch (e) {
        toast(e.message);
      }
    };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const navContainer = $('nav');
  if (navContainer) {
    navContainer.innerHTML = pages.map(([p, ic]) => `<button class="nav" data-page="${p}" onclick="go('${p}')"><i>${ic}</i>${p}</button>`).join('');
  }
  refresh().catch(e => {
    if ($('app')) {$('app').innerHTML = `<section class="panel"><h2>Server connection error</h2><p>Run <b>python app.py</b> and open <b>http://127.0.0.1:5000</b>. Do not open index.html directly.</p><p>${safe(e.message)}</p></section>`;
    }
  });
});