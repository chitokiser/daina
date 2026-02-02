// /public/assets/js/main.js
import { wireHeaderAuthUi, initAuth } from "./roles.js";
import { wireHeaderMenuUi } from "./headerMenu.js";

function onReady(fn){
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
  else fn();
}

onReady(async ()=>{
  // redirect 결과는 헤더 주입과 무관하게 먼저 처리
  await initAuth();

  // 1) 헤더가 이미 들어온 경우
  if(document.getElementById("btnLogin")){
    wireHeaderAuthUi();
    wireHeaderMenuUi();
    return;
  }

  // 2) 헤더가 나중에 주입되는 경우: MutationObserver로 정확히 감지
  const root = document.getElementById("site-header");
  if(!root){
    // 최후의 안전장치(루트가 없으면 그냥 폴링)
    const t = setInterval(()=>{
      if(document.getElementById("btnLogin")){
        clearInterval(t);
        wireHeaderAuthUi();
        wireHeaderMenuUi();
      }
    }, 100);
    return;
  }

  const obs = new MutationObserver(()=>{
    if(document.getElementById("btnLogin")){
      obs.disconnect();
      wireHeaderAuthUi();
      wireHeaderMenuUi();
    }
  });
  obs.observe(root, { childList:true, subtree:true });
});
