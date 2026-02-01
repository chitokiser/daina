// /public/assets/js/profilePage.js
import { db } from "./firebaseApp.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function esc(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function qs(name){
  const u = new URL(location.href);
  return u.searchParams.get(name);
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

function setText(id, v){
  const el = document.getElementById(id);
  if(el) el.textContent = v ?? "";
}

function setHTML(id, html){
  const el = document.getElementById(id);
  if(el) el.innerHTML = html;
}

async function loadProfile(){
  const id = qs("id");
  const statusEl = document.getElementById("profileStatus");

  if(!id){
    if(statusEl) statusEl.textContent = "잘못된 접근입니다. (id 없음)";
    return;
  }

  try{
    const ref = doc(db, "users", id);
    const snap = await getDoc(ref);

    if(!snap.exists()){
      if(statusEl) statusEl.textContent = "해당 인력 정보를 찾을 수 없습니다.";
      return;
    }

    const u = snap.data() || {};
    const approved = (u.approved === true);

    const img = resolvePhoto(u);
    const imgEl = document.getElementById("profileAvatar");
    if(imgEl){
      imgEl.src = img;
      imgEl.onerror = () => { imgEl.src = "./assets/images/jobseeker/1.png"; };
    }

    setText("profileName", u.name || "-");
    setText("profileUserId", u.userId || id);
    setText("profileCategory", catLabel(u.category));
    setText("profileWork", workLabel(u.workStatus));
    setText("profileRatingNum", (typeof u.rating === "number") ? u.rating.toFixed(1) : (Number(u.rating)||0).toFixed(1));
    setText("profileStars", ratingStars(u.rating));

    const curA = [u.curProvinceLabel, u.curCityLabel].filter(Boolean).join(" · ");
    const workA = [u.workProvinceLabel, u.workCityLabel].filter(Boolean).join(" · ");

    const curB = [
      u.currentRegion?.provinceName,
      u.currentRegion?.city || u.currentRegion?.cityText
    ].filter(Boolean).join(" · ");

    const workB = [
      u.workRegion?.provinceName,
      u.workRegion?.city || u.workRegion?.cityText
    ].filter(Boolean).join(" · ");

    setText("profileCurrentRegion", curA || curB || "-");
    setText("profileWorkRegion", workA || workB || "-");

    setText("profileSkills", u.skills || "-");

    const profileText = u.profile || "";
    setHTML("profileDesc", profileText ? esc(profileText).replaceAll("\n","<br/>") : "프로필 정보가 없습니다.");

    if(statusEl){
      statusEl.textContent = approved ? "" : "현재 승인 대기중입니다. 승인 후 공개 정보가 확정됩니다.";
    }

  }catch(e){
    console.error("profile read error:", e);
    if(statusEl) statusEl.textContent = "프로필 로딩 실패 (콘솔 오류 확인)";
  }
}

loadProfile();

