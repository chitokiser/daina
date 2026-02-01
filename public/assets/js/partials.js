/* /public/assets/js/partials.js */
async function inject(id, url){
  const root = document.getElementById(id);
  if(!root) return;
  const res = await fetch(url, { cache: "no-store" });
  root.innerHTML = await res.text();
}
(async ()=>{
  await inject("site-header","./partials/header.html");
  await inject("site-footer","./partials/footer.html");
})();
