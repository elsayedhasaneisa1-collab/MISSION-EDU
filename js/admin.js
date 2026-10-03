import { requireRole } from "../js/security.js";
import { supabase } from "../js/supabase.js";
const access=await requireRole("admin");
if(access){
 const [{count:students},{count:courses},{count:logs}]=await Promise.all([
   supabase.from("profiles").select("id",{count:"exact",head:true}).eq("role","student"),
   supabase.from("courses").select("id",{count:"exact",head:true}),
   supabase.from("audit_logs").select("id",{count:"exact",head:true})
 ]);
 document.querySelector("#students").textContent=students ?? 0;
 document.querySelector("#courses").textContent=courses ?? 0;
 document.querySelector("#logs").textContent=logs ?? 0;
}
