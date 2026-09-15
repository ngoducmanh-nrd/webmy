import { supabase } from "../../supabaseConfig.js";

const form = document.getElementById("loginForm");
const toast = document.getElementById("loginToast");
const submitBtn = document.getElementById("submitBtn");

function showMsg(msg, isError = false) {
  toast.textContent = msg;
  toast.className = "text-sm text-center min-h-[20px] " + (isError ? "text-red-400" : "text-cyan-400");
}

// Nếu đã đăng nhập rồi thì về trang chủ luôn
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) window.location.href = "../index.html";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    showMsg("Vui lòng nhập đầy đủ email và mật khẩu.", true);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.classList.add("opacity-50", "cursor-not-allowed");
  showMsg("Đang đăng nhập...");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    showMsg("Lỗi: " + error.message, true);
    submitBtn.disabled = false;
    submitBtn.classList.remove("opacity-50", "cursor-not-allowed");
  } else if (data?.session) {
    showMsg("Đăng nhập thành công! Đang chuyển hướng...");
    window.location.href = "../index.html";
  }
});