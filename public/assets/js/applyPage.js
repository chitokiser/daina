// /public/assets/js/applyPage.js
import { db, auth } from "./firebaseApp.js";
import { fillProvinceSelect, fillCitySelect } from "./regions.js";
import { addDoc, collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CATS = [
  ["domestic_tech","베트남기술직"],
  ["domestic_student","베트남단순생산직"],
  ["domestic_service","베트남서비스직"],
  ["vn_housekeeping","베트남가사도우미"],
  ["vn_vehicle","베트남지입차량"],
  ["korean_expat","한국기술직"],
  ["seasonal_worker","한국계절근로자"],
  ["koreaservice","한국서비스직"]
];

function nowIso(){ return new Date().toISOString(); }

function pickCatOptions(sel){
  if(!sel) return;
  sel.innerHTML =
    '<option value="">선택</option>' +
    CATS.map(([v,l])=>`<option value="${v}">${l}</option>`).join("");
}

function tabSwitch(next){
  document.querySelectorAll(".tab").forEach(b=>{
    b.classList.toggle("on", b.getAttribute("data-tab")===next);
  });
  const a = document.getElementById("tab_jobseeker");
  const b = document.getElementById("tab_employer");
  if(a) a.style.display = (next==="jobseeker") ? "" : "none";
  if(b) b.style.display = (next==="employer") ? "" : "none";
}

function readText(id){ return (document.getElementById(id)?.value || "").trim(); }
function readNum(id, defv){
  const v = Number(readText(id));
  return Number.isFinite(v) ? v : defv;
}

function selectedText(id){
  const el = document.getElementById(id);
  const t = el?.selectedOptions?.[0]?.textContent;
  return (t || "").trim() || null;
}

function cityLabel(citySelectId, cityTextId){
  const v = readText(citySelectId);
  const t = selectedText(citySelectId);
  const free = readText(cityTextId);
  if(!v) return free || null;
  if(v === "__custom__") return free || null;
  return t || free || null;
}

function safePhotoUrl(url){
  const u = (url || "").trim();
  if(!u) return null;
  // 상대경로(/assets/...) 또는 https 만 허용 (윈도우 경로 같은 실수 방지)
  if(u.startsWith("./") || u.startsWith("/") || u.startsWith("https://")) return u;
  return null;
}

let MAP = null;
let MAP_MARKER = null;
let MAP_TARGET = null; // {latId, lngId}
let MAP_LAST = null; // {lat,lng}

function openMap(target){
  MAP_TARGET = target;
  const modal = document.getElementById("mapModal");
  if(modal) modal.style.display = "flex";

  setTimeout(()=>{
    if(!window.L){
      const st = document.getElementById("mapStatus");
      if(st) st.textContent = "지도 라이브러리 로딩 실패";
      return;
    }
    if(!MAP){
      MAP = L.map("map").setView([21.0278,105.8342], 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap"
      }).addTo(MAP);

      MAP.on("click", (e)=>{
        MAP_LAST = { lat: e.latlng.lat, lng: e.latlng.lng };
        const hint = document.getElementById("mapHint");
        if(hint) hint.textContent = `선택 좌표: ${MAP_LAST.lat.toFixed(6)}, ${MAP_LAST.lng.toFixed(6)}`;
        if(MAP_MARKER) MAP.removeLayer(MAP_MARKER);
        MAP_MARKER = L.marker([MAP_LAST.lat, MAP_LAST.lng]).addTo(MAP);
      });
    }
    MAP.invalidateSize();
  }, 120);
}

function closeMap(){
  const modal = document.getElementById("mapModal");
  if(modal) modal.style.display = "none";
  const st = document.getElementById("mapStatus");
  if(st) st.textContent = "";
}

async function requireLogin(){
  if(!auth.currentUser){
    alert("제출은 구글 로그인 후 가능합니다.");
    throw new Error("not signed in");
  }
}

function must(v, msg){
  if(!v){
    alert(msg);
    throw new Error("validation: " + msg);
  }
}

function toggleCityText(selectId, textId){
  const sel = document.getElementById(selectId);
  const txt = document.getElementById(textId);
  if(!sel || !txt) return;

  const v = (sel.value || "").trim();
  const on = (!v || v === "__custom__");
  txt.style.display = on ? "" : "none";
  if(!on) txt.value = "";
}

async function submitJobseeker(){
  const out = document.getElementById("jsStatus");
  if(out) out.textContent = "";

  await requireLogin();

  const category = readText("jsCategory");
  const name = readText("jsName");

  must(category, "분류를 선택해 주세요.");
  must(name, "이름을 입력해 주세요.");

  const curProvLabel = selectedText("jsCurProvince");
  const workProvLabel = selectedText("jsWorkProvince");
  const curCityLabel = cityLabel("jsCurCity", "jsCurCityText");
  const workCityLabel = cityLabel("jsWorkCity", "jsWorkCityText");

  const payload = {
    ownerUid: auth.currentUser.uid,
    ownerEmail: auth.currentUser.email || null,
    status: "pending",

    // 관리자 승인 시 users로 복사하기 쉬우라고 users 스키마와 최대한 유사하게 유지
    userId: readText("jsUserId") || null,
    category,
    name,
    photo: safePhotoUrl(readText("jsPhotoUrl")),
    profile: readText("jsProfile") || null,
    skills: readText("jsSkills") || null,
    workStatus: readText("jsWorkStatus") || "available",
    workDistanceKm: readNum("jsWorkDistance", 10),

    // 카드/프로필에서 바로 쓰는 라벨 (중요)
    curProvinceLabel: curProvLabel,
    curCityLabel: curCityLabel,
    workProvinceLabel: workProvLabel,
    workCityLabel: workCityLabel,

    // 원본 데이터(관리/검색용)
    currentRegion: {
      provinceCode: readText("jsCurProvince") || null,
      provinceName: curProvLabel,
      city: readText("jsCurCity") || null,
      cityText: readText("jsCurCityText") || null
    },
    workRegion: {
      provinceCode: readText("jsWorkProvince") || null,
      provinceName: workProvLabel,
      city: readText("jsWorkCity") || null,
      cityText: readText("jsWorkCityText") || null
    },
    currentGeo: {
      lat: readText("jsCurLat") || null,
      lng: readText("jsCurLng") || null
    },
    workGeo: {
      lat: readText("jsWorkLat") || null,
      lng: readText("jsWorkLng") || null
    },

    // 연락처(공개 안함, contacts로 분리/관리자가 매칭)
    contact: {
      phone: readText("jsPhone") || null,
      email: readText("jsEmail") || null,
      zalo: readText("jsZalo") || null,
      sns: readText("jsSNS") || null
    },

    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  const btn = document.getElementById("btnSubmitJobseeker");
  if(btn) btn.disabled = true;
  if(out) out.textContent = "제출중…";

  try{
    await addDoc(collection(db, "applications_jobseeker"), payload);
    if(out) out.textContent = "제출 완료 (관리자 승인 대기)";
    alert("구직 신청이 제출되었습니다. 관리자 승인 후 공개됩니다.");
  }catch(e){
    console.error(e);
    if(out) out.textContent = "제출 실패 (콘솔 확인)";
    alert("제출 실패: 콘솔 확인");
  }finally{
    if(btn) btn.disabled = false;
  }
}

async function submitEmployer(){
  const out = document.getElementById("emStatus");
  if(out) out.textContent = "";

  await requireLogin();

  const category = readText("emCategory");
  const companyName = readText("emCompanyName");
  const managerName = readText("emManagerName");

  must(category, "분류를 선택해 주세요.");
  must(companyName, "회사 이름을 입력해 주세요.");
  must(managerName, "구직 담당자 이름을 입력해 주세요.");

  const curProvLabel = selectedText("emCurProvince");
  const workProvLabel = selectedText("emWorkProvince");
  const curCityLabel = cityLabel("emCurCity", "emCurCityText");
  const workCityLabel = cityLabel("emWorkCity", "emWorkCityText");

  const payload = {
    ownerUid: auth.currentUser.uid,
    ownerEmail: auth.currentUser.email || null,
    status: "pending",

    employerId: readText("emEmployerId") || null,
    category,
    companyName,
    managerName,
    requirements: readText("emRequirements") || null,
    skillRequirements: readText("emSkillRequirements") || null,

    curProvinceLabel: curProvLabel,
    curCityLabel: curCityLabel,
    workProvinceLabel: workProvLabel,
    workCityLabel: workCityLabel,

    currentRegion: {
      provinceCode: readText("emCurProvince") || null,
      provinceName: curProvLabel,
      city: readText("emCurCity") || null,
      cityText: readText("emCurCityText") || null
    },
    workRegion: {
      provinceCode: readText("emWorkProvince") || null,
      provinceName: workProvLabel,
      city: readText("emWorkCity") || null,
      cityText: readText("emWorkCityText") || null
    },
    workGeo: {
      lat: readText("emWorkLat") || null,
      lng: readText("emWorkLng") || null
    },

    contact: {
      phone: readText("emPhone") || null,
      email: readText("emEmail") || null,
      zalo: readText("emZalo") || null,
      sns: readText("emSNS") || null
    },

    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  const btn = document.getElementById("btnSubmitEmployer");
  if(btn) btn.disabled = true;
  if(out) out.textContent = "제출중…";

  try{
    await addDoc(collection(db, "applications_employer"), payload);
    if(out) out.textContent = "제출 완료 (관리자 확인)";
    alert("구인 신청이 제출되었습니다. 이 데이터는 관리자만 열람합니다.");
  }catch(e){
    console.error(e);
    if(out) out.textContent = "제출 실패 (콘솔 확인)";
    alert("제출 실패: 콘솔 확인");
  }finally{
    if(btn) btn.disabled = false;
  }
}

function bindRegions(){
  pickCatOptions(document.getElementById("jsCategory"));
  pickCatOptions(document.getElementById("emCategory"));

  fillProvinceSelect(document.getElementById("jsCurProvince"));
  fillProvinceSelect(document.getElementById("jsWorkProvince"));
  fillProvinceSelect(document.getElementById("emCurProvince"));
  fillProvinceSelect(document.getElementById("emWorkProvince"));

  const jsCurProv = document.getElementById("jsCurProvince");
  const jsCurCity = document.getElementById("jsCurCity");
  const jsWorkProv = document.getElementById("jsWorkProvince");
  const jsWorkCity = document.getElementById("jsWorkCity");
  const emCurProv = document.getElementById("emCurProvince");
  const emCurCity = document.getElementById("emCurCity");
  const emWorkProv = document.getElementById("emWorkProvince");
  const emWorkCity = document.getElementById("emWorkCity");

  jsCurProv?.addEventListener("change", ()=>{
    fillCitySelect(jsCurCity, jsCurProv.value);
    setTimeout(()=>toggleCityText("jsCurCity","jsCurCityText"), 0);
  });
  jsWorkProv?.addEventListener("change", ()=>{
    fillCitySelect(jsWorkCity, jsWorkProv.value);
    setTimeout(()=>toggleCityText("jsWorkCity","jsWorkCityText"), 0);
  });
  emCurProv?.addEventListener("change", ()=>{
    fillCitySelect(emCurCity, emCurProv.value);
    setTimeout(()=>toggleCityText("emCurCity","emCurCityText"), 0);
  });
  emWorkProv?.addEventListener("change", ()=>{
    fillCitySelect(emWorkCity, emWorkProv.value);
    setTimeout(()=>toggleCityText("emWorkCity","emWorkCityText"), 0);
  });

  jsCurCity?.addEventListener("change", ()=>toggleCityText("jsCurCity","jsCurCityText"));
  jsWorkCity?.addEventListener("change", ()=>toggleCityText("jsWorkCity","jsWorkCityText"));
  emCurCity?.addEventListener("change", ()=>toggleCityText("emCurCity","emCurCityText"));
  emWorkCity?.addEventListener("change", ()=>toggleCityText("emWorkCity","emWorkCityText"));

  // init cities
  fillCitySelect(jsCurCity, "");
  fillCitySelect(jsWorkCity, "");
  fillCitySelect(emCurCity, "");
  fillCitySelect(emWorkCity, "");

  // init direct-input visibility
  toggleCityText("jsCurCity","jsCurCityText");
  toggleCityText("jsWorkCity","jsWorkCityText");
  toggleCityText("emCurCity","emCurCityText");
  toggleCityText("emWorkCity","emWorkCityText");
}

function bindTabs(){
  document.querySelectorAll(".tab").forEach(btn=>{
    btn.addEventListener("click", ()=> tabSwitch(btn.getAttribute("data-tab")));
  });
}

function bindMap(){
  document.getElementById("btnPickCurGeo")?.addEventListener("click", ()=> openMap({latId:"jsCurLat", lngId:"jsCurLng"}));
  document.getElementById("btnPickWorkGeo")?.addEventListener("click", ()=> openMap({latId:"jsWorkLat", lngId:"jsWorkLng"}));
  document.getElementById("btnPickEmWorkGeo")?.addEventListener("click", ()=> openMap({latId:"emWorkLat", lngId:"emWorkLng"}));

  document.getElementById("btnCloseMap")?.addEventListener("click", closeMap);
  document.getElementById("mapBack")?.addEventListener("click", closeMap);

  document.getElementById("btnSaveMap")?.addEventListener("click", ()=>{
    const st = document.getElementById("mapStatus");
    if(!MAP_TARGET){
      if(st) st.textContent = "대상이 없습니다.";
      return;
    }
    if(!MAP_LAST){
      if(st) st.textContent = "좌표를 먼저 선택하세요.";
      return;
    }
    const latEl = document.getElementById(MAP_TARGET.latId);
    const lngEl = document.getElementById(MAP_TARGET.lngId);
    if(latEl) latEl.value = String(MAP_LAST.lat);
    if(lngEl) lngEl.value = String(MAP_LAST.lng);
    if(st) st.textContent = "저장 완료";
    setTimeout(closeMap, 250);
  });
}

function init(){
  bindTabs();
  bindRegions();
  bindMap();

  document.getElementById("btnSubmitJobseeker")?.addEventListener("click", submitJobseeker);
  document.getElementById("btnSubmitEmployer")?.addEventListener("click", submitEmployer);
}

init();
