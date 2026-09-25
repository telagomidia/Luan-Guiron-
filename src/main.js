document.documentElement.classList.add("js");
const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const items=document.querySelectorAll(".reveal");
if(reduced){items.forEach(el=>el.classList.add("visible"))}else{const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");io.unobserve(e.target)}}),{threshold:.12});items.forEach(el=>io.observe(el))}
const form=document.querySelector("#contactForm");
form?.addEventListener("submit",e=>{e.preventDefault();const name=document.querySelector("#name").value.trim();const goal=document.querySelector("#goal").value.trim();const out=document.querySelector("#formStatus");out.textContent=name?"Obrigado, "+name+". Nesta versão de teste o formulário ainda não envia dados.":"Preencha seu nome para continuar.";if(goal)out.textContent+=" Objetivo informado: "+goal+".";});