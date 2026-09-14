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
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function showToast(msg) {
  const t = document.getElementById('toast');
  const m = document.getElementById('toastMsg');
  if (!t || !m) return;
  m.textContent = msg;
  t.classList.remove('translate-y-20', 'opacity-0');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.add('translate-y-20', 'opacity-0'), 2400);
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff/60)}p trước`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h trước`;
  if (diff < 604800) return `${Math.floor(diff/86400)}d trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

function parseTags(str) {
  if (!str) return [];
  return str.split(',').map(t => t.trim()).filter(Boolean);
}

/* ============================================================
   AUTH
   ============================================================ */
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  const isIn = !!session?.user;

  document.getElementById('authGate').classList.toggle('hidden', isIn);
  document.getElementById('app').classList.toggle('hidden', !isIn);
  document.getElementById('logoutBtn').classList.toggle('hidden', !isIn);
  document.getElementById('loginLink').classList.toggle('hidden', isIn);

  if (isIn) await loadAll();
}

/* ============================================================
   GREETING + CLOCK
   ============================================================ */
function updateGreeting() {
  const h = new Date().getHours();
  let text, icon;

  if (h < 5)        { text = 'Khuya rồi, ngủ đi';       icon = 'moon'; }
  else if (h < 11)  { text = 'Chào buổi sáng';           icon = 'sun'; }
  else if (h < 13)  { text = 'Chào buổi trưa';           icon = 'sun'; }
  else if (h < 18)  { text = 'Chào buổi chiều';          icon = 'sun'; }
  else if (h < 22)  { text = 'Chào buổi tối';            icon = 'moon'; }
  else              { text = 'Khuya rồi, nghỉ ngơi thôi'; icon = 'moon'; }

  const greetText = document.getElementById('greetText');
  const greetIcon = document.getElementById('greetIcon');
  if (greetText) greetText.textContent = text;
  if (greetIcon) {
    greetIcon.setAttribute('data-lucide', icon);
    if (window.lucide) lucide.createIcons();
  }

  const d = new Date();
  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const dateEl = document.getElementById('greetDate');
  if (dateEl) dateEl.textContent = `${days[d.getDay()]}, ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
}

function updateClock() {
  const el = document.getElementById('greetClock');
  if (!el) return;
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  el.textContent = `${hh}:${mm}:${ss}`;
}

function startClock() {
  updateGreeting();
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(updateGreeting, 60 * 1000);
}

/* ============================================================
   LOAD DATA
   ============================================================ */
let data = { notes: [], watchlist: [], tasks: [] };

async function loadAll() {
  const [notesRes, watchRes, tasksRes] = await Promise.all([
    supabase.from('notes').select('*').order('updated_at', { ascending: false }).limit(3),
    supabase.from('watchlist').select('*').eq('status', 'watching').order('updated_at', { ascending: false }).limit(3),
    supabase.from('tasks').select('*').neq('status', 'done').order('updated_at', { ascending: false }).limit(3),
  ]);

  data.notes     = notesRes.data  || [];
  data.watchlist = watchRes.data  || [];
  data.tasks     = tasksRes.data  || [];

  await loadStats();
  renderNotes();
  renderWatchlist();
  renderTasks();
  if (window.lucide) lucide.createIcons();
}

async function loadStats() {
  const stats = await Promise.all([
    supabase.from('notes').select('*', { count: 'exact', head: true }).then(r => r.count ?? 0),
    supabase.from('watchlist').select('*', { count: 'exact', head: true }).eq('status', 'watching').then(r => r.count ?? 0),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'done').then(r => r.count ?? 0),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'done').then(r => r.count ?? 0),
  ]);

  const cards = [
    { label: 'Ghi chú',      value: stats[0], icon: 'sticky-note',  color: 'amber',   href: 'notes.html' },
    { label: 'Đang xem',     value: stats[1], icon: 'tv',           color: 'cyan',    href: 'watch.html' },
    { label: 'Task mở',      value: stats[2], icon: 'list-checks',  color: 'emerald', href: 'tasks.html' },
    { label: 'Task đã xong', value: stats[3], icon: 'check-circle', color: 'purple',  href: 'tasks.html' },
  ];

  document.getElementById('statsRow').innerHTML = cards.map(c => `
    <a href="${c.href}" class="glass-card rounded-2xl p-4 block hover:border-white/30 transition-all">
      <div class="flex items-center gap-2 text-${c.color}-400 mb-2">
        <i data-lucide="${c.icon}" class="w-4 h-4"></i>
        <span class="text-[10px] font-semibold uppercase tracking-wide">${c.label}</span>
      </div>
      <p class="text-2xl font-bold text-white">${c.value}</p>
    </a>
  `).join('');
}

/* ============================================================
   RENDER 3 CỘT
   ============================================================ */
function renderNotes() {
  const el = document.getElementById('recentNotes');

  if (!data.notes.length) {
    el.innerHTML = `
      <div class="text-center py-8 text-xs text-slate-500">
        <i data-lucide="ghost" class="w-8 h-8 mx-auto mb-2 opacity-40"></i>
        Chưa có ghi chú nào
      </div>`;
    return;
  }

  el.innerHTML = data.notes.map(n => {
    const preview = (n.content || '').slice(0, 80);
    return `
      <a href="notes.html" class="block glass-card rounded-xl p-3 hover:border-white/30 transition-all">
        ${n.title ? `<h4 class="font-medium text-white text-xs mb-1 truncate">${esc(n.title)}</h4>` : ''}
        <p class="text-[11px] text-slate-400 line-clamp-2 leading-snug">${esc(preview)}${n.content?.length > 80 ? '…' : ''}</p>
        <p class="text-[10px] text-slate-600 mt-2">${timeAgo(n.updated_at)}</p>
      </a>
    `;
  }).join('');
}

function renderWatchlist() {
  const el = document.getElementById('watchingList');

  if (!data.watchlist.length) {
    el.innerHTML = `
      <div class="text-center py-8 text-xs text-slate-500">
        <i data-lucide="ghost" class="w-8 h-8 mx-auto mb-2 opacity-40"></i>
        Không có bộ nào đang xem
      </div>`;
    return;
  }

  el.innerHTML = data.watchlist.map(w => {
    const progress = w.total_ep > 0
      ? Math.min(100, Math.round((w.current_ep / w.total_ep) * 100))
      : 0;
    const eps = w.total_ep > 0
      ? `${w.current_ep}/${w.total_ep}`
      : `${w.current_ep || 0} tập`;

    const cover = w.cover_url
      ? `<img src="${esc(w.cover_url)}" class="w-9 h-11 rounded object-cover bg-slate-800 shrink-0" onerror="this.style.display='none'"/>`
      : `<div class="w-9 h-11 rounded bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shrink-0"><i data-lucide="image" class="w-4 h-4 text-slate-600"></i></div>`;

    return `
      <a href="watch.html" class="flex items-center gap-3 glass-card rounded-xl p-2.5 hover:border-white/30 transition-all">
        ${cover}
        <div class="flex-1 min-w-0">
          <h4 class="font-medium text-white text-xs truncate">${esc(w.title)}</h4>
          <div class="flex items-center justify-between mt-1">
            <span class="text-[10px] text-slate-500">${eps}</span>
            ${w.total_ep > 0 ? `<span class="text-[10px] text-cyan-400 font-semibold">${progress}%</span>` : ''}
          </div>
          ${w.total_ep > 0 ? `
            <div class="w-full h-0.5 mt-1 rounded-full bg-white/5 overflow-hidden">
              <div class="h-full bg-gradient-to-r from-cyan-500 to-purple-500" style="width:${progress}%"></div>
            </div>` : ''}
        </div>
      </a>
    `;
  }).join('');
}

function renderTasks() {
  const el = document.getElementById('activeTasks');

  if (!data.tasks.length) {
    el.innerHTML = `
      <div class="text-center py-8 text-xs text-slate-500">
        <i data-lucide="party-popper" class="w-8 h-8 mx-auto mb-2 opacity-40"></i>
        Không có task nào!
      </div>`;
    return;
  }

  const PRIORITY = {
    high:   { color: 'text-red-400',    dot: 'bg-red-500',    label: 'Cao' },
    medium: { color: 'text-amber-400',  dot: 'bg-amber-500',  label: 'Vừa' },
    low:    { color: 'text-slate-400',  dot: 'bg-slate-500',  label: 'Thấp' },
  };

  el.innerHTML = data.tasks.map(t => {
    const p = PRIORITY[t.priority] || PRIORITY.medium;
    const overdue = t.due_date && new Date(t.due_date + 'T23:59:59') < Date.now();

    return `
      <a href="tasks.html" class="block glass-card rounded-xl p-2.5 hover:border-white/30 transition-all">
        <div class="flex items-start gap-2">
          <span class="w-1.5 h-1.5 rounded-full ${p.dot} mt-1.5 shrink-0"></span>
          <div class="flex-1 min-w-0">
            <h4 class="font-medium text-white text-xs line-clamp-2 leading-snug">${esc(t.title)}</h4>
            <div class="flex items-center justify-between gap-2 mt-1.5">
              <span class="text-[10px] ${p.color}">${p.label}</span>
              ${overdue ? `<span class="text-[10px] text-red-400">⚠ Quá hạn</span>` : ''}
              ${t.status === 'doing' ? `<span class="text-[10px] text-cyan-400">Đang làm</span>` : ''}
            </div>
          </div>
        </div>
      </a>
    `;
  }).join('');
}

/* ============================================================
   EVENTS
   ============================================================ */
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.reload();
});

/* ============================================================
   INIT
   ============================================================ */
startClock();
checkAuth();
if (window.lucide) lucide.createIcons();