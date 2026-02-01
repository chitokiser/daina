// /public/assets/js/indexPage.js
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

/*
  Firebase(users.photo)에 저장된 값을 “웹 경로”로 정규화
  허용 예:
  - ./assets/images/jobseeker/63.png
  - /assets/images/jobseeker/63.png
  - assets/images/jobseeker/63.png

  불가(브라우저에서 직접 접근 불가):
  - C:\Users\...\public\assets\images\jobseeker\63.png
  - C:/Users/.../public/assets/images/jobseeker/63.png

  위 같은 절대경로가 들어와도 /public 이후를 잘라서 ./assets/... 로 변환 시도
*/
function normalizePhotoPath(photo){
  if(!photo) return null;

  let p = String(photo).trim();
  if(!p) return null;

  // 백슬래시 -> 슬래시
  p = p.replaceAll("\\", "/");

  // 절대경로에 /public/ 포함되면 그 뒤만 사용
  const idxPublic = p.toLowerCase().lastIndexOf("/public/");
  if(idxPublic >= 0){
    p = p.slice(idxPublic + "/public/".length); // assets/images/...
  }

  // 앞에 슬래시 제거/보정
  if(p.startsWith("/")) p = p.slice(1); // assets/...

  // assets로 시작하면 ./ 붙이기
  if(p.startsWith("assets/")) return "./" + p;

  // ./assets로 시작하면 그대로
  if(p.startsWith("./assets/")) return p;

  // 혹시 /assets/ 로 들어온 케이스는 위에서 슬래시 제거했으므로 assets/가 됨

  // 그 외는 안전하게 null
  return null;
}

// 승인 전에는 기본 이미지 고정
function resolvePhoto(u){
  const approved = (u?.approved === true);
  if(!approved) return "./assets/images/jobseeker/1.png";

  const fromDb = normalizePhotoPath(u?.photo);
  return fromDb || "./assets/images/jobseeker/1.png";
}

async function loadNotices(){
  const el = document.getElementById("noticeList");
  if(!el) return;

  try{
    const q = query(collection(db,"notices"), orderBy("createdAt","desc"), limit(10));
    const snap = await getDocs(q);

    if(snap.empty){
      el.innerHTML = `<li>공지 1.</li><li>공지 2.</li><li>공지 3.</li>`;
      return;
    }

    el.innerHTML = "";
    snap.forEach((doc)=>{
      const d = doc.data() || {};
      el.insertAdjacentHTML("beforeend", `<li>${esc(d.title||"")}</li>`);
    });
  }catch(e){
    console.error("notices read error:", e);
    el.innerHTML = `<li class="muted">공지 로딩 실패</li>`;
  }
}

async function loadTop100(){
  const root = document.getElementById("topCards");
  if(!root) return;

  try{
    const q = query(
      collection(db,"users"),
      where("approved","==", true),
      orderBy("rating","desc"),
      limit(100)
    );

    const snap = await getDocs(q);
    console.log("users count:", snap.size);

    if(snap.empty){
      root.innerHTML = "<div class='muted'>데이터가 없습니다. (승인된 유저가 0명)</div>";
      return;
    }

    const items = [];
    snap.forEach((doc)=>items.push(doc.data()||{}));

    root.innerHTML = items.map((u, idx)=>{
      const img = esc(resolvePhoto(u));
      const name = esc(u.name || "-");
      const userId = esc(u.userId || "");
      const cat = esc(catLabel(u.category));
      const work = esc(workLabel(u.workStatus));
      const rating = (typeof u.rating === "number") ? u.rating.toFixed(1) : (Number(u.rating)||0).toFixed(1);

      const cur = [u.curProvinceLabel, u.curCityLabel].filter(Boolean).join(" · ");
      const workArea = [u.workProvinceLabel, u.workCityLabel].filter(Boolean).join(" · ");

      const sub = [
        cat,
        work,
        cur ? ("거주: " + esc(cur)) : null,
        workArea ? ("근무: " + esc(workArea)) : null
      ].filter(Boolean).join(" · ");

      return `
        <a class="card person-card" href="./profile.html?id=${encodeURIComponent(u.userId||"")}" aria-label="${name} 상세보기">
          <div class="avatar">
            <img src="${img}" alt="${name}" loading="lazy"
              onerror="this.onerror=null;this.src='./assets/images/jobseeker/1.png';" />
          </div>
          <div class="meta">
            <div class="title-row">
              <div class="name">${idx+1}. ${name}</div>
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
  }catch(e){
    console.error("top100 read error:", e);
    root.innerHTML = "<div class='muted'>Top100 로딩 실패 (콘솔 오류 확인)</div>";
  }
}

loadNotices();
loadTop100();
