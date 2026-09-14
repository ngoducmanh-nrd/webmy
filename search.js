import { supabase } from "./supabaseConfig.js";

/* ============================================================
   GLOBAL SEARCH — Ctrl+K popup
   ============================================================ */
(function () {
  let overlay, input, results, items = [], selectedIdx = -1;
  let debounceTimer = null;
  let currentSession = null;

  /* ---------- BUILD DOM ---------- */
  function buildUI() {
    // Chỉ dùng nút có sẵn trong HTML, KHÔNG tự tạo
    let trigger = document.getElementById('gsTrigger');

    // Nếu HTML không có nút nào, thì mới tạo nút nổi fallback
    if (!trigger) {
      trigger = document.createElement('button');
      trigger.id = 'gsTrigger';
      trigger.type = 'button';
      trigger.className = 'gs-trigger';
      trigger.style.cssText = 'position:fixed; top:1.5rem; right:1.5rem; z-index:60;';
      trigger.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:14px;height:14px">
          <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
        </svg>
        <span>Tìm kiếm</span>
        <span class="gs-kbd">Ctrl K</span>
      `;
      document.body.appendChild(trigger);
    }

    // Overlay + panel
    overlay = document.createElement('div');
    overlay.id = 'gsOverlay';
    overlay.className = 'gs-overlay';
    overlay.innerHTML = `
      <div class="gs-panel">
        <div class="gs-input-row">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
          </svg>
          <input id="gsInput" class="gs-input" type="text" placeholder="Tìm ghi chú, watchlist, dự án..." autocomplete="off" />
          <span class="gs-kbd">ESC</span>
        </div>
        <div id="gsResults" class="gs-results"></div>
      </div>
    `;

    document.body.appendChild(overlay);
    input = overlay.querySelector('#gsInput');
    results = overlay.querySelector('#gsResults');
  }

  /* ---------- OPEN / CLOSE ---------- */
  async function open() {
    // Kiểm tra đăng nhập
    const { data } = await supabase.auth.getSession();
    currentSession = data.session;
    if (!currentSession?.user) {
      const toastMsg = document.getElementById('toastMsg');
      const toast = document.getElementById('toast');
      if (toast && toastMsg) {
        toastMsg.textContent = 'Cần đăng nhập admin để tìm kiếm';
        toast.classList.remove('translate-y-20', 'opacity-0');
        setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 2200);
      } else {
        alert('Cần đăng nhập admin để tìm kiếm');
      }
      return;
    }

    overlay.classList.add('active');
    input.value = '';
    results.innerHTML = emptyHint();
    selectedIdx = -1;
    setTimeout(() => input.focus(), 60);
  }

  function close() {
    overlay.classList.remove('active');
    input.value = '';
    items = [];
    selectedIdx = -1;
  }

  function emptyHint() {
    return `
      <div class="gs-empty">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
        </svg>
        <p>Gõ để tìm kiếm...</p>
        <p style="font-size:11px; margin-top:6px; opacity:0.7">↑↓ để chọn · Enter để mở · ESC để đóng</p>
      </div>
    `;
  }

  /* ---------- SEARCH ---------- */
  async function runSearch(q) {
    const query = q.trim();
    if (!query) {
      results.innerHTML = emptyHint();
      items = [];
      return;
    }

    results.innerHTML = `<div class="gs-empty">Đang tìm...</div>`;

    const like = `%${query.replace(/[%_]/g, '')}%`;
    const tasks = [
      supabase.from('notes').select('id,title,content,tags,updated_at')
        .or(`title.ilike.${like},content.ilike.${like},tags.ilike.${like}`).limit(5),
      supabase.from('watchlist').select('id,title,type,status,current_ep,total_ep')
        .or(`title.ilike.${like},notes.ilike.${like}`).limit(5),
      supabase.from('projects').select('id,title,desc,tags')
        .or(`title.ilike.${like},desc.ilike.${like},tags.ilike.${like}`).limit(5),
      supabase.from('tasks').select('id,title,desc,status,tags')
        .or(`title.ilike.${like},desc.ilike.${like},tags.ilike.${like}`).limit(5),
    ];

    const [notesRes, watchRes, projRes] = await Promise.all(tasks);

    const grouped = [];

    if (notesRes.data?.length) {
      grouped.push({
        title: 'Ghi chú',
        icon: 'sticky-note',
        items: notesRes.data.map(n => ({
          title: n.title || (n.content || '').slice(0, 60),
          sub: (n.content || '').slice(0, 100),
          url: 'notes.html',
          icon: 'sticky-note',
        })),
      });
    }

    if (watchRes.data?.length) {
      grouped.push({
        title: 'Watchlist',
        icon: 'tv',
        items: watchRes.data.map(w => ({
          title: w.title,
          sub: `${w.type || 'anime'} · ${w.current_ep || 0}/${w.total_ep || '?'} tập · ${w.status}`,
          url: 'watch.html',
          icon: 'tv',
        })),
      });
    }

    if (projRes.data?.length) {
      grouped.push({
        title: 'Dự án',
        icon: 'layout-grid',
        items: projRes.data.map(p => ({
          title: p.title,
          sub: (p.desc || '').slice(0, 100),
          url: 'index.html#projects',
          icon: 'layout-grid',
        })),
      });
    }

    if (taskRes.data?.length) {
      grouped.push({
        title: 'Tasks',
        icon: 'list-checks',
        items: taskRes.data.map(t => ({
          title: t.title,
          sub: `${t.status} · ${t.desc ? t.desc.slice(0, 60) : 'không mô tả'}`,
          url: 'tasks.html',
          icon: 'list-checks',
        })),
      });
    }

    // Flatten thành mảng để keyboard nav
    items = [];
    grouped.forEach(g => g.items.forEach(i => items.push(i)));

    if (!items.length) {
      results.innerHTML = `
        <div class="gs-empty">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
          </svg>
          <p>Không tìm thấy kết quả cho "${escapeHtml(query)}"</p>
        </div>`;
      selectedIdx = -1;
      return;
    }

    // Render grouped
    let idx = 0;
    const html = grouped.map(g => {
      const groupHtml = g.items.map(i => {
        const currentIdx = idx++;
        return `
          <div class="gs-item" data-idx="${currentIdx}" data-url="${i.url}">
            <div class="gs-item-icon"><i data-lucide="${i.icon}"></i></div>
            <div class="gs-item-body">
              <div class="gs-item-title">${escapeHtml(i.title || '')}</div>
              ${i.sub ? `<div class="gs-item-sub">${escapeHtml(i.sub)}</div>` : ''}
            </div>
          </div>
        `;
      }).join('');
      return `<div class="gs-group-title">${g.title}</div>${groupHtml}`;
    }).join('');

    results.innerHTML = html;

    if (window.lucide) lucide.createIcons();
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------- KEYBOARD NAV ---------- */
  function setSelected(i) {
    const nodes = results.querySelectorAll('.gs-item');
    nodes.forEach(n => n.classList.remove('selected'));
    if (i < 0 || i >= nodes.length) { selectedIdx = -1; return; }
    nodes[i].classList.add('selected');
    nodes[i].scrollIntoView({ block: 'nearest' });
    selectedIdx = i;
  }

  function navigateSelected() {
    if (selectedIdx < 0 || !items[selectedIdx]) return;
    window.location.href = items[selectedIdx].url;
  }

  /* ---------- EVENTS ---------- */
  function attachEvents() {
    // Trigger button
    document.getElementById('gsTrigger')?.addEventListener('click', open);

    // Ctrl+K / Cmd+K
    document.addEventListener('keydown', (e) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        overlay.classList.contains('active') ? close() : open();
        return;
      }
      if (!overlay.classList.contains('active')) return;

      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected(Math.min(selectedIdx + 1, items.length - 1));
      }
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected(Math.max(selectedIdx - 1, 0));
      }
      else if (e.key === 'Enter') {
        e.preventDefault();
        navigateSelected();
      }
    });

    // Input debounce
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => runSearch(input.value), 220);
    });

    // Click vào kết quả
    results.addEventListener('click', (e) => {
      const item = e.target.closest('.gs-item');
      if (!item) return;
      window.location.href = item.dataset.url;
    });

    // Click overlay (ngoài panel) để đóng
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  }

  /* ---------- INIT ---------- */
  function init() {
    buildUI();
    attachEvents();
    if (window.lucide) lucide.createIcons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();