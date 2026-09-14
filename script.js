/* ============================================================
   DEFAULT DATA
   ============================================================ */
const defaultData = {
  name: "Ngô Đức Mạnh",
  headline: "IT Student at UMT & Software Developer",
  status: "Sẵn sàng đón nhận cơ hội mới",
  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
  github: "https://github.com/ngoducmanh-nrd",
  projects: [
    {
      id: "1",
      title: "FlowDrop",
      desc: "Công cụ chia sẻ tệp đa nền tảng nhanh chóng, an toàn và bảo mật.",
      tags: ["C++", "Qt"],
      liveUrl: "",
      repoUrl: "https://github.com/ngoducmanh-nrd/flowdrop"
    },
    {
      id: "2",
      title: "Clipboard Manager",
      desc: "Ứng dụng desktop cho hệ điều hành Windows giúp quản lý lịch sử clipboard hiệu quả.",
      tags: ["Electron", "JavaScript"],
      liveUrl: "",
      repoUrl: "https://github.com/ngoducmanh-nrd/clipboard-manager"
    },
    {
      id: "3",
      title: "Door Invoice App",
      desc: "Web app hỗ trợ số hóa quy trình quản lý hóa đơn cho doanh nghiệp vừa và nhỏ.",
      tags: ["Web", "Fullstack"],
      liveUrl: "https://example.com/invoice",
      repoUrl: ""
    }
  ]
};

/* ============================================================
   HELPERS
   ============================================================ */
const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

const safeUrl = (u) => {
  if (!u) return '';
  try {
    const url = new URL(u, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.href;
  } catch { return ''; }
};

/* ============================================================
   STATE
   ============================================================ */
let state;
try {
  const stored = JSON.parse(localStorage.getItem('dark_portfolio_data') || '{}');
  state = { ...defaultData, ...stored, projects: stored.projects || defaultData.projects };
} catch {
  state = structuredClone(defaultData);
}

/* ============================================================
   SAVE + PUSH
   ============================================================ */
async function saveState() {
  localStorage.setItem('dark_portfolio_data', JSON.stringify(state));
  renderUI();

  if (window.__supabaseBridge?.isLoggedIn?.()) {
    try {
      await window.__supabaseBridge.pushToSupabase(state);
    } catch (e) {
      console.error('Supabase push failed:', e);
      showToast('Lưu local OK, nhưng đồng bộ Supabase lỗi!');
    }
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  if (!toast || !toastMsg) { console.log('[Toast]', msg); return; }
  toastMsg.textContent = msg;
  toast.classList.remove('translate-y-20', 'opacity-0');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 2600);
}

/* ============================================================
   RENDER UI
   ============================================================ */
function renderUI() {
  document.getElementById('navName').textContent = state.name;
  document.getElementById('heroName').textContent = state.name;
  document.getElementById('heroHeadline').textContent = state.headline;
  document.getElementById('heroStatusText').textContent = state.status;
  document.getElementById('avatarImage').src = state.avatar;
  document.getElementById('heroGithub').href = state.github;
  const sidebarGh = document.getElementById('sidebarGithub');
  if (sidebarGh) sidebarGh.href = state.github;

  document.getElementById('inputName').value = state.name;
  document.getElementById('inputStatus').value = state.status;
  document.getElementById('inputHeadline').value = state.headline;
  document.getElementById('inputAvatar').value = state.avatar;
  document.getElementById('inputGithub').value = state.github;

  const container = document.getElementById('projectsContainer');
  container.innerHTML = '';

  if (!state.projects.length) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-500 glass-card rounded-3xl border-dashed border-white/20">
        <i data-lucide="ghost" class="w-10 h-10 mx-auto mb-3 opacity-50"></i>
        <p class="text-sm">Chưa có dự án nào.</p>
      </div>`;
  } else {
    state.projects.forEach((proj, idx) => {
      const delayClass = `delay-${(idx % 4 + 1) * 100}`;

      const tagsHtml = (proj.tags || []).map((tag) =>
        `<span class="px-2.5 py-1 rounded-md bg-white/5 text-slate-300 text-[11px] font-medium border border-white/10 shadow-sm">${escapeHtml(tag)}</span>`
      ).join('');

      const live = safeUrl(proj.liveUrl);
      const repo = safeUrl(proj.repoUrl);

      const liveHtml = live
        ? `<a href="${live}" target="_blank" rel="noopener" class="spring-btn p-2 rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20" title="Live Demo"><i data-lucide="external-link" class="w-4 h-4"></i></a>`
        : '';
      const repoHtml = repo
        ? `<a href="${repo}" target="_blank" rel="noopener" class="spring-btn p-2 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10" title="Mã nguồn"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18.92-.26 1.9-.39 2.88-.39.98 0 1.96.13 2.88.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.66.8.55C20.21 21.38 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"/></svg></a>`
        : '';

      const lowerTitle = (proj.title || '').toLowerCase();
      let iconName = 'code-2';
      if (lowerTitle.includes('drop') || lowerTitle.includes('file')) iconName = 'file-box';
      if (lowerTitle.includes('clipboard')) iconName = 'clipboard-list';
      if (lowerTitle.includes('invoice')) iconName = 'receipt';

      const card = document.createElement('div');
      card.className = `glass-card rounded-[24px] p-6 sm:p-8 flex flex-col justify-between animate-spring ${delayClass}`;
      card.innerHTML = `
        <div class="space-y-5">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-cyan-400 shadow-inner">
            <i data-lucide="${iconName}" class="w-6 h-6 stroke-[1.5]"></i>
          </div>
          <div>
            <h3 class="font-bold text-lg text-white">${escapeHtml(proj.title)}</h3>
            <p class="text-sm text-slate-400 mt-2 leading-relaxed">${escapeHtml(proj.desc)}</p>
          </div>
          <div class="flex flex-wrap gap-2 pt-1">${tagsHtml}</div>
        </div>

        <div class="flex items-center justify-between pt-6 mt-6 border-t border-white/5">
          <div class="flex gap-2">${liveHtml}${repoHtml}</div>
          <button type="button" data-remove-project="${escapeHtml(proj.id)}"
                  class="spring-btn p-2 text-slate-500 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-colors"
                  title="Xóa">
            <i data-lucide="trash" class="w-4 h-4"></i>
          </button>
        </div>`;
      container.appendChild(card);
    });
  }

  if (window.lucide) lucide.createIcons();
}

/* ============================================================
   THEME SWITCHER
   ============================================================ */
function initTheme() {
  const saved = localStorage.getItem('portfolio_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);

  const inputs = document.querySelectorAll('input[name="theme"]');
  inputs.forEach((inp) => {
    if (inp.value === saved) inp.checked = true;
    inp.addEventListener('change', (e) => {
      if (!e.target.checked) return;
      const theme = e.target.value;
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('portfolio_theme', theme);
    });
  });
}

/* ============================================================
   BOOTSTRAP
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  renderUI();

  /* ---------- Modal ---------- */
  const modal = document.getElementById('editorModal');
  const modalContent = document.getElementById('modalContent');

  const openModal = () => {
    modal.classList.remove('opacity-0', 'pointer-events-none');
    requestAnimationFrame(() => modalContent.classList.remove('scale-95'));
  };
  const closeModal = () => {
    modalContent.classList.add('scale-95');
    setTimeout(() => modal.classList.add('opacity-0', 'pointer-events-none'), 300);
  };

  document.getElementById('openEditorBtn').addEventListener('click', () => {
    closeSidebar();
    openModal();
  });
  document.getElementById('closeEditorBtn').addEventListener('click', closeModal);
  document.getElementById('cancelEditorBtn').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  /* ---------- Sidebar ---------- */
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const sidebarToggle = document.getElementById('sidebarToggle');

  const openSidebar = () => {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('active');
    sidebarToggle.classList.add('active');
    sidebarToggle.setAttribute('aria-expanded', 'true');
  };

  const closeSidebar = () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
    sidebarToggle.classList.remove('active');
    sidebarToggle.setAttribute('aria-expanded', 'false');
  };

  const toggleSidebar = () => {
    if (sidebar.classList.contains('open')) closeSidebar();
    else openSidebar();
  };

  sidebarToggle.addEventListener('click', toggleSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) closeSidebar();
  });

  document.addEventListener('click', (e) => {
    if (!sidebar.classList.contains('open')) return;
    if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) closeSidebar();
  });

  document.querySelectorAll('[data-close-sidebar]').forEach((el) => {
    el.addEventListener('click', () => setTimeout(closeSidebar, 150));
  });

  /* ---------- Delete project ---------- */
  document.getElementById('projectsContainer').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-remove-project]');
    if (!btn) return;
    const id = btn.getAttribute('data-remove-project');
    state.projects = state.projects.filter((p) => p.id !== id);
    await saveState();
    showToast('Đã xóa dự án!');
  });

  /* ---------- Save profile ---------- */
  document.getElementById('profileEditForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    state.name = document.getElementById('inputName').value.trim() || state.name;
    state.status = document.getElementById('inputStatus').value.trim() || state.status;
    state.headline = document.getElementById('inputHeadline').value.trim() || state.headline;
    state.avatar = document.getElementById('inputAvatar').value.trim() || state.avatar;
    state.github = document.getElementById('inputGithub').value.trim() || state.github;
    await saveState();
    closeModal();
    showToast('Cập nhật thành công!');
  });

  /* ---------- Add project ---------- */
  document.getElementById('addNewProjectBtn').addEventListener('click', async () => {
    const title = document.getElementById('newProjTitle').value.trim();
    const tags = document.getElementById('newProjTags').value.trim();
    const desc = document.getElementById('newProjDesc').value.trim();
    const live = document.getElementById('newProjLive').value.trim();
    const repo = document.getElementById('newProjRepo').value.trim();

    if (!title || !desc) {
      showToast('Vui lòng nhập Tên và Mô tả dự án.');
      return;
    }

    const tagsArray = tags
      ? tags.split(',').map((t) => t.trim()).filter(Boolean)
      : ['Code'];

    state.projects.unshift({
      id: Date.now().toString(),
      title, desc,
      liveUrl: live,
      repoUrl: repo,
      tags: tagsArray
    });
    await saveState();

    ['newProjTitle', 'newProjTags', 'newProjDesc', 'newProjLive', 'newProjRepo']
      .forEach((id) => { document.getElementById(id).value = ''; });

    showToast('Đã thêm dự án!');
  });
});

/* ============================================================
   BRIDGE cho auth.js
   ============================================================ */
window.portfolio = {
  getState: () => state,
  setState: (s) => { state = s; },
  renderUI,
  saveState,
  showToast
};