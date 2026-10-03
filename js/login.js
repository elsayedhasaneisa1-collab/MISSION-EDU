import { supabase } from "./supabase.js";
const form=document.querySelector("#loginForm"), status=document.querySelector("#status");
form.addEventListener("submit",async e=>{
  e.preventDefault(); status.textContent="جاري التحقق...";
  const email=document.querySelector("#email").value.trim();
  const password=document.querySelector("#password").value;
  const {data,error}=await supabase.auth.signInWithPassword({email,password});
  if(error){ status.textContent="بيانات الدخول غير صحيحة أو الحساب غير متاح."; return; }
  const {data:profile}=await supabase.from("profiles").select("role,status").eq("id",data.user.id).single();
  if(!profile || profile.status!=="active"){ await supabase.auth.signOut(); status.textContent="الحساب غير نشط."; return; }
  location.href=profile.role==="admin" ? "admin/index.html" : "student/index.html";
});
