/* Supabase: public publishable key only. Never store a secret API key in frontend. */
const MTN_URL="https://wndvkpbggwvaxgibwgqd.supabase.co";
const MTN_PUBLIC_KEY="sb_publishable_jXyyMbDxSl1UOUeLbnCLtw_1G78TFA9";
let mtnClient=null,mtnUser=null;
function mtnStatus(message){const el=document.getElementById("mtn-sync-status");if(el)el.textContent=message}
async function mtnInit(){if(!window.supabase){try{window.supabase=await import("https://esm.sh/@supabase/supabase-js@2.49.10")}catch(e){mtnStatus("Biblioteca de sincronização indisponível. Registros locais preservados.");return}}mtnClient=window.supabase.createClient(MTN_URL,MTN_PUBLIC_KEY,{auth:{persistSession:true,autoRefreshToken:true}});mtnClient.auth.getUser().then(({data,error})=>{mtnUser=error?null:data.user;mtnStatus(mtnUser?"Conectado: "+mtnUser.email:"Sem login: registros apenas neste dispositivo");if(typeof render==="function")render()});mtnClient.auth.onAuthStateChange((_event,session)=>{mtnUser=session?.user||null;if(typeof render==="function")render()})}
async function mtnLogin(){if(!mtnClient)return alert("Conexão indisponível.");const email=prompt("Digite seu e-mail para receber o link de acesso:");if(!email)return;const {error}=await mtnClient.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:location.origin+location.pathname}});alert(error?"Erro: "+error.message:"Verifique seu e-mail e abra o link neste dispositivo.")}
async function mtnLogout(){if(mtnClient){await mtnClient.auth.signOut();mtnUser=null;render()}}
function mtnAuthView(){return '<section><h2>☁️ Sincronização</h2><p id="mtn-sync-status">'+(mtnUser?'Conectado: '+esc(mtnUser.email||"conta autenticada"):'Sem login: seus registros continuam locais')+'</p>'+(mtnUser?'<div class="row"><button onclick="mtnImportLocal()">Enviar histórico local ao banco</button><button onclick="mtnLoadCloud()">Consultar histórico na nuvem</button><button onclick="mtnLogout()">Sair</button></div>':'<button class="primary" onclick="mtnLogin()">Entrar com e-mail</button>')+'<p class="muted">O envio inicial exige sua confirmação. Não apague dados locais antes de conferir a cópia.</p></section>'}
function mtnTable(kind){return kind==="Treino"?"workout_sets":kind==="Refeição"?"food_entries":kind==="Suplemento"?"supplement_entries":kind==="Peso e cintura"?"body_metrics":kind==="Cardio"?"cardio_entries":"user_preferences"}
async function mtnRecordId(log){
 const data=new TextEncoder().encode(JSON.stringify([log.at,log.tipo,log.detalhe]));
 const bytes=new Uint8Array(await crypto.subtle.digest("SHA-256",data));
 bytes[6]=(bytes[6]&15)|80;bytes[8]=(bytes[8]&63)|128;
 const hex=Array.from(bytes.slice(0,16),b=>b.toString(16).padStart(2,"0")).join("");
 return hex.slice(0,8)+"-"+hex.slice(8,12)+"-"+hex.slice(12,16)+"-"+hex.slice(16,20)+"-"+hex.slice(20);
}
async function mtnUpload(log){
 if(!mtnClient||!mtnUser)return false;
 const id=await mtnRecordId(log);
 const {error}=await mtnClient.from(mtnTable(log.tipo)).upsert({id,user_id:mtnUser.id,recorded_at:log.at,payload:{tipo:log.tipo,detalhe:log.detalhe,local_id:id}},{onConflict:"id",ignoreDuplicates:true});
 if(error){mtnStatus("Falha ao sincronizar: "+error.message);return false}
 return true;
}
async function mtnImportLocal(){
 if(!mtnUser)return alert("Entre primeiro.");
 const list=getLog();if(!list.length)return alert("Nenhum registro local.");
 if(!confirm("Enviar "+list.length+" registros locais ao banco privado? A importação usa identificadores estáveis para evitar duplicatas futuras."))return;
 let ok=0;for(const log of list){if(await mtnUpload(log))ok++}
 alert(ok+" de "+list.length+" registros sincronizados. Os dados locais foram preservados.");
}
async function mtnLoadCloud(){if(!mtnUser)return;let counts=[];for(const t of ["workout_sets","food_entries","body_metrics","supplement_entries","cardio_entries","user_preferences"]){const {count,error}=await mtnClient.from(t).select("id",{count:"exact",head:true});counts.push(t+": "+(error?"erro":count))}alert("Registros na nuvem:\n"+counts.join("\n"))}
function mtnChatView(){return '<section><h2>💬 Assistente de treino</h2><p>Abra o projeto Treinos, Nutri e Suplementos no ChatGPT para conversar sobre seus resultados.</p><p><a target="_blank" rel="noopener" href="https://chatgpt.com/">Abrir ChatGPT ↗</a></p><p class="muted">O chat interno com leitura autorizada do banco depende de configurar a API da OpenAI no servidor. Ainda não está ativo. O ChatGPT não recebe automaticamente estes registros.</p></section>'}
window.addEventListener("load",mtnInit);
