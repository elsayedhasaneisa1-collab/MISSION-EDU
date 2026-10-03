import { requireRole } from "./security.js";
import { supabase } from "./supabase.js";
const access=await requireRole("student");
if(access){
 const {profile}=access;
 const {data}=await supabase.from("student_stats").select("xp,level,streak").eq("student_id",profile.id).maybeSingle();
 document.querySelector("#profileStatus").textContent=`مرحبًا ${profile.full_name || "طالب"} — حسابك نشط ومحمِي بصلاحيات قاعدة البيانات.`;
 if(data){xp.textContent=data.xp;level.textContent=data.level;streak.textContent=data.streak;}
}
document.querySelector("#logout").onclick=async()=>{await supabase.auth.signOut();location.href="../login.html";};
