// /public/assets/js/mypagePage.js
import { auth, db } from "./firebaseApp.js";
import { fillProvinceSelect, PROVINCES } from "./regions.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function $(id){ return document.getElementById(id); }

function setText(id, t){
  const el = $(id);
  if(el) el.textContent = t ?? "";
}

function val(id){ return String($(id)?.value ?? "").trim(); }
function setVal(id, v){ if($(id)) $(id).value = v ?? ""; }

function provinceNameOf(code){
  const p = PROVINCES.find(x => x.code === code);
  return p ? p.name : "";
}

function pickFirst(obj, keys){
  for(const k of keys){
    if(obj && obj[k] != null && String(obj[k]).trim() !== "") return obj[k];
  }
  return "";
}

let _appRef = null;   // applications_jobseeker 문서 ref
let _userRef = null;  // users/{uid} 문서 ref

async function findMyApplication(uid){
  const qy = query(
    collection(db, "applications_jobseeker"),
    where("ownerUid", "==", uid),
    limit(1)
  );
  const snap = await getDocs(qy);
  if(snap.empty) return null;
  const d = snap.docs[0];
  return { ref: d.ref, data: d.data() || {} };
}

async function loadMine(uid, email){
  setText("mpMeta", "내 정보를 불러오는 중…");
  setText("mpStatus", "");

  _userRef = doc(db, "users", uid);

  // 1) applications_jobseeker에서 내 문서(ownerUid) 우선 로드
  let src = null;
  try{
    src = await findMyApplication(uid);
  }catch(e){
    console.error("findMyApplication error:", e);
  }

  // 2) users/{uid}도 읽어서 부족한 필드는 채움
  let userSnap = null;
  try{
    userSnap = await getDoc(_userRef);
  }catch(e){
    console.warn("users/{uid} read error:", e);
  }

  const a = src?.data || {};
  const u = userSnap?.exists() ? (userSnap.data() || {}) : {};

  _appRef = src?.ref || null;

  // 폼 채우기: applications_jobseeker → users/{uid} 순서로 fallback
  const name = pickFirst(a, ["name"]) || pickFirst(u, ["name"]);
  const phone = pickFirst(a, ["phone"]) || pickFirst(u, ["phone"]);
  const category = pickFirst(a, ["category"]) || pickFirst(u, ["category"]);
  const provCode = pickFirst(a, ["provinceCode"]) || pickFirst(u, ["provinceCode"]);
  const city = pickFirst(a, ["city"]) || pickFirst(u, ["city"]) || pickFirst(a, ["district"]) || pickFirst(u, ["district"]);
  const photo = pickFirst(a, ["photo"]) || pickFirst(u, ["photo"]);
  const skills = pickFirst(a, ["skills"]) || pickFirst(u, ["skills"]);
  const profile = pickFirst(a, ["profile"]) || pickFirst(u, ["profile"]);

  setVal("mpName", name);
  setVal("mpPhone", phone);
  setVal("mpCategory", category);
  setVal("mpProvince", provCode);
  setVal("mpCity", city);
  setVal("mpPhoto", photo);
  setVal("mpSkills", skills);
  setVal("mpProfile", profile);

  const whereTxt = provCode ? `${provinceNameOf(provCode)} ${city ? "(" + city + ")" : ""}` : (city || "-");
  const srcTxt = _appRef ? "applications_jobseeker 기반" : "users/{uid} 기반";
  setText("mpMeta", `${srcTxt} 로드 완료 · ${whereTxt}`);

  // 만약 applications 문서가 없는데 users/{uid}도 없으면 최초 안내
  if(!_appRef && !(userSnap && userSnap.exists())){
    setText("mpStatus", "아직 저장된 내 문서가 없습니다. 입력 후 저장하면 생성됩니다.");
  }
}

function buildPayload(uid, email){
  const provinceCode = val("mpProvince");
  const provinceName = provinceNameOf(provinceCode);

  return {
    ownerUid: uid,
    ownerEmail: email || "",
    name: val("mpName"),
    phone: val("mpPhone"),
    category: val("mpCategory"),
    provinceCode,
    provinceName,
    city: val("mpCity"),
    photo: val("mpPhoto"),
    skills: val("mpSkills"),
    profile: val("mpProfile"),
    updatedAt: serverTimestamp()
  };
}

async function saveMine(uid, email){
  const btn = $("btnSave");
  if(btn) btn.disabled = true;
  setText("mpStatus", "저장 중…");

  const payload = buildPayload(uid, email);

  // 1) applications_jobseeker 업데이트(있으면 update, 없으면 새 문서 생성)
  try{
    if(_appRef){
      await updateDoc(_appRef, payload);
    }else{
      // 내 applications 문서가 없으면 새로 만들기
      const newRef = doc(collection(db, "applications_jobseeker"));
      await setDoc(newRef, {
        ...payload,
        createdAt: serverTimestamp(),
        status: "approved"
      }, { merge: true });
      _appRef = newRef;
    }
  }catch(e){
    console.error("applications_jobseeker save error:", e);
    setText("mpStatus", "저장 실패(applications_jobseeker). rules 확인 필요");
    if(btn) btn.disabled = false;
    return;
  }

  // 2) users/{uid} 동기화(없으면 생성)
  try{
    await setDoc(_userRef, {
      ...payload,
      createdAt: serverTimestamp()
    }, { merge: true });
  }catch(e){
    console.error("users/{uid} save error:", e);
    setText("mpStatus", "저장 실패(users/{uid}). rules 확인 필요");
    if(btn) btn.disabled = false;
    return;
  }

  setText("mpStatus", "저장 완료");
  if(btn) btn.disabled = false;
}

function bindUi(){
  $("btnReload")?.addEventListener("click", async ()=>{
    const u = auth.currentUser;
    if(!u) return;
    await loadMine(u.uid, u.email || "");
  });

  $("btnSave")?.addEventListener("click", async ()=>{
    const u = auth.currentUser;
    if(!u){
      alert("로그인이 필요합니다.");
      return;
    }
    await saveMine(u.uid, u.email || "");
  });
}

function boot(){
  fillProvinceSelect($("mpProvince"));
  bindUi();

  onAuthStateChanged(auth, async (user)=>{
    if(!user){
      alert("로그인이 필요합니다.");
      location.href = "./index.html";
      return;
    }
    await loadMine(user.uid, user.email || "");
  });
}

boot();
