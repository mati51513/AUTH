// Admin page logic for diagnostics and API keys management

function serverOrigin() { return 'http://' + location.hostname + (location.port ? ':' + location.port : ''); }

function showToast(message, type='info') {
  const el = document.createElement('div');
  el.className = `toast align-items-center text-white bg-${type} border-0`;
  el.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
  document.body.appendChild(el);
  const t = new bootstrap.Toast(el, { delay: 3000 }); t.show();
  setTimeout(() => el.remove(), 4000);
}

function saveAdminSecret() {
  const input = document.getElementById('adminSecretInput');
  if (input && input.value) {
    localStorage.setItem('adminSecret', input.value);
    showToast('Admin secret saved', 'success');
  }
}

function renderDiagnostics(data) {
  const el = document.getElementById('diagnosticsContainer');
  if (!el) return;
  const mem = data.server.memory || {};
  const sec = data.security || {};
  const perf = data.performance || {};
  const enc = data.encryption || {};
  const cpu = data.server.cpu || {};
  const uptime = data.server.uptime;
  const fmtBytes = (n) => n ? Math.round(n / 1024 / 1024 * 100) / 100 + ' MB' : '—';
  const fmtPct = (user, sys) => { const total = (user||0) + (sys||0); return total ? (Math.round(total/1000)/10 + '%') : '—'; };
  el.innerHTML = `
    <div class="row">
      <div class="col-md-3"><div class="card status-card"><div class="card-body"><h6>Server</h6><div>Uptime: ${Math.round(uptime)}s</div><div>CPU: ${fmtPct(cpu.user, cpu.system)}</div><div>RSS: ${fmtBytes(mem.rss)}</div><div>Heap Used: ${fmtBytes(mem.heapUsed)}</div><div>Node: ${data.server.nodeVersion}</div></div></div></div>
      <div class="col-md-3"><div class="card status-card"><div class="card-body"><h6>Security</h6><div>Blocked IPs: ${sec.stats ? sec.stats.totalBlocked : '—'}</div><div>Suspicious: ${sec.stats ? sec.stats.totalSuspicious : '—'}</div><div>Last Scan: ${sec.lastSecurityScan || '—'}</div></div></div></div>
      <div class="col-md-3"><div class="card status-card"><div class="card-body"><h6>Performance</h6><div>RPM: ${perf.requestsPerMinute || 0}</div><div>Avg Resp: ${perf.averageResponseTime || '—'}</div><div>Error Rate: ${perf.errorRate || '—'}</div></div></div></div>
      <div class="col-md-3"><div class="card status-card"><div class="card-body"><h6>Encryption</h6><div>Algo: ${enc.algorithm || '—'}</div><div>Rotation: ${enc.keyRotation || '—'}</div><div>Last Rot.: ${enc.lastKeyRotation || '—'}</div></div></div></div>
    </div>`;
}

function loadDiagnostics() {
  const secret = localStorage.getItem('adminSecret') || document.getElementById('adminSecretInput')?.value;
  if (!secret) { showToast('Admin secret required', 'warning'); return; }
  fetch(serverOrigin() + '/api/status/diagnostics', { headers: { 'x-admin-secret': secret }})
    .then(r => r.json())
    .then(resp => { if (resp && resp.success) { renderDiagnostics(resp.data); showToast('Diagnostics loaded', 'success'); } else { showToast('Failed to load diagnostics', 'danger'); }})
    .catch(() => showToast('Failed to connect to the server', 'danger'));
}

// API Keys
function renderApiKeys(list) {
  const tbody = document.getElementById('apiKeysTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  list.forEach(k => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${k.name||''}</td><td><code>${k.value||''}</code></td><td>${k.revoked?'revoked':'active'}</td><td>${(k.quota&&k.quota.rpm)||'—'}</td><td>${k.createdAt||''}</td>
      <td>
        <button class="btn btn-sm btn-outline-warning" data-action="rotate" data-id="${k.id}">Rotate</button>
        <button class="btn btn-sm btn-outline-danger ms-1" data-action="revoke" data-id="${k.id}">Revoke</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function refreshKeys() {
  const secret = localStorage.getItem('adminSecret'); if (!secret) return showToast('Admin secret required', 'warning');
  fetch(serverOrigin() + '/api/admin/api-keys', { headers: { 'x-admin-secret': secret }})
    .then(r => r.json())
    .then(resp => { if (resp && resp.success) renderApiKeys(resp.keys || []); else showToast('Failed to load API keys', 'danger'); })
    .catch(() => showToast('Failed to connect to the server', 'danger'));
}

function createKey() {
  const name = prompt('Key name'); if (!name) return;
  const rpm = parseInt(prompt('Quota: requests per minute (rpm)', '60'), 10) || 60;
  const secret = localStorage.getItem('adminSecret'); if (!secret) return showToast('Admin secret required', 'warning');
  fetch(serverOrigin() + '/api/admin/api-keys', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
    body: JSON.stringify({ name, quota: { rpm } })
  }).then(r => r.json()).then(resp => { if (resp && resp.success) { showToast('Key created', 'success'); refreshKeys(); } else showToast('Failed to create key', 'danger'); })
  .catch(() => showToast('Failed to connect to the server', 'danger'));
}

function handleKeysTableActions(e) {
  const btn = e.target.closest('button'); if (!btn) return;
  const action = btn.getAttribute('data-action'); const id = btn.getAttribute('data-id');
  const secret = localStorage.getItem('adminSecret'); if (!secret) return showToast('Admin secret required', 'warning');
  if (action === 'rotate') {
    fetch(serverOrigin() + `/api/admin/api-keys/${id}/rotate`, { method: 'POST', headers: { 'x-admin-secret': secret }})
      .then(r => r.json()).then(resp => { if (resp && resp.success) { showToast('Key rotated', 'success'); refreshKeys(); } else showToast('Failed to rotate', 'danger'); })
      .catch(() => showToast('Failed to connect', 'danger'));
  } else if (action === 'revoke') {
    fetch(serverOrigin() + `/api/admin/api-keys/${id}`, { method: 'DELETE', headers: { 'x-admin-secret': secret }})
      .then(r => r.json()).then(resp => { if (resp && resp.success) { showToast('Key revoked', 'success'); refreshKeys(); } else showToast('Failed to revoke', 'danger'); })
      .catch(() => showToast('Failed to connect', 'danger'));
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // Prefill admin secret
  const input = document.getElementById('adminSecretInput'); const saved = localStorage.getItem('adminSecret'); if (input && saved) input.value = saved;
  document.getElementById('saveAdminSecretBtn')?.addEventListener('click', saveAdminSecret);
  document.getElementById('loadDiagnosticsBtn')?.addEventListener('click', loadDiagnostics);
  document.getElementById('refreshKeysBtn')?.addEventListener('click', refreshKeys);
  document.getElementById('createKeyBtn')?.addEventListener('click', createKey);
  document.getElementById('apiKeysTableBody')?.addEventListener('click', handleKeysTableActions);
  // Initial load
  refreshKeys();
});

