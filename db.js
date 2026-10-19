(function(){
  'use strict';

  const SUPABASE_URL = 'https://szuvpbdwixezecxnykjn.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_NgBzisUuNn6Gdz9PE1XgWg_EYlC5zta';
  const SESSION_KEY = 'mission_session';
  const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

  let _client = null;

  async function getClient() {
    if (_client) return _client;
    if (window.supabase && window.supabase.createClient) {
      _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      return _client;
    }
    if (!window._supabaseLoading) {
      window._supabaseLoading = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        s.onload = () => {
          _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: false, autoRefreshToken: false }
          });
          resolve(_client);
        };
        s.onerror = () => reject(new Error('فشل تحميل Supabase'));
        document.head.appendChild(s);
      });
    }
    return window._supabaseLoading;
  }

  function uid(prefix) {
    prefix = prefix || 'id_';
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  function fmt(n) {
    n = Number(n) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return n.toLocaleString('en-US');
  }

  function formatDate(ts) {
    if (!ts) return '—';
    try {
      const d = new Date(Number(ts));
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) { return '—'; }
  }

  function formatTime(ts) {
    if (!ts) return '—';
    try {
      const d = new Date(Number(ts));
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '—'; }
  }

  function formatDateTime(ts) {
    if (!ts) return '—';
    try {
      const d = new Date(Number(ts));
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '—'; }
  }

  function ytId(url) {
    if (!url) return null;
    const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function vimeoId(url) {
    if (!url) return null;
    const m = String(url).match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return m ? m[1] : null;
  }

  function getSessionId() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || !s.userId || !s.expiresAt) return null;
      if (Date.now() > s.expiresAt) { clearSession(); return null; }
      return s.userId;
    } catch (e) { return null; }
  }

  function setSession(userId) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, expiresAt: Date.now() + SESSION_EXPIRY_MS, createdAt: Date.now() }));
    } catch (e) {}
  }

  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  async function loadAll() {
    const sb = await getClient();
    const tables = ['users','grades','subjects','units','lessons','questions','exams','missions','achievements','levels','notifications','activity','polls','poll_votes'];
    const result = {};
    await Promise.all(tables.map(async (t) => {
      try { const res = await sb.from(t).select('*').limit(2000); result[t] = res.data || []; }
      catch (e) { result[t] = []; }
    }));
    return result;
  }

  async function save(table, item) {
    const sb = await getClient();
    const record = { ...item };
    if (!record.id) record.id = uid(table.slice(0, 3) + '_');
    if (!record.created_at && !item.created_at) record.created_at = Date.now();
    const { data, error } = await sb.from(table).upsert(record).select().maybeSingle();
    if (error) throw new Error(error.message || 'فشل الحفظ');
    return data || record;
  }

  async function remove(table, id) {
    const sb = await getClient();
    const { error } = await sb.from(table).delete().eq('id', id);
    if (error) throw new Error(error.message || 'فشل الحذف');
    return true;
  }

  async function removeMany(table, ids) {
    if (!ids || !ids.length) return true;
    const sb = await getClient();
    const { error } = await sb.from(table).delete().in('id', ids);
    if (error) throw new Error(error.message || 'فشل الحذف');
    return true;
  }

  async function getUser(userId) {
    if (!userId) return null;
    const sb = await getClient();
    const { data, error } = await sb.from('users').select('*').eq('id', userId).maybeSingle();
    if (error || !data) return null;
    return data;
  }

  async function getUserByPhone(phone) {
    if (!phone) return null;
    const sb = await getClient();
    const clean = String(phone).replace(/\D/g, '');
    const { data, error } = await sb.from('users').select('*').eq('phone', clean).maybeSingle();
    if (error || !data) return null;
    return data;
  }

  async function updateUser(userId, patch) {
    if (!userId || !patch) throw new Error('بيانات غير صالحة');
    const sb = await getClient();
    const { data, error } = await sb.from('users').update(patch).eq('id', userId).select().maybeSingle();
    if (error) throw new Error(error.message || 'فشل التحديث');
    return data;
  }

  async function createUser(payload) {
    const sb = await getClient();
    const phone = String(payload.phone || '').replace(/\D/g, '');
    if (!phone || phone.length < 8) throw new Error('رقم هاتف غير صالح');
    const existing = await getUserByPhone(phone);
    if (existing) throw new Error('رقم الهاتف مسجل بالفعل');
    const user = {
      id: uid('u_'),
      name: String(payload.name || '').trim(),
      phone,
      country_code: payload.country_code || '+20',
      password: payload.password || '',
      role: 'student',
      active: true,
      banned: false,
      reports_count: 0,
      xp: 0,
      streak: 0,
      achievements: [],
      completed_lessons: [],
      all_subjects: true,
      access_subjects: [],
      subscription: 'free',
      gender: payload.gender || null,
      grade_id: payload.grade_id || null,
      governorate: payload.governorate || null,
      school_name: payload.school_name || null,
      created_at: Date.now(),
      last_login: Date.now()
    };
    if (!user.name) throw new Error('الاسم مطلوب');
    if (!user.password || user.password.length < 6) throw new Error('كلمة المرور قصيرة');
    const { data, error } = await sb.from('users').insert([user]).select().maybeSingle();
    if (error) throw new Error(error.message || 'فشل التسجيل');
    return data;
  }

  async function loginUser(phone, password) {
    const user = await getUserByPhone(phone);
    if (!user) throw new Error('رقم الهاتف غير مسجل');
    if (user.password !== password) throw new Error('كلمة المرور غير صحيحة');
    if (user.active === false) throw new Error('الحساب موقوف');
    if (user.banned === true) throw new Error('الحساب محظور: ' + (user.ban_reason || ''));
    try { const sb = await getClient(); await sb.from('users').update({ last_login: Date.now() }).eq('id', user.id); } catch (e) {}
    return user;
  }

  async function unbanUser(userId) {
    if (!userId) throw new Error('معرف غير صالح');
    const sb = await getClient();
    await sb.from('reports').delete().eq('user_id', userId);
    const { data, error } = await sb.from('users').update({ banned: false, ban_reason: null, banned_at: null, reports_count: 0 }).eq('id', userId).select().maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  async function getUserReports(userId) {
    if (!userId) return [];
    const sb = await getClient();
    const { data, error } = await sb.from('reports').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  }

  async function deleteQuestion(questionId) {
    if (!questionId) throw new Error('معرف غير صالح');
    const sb = await getClient();
    const { data: exams } = await sb.from('exams').select('*').contains('question_ids', [questionId]);
    let examsUpdated = 0;
    if (exams && exams.length) {
      for (const exam of exams) {
        const newIds = (exam.question_ids || []).filter(id => id !== questionId);
        await sb.from('exams').update({ question_ids: newIds }).eq('id', exam.id);
        examsUpdated++;
      }
    }
    await sb.from('questions').delete().eq('id', questionId);
    return { examsUpdated };
  }

  async function cleanupExpiredPolls() {
    try {
      const sb = await getClient();
      const now = Date.now();
      const { data } = await sb.from('polls').select('id').lt('ends_at', now).eq('active', true);
      if (!data || !data.length) return 0;
      await sb.from('polls').update({ active: false }).in('id', data.map(p => p.id));
      return data.length;
    } catch (e) { return 0; }
  }

  async function reportIssue(payload) {
    try {
      const sb = await getClient();
      const record = {
        id: uid('iss_'),
        user_id: null,
        user_name: String(payload.userName || 'زائر').slice(0, 100),
        user_phone: String(payload.userPhone || '').slice(0, 30),
        reporter_id: payload.reporterId || null,
        reason: 'بلاغ عام',
        details: String(payload.message || '').slice(0, 2000),
        created_at: Date.now()
      };
      const { error } = await sb.from('reports').insert([record]);
      return !error;
    } catch (e) { return false; }
  }

  async function getNotificationsFor(userId) {
    if (!userId) return [];
    try {
      const sb = await getClient();
      const { data, error } = await sb.from('notifications').select('*').or(`target.eq.all,target.eq.${userId}`).order('created_at', { ascending: false }).limit(50);
      if (error) return [];
      return data || [];
    } catch (e) { return []; }
  }

  async function logActivity(userId, userName, type, target) {
    try {
      const sb = await getClient();
      await sb.from('activity').insert([{
        id: uid('act_'),
        user_id: userId,
        user_name: userName || '',
        type: type || 'action',
        target: target || null,
        at: Date.now()
      }]);
      return true;
    } catch (e) { return false; }
  }

  async function updatePassword(userId, newPassword) {
    if (!userId) throw new Error('معرف غير صالح');
    if (!newPassword || newPassword.length < 6) throw new Error('كلمة المرور قصيرة');
    return updateUser(userId, { password: newPassword });
  }

  async function getFriendships(userId) {
    if (!userId) return [];
    try {
      const sb = await getClient();
      const { data, error } = await sb.from('friendships').select('*').or(`user_a.eq.${userId},user_b.eq.${userId}`);
      if (error) return [];
      return data || [];
    } catch (e) { return []; }
  }

  async function sendFriendRequest(fromId, toId) {
    if (!fromId || !toId) throw new Error('معرف غير صالح');
    if (fromId === toId) throw new Error('لا يمكن إضافة نفسك');
    const sb = await getClient();
    const { data: existing } = await sb.from('friendships').select('*').or(`and(user_a.eq.${fromId},user_b.eq.${toId}),and(user_a.eq.${toId},user_b.eq.${fromId})`).maybeSingle();
    if (existing) throw new Error('يوجد طلب بالفعل');
    const record = { id: uid('fr_'), user_a: fromId, user_b: toId, status: 'pending', created_at: Date.now(), updated_at: Date.now() };
    const { data, error } = await sb.from('friendships').insert([record]).select().maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  async function acceptFriendRequest(friendshipId) {
    if (!friendshipId) throw new Error('معرف غير صالح');
    const sb = await getClient();
    const { data, error } = await sb.from('friendships').update({ status: 'accepted', updated_at: Date.now() }).eq('id', friendshipId).select().maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  async function rejectFriendRequest(friendshipId) {
    if (!friendshipId) throw new Error('معرف غير صالح');
    const sb = await getClient();
    const { error } = await sb.from('friendships').delete().eq('id', friendshipId);
    if (error) throw new Error(error.message);
    return true;
  }

  async function sendDirectMessage(fromId, toId, text) {
    if (!fromId || !toId) throw new Error('معرف غير صالح');
    const clean = String(text || '').trim().slice(0, 1000);
    if (!clean) throw new Error('الرسالة فارغة');
    const sb = await getClient();
    const record = { id: uid('dm_'), from_id: fromId, to_id: toId, text: clean, read: false, created_at: Date.now() };
    const { data, error } = await sb.from('direct_messages').insert([record]).select().maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  async function getDirectMessages(userId, otherId) {
    if (!userId || !otherId) return [];
    try {
      const sb = await getClient();
      const { data, error } = await sb.from('direct_messages').select('*').or(`and(from_id.eq.${userId},to_id.eq.${otherId}),and(from_id.eq.${otherId},to_id.eq.${userId})`).order('created_at', { ascending: true }).limit(500);
      if (error) return [];
      return data || [];
    } catch (e) { return []; }
  }

  async function markMessagesRead(userId, fromId) {
    if (!userId || !fromId) return false;
    try {
      const sb = await getClient();
      await sb.from('direct_messages').update({ read: true }).eq('to_id', userId).eq('from_id', fromId).eq('read', false);
      return true;
    } catch (e) { return false; }
  }

  async function submitExamAttempt(payload) {
    if (!payload || !payload.userId || !payload.examId) throw new Error('بيانات غير صالحة');
    const sb = await getClient();
    const record = {
      id: uid('att_'),
      user_id: payload.userId,
      exam_id: payload.examId,
      score: Number(payload.score) || 0,
      total: Number(payload.total) || 0,
      pct: Number(payload.pct) || 0,
      passed: !!payload.passed,
      status: payload.passed ? 'passed' : 'failed',
      at: Date.now(),
      duration_seconds: Number(payload.durationSeconds) || 0
    };
    const { data, error } = await sb.from('exam_attempts').insert([record]).select().maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  async function logError(userId, questionId) {
    if (!userId || !questionId) return false;
    try {
      const sb = await getClient();
      const { data: existing } = await sb.from('user_errors').select('*').eq('user_id', userId).eq('question_id', questionId).maybeSingle();
      if (existing) {
        await sb.from('user_errors').update({ count: (existing.count || 1) + 1, at: Date.now() }).eq('id', existing.id);
      } else {
        await sb.from('user_errors').insert([{ id: uid('err_'), user_id: userId, question_id: questionId, count: 1, at: Date.now() }]);
      }
      return true;
    } catch (e) { return false; }
  }

  window.MissionDB = {
    getClient,
    loadAll,
    save,
    remove,
    removeMany,
    getUser,
    getUserByPhone,
    updateUser,
    createUser,
    loginUser,
    unbanUser,
    getUserReports,
    getSessionId,
    setSession,
    clearSession,
    deleteQuestion,
    cleanupExpiredPolls,
    reportIssue,
    getNotificationsFor,
    logActivity,
    updatePassword,
    getFriendships,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    sendDirectMessage,
    getDirectMessages,
    markMessagesRead,
    submitExamAttempt,
    logError,
    uid,
    fmt,
    formatDate,
    formatTime,
    formatDateTime,
    ytId,
    vimeoId
  };
})();