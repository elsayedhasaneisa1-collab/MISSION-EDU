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

const uid = (p = "") => p + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
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
    sessionStorage.removeItem("me_session");
    sessionStorage.removeItem("me_session_at");
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

const REPORTS_LIMIT = 3;
const DAILY_REWARDS = [10, 20, 30, 40, 50, 75, 150];

const API = {
  uid, today, daysBetween, fmt, pct,
  formatTime, formatDate, formatDateTime,
  getSessionId, clearSession, setSession, getClient,
  hashPassword, sendToTelegram,

  async login(phone, password, countryCode = "+20") {
    const sb = await getClient();
    const cleanPhone = String(phone).replace(/\D/g, "");
    if (!cleanPhone) throw new Error("رقم الهاتف مطلوب");

    const { data, error } = await sb.from("users").select("*").eq("phone", cleanPhone).eq("country_code", countryCode).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("رقم الهاتف غير مسجل");

    const hashed = await hashPassword(password);
    const storedHash = data.password_hash || data.password;
    const valid = storedHash === hashed || storedHash === password;
    if (!valid) throw new Error("كلمة المرور غير صحيحة");
    if (data.active === false) throw new Error("الحساب موقوف. تواصل مع الإدارة.");
    if (data.banned === true) throw new Error("⛔ حسابك محظور تلقائيًا بعد 3 بلاغات. تواصل مع الإدارة لفك الحظر.");

    const t = today();
    let streak = data.streak || 0;
    if (data.last_active && data.last_active !== t) {
      const d = daysBetween(data.last_active, t);
      streak = d === 1 ? streak + 1 : 1;
    } else if (!data.last_active) streak = 1;

    const { data: updated } = await sb.from("users").update({ last_active: t, streak }).eq("id", data.id).select().single();

    setSession(data.id);
    API.trackActivity({ userId: data.id, userName: data.name, userRole: data.role, type: "login", target: data.name, details: { streak } });

    return updated;
  },

  async register({ name, phone, password, gradeId, gender, countryCode = "+20", governorate = "" }) {
    if (!name || !phone || !password) throw new Error("يرجى تعبئة جميع الحقول");
    if (password.length < 6) throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    if (!gender || !["male", "female"].includes(gender)) throw new Error("يرجى اختيار النوع (ولد / بنت)");

    const cleanPhone = String(phone).replace(/\D/g, "");
    if (cleanPhone.length < 8) throw new Error("رقم الهاتف غير صالح");

    const sb = await getClient();
    const { data: exist } = await sb.from("users").select("id").eq("phone", cleanPhone).eq("country_code", countryCode).maybeSingle();
    if (exist) throw new Error("رقم الهاتف مستخدم بالفعل");

    const { data: roleRow } = await sb.from("roles").select("id").eq("name", "student").maybeSingle();
    const hashed = await hashPassword(password);

    const u = {
      id: uid("u_"), phone: cleanPhone, country_code: countryCode, governorate: governorate || null,
      email: null, password: hashed, password_hash: hashed, name: name.trim(),
      role: "student", role_id: roleRow ? roleRow.id : "role_student",
      avatar: gender === "female" ? "👩‍🎓" : "🧑‍🎓",
      gender: gender,
      grade_id: gradeId || "",
      xp: 0, streak: 1, last_active: today(),
      created_at: Date.now(), active: true,
      all_subjects: true, access_subjects: [], subscription: "free",
      completed_lessons: [], completed_missions: [], achievements: [],
      banned: false, reports_count: 0,
      study_partner_active: false, study_partner_id: null,
      school_name: null,
      theme: "dark",
      focus_mode: false,
      device_fingerprint: null
    };

    const { data, error } = await sb.from("users").insert([u]).select().single();
    if (error) throw new Error(error.message);

    setSession(u.id);
    API.trackActivity({ userId: u.id, userName: u.name, userRole: "student", type: "register", target: u.name, details: { role: "student", phone: cleanPhone, gender, governorate } });

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

  async countUsers() {
    try {
      const sb = await getClient();
      const { count } = await sb.from("users").select("*", { count: "exact", head: true });
      return count || 0;
    } catch (e) { return 0; }
  },

  async loadAll() {
    const sb = await getClient();
    const tables = ["users","grades","subjects","units","lessons","questions","exams","missions","achievements","levels","notifications","activity","roles","polls","poll_votes","settings","coupons","referrals","user_errors","certificates","reports","notes","exam_attempts"];

    const results = await Promise.all(
      tables.map(async (t) => {
        let res = await sb.from(t).select("*").order("created_at", { ascending: false }).limit(3000);
        if (res.error) { res = await sb.from(t).select("*").limit(3000); }
        return res;
      })
    );

    const db = {};
    tables.forEach((t, i) => {
      if (results[i].error) { db[t] = []; } else { db[t] = results[i].data || []; }
    });

    if (db.activity && db.activity.length > 0) { db.activity.sort((a, b) => (Number(b.at) || 0) - (Number(a.at) || 0)); }
    if (db.notifications && db.notifications.length > 0) { db.notifications.sort((a, b) => (Number(b.created_at) || 0) - (Number(a.created_at) || 0)); }
    if (db.polls && db.polls.length > 0) { db.polls.sort((a, b) => (Number(b.created_at) || 0) - (Number(a.created_at) || 0)); }

    return db;
  },

  async save(table, item) {
    const sb = await getClient();
    const record = { ...item };
    if (!record.id) record.id = uid(table.slice(0, 3) + "_");
    if (!record.created_at || record.created_at === null || record.created_at === undefined) {
      record.created_at = Date.now();
    }
    const { data, error } = await sb.from(table).upsert(record).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async remove(table, id) {
    const sb = await getClient();
    const { error } = await sb.from(table).delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async removeMany(table, ids) {
    const sb = await getClient();
    const { error } = await sb.from(table).delete().in("id", ids);
    if (error) throw new Error(error.message);
  },

  async deleteQuestion(qId) {
    const sb = await getClient();
    const { data: exams } = await sb.from("exams").select("id, question_ids");
    let examsUpdated = 0;
    for (const ex of (exams || [])) {
      const ids = ex.question_ids || [];
      if (ids.includes(qId)) {
        await sb.from("exams").update({ question_ids: ids.filter(x => x !== qId) }).eq("id", ex.id);
        examsUpdated++;
      }
    }
    await sb.from("questions").delete().eq("id", qId);
    return { examsUpdated };
  },

  async changePassword(userId, oldHash, newHash) {
    const sb = await getClient();
    const { data } = await sb.from("users").select("password,password_hash").eq("id", userId).maybeSingle();
    if (!data) return { success: false };
    const stored = data.password_hash || data.password;
    if (stored !== oldHash) return { success: false };
    const { error } = await sb.from("users").update({ password: newHash, password_hash: newHash }).eq("id", userId);
    if (error) throw new Error(error.message);
    return { success: true };
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
      const { data } = await sb.from("users").select("*").eq("role", "student").eq("active", true).order("xp", { ascending: false }).limit(10);
      return data || [];
    } catch (e) { return []; }
  },

  async trackActivity({ userId, userName, userRole, type, target, details }) {
    try {
      const sb = await getClient();
      const now = Date.now();
      await sb.from("activity").insert([{ id: uid("act_"), user_id: userId, user_name: userName, user_role: userRole || "student", type, target: target || "", details: details || {}, at: now, created_at: now }]);
    } catch (e) {}
  },

  async saveAttempt({ userId, examId, score, total, pct, passed, answers }) {
    const sb = await getClient();
    const now = Date.now();
    const row = { id: uid("att_"), user_id: userId, exam_id: examId, score, total, pct, passed, answers, at: now, created_at: now };
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
    const { data: exist } = await sb.from("user_errors").select("*").eq("user_id", userId).eq("question_id", questionId).maybeSingle();
    if (exist) { return API.save("user_errors", { ...exist, given, correct, count: (exist.count || 1) + 1, at: Date.now() }); }
    return API.save("user_errors", { id: uid("err_"), user_id: userId, question_id: questionId, lesson_id: lessonId, given, correct, count: 1, at: Date.now(), created_at: Date.now() });
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
      const { data: expired, error } = await sb.from("polls").select("id").not("ends_at", "is", null).lt("ends_at", now);
      if (error || !expired || expired.length === 0) return 0;
      const ids = expired.map(p => p.id);
      await sb.from("poll_votes").delete().in("poll_id", ids);
      await sb.from("polls").delete().in("id", ids);
      return ids.length;
    } catch (e) { return 0; }
  },

  async reportIssue({ userName, userPhone, message }) {
    const text = `🚨 <b>بلاغ جديد</b>\n\n👤 <b>الاسم:</b> ${userName || "غير معروف"}\n📱 <b>الهاتف:</b> ${userPhone || "غير معروف"}\n🕐 <b>التاريخ:</b> ${new Date().toLocaleString("ar-EG")}\n\n📝 <b>الرسالة:</b>\n${message}`;
    try {
      const sb = await getClient();
      await sb.from("reports").insert([{ id: uid("rep_"), user_name: userName || "غير معروف", user_phone: userPhone || "—", message, sent_to_telegram: true, created_at: Date.now() }]);
    } catch (e) {}
    return await sendToTelegram(text);
  },

  async getSettings() {
    try {
      const sb = await getClient();
      const { data } = await sb.from("settings").select("*").eq("id", "site").maybeSingle();
      if (data) return { about_title: data.about_title || "عن المنصة", about_text: data.about_text || "", social_links: Array.isArray(data.social_links) ? data.social_links : [] };
      return { about_title: "عن المنصة", about_text: "", social_links: [] };
    } catch (e) { return { about_title: "عن المنصة", about_text: "", social_links: [] }; }
  },

  async saveSettings(patch) {
    const sb = await getClient();
    const { data, error } = await sb.from("settings").upsert({ id: "site", about_title: patch.about_title || "عن المنصة", about_text: patch.about_text || "", social_links: patch.social_links || [], updated_at: Date.now() }).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async getUnreadNotifications(userId) {
    if (!userId) return [];
    try {
      const sb = await getClient();
      const { data } = await sb.from("notifications").select("*").or(`target.eq.all,target.eq.${userId}`).order("created_at", { ascending: false }).limit(20);
      return (data || []).filter(n => !(n.read_by || []).includes(userId));
    } catch (e) { return []; }
  },

  async reportUser({ reportedId, reportedName, reporterId, reporterName, reason, details }) {
    if (!reportedId || !reporterId) throw new Error("بيانات البلاغ ناقصة");
    if (reportedId === reporterId) throw new Error("مينفعش تبلغ عن نفسك");

    const sb = await getClient();
    const { data: existing } = await sb.from("user_reports").select("id").eq("reported_id", reportedId).eq("reporter_id", reporterId).maybeSingle();
    if (existing) throw new Error("سبق أن بلغت عن هذا المستخدم");

    const { error } = await sb.from("user_reports").insert([{ id: uid("urp_"), reported_id: reportedId, reporter_id: reporterId, reason, details: details || "", created_at: Date.now() }]);
    if (error) throw new Error(error.message);

    const { count } = await sb.from("user_reports").select("*", { count: "exact", head: true }).eq("reported_id", reportedId);
    const total = count || 1;
    const patch = { reports_count: total };
    let banned = false;
    if (total >= REPORTS_LIMIT) {
      patch.banned = true;
      patch.banned_at = Date.now();
      patch.ban_reason = `حظر تلقائي بعد ${total} بلاغات`;
      banned = true;
    }
    await sb.from("users").update(patch).eq("id", reportedId);

    API.trackActivity({ userId: reporterId, userName: reporterName || "", userRole: "student", type: "report_user", target: reportedName || "", details: { reported_id: reportedId, reason, total_reports: total, banned } });
    sendToTelegram(`🚨 <b>بلاغ جديد</b>\n👤 المُبلِّغ: ${reporterName || "—"}\n🎯 المُبلَّغ عنه: ${reportedName || "—"}\n📝 السبب: ${reason}\n📊 إجمالي بلاغاته: ${total}${banned ? "\n⛔ <b>تم حظره تلقائيًا</b>" : ""}`).catch(() => {});
    return { total, banned };
  },

  async isUserBanned(userId) {
    if (!userId) return false;
    const sb = await getClient();
    const { data } = await sb.from("users").select("banned").eq("id", userId).maybeSingle();
    return data?.banned === true;
  },

  async unbanUser(userId) {
    const sb = await getClient();
    await sb.from("users").update({ banned: false, ban_reason: null, banned_at: null, reports_count: 0 }).eq("id", userId);
    await sb.from("user_reports").delete().eq("reported_id", userId);
    return true;
  },

  async getUserReports(userId) {
    const sb = await getClient();
    const { data } = await sb.from("user_reports").select("*").eq("reported_id", userId).order("created_at", { ascending: false });
    return data || [];
  },

  async setStudyPartnerPrefs(userId, { active, subjectId, bio }) {
    const sb = await getClient();
    await sb.from("users").update({ study_partner_active: !!active, study_partner_subject_id: subjectId || null, study_partner_bio: bio || null }).eq("id", userId);
    return true;
  },

  async listStudyPartners({ excludeId, gradeId, subjectId }) {
    const sb = await getClient();
    let q = sb.from("users").select("id,name,avatar,gender,grade_id,governorate,study_partner_subject_id,study_partner_bio,xp").eq("role", "student").eq("active", true).eq("banned", false).eq("study_partner_active", true).neq("id", excludeId).is("study_partner_id", null).limit(100);
    if (gradeId) q = q.eq("grade_id", gradeId);
    if (subjectId) q = q.eq("study_partner_subject_id", subjectId);
    const { data } = await q;
    return data || [];
  },

  async sendPartnerRequest({ fromId, toId }) {
    const sb = await getClient();
    const { data: existing } = await sb.from("partner_requests").select("id").eq("from_id", fromId).eq("to_id", toId).eq("status", "pending").maybeSingle();
    if (existing) throw new Error("الطلب موجود بالفعل");
    const { data: reverse } = await sb.from("partner_requests").select("id").eq("from_id", toId).eq("to_id", fromId).eq("status", "pending").maybeSingle();
    if (reverse) throw new Error("هو بعتلك طلب بالفعل — روح تبويب الطلبات");
    const { error } = await sb.from("partner_requests").insert([{ id: uid("pr_"), from_id: fromId, to_id: toId, status: "pending", created_at: Date.now() }]);
    if (error) throw new Error(error.message);
    return true;
  },

  async getPartnerRequestsForMe(userId) {
    const sb = await getClient();
    const { data } = await sb.from("partner_requests").select("*").eq("to_id", userId).eq("status", "pending").order("created_at", { ascending: false });
    return data || [];
  },

  async getPartnerRequestSenders(userId) {
    const sb = await getClient();
    const { data: reqs } = await sb.from("partner_requests").select("*").eq("to_id", userId).eq("status", "pending").order("created_at", { ascending: false });
    if (!reqs || reqs.length === 0) return [];
    const ids = reqs.map(r => r.from_id);
    const { data: users } = await sb.from("users").select("id,name,avatar,gender,grade_id,governorate,xp").in("id", ids);
    const map = {};
    (users || []).forEach(u => map[u.id] = u);
    return reqs.map(r => ({ ...r, sender: map[r.from_id] || null }));
  },

  async respondPartnerRequest({ requestId, accept }) {
    const sb = await getClient();
    const { data: req } = await sb.from("partner_requests").select("*").eq("id", requestId).maybeSingle();
    if (!req) throw new Error("الطلب مش موجود");
    if (req.status !== "pending") throw new Error("تم الرد على الطلب بالفعل");
    const status = accept ? "accepted" : "rejected";
    await sb.from("partner_requests").update({ status, responded_at: Date.now() }).eq("id", requestId);
    if (accept) {
      await sb.from("users").update({ study_partner_id: req.to_id, study_partner_active: false }).eq("id", req.from_id);
      await sb.from("users").update({ study_partner_id: req.from_id, study_partner_active: false }).eq("id", req.to_id);
      await sb.from("partner_requests").update({ status: "rejected", responded_at: Date.now() }).eq("status", "pending").or(`from_id.eq.${req.from_id},to_id.eq.${req.from_id},from_id.eq.${req.to_id},to_id.eq.${req.to_id}`);
    }
    return { status };
  },

  async getMyPartner(userId) {
    const sb = await getClient();
    const { data: me } = await sb.from("users").select("study_partner_id").eq("id", userId).maybeSingle();
    if (!me?.study_partner_id) return null;
    const { data: partner } = await sb.from("users").select("id,name,avatar,gender,grade_id,governorate,phone,country_code,xp").eq("id", me.study_partner_id).maybeSingle();
    return partner || null;
  },

  async unlinkPartner(userId) {
    const sb = await getClient();
    const { data: me } = await sb.from("users").select("study_partner_id").eq("id", userId).maybeSingle();
    if (!me?.study_partner_id) return false;
    await sb.from("users").update({ study_partner_id: null }).eq("id", me.study_partner_id);
    await sb.from("users").update({ study_partner_id: null }).eq("id", userId);
    return true;
  },

  async getDailyRewardStatus(userId) {
    if (!userId) return { canClaim: false, currentDay: 1, claimedToday: false, history: [] };
    const sb = await getClient();
    const t = today();
    const { data: claims } = await sb.from("daily_rewards").select("*").eq("user_id", userId).order("claim_date", { ascending: false }).limit(30);
    const arr = claims || [];
    const claimedToday = arr.some(c => c.claim_date === t);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const lastClaim = arr[0];
    let currentDay = 1;
    if (lastClaim) {
      if (lastClaim.claim_date === t) currentDay = lastClaim.day_index;
      else if (lastClaim.claim_date === yesterday) currentDay = lastClaim.day_index >= 7 ? 1 : lastClaim.day_index + 1;
      else currentDay = 1;
    }
    return { canClaim: !claimedToday, currentDay, claimedToday, history: arr, rewards: DAILY_REWARDS };
  },

  async claimDailyReward(userId, userName) {
    const sb = await getClient();
    const t = today();
    const { data: existing } = await sb.from("daily_rewards").select("id").eq("user_id", userId).eq("claim_date", t).maybeSingle();
    if (existing) throw new Error("لقد استلمت مكافأة اليوم بالفعل ✅");
    const status = await API.getDailyRewardStatus(userId);
    const day = status.currentDay;
    const xp = DAILY_REWARDS[day - 1];
    const row = { id: uid("dr_"), user_id: userId, claim_date: t, day_index: day, xp, created_at: Date.now() };
    const { error } = await sb.from("daily_rewards").insert([row]);
    if (error) throw new Error(error.message);
    const { data: u } = await sb.from("users").select("xp").eq("id", userId).maybeSingle();
    await sb.from("users").update({ xp: (u?.xp || 0) + xp }).eq("id", userId);
    API.trackActivity({ userId, userName: userName || "", userRole: "student", type: "daily_reward", target: `اليوم ${day} — ${xp} XP`, details: { xp, day } });
    return { success: true, xp, day_index: day };
  },

  async startPracticeSession({ userId, subjectId, unitId, lessonId, count = 20 }) {
    const sb = await getClient();
    let q = sb.from("questions").select("id");
    if (lessonId) q = q.eq("lesson_id", lessonId);
    else if (unitId) q = q.eq("unit_id", unitId);
    else if (subjectId) q = q.eq("subject_id", subjectId);
    const { data, error } = await q.limit(200);
    if (error) throw new Error(error.message);
    const allIds = (data || []).map(x => x.id);
    if (allIds.length === 0) throw new Error("لا توجد أسئلة متاحة في هذا القسم");
    const shuffled = allIds.sort(() => Math.random() - 0.5).slice(0, Math.min(count, allIds.length));
    const sessionId = uid("prac_");
    const now = Date.now();
    const { error: insertErr } = await sb.from("practice_sessions").insert([{
      id: sessionId, user_id: userId, subject_id: subjectId || null,
      unit_id: unitId || null, lesson_id: lessonId || null,
      question_ids: shuffled, status: "in_progress",
      started_at: now, created_at: now
    }]);
    if (insertErr) throw new Error(insertErr.message);
    return { sessionId, questionIds: shuffled };
  },

  async submitPracticeAnswer({ sessionId, questionId, given, correct }) {
    const sb = await getClient();
    const { data: session } = await sb.from("practice_sessions").select("*").eq("id", sessionId).maybeSingle();
    if (!session) throw new Error("الجلسة غير موجودة");
    const answers = session.answers || {};
    answers[questionId] = given;
    const isCorrect = given === correct;
    const newScore = (session.score || 0) + (isCorrect ? 1 : 0);
    await sb.from("practice_sessions").update({
      answers, score: newScore,
      total: Math.max(session.total || 0, Object.keys(answers).length)
    }).eq("id", sessionId);
    return { isCorrect, newScore };
  },

  async completePracticeSession(sessionId, { total }) {
    const sb = await getClient();
    const { data: session } = await sb.from("practice_sessions").select("*").eq("id", sessionId).maybeSingle();
    if (!session) throw new Error("الجلسة غير موجودة");
    const score = session.score || 0;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const now = Date.now();
    await sb.from("practice_sessions").update({
      score, total, pct, status: "completed",
      completed_at: now
    }).eq("id", sessionId);
    return { score, total, pct };
  },

  async getPracticeHistory(userId, limit = 20) {
    const sb = await getClient();
    const { data } = await sb.from("practice_sessions")
      .select("*").eq("user_id", userId).eq("status", "completed")
      .order("completed_at", { ascending: false }).limit(limit);
    return data || [];
  },

  async listShopItems() {
    const sb = await getClient();
    const { data } = await sb.from("xp_shop_items")
      .select("*").eq("active", true).order("xp_cost", { ascending: true });
    return data || [];
  },

  async purchaseShopItem({ userId, itemId, userXp }) {
    const sb = await getClient();
    const { data: item } = await sb.from("xp_shop_items").select("*").eq("id", itemId).maybeSingle();
    if (!item) throw new Error("المنتج غير موجود");
    if (!item.active) throw new Error("المنتج غير متاح حاليًا");
    if (item.stock !== null && item.stock !== undefined && item.stock <= 0) throw new Error("المنتج نفد من المخزون");
    if (userXp < item.xp_cost) throw new Error("نقاط XP غير كافية");

    const { data: user } = await sb.from("users").select("xp").eq("id", userId).maybeSingle();
    const newXp = Math.max(0, (user?.xp || 0) - item.xp_cost);
    await sb.from("users").update({ xp: newXp }).eq("id", userId);

    const purchaseId = uid("pch_");
    const now = Date.now();
    const { error } = await sb.from("xp_purchases").insert([{
      id: purchaseId, user_id: userId, item_id: itemId,
      item_name: item.name, xp_spent: item.xp_cost,
      status: "completed", created_at: now
    }]);
    if (error) throw new Error(error.message);

    if (item.stock !== null && item.stock !== undefined && item.stock > 0) {
      await sb.from("xp_shop_items").update({ stock: item.stock - 1 }).eq("id", itemId);
    }

    if (item.type === "coupon" && item.coupon_code) {
      await sb.from("coupons").insert([{
        id: uid("cpn_"),
        code: item.coupon_code + "-" + purchaseId.slice(-4),
        discount: item.discount_value || 10,
        max_uses: 1, used_count: 0,
        active: true, created_at: now
      }]).catch(() => {});
    }

    API.trackActivity({
      userId, userName: "", userRole: "student",
      type: "shop_purchase", target: item.name,
      details: { item_id: itemId, xp_cost: item.xp_cost }
    });

    return { newXp, purchaseId, item };
  },

  async getMyPurchases(userId, limit = 20) {
    const sb = await getClient();
    const { data } = await sb.from("xp_purchases")
      .select("*").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(limit);
    return data || [];
  },

  async registerPushSubscription({ userId, subscription }) {
    const sb = await getClient();
    const { data: existing } = await sb.from("push_subscriptions")
      .select("id").eq("user_id", userId).eq("endpoint", subscription.endpoint).maybeSingle();
    if (existing) {
      await sb.from("push_subscriptions").update({
        subscription_json: subscription, updated_at: Date.now(), active: true
      }).eq("id", existing.id);
      return existing.id;
    }
    const id = uid("push_");
    const { error } = await sb.from("push_subscriptions").insert([{
      id, user_id: userId,
      endpoint: subscription.endpoint,
      subscription_json: subscription,
      active: true, created_at: Date.now(), updated_at: Date.now()
    }]);
    if (error) throw new Error(error.message);
    return id;
  },

  async getMyPushSubscriptions(userId) {
    const sb = await getClient();
    const { data } = await sb.from("push_subscriptions")
      .select("*").eq("user_id", userId).eq("active", true);
    return data || [];
  },

  async removePushSubscription(userId) {
    const sb = await getClient();
    await sb.from("push_subscriptions").update({ active: false }).eq("user_id", userId);
    return true;
  },

  async createFlashcard({ userId, lessonId, front, back, tags }) {
    const sb = await getClient();
    const now = Date.now();
    const card = {
      id: uid("fc_"), user_id: userId, lesson_id: lessonId || null,
      front, back, tags: tags || [],
      ease_factor: 2.5, interval_days: 0, repetitions: 0,
      next_review_at: now, created_at: now, updated_at: now
    };
    const { data, error } = await sb.from("flashcards").insert([card]).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async getFlashcards(userId, { dueOnly = false } = {}) {
    const sb = await getClient();
    let q = sb.from("flashcards").select("*").eq("user_id", userId);
    if (dueOnly) q = q.lte("next_review_at", Date.now());
    const { data } = await q.order("next_review_at", { ascending: true }).limit(500);
    return data || [];
  },

  async reviewFlashcard({ cardId, quality }) {
    const sb = await getClient();
    const { data: card } = await sb.from("flashcards").select("*").eq("id", cardId).maybeSingle();
    if (!card) throw new Error("البطاقة غير موجودة");

    let ef = card.ease_factor || 2.5;
    let interval = card.interval_days || 0;
    let reps = card.repetitions || 0;

    ef = Math.max(1.3, ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
    if (quality < 3) {
      reps = 0;
      interval = 1;
    } else {
      reps += 1;
      if (reps === 1) interval = 1;
      else if (reps === 2) interval = 6;
      else interval = Math.round(interval * ef);
    }
    const nextReviewAt = Date.now() + interval * 86400000;

    await sb.from("flashcards").update({
      ease_factor: ef, interval_days: interval, repetitions: reps,
      next_review_at: nextReviewAt, last_review_at: Date.now(), updated_at: Date.now()
    }).eq("id", cardId);

    return { next_review_at: nextReviewAt, interval_days: interval };
  },

  async deleteFlashcard(cardId) {
    const sb = await getClient();
    await sb.from("flashcards").delete().eq("id", cardId);
    return true;
  },

  async getStudentAnalytics(userId) {
    const sb = await getClient();
    const now = Date.now();
    const last30 = now - 30 * 86400000;
    const last7 = now - 7 * 86400000;

    const { data: attempts } = await sb.from("exam_attempts").select("*").eq("user_id", userId).gte("at", last30);
    const { data: practice } = await sb.from("practice_sessions").select("*").eq("user_id", userId).eq("status", "completed").gte("completed_at", last30);
    const { data: activity } = await sb.from("activity").select("*").eq("user_id", userId).gte("at", last30).limit(2000);
    const { data: errors } = await sb.from("user_errors").select("*").eq("user_id", userId).order("count", { ascending: false }).limit(10);

    const xpByDay = {};
    (activity || []).forEach(a => {
      if (a.type === "lesson_complete") {
        const d = new Date(a.at).toISOString().slice(0, 10);
        xpByDay[d] = (xpByDay[d] || 0) + ((a.details && a.details.xp) || 20);
      }
    });

    const weakLessons = {};
    (errors || []).forEach(e => {
      if (e.lesson_id) weakLessons[e.lesson_id] = (weakLessons[e.lesson_id] || 0) + (e.count || 1);
    });

    const avgExamPct = attempts && attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + (a.pct || 0), 0) / attempts.length) : 0;
    const avgPracticePct = practice && practice.length > 0 ? Math.round(practice.reduce((s, p) => s + (p.pct || 0), 0) / practice.length) : 0;

    const last7Activity = (activity || []).filter(a => a.at >= last7).length;

    return {
      xpByDay,
      weakLessons,
      avgExamPct,
      avgPracticePct,
      last7Activity,
      totalAttempts: (attempts || []).length,
      totalPractice: (practice || []).length,
      topErrors: errors || []
    };
  },

  async cacheLessonForOffline({ lessonId, userId }) {
    const sb = await getClient();
    const id = uid("off_");
    const { error } = await sb.from("offline_cache").insert([{
      id, user_id: userId, lesson_id: lessonId,
      cached_at: Date.now()
    }]);
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return true;
  },

  async getOfflineCachedLessons(userId) {
    const sb = await getClient();
    const { data } = await sb.from("offline_cache")
      .select("*").eq("user_id", userId).order("cached_at", { ascending: false });
    return data || [];
  },

  async removeOfflineCache({ lessonId, userId }) {
    const sb = await getClient();
    await sb.from("offline_cache").delete().eq("user_id", userId).eq("lesson_id", lessonId);
    return true;
  },

  async trackVideoProgress({ userId, lessonId, watchedPercent, lastPosition }) {
    const sb = await getClient();
    const now = Date.now();
    const { data: existing } = await sb.from("video_progress")
      .select("*").eq("user_id", userId).eq("lesson_id", lessonId).maybeSingle();

    if (existing) {
      const maxPercent = Math.max(existing.watched_percent || 0, watchedPercent);
      const milestones = existing.milestones || {};
      if (watchedPercent >= 25 && !milestones.p25) { milestones.p25 = now; }
      if (watchedPercent >= 50 && !milestones.p50) { milestones.p50 = now; }
      if (watchedPercent >= 75 && !milestones.p75) { milestones.p75 = now; }
      if (watchedPercent >= 90 && !milestones.p90) { milestones.p90 = now; }
      await sb.from("video_progress").update({
        watched_percent: maxPercent,
        last_position: lastPosition || 0,
        milestones,
        updated_at: now
      }).eq("id", existing.id);
      return { watchedPercent: maxPercent, milestones };
    } else {
      const milestones = {};
      if (watchedPercent >= 25) milestones.p25 = now;
      if (watchedPercent >= 50) milestones.p50 = now;
      if (watchedPercent >= 75) milestones.p75 = now;
      if (watchedPercent >= 90) milestones.p90 = now;
      const id = uid("vp_");
      await sb.from("video_progress").insert([{
        id, user_id: userId, lesson_id: lessonId,
        watched_percent: watchedPercent,
        last_position: lastPosition || 0,
        milestones, created_at: now, updated_at: now
      }]);
      return { watchedPercent, milestones };
    }
  },

  async getVideoProgress({ userId, lessonId }) {
    const sb = await getClient();
    const { data } = await sb.from("video_progress")
      .select("*").eq("user_id", userId).eq("lesson_id", lessonId).maybeSingle();
    return data || null;
  },

  async createStudyGroup({ userId, name, subjectId, description }) {
    const sb = await getClient();
    const now = Date.now();
    const groupId = uid("grp_");
    const { error } = await sb.from("study_groups").insert([{
      id: groupId, name, subject_id: subjectId || null,
      description: description || "", leader_id: userId,
      max_members: 5, created_at: now
    }]);
    if (error) throw new Error(error.message);

    await sb.from("study_group_members").insert([{
      id: uid("grm_"), group_id: groupId, user_id: userId,
      role: "leader", joined_at: now
    }]);

    return groupId;
  },

  async listStudyGroups({ subjectId, excludeUserId } = {}) {
    const sb = await getClient();
    let q = sb.from("study_groups").select("*").eq("active", true);
    if (subjectId) q = q.eq("subject_id", subjectId);
    const { data: groups } = await q.limit(50);
    if (!groups || groups.length === 0) return [];

    const groupIds = groups.map(g => g.id);
    const { data: members } = await sb.from("study_group_members")
      .select("*").in("group_id", groupIds);

    const membersMap = {};
    (members || []).forEach(m => {
      if (!membersMap[m.group_id]) membersMap[m.group_id] = [];
      membersMap[m.group_id].push(m);
    });

    return groups
      .map(g => {
        const gm = membersMap[g.id] || [];
        return { ...g, members_count: gm.length, is_member: gm.some(m => m.user_id === excludeUserId) };
      })
      .filter(g => g.members_count < g.max_members);
  },

  async getGroupDetails({ groupId, userId }) {
    const sb = await getClient();
    const { data: group } = await sb.from("study_groups").select("*").eq("id", groupId).maybeSingle();
    if (!group) throw new Error("المجموعة غير موجودة");

    const { data: members } = await sb.from("study_group_members")
      .select("*").eq("group_id", groupId);
    const userIds = (members || []).map(m => m.user_id);
    const { data: users } = await sb.from("users")
      .select("id, name, avatar, gender, xp, governorate")
      .in("id", userIds);

    const enrichedMembers = (members || []).map(m => ({
      ...m,
      user: (users || []).find(u => u.id === m.user_id)
    }));

    return {
      group,
      members: enrichedMembers,
      isMember: enrichedMembers.some(m => m.user_id === userId)
    };
  },

  async joinStudyGroup({ groupId, userId }) {
    const sb = await getClient();
    const { data: existing } = await sb.from("study_group_members")
      .select("id").eq("group_id", groupId).eq("user_id", userId).maybeSingle();
    if (existing) throw new Error("أنت عضو بالفعل");

    const { count } = await sb.from("study_group_members")
      .select("*", { count: "exact", head: true }).eq("group_id", groupId);
    const { data: group } = await sb.from("study_groups").select("max_members").eq("id", groupId).maybeSingle();
    if (group && count >= group.max_members) throw new Error("المجموعة مكتملة");

    await sb.from("study_group_members").insert([{
      id: uid("grm_"), group_id: groupId, user_id: userId,
      role: "member", joined_at: Date.now()
    }]);
    return true;
  },

  async leaveStudyGroup({ groupId, userId }) {
    const sb = await getClient();
    await sb.from("study_group_members").delete().eq("group_id", groupId).eq("user_id", userId);
    return true;
  },

  async setUserSchool({ userId, schoolName }) {
    const sb = await getClient();
    await sb.from("users").update({ school_name: schoolName || null }).eq("id", userId);
    return true;
  },

  async getSchoolLeaderboard(limit = 20) {
    const sb = await getClient();
    const { data: users } = await sb.from("users")
      .select("school_name, xp, role, active, banned")
      .eq("role", "student").eq("active", true).eq("banned", false)
      .not("school_name", "is", null);

    const schools = {};
    (users || []).forEach(u => {
      if (!u.school_name) return;
      if (!schools[u.school_name]) {
        schools[u.school_name] = { name: u.school_name, students: 0, totalXp: 0, avgXp: 0 };
      }
      schools[u.school_name].students += 1;
      schools[u.school_name].totalXp += (u.xp || 0);
    });

    return Object.values(schools)
      .map(s => ({ ...s, avgXp: Math.round(s.totalXp / s.students) }))
      .sort((a, b) => b.totalXp - a.totalXp)
      .slice(0, limit);
  },

  async getOrCreateDailyChallenge() {
    const sb = await getClient();
    const t = today();
    const { data: existing } = await sb.from("daily_challenges").select("*").eq("challenge_date", t).maybeSingle();
    if (existing) return existing;
    const { data: questions } = await sb.from("questions").select("id").limit(500);
    const allIds = (questions || []).map(q => q.id);
    if (allIds.length < 5) throw new Error("لا توجد أسئلة كافية للتحدي اليومي");
    const shuffled = allIds.sort(() => Math.random() - 0.5).slice(0, 5);
    const row = {
      id: uid("dc_"), challenge_date: t,
      question_ids: shuffled, created_at: Date.now()
    };
    const { data, error } = await sb.from("daily_challenges").insert([row]).select().single();
    if (error) {
      const { data: retry } = await sb.from("daily_challenges").select("*").eq("challenge_date", t).maybeSingle();
      if (retry) return retry;
      throw new Error(error.message);
    }
    return data;
  },

  async getDailyChallengeAttempt(userId) {
    const sb = await getClient();
    const t = today();
    const { data } = await sb.from("daily_challenge_attempts")
      .select("*").eq("user_id", userId).eq("challenge_date", t).maybeSingle();
    return data || null;
  },

  async submitDailyChallenge({ userId, userName, score, total, answers }) {
    const sb = await getClient();
    const t = today();
    const { data: existing } = await sb.from("daily_challenge_attempts")
      .select("id").eq("user_id", userId).eq("challenge_date", t).maybeSingle();
    if (existing) throw new Error("أتممت تحدي اليوم بالفعل ✅");
    const pct = Math.round((score / total) * 100);
    const xpEarned = score === total ? 100 : Math.round(score * 15);
    const row = {
      id: uid("dca_"), user_id: userId, challenge_date: t,
      score, total, xp_earned: xpEarned,
      answers: answers || {}, completed_at: Date.now()
    };
    const { error } = await sb.from("daily_challenge_attempts").insert([row]);
    if (error) throw new Error(error.message);
    if (xpEarned > 0) {
      const { data: u } = await sb.from("users").select("xp").eq("id", userId).maybeSingle();
      await sb.from("users").update({ xp: (u?.xp || 0) + xpEarned }).eq("id", userId);
    }
    API.trackActivity({
      userId, userName, type: "daily_challenge",
      target: `التحدي اليومي — ${score}/${total}`,
      details: { score, total, pct, xp: xpEarned }
    });
    return { score, total, pct, xpEarned };
  },

  async getDailyChallengeLeaderboard() {
    const sb = await getClient();
    const t = today();
    const { data: attempts } = await sb.from("daily_challenge_attempts")
      .select("*").eq("challenge_date", t)
      .order("score", { ascending: false })
      .order("completed_at", { ascending: true })
      .limit(20);
    if (!attempts || attempts.length === 0) return [];
    const userIds = [...new Set(attempts.map(a => a.user_id))];
    const { data: users } = await sb.from("users")
      .select("id, name, avatar, governorate, xp")
      .in("id", userIds);
    return attempts.map((a, i) => ({
      ...a, rank: i + 1,
      user: (users || []).find(u => u.id === a.user_id)
    }));
  },

  async createStudyPlan({ userId, title, examDate, subjectId, dailyMinutes = 30 }) {
    const sb = await getClient();
    const now = Date.now();
    const daysLeft = Math.max(1, Math.ceil((examDate - now) / 86400000));
    const planId = uid("plan_");
    const { error } = await sb.from("study_plans").insert([{
      id: planId, user_id: userId, title,
      subject_id: subjectId || null,
      exam_date: examDate, daily_minutes: dailyMinutes,
      total_days: daysLeft, completed_days: 0,
      status: "active", created_at: now
    }]);
    if (error) throw new Error(error.message);
    return { planId, daysLeft };
  },

  async getMyStudyPlans(userId) {
    const sb = await getClient();
    const { data } = await sb.from("study_plans")
      .select("*").eq("user_id", userId).order("exam_date", { ascending: true });
    return data || [];
  },

  async getStudyTasksForDate({ userId, date }) {
    const sb = await getClient();
    const { data } = await sb.from("study_tasks")
      .select("*").eq("user_id", userId).eq("task_date", date)
      .order("created_at", { ascending: true });
    return data || [];
  },

  async markStudyTaskDone({ taskId, userId }) {
    const sb = await getClient();
    await sb.from("study_tasks").update({ completed: true, completed_at: Date.now() }).eq("id", taskId);
    const { data: u } = await sb.from("users").select("xp").eq("id", userId).maybeSingle();
    await sb.from("users").update({ xp: (u?.xp || 0) + 10 }).eq("id", userId);
    return true;
  },

  async generateStudyTasks({ planId, userId, subjectId, examDate, dailyMinutes }) {
    const sb = await getClient();
    const now = Date.now();
    const daysLeft = Math.max(1, Math.ceil((examDate - now) / 86400000));
    let q = sb.from("lessons").select("id, title, duration");
    if (subjectId) {
      const { data: units } = await sb.from("units").select("id").eq("subject_id", subjectId);
      const unitIds = (units || []).map(u => u.id);
      if (unitIds.length > 0) q = q.in("unit_id", unitIds);
    }
    const { data: lessons } = await q.eq("published", true);
    const lessonList = (lessons || []).sort(() => Math.random() - 0.5);
    if (lessonList.length === 0) throw new Error("لا توجد دروس متاحة");

    const tasks = [];
    const lessonsPerDay = Math.max(1, Math.ceil(lessonList.length / daysLeft));

    for (let day = 0; day < Math.min(daysLeft, 30); day++) {
      const taskDate = new Date(now + day * 86400000).toISOString().slice(0, 10);
      const dayLessons = lessonList.slice(day * lessonsPerDay, (day + 1) * lessonsPerDay);
      for (const lesson of dayLessons) {
        tasks.push({
          id: uid("task_"),
          user_id: userId, plan_id: planId,
          task_date: taskDate,
          lesson_id: lesson.id,
          title: lesson.title,
          duration: lesson.duration || 15,
          completed: false,
          created_at: now
        });
      }
    }

    if (tasks.length > 0) {
      const { error } = await sb.from("study_tasks").insert(tasks);
      if (error) throw new Error(error.message);
    }
    return tasks.length;
  },

  async setUserTheme(userId, theme) {
    const sb = await getClient();
    await sb.from("users").update({ theme }).eq("id", userId);
    try { localStorage.setItem("me_theme", theme); } catch (e) {}
    return true;
  },

  getUserTheme() {
    try {
      return localStorage.getItem("me_theme") || "dark";
    } catch (e) { return "dark"; }
  },

  applyTheme(theme) {
    try {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("me_theme", theme);
    } catch (e) {}
  },

  async startFocusSession({ userId, durationMinutes = 25, label }) {
    const sb = await getClient();
    const id = uid("fcs_");
    const now = Date.now();
    const { error } = await sb.from("focus_sessions").insert([{
      id, user_id: userId,
      duration_minutes: durationMinutes,
      label: label || "جلسة مذاكرة",
      started_at: now,
      status: "active",
      xp_awarded: 0,
      created_at: now
    }]);
    if (error) throw new Error(error.message);
    return id;
  },

  async completeFocusSession({ sessionId, userId, completed = true }) {
    const sb = await getClient();
    const { data: session } = await sb.from("focus_sessions").select("*").eq("id", sessionId).maybeSingle();
    if (!session) throw new Error("الجلسة غير موجودة");
    const now = Date.now();
    const duration = Math.round((now - session.started_at) / 60000);
    const xpAwarded = completed ? Math.max(5, Math.min(30, duration)) : 0;
    await sb.from("focus_sessions").update({
      status: completed ? "completed" : "cancelled",
      ended_at: now, actual_minutes: duration, xp_awarded: xpAwarded
    }).eq("id", sessionId);
    if (xpAwarded > 0) {
      const { data: u } = await sb.from("users").select("xp").eq("id", userId).maybeSingle();
      await sb.from("users").update({ xp: (u?.xp || 0) + xpAwarded }).eq("id", userId);
    }
    return { duration, xpAwarded };
  },

  async getFocusHistory(userId, limit = 20) {
    const sb = await getClient();
    const { data } = await sb.from("focus_sessions")
      .select("*").eq("user_id", userId).eq("status", "completed")
      .order("started_at", { ascending: false }).limit(limit);
    return data || [];
  },

  async setFocusMode(userId, active) {
    const sb = await getClient();
    await sb.from("users").update({ focus_mode: active }).eq("id", userId);
    return true;
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
    if (user.role === "admin") { window.location.replace("/admin/index.html"); } else { window.location.replace("/student/index.html"); }
  },

  gotoLogin() { window.location.replace("/auth/login.html"); },
  gotoRegister() { window.location.replace("/auth/register.html"); },
  gotoAdmin() { window.location.replace("/admin/index.html"); },
  gotoStudent() { window.location.replace("/student/index.html"); },
  gotoHome() { window.location.replace("/index.html"); }
};

window.MissionDB = API;