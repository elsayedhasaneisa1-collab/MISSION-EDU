import { requireRole } from "../js/security.js";
import { supabase } from "../js/supabase.js";
const access=await requireRole("student");
if(access){
 const box=document.querySelector("#leaderboard");
 const {data,error}=await supabase.from("leaderboard_top10").select("rank,full_name,xp,level");
 if(error){box.innerHTML="<div class='card'>تعذر تحميل المتصدرين.</div>";}
 else box.innerHTML=(data||[]).map(x=>`<div class="rank"><strong>#${x.rank} — ${escapeHtml(x.full_name||"طالب")}</strong><span>${x.xp} XP • مستوى ${x.level}</span></div>`).join("");
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
