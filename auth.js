// auth.js — chỉ chạy trên index.html
import { supabase } from "./supabaseConfig.js";

/* ============================================================
   AUTH UI
   ============================================================ */
function updateAuthUI(session) {
  window.__currentSession = session;
  const loggedIn = !!session?.user;
  document.getElementById('loginBtn')?.classList.toggle('hidden', loggedIn);
  document.getElementById('logoutBtn')?.classList.toggle('hidden', !loggedIn);
  document.getElementById('openEditorBtn')?.classList.toggle('hidden', !loggedIn);
}

/* ============================================================
   PULL từ Supabase
   ============================================================ */
async function pullFromSupabase() {
  if (!window.portfolio) return;

  const { data: profile, error: profErr } = await supabase
    .from('profile').select('*').limit(1).maybeSingle();

  if (profErr) {
    console.warn('Profile fetch error:', profErr);
  }

  const { data: rows, error: projErr } = await supabase.from('projects').select('*');

  if (projErr) {
    console.warn('Projects fetch error:', projErr);
  }

  const s = window.portfolio.getState();

  if (profile) {
    s.name = profile.name ?? s.name;
    s.headline = profile.headline ?? s.headline;
    s.status = profile.status ?? s.status;
    s.avatar = profile.avatar ?? s.avatar;
    s.github = profile.github ?? s.github;
  }

  if (Array.isArray(rows)) {
    s.projects = rows.map((p) => ({
      id: String(p.id ?? Date.now()),
      title: p.title,
      desc: p.desc,
      tags: p.tags ? p.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      liveUrl: p.live_url ?? '',
      repoUrl: p.repo_url ?? ''
    }));
  }

  window.portfolio.renderUI();
}

/* ============================================================
   PUSH lên Supabase (dùng cách B — không cần singleton_key)
   ============================================================ */
window.__supabaseBridge = {
  isLoggedIn: () => !!window.__currentSession?.user,

  pushToSupabase: async (s) => {
    // ---- PROFILE: fetch 1 row, update nếu có, insert nếu chưa ----
    const payload = {
      name: s.name,
      headline: s.headline,
      status: s.status,
      avatar: s.avatar,
      github: s.github
    };

    const { data: existing, error: fetchErr } = await supabase
      .from('profile').select('id').limit(1).maybeSingle();

    if (fetchErr) throw fetchErr;

    if (existing?.id) {
      const { error: updErr } = await supabase
        .from('profile').update(payload).eq('id', existing.id);
      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await supabase.from('profile').insert(payload);
      if (insErr) throw insErr;
    }

    // ---- PROJECTS: xóa hết rồi insert lại ----
    const { error: delErr } = await supabase
      .from('projects')
      .delete()
      .neq('id', 0);

    if (delErr) throw delErr;

    if (Array.isArray(s.projects) && s.projects.length) {
      const rows = s.projects.map((p) => ({
        title: p.title,
        desc: p.desc,
        tags: Array.isArray(p.tags) ? p.tags.join(', ') : p.tags,
        live_url: p.liveUrl,
        repo_url: p.repoUrl
      }));
      const { error: insProjErr } = await supabase.from('projects').insert(rows);
      if (insProjErr) throw insProjErr;
    }
  }
};

/* ============================================================
   BOOTSTRAP
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    updateAuthUI(session);
    pullFromSupabase();
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    updateAuthUI(session);
    pullFromSupabase();
  });

  document.getElementById('loginBtn')?.addEventListener('click', () => {
    window.location.href = 'login.html';
  });

  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.portfolio?.showToast?.('Đã đăng xuất');
  });
});