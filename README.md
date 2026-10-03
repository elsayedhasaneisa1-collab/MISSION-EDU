# MISSION EDU — Secure Starter

هذه النسخة تحتوي على:
- صفحات منفصلة للطالب والإدارة.
- CSS منظم.
- JavaScript Modules.
- Supabase Auth.
- جداول Supabase.
- RLS وصلاحيات قاعدة البيانات.
- Audit Logs.
- Leaderboard Top 10.
- XP / Level / Streak.
- رابط WhatsApp لـ EL-sayed Hasan.

## التشغيل
1. افتح `js/config.js`.
2. ضع Supabase URL وPublishable/Anon Key.
3. في Supabase SQL Editor شغّل `supabase/schema.sql` ثم `supabase/rls.sql`.
4. أنشئ مستخدمًا من Supabase Auth.
5. بعد إنشاء حساب الإدارة، غيّر دوره من `student` إلى `admin` من داخل قاعدة البيانات بطريقة آمنة من لوحة Supabase.
6. لا تضع Service Role Key في JavaScript أو داخل GitHub.

## مهم
هذه حماية حقيقية على مستوى قاعدة البيانات عبر RLS، لكن كود المتصفح نفسه ليس سرًا. لا تعتمد على إخفاء JavaScript أو تعطيل الزر الأيمن كحماية أساسية.
