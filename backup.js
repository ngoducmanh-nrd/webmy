import { supabase } from "./supabaseConfig.js";

/* ============================================================
   THEME
   ============================================================ */
function initTheme() {
  const saved = localStorage.getItem('portfolio_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  document.querySelectorAll('input[name="theme"]').forEach((inp) => {
    if (inp.value === saved) inp.checked = true;
    inp.addEventListener('change', (e) => {
      if (!e.target.checked) return;
      document.documentElement.setAttribute('data-theme', e.target.value);
      localStorage.setItem('portfolio_theme', e.target.value);
    });
  });
}
initTheme();

/* ============================================================
   HELPERS
   ============================================================ */
const TABLES = ['notes', 'watchlist', 'tasks'];
const BACKUP_VERSION = 1;

let currentUser = null;
let pendingImport = null;   // data đang chờ confirm

function showToast(msg) {
  const t = document.getElementById('toast');
  const m = document.getElementById('toastMsg');
  if (!t || !m) return;
  m.textContent = msg;
  t.classList.remove('translate-y-20', 'opacity-0');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.add('translate-y-20', 'opacity-0'), 2600);
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ============================================================
   AUTH
   ============================================================ */
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;
  const isIn = !!currentUser;

  document.getElementById('authGate').classList.toggle('hidden', isIn);
  document.getElementById('app').classList.toggle('hidden', !isIn);
  document.getElementById('logoutBtn').classList.toggle('hidden', !isIn);
  document.getElementById('loginLink').classList.toggle('hidden', isIn);

  if (isIn) await renderStats();
}

/* ============================================================
   STATS (số lượng row mỗi bảng)
   ============================================================ */
async function renderStats() {
  const counts = await Promise.all(TABLES.map(async (t) => {
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
    return { table: t, count: count ?? 0 };
  }));

  const meta = {
    notes: { label: 'Ghi chú', icon: 'sticky-note', color: 'amber' },
    watchlist: { label: 'Watchlist', icon: 'tv', color: 'cyan' },
    tasks: { label: 'Tasks', icon: 'list-checks', color: 'emerald' },
  };

  document.getElementById('statsRow').innerHTML = counts.map(c => {
    const m = meta[c.table];
    return `
      <div class="glass-card rounded-2xl p-4">
        <div class="flex items-center gap-2 text-${m.color}-400 mb-2">
          <i data-lucide="${m.icon}" class="w-4 h-4"></i>
          <span class="text-[11px] font-semibold uppercase tracking-wide">${m.label}</span>
        </div>
        <p class="text-2xl font-bold text-white">${c.count}</p>
        <p class="text-[11px] text-slate-500">${c.table}</p>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

/* ============================================================
   EXPORT
   ============================================================ */
async function exportTables(tables) {
  const results = await Promise.all(tables.map(t =>
    supabase.from(t).select('*').order('id', { ascending: true })
  ));

  const data = {};
  let totalRows = 0;
  tables.forEach((t, i) => {
    const rows = results[i].data || [];
    data[t] = rows;
    totalRows += rows.length;
  });

  if (!totalRows) {
    showToast('Không có dữ liệu để export');
    return;
  }

  const payload = {
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    exported_by: currentUser?.email ?? 'admin',
    app: 'ngoducmanh-portfolio',
    data,
  };

  downloadJSON(payload, `backup-${tables.join('-')}-${todayStr()}.json`);
  showToast(`Đã export ${totalRows} rows`);
}

function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ============================================================
   IMPORT
   ============================================================ */
function handleFile(file) {
  if (!file) return;
  if (!file.name.endsWith('.json')) {
    showToast('File phải là .json');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const json = JSON.parse(e.target.result);
      validateBackup(json);
      pendingImport = json;
      showImportPreview(json);
    } catch (err) {
      console.error(err);
      showToast('File JSON lỗi: ' + err.message);
    }
  };
  reader.onerror = () => showToast('Không đọc được file');
  reader.readAsText(file);
}

function validateBackup(json) {
  if (!json || typeof json !== 'object') throw new Error('Không phải object');
  if (!json.data || typeof json.data !== 'object') throw new Error('Thiếu field "data"');
  const keys = Object.keys(json.data);
  if (!keys.length) throw new Error('File không có dữ liệu');
  const validKeys = keys.filter(k => TABLES.includes(k));
  if (!validKeys.length) throw new Error('Không có bảng nào hợp lệ (notes/watchlist/tasks)');
}

function showImportPreview(json) {
  const el = document.getElementById('importPreview');
  const body = document.getElementById('importPreviewBody');

  const meta = { notes: 'Ghi chú', watchlist: 'Watchlist', tasks: 'Tasks' };
  const exportedAt = json.exported_at
    ? new Date(json.exported_at).toLocaleString('vi-VN')
    : 'không rõ';

  const lines = Object.keys(json.data).map(t => {
    const count = Array.isArray(json.data[t]) ? json.data[t].length : 0;
    const label = meta[t] || t;
    const invalid = !TABLES.includes(t);
    return `<div class="flex items-center justify-between">
      <span class="${invalid ? 'text-red-400 line-through' : ''}">${label}</span>
      <span class="font-mono text-cyan-400">${count} rows</span>
    </div>`;
  }).join('');

  body.innerHTML = `
    <div class="text-xs text-slate-500 mb-2">
      Export lúc: <b>${exportedAt}</b> · Version <b>${json.version ?? '?'}</b>
    </div>
    ${lines}
  `;

  el.classList.remove('hidden');
}

async function confirmImport() {
  if (!pendingImport) return;

  const ok = confirm(
    '⚠️ XÁC NHẬN GHI ĐÈ\n\n' +
    'Toàn bộ dữ liệu hiện tại (notes / watchlist / tasks) sẽ BỊ XÓA.\n' +
    'Sau đó dữ liệu từ file sẽ được ghi vào.\n\n' +
    'Không thể hoàn tác. Tiếp tục?'
  );
  if (!ok) return;

  const btn = document.getElementById('confirmImportBtn');
  btn.disabled = true;
  btn.classList.add('opacity-50');

  try {
    await doImport(pendingImport);
    showToast('Import thành công!');
    pendingImport = null;
    document.getElementById('importPreview').classList.add('hidden');
    document.getElementById('fileInput').value = '';
    await renderStats();
  } catch (err) {
    console.error(err);
    showToast('Lỗi import: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.classList.remove('opacity-50');
  }
}

async function doImport(json) {
  // 1. Xóa toàn bộ 3 bảng trước
  for (const table of TABLES) {
    const { error } = await supabase.from(table).delete().gte('id', 0);
    if (error) throw new Error(`Xóa ${table} lỗi: ${error.message}`);
  }

  // 2. Insert lại theo thứ tự
  for (const table of TABLES) {
    const rows = json.data[table];
    if (!Array.isArray(rows) || !rows.length) continue;

    // Bỏ id/created_at/updated_at → DB tự sinh
    const clean = rows.map(r => {
      const copy = { ...r };
      delete copy.id;
      delete copy.created_at;
      // updated_at giữ nguyên nếu có (nhưng Supabase sẽ tự update default)
      return copy;
    });

    const { error } = await supabase.from(table).insert(clean);
    if (error) throw new Error(`Insert ${table} lỗi: ${error.message}`);
  }
}

/* ============================================================
   EVENTS
   ============================================================ */
document.getElementById('exportAllBtn').addEventListener('click', () => exportTables(TABLES));
document.getElementById('exportNotesBtn').addEventListener('click', () => exportTables(['notes']));
document.getElementById('exportWatchBtn').addEventListener('click', () => exportTables(['watchlist']));
document.getElementById('exportTasksBtn').addEventListener('click', () => exportTables(['tasks']));

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

// Drag & drop
['dragenter', 'dragover'].forEach(evt => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.add('border-cyan-500/60', 'bg-cyan-500/5');
  });
});
['dragleave', 'drop'].forEach(evt => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-cyan-500/60', 'bg-cyan-500/5');
  });
});
dropZone.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files?.[0];
  handleFile(file);
});

document.getElementById('confirmImportBtn').addEventListener('click', confirmImport);
document.getElementById('cancelImportBtn').addEventListener('click', () => {
  pendingImport = null;
  document.getElementById('importPreview').classList.add('hidden');
  fileInput.value = '';
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.reload();
});

/* ============================================================
   INIT
   ============================================================ */
checkAuth();
if (window.lucide) lucide.createIcons();