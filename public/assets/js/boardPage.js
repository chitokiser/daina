/* /public/assets/js/boardPage.js */
import { db } from "./firebaseApp.js";
import { getMyRole } from "./roles.js";
import {
  collection, query, orderBy, limit, getDocs, addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function esc(s){
  return String(s||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function nowIso(){ return new Date().toISOString(); }

async function loadPosts(){
  const q = query(collection(db,"boardPosts"), orderBy("createdAt","desc"), limit(50));
  const snap = await getDocs(q);
  const items=[];
  snap.forEach(d=> items.push(d.data()));
  return items;
}

function render(items){
  const root = document.getElementById("boardList");
  if(!root) return;
  if(!items.length){
    root.innerHTML = "<div class='muted'>게시글이 없습니다.</div>";
    return;
  }
  root.innerHTML = items.map(p=>{
    return `
      <div class="panel" style="margin-top:10px; box-shadow:none;">
        <div class="h1" style="font-size:16px; margin:0;">${esc(p.title||"-")}</div>
        <div class="sub">${esc(p.createdAt||"")}</div>
        <div class="muted" style="margin-top:10px; white-space:pre-wrap;">${esc(p.body||"")}</div>
      </div>
    `;
  }).join("");
}

async function initAdminComposer(){
  const role = await getMyRole().catch(()=>null);
  const box = document.getElementById("adminComposer");
  if(box) box.style.display = (role==="admin") ? "" : "none";

  document.getElementById("btnCreatePost")?.addEventListener("click", async ()=>{
    const title = (document.getElementById("postTitle")?.value||"").trim();
    const body = (document.getElementById("postBody")?.value||"").trim();
    const st = document.getElementById("postStatus");
    if(!title || !body){
      if(st) st.textContent = "제목/내용을 입력하세요.";
      return;
    }
    if(st) st.textContent = "등록중…";
    try{
      await addDoc(collection(db,"boardPosts"), { title, body, createdAt: nowIso() });
      if(st) st.textContent = "등록 완료";
      location.reload();
    }catch(e){
      console.error(e);
      if(st) st.textContent = "등록 실패";
    }
  });
}

async function init(){
  try{
    const items = await loadPosts();
    render(items);
  }catch(e){
    console.error(e);
    const root = document.getElementById("boardList");
    if(root) root.innerHTML = "<div class='muted'>로딩 실패 (콘솔 확인)</div>";
  }
  await initAdminComposer();
}
init();
