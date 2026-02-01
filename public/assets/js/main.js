// /public/assets/js/main.js
import { wireHeaderAuthUi } from "./roles.js";
import { wireHeaderMenuUi } from "./headerMenu.js";

function onReady(fn){
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
  else fn();
}

onReady(()=>{
  // header is injected asynchronously, so poll a bit
  let tries = 0;
  const t = setInterval(()=>{
    tries++;

    // 헤더가 주입되었는지 확인
    const ok =
      document.getElementById("btnLogin") &&
      document.getElementById("roleBadge") &&
      document.getElementById("btnMenu") &&
      document.getElementById("menuPop");

    if(ok){
      clearInterval(t);

      // 로그인/권한 UI
      wireHeaderAuthUi();

      // 햄버거 메뉴 UI
      wireHeaderMenuUi();
    }

    if(tries > 60) clearInterval(t);
  }, 100);
});
