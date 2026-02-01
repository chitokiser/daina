// /public/assets/js/dbPage.js
import { db } from "./firebaseApp.js";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

function setMsg(text){
  const el = document.getElementById("dbStatus");
  if(el) el.textContent = text || "";
}

function renderCards(list){
  const root = document.getElementById("dbCards");
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
    const rating = (typeof u.rating === "number") ? u.rating.toFixed(1) : (Number(u.rating)||0).toFixed(1);

    const cur = [
      u.curProvinceLabel, u.curCityLabel
    ].filter(Boolean).join(" · ");

    const workArea = [
      u.workProvinceLabel, u.workCityLabel
    ].filter(Boolean).join(" · ");

    const curB = [
      u.currentRegion?.provinceName,
      u.currentRegion?.city || u.currentRegion?.cityText
    ].filter(Boolean).join(" · ");

    const workB = [
      u.workRegion?.provinceName,
      u.workRegion?.city || u.workRegion?.cityText
    ].filter(Boolean).join(" · ");

    const curText = cur || curB || "";
    const workText = workArea || workB || "";

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
            <span class="stars" aria-hidden="true">${ratingStars(rating)}</span>
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
      u.userId, u.name, u.skills, u.profile,
      catLabel(u.category),
      workLabel(u.workStatus)
    ].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  });
}

// 정렬 옵션
// rating_desc, rating_asc, newest, name_asc
function buildSort(sortKey){
  switch(sortKey){
    case "rating_asc":
      return { field: "rating", dir: "asc", label: "평점 낮은순" };
    case "newest":
      return { field: "createdAt", dir: "desc", label: "최신순" };
    case "name_asc":
      return { field: "name", dir: "asc", label: "이름순" };
    case "rating_desc":
    default:
      return { field: "rating", dir: "desc", label: "평점 높은순" };
  }
}

async function loadDB(){
  const cat = readVal("dbCategory");      // select
  const work = readVal("dbWorkStatus");   // select
  const kw = readVal("dbKeyword");        // input
  const sortKey = readVal("dbSort") || "rating_desc";

  const sort = buildSort(sortKey);

  setMsg("로딩중…");

  try{
    const wheres = [ where("approved", "==", true) ];
    if(cat) wheres.push(where("category", "==", cat));
    if(work) wheres.push(where("workStatus", "==", work));

    const q = query(
      collection(db, "users"),
      ...wheres,
      orderBy(sort.field, sort.dir),
      limit(200)
    );

    const snap = await getDocs(q);

    const items = [];
    snap.forEach((d)=> items.push(d.data() || {}));

    const filtered = keywordFilter(items, kw);

    setMsg(`결과: ${filtered.length}명 (정렬: ${sort.label})`);
    renderCards(filtered);
  }catch(e){
    console.error("db read error:", e);

    // 인덱스가 필요한 경우: 콘솔에 링크가 뜨지만, 사용자 화면에도 안내
    const msg = String(e?.message || "");
    if(msg.includes("requires an index")){
      setMsg("정렬/필터 조합에 필요한 Firestore 복합 인덱스가 없습니다. 콘솔 오류 메시지의 링크로 인덱스를 생성하세요.");
    }else if(msg.includes("Missing or insufficient permissions")){
      setMsg("권한 문제로 로딩 실패. rules 또는 로그인 상태를 확인하세요.");
    }else{
      setMsg("데이터 로딩 실패 (콘솔 확인)");
    }

    const root = document.getElementById("dbCards");
    if(root) root.innerHTML = `<div class="muted">데이터 로딩 실패</div>`;
  }
}

function bindUI(){
  document.getElementById("btnSearch")?.addEventListener("click", loadDB);

  // 드롭다운 바뀌면 자동 조회(원하면 제거 가능)
  document.getElementById("dbCategory")?.addEventListener("change", loadDB);
  document.getElementById("dbWorkStatus")?.addEventListener("change", loadDB);
  document.getElementById("dbSort")?.addEventListener("change", loadDB);

  // 엔터 검색
  document.getElementById("dbKeyword")?.addEventListener("keydown", (e)=>{
    if(e.key === "Enter") loadDB();
  });
}

bindUI();
loadDB();
