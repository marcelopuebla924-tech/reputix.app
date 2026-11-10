"use strict";
(function(){
  const SUPABASE_URL="https://udvsrmfgjfinwbgvhchs.supabase.co";
  const SUPABASE_KEY="sb_publishable_qtc_Cm-4Iz7z5EM7dZdjAw_eHFKEDAC";
  const $=id=>document.getElementById(id);
  const say=(plan,msg)=>{
    const el=$(plan==="pro"?"proCheckoutStatus":"basicCheckoutStatus");
    if(el){el.textContent=msg;el.scrollIntoView({behavior:"smooth",block:"nearest"});}
  };
  window.reputixStartCheckout=async function(plan){
    if(plan!=="basic"&&plan!=="pro")return;
    const buttons=[...document.querySelectorAll("[data-reputix-checkout]")];
    try{
      say(plan,"Conectando con tu cuenta…");
      let session=null;
      try{session=JSON.parse(sessionStorage.getItem("reputix_owner_session")||"null");}catch(_){}
      if(!session?.access_token&&session?.refresh_token){
        const rr=await fetch(SUPABASE_URL+"/auth/v1/token?grant_type=refresh_token",{
          method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},
          body:JSON.stringify({refresh_token:session.refresh_token})
        });
        const renewed=await rr.json().catch(()=>({}));
        if(rr.ok&&renewed.access_token&&renewed.user){
          session=renewed;
          sessionStorage.setItem("reputix_owner_session",JSON.stringify(session));
        }
      }
      if(!session?.access_token){
        say(plan,"Inicia sesión o crea tu cuenta para contratar un plan.");
        $("ownerArea")?.scrollIntoView({behavior:"smooth",block:"start"});
        $("ownerEmail")?.focus({preventScroll:true});
        return;
      }
      buttons.forEach(b=>b.disabled=true);
      say(plan,"Abriendo conexión segura con Stripe…");
      const response=await fetch(SUPABASE_URL+"/functions/v1/create-checkout-session",{
        method:"POST",
        headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+session.access_token,"Content-Type":"application/json"},
        body:JSON.stringify({plan})
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||result.message||("Stripe respondió con error "+response.status));
      if(!result.url)throw new Error("Stripe no devolvió el enlace de pago.");
      say(plan,"Abriendo el pago seguro…");
      window.location.assign(result.url);
    }catch(error){
      say(plan,error?.message||"No se pudo conectar con Stripe. Inténtalo nuevamente.");
      console.error("Reputix checkout independiente:",error);
    }finally{buttons.forEach(b=>b.disabled=false);}
  };
  document.addEventListener("click",event=>{
    const b=event.target?.closest?.("[data-reputix-checkout]");
    if(!b)return;
    event.preventDefault();
    if(typeof window.reputixStartCheckout==="function")window.reputixStartCheckout(b.dataset.reputixCheckout);
  },true);
})();