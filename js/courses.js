import { requireRole } from "../js/security.js";
import { supabase } from "../js/supabase.js";
const access=await requireRole("student");
if(access){
 const box=document.querySelector("#courses");
 const {data,error}=await supabase.from("courses").select("id,title,description,is_published").eq("is_published",true).order("created_at",{ascending:false});
 if(error){box.innerHTML="<div class='card'>تعذر تحميل المحتوى.</div>";}
 else box.innerHTML=(data||[]).map(c=>`<article class="card"><h3>${escapeHtml(c.title)}</h3><p class="muted">${escapeHtml(c.description||"")}</p></article>`).join("")||"<div class='card'>لا يوجد محتوى منشور حاليًا.</div>";
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
