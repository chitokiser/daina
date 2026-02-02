// /public/assets/js/roles.js
import { db, auth } from "./firebaseApp.js";

import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function $(id){ return document.getElementById(id); }

async function isAdminByUid(uid){
  if(!uid) return false;
  const ref = doc(db, "roles", uid);
  const snap = await getDoc(ref);
  return snap.exists() && snap.data()?.admin === true;
}

function setRoleBadge(role){
  const el = $("roleBadge");
  if(!el) return;
  if(!role){
    el.style.display = "none";
    el.textContent = "";
    return;
  }
  el.style.display = "inline-flex";
  el.textContent = "role: " + role;
}

function showAdminLinks(show){
  const a1 = $("adminLink");
  const a2 = $("adminLinkMobile");
  if(a1) a1.style.display = show ? "" : "none";
  if(a2) a2.style.display = show ? "" : "none";
}

async function refreshHeaderUi(user){
  const btn = $("btnLogin");
  if(btn){
    btn.textContent = user ? "로그아웃" : "구글 로그인";
  }

  if(!user){
    setRoleBadge("");
    showAdminLinks(false);
    return;
  }

  const admin = await isAdminByUid(user.uid);
  setRoleBadge(admin ? "admin" : "user");
  showAdminLinks(!!admin);
}

let _wired = false;

export async function wireHeaderAuthUi(){
  if(_wired) return;
  _wired = true;

  // redirect 결과 처리 (가장 먼저)
  try{
    await getRedirectResult(auth);
  }catch(e){
    console.error("getRedirectResult error:", e);
    alert("로그인 실패: 콘솔 확인");
  }

  // 로그인/로그아웃 버튼 연결
  const btn = $("btnLogin");
  if(btn){
    const provider = new GoogleAuthProvider();
    btn.addEventListener("click", async ()=>{
      if(auth.currentUser){
        try{
          await signOut(auth);
        }catch(e){
          console.error(e);
          alert("로그아웃 실패 (콘솔 확인)");
        }
        return;
      }
      try{
        await signInWithRedirect(auth, provider);
      }catch(e){
        console.error(e);
        alert("로그인 시작 실패 (콘솔 확인)");
      }
    });
  }

  // 상태 변화 반영
  onAuthStateChanged(auth, (user)=>{
    refreshHeaderUi(user);
  });
}
