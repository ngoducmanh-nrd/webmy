/* ============================================================
   DEFAULT DATA
   ============================================================ */
import { supabase } from "./supabaseConfig.js";
const defaultData = {
  name: "Ngô Đức Mạnh",
  headline: "IT Student at UMT & Software Developer",
  status: "Sẵn sàng đón nhận cơ hội mới",
  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
  github: "https://github.com/manhnd",
  projects: [
    {
      id: "1",
      title: "FlowDrop",
      desc: "Công cụ chia sẻ tệp đa nền tảng nhanh chóng, an toàn và bảo mật.",
      tags: ["C++", "Qt"],
      liveUrl: "",
      repoUrl: "https://github.com/manhnd/flowdrop"
    },
    {
      id: "2",
      title: "Clipboard Manager",
      desc: "Ứng dụng desktop cho hệ điều hành Windows giúp quản lý lịch sử clipboard hiệu quả.",
      tags: ["Electron", "JavaScript"],
      liveUrl: "",
      repoUrl: "https://github.com/manhnd/clipboard-manager"
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
  String(s ?? "").replace(/[&<>\"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
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
   STATE (merge với default để tránh vỡ schema cũ)
   ============================================================ */
let state;
try {
  const stored = JSON.parse(localStorage.getItem('dark_portfolio_data') || '{}');
  state = { ...defaultData, ...stored, projects: stored.projects || defaultData.projects };
} catch {
  state = structuredClone(defaultData);
}

function saveState() {
  localStorage.setItem('dark_portfolio_data', JSON.stringify(state));
  renderUI();
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
   AUTH HELPERS
   ============================================================ */
function handleAuthChange(session) {
  const loggedIn = !!session?.user;
  document.getElementById('loginBtn')?.classList.toggle('hidden', loggedIn);
  document.getElementById('logoutBtn')?.classList.toggle('hidden', !loggedIn);
  document.getElementById('openEditorBtn')?.classList.toggle('hidden', !loggedIn);
  document.getElementById('addNewProjectBtn')?.classList.toggle('hidden', !loggedIn);
}

function closeLoginModal() {
  const modal = document.getElementById('loginModal');
  if (!modal) return;
  modal.classList.add('opacity-0', 'pointer-events-none');
  // If on login page, after closing modal navigate back to portfolio
  if (document.getElementById('loginForm')) {
    setTimeout(() => (window.location.href = 'index.html'), 300);
  }
}

/* ============================================================
   BOOTSTRAP
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  const isPortfolioPage = !!document.getElementById('heroName');

  /* ---------------- PORTFOLIO PAGE ---------------- */
  if (isPortfolioPage) {
    initTheme();
    renderUI();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase.from('profile').select('*').single();
        const { data: projRows } = await supabase.from('projects').select('*');
        if (profile) {
          state.name = profile.name ?? state.name;
          state.headline = profile.headline ?? state.headline;
          state.status = profile.status ?? state.status;
          state.avatar = profile.avatar ?? state.avatar;
          state.github = profile.github ?? state.github;
        }
        if (Array.isArray(projRows)) {
          state.projects = projRows.map(p => ({
            id: p.id ?? Date.now().toString(),
            title: p.title,
            desc: p.desc,
            tags: p.tags ? p.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            liveUrl: p.live_url ?? '',
            repoUrl: p.repo_url ?? '',
            imageUrl: p.image_url ?? ''
          }));
        }
        renderUI();
      }
    } catch (err) {
      console.warn('Supabase fetch failed:', err);
    }

    const modal = document.getElementById('editorModal');
    const modalContent = document.getElementById('modalContent');
    const openModal = () => {
      modal?.classList.remove('opacity-0', 'pointer-events-none');
      requestAnimationFrame(() => modalContent?.classList.remove('scale-95'));
    };
    const closeModal = () => {
      modalContent?.classList.add('scale-95');
      setTimeout(() => modal?.classList.add('opacity-0', 'pointer-events-none'), 300);
    };
    document.getElementById('openEditorBtn')?.addEventListener('click', () => {
      closeSidebar();
      openModal();
    });
    document.getElementById('closeEditorBtn')?.addEventListener('click', closeModal);
    document.getElementById('cancelEditorBtn')?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const openSidebar = () => {
      sidebar?.classList.add('open');
      sidebarOverlay?.classList.add('active');
      sidebarToggle?.classList.add('active');
      sidebarToggle?.setAttribute('aria-expanded', 'true');
    };
    const closeSidebar = () => {
      sidebar?.classList.remove('open');
      sidebarOverlay?.classList.remove('active');
      sidebarToggle?.classList.remove('active');
      sidebarToggle?.setAttribute('aria-expanded', 'false');
    };
    function toggleSidebar() { sidebar?.classList.contains('open') ? closeSidebar() : openSidebar(); }
    sidebarToggle?.addEventListener('click', toggleSidebar);
    sidebarOverlay?.addEventListener('click', closeSidebar);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sidebar?.classList.contains('open')) closeSidebar(); });
    document.addEventListener('click', (e) => { if (!sidebar?.classList.contains('open')) return; if (!sidebar?.contains(e.target) && !sidebarToggle?.contains(e.target)) closeSidebar(); });
    document.querySelectorAll('[data-close-sidebar]').forEach((el) => { el.addEventListener('click', () => setTimeout(closeSidebar, 150)); });

    document.getElementById('projectsContainer')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove-project]');
      if (!btn) return;
      const id = btn.getAttribute('data-remove-project');
      state.projects = state.projects.filter(p => p.id !== id);
      saveState();
      showToast('Đã xóa dự án!');
    });

    document.getElementById('profileEditForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      state.name = document.getElementById('inputName')?.value.trim() || state.name;
      state.status = document.getElementById('inputStatus')?.value.trim() || state.status;
      state.headline = document.getElementById('inputHeadline')?.value.trim() || state.headline;
      state.avatar = document.getElementById('inputAvatar')?.value.trim() || state.avatar;
      state.github = document.getElementById('inputGithub')?.value.trim() || state.github;
      saveState();
      closeModal();
      showToast('Cập nhật thành công!');
    });

    document.getElementById('addNewProjectBtn')?.addEventListener('click', () => {
      const title = document.getElementById('newProjTitle')?.value.trim();
      const tags = document.getElementById('newProjTags')?.value.trim();
      const desc = document.getElementById('newProjDesc')?.value.trim();
      const live = document.getElementById('newProjLive')?.value.trim();
      const repo = document.getElementById('newProjRepo')?.value.trim();
      if (!title || !desc) { showToast('Vui lòng nhập Tên và Mô tả dự án.'); return; }
      const tagsArray = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : ['Code'];
      state.projects.unshift({ id: Date.now().toString(), title, desc, liveUrl: live, repoUrl: repo, tags: tagsArray });
      saveState();
      ['newProjTitle','newProjTags','newProjDesc','newProjLive','newProjRepo'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      showToast('Đã thêm dự án!');
    });

    document.getElementById('resetDataBtn')?.addEventListener('click', () => {
      state = structuredClone(defaultData);
      localStorage.removeItem('dark_portfolio_data');
      saveState();
      closeModal();
      showToast('Đã khôi phục dữ liệu mặc định.');
    });
  }

  /* ---------------- AUTH (runs on both pages) ---------------- */
  supabase.auth.getSession().then(({ data: { session } }) => handleAuthChange(session));
  supabase.auth.onAuthStateChange((_event, session) => handleAuthChange(session));

  document.getElementById('loginBtn')?.addEventListener('click', () => { window.location.href = 'login.html'; });
  document.getElementById('logoutBtn')?.addEventListener('click', async () => { await supabase.auth.signOut(); showToast('Đã đăng xuất'); if (!isPortfolioPage) window.location.href = 'index.html'; });
  document.getElementById('closeLoginBtn')?.addEventListener('click', closeLoginModal);
  document.getElementById('loginForm')?.addEventListener('submit', async (e) => { e.preventDefault(); const email = document.getElementById('loginEmail')?.value.trim(); const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } }); if (error) showToast('Lỗi đăng nhập: ' + error.message); else showToast('Đã gửi Magic Link tới email'); });

  if (window.lucide) lucide.createIcons();
});