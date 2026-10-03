import { requireRole } from "../js/security.js";
import { supabase } from "../js/supabase.js";
const access=await requireRole("student");
if(access){
 const box=document.querySelector("#missions");
 const {data,error}=await supabase.from("missions").select("id,title,description,xp_reward,status").eq("status","published").order("created_at",{ascending:false});
 if(error){box.innerHTML="<div class='card'>تعذر تحميل المهام.</div>";}
 else box.innerHTML=(data||[]).map(m=>`<article class="card"><h3>${escapeHtml(m.title)}</h3><p class="muted">${escapeHtml(m.description||"")}</p><b>+${m.xp_reward} XP</b></article>`).join("")||"<div class='card'>لا توجد مهام منشورة.</div>";
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
