/* Supabase: public publishable key only. Never store a secret API key in frontend. */
const MTN_URL="https://wndvkpbggwvaxgibwgqd.supabase.co";
const MTN_PUBLIC_KEY="sb_publishable_jXyyMbDxSl1UOUeLbnCLtw_1G78TFA9";
let mtnClient=null,mtnUser=null;
function mtnStatus(message){const el=document.getElementById("mtn-sync-status");if(el)el.textContent=message}
async function mtnInit(){if(!window.supabase){try{window.supabase=await import("https://esm.sh/@supabase/supabase-js@2.49.10")}catch(e){mtnStatus("Biblioteca de sincronização indisponível. Registros locais preservados.");return}}mtnClient=window.supabase.createClient(MTN_URL,MTN_PUBLIC_KEY,{auth:{persistSession:true,autoRefreshToken:true}});mtnClient.auth.getUser().then(({data,error})=>{mtnUser=error?null:data.user;mtnStatus(mtnUser?"Conectado: "+mtnUser.email:"Sem login: registros apenas neste dispositivo");if(typeof render==="function")render();if(mtnUser&&localStorage.getItem("mtn-sync-owner")===mtnUser.id)mtnSyncPending().catch(()=>{})});mtnClient.auth.onAuthStateChange((event,session)=>{mtnUser=session?.user||null;if(typeof render==="function")render();if(event==="SIGNED_IN"&&mtnUser&&localStorage.getItem("mtn-sync-owner")===mtnUser.id)setTimeout(()=>mtnSyncPending().catch(()=>{}),0)})}
function mtnExportBackup(){
 const keys=["mtndata","mtn-workout-v2","mtn-meal-swaps"];
 const backup={format:"meu-treino-nutri-backup",version:1,exported_at:new Date().toISOString(),items:{}};
 for(const key of keys){const raw=localStorage.getItem(key);if(raw!==null){try{backup.items[key]=JSON.parse(raw)}catch{backup.items[key]=raw}}}
 const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
 const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download="meu-treino-nutri-backup-completo.json";link.click();
 setTimeout(()=>URL.revokeObjectURL(link.href),1000);
}
async function mtnRestoreBackupFile(){
 const picker=document.createElement("input");picker.type="file";picker.accept=".json,application/json";
 picker.onchange=async()=>{
  const file=picker.files?.[0];if(!file)return;
  if(file.size>5*1024*1024)return alert("Arquivo muito grande. Limite de 5 MB.");
  let backup;try{backup=JSON.parse(await file.text())}catch{return alert("Arquivo JSON inválido.")}
  if(backup?.format!=="meu-treino-nutri-backup"||backup.version!==1||!backup.items||typeof backup.items!=="object")return alert("Formato de backup incompatível.");
  const keys=["mtndata","mtn-workout-v2","mtn-meal-swaps"];
  const entries=keys.filter(k=>Object.prototype.hasOwnProperty.call(backup.items,k));
  if(!entries.length)return alert("O arquivo não contém dados reconhecidos.");
  if(entries.includes("mtndata")&&!Array.isArray(backup.items.mtndata))return alert("Histórico de registros inválido.");
  if(entries.includes("mtn-workout-v2")){const w=backup.items["mtn-workout-v2"];if(w!==null&&(!w||typeof w!=="object"||Array.isArray(w)||!Number.isInteger(w.day)||w.day<0||w.day>6||typeof w.started!=="string"||!w.sets||typeof w.sets!=="object"||Array.isArray(w.sets)))return alert("Dados de treino inválidos.");}
  if(entries.includes("mtn-meal-swaps")&&(backup.items["mtn-meal-swaps"]===null||typeof backup.items["mtn-meal-swaps"]!=="object"||Array.isArray(backup.items["mtn-meal-swaps"])))return alert("Substituições alimentares inválidas.");
  if(!confirm("Restaurar "+entries.length+" categorias? O histórico de registros será combinado sem apagar os existentes. Outros ajustes serão substituídos pelo backup."))return;
  const existing=typeof getLog==="function"?getLog():[];
  const seen=new Set(existing.map(x=>JSON.stringify([x.at,x.tipo,x.detalhe])));
  const rawIncoming=Array.isArray(backup.items.mtndata)?backup.items.mtndata:[];
  if(rawIncoming.some(x=>!x||typeof x.at!=="string"||!Number.isFinite(Date.parse(x.at))||typeof x.tipo!=="string"||typeof x.detalhe!=="string"))return alert("Histórico contém registros inválidos. Nenhum dado foi alterado.");
  const incoming=rawIncoming;
  const added=incoming.filter(x=>{const k=JSON.stringify([x.at,x.tipo,x.detalhe]);if(seen.has(k))return false;seen.add(k);return true});
  const updates={};
  if(entries.includes("mtndata"))updates.mtndata=JSON.stringify(existing.concat(added).sort((a,b)=>String(a.at).localeCompare(String(b.at))));
  for(const k of entries.filter(k=>k!=="mtndata"))updates[k]=JSON.stringify(backup.items[k]);
  try{const originals={};for(const k of Object.keys(updates))originals[k]=localStorage.getItem(k);try{for(const [k,v] of Object.entries(updates))localStorage.setItem(k,v)}catch(e){for(const [k,v] of Object.entries(originals)){if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}throw e}}catch{return alert("Falha ao gravar o backup. Os dados anteriores foram preservados sempre que possível.")}
  alert("Backup restaurado. "+added.length+" registros adicionados. O aplicativo será recarregado para aplicar os dados.");
  location.reload();
 };
 picker.click();
}
async function mtnCheckConnection(){if(!mtnClient)return alert("Conexão indisponível");const r=await mtnClient.auth.getUser();if(r.error)return alert(r.error.message);if(!r.data.user)return alert("Faça login primeiro");const q=await mtnClient.from("workout_sets").select("id",{head:true,count:"exact"});alert(q.error?q.error.message:"Conexão validada. Séries: "+q.count)}
async function mtnLogin(){if(!mtnClient)return alert("Conexão indisponível.");const email=prompt("Digite seu e-mail para receber o link de acesso:");if(!email)return;const {error}=await mtnClient.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:location.origin+location.pathname}});alert(error?"Erro: "+error.message:"Verifique seu e-mail e abra o link neste dispositivo.")}
async function mtnLogout(){if(!mtnClient)return;if(!confirm("Sair da conta? Os registros locais continuarão neste aparelho. Em um aparelho compartilhado, faça um backup e proteja seus dados."))return;const {error}=await mtnClient.auth.signOut();if(error)return alert("Não foi possível sair: "+error.message);mtnUser=null;if(typeof render==="function")render()}
function mtnAuthView(){return '<section><h2>☁️ Sincronização</h2><p id="mtn-sync-status">'+(mtnUser?'Conectado: '+esc(mtnUser.email||"conta autenticada"):'Sem login: seus registros continuam locais')+'</p>'+(mtnUser?'<div class="row"><button onclick="mtnImportLocal()">Enviar histórico local ao banco</button><button onclick="mtnLoadCloud()">Consultar histórico na nuvem</button><button onclick="mtnRestoreCloud()">Restaurar histórico da nuvem</button><button onclick="mtnCheckConnection()">Testar conexão</button><button onclick="mtnLogout()">Sair</button></div>':'<button class="primary" onclick="mtnLogin()">Entrar com e-mail</button>')+'<div class="row"><button onclick="mtnExportBackup()">Backup completo</button><button onclick="mtnRestoreBackupFile()">Restaurar backup</button></div><p class="muted">O envio inicial exige sua confirmação. Não apague dados locais antes de conferir a cópia.</p></section>'}
function mtnTable(kind){return kind==="Treino"?"workout_sets":kind==="Refeição"?"food_entries":kind==="Suplemento"?"supplement_entries":kind==="Peso e cintura"?"body_metrics":kind==="Cardio"?"cardio_entries":"user_preferences"}
async function mtnSyncPending(){if(!mtnUser||localStorage.getItem("mtn-sync-owner")!==mtnUser.id)return;const list=getLog();let ok=0;for(const item of list){if(await mtnUpload(item))ok++}mtnStatus("Conectado: "+(mtnUser.email||"conta")+" · "+ok+"/"+list.length+" registros verificados");}
async function mtnRecordId(log){
 const data=new TextEncoder().encode(JSON.stringify([mtnUser?.id||"",log.at,log.tipo,log.detalhe]));
 const bytes=new Uint8Array(await crypto.subtle.digest("SHA-256",data));
 bytes[6]=(bytes[6]&15)|80;bytes[8]=(bytes[8]&63)|128;
 const hex=Array.from(bytes.slice(0,16),b=>b.toString(16).padStart(2,"0")).join("");
 return hex.slice(0,8)+"-"+hex.slice(8,12)+"-"+hex.slice(12,16)+"-"+hex.slice(16,20)+"-"+hex.slice(20);
}
async function mtnUpload(log){
 if(!mtnClient||!mtnUser||localStorage.getItem("mtn-sync-owner")!==mtnUser.id)return false;
 const id=await mtnRecordId(log);
 const {error}=await mtnClient.from(mtnTable(log.tipo)).upsert({id,user_id:mtnUser.id,recorded_at:log.at,payload:{tipo:log.tipo,detalhe:log.detalhe,local_id:id}},{onConflict:"id",ignoreDuplicates:true});
 if(error){mtnStatus("Falha ao sincronizar: "+error.message);return false}
 return true;
}
async function mtnImportLocal(){
 if(!mtnUser)return alert("Entre primeiro.");
 const list=getLog();if(!list.length)return alert("Nenhum registro local.");
 if(!confirm("Vincular "+list.length+" registros deste aparelho à conta "+(mtnUser.email||"atual")+"? Confirme que os registros pertencem a você."))return;
 localStorage.setItem("mtn-sync-owner",mtnUser.id);let ok=0;for(const log of list){if(await mtnUpload(log))ok++}
 alert(ok+" de "+list.length+" registros sincronizados. Os dados locais foram preservados.");
}
async function mtnRestoreCloud(){
 if(!mtnUser)return alert("Entre primeiro.");
 const tables=["workout_sets","food_entries","body_metrics","supplement_entries","cardio_entries","user_preferences"];
 const remote=[];
 for(const table of tables){
  let from=0;
  while(true){
   const {data,error}=await mtnClient.from(table).select("recorded_at,payload").order("recorded_at",{ascending:true}).range(from,from+499);
   if(error){alert("Erro ao consultar "+table+": "+error.message);return}
   remote.push(...data.filter(x=>x.payload&&typeof x.payload.detalhe==="string").map(x=>({at:x.recorded_at,tipo:x.payload.tipo||"Registro",detalhe:x.payload.detalhe})));
   if(data.length<500)break;
   from+=500;
  }
 }
 const local=getLog();
 const key=x=>JSON.stringify([x.at,x.tipo,x.detalhe]);
 const seen=new Set(local.map(key));
 const fresh=remote.filter(x=>!seen.has(key(x))&&(seen.add(key(x)),true));
 if(!fresh.length)return alert("Nenhum registro novo na nuvem. Seu histórico local foi preservado.");
 if(!confirm("Foram encontrados "+fresh.length+" registros adicionais. Deseja adicioná-los ao histórico deste aparelho?"))return;
 const merged=local.concat(fresh).sort((a,b)=>String(a.at).localeCompare(String(b.at)));
 localStorage.setItem("mtndata",JSON.stringify(merged));
 alert(fresh.length+" registros restaurados. Nenhum registro local foi removido.");
 if(typeof render==="function")render();
}
async function mtnLoadCloud(){if(!mtnUser)return;let counts=[];for(const t of ["workout_sets","food_entries","body_metrics","supplement_entries","cardio_entries","user_preferences"]){const {count,error}=await mtnClient.from(t).select("id",{count:"exact",head:true});counts.push(t+": "+(error?"erro":count))}alert("Registros na nuvem:\n"+counts.join("\n"))}
function mtnChatView(){return '<section><h2>💬 Assistente de treino</h2><p>Abra o projeto Treinos, Nutri e Suplementos no ChatGPT para conversar sobre seus resultados.</p><p><a target="_blank" rel="noopener" href="https://chatgpt.com/">Abrir ChatGPT ↗</a></p><p class="muted">O chat interno com leitura autorizada do banco depende de configurar a API da OpenAI no servidor. Ainda não está ativo. O ChatGPT não recebe automaticamente estes registros.</p></section>'}
window.addEventListener("load",mtnInit);
