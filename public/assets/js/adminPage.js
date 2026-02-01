// /public/assets/js/adminPage.js
import { db } from "./firebaseApp.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  query,
  limit,
  getDocs,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function esc(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function setText(id, text){
  const el = document.getElementById(id);
  if(el) el.textContent = text ?? "";
}

function setBadge(ok, text){
  const el = document.getElementById("adminBadge");
  if(!el) return;
  el.classList.remove("ok", "no");
  el.classList.add(ok ? "ok" : "no");
  el.textContent = text;
}

async function isAdmin(uid){
  if(!uid) return false;
  const ref = doc(db, "roles", uid);
  const snap = await getDoc(ref);
  return snap.exists() && snap.data()?.admin === true;
}

function normalizeStr(v){
  return String(v ?? "").trim();
}

function includesQ(hay, q){
  if(!q) return true;
  return hay.toLowerCase().includes(q.toLowerCase());
}

function toMillis(v){
  if(!v) return 0;

  // Firestore Timestamp 타입 방어
  if(typeof v === "object"){
    if(typeof v.toMillis === "function") return v.toMillis();
    if(typeof v.seconds === "number") return v.seconds * 1000;
  }

  // ISO string, number 방어
  if(typeof v === "number") return v;
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? t : 0;
}

function fmtDate(v){
  const t = toMillis(v);
  if(!t) return "-";
  const d = new Date(t);
  const yy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  const hh = String(d.getHours()).padStart(2,"0");
  const mi = String(d.getMinutes()).padStart(2,"0");
  return `${yy}-${mm}-${dd} ${hh}:${mi}`;
}

function renderEmpty(rootId, msg){
  const root = document.getElementById(rootId);
  if(root) root.innerHTML = `<div class="muted">${esc(msg || "결과가 없습니다.")}</div>`;
}

function attachActions(){
  // 구직 승인
  document.querySelectorAll("[data-act='approve-apply']").forEach((btn)=>{
    btn.addEventListener("click", async ()=>{
      const id = btn.getAttribute("data-id");
      if(!id) return;
      btn.disabled = true;
      try{
        await updateDoc(doc(db, "applications_jobseeker", id), {
          status: "approved",
          approvedAt: serverTimestamp()
        });
      }catch(e){
        console.error(e);
        alert("승인 실패 (콘솔 확인)");
      }finally{
        btn.disabled = false;
        await loadAll();
      }
    });
  });

  // 구직 제외
  document.querySelectorAll("[data-act='reject-apply']").forEach((btn)=>{
    btn.addEventListener("click", async ()=>{
      const id = btn.getAttribute("data-id");
      if(!id) return;
      const ok = confirm("대기 목록에서 제외 처리할까요? (status=rejected)");
      if(!ok) return;

      btn.disabled = true;
      try{
        await updateDoc(doc(db, "applications_jobseeker", id), {
          status: "rejected",
          rejectedAt: serverTimestamp()
        });
      }catch(e){
        console.error(e);
        alert("처리 실패 (콘솔 확인)");
      }finally{
        btn.disabled = false;
        await loadAll();
      }
    });
  });

  // 연락 요청 처리완료
  document.querySelectorAll("[data-act='done-contact']").forEach((btn)=>{
    btn.addEventListener("click", async ()=>{
      const id = btn.getAttribute("data-id");
      if(!id) return;
      btn.disabled = true;
      try{
        await updateDoc(doc(db, "contacts", id), {
          status: "done",
          doneAt: serverTimestamp()
        });
      }catch(e){
        console.error(e);
        alert("처리 실패 (콘솔 확인)");
      }finally{
        btn.disabled = false;
        await loadAll();
      }
    });
  });

  // 연락 요청 다시 열기
  document.querySelectorAll("[data-act='open-contact']").forEach((btn)=>{
    btn.addEventListener("click", async ()=>{
      const id = btn.getAttribute("data-id");
      if(!id) return;
      btn.disabled = true;
      try{
        await updateDoc(doc(db, "contacts", id), {
          status: "open",
          reopenedAt: serverTimestamp()
        });
      }catch(e){
        console.error(e);
        alert("처리 실패 (콘솔 확인)");
      }finally{
        btn.disabled = false;
        await loadAll();
      }
    });
  });
}

async function fetchApplications(){
  const ref = collection(db, "applications_jobseeker");
  const q = query(ref, limit(500));
  const snap = await getDocs(q);

  const items = [];
  snap.forEach((d)=>{
    items.push({ id: d.id, ...(d.data() || {}) });
  });

  // createdAt 후보들을 millis로 정렬
  items.sort((a,b)=>{
    const aa = a.createdAt ?? a.created_at ?? a.submittedAt ?? a.timestamp ?? a.createdAtTs ?? a.createdAtTS;
    const bb = b.createdAt ?? b.created_at ?? b.submittedAt ?? b.timestamp ?? b.createdAtTs ?? b.createdAtTS;
    return toMillis(bb) - toMillis(aa);
  });

  return items;
}

function mapApplyStatus(v){
  const s = normalizeStr(v?.status);
  if(s) return s;
  if(v?.approved === true) return "approved";
  return "pending";
}

function renderApplications(all){
  const root = document.getElementById("applyList");
  if(!root) return;

  const filter = document.getElementById("applyFilter")?.value || "pending";
  const q = normalizeStr(document.getElementById("applyQuery")?.value);

  const items = all
    .map((x)=> ({ ...x, _status: mapApplyStatus(x) }))
    .filter((x)=>{
      if(filter === "all") return true;
      return x._status === filter;
    })
    .filter((x)=>{
      if(!q) return true;
      const hay = [
        x.name, x.email, x.phone,
        x.kakao, x.telegram, x.memo,
        x.category, x.workStatus
      ].filter(Boolean).join(" ");
      return includesQ(hay, q);
    });

  setText("applyMeta", `총 ${items.length}건 (필터: ${filter})`);

  if(!items.length){
    renderEmpty("applyList", "구직 신청 데이터가 없습니다.");
    return;
  }

  root.innerHTML = items.map((x)=>{
    const name = esc(x.name || "-");
    const email = esc(x.email || "");
    const phone = esc(x.phone || "");
    const cat = esc(x.category || "");
    const work = esc(x.workStatus || "");
    const status = esc(x._status || "");
    const createdAt = x.createdAt ?? x.created_at ?? x.submittedAt ?? x.timestamp ?? x.createdAtTs ?? x.createdAtTS;
    const when = fmtDate(createdAt);
    const msg = esc(x.memo || x.message || x.profile || "");

    const canApprove = (x._status === "pending");
    const canReject = (x._status === "pending");

    return `
      <div class="item">
        <div class="left">
          <p class="title">${name}</p>
          <div class="meta">
            <span class="pill">status: ${status || "pending"}</span>
            ${cat ? `<span class="pill">${cat}</span>` : ``}
            ${work ? `<span class="pill">${work}</span>` : ``}
            <span class="pill">${esc(when)}</span>
          </div>
          <div class="desc">${msg || `<span class="muted">메모/메시지 없음</span>`}</div>
          <div class="meta">
            ${email ? `<a class="link" href="mailto:${email}">${email}</a>` : `<span class="muted">email 없음</span>`}
            ${phone ? `<a class="link" href="tel:${phone}">${phone}</a>` : ``}
          </div>
        </div>

        <div class="right">
          ${canApprove ? `<button class="btn blue" data-act="approve-apply" data-id="${esc(x.id)}" type="button">승인</button>` : ``}
          ${canReject ? `<button class="btn" data-act="reject-apply" data-id="${esc(x.id)}" type="button">제외</button>` : ``}
          <span class="pill">${esc(x.id)}</span>
        </div>
      </div>
    `;
  }).join("");

  attachActions();
}

async function fetchContacts(){
  const ref = collection(db, "contacts");
  const q = query(ref, limit(500));
  const snap = await getDocs(q);

  const items = [];
  snap.forEach((d)=>{
    items.push({ id: d.id, ...(d.data() || {}) });
  });

  items.sort((a,b)=>{
    const aa = a.createdAt ?? a.created_at ?? a.sentAt ?? a.timestamp ?? a.createdAtTs ?? a.createdAtTS;
    const bb = b.createdAt ?? b.created_at ?? b.sentAt ?? b.timestamp ?? b.createdAtTs ?? b.createdAtTS;
    return toMillis(bb) - toMillis(aa);
  });

  return items;
}

function mapContactStatus(v){
  const s = normalizeStr(v?.status);
  if(s) return s;
  if(v?.done === true) return "done";
  return "open";
}

function renderContacts(all){
  const root = document.getElementById("contactList");
  if(!root) return;

  const filter = document.getElementById("contactFilter")?.value || "open";
  const q = normalizeStr(document.getElementById("contactQuery")?.value);

  const items = all
    .map((x)=> ({ ...x, _status: mapContactStatus(x) }))
    .filter((x)=>{
      if(filter === "all") return true;
      return x._status === filter;
    })
    .filter((x)=>{
      if(!q) return true;
      const hay = [
        x.name, x.email, x.phone,
        x.message, x.memo, x.userId, x.targetUserId
      ].filter(Boolean).join(" ");
      return includesQ(hay, q);
    });

  setText("contactMeta", `총 ${items.length}건 (필터: ${filter})`);

  if(!items.length){
    renderEmpty("contactList", "연락 요청 데이터가 없습니다.");
    return;
  }

  root.innerHTML = items.map((x)=>{
    const name = esc(x.name || x.fromName || "-");
    const email = esc(x.email || x.fromEmail || "");
    const phone = esc(x.phone || x.fromPhone || "");
    const status = esc(x._status || "open");
    const createdAt = x.createdAt ?? x.created_at ?? x.sentAt ?? x.timestamp ?? x.createdAtTs ?? x.createdAtTS;
    const when = fmtDate(createdAt);
    const msg = esc(x.message || x.memo || "");

    const from = esc(x.userId || x.fromUserId || "");
    const target = esc(x.targetUserId || x.toUserId || "");

    const canDone = (x._status === "open");
    const canOpen = (x._status === "done");

    return `
      <div class="item">
        <div class="left">
          <p class="title">${name}</p>
          <div class="meta">
            <span class="pill">status: ${status}</span>
            <span class="pill">${esc(when)}</span>
            ${from ? `<span class="pill">from: ${from}</span>` : ``}
            ${target ? `<span class="pill">to: ${target}</span>` : ``}
          </div>
          <div class="desc">${msg || `<span class="muted">메시지 없음</span>`}</div>
          <div class="meta">
            ${email ? `<a class="link" href="mailto:${email}">${email}</a>` : `<span class="muted">email 없음</span>`}
            ${phone ? `<a class="link" href="tel:${phone}">${phone}</a>` : ``}
          </div>
        </div>

        <div class="right">
          ${canDone ? `<button class="btn blue" data-act="done-contact" data-id="${esc(x.id)}" type="button">처리완료</button>` : ``}
          ${canOpen ? `<button class="btn" data-act="open-contact" data-id="${esc(x.id)}" type="button">다시열기</button>` : ``}
          <span class="pill">${esc(x.id)}</span>
        </div>
      </div>
    `;
  }).join("");

  attachActions();
}

let _cacheApplies = [];
let _cacheContacts = [];

async function loadAll(){
  try{
    setText("applyMeta", "로딩중…");
    setText("contactMeta", "로딩중…");

    const [a, c] = await Promise.all([fetchApplications(), fetchContacts()]);
    _cacheApplies = a;
    _cacheContacts = c;

    renderApplications(_cacheApplies);
    renderContacts(_cacheContacts);
  }catch(e){
    console.error(e);
    setText("applyMeta", "로드 실패 (콘솔 확인)");
    setText("contactMeta", "로드 실패 (콘솔 확인)");
    renderEmpty("applyList", "로드 실패");
    renderEmpty("contactList", "로드 실패");
  }
}

function bindUi(){
  document.getElementById("btnRefresh")?.addEventListener("click", loadAll);

  document.getElementById("btnApplySearch")?.addEventListener("click", ()=>renderApplications(_cacheApplies));
  document.getElementById("applyFilter")?.addEventListener("change", ()=>renderApplications(_cacheApplies));
  document.getElementById("applyQuery")?.addEventListener("keydown", (e)=>{
    if(e.key === "Enter") renderApplications(_cacheApplies);
  });

  document.getElementById("btnContactSearch")?.addEventListener("click", ()=>renderContacts(_cacheContacts));
  document.getElementById("contactFilter")?.addEventListener("change", ()=>renderContacts(_cacheContacts));
  document.getElementById("contactQuery")?.addEventListener("keydown", (e)=>{
    if(e.key === "Enter") renderContacts(_cacheContacts);
  });
}

function boot(){
  bindUi();

  const auth = getAuth();
  onAuthStateChanged(auth, async (user)=>{
    if(!user){
      setBadge(false, "로그인이 필요합니다.");
      alert("로그인이 필요합니다.");
      location.href = "./index.html";
      return;
    }

    try{
      const ok = await isAdmin(user.uid);
      if(!ok){
        setBadge(false, "관리자 권한 없음");
        alert("관리자 권한이 없습니다.");
        location.href = "./index.html";
        return;
      }
      setBadge(true, "관리자 권한 확인됨");
      await loadAll();
    }catch(e){
      console.error(e);
      setBadge(false, "권한 확인 실패");
      alert("권한 확인 실패 (콘솔 확인)");
      location.href = "./index.html";
    }
  });
}

boot();
