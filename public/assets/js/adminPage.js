/* /public/assets/js/adminPage.js */
import { db } from "./firebaseApp.js";
import { getMyRole } from "./roles.js";
import {
  collection, query, orderBy, limit, getDocs, doc, setDoc, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function esc(s){
  return String(s||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function nowIso(){ return new Date().toISOString(); }

async function guard(){
  const guardEl = document.getElementById("adminGuard");
  const role = await getMyRole().catch(()=>null);
  if(role !== "admin"){
    if(guardEl) guardEl.textContent = "관리자만 접근 가능합니다. 관리자 계정으로 로그인하세요.";
    throw new Error("not admin");
  }
  if(guardEl) guardEl.textContent = "관리자 인증 완료";
}

async function loadPendingJobseekers(){
  const q = query(collection(db, "applications_jobseeker"), orderBy("createdAt","desc"), limit(100));
  const snap = await getDocs(q);
  const items=[];
  snap.forEach(d=> items.push({ id: d.id, ...d.data() }));
  return items.filter(x=> (x.status||"pending")==="pending");
}

function renderPending(items){
  const root = document.getElementById("pendingJobseekers");
  if(!root) return;
  if(!items.length){
    root.innerHTML = "<div class='muted'>대기중 신청이 없습니다.</div>";
    return;
  }
  root.innerHTML = items.map(x=>{
    const name = esc(x.name||"-");
    const cat = esc(x.category||"-");
    const uid = esc(x.ownerEmail||x.ownerUid||"-");
    const skills = esc(x.skills||"");
    return `
      <div class="panel" style="margin-top:10px; box-shadow:none;">
        <div class="hrow slim" style="margin:0 0 10px;">
          <div>
            <div class="h1" style="font-size:16px; margin:0;">${name}</div>
            <div class="sub">${cat} · ${uid}</div>
          </div>
          <button class="btn blue small" data-act="approve" data-id="${esc(x.id)}" type="button">승인</button>
        </div>
        <div class="muted" style="font-size:13px;">특기: ${skills}</div>
      </div>
    `;
  }).join("");

  root.querySelectorAll("button[data-act='approve']").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id = btn.getAttribute("data-id");
      btn.disabled = true;
      try{
        await approveJobseeker(id);
        alert("승인 완료");
        location.reload();
      }catch(e){
        console.error(e);
        alert("승인 실패: 콘솔 확인");
        btn.disabled = false;
      }
    });
  });
}

async function approveJobseeker(appId){
  const appRef = doc(db, "applications_jobseeker", appId);
  const snap = await getDoc(appRef);
  if(!snap.exists()) throw new Error("app missing");
  const a = snap.data();

  // userId: if provided use it else generate from category prefix
  const prefixMap = {
    domestic_tech: "vt",
    domestic_student: "vs",
    domestic_service: "vv",
    korean_expat: "kt",
    seasonal_worker: "kw",
    koreaservice: "ks"
  };
  let userId = (a.userId || "").trim();
  if(!userId){
    const px = prefixMap[a.category] || "u";
    userId = `${px}_${String(appId).slice(-4)}`;
  }

  const u = {
    userId,
    category: a.category || null,
    name: a.name || null,
    photo: a.photo || "/assets/images/jobseeker/1.png",
    profile: a.profile || "",
    skills: a.skills || "",
    workStatus: a.workStatus || "available",
    workDistanceKm: a.workDistanceKm ?? null,
    currentRegion: a.currentRegion || null,
    workRegion: a.workRegion || null,
    currentGeo: a.currentGeo || null,
    workGeo: a.workGeo || null,
    rating: 0,
    approved: true,
    ownerUid: a.ownerUid || null,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  const c = {
    userId,
    phone: a.contact?.phone || null,
    email: a.contact?.email || null,
    zalo: a.contact?.zalo || null,
    sns: a.contact?.sns || null,
    ownerUid: a.ownerUid || null,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  await setDoc(doc(db, "users", userId), u, { merge: false });
  await setDoc(doc(db, "contacts", userId), c, { merge: false });
  await updateDoc(appRef, { status: "approved", approvedUserId: userId, updatedAt: nowIso() });
}

async function loadRequests(){
  const q = query(collection(db, "contactRequests"), orderBy("createdAt","desc"), limit(200));
  const snap = await getDocs(q);
  const items=[];
  snap.forEach(d=> items.push({ id: d.id, ...d.data() }));
  return items;
}

async function getContact(userId){
  const ref = doc(db, "contacts", userId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

async function markRequest(id, status){
  await updateDoc(doc(db, "contactRequests", id), { status, updatedAt: nowIso(), decidedAt: nowIso() });
}

function renderRequests(items){
  const root = document.getElementById("reqList");
  if(!root) return;
  if(!items.length){
    root.innerHTML = "<div class='muted'>요청이 없습니다.</div>";
    return;
  }

  root.innerHTML = items.map(r=>{
    const t = `대상: ${esc(r.userId||"-")} / 구인자: ${esc(r.employerEmail||r.employerUid||"-")}`;
    const st = esc(r.status||"-");
    const msg = esc(r.message||"(메시지 없음)");
    return `
      <div class="panel" style="margin-top:10px; box-shadow:none;">
        <div class="hrow slim" style="margin:0 0 10px;">
          <div>
            <div class="h1" style="font-size:16px; margin:0;">${t}</div>
            <div class="sub">status: ${st}</div>
          </div>
          <a class="btn small ghost" href="./profile.html?id=${encodeURIComponent(r.userId||"")}">상세</a>
        </div>
        <div class="muted" style="font-size:13px; white-space:pre-wrap;">${msg}</div>
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px; align-items:center;">
          <button class="btn small ghost" data-act="show" data-id="${esc(r.id)}" data-user="${esc(r.userId||"")}">연락처 보기</button>
          <button class="btn small blue" data-act="done" data-id="${esc(r.id)}">매칭완료</button>
          <button class="btn small" data-act="reject" data-id="${esc(r.id)}">거절</button>
          <span class="muted" data-out="${esc(r.id)}"></span>
        </div>
      </div>
    `;
  }).join("");

  root.querySelectorAll("button[data-act]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const act = btn.getAttribute("data-act");
      const id = btn.getAttribute("data-id");
      const out = root.querySelector(`[data-out="${CSS.escape(id)}"]`);
      btn.disabled = true;
      try{
        if(act==="show"){
          const userId = btn.getAttribute("data-user");
          if(out) out.textContent = "조회중…";
          const c = await getContact(userId);
          if(!c){ if(out) out.textContent = "연락처 없음"; return; }
          if(out) out.textContent = `phone: ${c.phone||"-"} / email: ${c.email||"-"} / zalo: ${c.zalo||"-"}`;
        }
        if(act==="done"){
          await markRequest(id, "done");
          alert("매칭완료 처리했습니다.");
          location.reload();
        }
        if(act==="reject"){
          await markRequest(id, "rejected");
          alert("거절 처리했습니다.");
          location.reload();
        }
      }catch(e){
        console.error(e);
        alert("처리 실패: 콘솔 확인");
      }finally{
        btn.disabled = false;
      }
    });
  });
}

async function init(){
  await guard();
  const pend = await loadPendingJobseekers();
  renderPending(pend);

  const req = await loadRequests();
  renderRequests(req);
}

init().catch(e=>console.error(e));
