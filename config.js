window.LG_CONFIG={supabaseUrl:"https://ziunjhebdkqdmvsrjxhm.supabase.co",supabaseKey:"sb_publishable_XYbldUl0dXkaf9C9XLMDZA_2cG26rHC"};
window.LG_URLS={
  signup:(href=location.href)=>new URL('./cadastro.html',href).href,
  isAdmin:(pathname=location.pathname)=>/\/admin(?:\.html)?\/?$/.test(pathname)
};
if(LG_URLS.isAdmin()){window.addEventListener('load',async()=>{for(const src of ['./student-management.js?v=8','./student-alerts.js?v=1','./training-import.js?v=2','./training-pdf.js?v=1','./plan-management.js?v=2','./training-ui.js?v=2','./training-context.js?v=1','./training-context-ui.js?v=1','./student-access.js?v=1'])await new Promise(ok=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=ok;document.body.appendChild(s)})})}
