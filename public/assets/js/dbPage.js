/* /public/assets/js/dbPage.js */
import { db } from "./firebaseApp.js";
import { collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CATS = [
  ["","전체"],
  ["domestic_tech","베트남기술직"],
  ["domestic_student","베트남단순생산직"],
  ["domestic_service","베트남서비스직"],
  ["vn_housekeeping","베트남가사도우미"],
  ["vn_vehicle","베트남지입차량"],
  ["korean_expat","한국기술직"],
  ["seasonal_worker","한국계절근로자"],
  ["koreaservice","한국서비스직"]
];

const WORKS = [
  ["","전체 근무상태"],
  ["available","가능"],
  ["working","근무중"],
  ["leave","휴직"],
  ["unknown","미정"]
];

function esc(s){
  return String(s||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function ratingStars(r){
  const n = Math.max(0, Math.min(5, Math.round((Number(r)||0))));
  return "★★★★★☆☆☆☆☆".slice(5-n, 10-n);
}

function catLabel(v){
  const found = CATS.find(x=>x[0]===v);
  return found ? found[1] : (v||"-");
}
function workLabel(v){
  const found = WORKS.find(x=>x[0]===v);
  return found ? found[1] : (v||"-");
}

function renderCards(root, items){
  root.innerHTML = items.map((u)=>{
    const img = esc(u.photo || "./assets/images/jobseeker/1.png");
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
      workArea ? ("근무: " + esc(workArea)) : null,
      u.skills ? ("특기: " + esc(u.skills)) : null
    ].filter(Boolean).join(" · ");

    return `
      <a class="card person-card" href="./profile.html?id=${encodeURIComponent(u.userId||"")}" aria-label="${name} 상세보기">
        <div class="avatar">
          <img src="${img}" alt="${name}" loading="lazy" onerror="this.onerror=null;this.src='./assets/images/jobseeker/1.png';" />
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

async function loadList(){
  const cardsEl = document.getElementById("cards");
  const metaEl = document.getElementById("resultMeta");
  if(!cardsEl) return;

  const cat = (document.getElementById("fCategory")||{}).value || "";
  const work = (document.getElementById("fWork")||{}).value || "";
  const qtext = (document.getElementById("fQuery")||{}).value || "";
  const qnorm = qtext.trim().toLowerCase();

  cardsEl.innerHTML = "<div class='muted'>로딩중...</div>";

  try{
    const constraints = [];

    // 승인된 데이터만 공개 (approved 필드가 없는 구버전 데이터는 공개 허용)
    // approved=false 인 문서는 rules에서 차단되므로, users 컬렉션에는 approved=false를 넣지 말고
    // 미승인 데이터는 applications_* 컬렉션에 저장하세요.
    if(cat) constraints.push(where("category","==",cat));
    if(work) constraints.push(where("workStatus","==",work));

    const q = query(collection(db,"users"), ...constraints, orderBy("rating","desc"), limit(200));
    const snap = await getDocs(q);

    let items = [];
    snap.forEach((doc)=>items.push(doc.data()||{}));

    if(qnorm){
      items = items.filter((u)=>{
        const hay = [
          u.userId, u.name, u.profile, u.skills,
          u.curProvinceLabel, u.curCityLabel,
          u.workProvinceLabel, u.workCityLabel
        ].join(" ").toLowerCase();
        return hay.includes(qnorm);
      });
    }

    if(metaEl) metaEl.textContent = `${items.length}건`;

    if(items.length === 0){
      cardsEl.innerHTML = "<div class='muted'>검색 결과가 없습니다.</div>";
      return;
    }

    renderCards(cardsEl, items);
  }catch(e){
    console.error(e);
    cardsEl.innerHTML = "<div class='muted'>데이터 로딩 실패 (권한/규칙 확인)</div>";
  }
}

function init(){
  const catSel = document.getElementById("fCategory");
  if(catSel) catSel.innerHTML = CATS.map(([v,l])=>`<option value="${esc(v)}">${esc(l)}</option>`).join("");

  const workSel = document.getElementById("fWork");
  if(workSel) workSel.innerHTML = WORKS.map(([v,l])=>`<option value="${esc(v)}">${esc(l)}</option>`).join("");

  for(const id of ["fCategory","fWork"]){
    const el = document.getElementById(id);
    if(el) el.addEventListener("change", loadList);
  }

  const qEl = document.getElementById("fQuery");
  if(qEl) qEl.addEventListener("input", ()=>{
    clearTimeout(window.__dainaDbTimer);
    window.__dainaDbTimer = setTimeout(loadList, 200);
  });

  const btn = document.getElementById("btnSearch");
  if(btn) btn.addEventListener("click", loadList);

  const btnReset = document.getElementById("btnReset");
  if(btnReset) btnReset.addEventListener("click", ()=>{
    if(catSel) catSel.value="";
    if(workSel) workSel.value="";
    if(qEl) qEl.value="";
    loadList();
  });


  // URL ?cat=xxx 지원
  const url = new URL(location.href);
  const urlCat = url.searchParams.get("cat");
  if(urlCat && catSel){
    catSel.value = urlCat;
  }
  loadList();
}

init();
