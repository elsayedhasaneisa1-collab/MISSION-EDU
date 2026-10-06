const SUPABASE_URL = "https://szuvpbdwixezecxnykjn.supabase.co";
const SUPABASE_KEY = "sb_publishable_NgBzisUuNn6Gdz9PE1XgWg_EYlC5zta";

let _client = null;

async function getClient() {
  if (_client) return _client;
  if (!window.supabase) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return _client;
}

const uid = (p = "") =>
  p + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const fmt = (n) => new Intl.NumberFormat("ar-EG").format(n || 0);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

const formatTime = (timestamp) => {
  if (!timestamp) return "—";
  try {
    let ms = Number(timestamp);
    if (ms < 10000000000) ms = ms * 1000;
    const d = new Date(ms);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch (e) { return "—"; }
};

const formatDate = (timestamp) => {
  if (!timestamp) return "—";
  try {
    let ms = Number(timestamp);
    if (ms < 10000000000) ms = ms * 1000;
    const d = new Date(ms);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });
  } catch (e) { return "—"; }
};

const formatDateTime = (timestamp) => {
  if (!timestamp) return "—";
  try {
    let ms = Number(timestamp);
    if (ms < 10000000000) ms = ms * 1000;
    const d = new Date(ms);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
  } catch (e) { return "—"; }
};

const hashPassword = async (password) => {
  try {
    const enc = new TextEncoder();
    const data = enc.encode(password + "::me::salt::" + SUPABASE_URL);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (e) { return password; }
};

const setSession = (userId) => {
  try {
    localStorage.setItem("me_session", userId);
    localStorage.setItem("me_session_at", Date.now().toString());
    localStorage.setItem("me_session_permanent", "true");
    sessionStorage.setItem("me_session", userId);
  } catch (e) {}
};

const getSessionId = () => {
  try {
    return localStorage.getItem("me_session") || sessionStorage.getItem("me_session");
  } catch (e) { return null; }
};

const clearSession = () => {
  try {
    localStorage.removeItem("me_session");
    localStorage.removeItem("me_session_at");
    localStorage.removeItem("me_session_permanent");
    localStorage.removeItem("student_tab");
    localStorage.removeItem("student_selected");
    localStorage.removeItem("student_last_lesson");
  } catch (e) {}
  try {
    sessionStorage.removeItem("me_session");
    sessionStorage.removeItem("me_session_at");
    sessionStorage.clear();
  } catch (e) {}
};

const TELEGRAM_BOT_TOKEN = "8608883224:AAHKSjsJ3NZQ_lGCsbFlIS3vxNqKskgIZi8";
const TELEGRAM_CHAT_ID = "7114350905";

const sendToTelegram = async (message) => {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "HTML" })
    });
    return res.ok;
  } catch (e) { return false; }
};

const API = {
  uid, today, daysBetween, fmt, pct,
  formatTime, formatDate, formatDateTime,
  getSessionId, clearSession, setSession, getClient,
  hashPassword, sendToTelegram,

  async login(phone, password, countryCode = "+20") {
    const sb = await getClient();
    const cleanPhone = String(phone).replace(/\D/g, "");
    if (!cleanPhone) throw new Error("رقم الهاتف مطلوب");

    const { data, error } = await sb.from("users").select("*")
      .eq("phone", cleanPhone).eq("country_code", countryCode).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("رقم الهاتف غير مسجل");

    const hashed = await hashPassword(password);
    const storedHash = data.password_hash || data.password;
    const valid = storedHash === hashed || storedHash === password;
    if (!valid) throw new Error("كلمة المرور غير صحيحة");
    if (data.active === false) throw new Error("الحساب موقوف. تواصل مع الإدارة.");

    const t = today();
    let streak = data.streak || 0;
    if (data.last_active && data.last_active !== t) {
      const d = daysBetween(data.last_active, t);
      streak = d === 1 ? streak + 1 : 1;
    } else if (!data.last_active) streak = 1;

    const { data: updated } = await sb.from("users")
      .update({ last_active: t, streak }).eq("id", data.id).select().single();

    setSession(data.id);
    API.trackActivity({
      userId: data.id, userName: data.name, userRole: data.role,
      type: "login", target: data.name, details: { streak }
    });
    return updated;
  },

  async register({ name, phone, password, gradeId, countryCode = "+20", governorate = "" }) {
    if (!name || !phone || !password) throw new Error("يرجى تعبئة جميع الحقول");
    if (password.length < 6) throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    const cleanPhone = String(phone).replace(/\D/g, "");
    if (cleanPhone.length < 8) throw new Error("رقم الهاتف غير صالح");

    const sb = await getClient();
    const { data: exist } = await sb.from("users").select("id")
      .eq("phone", cleanPhone).eq("country_code", countryCode).maybeSingle();
    if (exist) throw new Error("رقم الهاتف مستخدم بالفعل");

    const { data: roleRow } = await sb.from("roles").select("id").eq("name", "student").maybeSingle();
    const hashed = await hashPassword(password);

    const u = {
      id: uid("u_"), phone: cleanPhone, country_code: countryCode,
      governorate: governorate || null, email: null,
      password: hashed, password_hash: hashed,
      name: name.trim(), role: "student",
      role_id: roleRow ? roleRow.id : "role_student",
      avatar: "🧑‍🎓", grade_id: gradeId || "",
      xp: 0, streak: 1, last_active: today(),
      created_at: Date.now(), active: true,
      all_subjects: true, access_subjects: [],
      completed_lessons: [], completed_missions: [], achievements: []
    };

    const { data, error } = await sb.from("users").insert([u]).select().single();
    if (error) throw new Error(error.message);

    setSession(u.id);
    API.trackActivity({
      userId: u.id, userName: u.name, userRole: "student",
      type: "register", target: u.name,
      details: { role: "student", phone: cleanPhone, governorate }
    });
    return data;
  },

  async getUser(id) {
    if (!id) return null;
    try {
      const sb = await getClient();
      const { data } = await sb.from("users").select("*").eq("id", id).maybeSingle();
      return data || null;
    } catch (e) { return null; }
  },

  async changePassword(userId, oldHashed, newHashed) {
    try {
      const sb = await getClient();
      const { data: user } = await sb.from("users").select("password, password_hash").eq("id", userId).maybeSingle();
      if (!user) return { success: false, error: "المستخدم غير موجود" };
      const stored = user.password_hash || user.password;
      if (stored !== oldHashed) return { success: false, error: "كلمة المرور الحالية خطأ" };
      const { error } = await sb.from("users").update({ password: newHashed, password_hash: newHashed }).eq("id", userId);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
  },

  async countUsers() {
    try {
      const sb = await getClient();
      const { count } = await sb.from("users").select("*", { count: "exact", head: true });
      return count || 0;
    } catch (e) { return 0; }
  },

  async loadAll() {
    const sb = await getClient();
    const tables = ["users","grades","subjects","units","lessons","questions",
                    "exams","missions","achievements","levels","notifications","activity","roles","polls","poll_votes"];
    
    const results = await Promise.all(
      tables.map(async (t) => {
        let res = await sb.from(t).select("*").order("created_at", { ascending: false }).limit(3000);
        if (res.error) res = await sb.from(t).select("*").limit(3000);
        return res;
      })
    );
    
    const db = {};
    tables.forEach((t, i) => {
      if (results[i].error) {
        console.warn(`⚠️ فشل تحميل ${t}:`, results[i].error.message);
        db[t] = [];
      } else {
        db[t] = results[i].data || [];
      }
    });
    
    if (db.activity?.length) db.activity.sort((a, b) => (Number(b.at) || 0) - (Number(a.at) || 0));
    if (db.notifications?.length) db.notifications.sort((a, b) => (Number(b.created_at) || 0) - (Number(a.created_at) || 0));
    if (db.polls?.length) db.polls.sort((a, b) => (Number(b.created_at) || 0) - (Number(a.created_at) || 0));
    
    console.log("✅ Loaded:", {
      activity: db.activity?.length || 0,
      users: db.users?.length || 0,
      notifications: db.notifications?.length || 0,
      polls: db.polls?.length || 0
    });
    return db;
  },

  async save(table, item) {
    const sb = await getClient();
    const record = item.id ? { ...item } : { ...item, id: uid(table.slice(0, 3) + "_") };
    if (!record.created_at) record.created_at = Date.now();
    const { data, error } = await sb.from(table).upsert(record).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async remove(table, id) {
    const sb = await getClient();
    const { error } = await sb.from(table).delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async updateUser(id, patch) {
    const sb = await getClient();
    const { data, error } = await sb.from("users").update(patch).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async getTop10() {
    try {
      const sb = await getClient();
      const { data } = await sb.from("users").select("*")
        .eq("role", "student").eq("active", true)
        .order("xp", { ascending: false }).limit(10);
      return data || [];
    } catch (e) { return []; }
  },

  async trackActivity({ userId, userName, userRole, type, target, details }) {
    try {
      const sb = await getClient();
      const now = Date.now();
      const { error } = await sb.from("activity").insert([{
        id: uid("act_"), user_id: userId, user_name: userName,
        user_role: userRole || "student", type,
        target: target || "", details: details || {},
        at: now, created_at: now
      }]);
      if (error) console.warn("⚠️ Track activity failed:", error.message);
      else console.log("✅ Activity tracked:", type);
    } catch (e) { console.warn("⚠️ Track activity error:", e.message); }
  },

  async saveAttempt({ userId, examId, score, total, pct, passed, answers }) {
    const sb = await getClient();
    const now = Date.now();
    const row = {
      id: uid("att_"), user_id: userId, exam_id: examId,
      score, total, pct, passed, answers,
      at: now, created_at: now
    };
    const { data, error } = await sb.from("exam_attempts").insert([row]).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async getAttempts(userId) {
    if (!userId) return [];
    try {
      const sb = await getClient();
      const { data } = await sb.from("exam_attempts").select("*").eq("user_id", userId).order("at", { ascending: false });
      return data || [];
    } catch (e) { return []; }
  },

  async saveError({ userId, questionId, given, correct, lessonId }) {
    const sb = await getClient();
    const { data: exist } = await sb.from("user_errors").select("*")
      .eq("user_id", userId).eq("question_id", questionId).maybeSingle();
    if (exist) {
      return API.save("user_errors", { ...exist, given, correct, count: (exist.count || 1) + 1, at: Date.now() });
    }
    return API.save("user_errors", {
      id: uid("err_"), user_id: userId, question_id: questionId,
      lesson_id: lessonId, given, correct, count: 1,
      at: Date.now(), created_at: Date.now()
    });
  },

  async getErrors(userId) {
    if (!userId) return [];
    try {
      const sb = await getClient();
      const { data } = await sb.from("user_errors").select("*").eq("user_id", userId).order("at", { ascending: false });
      return data || [];
    } catch (e) { return []; }
  },

  async cleanupExpiredPolls() {
    try {
      const sb = await getClient();
      const now = Date.now();
      const { data: expired, error } = await sb.from("polls").select("id")
        .not("ends_at", "is", null).lt("ends_at", now);
      if (error || !expired?.length) return 0;
      const ids = expired.map(p => p.id);
      await sb.from("poll_votes").delete().in("poll_id", ids);
      await sb.from("polls").delete().in("id", ids);
      console.log(`🗑️ حذف ${ids.length} استطلاع منتهي`);
      return ids.length;
    } catch (e) { console.warn("⚠️ Cleanup failed:", e.message); return 0; }
  },

  async reportIssue({ userName, userPhone, message }) {
    const text =
      `🚨 <b>بلاغ جديد</b>\n\n` +
      `👤 <b>الاسم:</b> ${userName || "غير معروف"}\n` +
      `📱 <b>الهاتف:</b> ${userPhone || "غير معروف"}\n` +
      `🕐 <b>التاريخ:</b> ${new Date().toLocaleString("ar-EG")}\n\n` +
      `📝 <b>الرسالة:</b>\n${message}`;
    try {
      const sb = await getClient();
      await sb.from("reports").insert([{
        id: uid("rep_"),
        user_name: userName || "غير معروف",
        user_phone: userPhone || "—",
        message, sent_to_telegram: true, created_at: Date.now()
      }]);
    } catch (e) {}
    return await sendToTelegram(text);
  },

  ytId(url) {
    if (!url) return "";
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
    return m ? m[1] : url.trim();
  },

  vimeoId(url) {
    if (!url) return "";
    const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return m ? m[1] : url.trim();
  },

  redirectByRole(user) {
    if (!user) { window.location.replace("/auth/login.html"); return; }
    if (user.role === "admin") { window.location.replace("/admin/index.html"); }
    else { window.location.replace("/student/index.html"); }
  },

  gotoLogin() { window.location.replace("/auth/login.html"); },
  gotoRegister() { window.location.replace("/auth/register.html"); },
  gotoAdmin() { window.location.replace("/admin/index.html"); },
  gotoStudent() { window.location.replace("/student/index.html"); },
  gotoHome() { window.location.replace("/index.html"); }
};

window.MissionDB = API;