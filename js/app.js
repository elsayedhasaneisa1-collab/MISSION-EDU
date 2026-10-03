import { supabase } from "./supabase.js";
supabase.auth.onAuthStateChange((_event,session)=>{
  const path=location.pathname;
  if(path.endsWith("/login.html") && session) location.href = session.user.user_metadata?.role === "admin" ? "admin/index.html" : "student/index.html";
});
