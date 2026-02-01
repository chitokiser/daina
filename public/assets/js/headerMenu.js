// /public/assets/js/headerMenu.js
export function wireHeaderMenuUi(){
  const btnMenu = document.getElementById("btnMenu");
  const pop = document.getElementById("menuPop");
  const btnLogin = document.getElementById("btnLogin");
  const btnLoginMobile = document.getElementById("btnLoginMobile");

  if(!btnMenu || !pop) return;

  function isOpen(){ return !pop.hidden; }

  function openPop(){
    pop.hidden = false;
    btnMenu.setAttribute("aria-expanded", "true");
    window.addEventListener("keydown", onKeydown);
    document.addEventListener("click", onOutsideClick, true);
  }

  function closePop(){
    pop.hidden = true;
    btnMenu.setAttribute("aria-expanded", "false");
    window.removeEventListener("keydown", onKeydown);
    document.removeEventListener("click", onOutsideClick, true);
  }

  function togglePop(){
    if(isOpen()) closePop();
    else openPop();
  }

  function onKeydown(e){
    if(e.key === "Escape") closePop();
  }

  function onOutsideClick(e){
    const t = e.target;
    if(pop.contains(t) || btnMenu.contains(t)) return;
    closePop();
  }

  // 항상 초기 숨김 보장
  closePop();

  btnMenu.addEventListener("click", (e)=>{
    e.preventDefault();
    e.stopPropagation();
    togglePop();
  });

  pop.querySelectorAll("a").forEach((a)=>{
    a.addEventListener("click", closePop);
  });

  if(btnLogin && btnLoginMobile){
    btnLoginMobile.addEventListener("click", ()=>{
      btnLogin.click();
      closePop();
    });
  }

  window.addEventListener("resize", ()=>{
    if(isOpen()) closePop();
  });
}
