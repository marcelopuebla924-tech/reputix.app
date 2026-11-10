"use strict";

/* Oculta temporalmente el acceso flotante de IA cuando el formulario de propietarios
   está visible, para que nunca intercepte los botones de registro o inicio de sesión. */
document.addEventListener("DOMContentLoaded", () => {
  const ownerArea = document.getElementById("ownerArea");
  if (!ownerArea || !("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver(entries => {
    const visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio > 0.08);
    document.body.classList.toggle("owner-auth-in-view", visible);
  }, { threshold: [0, 0.08, 0.25] });
  observer.observe(ownerArea);
});


/* CONFIGURACIÓN DE SUPABASE */
const SUPABASE_URL = "https://udvsrmfgjfinwbgvhchs.supabase.co";
const SUPABASE_KEY = "sb_publishable_qtc_Cm-4Iz7z5EM7dZdjAw_eHFKEDAC";

const $ = id => document.getElementById(id);

/* Recuperación de contraseña: captura temprana y compatible con toque móvil. */
document.addEventListener("click", event => {
  const button = event.target?.closest?.("#ownerForgotPassword");
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (typeof ownerSendPasswordRecovery === "function") {
    ownerSendPasswordRecovery();
  } else {
    const message = document.getElementById("ownerAuthMessage");
    if (message) message.textContent = "La recuperación todavía está cargando. Recarga la página e inténtalo otra vez.";
  }
}, true);


/* Checkout: captura el toque en fase temprana y muestra respuesta bajo el plan. */
document.addEventListener("click", event => {
  const button = event.target?.closest?.("[data-reputix-checkout]");
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const plan = button.getAttribute("data-reputix-checkout");
  const status = document.getElementById(plan === "pro" ? "proCheckoutStatus" : "basicCheckoutStatus");
  if (status) {
    status.textContent = "Toque recibido. Iniciando conexión segura…";
    status.scrollIntoView({behavior:"smooth",block:"nearest"});
  }
  if (typeof window.reputixStartCheckout === "function") {
    window.reputixStartCheckout(plan);
  } else if (status) {
    status.textContent = "El módulo de pagos todavía no cargó. Recarga la página e inténtalo otra vez.";
  }
}, true);

/* Respaldo de acceso: captura los toques móviles antes de otros módulos. */
document.addEventListener("click", event => {
  const control = event.target?.closest?.("#ownerSignIn,#ownerSignUp,#accountAccessBtn");
  if (!control) return;
  event.preventDefault();
  event.stopImmediatePropagation();

  if (control.id === "accountAccessBtn") {
    const area = document.getElementById("ownerArea");
    const form = document.getElementById("ownerAuthForm");
    area?.scrollIntoView({behavior:"smooth",block:"start"});
    window.setTimeout(() => {
      if (ownerSession) document.getElementById("privateSpace")?.scrollIntoView({behavior:"smooth",block:"start"});
      else {
        form?.scrollIntoView({behavior:"smooth",block:"center"});
        document.getElementById("ownerEmail")?.focus({preventScroll:true});
      }
    }, 350);
    return;
  }

  const message = document.getElementById("ownerAuthMessage");
  const email = document.getElementById("ownerEmail")?.value?.trim();
  const password = document.getElementById("ownerPassword")?.value;
  if (!email || !password) {
    if (message) message.textContent = ownerText("Escribe tu correo y contraseña para continuar.","Enter your email and password to continue.");
    document.getElementById(!email ? "ownerEmail" : "ownerPassword")?.focus({preventScroll:true});
    return;
  }
  if (typeof handleOwnerAuthAction === "function") {
    handleOwnerAuthAction(control.id === "ownerSignIn" ? "signin" : "signup");
  } else if (message) {
    message.textContent = ownerText("El acceso no terminó de cargar. Recarga la página e inténtalo otra vez.","Sign-in did not finish loading. Reload the page and try again.");
  }
}, true);


/* Delegación de acciones del panel privado: queda registrada antes de inicializar
   módulos secundarios para que un error ajeno no deje botones sin respuesta. */
document.addEventListener("click", async event => {
  const button = event.target?.closest?.(
    "#privateProfileAction,#privateBusinessAction,#privateMessagesAction,#privateComplaintsAction,#privateReviewsAction,#ownerSignOut"
  );
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const message = document.getElementById("ownerAuthMessage");
  try {
    if (button.id === "privateProfileAction") {
      if (!ownerSession?.user?.id) throw new Error("La sesión no está activa. Vuelve a iniciar sesión.");
      const current = await api("user_profiles?select=display_name,bio&user_id=eq."+encodeURIComponent(ownerSession.user.id)).catch(()=>[]);
      const name = window.prompt(ownerText("¿Cómo quieres que aparezca tu nombre?","What name should appear on your profile?"),current?.[0]?.display_name||"");
      if (name === null) return;
      const bio = window.prompt(ownerText("Escribe una breve descripción (opcional).","Write a short bio (optional)."),current?.[0]?.bio||"");
      if (bio === null) return;
      await api("user_profiles?on_conflict=user_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({user_id:ownerSession.user.id,display_name:name.trim(),bio:bio.trim()})});
      document.getElementById("privateProfileContent").replaceChildren(node("div","private-entry",name.trim()||ownerSession.user.email),node("div","private-entry",bio.trim()));
      document.getElementById("privateWelcome").textContent=ownerText("Hola, ","Hello, ")+(name.trim()||"");
    } else if (button.id === "privateBusinessAction") {
      document.getElementById("ownerClaimForm").scrollIntoView({behavior:"smooth",block:"center"});
      document.getElementById("claimBusiness").focus({preventScroll:true});
    } else if (button.id === "privateMessagesAction") {
      document.getElementById("privateMessagesContent").scrollIntoView({behavior:"smooth",block:"center"});
      await loadMessageCenter();
    } else if (button.id === "privateComplaintsAction") {
      document.getElementById("privateComplaintsContent").scrollIntoView({behavior:"smooth",block:"center"});
      await loadPrivateSpace();
    } else if (button.id === "privateReviewsAction") {
      await loadPrivateSpace();
      document.getElementById("privateReviewsContent").scrollIntoView({behavior:"smooth",block:"center"});
    } else if (button.id === "ownerSignOut") {
      ownerSetSession(null);
      if (message) message.textContent=ownerText("Sesión cerrada.","Signed out.");
    }
  } catch (error) {
    if (message) message.textContent=ownerText("No se pudo completar la acción: ","Could not complete action: ")+(error?.message||String(error));
    console.error("Reputix private panel action:",error);
  }
}, true);


/* El acceso se conecta una sola vez en el bloque de autenticación inferior. */

const form = $("searchForm");
const input = $("business");
const notice = $("notice");
const resultsBox = $("results");
const searchButton = $("searchButton");
let ownerSession = null;
let ownerRecoveryAccessToken = null;
try { ownerSession = JSON.parse(sessionStorage.getItem("reputix_owner_session") || "null"); } catch (_) { ownerSession = null; }

/* Reputix AI: un único flujo de apertura y envío, con renovación segura de sesión. */
(function setupPublicReputixAI(){
  const fab=document.getElementById("reputixAiFab");
  const modal=document.getElementById("reputixAiModal");
  const close=document.getElementById("publicAiClose");
  const ask=document.getElementById("publicAiAsk");
  const prompt=document.getElementById("publicAiPrompt");
  const status=document.getElementById("publicAiStatus");
  const answer=document.getElementById("publicAiAnswer");
  if(!fab||!modal||!close||!ask||!prompt||!status||!answer)return;

  const open=()=>{
    modal.hidden=false;
    document.body.classList.add("reputix-ai-open");
    window.setTimeout(()=>prompt.focus(),80);
  };
  const shut=()=>{
    modal.hidden=true;
    document.body.classList.remove("reputix-ai-open");
  };
  fab.addEventListener("click",open);
  close.addEventListener("click",shut);
  modal.addEventListener("click",e=>{if(e.target===modal)shut();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!modal.hidden)shut();});

  modal.querySelectorAll("[data-ai-prompt]").forEach(button=>button.addEventListener("click",()=>{
    prompt.value=button.getAttribute("data-ai-prompt")||"";
    prompt.focus();
    prompt.setSelectionRange(prompt.value.length,prompt.value.length);
    status.textContent=lang==="es"?"Consulta sugerida. Puedes editarla antes de enviar.":"Suggested question. You can edit it before sending.";
  }));

  async function currentAiSession(){
    if(ownerSession?.access_token)return ownerSession;
    if(ownerSession?.refresh_token){
      const refreshed=await ownerAuthRequest("token?grant_type=refresh_token",{refresh_token:ownerSession.refresh_token});
      if(refreshed?.access_token&&refreshed?.user?.id){
        ownerSetSession(refreshed);
        return refreshed;
      }
    }
    return null;
  }

  async function askReputix(message,session){
    let response=await fetch(SUPABASE_URL+"/functions/v1/reputix-ai",{
      method:"POST",
      headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+session.access_token,"Content-Type":"application/json"},
      body:JSON.stringify({message,language:lang,mode:"assistant"})
    });
    if(response.status===401&&session.refresh_token){
      const refreshed=await ownerAuthRequest("token?grant_type=refresh_token",{refresh_token:session.refresh_token});
      if(!refreshed?.access_token||!refreshed?.user?.id)throw new Error(lang==="es"?"Tu sesión venció. Inicia sesión nuevamente.":"Your session expired. Please sign in again.");
      ownerSetSession(refreshed);
      response=await fetch(SUPABASE_URL+"/functions/v1/reputix-ai",{
        method:"POST",
        headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+refreshed.access_token,"Content-Type":"application/json"},
        body:JSON.stringify({message,language:lang,mode:"assistant"})
      });
    }
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||("Error "+response.status+" al consultar Reputix AI."));
    if(!data.answer)throw new Error(lang==="es"?"La IA no devolvió una respuesta.":"The AI returned no answer.");
    return data.answer;
  }

  async function submit(){
    const message=prompt.value.trim();
    if(!message){
      status.textContent=lang==="es"?"Escribe tu consulta para continuar.":"Type your question to continue.";
      prompt.focus();
      return;
    }
    ask.disabled=true;
    answer.hidden=true;
    status.textContent=lang==="es"?"Conectando con Reputix AI…":"Connecting to Reputix AI…";
    try{
      const session=await currentAiSession();
      if(!session){
        status.textContent=lang==="es"?"Inicia sesión para conversar con Reputix AI. Te llevaré al acceso sin perder tu pregunta.":"Sign in to chat with Reputix AI. I'll take you to sign-in without losing your question.";
        const ownerArea=document.getElementById("ownerArea");
        if(ownerArea)ownerArea.scrollIntoView({behavior:"smooth",block:"start"});
        const email=document.getElementById("ownerEmail");
        if(email)window.setTimeout(()=>email.focus({preventScroll:true}),350);
        return;
      }
      const result=await askReputix(message,session);
      answer.textContent=result;
      answer.hidden=false;
      status.textContent=lang==="es"?"Respuesta generada por Reputix AI.":"Answer generated by Reputix AI.";
    }catch(err){
      status.textContent=(lang==="es"?"No se pudo completar la consulta: ":"Could not complete the request: ")+(err?.message||String(err));
    }finally{
      ask.disabled=false;
      ask.textContent=lang==="es"?"Preguntar a la IA":"Ask AI";
    }
  }
  ask.addEventListener("click",submit);
  prompt.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submit();}});
})();;



const translations = {
es: {
  pill:"✦ Opiniones reales. Soluciones reales.",
  headline:'<span class="accent">REPUTIX</span>',
  intro:"Descubre, califica y recomienda los mejores negocios de tu ciudad.",
  placeholder:"Busca negocios, servicios o categorías...",search:"Buscar",
  initial:"Busca un negocio para ver sus resultados.",
  f1:"Encuentra negocios",fd1:"Consulta información de negocios en un solo lugar.",
  f2:"Opiniones auténticas",fd2:"Calificaciones basadas en opiniones disponibles.",
  f3:"Estadísticas inteligentes",fd3:"Identifica tendencias a partir de opiniones reales.",
  category:"Categoría no disponible",address:"Dirección no disponible",
  phone:"Teléfono no disponible",hours:"Horario no disponible",
  description:"La descripción todavía no está disponible.",
  profile:"Ver perfil",close:"Cerrar perfil",reviews:"Opiniones",
  loading:"Cargando opiniones publicadas…",
  none:"Todavía no hay opiniones publicadas.",
  share:"Comparte tu experiencia",
  pending:"Tu opinión se revisará antes de publicarse.",
  date:"Fecha de visita",time:"Hora aproximada",comment:"Tu opinión (opcional)",
  commentHint:"Describe tu experiencia real…",send:"Enviar opinión para revisión",
  choose:"Selecciona una calificación",sent:"Opinión recibida. Quedó pendiente de revisión.",
  failed:"No se pudo enviar la opinión.",searching:"Buscando negocios…",
  notfound:"No encontramos ese negocio. Prueba otro nombre.",
  found:"negocios encontrados.",noRating:"Sin calificaciones",
  score:"Calificación",count:"Opiniones",reviewError:"No se pudieron cargar las opiniones.",
  network:"No se pudo completar la búsqueda. Revisa Supabase.",
  criteria:["Limpieza","Calidad del servicio","Calidad del producto","Rapidez","Relación calidad-precio"],
  visit:"Visita",original:"Idioma original",translation:"Ver traducción",
  hideTranslation:"Ocultar traducción",trends:"Tendencias",sending:"Enviando opinión…",
  invalidBusiness:"El negocio no tiene un identificador válido.",
  languageUnknown:"No determinado",
  communityTitle:"Ayuda a tu comunidad",
  communityIntro:"¿No encuentras un negocio o profesional en Reputix? Propón agregarlo.",
  addBusinessTitle:"Agregar un negocio",addBusinessDesc:"Tiendas, restaurantes y comercios.",
  addProTitle:"Agregar un profesional",addProDesc:"Plomeros, mecánicos y otros servicios.",
  complaints:"Quejas y reclamaciones",
  complaintIntro:"Comparte una experiencia real. Las quejas se revisan antes de publicarse.",
  complaintLabel:"Describe tu queja",complaintHint:"Explica qué ocurrió con respeto y detalles relevantes…",
  complaintSend:"Enviar queja para revisión",complaintSending:"Enviando queja…",
  complaintSent:"Queja recibida. Está pendiente de revisión.",
  complaintFailed:"No se pudo enviar la queja.",
  complaintLoading:"Cargando quejas publicadas…",
  complaintNone:"Todavía no hay quejas publicadas.",
  complaintPublic:"Queja publicada",businessResponse:"Respuesta del negocio",
  complaintReadError:"No se pudieron cargar las quejas.",
  complaintTooShort:"Escribe una queja de al menos 10 caracteres.",
  complaintPrivacy:"No incluyas datos personales privados.",
  submitBusinessTitle:"Proponer negocio o servicio",
  formName:"Nombre",formCategory:"Categoría",formAddress:"Dirección",
  formCity:"Ciudad",formZip:"Código postal",formPhone:"Teléfono (opcional)",
  formHours:"Horario (opcional)",formDescription:"Detalles (opcional)",
  formNameHint:"Nombre del negocio o profesional",
  formAddressHint:"Calle y número",formCityHint:"Ciudad",
  formPhoneHint:"Teléfono público",formHoursHint:"Horario de atención",
  formDescriptionHint:"Información útil para la comunidad",
  sendProposal:"Enviar para revisión",
  proposalPending:"Propuesta recibida. Quedó pendiente de revisión.",
  proposalFailed:"No se pudo enviar la propuesta.",
  chooseCategory:"Elige una categoría",
  businessCategories:["Restaurante o cafetería","Tienda o supermercado","Smoke shop","Ropa y accesorios","Otro comercio"],
  proCategories:["Plomero","Electricista","Mecánico","Construcción","Pintor","Contratista","Limpieza","Otro servicio"],
  proposalRequired:"Completa el nombre, la categoría y la ciudad.",
  proposalNotice:"Tu propuesta será revisada y el negocio aparecerá cuando sea aprobado."
},
en: {
  pill:"✦ Real reviews. Real solutions.",
  headline:'<span class="accent">REPUTIX</span>',
  intro:"Discover, rate, and recommend the best businesses in your city.",
  placeholder:"Search businesses, services, or categories...",search:"Search",
  initial:"Search for a business to see results.",
  f1:"Find businesses",fd1:"Explore business information in one place.",
  f2:"Authentic reviews",fd2:"Ratings based on available reviews.",
  f3:"Smart insights",fd3:"Identify trends using real reviews.",
  category:"Category unavailable",address:"Address unavailable",
  phone:"Phone unavailable",hours:"Hours unavailable",
  description:"Description not available yet.",
  profile:"View profile",close:"Close profile",reviews:"Reviews",
  loading:"Loading published reviews…",none:"No reviews published yet.",
  share:"Share your experience",pending:"Your review will be checked before publication.",
  date:"Visit date",time:"Approximate time",comment:"Your review (optional)",
  commentHint:"Describe your real experience…",send:"Submit review for moderation",
  choose:"Select a rating",sent:"Review received. It is pending moderation.",
  failed:"The review could not be submitted.",searching:"Searching businesses…",
  notfound:"No business found. Try another name.",found:"businesses found.",
  noRating:"Not yet rated",score:"Rating",count:"Reviews",
  reviewError:"Could not load reviews.",network:"Search failed. Check Supabase.",
  criteria:["Cleanliness","Service quality","Product quality","Speed","Value for money"],
  visit:"Visit",original:"Original language",translation:"View translation",
  hideTranslation:"Hide translation",trends:"Trends",sending:"Submitting review…",
  invalidBusiness:"The business does not have a valid identifier.",
  languageUnknown:"Undetermined",
  communityTitle:"Help your community",
  communityIntro:"Can't find a business or professional on Reputix? Suggest adding it.",
  addBusinessTitle:"Add a business",addBusinessDesc:"Stores, restaurants, and other businesses.",
  addProTitle:"Add a professional",addProDesc:"Plumbers, mechanics, and other services.",
  complaints:"Complaints",
  complaintIntro:"Share a real experience. Complaints are reviewed before publication.",
  complaintLabel:"Describe your complaint",complaintHint:"Explain what happened respectfully…",
  complaintSend:"Submit complaint for review",complaintSending:"Submitting complaint…",
  complaintSent:"Complaint received. It is pending review.",
  complaintFailed:"Could not submit complaint.",
  complaintLoading:"Loading published complaints…",
  complaintNone:"There are no published complaints yet.",
  complaintPublic:"Published complaint",businessResponse:"Business response",
  complaintReadError:"Could not load complaints.",
  complaintTooShort:"Enter a complaint of at least 10 characters.",
  complaintPrivacy:"Do not include private personal information.",
  submitBusinessTitle:"Suggest a business or service",
  formName:"Name",formCategory:"Category",formAddress:"Address",
  formCity:"City",formZip:"ZIP code",formPhone:"Phone (optional)",
  formHours:"Hours (optional)",formDescription:"Details (optional)",
  formNameHint:"Business or professional name",formAddressHint:"Street address",
  formCityHint:"City",formPhoneHint:"Public phone number",
  formHoursHint:"Business hours",formDescriptionHint:"Helpful community information",
  sendProposal:"Submit for review",
  proposalPending:"Suggestion received. It is pending moderation.",
  proposalFailed:"The suggestion could not be submitted.",
  chooseCategory:"Choose a category",
  businessCategories:["Restaurant or cafe","Store or supermarket","Smoke shop","Clothing and accessories","Other business"],
  proCategories:["Plumber","Electrician","Mechanic","Construction","Painter","Contractor","Cleaning","Other service"],
  proposalRequired:"Enter the name, category, and city.",
  proposalNotice:"Businesses are published when submitted; please make sure the details are accurate."
}
};

let lang = "es";
let lastBusinesses = [];
let proposalType = "business";

function t(key) {
  return translations[lang][key] ?? translations.es[key] ?? key;
}

function node(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = String(text);
  return n;
}

function setLanguage(value) {
  lang = value === "en" ? "en" : "es";
  document.documentElement.lang = lang;
  $("language").value = lang;
  $("pill").textContent = t("pill");
  $("headline").innerHTML = t("headline");
  $("intro").textContent = t("intro");
  $("plansTitle").textContent = lang === "es" ? "Planes Reputix" : "Reputix plans";
  $("plansIntro").textContent = lang === "es" ? "Herramientas para administrar la reputación de tu negocio y entender mejor a tus clientes." : "Tools to manage your business reputation and better understand your customers.";
  $("basicPlanDesc").textContent = lang === "es" ? "Gestión esencial de reputación y opiniones de clientes." : "Essential reputation management and customer reviews.";
  $("proPlanDesc").textContent = lang === "es" ? "Herramientas avanzadas para analizar opiniones y mejorar el rendimiento." : "Advanced tools to analyze reviews and improve performance.";
  $("basicCheckoutButton").textContent = lang === "es" ? "Elegir Basic · $13/mes" : "Choose Basic · $13/month";
  $("proCheckoutButton").textContent = lang === "es" ? "Elegir Pro · $25/mes" : "Choose Pro · $25/month";
  $("tagline").textContent = lang === "es"
    ? "Opiniones reales. Soluciones reales."
    : "Real reviews. Real solutions.";
  $("accountAccessBtn").textContent = lang === "es"
    ? "Crear cuenta / Iniciar sesión"
    : "Create account / Sign in";
  $("independentHeaderBtn").textContent = lang === "es"
    ? "Ofrece tu servicio"
    : "Offer your service";
  $("googleDiscoveryTitle").textContent = lang === "es"
    ? "Próximamente: descubrimiento con Google"
    : "Coming soon: Google business discovery";
  $("googleDiscoveryNote").textContent = lang === "es"
    ? "Google ayudará a encontrar negocios; las opiniones y calificaciones serán propias de Reputix."
    : "Google will help discover businesses; reviews and ratings will belong to Reputix.";
  $("addBusinessAction").innerHTML = lang === "es" ? 'Comenzar <span aria-hidden="true">→</span>' : 'Get started <span aria-hidden="true">→</span>';
  $("addProAction").innerHTML = lang === "es" ? 'Comenzar <span aria-hidden="true">→</span>' : 'Get started <span aria-hidden="true">→</span>';
  $("independentJoinKicker").textContent = lang === "es" ? "RED DE PROFESIONALES REPUTIX" : "REPUTIX PROFESSIONAL NETWORK";
  $("independentJoinTitle").textContent = lang === "es" ? "¿No eres dueño de un negocio, pero trabajas por tu cuenta?" : "Don't own a business, but work for yourself?";
  $("independentJoinText").textContent = lang === "es" ? "Agrega tu servicio a nuestra red. Construye tu reputación con calificaciones reales, gana visibilidad y encuentra oportunidades para llegar a más clientes." : "Add your service to our network. Build your reputation with real ratings, gain visibility, and find opportunities to reach more customers.";
  $("independentJoinNote").textContent = lang === "es" ? "Tu servicio se revisará antes de publicarse. Las oportunidades y los clientes no están garantizados." : "Your service will be reviewed before publication. Opportunities and customers are not guaranteed.";
  $("independentJoinBtn").innerHTML = lang === "es" ? 'Agregar mi servicio <span aria-hidden="true">→</span>' : 'Add my service <span aria-hidden="true">→</span>';
  $("ownerTitle").textContent = lang === "es" ? "🏪 Panel para propietarios" : "🏪 Business owner dashboard";
  $("ownerIntro").textContent = lang === "es" ? "Regístrate o inicia sesión para solicitar la verificación de tu negocio y consultar sus estadísticas privadas." : "Create an account or sign in to request business verification and view private analytics.";
  $("ownerEmailLabel").textContent = lang === "es" ? "Correo electrónico" : "Email address";
  $("ownerPasswordLabel").textContent = lang === "es" ? "Contraseña" : "Password";
  $("ownerSignIn").textContent = lang === "es" ? "Ya tengo cuenta · Iniciar sesión" : "I already have an account · Sign in";
  $("ownerSignUp").textContent = lang === "es" ? "Crear cuenta" : "Create account";
  if ($("ownerForgotPassword")) $("ownerForgotPassword").textContent = lang === "es" ? "¿Olvidaste tu contraseña?" : "Forgot your password?";
  $("ownerSignOut").textContent = lang === "es" ? "Cerrar sesión" : "Sign out";
  $("claimTitle").textContent = lang === "es" ? "Solicitar acceso al negocio" : "Request business access";
  $("claimIntro").textContent = lang === "es" ? "Selecciona el negocio y explica brevemente cómo puedes demostrar que eres su propietario o representante autorizado. La solicitud será revisada." : "Select the business and briefly explain how you can prove you are its owner or authorized representative. Your request will be reviewed.";
  if ($("claimBusinessLabel")) $("claimBusinessLabel").textContent = lang === "es" ? "Negocio" : "Business";
  if ($("claimEvidenceLabel")) $("claimEvidenceLabel").textContent = lang === "es" ? "Prueba de relación con el negocio" : "Proof of relationship to the business";
  $("claimSubmit").textContent = lang === "es" ? "Enviar solicitud" : "Submit request";
  $("dashboardTitle").textContent = lang === "es" ? "Tus estadísticas" : "Your analytics";
  $("adminClaimsTitle").textContent = lang === "es" ? "🛡️ Revisión administrativa" : "🛡️ Admin review";
  $("adminClaimsWarning").textContent = lang === "es" ? "Verifica una solicitud solo después de comprobar la identidad y una prueba válida de relación con el negocio. Una declaración escrita por sí sola no es suficiente." : "Verify a claim only after checking identity and valid proof of relationship to the business. A written statement alone is not sufficient.";
  $("ownerDashboardNote").textContent = lang === "es" ? "Los datos se calculan únicamente con opiniones publicadas. Los patrones por horario requieren un mínimo de 3 opiniones en cada franja." : "Data uses published reviews only. Time-of-day patterns require at least 3 reviews per time slot.";
  $("reputixAiTitle").textContent = lang === "es" ? "Asistente Reputix AI" : "Reputix AI Assistant";
  $("reputixAiIntro").textContent = lang === "es" ? "Pregunta sobre cómo usar Reputix, entender opiniones y analizar información disponible." : "Ask how to use Reputix, understand reviews, and analyze available information.";
  $("reputixAiPromptLabel").textContent = lang === "es" ? "¿En qué te puedo ayudar?" : "How can I help?";
  $("reputixAiPrompt").placeholder = lang === "es" ? "Escribe tu pregunta..." : "Type your question...";
  $("reputixAiSend").textContent = lang === "es" ? "Preguntar a Reputix AI" : "Ask Reputix AI";
  input.placeholder = t("placeholder");
  searchButton.textContent = t("search");

  ["f1","fd1","f2","fd2","f3","fd3",
   "communityTitle","communityIntro",
   "addBusinessTitle","addBusinessDesc","addProTitle","addProDesc"
  ].forEach(id => $(id).textContent = t(id));

  if (!input.value.trim()) notice.textContent = t("initial");

  if (lastBusinesses.length) {
    resultsBox.replaceChildren(...lastBusinesses.map(renderBusiness));
    renderDiscoveryRails();
  }
  if (!$("communityFormWrap").hidden) renderCommunityForm(proposalType);
}

$("independentHeaderBtn").addEventListener("click",() => {
  renderCommunityForm("professional");
  $("communityFormWrap").scrollIntoView({behavior:"smooth",block:"start"});
});

function openOwnerAccess(){
  const area=$("ownerArea");
  const email=$("ownerEmail");
  const form=$("ownerAuthForm");
  if(!area||!form)return;
  area.scrollIntoView({behavior:"smooth",block:"start"});
  window.setTimeout(()=>{
    if(ownerSession){
      $("privateSpace")?.scrollIntoView({behavior:"smooth",block:"start"});
    }else{
      form.scrollIntoView({behavior:"smooth",block:"center"});
      if(email)email.focus({preventScroll:true});
    }
  },500);
}
$("accountAccessBtn").addEventListener("click",event=>{
  event.preventDefault();
  openOwnerAccess();
});
document.addEventListener("click",event=>{
  const trigger=event.target&&event.target.closest?event.target.closest("#accountAccessBtn"):null;
  if(!trigger)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  openOwnerAccess();
},true);

$("language").addEventListener("change",e => {
  setLanguage(e.target.value);
  loadWeeklyRankings();
  loadReviewTicker();
});
setupFeatureButtons();

/* API REST DE SUPABASE */
async function api(path, options = {}) {
  const response = await fetch(SUPABASE_URL + "/rest/v1/" + path, {
    ...options,
    headers: {
      apikey:SUPABASE_KEY,
      Accept:"application/json",
      "Content-Type":"application/json",
      ...(ownerSession?.access_token ? {Authorization:"Bearer " + ownerSession.access_token} : {}),
      ...(options.headers || {})
    }
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error("Supabase (" + response.status + "): " + body.slice(0,500));
  }
  if (!body.trim()) return null;
  try { return JSON.parse(body); }
  catch (_) { throw new Error("Supabase devolvió una respuesta no válida."); }
}

function average(reviews) {
  const fields = [
    "cleanliness","service_quality","product_quality","speed","value_for_money"
  ];
  const values = [];
  reviews.forEach(r => fields.forEach(k => {
    if (r[k] !== null && r[k] !== undefined && r[k] !== "" &&
        Number.isFinite(Number(r[k]))) values.push(Number(r[k]));
  }));
  return values.length ? values.reduce((a,b) => a+b,0) / values.length : null;
}

function stars(n) {
  const r = Math.max(0,Math.min(5,Math.round(n || 0)));
  return "★".repeat(r) + "☆".repeat(5-r);
}

function makeStat(value,label) {
  const box = node("div","stat");
  box.append(node("span","stat-value",value),node("span","stat-label",label));
  return box;
}

function makeLine(icon,text) {
  return node("div","info-line",icon + "  " + text);
}

function safeUrl(value) {
  try {
    const u = new URL(value);
    return ["https:","http:"].includes(u.protocol) ? u.href : "";
  } catch (_) { return ""; }
}

let discoveryOffset = 0;
let discoveryTimer = null;

async function loadDiscoveryTilePhoto(business,tile) {
  const applyPhoto = src => {
    if (!src) return;
    // Fondo directo: evita que la capa de color de la tarjeta oculte la fotografía.
    tile.style.backgroundImage =
      'linear-gradient(180deg,rgba(0,8,20,.08) 0%,rgba(0,8,20,.72) 100%),url("' +
      String(src).replace(/"/g,"%22") + '")';
    tile.style.backgroundSize = "cover";
    tile.style.backgroundPosition = "center";
    tile.style.backgroundRepeat = "no-repeat";
    tile.classList.add("has-business-photo");
    const oldImage = tile.querySelector(".tile-photo");
    if (oldImage) oldImage.remove();
    const img = node("img","tile-photo");
    img.src = src;
    img.alt = "";
    img.loading = "lazy";
    img.onerror = () => img.remove();
    tile.prepend(img);
  };

  try {
    const picture = safeUrl(business.logo_url || business.image_url || business.photo_url);
    if (picture) {
      applyPhoto(picture);
      return;
    }
    if (!business.id) return;
    const params = new URLSearchParams({
      select:"storage_path",
      business_id:"eq." + business.id,
      status:"eq.approved",
      order:"created_at.desc",
      limit:"1"
    });
    const rows = await api("business_photos?" + params);
    if (!Array.isArray(rows) || !rows.length || !rows[0].storage_path) return;
    const response = await fetch(SUPABASE_URL + "/storage/v1/object/sign/business-photos/" + photoPathUrl(rows[0].storage_path),{
      method:"POST",
      headers:{apikey:SUPABASE_KEY,Authorization:"Bearer " + SUPABASE_KEY,"Content-Type":"application/json"},
      body:JSON.stringify({expiresIn:3600})
    });
    if (!response.ok) {
      console.error("No se pudo firmar la foto del negocio:",response.status,await response.text());
      return;
    }
    const data = await response.json();
    const signed = data.signedURL || data.signedUrl;
    if (!signed) return;
    const src = (signed.startsWith("https://") || signed.startsWith("http://"))
      ? signed
      : SUPABASE_URL + "/storage/v1" + (signed.startsWith("/") ? signed : "/" + signed);
    applyPhoto(src);
  } catch (err) {
    console.error("No se pudo cargar la portada de la tarjeta:",err);
  }
}


function makeDiscoveryTile(business) {
  const quickCleaningPhone = String(business.phone || "").replace(/\D/g,"");
  const isQuickCleaning = business.id === "a2861806-7e33-4eff-907f-f6206535fb7c" ||
    /quick\s*cleaning/i.test(String(business.name || "")) ||
    quickCleaningPhone.endsWith("2137062826") ||
    (/south gate/i.test(String(business.address || business.city || "")) &&
     /cleaning|limpieza/i.test(String(business.category || "")));
  const isTamosChelo = /tamos\s*chelo/i.test(String(business.name || ""));
  const tile = node("article","business-tile" + (isQuickCleaning ? " quick-cleaning-tile" : (isTamosChelo ? " tamos-chelo-tile" : "")));
  if (isQuickCleaning || isTamosChelo) {
    const cover = node("img","tile-photo");
    cover.src = isQuickCleaning ? "/assets/quick-cleaning-card.jpg" : "/assets/tamos-chelo-card.jpg";
    cover.alt = isQuickCleaning ? "Quick Cleaning Services" : "Tamos Chelo";
    cover.loading = "eager";
    tile.append(cover);
  }
  const heading = node("div","tile-heading");
  heading.style.cssText = "display:flex!important;flex-direction:column!important;align-items:flex-start!important;gap:4px!important;position:relative!important;z-index:10!important;width:100%!important;visibility:visible!important;opacity:1!important;";
  const title = node("div","tile-business-name",isQuickCleaning ? "Quick Cleaning Services" : (business.name || "Negocio"));
  title.style.cssText = "display:block!important;position:relative!important;z-index:11!important;visibility:visible!important;opacity:1!important;color:" + (isQuickCleaning ? "#ffe3a1" : "#ffffff") + "!important;font-size:" + (isQuickCleaning ? "15px" : "20px") + "!important;font-weight:900!important;line-height:1.15!important;margin:0!important;";
  const category = node("div","tile-business-category",isQuickCleaning ? "Professional Cleaning" : (business.category || "Categoría"));
  category.style.cssText = "display:block!important;position:relative!important;z-index:11!important;visibility:visible!important;opacity:1!important;color:" + (isQuickCleaning ? "#f5e8cc" : "#79d6ff") + "!important;font-size:" + (isQuickCleaning ? "9px" : "13px") + "!important;font-weight:750!important;line-height:1.2!important;margin:0!important;";
  const place = isQuickCleaning ? "South Gate, CA 90280" : ([business.city,business.zip].filter(Boolean).join(" · ") || business.address || "En Reputix");
  const location = node("div","tile-business-location","⌖ " + place);
  location.style.cssText = "display:block!important;position:relative!important;z-index:11!important;visibility:visible!important;opacity:1!important;color:" + (isQuickCleaning ? "#f5e8cc" : "#e3eaf5") + "!important;font-size:" + (isQuickCleaning ? "9px" : "12px") + "!important;font-weight:700!important;line-height:1.2!important;margin:0!important;";
  heading.append(title,category,location);
  tile.append(heading);
  const contacts = node("div","tile-contacts");
  if (business.phone || isQuickCleaning) {
    const phone = node("a","tile-contact");
    phone.href = "tel:" + String(business.phone || "+12137062826").replace(/[^+0-9]/g,"");
    phone.append("☎  " + (business.phone || "(213) 706-2826"));
    phone.addEventListener("click",e => e.stopPropagation());
    contacts.append(phone);
  }
  [["instagram_url","◎ Instagram"],["facebook_url","f Facebook"],["tiktok_url","♪ TikTok"]].forEach(([key,label]) => {
    const href = socialUrl(business[key]); if (!href) return;
    const link = node("a","tile-contact");
    link.href=href; link.target="_blank"; link.rel="noopener noreferrer"; link.textContent=label;
    link.addEventListener("click",e=>e.stopPropagation()); contacts.append(link);
  });
  if (contacts.childElementCount) tile.append(contacts);
  if (isQuickCleaning) {
    tile.style.backgroundImage="radial-gradient(circle at 78% 18%,rgba(0,184,255,.28),transparent 40%),linear-gradient(145deg,#092b49 0%,#06101f 72%)";
    tile.style.backgroundSize="cover";
    tile.style.backgroundPosition="center";
  } else if (isTamosChelo) {
    tile.style.backgroundImage="radial-gradient(circle at 75% 15%,rgba(255,190,35,.22),transparent 42%),linear-gradient(145deg,#24202a 0%,#050912 78%)";
    tile.style.backgroundSize="cover";
    tile.style.backgroundPosition="center";

  } else {
    loadDiscoveryTilePhoto(business,tile);
  }
  tile.setAttribute("role","button");
  tile.tabIndex = 0;
  const open = () => {
    input.value = business.name || "";
    form.requestSubmit();
    window.scrollTo({top:0,behavior:"smooth"});
  };
  tile.dataset.searchBound = "true";
  tile.addEventListener("click",open);
  tile.addEventListener("keydown",e => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault();open(); }
  });
  return tile;
}


// Tarjetas HTML iniciales: mismo comportamiento de búsqueda que las tarjetas cargadas desde Supabase.
$("bottomDiscoveryRail")?.addEventListener("click",e=>{
  if(e.target.closest("a")) return;
  const tile=e.target.closest(".business-tile");
  if(!tile || tile.dataset.searchBound==="true") return;
  const title=tile.querySelector(".tile-business-name")?.textContent?.trim();
  if(!title) return;
  input.value=title;
  if(typeof form.requestSubmit==="function") form.requestSubmit(searchButton);
  else form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));
  window.scrollTo({top:0,behavior:"smooth"});
});
$("bottomDiscoveryRail")?.querySelectorAll(".business-tile").forEach(tile=>{
  tile.setAttribute("role","button");
  tile.setAttribute("tabindex","0");
  tile.style.cursor="pointer";
  tile.addEventListener("keydown",e=>{
    if(e.key==="Enter"||e.key===" "){
      e.preventDefault();
      tile.click();
    }
  });
});

function renderDiscoveryRails() {
  const businesses = lastBusinesses.filter(b => b && String(b.status || "").toLowerCase() === "approved");
  // Si Supabase no devuelve negocios aprobados, conserva las tarjetas de respaldo
  // que ya vienen en el HTML. No vacíes las franjas visuales.
  if (!businesses.length) {
    const status = $("carouselStatus");
    if (status) status.textContent = lang === "es"
      ? "Negocios destacados de Reputix"
      : "Featured businesses on Reputix";
    return;
  }
  // Renderizar un solo carrusel inferior, sin duplicar tarjetas.
  ["topDiscoveryRail","leftDiscoveryRail","rightDiscoveryRail"].forEach(id => {
    const extra = $(id);
    if (extra) extra.replaceChildren();
  });
  const rail = $("bottomDiscoveryRail");
  if (rail) {
    rail.replaceChildren();
    for (let i=0;i<Math.min(5,businesses.length);i++) {
      const business = businesses[(discoveryOffset + i) % businesses.length];
      rail.append(makeDiscoveryTile(business));
    }
  }
  $("carouselStatus").textContent = lang === "es"
    ? "Negocios destacados · Alternan automáticamente cada 4 segundos"
    : "Featured businesses · Rotating automatically every 4 seconds";
}

function startDiscoveryRotation() {
  if (discoveryTimer) window.clearInterval(discoveryTimer);
  renderDiscoveryRails();

  // Alterna realmente las tarjetas aprobadas: cada ciclo avanza un negocio,
  // de modo que todos los negocios de la lista tengan su turno visible.
  discoveryTimer = window.setInterval(() => {
    if (document.hidden) return;
    const approved = lastBusinesses.filter(b =>
      b && String(b.status || "").toLowerCase() === "approved"
    );
    if (approved.length < 2) return;

    discoveryOffset = (discoveryOffset + 1) % approved.length;
    renderDiscoveryRails();

    // Entrada suave para que el cambio de tarjetas se perciba claramente.
    const rail = $("bottomDiscoveryRail");
    if (rail) {
      rail.querySelectorAll(":scope > .business-tile").forEach((tile, index) => {
        if (typeof tile.animate === "function") {
          tile.animate(
            [
              { opacity: 0.55, transform: "translateY(7px)" },
              { opacity: 1, transform: "translateY(0)" }
            ],
            { duration: 480, delay: index * 35, easing: "ease-out" }
          );
        }
      });
    }
  }, 4000);
}

function createPhotoUUID() {
  // Compatible con Safari antiguo: usa Web Crypto sin depender de randomUUID.
  if (window.crypto && typeof window.crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
    return hex.slice(0,8) + "-" + hex.slice(8,12) + "-" +
      hex.slice(12,16) + "-" + hex.slice(16,20) + "-" + hex.slice(20);
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function photoPathUrl(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function uploadBusinessPhoto(file,businessId) {
  if (!file) return;
  const allowed = ["image/jpeg","image/png","image/webp"];
  if (!allowed.includes(file.type)) throw new Error(lang === "es" ? "Usa JPG, PNG o WebP." : "Use JPG, PNG or WebP.");
  if (file.size > 5 * 1024 * 1024) throw new Error(lang === "es" ? "La foto debe pesar 5 MB o menos." : "Photo must be 5 MB or less.");

  const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const path = "proposals/" + businessId + "/" + createPhotoUUID() + "." + ext;
  const response = await fetch(SUPABASE_URL + "/storage/v1/object/business-photos/" + photoPathUrl(path), {
    method:"POST",
    headers:{
      apikey:SUPABASE_KEY,
      Authorization:"Bearer " + SUPABASE_KEY,
      "Content-Type":file.type,
      "x-upsert":"false"
    },
    body:file
  });
  if (!response.ok) throw new Error("Storage (" + response.status + "): " + (await response.text()).slice(0,300));

  try {
    await api("business_photos",{
      method:"POST",
      headers:{Prefer:"return=minimal"},
      body:JSON.stringify({
        business_id:String(businessId),
        storage_path:path,
        original_filename:file.name,
        content_type:file.type,
        file_size:file.size,
        status:"pending"
      })
    });
  } catch (err) {
    throw new Error((lang === "es" ? "La foto se cargó, pero no se pudo enviar a revisión: " : "Photo uploaded but could not be submitted for review: ") + err.message);
  }
}

async function loadApprovedBusinessPhotos(businessId,card) {
  try {
    const params = new URLSearchParams({
      select:"storage_path",
      business_id:"eq." + businessId,
      status:"eq.approved",
      order:"created_at.asc",
      limit:"12"
    });
    const rows = await api("business_photos?" + params);
    if (!Array.isArray(rows) || !rows.length) return;
    const cover = card.querySelector(".business-cover");
    const gallery = node("div","business-photo-gallery");
    let firstPhoto = true;
    for (const row of rows) {
      const response = await fetch(SUPABASE_URL + "/storage/v1/object/sign/business-photos/" + photoPathUrl(row.storage_path),{
        method:"POST",
        headers:{
          apikey:SUPABASE_KEY,
          Authorization:"Bearer " + SUPABASE_KEY,
          "Content-Type":"application/json"
        },
        body:JSON.stringify({expiresIn:3600})
      });
      if (!response.ok) continue;
      const data = await response.json();
      const signed = data.signedURL || data.signedUrl;
      if (!signed) continue;
      const src = (signed.startsWith("https://") || signed.startsWith("http://"))
        ? signed
        : SUPABASE_URL + "/storage/v1" + (signed.startsWith("/") ? signed : "/" + signed);
      if (firstPhoto && cover) {
        const img = node("img","business-cover-image");
        img.src = src;
        img.alt = lang === "es" ? "Portada del negocio" : "Business cover photo";
        img.loading = "lazy";
        const caption = cover.querySelector(".business-cover-caption");
        cover.insertBefore(img,caption || cover.firstChild);
        cover.classList.add("has-photo");
        firstPhoto = false;
      } else {
        const img = node("img","business-photo");
        img.src = src;
        img.alt = lang === "es" ? "Foto del negocio" : "Business photo";
        img.loading = "lazy";
        gallery.append(img);
      }
    }
    if (gallery.childElementCount) card.insertBefore(gallery,card.querySelector(".stats"));
  } catch (err) {
    console.error("Error al cargar fotos aprobadas:",err);
  }
}

function normalizeSocialInput(value,platform) {
  let v=String(value||"").trim(); if(!v)return null;
  if(v.startsWith("@")) v=v.slice(1);
  if(!/^https?:\/\//i.test(v)) {
    if(platform==="instagram")v="https://www.instagram.com/"+v;
    if(platform==="facebook")v="https://www.facebook.com/"+v;
    if(platform==="tiktok")v="https://www.tiktok.com/@"+v.replace(/^@/,"");
  }
  return socialUrl(v);
}
function socialUrl(value) {
  const u=safeUrl(value); if(!u)return null;
  try {const host=new URL(u).hostname.toLowerCase();return ["instagram.com","www.instagram.com","facebook.com","www.facebook.com","m.facebook.com","tiktok.com","www.tiktok.com"].includes(host)?u:null;} catch(_){return null;}
}
function makeBusinessCover(business) {
  const cover = node("div","business-cover");
  const category = String(business.category || "").toLowerCase();
  let theme = "general", symbol = "✦", label = business.category || (lang === "es" ? "Negocio local" : "Local business");
  if (/smoke|vape|tabaco|cigar|fum|cannabis/.test(category)) { theme = "smoke"; symbol = "♨"; }
  else if (/food|restaurant|comida|restaurante|cafe|cafeter/.test(category)) { theme = "food"; symbol = "🍽"; }
  else if (/construction|constru|contractor|building/.test(category)) { theme = "construction"; symbol = "🏗"; }
  else if (/auto|mechanic|taller|car|vehicle/.test(category)) { theme = "auto"; symbol = "🔧"; }
  else if (/clothing|ropa|fashion|apparel/.test(category)) { theme = "fashion"; symbol = "✦"; }
  else if (/market|supermarket|grocery|tienda/.test(category)) { theme = "market"; symbol = "🛒"; }
  cover.classList.add("cover-" + theme);
  const art = node("div","business-cover-art",symbol);
  const caption = node("div","business-cover-caption");
  caption.append(node("strong","",business.name || (lang === "es" ? "Negocio" : "Business")));
  caption.append(node("span","",label));
  const contacts = node("div","business-cover-contacts");
  if (business.phone) {
    const phone = node("a","business-cover-contact");
    phone.href = "tel:" + String(business.phone).replace(/[^+0-9]/g,"");
    phone.append("☎  " + business.phone);
    contacts.append(phone);
  }
  [["instagram_url","◎ Instagram"],["facebook_url","f Facebook"],["tiktok_url","♪ TikTok"]].forEach(([key,label]) => {
    const href=socialUrl(business[key]); if(!href)return;
    const link=node("a","business-cover-contact"); link.href=href; link.target="_blank"; link.rel="noopener noreferrer";
    link.textContent=label; contacts.append(link);
  });
  if (contacts.childElementCount) caption.append(contacts);
  cover.append(art,caption);
  return cover;
}

function makeBusinessPhotoForm(business) {
  const f = node("form","form");
  f.append(node("h3","",lang === "es" ? "Agregar una foto" : "Add a photo"));
  const label = node("label","field",lang === "es" ? "Foto (JPG, PNG o WebP; máximo 5 MB)" : "Photo (JPG, PNG or WebP; 5 MB max)");
  const input = node("input");
  input.type = "file";
  input.name = "photo";
  input.accept = "image/jpeg,image/png,image/webp";
  input.required = true;
  label.append(input);
  const submit = node("button","secondary",lang === "es" ? "Enviar foto a revisión" : "Submit photo for review");
  submit.type = "submit";
  const msg = node("p","form-message","");
  f.append(label,submit,msg);
  f.addEventListener("submit",async e => {
    e.preventDefault();
    if (!input.files || !input.files[0]) return;
    submit.disabled = true;
    msg.textContent = lang === "es" ? "Subiendo foto…" : "Uploading photo…";
    try {
      await uploadBusinessPhoto(input.files[0],business.id);
      f.reset();
      msg.textContent = lang === "es" ? "Foto enviada. Se mostrará cuando sea aprobada." : "Photo submitted. It will appear once approved.";
    } catch(err) {
      msg.textContent = err.message || (lang === "es" ? "No se pudo enviar la foto." : "Could not submit photo.");
    } finally {
      submit.disabled = false;
    }
  });
  return f;
}

/* Detección aproximada del idioma: no traduce el texto. */
function detectLanguage(text) {
  if (typeof text !== "string" || !text.trim()) return null;
  const s = text.toLocaleLowerCase();

  const esWords = [
    "el","la","los","las","que","de","del","muy","bueno","malo",
    "servicio","atención","calidad","rápido","lento","bien","mal",
    "para","con","una","pero","porque","excelente","negocio",
    "compré","precios","gracias","está","tienda","cliente","amable",
    "fue","son","como","no","me","mi","por"
  ];
  const enWords = [
    "the","and","is","was","were","very","good","bad","service",
    "quality","fast","slow","with","for","this","that","not","great",
    "excellent","business","bought","prices","thanks","store",
    "customer","friendly","are","but","because","my","have","they"
  ];

  const count = words => {
    const pattern = new RegExp("\\b(" + words.join("|") + ")\\b","giu");
    return [...s.matchAll(pattern)].length;
  };

  const es = count(esWords);
  const en = count(enWords);
  if (es === en) return null;
  return es > en ? "es" : "en";
}

async function loadHourlyPatterns(business,list) {
  list.replaceChildren();
  try {
    const params = new URLSearchParams({
      select:"visit_hour,review_count,average_score,average_speed,average_service_quality,average_cleanliness",
      business_id:"eq." + business.id,
      order:"visit_hour.asc"
    });
    const rows = await api("business_hourly_patterns?" + params);
    if (!Array.isArray(rows) || !rows.length) {
      list.append(node("p","insight-empty",lang === "es"
        ? "Aún no hay suficientes opiniones por horario para mostrar patrones."
        : "Not enough reviews by time slot to show patterns yet."));
      return;
    }
    rows.forEach(row => {
      const item = node("div","hourly-item");
      const hour = Number(row.visit_hour);
      const time = (hour % 12 || 12) + ":00 " + (hour < 12 ? "AM" : "PM");
      const left = node("div","");
      left.append(node("div","hourly-time",time));
      left.append(node("div","hourly-detail",(lang === "es" ? "Atención " : "Service ") + row.average_service_quality + "/5 · " +
        (lang === "es" ? "Rapidez " : "Speed ") + row.average_speed + "/5 · " + row.review_count + (lang === "es" ? " opiniones" : " reviews")));
      item.append(left,node("div","ranking-score",Number(row.average_score).toFixed(1) + " ★"));
      list.append(item);
    });
  } catch(err) {
    console.error("Error loading hourly patterns:",err);
    list.append(node("p","insight-empty",lang === "es"
      ? "No se pudieron cargar los patrones por horario."
      : "Could not load hourly patterns."));
  }
}

async function loadWeeklyRankings() {
  const list = $("weeklyRankingList");
  list.replaceChildren();
  try {
    const rows = await api("weekly_business_rankings?select=weekly_rank,business_id,business_name,category,city,review_count,average_score,positive_reviews&order=weekly_rank.asc&limit=10");
    if (!Array.isArray(rows) || !rows.length) {
      list.append(node("p","insight-empty",lang === "es"
        ? "Esta semana todavía no hay negocios con 5 opiniones publicadas. ¡Ayúdanos a crear el ranking!"
        : "No businesses have 5 published reviews this week yet. Help us build the ranking!"));
      return;
    }
    rows.forEach(row => {
      const item = node("div","ranking-item");
      item.append(node("div","ranking-position","#" + row.weekly_rank));
      const info = node("div","");
      info.append(node("div","ranking-name",row.business_name));
      info.append(node("div","ranking-meta",[row.category,row.city,row.review_count + (lang === "es" ? " opiniones" : " reviews")].filter(Boolean).join(" · ")));
      item.append(info,node("div","ranking-score",Number(row.average_score).toFixed(1) + " ★"));
      list.append(item);
    });
  } catch(err) {
    console.error("Weekly rankings:",err);
    list.append(node("p","insight-empty",lang === "es"
      ? "Las estadísticas semanales estarán disponibles cuando termine la configuración."
      : "Weekly statistics will appear once setup is complete."));
  }
}

async function loadReviewTicker() {
  const rail = $("reviewTicker");
  rail.replaceChildren();
  try {
    const rows = await api("recent_review_highlights?select=review_id,business_id,business_name,visit_date,visit_time,average_score,review_excerpt&order=visit_date.desc&limit=12");
    if (!Array.isArray(rows) || !rows.length) {
      rail.append(node("p","insight-empty",lang === "es" ? "Todavía no hay reseñas recientes." : "No recent reviews yet."));
      return;
    }
    rows.forEach(row => {
      const card = node("article","ticker-card");
      card.append(node("div","ticker-business",row.business_name));
      const visit = row.visit_date ? new Date(row.visit_date + "T00:00:00").toLocaleDateString(lang === "es" ? "es-US" : "en-US") : "";
      card.append(node("div","ticker-meta",(visit ? visit + " · " : "") + (row.visit_time ? String(row.visit_time).slice(0,5) : "")));
      card.append(node("div","ticker-stars",stars(Number(row.average_score)) + " · " + Number(row.average_score).toFixed(1) + "/5"));
      if (row.review_excerpt) card.append(node("p","ticker-quote","“" + row.review_excerpt + "”"));
      rail.append(card);
    });
    // El carrusel queda manual: evita que un temporizador desplace toda la página
    // mientras la persona busca, escribe o completa formularios.

  } catch(err) {
    console.error("Review ticker:",err);
    rail.append(node("p","insight-empty",lang === "es" ? "No se pudieron cargar las reseñas." : "Could not load reviews."));
  }
}

function setupFeatureButtons() {
  const reviewsButton=$("featureReviews");
  const statsButton=$("featureStats");
  if(reviewsButton)reviewsButton.addEventListener("click",()=>{
    const target=$("reviewTickerPanel");
    target.scrollIntoView({behavior:"smooth",block:"start"});
    target.setAttribute("tabindex","-1");
    window.setTimeout(()=>target.focus({preventScroll:true}),450);
  });
  if(statsButton)statsButton.addEventListener("click",openAdvancedStats,{capture:true});
  // Delegación de respaldo: mantiene el acceso aunque otro módulo vuelva a registrar botones.
  document.addEventListener("click",event=>{
    const trigger=event.target && event.target.closest ? event.target.closest("#featureStats") : null;
    if(!trigger)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openAdvancedStats();
  },true);
  const refresh=$("advancedStatsRefresh");
  if(refresh)refresh.addEventListener("click",loadAdvancedStats);
}

function openAdvancedStats(){
  const panel=$("advancedStatsDashboard");
  if(!panel){
    console.error("Reputix: no se encontró advancedStatsDashboard");
    return;
  }
  panel.hidden=false;
  panel.removeAttribute("hidden");
  panel.scrollIntoView({behavior:"smooth",block:"start"});
  loadAdvancedStats().catch(err=>{
    console.error("Reputix advanced stats:",err);
    const status=$("advancedStatsStatus");
    if(status)status.textContent=(lang==="es"?"No se pudieron cargar las estadísticas: ":"Could not load statistics: ")+(err?.message||String(err));
  });
}

async function loadAdvancedStats(){
  const status=$("advancedStatsStatus");
  const kpis=$("advancedStatsKpis");
  const weekly=$("advancedWeeklyChart");
  const criteria=$("advancedCriteriaChart");
  const table=$("advancedBusinessRows");
  if(!status||!kpis||!weekly||!criteria||!table)return;
  status.textContent=lang==="es"?"Cargando opiniones publicadas…":"Loading published reviews…";
  kpis.replaceChildren();weekly.replaceChildren();criteria.replaceChildren();
  table.replaceChildren();
  try{
    const [reviews,businesses]=await Promise.all([
      api("reviews?select=id,business_id,visit_date,created_at,cleanliness,service_quality,product_quality,speed,value_for_money&status=eq.published&order=created_at.desc&limit=1000"),
      api("businesses?select=id,name,category,city&status=eq.approved&limit=1000")
    ]);
    if(!Array.isArray(reviews)||!Array.isArray(businesses))throw new Error("No se pudieron leer las estadísticas.");
    const businessMap=new Map(businesses.map(b=>[String(b.id),b]));
    const fields=[
      ["Limpieza","cleanliness"],["Servicio","service_quality"],["Calidad","product_quality"],["Rapidez","speed"],["Precio / valor","value_for_money"]
    ];
    const scoreValues=[];
    const sums=Object.fromEntries(fields.map(([label,key])=>[key,{sum:0,count:0}]));
    const byBusiness=new Map();
    const dayCounts=new Map();
    const now=new Date();
    for(let d=6;d>=0;d--){const day=new Date(now);day.setHours(0,0,0,0);day.setDate(day.getDate()-d);dayCounts.set(day.toISOString().slice(0,10),0);}
    reviews.forEach(r=>{
      const id=String(r.business_id);
      if(!byBusiness.has(id))byBusiness.set(id,{count:0,sum:0,n:0});
      const item=byBusiness.get(id);item.count++;
      const values=[];
      fields.forEach(([label,key])=>{
        const value=Number(r[key]);
        if(r[key]!==null&&r[key]!==undefined&&r[key]!==""&&Number.isFinite(value)&&value>=0&&value<=5){
          sums[key].sum+=value;sums[key].count++;values.push(value);
        }
      });
      if(values.length){const avg=values.reduce((a,b)=>a+b,0)/values.length;item.sum+=avg;item.n++;scoreValues.push(avg);}
      const date=(r.visit_date||r.created_at||"").slice(0,10);
      if(dayCounts.has(date))dayCounts.set(date,dayCounts.get(date)+1);
    });
    const overall=scoreValues.length?scoreValues.reduce((a,b)=>a+b,0)/scoreValues.length:0;
    const activeBusinesses=[...byBusiness.keys()].filter(id=>businessMap.has(id)).length;
    const avgPerReview=reviews.length?reviews.length/Math.max(1,activeBusinesses):0;
    const cards=[
      [String(reviews.length),"Opiniones publicadas"],
      [String(activeBusinesses),"Negocios con opiniones"],
      [scoreValues.length?overall.toFixed(2)+"/5":"—","Promedio general"],
      [avgPerReview.toFixed(1),"Opiniones por negocio"]
    ];
    cards.forEach(([value,label])=>{const card=node("div","advanced-kpi");card.append(node("strong","",value),node("span","",label));kpis.append(card);});
    const maxDay=Math.max(1,...dayCounts.values());
    dayCounts.forEach((count,date)=>{
      const wrap=node("div","advanced-bar-item");
      wrap.append(node("span","advanced-bar-value",String(count)));
      const bar=node("div","advanced-bar");bar.style.height=Math.max(3,Math.round(count/maxDay*125))+"px";bar.setAttribute("role","img");bar.setAttribute("aria-label",count+" opiniones");
      wrap.append(bar);
      const d=new Date(date+"T12:00:00");wrap.append(node("span","advanced-bar-label",d.toLocaleDateString(lang==="es"?"es-US":"en-US",{weekday:"short"})));
      weekly.append(wrap);
    });
    fields.forEach(([label,key])=>{
      const v=sums[key],avg=v.count?v.sum/v.count:0;
      const row=node("div","advanced-criterion-row");
      row.append(node("span","",label));
      const track=node("div","advanced-criterion-track"),fill=node("div","advanced-criterion-fill");
      fill.style.width=(v.count?Math.max(0,Math.min(100,avg/5*100)):0)+"%";track.append(fill);
      row.append(track,node("strong","",v.count?avg.toFixed(2):"—"));criteria.append(row);
    });
    const ranking=[...byBusiness.entries()].filter(([id])=>businessMap.has(id)).map(([id,v])=>({business:businessMap.get(id),...v,average:v.n?v.sum/v.n:0})).sort((a,b)=>b.count-a.count).slice(0,10);
    if(!ranking.length){const tr=node("tr","");const td=node("td","",lang==="es"?"Aún no hay opiniones publicadas para mostrar.":"No published reviews to display yet.");td.colSpan=3;tr.append(td);table.append(tr);}
    ranking.forEach(row=>{
      const tr=node("tr","");
      tr.append(node("td","",row.business.name||"Negocio"),node("td","",String(row.count)),node("td","",row.n?row.average.toFixed(2)+" / 5":"—"));
      table.append(tr);
    });
    status.textContent=lang==="es"?"Datos actualizados: "+new Date().toLocaleString("es-US")+" · máximo 1.000 opiniones recientes.":"Updated: "+new Date().toLocaleString("en-US")+" · up to 1,000 recent reviews.";
  }catch(err){
    console.error("Advanced Reputix stats:",err);
    status.textContent=(lang==="es"?"No se pudieron cargar las estadísticas: ":"Could not load statistics: ")+(err.message||String(err));
    const tr=node("tr","");const td=node("td","",lang==="es"?"Revisa la conexión y vuelve a intentar.":"Check the connection and try again.");td.colSpan=3;tr.append(td);table.append(tr);
  }
}

function renderReview(r) {
  const box = node("article","review");
  box.append(node("div","stars",stars(average([r]))));

  const date = r.visit_date
    ? new Date(r.visit_date + "T00:00:00").toLocaleDateString(lang === "es" ? "es-US" : "en-US")
    : "—";

  box.append(node("div","muted",t("visit") + ": " + date +
    (r.visit_time ? " · " + String(r.visit_time).slice(0,5) : "")));

  if (r.comment) {
    box.append(node("p","",r.comment));
    box.append(node("div","muted",
      t("original") + ": " + (r.original_language || detectLanguage(r.comment) || t("languageUnknown"))
    ));

    if (r.translated_comment) {
      const b = node("button","secondary",t("translation"));
      b.type = "button";
      const translated = node("p","",r.translated_comment);
      translated.hidden = true;
      b.addEventListener("click",() => {
        translated.hidden = !translated.hidden;
        b.textContent = translated.hidden ? t("translation") : t("hideTranslation");
      });
      box.append(b,translated);
    }
  }

  const values = t("criteria").map((label,i) => [
    label,
    [r.cleanliness,r.service_quality,r.product_quality,r.speed,r.value_for_money][i]
  ]).filter(x => x[1] !== null && x[1] !== undefined);

  if (values.length) {
    box.append(node("div","muted",
      values.map(x => x[0] + ": " + x[1] + "/5").join(" · ")
    ));
  }
  return box;
}

/* Solo se muestran reseñas publicadas. */
async function loadReviews(business,list,status,stats,ratingRow) {
  status.textContent = t("loading");
  list.replaceChildren();

  try {
    const params = new URLSearchParams({
      select:"id,business_id,visit_date,visit_time,cleanliness,service_quality,product_quality,speed,value_for_money,comment,status,created_at,original_language,translated_comment,translated_language",
      business_id:"eq." + business.id,
      status:"eq.published",
      order:"created_at.desc",
      limit:"100"
    });

    const reviews = await api("reviews?" + params);
    if (!Array.isArray(reviews)) throw new Error("Formato inesperado");

    status.textContent = "";
    if (!reviews.length) list.append(node("p","empty",t("none")));
    else reviews.forEach(r => list.append(renderReview(r)));

    const avg = average(reviews);
    const count = reviews.length;

    stats.replaceChildren(
      makeStat(avg === null ? "—" : avg.toFixed(1) + "/5",t("score")),
      makeStat(count,t("count")),
      makeStat(count >= 5 ? "✓" : "—",t("trends"))
    );

    ratingRow.replaceChildren(
      node("span","stars",stars(avg)),
      node("span","rating-number",avg === null ? "—" : avg.toFixed(1) + "/5"),
      node("span","muted",count ? count + " " + t("count") : t("noRating"))
    );
  } catch (err) {
    console.error("Error al cargar opiniones:",err);
    status.textContent = t("reviewError");
  }
}

/* Formulario de reseñas */
function makeReviewForm(business) {
  const f = node("form","form");
  f.append(node("h3","",t("share")),node("p","empty",t("pending")));
  const grid = node("div","form-grid");

  function addField(label,key,type,full=false) {
    const l = node("label","field" + (full ? " full" : ""),label);
    let el;

    if (type === "select") {
      el = node("select");
      el.required = true;
      el.append(new Option(t("choose"),""));
      for (let i=1;i<=5;i++) {
        el.append(new Option(i + " / 5 " + "★".repeat(i),String(i)));
      }
    } else if (type === "textarea") {
      el = node("textarea");
      el.rows = 4;
      el.maxLength = 2000;
      el.placeholder = t("commentHint");
    } else {
      el = node("input");
      el.type = type;
      el.required = true;
      if (type === "date") el.max = new Date().toISOString().slice(0,10);
    }

    el.name = key;
    l.append(el);
    grid.append(l);
  }

  addField(t("date"),"visit_date","date");
  addField(t("time"),"visit_time","time");
  addField(lang === "es" ? "¿Quién te atendió? (opcional)" : "Who served you? (optional)","staff_name","text");
  const staffHint = node("p","staff-field-note",lang === "es"
    ? "Usaremos esta información para detectar patrones con suficientes opiniones. No publicaremos comparaciones individuales."
    : "We use this to detect patterns with enough reviews. Individual comparisons will not be public.");
  grid.append(staffHint);
  ["cleanliness","service_quality","product_quality","speed","value_for_money"]
    .forEach((key,i) => addField(t("criteria")[i],key,"select"));
  addField(t("comment"),"comment","textarea",true);
  f.append(grid);

  const submit = node("button","primary",t("send"));
  submit.type = "submit";
  submit.style.width = "100%";
  submit.style.marginTop = "12px";

  const msg = node("p","form-message","");
  msg.setAttribute("aria-live","polite");
  f.append(submit,msg);

  f.addEventListener("submit",async e => {
    e.preventDefault();
    if (!f.reportValidity()) return;

    submit.disabled = true;
    msg.textContent = t("sending");

    try {
      const fd = new FormData(f);
      const comment = String(fd.get("comment") || "");
      const originalLanguage = detectLanguage(comment);
      let translatedComment = null;
      let translatedLanguage = null;

      // La traducción asistida es opcional: nunca impide enviar la reseña original.
      // La función exige sesión válida; usuarios sin sesión conservan su texto original.
      if (comment.trim() && ownerSession?.access_token && originalLanguage !== "und") {
        try {
          const targetLanguage = originalLanguage === "en" ? "es" : "en";
          let translationResponse = await fetch(SUPABASE_URL + "/functions/v1/reputix-ai", {
            method: "POST",
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: "Bearer " + ownerSession.access_token,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              message: comment.trim(),
              language: targetLanguage,
              mode: "translate"
            })
          });
          if (translationResponse.status === 401 && ownerSession.refresh_token) {
            const refreshed = await ownerAuthRequest("token?grant_type=refresh_token", {refresh_token: ownerSession.refresh_token});
            if (refreshed?.access_token && refreshed?.user?.id) {
              ownerSetSession(refreshed);
              translationResponse = await fetch(SUPABASE_URL + "/functions/v1/reputix-ai", {
                method: "POST",
                headers: {
                  apikey: SUPABASE_KEY,
                  Authorization: "Bearer " + refreshed.access_token,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  message: comment.trim(),
                  language: targetLanguage,
                  mode: "translate"
                })
              });
            }
          }
          const translationData = await translationResponse.json().catch(() => ({}));
          if (translationResponse.ok && typeof translationData.translation === "string" && translationData.translation.trim()) {
            translatedComment = translationData.translation.trim();
            translatedLanguage = targetLanguage;
          } else {
            console.warn("Optional review translation unavailable:", translationData.error || translationResponse.status);
          }
        } catch (translationError) {
          console.warn("Optional review translation failed; preserving original:", translationError);
        }
      }

      if (!business.id) throw new Error(t("invalidBusiness"));

      const insertedReviews = await api("reviews",{
        method:"POST",
        headers:{Prefer:"return=representation"},
        body:JSON.stringify({
          business_id:business.id,
          user_id:ownerSession?.user?.id || null,
          visit_date:fd.get("visit_date"),
          visit_time:fd.get("visit_time") || null,
          staff_name:String(fd.get("staff_name") || "").trim() || null,
          cleanliness:Number(fd.get("cleanliness")),
          service_quality:Number(fd.get("service_quality")),
          product_quality:Number(fd.get("product_quality")),
          speed:Number(fd.get("speed")),
          value_for_money:Number(fd.get("value_for_money")),
          comment:comment.trim() ? comment : null,
          original_language:originalLanguage,
          translated_comment:translatedComment,
          translated_language:translatedLanguage,
          status:"pending"
        })
      });

      // Moderación IA orientativa: nunca publica, rechaza ni modifica el estado pending.
      let moderationNote = "";
      const insertedReview = Array.isArray(insertedReviews) ? insertedReviews[0] : null;
      if (insertedReview?.id && ownerSession?.access_token) {
        try {
          let moderationResponse = await fetch(SUPABASE_URL + "/functions/v1/reputix-ai", {
            method: "POST",
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: "Bearer " + ownerSession.access_token,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({mode:"moderate", review_id:insertedReview.id})
          });
          if (moderationResponse.status === 401 && ownerSession.refresh_token) {
            const refreshed = await ownerAuthRequest("token?grant_type=refresh_token", {refresh_token:ownerSession.refresh_token});
            if (refreshed?.access_token && refreshed?.user?.id) {
              ownerSetSession(refreshed);
              moderationResponse = await fetch(SUPABASE_URL + "/functions/v1/reputix-ai", {
                method: "POST",
                headers: {
                  apikey: SUPABASE_KEY,
                  Authorization: "Bearer " + refreshed.access_token,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({mode:"moderate", review_id:insertedReview.id})
              });
            }
          }
          const moderationData = await moderationResponse.json().catch(() => ({}));
          if (moderationResponse.ok) {
            moderationNote = moderationData.outcome === "clear"
              ? (lang === "es" ? " La revisión automática no detectó alertas; sigue pendiente de aprobación." : " Automated screening found no flags; it is still awaiting approval.")
              : (lang === "es" ? " La IA señaló contenido para revisión humana; tu opinión sigue pendiente." : " AI flagged content for human review; your review remains pending.");
          } else {
            console.warn("AI moderation unavailable:", moderationData.error || moderationResponse.status);
          }
        } catch (moderationError) {
          console.warn("AI moderation request failed:", moderationError);
        }
      }

      f.reset();
      msg.textContent = t("sent") + moderationNote;
    } catch (err) {
      console.error("Error al enviar reseña:",err);
      msg.textContent = t("failed") + " " + (err.message || "");
    } finally {
      submit.disabled = false;
    }
  });

  return f;
}

/* Quejas: el público solo ve las que tengan status=published.
   Las respuestas se muestran si existen en business_response. */
function makeComplaintSection(business) {
  const section = node("section","details");
  section.append(
    node("h3","",t("complaints")),
    node("p","empty",t("complaintIntro"))
  );

  const status = node("p","empty",t("complaintLoading"));
  const list = node("div","");
  section.append(status,list);

  async function loadPublicComplaints() {
    list.replaceChildren();
    status.textContent = t("complaintLoading");

    try {
      const params = new URLSearchParams({
        select:"id,business_id,complaint,original_language,status,business_response,created_at",
        business_id:"eq." + business.id,
        status:"eq.published",
        order:"created_at.desc",
        limit:"50"
      });

      const rows = await api("complaints?" + params);
      if (!Array.isArray(rows)) throw new Error("Respuesta inesperada");

      status.textContent = "";

      if (!rows.length) {
        list.append(node("p","empty",t("complaintNone")));
        return;
      }

      rows.forEach(item => {
        const card = node("article","review");
        card.append(
          node("div","category",t("complaintPublic")),
          node("p","",item.complaint || ""),
          node("div","muted",t("original") + ": " + (item.original_language || "und"))
        );

        if (item.business_response) {
          card.append(
            node("strong","",t("businessResponse")),
            node("p","",item.business_response)
          );
        }

        list.append(card);
      });
    } catch (err) {
      console.error("Error al cargar quejas:",err);
      status.textContent = t("complaintReadError");
    }
  }

  const f = node("form","form");
  f.append(node("h3","",t("complaintLabel")));

  const label = node("label","field",t("complaintLabel"));
  const textarea = node("textarea");
  textarea.name = "complaint";
  textarea.required = true;
  textarea.minLength = 10;
  textarea.maxLength = 5000;
  textarea.rows = 5;
  textarea.placeholder = t("complaintHint");
  label.append(textarea);

  f.append(label,node("p","muted",t("complaintPrivacy")));

  const submit = node("button","primary",t("complaintSend"));
  submit.type = "submit";
  submit.style.marginTop = "12px";

  const msg = node("p","form-message","");
  msg.setAttribute("aria-live","polite");
  f.append(submit,msg);
  section.append(f);

  f.addEventListener("submit",async e => {
    e.preventDefault();
    const complaint = textarea.value.trim();

    if (!business.id || complaint.length < 10) {
      msg.textContent = t("complaintTooShort");
      return;
    }

    submit.disabled = true;
    msg.textContent = t("complaintSending");

    try {
      await api("complaints",{
        method:"POST",
        headers:{Prefer:"return=minimal"},
        body:JSON.stringify({
          business_id:business.id,
          user_id:ownerSession?.user?.id || null,
          complaint:complaint,
          original_language:detectLanguage(complaint),
          status:"pending"
        })
      });

      f.reset();
      msg.textContent = t("complaintSent");
    } catch (err) {
      console.error("Error al enviar queja:",err);
      msg.textContent = t("complaintFailed") + " " + (err.message || "");
    } finally {
      submit.disabled = false;
    }
  });

  loadPublicComplaints();
  return section;
}

/* Perfil de negocio */
function renderBusiness(b) {
  const card = node("article","business-card");
  const cover = makeBusinessCover(b);
  card.append(cover);
  const top = node("div","business-top");
  const url = safeUrl(b.logo_url || b.image_url || b.photo_url);

  if (url) {
    const img = node("img","business-logo");
    img.src = url;
    img.alt = b.name || "Business";
    img.loading = "lazy";
    img.onerror = () => img.replaceWith(node("div","business-logo","✦"));
    top.append(img);
  } else {
    top.append(node("div","business-logo","✦"));
  }

  const heading = node("div","business-heading");
  heading.append(
    node("h2","",b.name || "Negocio"),
    node("div","category",b.category || t("category"))
  );
  top.append(heading);
  card.append(top);

  const rating = node("div","rating-row");
  rating.append(
    node("span","stars","☆☆☆☆☆"),
    node("span","rating-number","—"),
    node("span","muted",t("noRating"))
  );
  card.append(rating,node("div","divider"));

  const info = node("div","info");
  info.append(makeLine("⌖",b.address || t("address")));

  if (!b.phone) info.append(makeLine("☎",t("phone")));
  info.append(makeLine("◷",b.hours || b.opening_hours || t("hours")));

  const website = safeUrl(b.website);
  if (website) {
    const row = node("div","info-line");
    const a = node("a","",website);
    a.href = website;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.style.color = "#85baff";
    row.append("↗ ",a);
    info.append(row);
  }

  [["instagram_url","◎ Instagram"],["facebook_url","f Facebook"],["tiktok_url","♪ TikTok"]].forEach(([key,label])=>{
    const href=socialUrl(b[key]); if(!href)return;
    const row=node("div","info-line"),a=node("a","",label);a.href=href;a.target="_blank";a.rel="noopener noreferrer";a.style.color="#70d4ff";row.append(a);info.append(row);
  });
  info.append(node("p","muted",b.description || t("description")));
  card.append(info);
  loadApprovedBusinessPhotos(b.id,card);

  const stats = node("div","stats");
  stats.append(
    makeStat("—",t("score")),
    makeStat("—",t("count")),
    makeStat("—",t("trends"))
  );
  card.append(stats);

  const actions = node("div","actions");
  const profile = node("button","primary",t("profile"));
  const reviewsBtn = node("button","secondary",t("reviews"));
  profile.type = "button";
  reviewsBtn.type = "button";
  actions.append(profile,reviewsBtn);
  card.append(actions);

  const details = node("section","details");
  details.hidden = true;
  const hourlyPanel = node("section","details");
  hourlyPanel.append(
    node("h3","",lang === "es" ? "Atención por horario" : "Service by time of day"),
    node("p","empty",lang === "es"
      ? "Se mostrarán patrones cuando existan al menos 5 opiniones por horario."
      : "Patterns appear once there are at least 5 reviews per time slot.")
  );
  const hourlyList = node("div","hourly-list");
  hourlyPanel.append(hourlyList);

  const reviewStatus = node("p","empty",t("loading"));
  const reviewList = node("div","");

  details.append(
    hourlyPanel,
    node("h3","",t("reviews")),
    reviewStatus,
    reviewList,
    makeReviewForm(b),
    makeBusinessPhotoForm(b),
    makeComplaintSection(b)
  );
  card.append(details);

  let loaded = false;

  async function openDetails() {
    details.hidden = false;
    profile.textContent = t("close");

    if (!loaded) {
      loaded = true;
      await Promise.all([
        loadReviews(b,reviewList,reviewStatus,stats,rating),
        loadHourlyPatterns(b,hourlyList)
      ]);
    }
  }

  profile.addEventListener("click",async () => {
    if (details.hidden) {
      await openDetails();
    } else {
      details.hidden = true;
      profile.textContent = t("profile");
    }
  });

  reviewsBtn.addEventListener("click",async () => {
    await openDetails();
    details.scrollIntoView({behavior:"smooth",block:"nearest"});
  });

  return card;
}

/* Formulario comunitario: propuestas enviadas como pending. */
function renderCommunityForm(type) {
  proposalType = type;
  const wrap = $("communityFormWrap");
  wrap.hidden = false;

  $("addBusinessChoice").setAttribute("aria-expanded",String(type === "business"));
  $("addProChoice").setAttribute("aria-expanded",String(type === "professional"));

  const f = node("form","form community-form");
  f.append(
    node("h3","",t("submitBusinessTitle")),
    node("p","empty",t("proposalNotice"))
  );

  const grid = node("div","form-grid");

  function addField(labelText,name,kind,placeholder,full=false,required=false) {
    const label = node("label","field" + (full ? " full" : ""),labelText);
    let el;

    if (kind === "select") {
      el = node("select");
      el.required = required;
      el.append(new Option(t("chooseCategory"),""));
      const categories = type === "business" ? t("businessCategories") : t("proCategories");
      categories.forEach(c => el.append(new Option(c,c)));
    } else if (kind === "textarea") {
      el = node("textarea");
      el.rows = 3;
      el.maxLength = 1500;
      el.placeholder = placeholder;
    } else {
      el = node("input");
      el.type = "text";
      el.maxLength = name === "name" ? 120 : 250;
      el.placeholder = placeholder;
      el.required = required;
    }

    el.name = name;
    label.append(el);
    grid.append(label);
  }

  addField(t("formName"),"name","text",t("formNameHint"),true,true);
  addField(t("formCategory"),"category","select","",false,true);
  addField(t("formAddress"),"address","text",t("formAddressHint"));
  addField(t("formCity"),"city","text",t("formCityHint"),false,true);
  addField(t("formZip"),"zip","text","90001");
  addField(t("formPhone"),"phone","text",t("formPhoneHint"));
  addField(lang==="es"?"Instagram (URL o @usuario)":"Instagram (URL or @username)","instagram_url","text","https://instagram.com/...");
  addField(lang==="es"?"Facebook (URL)":"Facebook (URL)","facebook_url","text","https://facebook.com/...");
  addField(lang==="es"?"TikTok (URL o @usuario)":"TikTok (URL or @username)","tiktok_url","text","https://tiktok.com/@...");
  addField(t("formHours"),"hours","text",t("formHoursHint"));
  addField(t("formDescription"),"description","textarea",t("formDescriptionHint"),true);

  const photoLabel = node("label","field full",lang === "es"
    ? "Foto del negocio (opcional; JPG, PNG o WebP; máximo 5 MB)"
    : "Business photo (optional; JPG, PNG or WebP; 5 MB max)");
  const photoInput = node("input");
  photoInput.type = "file";
  photoInput.name = "photo";
  photoInput.accept = "image/jpeg,image/png,image/webp";
  photoLabel.append(photoInput);
  grid.append(photoLabel);
  f.append(grid);

  const submit = node("button","primary",t("sendProposal"));
  submit.type = "submit";
  submit.style.marginTop = "14px";
  submit.style.width = "100%";

  const msg = node("p","form-message","");
  msg.setAttribute("aria-live","polite");
  f.append(submit,msg);
  wrap.replaceChildren(f);

  f.addEventListener("submit",async e => {
    e.preventDefault();
    if (!f.reportValidity()) return;

    const fd = new FormData(f);
    const name = String(fd.get("name") || "").trim();
    const category = String(fd.get("category") || "").trim();
    const city = String(fd.get("city") || "").trim();

    if (!name || !category || !city) {
      msg.textContent = t("proposalRequired");
      return;
    }

    submit.disabled = true;
    msg.textContent = lang === "es" ? "Enviando propuesta…" : "Submitting suggestion…";

    try {
      const created = await api("rpc/submit_business_proposal",{
        method:"POST",
        body:JSON.stringify({
          p_name:name,
          p_category:type === "professional"
            ? (lang === "es" ? "Profesional / servicio: " : "Professional / service: ") + category
            : category,
          p_address:String(fd.get("address") || "").trim() || null,
          p_city:city,
          p_zip:String(fd.get("zip") || "").trim() || null,
          p_phone:String(fd.get("phone") || "").trim() || null,
          p_hours:String(fd.get("hours") || "").trim() || null,
          p_description:String(fd.get("description") || "").trim() || null,
          p_instagram_url:normalizeSocialInput(fd.get("instagram_url"),"instagram"),
          p_facebook_url:normalizeSocialInput(fd.get("facebook_url"),"facebook"),
          p_tiktok_url:normalizeSocialInput(fd.get("tiktok_url"),"tiktok")
        })
      });
      const businessId = typeof created === "string" ? created : created && created.id;
      if (!businessId) throw new Error(lang === "es" ? "El negocio se envió, pero no recibimos su identificador. No vuelvas a enviarlo; contacta soporte." : "Business submitted, but its ID was not returned. Do not submit again; contact support.");

      const photo = photoInput.files && photoInput.files[0];
      let photoMessage = "";
      if (photo) {
        try {
          await uploadBusinessPhoto(photo,businessId);
          photoMessage = lang === "es" ? " La foto también quedó enviada a revisión." : " The photo was also submitted for review.";
        } catch(photoErr) {
          photoMessage = lang === "es"
            ? " El negocio quedó enviado, pero la foto no: " + photoErr.message
            : " The business was submitted, but the photo was not: " + photoErr.message;
        }
      }

      f.reset();
      msg.textContent = lang === "es"
        ? "¡Propuesta recibida! El negocio aparecerá cuando sea aprobado." + photoMessage
        : "Proposal received! The business will appear once approved." + photoMessage;
    } catch (err) {
      console.error("Error al proponer negocio:",err);
      msg.textContent = t("proposalFailed") + " " + (err.message || "");
    } finally {
      submit.disabled = false;
    }
  });

  wrap.scrollIntoView({behavior:"smooth",block:"nearest"});
}

$("addBusinessChoice").addEventListener("click",() => renderCommunityForm("business"));
$("addProChoice").addEventListener("click",() => renderCommunityForm("professional"));
$("independentJoinBtn").addEventListener("click",() => {
  renderCommunityForm("professional");
  $("communityFormWrap").scrollIntoView({behavior:"smooth",block:"start"});
});

/* Buscador */
form.addEventListener("submit",async e => {
  e.preventDefault();
  const query = input.value.trim();

  if (!query) {
    notice.textContent = t("initial");
    return;
  }

  resultsBox.hidden = false;
  resultsBox.replaceChildren();
  notice.textContent = t("searching");
  searchButton.disabled = true;

  try {
    const params = new URLSearchParams({
      select:"*",
      name:"ilike.*" + query.replace(/[%_]/g,"") + "*",
      status:"eq.approved",
      limit:"20"
    });

    const data = await api("businesses?" + params);

    if (!Array.isArray(data) || !data.length) {
      notice.textContent = t("notfound");
      return;
    }

    lastBusinesses = data;
    resultsBox.hidden = false;
    resultsBox.replaceChildren(...data.map(renderBusiness));
    renderDiscoveryRails();
    notice.textContent = data.length + " " + t("found");
  } catch (err) {
    console.error("Error en búsqueda:",err);
    notice.textContent = t("network") + " " + (err.message || "");
  } finally {
    searchButton.disabled = false;
  }
});

setLanguage("es");
loadApprovedBusinesses();
loadWeeklyRankings();
loadReviewTicker();

/* Propietarios: Auth de Supabase y panel privado */
async function ownerAuthRequest(path,payload) {
  const response = await fetch(SUPABASE_URL + "/auth/v1/" + path,{
    method:"POST",
    headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},
    body:JSON.stringify(payload)
  });
  const body = await response.json().catch(()=>({}));
  if (!response.ok) {
    const detail = body.msg || body.message || body.error_description || body.error;
    throw new Error(detail || ("Error de autenticación (" + response.status + ")."));
  }
  return body;
}
function ownerText(es,en){return lang==="es"?es:en;}

async function ownerSendPasswordRecovery() {
  const email = $("ownerEmail").value.trim();
  const message = $("ownerAuthMessage");
  const button = $("ownerForgotPassword");
  if (!email) {
    message.textContent = ownerText("Escribe tu correo electrónico y vuelve a pulsar «¿Olvidaste tu contraseña?».","Enter your email address, then choose “Forgot your password?” again.");
    $("ownerEmail").focus();
    return;
  }
  button.disabled = true;
  message.textContent = ownerText("Enviando instrucciones de recuperación…","Sending password recovery instructions…");
  try {
    // Usa siempre el dominio canónico autorizado en Supabase.
    const redirectTo = "https://www.reputixapp.com/";
    await ownerAuthRequest("recover?redirect_to=" + encodeURIComponent(redirectTo), {email});
    message.textContent = ownerText(
      "Si existe una cuenta con ese correo, recibirás un enlace para crear una contraseña nueva. Revisa también correo no deseado.",
      "If an account exists for that email, you will receive a link to create a new password. Check your spam folder too."
    );
  } catch (error) {
    message.textContent = ownerText("No se pudo enviar el correo de recuperación: ","Could not send the recovery email: ") + (error?.message || String(error));
  } finally {
    button.disabled = false;
  }
}

function ownerShowPasswordResetFromLink() {
  // Supabase puede devolver tokens o errores en el fragmento (#) o en la consulta (?).
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const type = hash.get("type") || query.get("type");
  const token = hash.get("access_token") || query.get("access_token");
  const authError = hash.get("error_description") || hash.get("error") ||
                    query.get("error_description") || query.get("error");
  if (authError) {
    $("ownerAuthMessage").textContent = authError.replace(/\\+/g," ");
    return;
  }
  if (type !== "recovery" || !token) return;
  ownerRecoveryAccessToken = token;
  $("ownerAuthForm").hidden = true;
  $("ownerPasswordResetPanel").hidden = false;
  $("ownerAuthMessage").textContent = ownerText("Enlace de recuperación reconocido. Crea tu nueva contraseña.","Recovery link recognized. Create your new password.");
  $("ownerArea").scrollIntoView({behavior:"smooth",block:"start"});
}

async function ownerSaveNewPassword() {
  const password = $("ownerNewPassword").value;
  const confirmation = $("ownerConfirmPassword").value;
  const message = $("ownerAuthMessage");
  const button = $("ownerSaveNewPassword");
  if (!ownerRecoveryAccessToken) {
    message.textContent = ownerText("El enlace de recuperación no está activo. Solicita uno nuevo.","The recovery link is not active. Request a new one.");
    return;
  }
  if (!password || password.length < 8) {
    message.textContent = ownerText("La contraseña debe tener al menos 8 caracteres.","Your password must be at least 8 characters long.");
    $("ownerNewPassword").focus();
    return;
  }
  if (password !== confirmation) {
    message.textContent = ownerText("Las contraseñas no coinciden.","The passwords do not match.");
    $("ownerConfirmPassword").focus();
    return;
  }
  button.disabled = true;
  message.textContent = ownerText("Actualizando contraseña…","Updating password…");
  try {
    const response = await fetch(SUPABASE_URL + "/auth/v1/user", {
      method:"PUT",
      headers:{
        apikey:SUPABASE_KEY,
        Authorization:"Bearer " + ownerRecoveryAccessToken,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({password})
    });
    const body = await response.json().catch(()=>({}));
    if (!response.ok) {
      const detail = body.msg || body.message || body.error_description || body.error;
      throw new Error(detail || ("Error de actualización (" + response.status + ")."));
    }
    ownerRecoveryAccessToken = null;
    $("ownerPasswordResetPanel").hidden = true;
    $("ownerAuthForm").hidden = false;
    $("ownerPassword").value = "";
    $("ownerNewPassword").value = "";
    $("ownerConfirmPassword").value = "";
    history.replaceState(null,"",window.location.pathname + window.location.search + "#ownerArea");
    message.textContent = ownerText("¡Contraseña actualizada! Ya puedes iniciar sesión con tu nueva contraseña.","Password updated! You can now sign in with your new password.");
    $("ownerEmail").focus();
  } catch (error) {
    message.textContent = ownerText("No se pudo actualizar la contraseña: ","Could not update the password: ") + (error?.message || String(error));
  } finally {
    button.disabled = false;
  }
}

$("ownerForgotPassword")?.addEventListener("click", ownerSendPasswordRecovery);
$("ownerSaveNewPassword")?.addEventListener("click", ownerSaveNewPassword);
window.addEventListener("load", ownerShowPasswordResetFromLink);\nwindow.addEventListener("hashchange", ownerShowPasswordResetFromLink);\nwindow.addEventListener("pageshow", ownerShowPasswordResetFromLink);



/* Stripe Checkout: función global invocada directamente desde cada botón. */
window.reputixStartCheckout = async function(plan) {
  const status = $(plan === "pro" ? "proCheckoutStatus" : "basicCheckoutStatus");
  const message = $("ownerAuthMessage");
  const buttons = [...document.querySelectorAll("[data-reputix-checkout]")];
  const showStatus = value => { if (status) status.textContent = value; };
  try {
    showStatus(ownerText("Botón detectado. Preparando conexión segura…","Button detected. Preparing secure connection…"));
    if (!ownerSession?.access_token && ownerSession?.refresh_token) {
      const refreshed = await ownerAuthRequest("token?grant_type=refresh_token", {refresh_token:ownerSession.refresh_token});
      if (refreshed?.access_token && refreshed?.user?.id) ownerSetSession(refreshed);
    }
    if (!ownerSession?.access_token) {
      const prompt = ownerText("Inicia sesión o crea una cuenta para continuar con el pago.","Sign in or create an account to continue to checkout.");
      showStatus(prompt);
      if (message) message.textContent = prompt;
      openOwnerAccess();
      return;
    }
    buttons.forEach(item => item.disabled = true);
    showStatus(ownerText("Conectando con Stripe de forma segura…","Connecting securely to Stripe…"));
    const response = await fetch(SUPABASE_URL + "/functions/v1/create-checkout-session", {
      method:"POST",
      headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+ownerSession.access_token,"Content-Type":"application/json"},
      body:JSON.stringify({plan})
    });
    const result = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(result.error || ("Error "+response.status+": "+ownerText("No se pudo iniciar el pago.","Could not start checkout.")));
    if (!result.url) throw new Error(ownerText("Stripe no devolvió un enlace de pago.","Stripe did not return a checkout URL."));
    showStatus(ownerText("Abriendo el pago seguro de Stripe…","Opening secure Stripe checkout…"));
    window.location.href = result.url;
  } catch(error) {
    showStatus(error?.message || String(error));
    if(message) message.textContent=error?.message || String(error);
    buttons.forEach(item=>item.disabled=false);
    console.error("Reputix Stripe Checkout:",error);
  }
};



/* Reputix Ads: módulo integrado al panel privado; no modifica autenticación. */
async function loadReputixAdsBusinesses(){
  const select=$("adsBusiness");
  if(!select)return;
  const rows=await api("businesses?select=id,name,city&status=eq.approved&order=name.asc&limit=1000");
  select.replaceChildren(node("option","","Selecciona un negocio aprobado"));
  select.options[0].value="";
  (rows||[]).forEach(b=>{
    const option=node("option","",b.name+(b.city?" · "+b.city:""));
    option.value=b.id;
    select.append(option);
  });
}
async function adsCount(table,campaignId){
  const response=await fetch(SUPABASE_URL+"/rest/v1/"+table+"?select=id&campaign_id=eq."+encodeURIComponent(campaignId),{
    method:"HEAD",
    headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+ownerSession.access_token,Prefer:"count=exact",Range:"0-0"}
  });
  if(!response.ok)return 0;
  const match=(response.headers.get("content-range")||"").match(/\/(\d+)$/);
  return match?Number(match[1]):0;
}
async function loadReputixAdsCampaigns(){
  const list=$("reputixAdsCampaignList");
  if(!list||!ownerSession?.access_token)return;
  list.replaceChildren(node("p","owner-copy","Cargando campañas…"));
  try{
    const [campaigns,businesses]=await Promise.all([
      api("ad_campaigns?select=*&order=created_at.desc&limit=200"),
      api("businesses?select=id,name&limit=1000")
    ]);
    const names=new Map((businesses||[]).map(b=>[b.id,b.name]));
    let impressions=0,clicks=0,active=0;
    const counts=await Promise.all((campaigns||[]).map(async c=>({
      c,impressions:await adsCount("ad_impressions",c.id),clicks:await adsCount("ad_clicks",c.id)
    })));
    counts.forEach(x=>{impressions+=x.impressions;clicks+=x.clicks;if(x.c.status==="active")active++;});
    $("adsTotalCount").textContent=String((campaigns||[]).length);
    $("adsActiveCount").textContent=String(active);
    $("adsImpressionCount").textContent=impressions.toLocaleString();
    $("adsClickCount").textContent=clicks.toLocaleString();
    list.replaceChildren();
    if(!counts.length){list.append(node("p","insight-empty","Todavía no hay campañas publicitarias."));return;}
    counts.forEach(({c,impressions:views,clicks:visits})=>{
      const card=node("article","admin-claim");
      card.append(node("div","admin-claim-title",c.title));
      card.append(node("div","admin-claim-meta",(names.get(c.business_id)||"Negocio no disponible")+" · "+c.placement));
      card.append(node("div","admin-claim-meta","Presupuesto: $"+((Number(c.budget_cents)||0)/100).toFixed(2)+" USD · Estado: "+c.status));
      card.append(node("div","admin-claim-meta","Impresiones: "+views+" · Clics: "+visits));
      const actions=node("div","owner-actions");
      const addAction=(label,status)=>{
        const button=node("button","secondary",label);button.type="button";
        button.addEventListener("click",async()=>{
          if(!window.confirm("¿Cambiar esta campaña a "+status+"?"))return;
          button.disabled=true;
          try{
            await api("ad_campaigns?id=eq."+encodeURIComponent(c.id),{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status,updated_at:new Date().toISOString()})});
            $("adsAdminMessage").textContent="Campaña actualizada.";
            await loadReputixAdsCampaigns();
          }catch(error){$("adsAdminMessage").textContent="No se pudo actualizar: "+error.message;button.disabled=false;}
        });
        actions.append(button);
      };
      if(["draft","rejected"].includes(c.status))addAction("Enviar a revisión","pending_review");
      if(["pending_review","approved","paused"].includes(c.status))addAction("Activar","active");
      if(["active","approved"].includes(c.status))addAction("Pausar","paused");
      if(!["rejected","completed"].includes(c.status))addAction("Rechazar","rejected");
      if(["active","paused"].includes(c.status))addAction("Finalizar","completed");
      card.append(actions);list.append(card);
    });
  }catch(error){
    list.replaceChildren(node("p","owner-message","No se pudieron cargar campañas: "+error.message));
  }
}
function setupReputixAdsAdmin(){
  const form=$("reputixAdsForm");
  if(!form||form.dataset.bound==="1")return;
  form.dataset.bound="1";
  form.addEventListener("submit",async event=>{
    event.preventDefault();
    const button=$("adsCreateButton");button.disabled=true;
    $("adsAdminMessage").textContent="Guardando campaña para revisión…";
    try{
      const business_id=$("adsBusiness").value;
      const title=$("adsTitle").value.trim();
      const description=$("adsDescription").value.trim();
      const destination_url=$("adsDestination").value.trim();
      const budget=Number($("adsBudget").value);
      if(!business_id)throw new Error("Selecciona un negocio aprobado.");
      if(title.length<3||title.length>120)throw new Error("El título debe tener entre 3 y 120 caracteres.");
      if(!Number.isFinite(budget)||budget<0||budget>1000000)throw new Error("Presupuesto inválido.");
      if(destination_url&&!/^https?:\/\//i.test(destination_url))throw new Error("El enlace debe comenzar con https:// o http://.");
      const starts=$("adsStarts").value?new Date($("adsStarts").value).toISOString():null;
      const ends=$("adsEnds").value?new Date($("adsEnds").value).toISOString():null;
      if(starts&&ends&&new Date(ends)<=new Date(starts))throw new Error("La fecha final debe ser posterior a la inicial.");
      await api("ad_campaigns",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({
        business_id,title,description:description||null,destination_url:destination_url||null,
        placement:$("adsPlacement").value,status:"pending_review",budget_cents:Math.round(budget*100),starts_at:starts,ends_at:ends
      })});
      form.reset();$("adsBudget").value="50";
      $("adsAdminMessage").textContent="Campaña creada y enviada a revisión. El cobro aún no está activo.";
      await loadReputixAdsCampaigns();
    }catch(error){$("adsAdminMessage").textContent="No se pudo crear la campaña: "+error.message;}
    finally{button.disabled=false;}
  });
  $("adsRefreshButton")?.addEventListener("click",()=>loadReputixAdsCampaigns());
}

function ownerSetSession(session) {
  ownerSession=session;
  if(session) sessionStorage.setItem("reputix_owner_session",JSON.stringify(session));
  else sessionStorage.removeItem("reputix_owner_session");
  $("ownerSignIn").hidden=!!session;
  $("ownerSignUp").hidden=!!session;
  $("ownerSignOut").hidden=!session;
  $("ownerClaimArea").hidden=!session;
  $("privateSpace").hidden=!session;
  const isAdmin = !!(session?.user?.app_metadata?.reputix_role === "admin");
  $("adminClaimsPanel").hidden = !isAdmin;
  const moderationPanel = $("adminReviewModerationPanel");
  if (moderationPanel) moderationPanel.hidden = !isAdmin;
  const adsPanel = $("adminAdsPanel");
  if (adsPanel) adsPanel.hidden = !isAdmin;
  if (isAdmin) { setupReputixAdsAdmin(); loadReputixAdsBusinesses().then(loadReputixAdsCampaigns).catch(error => { if ($("adsAdminMessage")) $("adsAdminMessage").textContent = "Error: "+error.message; }); }
  if(session) {
    loadOwnerClaims();
    loadPrivateSpace();
    loadMessageCenter();
    $("privateSpace").scrollIntoView({behavior:"smooth",block:"start"});
    if(isAdmin) { loadAdminClaims(); loadAdminReviewModeration(); }
  } else {
    $("adminClaimsList").replaceChildren();
    $("privatePostsList").replaceChildren();
    $("privateReviewsContent").replaceChildren();
    $("privateComplaintsContent").replaceChildren();
  }
}
$("reputixAiForm").addEventListener("submit", async e => {
  e.preventDefault();
  const prompt = $("reputixAiPrompt").value.trim();
  const status = $("reputixAiStatus");
  const answer = $("reputixAiAnswer");
  const button = $("reputixAiSend");
  if (!prompt) return;
  if (!ownerSession?.access_token) {
    status.textContent = lang === "es" ? "Inicia sesión para usar Reputix AI." : "Sign in to use Reputix AI.";
    return;
  }
  button.disabled = true;
  answer.hidden = true;
  status.textContent = lang === "es" ? "Reputix AI está preparando tu respuesta…" : "Reputix AI is preparing your answer…";
  try {
    const response = await fetch(SUPABASE_URL + "/functions/v1/reputix-ai", {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + ownerSession.access_token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: prompt, language: lang, mode: "assistant" })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || (lang === "es" ? "No se pudo conectar con Reputix AI." : "Could not connect to Reputix AI."));
    answer.textContent = data.answer || (lang === "es" ? "No recibimos una respuesta." : "No answer was returned.");
    answer.hidden = false;
    status.textContent = lang === "es" ? "Respuesta generada por Reputix AI." : "Answer generated by Reputix AI.";
  } catch (err) {
    status.textContent = "Error: " + (err?.message || String(err));
  } finally {
    button.disabled = false;
  }
});

async function ownerSignIn() {
  $("ownerAuthMessage").textContent=ownerText("Ingresando…","Signing in…");
  try {
    const session=await ownerAuthRequest("token?grant_type=password",{
      email:$("ownerEmail").value.trim(),password:$("ownerPassword").value
    });
    if(!session?.access_token || !session?.user?.id) {
      throw new Error(ownerText("Supabase no confirmó una sesión válida. Intenta nuevamente.","Supabase did not return a valid session. Please try again."));
    }
    ownerSetSession(session);
    history.replaceState(null,"",window.location.pathname+window.location.search+"#ownerArea");
    $("ownerAuthMessage").textContent=ownerText("Sesión iniciada correctamente. Tu espacio privado está abierto más abajo.","Signed in successfully. Your private workspace is open below.");
    requestAnimationFrame(()=> $("privateSpace").scrollIntoView({behavior:"smooth",block:"start"}));
  } catch(err) {
    $("ownerAuthMessage").textContent=err.message;
  }
}
async function ownerSignUp() {
  const email = $("ownerEmail").value.trim();
  $("ownerAuthMessage").textContent = ownerText("Enviando registro…","Submitting registration…");
  try {
    // La confirmación del correo comercial debe regresar al panel de propietarios,
    // no al inicio de la página. El correo personal no se modifica.
    const returnTo = window.location.origin + window.location.pathname + "#ownerArea";
    const result = await ownerAuthRequest(
      "signup?redirect_to=" + encodeURIComponent(returnTo),
      { email, password:$("ownerPassword").value }
    );

    if (result.access_token && result.user) {
      ownerSetSession(result);
      $("ownerAuthMessage").textContent = ownerText(
        "¡Cuenta creada y sesión iniciada! Ya puedes completar tu perfil y solicitar acceso a tu negocio.",
        "Account created and signed in! You can now complete your profile and request access to your business."
      );
      $("privateSpace").scrollIntoView({behavior:"smooth",block:"start"});
      return;
    }

    const identities = result.user && Array.isArray(result.user.identities)
      ? result.user.identities : null;
    if (identities && identities.length === 0) {
      $("ownerAuthMessage").textContent = ownerText(
        "Este correo ya podría estar registrado. Intenta «Ya tengo cuenta · Iniciar sesión» o utiliza otro correo.",
        "This email may already be registered. Try “I already have an account · Sign in” or use another email."
      );
      return;
    }

    $("ownerAuthMessage").textContent = ownerText(
      "¡Registro recibido! Supabase requiere confirmar tu correo. Revisa la bandeja de entrada y el correo no deseado de " + email + ". Abre el enlace de confirmación y después vuelve aquí para tocar «Ya tengo cuenta · Iniciar sesión».",
      "Registration received! Supabase requires email confirmation. Check the inbox and spam folder for " + email + ". Open the confirmation link, then return here and choose “I already have an account · Sign in”."
    );
    $("ownerAuthMessage").scrollIntoView({behavior:"smooth",block:"center"});
  } catch(err) {
    $("ownerAuthMessage").textContent = ownerText("No se pudo completar el registro: ","Registration failed: ") + (err?.message || String(err));
    throw err;
  }
}
async function loadClaimBusinessOptions() {
  // La lista y el valor seleccionado los administra el selector visual independiente
  // de index.html. No crear ni tocar elementos <select> nativos de Android.
  return true;
}
async function loadOwnerClaims() {
  await loadClaimBusinessOptions();
  $("ownerClaimMessage").textContent="";
  $("ownerDashboard").hidden=true;
  try {
    const claims=await api("business_owner_claims?select=id,business_id,status,evidence_note,relationship_type,verification_level,evidence_type,evidence_links,created_at&order=created_at.desc");
    const pending=(claims||[]).filter(c=>c.status==="pending");
    if(pending.length) $("ownerClaimMessage").textContent=ownerText("Tu solicitud está pendiente de verificación.","Your ownership request is pending verification.");
    await loadOwnerDashboard();
  } catch(err) {
    $("ownerClaimMessage").textContent=ownerText("No se pudieron cargar tus solicitudes. Vuelve a iniciar sesión.","Could not load your claims. Please sign in again.");
  }
}
// Actualizar también al abrir el selector, por si se aprobó o agregó un negocio recientemente.
// Selector visual independiente: no se enlaza foco al input oculto.

async function loadAdminReviewModeration() {
  const list = $("adminReviewModerationList");
  const status = $("adminReviewModerationStatus");
  if (!list || !status || ownerSession?.user?.app_metadata?.reputix_role !== "admin") return;
  list.replaceChildren();
  status.textContent = ownerText("Cargando análisis de opiniones…","Loading review assessments…");
  try {
    let response = await fetch(SUPABASE_URL + "/functions/v1/reputix-ai", {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + ownerSession.access_token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({mode:"admin_moderation_list"})
    });
    if (response.status === 401 && ownerSession.refresh_token) {
      const refreshed = await ownerAuthRequest("token?grant_type=refresh_token", {refresh_token:ownerSession.refresh_token});
      if (refreshed?.access_token && refreshed?.user?.id) {
        ownerSetSession(refreshed);
        response = await fetch(SUPABASE_URL + "/functions/v1/reputix-ai", {
          method: "POST",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: "Bearer " + refreshed.access_token,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({mode:"admin_moderation_list"})
        });
      }
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || ("HTTP " + response.status));
    const items = Array.isArray(data.items) ? data.items : [];
    if (!items.length) {
      status.textContent = ownerText("Todavía no hay análisis de IA guardados.","No AI assessments have been saved yet.");
      return;
    }
    status.textContent = ownerText(items.length + " análisis recientes. La decisión final sigue siendo humana.", items.length + " recent assessments. Final decisions remain human.");
    for (const item of items) {
      const card = node("article","admin-claim");
      const business = [item.business?.name,item.business?.city].filter(Boolean).join(" · ") || ownerText("Negocio no identificado","Business not identified");
      const heading = item.outcome === "clear"
        ? ownerText("Sin alertas detectadas","No flags detected")
        : item.outcome === "high_risk"
          ? ownerText("Riesgo alto: revisar primero","High risk: review first")
          : ownerText("Requiere revisión humana","Needs human review");
      card.append(node("div","admin-claim-title",heading));
      card.append(node("div","admin-claim-meta",business + " · " + (item.assessed_at ? new Date(item.assessed_at).toLocaleString() : "")));
      card.append(node("p","admin-claim-evidence",item.review?.comment || ownerText("Opinión sin texto.","Review has no text.")));
      if (item.reasons?.length) card.append(node("div","admin-claim-meta",ownerText("Motivos sugeridos: ","Suggested reasons: ") + item.reasons.join(", ")));
      if (item.confidence !== null && item.confidence !== undefined) {
        card.append(node("div","admin-claim-meta",ownerText("Confianza estimada: ","Estimated confidence: ") + Math.round(Number(item.confidence)*100) + "%"));
      }
      card.append(node("div","admin-claim-meta",ownerText("Estado de publicación: pendiente de revisión humana; la IA no tomó ninguna decisión.","Publication status: awaiting human review; AI did not make a decision.")));
      list.append(card);
    }
  } catch (error) {
    status.textContent = ownerText("No se pudo cargar la cola: ","Could not load the queue: ") + (error?.message || String(error));
  }
}

document.getElementById("adminReviewModerationRefresh")?.addEventListener("click", loadAdminReviewModeration);

async function loadAdminClaims() {
  const list=$("adminClaimsList");
  list.replaceChildren();
  try {
    const claims=await api("business_owner_claims?select=id,business_id,user_id,evidence_note,relationship_type,verification_level,evidence_type,evidence_links,created_at,status&status=eq.pending&order=created_at.asc");
    if(!Array.isArray(claims)||!claims.length) {
      list.append(node("p","insight-empty",ownerText("No hay solicitudes pendientes.","No pending ownership claims.")));
      return;
    }
    for(const claim of claims) {
      const businesses=await api("businesses?select=id,name,address,city&id=eq."+encodeURIComponent(claim.business_id)+"&limit=1");
      const business=businesses?.[0];
      const card=node("article","admin-claim");
      card.append(node("div","admin-claim-title",business?.name || ownerText("Negocio no disponible","Business unavailable")));
      card.append(node("div","admin-claim-meta",ownerText("ID de usuario: ","User ID: ")+claim.user_id));
      card.append(node("div","admin-claim-meta",ownerText("Solicitud: ","Submitted: ")+new Date(claim.created_at).toLocaleString()));
      if(business?.address||business?.city) card.append(node("div","admin-claim-meta",[business.address,business.city].filter(Boolean).join(" · ")));
      card.append(node("p","admin-claim-evidence",claim.evidence_note || ownerText("Sin detalles adicionales.","No additional details.")));
      const relationshipLabels={owner:"Propietario/a",partner:"Socio/a",manager:"Administrador/a o encargado/a",independent_worker:"Trabajador/a independiente",new_entrepreneur:"Emprendimiento nuevo"};
      const levelLabels={activity:"Actividad comprobada",business_responsible:"Responsable del negocio",owner:"Propiedad del negocio"};
      const evidenceLabels={work_photos:"Fotos de trabajos",customer_references:"Referencias de clientes",business_social:"Redes sociales",phone_or_email:"Teléfono o correo",storefront_photos:"Local, vehículo o equipo",business_documents:"Documentos comerciales",written_statement:"Declaración personal",multiple:"Varias pruebas"};
      card.append(node("div","admin-claim-meta","Relación: "+(relationshipLabels[claim.relationship_type]||claim.relationship_type||"No indicada")));
      card.append(node("div","admin-claim-meta","Nivel solicitado: "+(levelLabels[claim.verification_level]||claim.verification_level||"No indicado")));
      card.append(node("div","admin-claim-meta","Prueba: "+(evidenceLabels[claim.evidence_type]||claim.evidence_type||"No indicada")));
      (claim.evidence_links||[]).forEach(url=>{if(/^https?:\/\//i.test(url)){const link=node("a","admin-claim-meta",url);link.href=url;link.target="_blank";link.rel="noopener noreferrer";card.append(link);}});
      const actions=node("div","admin-claim-actions");
      const approvalStatus=claim.verification_level==="owner"?"verified":claim.verification_level==="business_responsible"?"responsible_verified":"activity_verified";
      const approvalLabel=approvalStatus==="verified"?ownerText("Verificar propietario","Verify owner"):approvalStatus==="responsible_verified"?ownerText("Verificar responsable","Verify representative"):ownerText("Confirmar actividad","Confirm activity");
      const approve=node("button","primary",approvalLabel);
      const reject=node("button","secondary",ownerText("Rechazar","Reject"));
      approve.type=reject.type="button";
      approve.addEventListener("click",()=>reviewOwnerClaim(claim.id,approvalStatus,approve,reject));
      reject.addEventListener("click",()=>reviewOwnerClaim(claim.id,"rejected",approve,reject));
      actions.append(approve,reject);card.append(actions);list.append(card);
    }
  } catch(err) {
    console.error("Admin claims:",err);
    list.append(node("p","insight-empty",ownerText("No fue posible cargar solicitudes. Confirma que la sesión tenga el rol administrativo autorizado.","Could not load claims. Confirm the session has the authorized admin role.")));
  }
}
async function reviewOwnerClaim(id,status,approve,reject) {
  if(ownerSession?.user?.app_metadata?.reputix_role!=="admin") return;
  const label=status==="verified"
    ? ownerText("¿Comprobaste suficientemente que esta persona es propietaria?","Have you sufficiently verified this person is the owner?")
    : status==="responsible_verified"
      ? ownerText("¿Comprobaste que esta persona administra o representa el negocio? Esto no la convierte en propietaria.","Have you verified this person manages or represents the business? This does not make them the owner.")
      : status==="activity_verified"
        ? ownerText("¿Comprobaste que esta persona realiza esta actividad? Esto no concede propiedad ni acceso a estadísticas privadas.","Have you verified this person performs this activity? This does not grant ownership or private analytics.")
        : ownerText("¿Quieres rechazar esta solicitud?","Do you want to reject this claim?");
  if(!window.confirm(label)) return;
  approve.disabled=reject.disabled=true;
  try {
    await api("business_owner_claims?id=eq."+encodeURIComponent(id),{
      method:"PATCH",
      headers:{Prefer:"return=minimal"},
      body:JSON.stringify({status,reviewed_at:new Date().toISOString()})
    });
    await loadAdminClaims();
  } catch(err) {
    window.alert(ownerText("No se pudo actualizar. Si ya existe otro propietario verificado, primero debe resolverse esa solicitud.","Could not update. If another owner is already verified, that claim must be resolved first."));
    approve.disabled=reject.disabled=false;
  }
}



let activeMessageConversation=null;
async function loadMessageCenter() {
  if(!ownerSession?.access_token || !ownerSession?.user?.id) return;
  const select=$("messageBusiness");
  const keep=select.value;
  select.replaceChildren(new Option("Selecciona un negocio aprobado",""));
  lastBusinesses.filter(b=>b.status==="approved").forEach(b=>select.append(new Option(b.name+" · "+(b.city||b.address||""),b.id)));
  if(keep) select.value=keep;
  const list=$("messageConversationList");list.replaceChildren();
  try {
    const conversations=await api("business_conversations?select=id,business_id,customer_id,subject,status,updated_at&order=updated_at.desc&limit=50");
    if(!conversations?.length) list.append(node("small","",ownerText("Todavía no tienes conversaciones.","You have no conversations yet.")));
    for(const conv of conversations||[]) {
      const business=lastBusinesses.find(b=>String(b.id)===String(conv.business_id));
      const label=(business?.name||ownerText("Negocio","Business"))+" · "+conv.subject;
      const button=node("button","message-conversation"+(activeMessageConversation===conv.id?" active":""),label);
      button.type="button";
      button.addEventListener("click",()=>openMessageConversation(conv));
      list.append(button);
    }
  } catch(err) {
    list.append(node("small","",ownerText("No se pudo cargar la bandeja: ","Could not load inbox: ")+err.message));
  }
}
async function openMessageConversation(conv) {
  activeMessageConversation=conv.id;
  $("messageThread").hidden=false;
  $("messageThreadTitle").textContent=conv.subject;
  const items=$("messageThreadItems");items.replaceChildren(node("small","",ownerText("Cargando conversación…","Loading conversation…")));
  try {
    const messages=await api("business_messages?select=id,sender_id,body,created_at,read_at&conversation_id=eq."+encodeURIComponent(conv.id)+"&order=created_at.asc&limit=100");
    items.replaceChildren();
    (messages||[]).forEach(m=>{
      const mine=m.sender_id===ownerSession.user.id;
      const bubble=node("div","message-bubble"+(mine?" mine":""));
      bubble.append(node("div","",m.body),node("div","message-meta",(mine?ownerText("Tú · ","You · "):ownerText("Cliente/negocio · ","Customer/business · "))+new Date(m.created_at).toLocaleString()));
      items.append(bubble);
    });
    if(!items.childElementCount) items.append(node("small","",ownerText("Aún no hay mensajes.","No messages yet.")));
    const unread=(messages||[]).filter(m=>m.sender_id!==ownerSession.user.id&&!m.read_at).map(m=>m.id);
    if(unread.length) await api("business_messages?id=in.("+unread.map(encodeURIComponent).join(",")+")",{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({read_at:new Date().toISOString()})}).catch(()=>{});
    $("messageThread").dataset.conversationId=conv.id;
    await loadMessageCenter();
  } catch(err) {
    items.replaceChildren(node("small","",ownerText("No se pudo abrir la conversación: ","Could not open conversation: ")+err.message));
  }
}
$("messageStartButton").addEventListener("click",async()=>{
  const businessId=$("messageBusiness").value;
  const subject=$("messageSubject").value.trim();
  const body=$("messageFirstBody").value.trim();
  const status=$("messageStatus");
  if(!businessId||!subject||!body){status.textContent=ownerText("Selecciona un negocio y completa asunto y mensaje.","Choose a business and enter a subject and message.");return;}
  $("messageStartButton").disabled=true;status.textContent=ownerText("Enviando…","Sending…");
  try {
    const created=await api("business_conversations",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({business_id:businessId,customer_id:ownerSession.user.id,subject,status:"open"})});
    let conv=created?.[0];
    if(!conv) {
      const existing=await api("business_conversations?select=id,business_id,customer_id,subject,status&business_id=eq."+encodeURIComponent(businessId)+"&customer_id=eq."+encodeURIComponent(ownerSession.user.id)+"&subject=eq."+encodeURIComponent(subject)+"&limit=1");
      conv=existing?.[0];
    }
    if(!conv) throw new Error(ownerText("No se pudo crear la conversación.","Could not create the conversation."));
    await api("business_messages",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({conversation_id:conv.id,sender_id:ownerSession.user.id,body})});
    $("messageSubject").value="";$("messageFirstBody").value="";
    status.textContent=ownerText("Mensaje enviado al negocio.","Message sent to the business.");
    await loadMessageCenter();await openMessageConversation(conv);
  } catch(err) {status.textContent=ownerText("No se pudo enviar: ","Could not send: ")+err.message;}
  finally {$("messageStartButton").disabled=false;}
});
$("messageReplyForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const conversationId=$("messageThread").dataset.conversationId;
  const body=$("messageReplyBody").value.trim();
  if(!conversationId||!body)return;
  $("messageReplyButton").disabled=true;
  try {
    await api("business_messages",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({conversation_id:conversationId,sender_id:ownerSession.user.id,body})});
    $("messageReplyBody").value="";
    const conv={id:conversationId,subject:$("messageThreadTitle").textContent};
    await openMessageConversation(conv);
  } catch(err) {window.alert(ownerText("No se pudo enviar la respuesta: ","Could not send reply: ")+err.message);}
  finally {$("messageReplyButton").disabled=false;}
});

async function loadPrivateSpace() {
  if(!ownerSession?.access_token || !ownerSession?.user?.id) return;
  const userId=ownerSession.user.id;
  const email=ownerSession.user.email || "";
  const [profile,posts,ownReviews,ownComplaints,claims] = await Promise.allSettled([
    api("user_profiles?select=display_name,bio&user_id=eq."+encodeURIComponent(userId)),
    api("user_publications?select=id,body,status,created_at&order=created_at.desc&limit=30"),
    api("reviews?select=id,business_id,comment,status,created_at&user_id=eq."+encodeURIComponent(userId)+"&order=created_at.desc&limit=30"),
    api("complaints?select=id,business_id,complaint,status,business_response,created_at&user_id=eq."+encodeURIComponent(userId)+"&order=created_at.desc&limit=30"),
    api("business_owner_claims?select=id,business_id,status&user_id=eq."+encodeURIComponent(userId)+"&status=eq.verified")
  ]);
  const profileRow=profile.status==="fulfilled"?profile.value?.[0]:null;
  $("privateProfileContent").replaceChildren(node("div","private-entry",profileRow?.display_name || email));
  if(profileRow?.bio) $("privateProfileContent").append(node("div","private-entry",profileRow.bio));
  if(profileRow?.display_name) $("privateWelcome").textContent=ownerText("Hola, ","Hello, ")+profileRow.display_name;
  const postList=$("privatePostsList");postList.replaceChildren();
  if(posts.status==="fulfilled") {
    (posts.value||[]).forEach(p=>{const item=node("div","private-entry");item.append(node("p","",p.body),node("small","",new Date(p.created_at).toLocaleString()));postList.append(item);});
    if(!postList.childElementCount) postList.append(node("small","",ownerText("Todavía no tienes publicaciones.","You have no posts yet.")));
  } else postList.append(node("small","",ownerText("No se pudieron cargar tus publicaciones.","Could not load your posts.")));
  const businessIds=claims.status==="fulfilled"?(claims.value||[]).map(x=>x.business_id).filter(Boolean):[];
  const businessNames=new Map(lastBusinesses.map(b=>[String(b.id),b.name]));
  $("privateBusinessContent").replaceChildren();
  if(businessIds.length) {
    for(const id of businessIds) {
      const b=lastBusinesses.find(x=>String(x.id)===String(id));
      $("privateBusinessContent").append(node("div","private-entry",b?.name||ownerText("Negocio verificado","Verified business")));
    }
  } else $("privateBusinessContent").append(node("small","",ownerText("Aún no tienes negocios verificados. Puedes solicitar acceso abajo.","No verified businesses yet. You can request access below.")));
  const reviewList=$("privateReviewsContent");reviewList.replaceChildren();
  if(businessIds.length) {
    try {
      const ids=businessIds.map(id=>encodeURIComponent(id)).join(",");
      const customerReviews=await api("reviews?select=id,business_id,comment,status,created_at,cleanliness,service_quality,product_quality,speed,value_for_money&business_id=in.("+ids+")&status=eq.published&order=created_at.desc&limit=50");
      (customerReviews||[]).forEach(x=>{
        const item=node("div","private-entry");
        item.append(node("strong","",businessNames.get(String(x.business_id))||ownerText("Tu negocio","Your business")));
        item.append(node("p","",x.comment||ownerText("Opinión sin comentario","Review without comment")));
        item.append(node("small","",new Date(x.created_at).toLocaleString()));
        reviewList.append(item);
      });
      if(!reviewList.childElementCount) reviewList.append(node("small","",ownerText("Tus negocios todavía no tienen opiniones publicadas.","Your businesses have no published reviews yet.")));
    } catch(err) {reviewList.append(node("small","",ownerText("No se pudieron cargar las opiniones de tus negocios.","Could not load reviews for your businesses.")));}
  } else reviewList.append(node("small","",ownerText("Las opiniones de clientes aparecerán cuando tengas un negocio verificado.","Customer reviews will appear once you have a verified business.")));
  const complaintList=$("privateComplaintsContent");complaintList.replaceChildren();
  if(ownComplaints.status==="fulfilled") {
    (ownComplaints.value||[]).forEach(x=>{
      const item=node("div","private-entry");
      item.append(node("strong","",ownerText("Tu reclamo enviado","Your submitted complaint")));
      item.append(node("p","",x.complaint||""));
      item.append(node("small","",ownerText("Estado: ","Status: ")+x.status));
      if(x.business_response)item.append(node("p","",ownerText("Respuesta del negocio: ","Business response: ")+x.business_response));
      complaintList.append(item);
    });
  }
  if(businessIds.length) {
    try {
      const ids=businessIds.map(id=>encodeURIComponent(id)).join(",");
      const received=await api("complaints?select=id,business_id,complaint,status,business_response,created_at&business_id=in.("+ids+")&order=created_at.desc&limit=50");
      (received||[]).forEach(x=>{
        const item=node("article","private-entry");
        item.append(node("strong","",ownerText("Reclamo recibido · ","Customer complaint · ")+(businessNames.get(String(x.business_id))||ownerText("Tu negocio","Your business"))));
        item.append(node("p","",x.complaint||""));
        item.append(node("small","",ownerText("Estado: ","Status: ")+x.status+" · "+new Date(x.created_at).toLocaleString()));
        if(x.business_response) item.append(node("p","",ownerText("Tu respuesta: ","Your response: ")+x.business_response));
        if(x.status!=="rejected") {
          const form=node("form","owner-complaint-response");
          const field=node("textarea");field.rows=3;field.maxLength=3000;field.required=true;
          field.placeholder=ownerText("Escribe una respuesta para el cliente…","Write a response to the customer…");
          if(x.business_response)field.value=x.business_response;
          const submit=node("button","primary",x.business_response?ownerText("Actualizar respuesta","Update response"):ownerText("Responder reclamo","Reply to complaint"));
          submit.type="submit";
          const msg=node("small","form-message","");
          form.append(field,submit,msg);
          form.addEventListener("submit",async e=>{
            e.preventDefault();
            const response=field.value.trim();if(response.length<3){msg.textContent=ownerText("Escribe una respuesta más completa.","Please enter a longer response.");return;}
            submit.disabled=true;msg.textContent=ownerText("Guardando…","Saving…");
            try {
              await api("rpc/owner_respond_to_complaint",{method:"POST",body:JSON.stringify({p_complaint_id:x.id,p_response:response})});
              msg.textContent=ownerText("Respuesta publicada.","Response published.");
              await loadPrivateSpace();
            } catch(err){msg.textContent=ownerText("No se pudo guardar: ","Could not save: ")+err.message;submit.disabled=false;}
          });
          item.append(form);
        }
        complaintList.append(item);
      });
    } catch(err) {
      complaintList.append(node("small","",ownerText("No se pudieron cargar los reclamos de tus negocios: ","Could not load complaints for your businesses: ")+err.message));
    }
  }
  if(!complaintList.childElementCount) complaintList.append(node("small","",ownerText("Aún no tienes reclamos enviados ni recibidos.","You have no submitted or received complaints yet.")));
  $("privateDiscoverContent").replaceChildren(node("div","private-entry",ownerText("Los negocios recomendados siguen disponibles en la página principal.","Recommended businesses remain available on the main page.")));
}
$("privateProfileAction").addEventListener("click",async()=>{
  const current=await api("user_profiles?select=display_name,bio&user_id=eq."+encodeURIComponent(ownerSession.user.id)).catch(()=>[]);
  const name=window.prompt(ownerText("¿Cómo quieres que aparezca tu nombre?","What name should appear on your profile?"),current?.[0]?.display_name||"");
  if(name===null)return;
  const bio=window.prompt(ownerText("Escribe una breve descripción (opcional).","Write a short bio (optional)."),current?.[0]?.bio||"");
  if(bio===null)return;
  try {
    await api("user_profiles?on_conflict=user_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({user_id:ownerSession.user.id,display_name:name.trim(),bio:bio.trim()})});
    $("privateProfileContent").replaceChildren(node("div","private-entry",name.trim()||ownerSession.user.email),node("div","private-entry",bio.trim()));
    $("privateWelcome").textContent=ownerText("Hola, ","Hello, ")+(name.trim()||"");
  } catch(err) {window.alert(ownerText("No se pudo guardar el perfil: ","Could not save profile: ")+err.message);}
});
$("privateBusinessAction").addEventListener("click",()=>{$("ownerClaimForm").scrollIntoView({behavior:"smooth",block:"center"});$("claimBusiness").focus({preventScroll:true});});
$("privateMessagesAction").addEventListener("click",()=>{$("privateMessagesContent").scrollIntoView({behavior:"smooth",block:"center"});loadMessageCenter();});
$("privateComplaintsAction").addEventListener("click",()=>$("privateComplaintsContent").scrollIntoView({behavior:"smooth",block:"center"}));
$("privateReviewsAction").addEventListener("click",()=>loadPrivateSpace());

$("privatePostForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const body=$("privatePostBody").value.trim();if(!body||!ownerSession?.user?.id)return;
  $("privatePostSubmit").disabled=true;$("privatePostMessage").textContent=ownerText("Publicando…","Publishing…");
  try {
    await api("user_publications",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({user_id:ownerSession.user.id,body,status:"published"})});
    $("privatePostBody").value="";$("privatePostMessage").textContent=ownerText("Publicación guardada.","Post saved.");await loadPrivateSpace();
  } catch(err) {$("privatePostMessage").textContent=ownerText("No se pudo publicar: ","Could not publish: ")+err.message;}
  finally {$("privatePostSubmit").disabled=false;}
});

async function loadOwnerDashboard() {
  const wrap=$("ownerDashboard"),list=$("ownerDashboardList");
  list.replaceChildren();
  try {
    const rows=await api("owner_business_dashboard?select=business_id,business_name,category,city,published_reviews,average_score,average_cleanliness,average_service_quality,average_product_quality,average_speed,average_value_for_money,reviews_last_7_days");
    if(!Array.isArray(rows)||!rows.length){wrap.hidden=true;return;}
    wrap.hidden=false;
    for(const row of rows) {
      const block=node("section","insight-panel");
      block.append(node("h3","",row.business_name));
      block.append(node("p","insight-subtitle",[row.category,row.city].filter(Boolean).join(" · ")));
      const metrics=node("div","owner-metrics");
      const metric=(value,label)=>{
        const m=node("div","owner-metric");
        m.append(node("strong","",value===null||value===undefined?"—":String(value)));
        m.append(node("span","",label));metrics.append(m);
      };
      metric(row.average_score===null?"—":Number(row.average_score).toFixed(1)+"/5",ownerText("Calificación promedio","Average rating"));
      metric(row.published_reviews,ownerText("Opiniones publicadas","Published reviews"));
      metric(row.reviews_last_7_days,ownerText("Últimos 7 días","Last 7 days"));
      metric(row.average_service_quality===null?"—":Number(row.average_service_quality).toFixed(1)+"/5",ownerText("Calidad del servicio","Service quality"));
      metric(row.average_speed===null?"—":Number(row.average_speed).toFixed(1)+"/5",ownerText("Rapidez","Speed"));
      metric(row.average_cleanliness===null?"—":Number(row.average_cleanliness).toFixed(1)+"/5",ownerText("Limpieza","Cleanliness"));
      metric(row.average_product_quality===null?"—":Number(row.average_product_quality).toFixed(1)+"/5",ownerText("Calidad del producto","Product quality"));
      metric(row.average_value_for_money===null?"—":Number(row.average_value_for_money).toFixed(1)+"/5",ownerText("Relación calidad-precio","Value for money"));
      block.append(metrics);
      const hourly=node("div","hourly-list");
      const hp=await api("owner_business_hourly_patterns?select=visit_hour,review_count,average_service_quality,average_speed,average_cleanliness,average_score&business_id=eq."+encodeURIComponent(row.business_id)+"&order=visit_hour.asc");
      if(hp.length) {
        block.append(node("h4","",ownerText("Resultados por horario","Results by time of day")));
        hp.forEach(h=>{
          const hour=Number(h.visit_hour),time=(hour%12||12)+":00 "+(hour<12?"AM":"PM");
          const item=node("div","hourly-item"),left=node("div","");
          left.append(node("div","hourly-time",time));
          left.append(node("div","hourly-detail",ownerText("Servicio ","Service ")+h.average_service_quality+"/5 · "+ownerText("Rapidez ","Speed ")+h.average_speed+"/5 · "+h.review_count+ownerText(" opiniones"," reviews")));
          item.append(left,node("div","ranking-score",Number(h.average_score).toFixed(1)+" ★"));hourly.append(item);
        });
        block.append(hourly);
      } else {
        block.append(node("p","insight-empty",ownerText("Aún no hay suficientes opiniones para comparar horarios (mínimo 3 por franja).","Not enough reviews to compare time slots yet (minimum 3 per slot).")));
      }
      list.append(block);
    }
  } catch(err) {
    console.error("Owner dashboard:",err);
    wrap.hidden=true;
  }
}
async function handleOwnerAuthAction(action) {
  const message = $("ownerAuthMessage");
  const buttons = [$("ownerSignUp"), $("ownerSignIn")];
  if (!$("ownerEmail").value.trim() || !$("ownerPassword").value) {
    message.textContent = ownerText("Escribe tu correo y contraseña para continuar.","Enter your email and password to continue.");
    return;
  }
  buttons.forEach(button => button.disabled = true);
  message.textContent = action === "signin"
    ? ownerText("Conectando con Supabase…","Connecting to Supabase…")
    : ownerText("Creando tu cuenta…","Creating your account…");
  try {
    if (action === "signin") await ownerSignIn();
    else await ownerSignUp();
  } catch (err) {
    message.textContent = ownerText("No se pudo completar la operación: ","Could not complete the request: ") + (err?.message || String(err));
    console.error("Reputix auth:", err);
  } finally {
    buttons.forEach(button => button.disabled = false);
  }
}

// Acciones explícitas en los botones: no dependen de event.submitter, que puede
// no estar disponible de forma consistente en algunos navegadores móviles.
$("ownerSignIn").addEventListener("click", event => {
  event.preventDefault();
  handleOwnerAuthAction("signin");
});
$("ownerSignUp").addEventListener("click", event => {
  event.preventDefault();
  handleOwnerAuthAction("signup");
});
// Permite enviar con Enter desde los campos del formulario.
$("ownerAuthForm").addEventListener("submit", event => {
  event.preventDefault();
  handleOwnerAuthAction("signin");
});
$("ownerSignOut").addEventListener("click",()=>{
  ownerSetSession(null);
  $("ownerAuthMessage").textContent=ownerText("Sesión cerrada.","Signed out.");
});
/* Envío protegido de reclamaciones: intercepta el submit antes de cualquier otro
   listener y evita recargas/navegaciones que puedan aparentar un cierre de sesión. */
$("ownerClaimForm").addEventListener("submit", async e => {
  e.preventDefault();
  e.stopImmediatePropagation();
  const message = $("ownerClaimMessage");
  const submit = $("claimSubmit");
  if (submit.disabled) return;
  const businessId = $("claimBusiness").value;
  const evidence = $("claimEvidence").value.trim();
  const linksText = $("claimEvidenceLinks").value.trim();
  const evidenceLinks = linksText ? linksText.split(/[\\n,]+/).map(x => x.trim()).filter(Boolean) : [];
  const relationshipType = $("claimRelationship").value;
  const verificationLevel = $("claimLevel").value;
  const evidenceType = $("claimEvidenceType").value || "written_statement";

  // Recupera la sesión de la pestaña si la variable aún no está sincronizada.
  if (!ownerSession?.access_token) {
    try { ownerSession = JSON.parse(sessionStorage.getItem("reputix_owner_session") || "null"); } catch (_) {}
  }
  if (!ownerSession?.access_token || !ownerSession?.user?.id) {
    message.textContent = ownerText("Tu sesión no está activa. Inicia sesión nuevamente; tus datos del formulario siguen aquí.", "Your session is not active. Sign in again; your form details are still here.");
    return;
  }
  if (!businessId) { message.textContent = ownerText("Selecciona el negocio que deseas reclamar.", "Select the business you want to claim."); return; }
  if (!evidence) { message.textContent = ownerText("Describe tu actividad para continuar.", "Describe your work or activity to continue."); $("claimEvidence").focus(); return; }
  if (!relationshipType || !verificationLevel) { message.textContent = ownerText("Completa tu relación con el negocio y qué deseas acreditar.", "Complete your relationship to the business and what you want verified."); return; }
  if (evidenceLinks.some(url => !/^https?:\/\//i.test(url))) {
    message.textContent = ownerText("Cada enlace debe comenzar con https:// o http://.", "Each link must start with https:// or http://."); return;
  }

  submit.disabled = true;
  message.textContent = ownerText("Enviando solicitud para revisión…", "Submitting request for review…");
  try {
    const result = await api("business_owner_claims", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        business_id: businessId,
        user_id: ownerSession.user.id,
        evidence_note: evidence,
        relationship_type: relationshipType,
        verification_level: verificationLevel,
        evidence_type: evidenceType,
        evidence_links: evidenceLinks,
        status: "pending"
      })
    });
    if (!Array.isArray(result) || !result.length) throw new Error("Supabase no confirmó la creación de la solicitud.");
    message.textContent = ownerText("¡Solicitud recibida! Quedó pendiente de revisión. Tu sesión sigue activa.", "Request received! It is pending review. Your session remains active.");
    await loadOwnerClaims();
  } catch (err) {
    console.error("Reputix owner claim submit:", err);
    const detail = err?.message || String(err);
    if (/duplicate|unique constraint|23505/i.test(detail)) {
      message.textContent = ownerText("Ya existe una solicitud para este negocio con esta cuenta. No necesitas enviarla otra vez.", "A claim for this business already exists for this account. You do not need to submit it again.");
    } else if (/row-level security|permission denied|42501|403/i.test(detail)) {
      message.textContent = ownerText("Supabase rechazó el envío por permisos. Tu sesión no se cerró. Detalle: ", "Supabase rejected the submission due to permissions. Your session was not signed out. Details: ") + detail;
    } else {
      message.textContent = ownerText("No se pudo guardar la solicitud. Tus datos siguen en el formulario. Detalle: ", "The request could not be saved. Your form details remain. Details: ") + detail;
    }
  } finally {
    submit.disabled = false;
  }
}, true);
if(ownerSession?.access_token) ownerSetSession(ownerSession);

async function loadApprovedBusinesses() {
  resultsBox.replaceChildren();
  lastBusinesses = [];
  notice.textContent = lang === "es" ? "Cargando negocios aprobados..." : "Loading approved businesses...";

  // Respaldo visual basado en los cuatro negocios que ya están aprobados en Supabase.
  // Solo se usa si el endpoint público falla o no devuelve filas.
  const approvedFallback = [
    {id:"a2861806-7e33-4eff-907f-f6206535fb7c",name:"Quick Cleaning Services",category:"Professional Cleaning",city:"South Gate",zip:"90280",address:"9233 South Gate",phone:"2137062826",status:"approved"},
    {id:"b2a18a5d-2fca-44f2-aa62-038b972d1a2b",name:"Tamos Chelo Smoke Shop",category:"Smoke Shop",city:"LOS ANGELES",zip:"90003",address:"9419 S San Pedro St",status:"approved"},
    {id:"82d23337-58b0-437e-8a80-ddb568d584b9",name:"Los primos",category:"Tienda o supermercado",city:"LOS ANGELES",zip:"90015",address:"S SAN PEDRO ST",status:"approved"},
    {id:"69e31935-830c-4efe-9b42-e1565e481de1",name:"McDonald",category:"Restaurante o cafetería",city:"Los Angeles",address:"Main y Manchester av 101",status:"approved"}
  ];

  const showBusinesses = (rows, fallbackMode) => {
    const ordered = [...rows].sort((a,b) => {
      const qa = /quick\s*cleaning/i.test(String(a.name || "")) ? 0 : 1;
      const qb = /quick\s*cleaning/i.test(String(b.name || "")) ? 0 : 1;
      return qa - qb;
    });
    lastBusinesses = ordered;
    // Volver a mostrar las tarjetas completas de presentación de cada negocio aprobado.
    // La versión anterior vaciaba el contenedor y lo dejaba oculto, por eso desaparecieron.
    resultsBox.hidden = false;
    resultsBox.replaceChildren(...ordered.map(renderBusiness));
    startDiscoveryRotation();
    notice.textContent = lang === "es"
      ? (fallbackMode ? "Mostrando negocios aprobados guardados mientras se recupera la conexión." : "Descubre negocios aprobados en Reputix.")
      : (fallbackMode ? "Showing saved approved businesses while the connection recovers." : "Discover approved businesses on Reputix.");
  };

  try {
    const params = new URLSearchParams({select:"*",status:"eq.approved",limit:"20"});
    const data = await api("businesses?" + params);
    if (Array.isArray(data) && data.length) {
      showBusinesses(data, false);
    } else {
      showBusinesses(approvedFallback, true);
    }
  } catch (err) {
    console.error("Error al cargar negocios aprobados; usando respaldo visual:",err);
    showBusinesses(approvedFallback, true);
  }
}

/* El eslogan superior sirve como botón para volver al inicio */
document.addEventListener("DOMContentLoaded",()=>{const homeButton=document.getElementById("tagline");if(homeButton)homeButton.addEventListener("click",()=>{window.scrollTo({top:0,behavior:"smooth"});});});
