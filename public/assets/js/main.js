/* /public/assets/js/main.js */
import { wireHeaderAuthUi } from "./roles.js";

function onReady(fn){
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
  else fn();
}
onReady(()=>{
  // header is injected asynchronously, so poll a bit
  let tries = 0;
  const t = setInterval(()=>{
    tries++;
    const ok = document.getElementById("btnLogin") && document.getElementById("roleBadge");
    if(ok){
      clearInterval(t);
      wireHeaderAuthUi();
    }
    if(tries > 40) clearInterval(t);
  }, 100);
});
