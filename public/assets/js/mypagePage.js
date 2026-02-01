// /public/assets/js/mypagePage.js
import { db } from "./firebaseApp.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function $(id){ return document.getElementById(id); }

function val(id){ return ($(id)?.value ?? "").trim(); }

function setVal(id, v){
  const el = $(id);
  if(el) el.value = v ?? "";
}

function setMeta(text){
  const el = $("meMeta");
  if(el) el.textContent = text ?? "";
}

function pickProfile(data){
  return {
    name: data?.name ?? "",
    phone: data?.phone ?? "",
    category: data?.category ?? "",
    workStatus: data?.workStatus ?? "",
    skills: data?.skills ?? "",
    profile: data?.profile ?? "",
    photo: data?.photo ?? ""
  };
}

function fillForm(p){
  setVal("fName", p.name);
  setVal("fPhone", p.phone);
  setVal("fCategory", p.category);
  setVal("fWorkStatus", p.workStatus);
  setVal("fSkills", p.skills);
  setVal("fProfile", p.profile);
  setVal("fPhoto", p.photo);
}

async function load(uid){
  setMeta("불러오는 중…");
  const ref = doc(db, "profiles", uid);
  const snap = await getDoc(ref);

  if(!snap.exists()){
    setMeta("내 프로필 없음 (저장하면 생성됩니다)");
    fillForm(pickProfile({}));
    return;
  }

  const p = pickProfile(snap.data() || {});
  fillForm(p);
  setMeta("프로필 로드 완료");
}

async function save(uid, email){
  const payload = {
    name: val("fName"),
    phone: val("fPhone"),
    category: val("fCategory"),
    workStatus: val("fWorkStatus"),
    skills: val("fSkills"),
    profile: val("fProfile"),
    photo: val("fPhoto"),
    email: email || "",
    updatedAt: serverTimestamp()
  };

  const ref = doc(db, "profiles", uid);

  await setDoc(ref, {
    ...payload,
    uid,
    createdAt: serverTimestamp()
  }, { merge: true });

  setMeta("저장 완료");
}

function bind(uid, email){
  $("btnReload")?.addEventListener("click", ()=>load(uid));
  $("btnSave")?.addEventListener("click", async ()=>{
    try{
      setMeta("저장 중…");
      await save(uid, email);
    }catch(e){
      console.error(e);
      setMeta("저장 실패 (콘솔 확인)");
      alert("저장 실패 (콘솔 확인)");
    }
  });
}

const auth = getAuth();
onAuthStateChanged(auth, async (user)=>{
  if(!user){
    setMeta("로그인이 필요합니다.");
    alert("로그인이 필요합니다.");
    location.href = "./index.html";
    return;
  }

  setMeta("로그인됨: " + (user.email || user.uid));
  bind(user.uid, user.email || "");
  await load(user.uid);
});
