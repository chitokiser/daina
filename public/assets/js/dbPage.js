// /public/assets/js/dbPage.js
// 인력 DB: 필터/검색/정렬(클라이언트 정렬로 인덱스 없이 동작)

import { db } from "./firebaseApp.js";
import {
  collection,
  query,
  where,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CATS = [
  ["", "전체"],
  ["domestic_tech","베트남기술직"],
  ["domestic_student","베트남단순생산직"],
  ["domestic_service","베트남서비스직"],
  ["vn_housekeeping","베트남가사도우미"],
  ["vn_vehicle","베트남지입차량"],
  ["korean_expat","한국기술직"],
  ["seasonal_worker","한국계절근로자"],
  ["koreaservice","한국서비스직"]
];

function esc(s){
  return String(s||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function catLabel(v){
  switch(v){
    case "domestic_tech": return "베트남기술직";
    case "domestic_student": return "베트남단순생산직";
    case "domestic_service": return "베트남서비스직";
    case "vn_housekeeping": return "베트남가사도우미";
    case "vn_vehicle": return "베트남지입차량";
    case "korean_expat": return "한국기술직";
    case "seasonal_worker": return "한국계절근로자";
    case "koreaservice": return "한국서비스직";
    default: return v || "-";
  }
}

function workLabel(v){
  switch(v){
    case "available": return "가능";
    case "working": return "근무중";
    case "leave": return "휴직";
    case "unknown": return "미정";
    default: return v || "-";
  }
}

function ratingStars(r){
  const n = Math.max(0, Math.min(5, Math.round((Number(r)||0))));
  return "★★★★★☆☆☆☆☆".slice(5-n, 10-n);
}

function normalizePhotoPath(photo){
  if(!photo) return null;
  let p = String(photo).trim();
  if(!p) return null;
  p = p.replaceAll("\\", "/");

  const idxPublic = p.toLowerCase().lastIndexOf("/public/");
  if(idxPublic >= 0){
    p = p.slice(idxPublic + "/public/".length);
  }

  if(p.startsWith("/")) p = p.slice(1);

  if(p.startsWith("assets/")) return "./" + p;
  if(p.startsWith("./assets/")) return p;
  return null;
}

// 승인 전에는 기본 이미지 고정
function resolvePhoto(u){
  const approved = (u?.approved === true);
  if(!approved) return "./assets/images/jobseeker/1.png";

  const fromDb = normalizePhotoPath(u?.photo);
  return fromDb || "./assets/images/jobseeker/1.png";
}

function readVal(id){
  return (document.getElementById(id)?.value || "").trim();
}

function setMeta(text){
  const el = document.getElementById("resultMeta");
  if(el) el.textContent = text || "";
}

function fillCategorySelect(){
  const sel = document.getElementById("fCategory");
  if(!sel) return;
  sel.innerHTML = CATS.map(([v,l])=>`<option value="${esc(v)}">${esc(l)}</option>`).join("");
}

function renderCards(list){
  const root = document.getElementById("cards");
  if(!root) return;

  if(!list.length){
    root.innerHTML = `<div class="muted">검색 결과가 없습니다.</div>`;
    return;
  }

  root.innerHTML = list.map((u)=>{
    const img = esc(resolvePhoto(u));
    const name = esc(u.name || "-");
    const userId = esc(u.userId || "");
    const cat = esc(catLabel(u.category));
    const work = esc(workLabel(u.workStatus));
    const ratingNum = (typeof u.rating === "number") ? u.rating : (Number(u.rating)||0);
    const rating = ratingNum.toFixed(1);

    const curA = [u.curProvinceLabel, u.curCityLabel].filter(Boolean).join(" · ");
    const workA = [u.workProvinceLabel, u.workCityLabel].filter(Boolean).join(" · ");
    const curB = [u.currentRegion?.provinceName, u.currentRegion?.city || u.currentRegion?.cityText].filter(Boolean).join(" · ");
    const workB = [u.workRegion?.provinceName, u.workRegion?.city || u.workRegion?.cityText].filter(Boolean).join(" · ");

    const curText = curA || curB || "";
    const workText = workA || workB || "";

    const sub = [
      cat,
      work,
      curText ? ("거주: " + esc(curText)) : null,
      workText ? ("근무: " + esc(workText)) : null
    ].filter(Boolean).join(" · ");

    return `
      <a class="card person-card" href="./profile.html?id=${encodeURIComponent(u.userId||"")}" aria-label="${name} 상세보기">
        <div class="avatar">
          <img src="${img}" alt="${name}" loading="lazy"
            onerror="this.onerror=null;this.src='./assets/images/jobseeker/1.png';" />
        </div>
        <div class="meta">
          <div class="title-row">
            <div class="name">${name}</div>
            <div class="pill">${userId}</div>
          </div>
          <div class="sub">${sub}</div>
          <div class="rating">
            <span class="stars" aria-hidden="true">${ratingStars(ratingNum)}</span>
            <span class="num">${esc(rating)}</span>
          </div>
        </div>
      </a>
    `;
  }).join("");
}

// 키워드(이름/아이디/스킬/프로필) 클라이언트 필터
function keywordFilter(items, kw){
  const q = (kw || "").trim().toLowerCase();
  if(!q) return items;

  return items.filter((u)=>{
    const hay = [
      u.userId,
      u.name,
      u.skills,
      u.profile,
      catLabel(u.category),
      workLabel(u.workStatus)
    ].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  });
}

function parseIsoMs(v){
  if(!v) return 0;
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? t : 0;
}

function sortLabel(sortKey){
  switch(sortKey){
    case "updated_desc": return "최근수정순";
    case "rating_desc": return "평점 높은순";
    case "rating_asc": return "평점 낮은순";
    case "name_asc": return "이름순";
    case "newest":
    default: return "최신순";
  }
}

function applySort(list, sortKey){
  const a = [...list];

  switch(sortKey){
    case "updated_desc":
      a.sort((x,y)=> parseIsoMs(y.updatedAt) - parseIsoMs(x.updatedAt));
      break;
    case "rating_desc":
      a.sort((x,y)=> (Number(y.rating)||0) - (Number(x.rating)||0));
      break;
    case "rating_asc":
      a.sort((x,y)=> (Number(x.rating)||0) - (Number(y.rating)||0));
      break;
    case "name_asc":
      a.sort((x,y)=> String(x.name||"").localeCompare(String(y.name||""), "ko"));
      break;
    case "newest":
    default:
      a.sort((x,y)=> parseIsoMs(y.createdAt) - parseIsoMs(x.createdAt));
      break;
  }

  return a;
}

async function loadDB(){
  const cat = readVal("fCategory");
  const work = readVal("fWork");
  const kw = readVal("fQuery");
  const sortKey = readVal("fSort") || "newest";

  setMeta("로딩중…");

  try{
    // Firestore 복합 인덱스 의존 제거: orderBy 없이 가져와서 클라이언트에서 정렬
    const wheres = [ where("approved", "==", true) ];
    if(cat) wheres.push(where("category", "==", cat));
    if(work) wheres.push(where("workStatus", "==", work));

    const q = query(
      collection(db, "users"),
      ...wheres,
      limit(500)
    );

    const snap = await getDocs(q);
    const items = [];
    snap.forEach((d)=>{
      const v = d.data() || {};
      items.push(v);
    });

    const filtered = keywordFilter(items, kw);
    const sorted = applySort(filtered, sortKey);

    setMeta(`결과: ${sorted.length}명 · 정렬: ${sortLabel(sortKey)}`);
    renderCards(sorted);
  }catch(e){
    console.error("db read error:", e);
    const msg = String(e?.message || "");

    if(msg.includes("Missing or insufficient permissions")){
      setMeta("권한 문제로 로딩 실패. rules 또는 로그인 상태를 확인하세요.");
    }else{
      setMeta("데이터 로딩 실패 (콘솔 확인)");
    }

    const root = document.getElementById("cards");
    if(root) root.innerHTML = `<div class="muted">데이터 로딩 실패</div>`;
  }
}

function resetFilters(){
  const cat = document.getElementById("fCategory");
  const sort = document.getElementById("fSort");
  const work = document.getElementById("fWork");
  const q = document.getElementById("fQuery");

  if(cat) cat.value = "";
  if(sort) sort.value = "newest";
  if(work) work.value = "";
  if(q) q.value = "";
}

function bindUI(){
  document.getElementById("btnSearch")?.addEventListener("click", loadDB);
  document.getElementById("btnReset")?.addEventListener("click", ()=>{
    resetFilters();
    loadDB();
  });

  // 드롭다운 바뀌면 자동 조회
  document.getElementById("fCategory")?.addEventListener("change", loadDB);
  document.getElementById("fWork")?.addEventListener("change", loadDB);
  document.getElementById("fSort")?.addEventListener("change", loadDB);

  // 엔터 검색
  document.getElementById("fQuery")?.addEventListener("keydown", (e)=>{
    if(e.key === "Enter") loadDB();
  });
}

fillCategorySelect();
bindUI();
loadDB();
