/* /public/assets/js/roles.js */
import { auth, db } from "./firebaseApp.js";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let cachedRole = null;

export async function getMyRole(){
  const u = auth.currentUser;
  if(!u) return null;
  if(cachedRole) return cachedRole;

  const ref = doc(db, "roles", u.uid);
  const snap = await getDoc(ref);
  cachedRole = snap.exists() ? (snap.data().role || null) : null;
  return cachedRole;
}

export function wireHeaderAuthUi(){
  const btnLogin = document.getElementById("btnLogin");
  const btnLogout = document.getElementById("btnLogout");
  const roleBadge = document.getElementById("roleBadge");

  async function refreshRole(){
    const role = await getMyRole().catch(()=>null);
    if(roleBadge) roleBadge.textContent = "role: " + (role || "-");
    document.querySelectorAll(".adminOnly").forEach(el=>{
      el.style.display = (role === "admin") ? "" : "none";
    });
  }

  onAuthStateChanged(auth, async (user)=>{
    cachedRole = null;
    if(user){
      if(btnLogin) btnLogin.style.display = "none";
      if(btnLogout) btnLogout.style.display = "";
      await refreshRole();
    }else{
      if(btnLogin) btnLogin.style.display = "";
      if(btnLogout) btnLogout.style.display = "none";
      if(roleBadge) roleBadge.textContent = "role: -";
      document.querySelectorAll(".adminOnly").forEach(el=> el.style.display="none");
    }
  });

  btnLogin?.addEventListener("click", async ()=>{
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  });

  btnLogout?.addEventListener("click", async ()=>{
    await signOut(auth);
  });
}
