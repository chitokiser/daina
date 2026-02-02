// /public/assets/js/headerMenu.js
export function wireHeaderMenuUi(){
  const btn = document.getElementById("btnMenu");
  const pop = document.getElementById("menuPop");
  if(!btn || !pop) return;

  if(btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";

  function open(){
    pop.hidden = false;
    btn.setAttribute("aria-expanded","true");
    document.addEventListener("click", onOutside, true);
    window.addEventListener("keydown", onKey);
  }
  function close(){
    pop.hidden = true;
    btn.setAttribute("aria-expanded","false");
    document.removeEventListener("click", onOutside, true);
    window.removeEventListener("keydown", onKey);
  }
  function toggle(){
    if(pop.hidden) open();
    else close();
  }
  function onOutside(e){
    const t = e.target;
    if(pop.contains(t) || btn.contains(t)) return;
    close();
  }
  function onKey(e){
    if(e.key === "Escape") close();
  }

  close();
  btn.addEventListener("click", (e)=>{
    e.preventDefault();
    e.stopPropagation();
    toggle();
  });

  pop.querySelectorAll("a").forEach(a=> a.addEventListener("click", close));
}
