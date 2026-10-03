import { supabase } from "./supabase.js";

export async function getSession(){
  const {data,error}=await supabase.auth.getSession();
  if(error) throw error;
  return data.session;
}

export async function requireAuth(){
  const session=await getSession();
  if(!session){ location.href="../login.html"; return null; }
  return session;
}

export async function requireRole(role){
  const session=await requireAuth();
  if(!session) return null;
  const {data,error}=await supabase.from("profiles").select("id,full_name,role,status").eq("id",session.user.id).single();
  if(error || !data || data.status !== "active" || data.role !== role){
    location.href="../index.html";
    return null;
  }
  return {session,profile:data};
}
