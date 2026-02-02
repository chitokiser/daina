// /public/assets/js/roles.js
import { auth, db } from "./firebaseApp.js";

import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let cachedRole = null;
let _inited = false;
let _bound = false;

async function getMyRole(){
  const u = auth.currentUser;
  if(!u) return null;
  if(cachedRole) return cachedRole;

  try{
    const ref = doc(db, "roles", u.uid);
    const snap = await getDoc(ref);
    cachedRole = snap.exists() ? (snap.data().role || null) : null;
    return cachedRole;
  }catch(e){
    // roles read가 rules 때문에 막혀도 로그인 자체는 동작해야 함
    return null;
  }
}

async function refreshRole(){
  const roleBadge = document.getElementById("roleBadge");
  const role = await getMyRole().catch(()=>null);

  if(roleBadge) roleBadge.textContent = "role: " + (role || "-");

  document.querySelectorAll(".adminOnly").forEach(el=>{
    el.style.display = (role === "admin") ? "" : "none";
  });
}

export async function initAuth(){
  if(_inited) return;
  _inited = true;

  try{
    await setPersistence(auth, browserLocalPersistence);
  }catch(e){
    // ignore
  }

  try{
    await getRedirectResult(auth);
  }catch(e){
    // redirect 실패는 사용자에게 보이게
    console.error(e);
  }
}

export function wireHeaderAuthUi(){
  if(_bound) return;
  _bound = true;

  const btnLogin = document.getElementById("btnLogin");
  const btnLogout = document.getElementById("btnLogout");
  const roleBadge = document.getElementById("roleBadge");

  if(!btnLogin) return;

  onAuthStateChanged(auth, async (user)=>{
    cachedRole = null;
    if(user){
      btnLogin.style.display = "none";
      if(btnLogout) btnLogout.style.display = "";
      await refreshRole();
    }else{
      btnLogin.style.display = "";
      if(btnLogout) btnLogout.style.display = "none";
      if(roleBadge) roleBadge.textContent = "role: -";
      document.querySelectorAll(".adminOnly").forEach(el=> el.style.display="none");
    }
  });

  btnLogin.addEventListener("click", async ()=>{
    const provider = new GoogleAuthProvider();

    // 팝업 시도 → 막히면 redirect로 자동 전환
    try{
      await signInWithPopup(auth, provider);
    }catch(e){
      console.error(e);
      try{
        await signInWithRedirect(auth, provider);
      }catch(e2){
        console.error(e2);
        alert("로그인 시작 실패. 콘솔 에러를 확인하세요.");
      }
    }
  });

  btnLogout?.addEventListener("click", async ()=>{
    try{
      await signOut(auth);
    }catch(e){
      console.error(e);
      alert("로그아웃 실패. 콘솔 확인");
    }
  });
}
