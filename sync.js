/* Supabase: public publishable key only. Never store a secret API key in frontend. */
const MTN_URL="https://wndvkpbggwvaxgibwgqd.supabase.co";
const MTN_PUBLIC_KEY="sb_publishable_jXyyMbDxSl1UOUeLbnCLtw_1G78TFA9";
let mtnClient=null,mtnUser=null;
function mtnStatus(message){const el=document.getElementById("mtn-sync-status");if(el)el.textContent=message}

async function mtnInit() {
  if (!window.supabase) {
    try {
      window.supabase = await import(
        "https://esm.sh/@supabase/supabase-js@2.49.10"
      );
    } catch (e) {
      mtnStatus("Biblioteca de sincronização indisponível.");
      return;
    }
  }

  mtnClient = window.supabase.createClient(
    MTN_URL,
    MTN_PUBLIC_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  function updateAuth(session) {
    mtnUser = session?.user || null;
    mtnStatus(
      mtnUser
        ? "Conectado: " + mtnUser.email
        : "Sem login: registros apenas neste dispositivo"
    );

    if (typeof render === "function") render();
  }

  mtnClient.auth.onAuthStateChange((event, session) => {
    updateAuth(session);

    if (
      event === "SIGNED_IN" &&
      session?.user &&
      localStorage.getItem("mtn-sync-owner") === session.user.id
    ) {
      setTimeout(() => {
        mtnSyncPending().catch(e =>
          mtnStatus("Falha de sincronização: " + e.message)
        );
      }, 0);
    }
  });

  const { data, error } = await mtnClient.auth.getSession();

  if (error) {
    mtnStatus("Erro ao recuperar sessão: " + error.message);
    return;
  }

  updateAuth(data.session);
}

function mtnExportBackup(){
 const keys=["mtndata","mtn-workout-v2","mtn-meal-swaps"];
 const backup={format:"meu-treino-nutri-backup",version:1,exported_at:new Date().toISOString(),owner_id:localStorage.getItem("mtn-sync-owner")||null,items:{}};
 for(const key of keys){const raw=localStorage.getItem(key);if(raw!==null){try{backup.items[key]=JSON.parse(raw)}catch{backup.items[key]=raw}}}
 const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
 const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download="meu-treino-nutri-backup-completo.json";link.click();
 setTimeout(()=>URL.revokeObjectURL(link.href),1000);
}
async function mtnRestoreBackupFile(){
 const picker=document.createElement("input");picker.type="file";picker.accept=".json,application/json";
 picker.onchange=async()=>{
  const file=picker.files?.[0];if(!file)return;
  if(file.size===0)return alert("Arquivo vazio.");
  if(file.size>5*1024*1024)return alert("Arquivo muito grande. Limite de 5 MB.");
  let backup;try{backup=JSON.parse(await file.text())}catch{return alert("Arquivo JSON inválido.")}
  if(backup?.format!=="meu-treino-nutri-backup"||backup.version!==1||!backup.items||typeof backup.items!=="object"||Array.isArray(backup.items))return alert("Formato de backup incompatível.");
  const keys=["mtndata","mtn-workout-v2","mtn-meal-swaps"];
  const owner=localStorage.getItem("mtn-sync-owner");
  if(backup.owner_id&&owner&&backup.owner_id!==owner)return alert("Backup de outra conta: restauração bloqueada.");
  if(backup.owner_id&&mtnUser&&backup.owner_id!==mtnUser.id)return alert("O backup não pertence à conta conectada.");
  if((owner||mtnUser)&&!backup.owner_id)return alert("Backup sem identificação de conta: restauração bloqueada enquanto houver uma conta ativa ou vinculada.");
  if(backup.owner_id&&!owner&&!mtnUser)return alert("Este backup pertence a uma conta. Entre nessa conta antes de restaurar.");
  if(backup.owner_id!==undefined&&backup.owner_id!==null&&(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(backup.owner_id))))return alert("Identificação de conta inválida no backup.");
  const entries=keys.filter(k=>Object.prototype.hasOwnProperty.call(backup.items,k));
  if(!entries.length)return alert("O arquivo não contém dados reconhecidos.");
  if(entries.includes("mtndata")&&!Array.isArray(backup.items.mtndata))return alert("Histórico de registros inválido.");
  if(entries.includes("mtn-workout-v2")){const w=backup.items["mtn-workout-v2"];if(w!==null&&(!w||typeof w!=="object"||Array.isArray(w)||!Number.isInteger(w.day)||w.day<0||w.day>6||typeof w.started!=="string"||!w.sets||typeof w.sets!=="object"||Array.isArray(w.sets)))return alert("Dados de treino inválidos.");}
  if(entries.includes("mtn-meal-swaps")&&(backup.items["mtn-meal-swaps"]===null||typeof backup.items["mtn-meal-swaps"]!=="object"||Array.isArray(backup.items["mtn-meal-swaps"])))return alert("Substituições alimentares inválidas.");
  if(!confirm("Restaurar "+entries.length+" categorias? O histórico de registros será combinado sem apagar os existentes. Outros ajustes serão substituídos pelo backup."))return;
  if(backup.owner_id){if(!mtnClient)return alert("Conexão com a autenticação indisponível. Restauração cancelada.");const check=await mtnClient.auth.getUser();if(check.error||check.data.user?.id!==backup.owner_id)return alert("Não foi possível confirmar a identidade do proprietário do backup.");}
  const existing=typeof getLog==="function"?getLog():[];
  const seen=new Set(existing.map(x=>JSON.stringify([x.at,x.tipo,x.detalhe])));
  const rawIncoming=Array.isArray(backup.items.mtndata)?backup.items.mtndata:[];
  if(rawIncoming.some(x=>!x||typeof x.at!=="string"||!Number.isFinite(Date.parse(x.at))||typeof x.tipo!=="string"||typeof x.detalhe!=="string"))return alert("Histórico contém registros inválidos. Nenhum dado foi alterado.");
  const incoming=rawIncoming;
  const added=incoming.filter(x=>{const k=JSON.stringify([x.at,x.tipo,x.detalhe]);if(seen.has(k))return false;seen.add(k);return true});
  const updates={};
  if(entries.includes("mtndata"))updates.mtndata=JSON.stringify(existing.concat(added).sort((a,b)=>String(a.at).localeCompare(String(b.at))));
  for(const k of entries.filter(k=>k!=="mtndata"))updates[k]=JSON.stringify(backup.items[k]);
  if(backup.owner_id&&mtnUser&&backup.owner_id===mtnUser.id&&!owner){if(existing.length||localStorage.getItem("mtn-workout-v2")||localStorage.getItem("mtn-meal-swaps"))return alert("Este dispositivo já possui dados locais. Faça backup e utilize um perfil vazio para evitar mistura de dados.");updates["mtn-sync-owner"]=backup.owner_id;}
  if(!backup.owner_id&&owner)return alert("Não é permitido substituir dados de uma conta vinculada com backup sem proprietário.");
  if(backup.owner_id&&!owner&&!mtnUser)return alert("Faça login na conta do backup antes de continuar.");
  if(backup.owner_id&&mtnUser&&backup.owner_id!==mtnUser.id)return alert("A conta autenticada não corresponde ao backup.");
  try{const originals={};for(const k of Object.keys(updates))originals[k]=localStorage.getItem(k);try{for(const [k,v] of Object.entries(updates))localStorage.setItem(k,v)}catch(e){for(const [k,v] of Object.entries(originals)){if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}throw e}}catch{return alert("Falha ao gravar o backup. Os dados anteriores foram preservados sempre que possível.")}
  alert("Backup restaurado. "+added.length+" registros adicionados. O aplicativo será recarregado para aplicar os dados.");
  location.reload();
 };
 picker.click();
}
async function mtnCheckConnection(){if(!mtnClient)return alert("Conexão indisponível");const r=await mtnClient.auth.getUser();if(r.error)return alert(r.error.message);if(!r.data.user)return alert("Faça login primeiro");const q=await mtnClient.from("workout_sets").select("id",{head:true,count:"exact"});alert(q.error?q.error.message:"Conexão validada. Séries: "+q.count)}
async function mtnManualSync(){if(!mtnUser)return alert("Entre na sua conta primeiro.");if(localStorage.getItem("mtn-sync-owner")!==mtnUser.id)return alert("Confirme primeiro a vinculação dos registros à conta.");if(mtnSyncRunning)return alert("Uma sincronização já está em andamento.");if(!navigator.onLine)return alert("Sem internet. Os registros continuam salvos neste dispositivo.");try{await mtnSyncPending();alert("Verifique o resultado da sincronização no status da conta.")}catch(e){alert("Falha ao sincronizar: "+e.message)}}
async function mtnLogin(){if(!mtnClient)return alert("Conexão indisponível.");const email=prompt("Digite seu e-mail para receber o link de acesso:");if(!email)return;const {error}=await mtnClient.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:location.origin+location.pathname}});alert(error?"Erro: "+error.message:"Verifique seu e-mail e abra o link neste dispositivo.")}
async function mtnLogout(){if(!mtnClient)return;if(!confirm("Sair da conta? Os registros locais continuarão neste aparelho. Em um aparelho compartilhado, faça um backup e proteja seus dados."))return;const {error}=await mtnClient.auth.signOut();if(error)return alert("Não foi possível sair: "+error.message);mtnUser=null;if(typeof render==="function")render()}
async function mtnSaveSettingsCloud(){
 if(!mtnClient||!mtnUser||!navigator.onLine)return alert("Entre na conta e conecte-se à internet.");
 const owner=mtnUser.id,linked=localStorage.getItem("mtn-sync-owner");if(linked&&linked!==owner)return alert("Este aparelho está vinculado a outra conta. Envio bloqueado.");if(!linked){if(!confirm("Vincular este aparelho à conta conectada? Os registros locais serão associados a esta conta; nenhum dado será apagado."))return;const {data:auth,error:authError}=await mtnClient.auth.getUser();if(authError||auth.user?.id!==owner||mtnUser?.id!==owner)return alert("Conta não confirmada. Vinculação cancelada.");if(localStorage.getItem("mtn-sync-owner"))return alert("A vinculação mudou. Tente novamente.");localStorage.setItem("mtn-sync-owner",owner)}
 const keys=["mtn-workout-v2","mtn-meal-swaps"],items={},snapshots={};for(const key of keys){const raw=localStorage.getItem(key);snapshots[key]=raw;if(raw!==null){try{items[key]=JSON.parse(raw)}catch{return alert("Dados locais inválidos: "+key)}}}
 if(!Object.keys(items).length)return alert("Não há treino guiado ou substituições para salvar.");
 const w=items["mtn-workout-v2"],sw=items["mtn-meal-swaps"];
 if(w!==undefined&&w!==null&&(!w||typeof w!=="object"||Array.isArray(w)||!Number.isInteger(w.day)||w.day<0||w.day>6||typeof w.started!=="string"||!Number.isFinite(Date.parse(w.started))||!w.sets||typeof w.sets!=="object"||Array.isArray(w.sets)))return alert("Treino local inválido: envio cancelado.");
 if(sw!==undefined&&(!sw||typeof sw!=="object"||Array.isArray(sw)))return alert("Substituições locais inválidas: envio cancelado.");
 if(!confirm("Substituir na nuvem o último estado de treino guiado e substituições alimentares desta conta?"))return;
 const id=await mtnRecordId({at:"2000-01-01T00:00:00.000Z",tipo:"Estado do aplicativo",detalhe:"estado-v1"},owner);
 if(mtnUser?.id!==owner||localStorage.getItem("mtn-sync-owner")!==owner)return alert("Conta alterada. Envio cancelado.");
 const {data:verified,error:authError}=await mtnClient.auth.getUser();
 if(authError||verified.user?.id!==owner||mtnUser?.id!==owner||localStorage.getItem("mtn-sync-owner")!==owner)return alert("Não foi possível confirmar a conta. Envio cancelado.");
 const {data:existing,error:readError}=await mtnClient.from("user_preferences").select("payload").eq("id",id).eq("user_id",owner).maybeSingle();
 if(readError)return alert("Não foi possível consultar o estado anterior: "+readError.message);
 if(existing?.payload&&(!existing.payload.items||typeof existing.payload.items!=="object"||Array.isArray(existing.payload.items)))return alert("Estado remoto incompatível. Envio cancelado.");
 const overlap=Object.keys(items).filter(key=>Object.prototype.hasOwnProperty.call(existing?.payload?.items||{},key));
 if(overlap.length&&!confirm("A nuvem já contém "+overlap.length+" categoria(s) que serão substituídas pelos dados deste aparelho. Se outro dispositivo tiver alterações mais recentes, elas poderão ser perdidas. Deseja continuar?"))return;
 const {data:latest,error:latestError}=await mtnClient.from("user_preferences").select("payload").eq("id",id).eq("user_id",owner).maybeSingle();
 if(latestError)return alert("Falha ao verificar alterações recentes: "+latestError.message);
 if(JSON.stringify(latest?.payload??null)!==JSON.stringify(existing?.payload??null))return alert("Os dados na nuvem mudaram durante a confirmação. Envio cancelado; consulte a versão atual antes de tentar novamente.");
 if(keys.some(key=>localStorage.getItem(key)!==snapshots[key]))return alert("Os dados deste aparelho mudaram durante o envio. Operação cancelada; tente novamente para salvar a versão mais recente.");
 const mergedItems={...(existing?.payload?.items||{}),...items};
 if(mtnUser?.id!==owner||localStorage.getItem("mtn-sync-owner")!==owner)return alert("Conta alterada. Envio cancelado.");
 const {error}=await mtnClient.from("user_preferences").upsert({id,user_id:owner,recorded_at:new Date().toISOString(),payload:{tipo:"Estado do aplicativo",version:1,items:mergedItems}},{onConflict:"id"});
 alert(error?"Falha ao salvar na nuvem: "+error.message:"Estado do aplicativo salvo na nuvem.");
}
async function mtnRestoreSettingsCloud(){
 if(!mtnClient||!mtnUser||!navigator.onLine)return alert("Entre na conta e conecte-se à internet.");
 const owner=mtnUser.id,linked=localStorage.getItem("mtn-sync-owner");if(linked&&linked!==owner)return alert("Este aparelho pertence a outra conta.");
 const id=await mtnRecordId({at:"2000-01-01T00:00:00.000Z",tipo:"Estado do aplicativo",detalhe:"estado-v1"},owner);
 const {data,error}=await mtnClient.from("user_preferences").select("payload").eq("id",id).eq("user_id",owner).maybeSingle();
 if(error)return alert("Falha ao recuperar: "+error.message);
 if(!data?.payload?.items)return alert("Nenhum estado salvo na nuvem.");
 const items=data.payload.items;
 if(!items||typeof items!=="object"||Array.isArray(items))return alert("Backup remoto inválido.");
 const workout=items["mtn-workout-v2"],swaps=items["mtn-meal-swaps"];
 if(workout!==undefined&&workout!==null&&(!workout||typeof workout!=="object"||Array.isArray(workout)||!Number.isInteger(workout.day)||workout.day<0||workout.day>6||typeof workout.started!=="string"||!Number.isFinite(Date.parse(workout.started))||!workout.sets||typeof workout.sets!=="object"||Array.isArray(workout.sets)))return alert("Treino remoto inválido.");
 if(swaps!==undefined&&(!swaps||typeof swaps!=="object"||Array.isArray(swaps)))return alert("Substituições remotas inválidas.");
 if(mtnUser?.id!==owner||localStorage.getItem("mtn-sync-owner")!==linked)return alert("Conta alterada. Restauração cancelada.");
 if(!confirm("Substituir neste aparelho o treino guiado e as substituições alimentares pelos dados salvos na nuvem? Faça backup antes de continuar."))return;
 if(mtnUser?.id!==owner)return alert("Conta alterada. Restauração cancelada.");
 const changes={};if(workout!==undefined)changes["mtn-workout-v2"]=JSON.stringify(workout);if(swaps!==undefined)changes["mtn-meal-swaps"]=JSON.stringify(swaps);if(!linked)changes["mtn-sync-owner"]=owner;
 const previous=Object.fromEntries(Object.keys(changes).map(k=>[k,localStorage.getItem(k)]));
 try{for(const [key,value] of Object.entries(changes))localStorage.setItem(key,value)}catch(e){for(const [key,value] of Object.entries(previous)){try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value)}catch{}}return alert("Falha ao restaurar; tentativa de recuperar os dados anteriores: "+e.message)}
 alert("Estado restaurado. A página será atualizada.");location.reload();
}
function mtnAuthView(){return '<section><h2>☁️ Sincronização</h2><p id="mtn-sync-status">'+(mtnUser?'Conectado: '+esc(mtnUser.email||"conta autenticada"):'Sem login: seus registros continuam locais')+'</p>'+(mtnUser?'<div class="row"><button onclick="mtnImportLocal()">Enviar histórico local ao banco</button><button onclick="mtnLoadCloud()">Consultar histórico na nuvem</button><button onclick="mtnRestoreCloud()">Restaurar histórico da nuvem</button><button onclick="mtnSaveSettingsCloud()">Salvar treino guiado e cardápio na nuvem</button><button onclick="mtnRestoreSettingsCloud()">Recuperar treino guiado e cardápio</button><button onclick="mtnCheckConnection()">Testar conexão</button><button onclick="mtnManualSync()">Sincronizar agora</button><button onclick="mtnLogout()">Sair</button></div>':'<button class="primary" onclick="mtnLogin()">Entrar com e-mail</button>')+'<div class="row"><button onclick="mtnExportBackup()">Backup completo</button><button onclick="mtnRestoreBackupFile()">Restaurar backup</button></div><p class="muted">O envio inicial exige sua confirmação. Não apague dados locais antes de conferir a cópia. Treino guiado e substituições alimentares podem ser transferidos manualmente pelos botões Salvar e Recuperar; ainda não há sincronização automática desses dados.</p></section>'}
function mtnTable(kind){return kind==="Treino"?"workout_sets":kind==="Treino finalizado"?"workout_sessions":kind==="Refeição"?"food_entries":kind==="Suplemento"?"supplement_entries":kind==="Peso e cintura"?"body_metrics":kind==="Cardio"?"cardio_entries":"user_preferences"}
let mtnSyncRunning=false;
async function mtnSyncPending(){if(mtnSyncRunning||!mtnUser||localStorage.getItem("mtn-sync-owner")!==mtnUser.id)return;mtnSyncRunning=true;try{const owner=mtnUser.id;const list=getLog();let ok=0;for(const item of list){if(!mtnUser||mtnUser.id!==owner||localStorage.getItem("mtn-sync-owner")!==owner){mtnStatus("Sincronização interrompida: conta alterada");return}try{if(await mtnUpload(item))ok++}catch(e){mtnStatus("Falha de envio: "+e.message)}}if(!mtnUser||mtnUser.id!==owner)return;mtnStatus("Conectado: "+(mtnUser.email||"conta")+" · "+ok+"/"+list.length+" registros verificados"+(ok<list.length?" · envio incompleto":""))}finally{mtnSyncRunning=false}}
async function mtnRecordId(log,owner){
 const data=new TextEncoder().encode(JSON.stringify([owner,log.at,log.tipo,log.detalhe]));
 const bytes=new Uint8Array(await crypto.subtle.digest("SHA-256",data));
 bytes[6]=(bytes[6]&15)|80;bytes[8]=(bytes[8]&63)|128;
 const hex=Array.from(bytes.slice(0,16),b=>b.toString(16).padStart(2,"0")).join("");
 return hex.slice(0,8)+"-"+hex.slice(8,12)+"-"+hex.slice(12,16)+"-"+hex.slice(16,20)+"-"+hex.slice(20);
}
async function mtnUpload(log){
 if(!mtnClient||!mtnUser||localStorage.getItem("mtn-sync-owner")!==mtnUser.id)return false;
 if(!log||typeof log.at!=="string"||!Number.isFinite(Date.parse(log.at))||typeof log.tipo!=="string"||typeof log.detalhe!=="string"){mtnStatus("Registro local inválido: envio ignorado");return false;}
 const owner=mtnUser.id;
 const id=await mtnRecordId(log,owner);
 if(!mtnUser||mtnUser.id!==owner||localStorage.getItem("mtn-sync-owner")!==owner)return false;
 if(!navigator.onLine){mtnStatus("Sem internet: registro mantido neste dispositivo");return false;}
 if(mtnUser?.id!==owner)return false;
 const {error}=await mtnClient.from(mtnTable(log.tipo)).upsert({id,user_id:owner,recorded_at:log.at,payload:{tipo:log.tipo,detalhe:log.detalhe,local_id:id}},{onConflict:"id",ignoreDuplicates:true});
 if(error){mtnStatus("Falha ao sincronizar: "+error.message);return false}
 return true;
}
async function mtnImportLocal(){
 if(!mtnUser)return alert("Entre primeiro.");
 const owner=localStorage.getItem("mtn-sync-owner");if(owner&&owner!==mtnUser.id)return alert("Este aparelho contém registros vinculados a outra conta. Para evitar mistura de dados, faça backup e use a conta original.");
 const list=getLog();if(!list.length)return alert("Nenhum registro local.");
 if(!confirm("Vincular "+list.length+" registros deste aparelho à conta "+(mtnUser.email||"atual")+"? Confirme que os registros pertencem a você."))return;
 localStorage.setItem("mtn-sync-owner",mtnUser.id);let ok=0;for(const log of list){try{if(await mtnUpload(log))ok++}catch(e){mtnStatus("Falha de envio: "+e.message)}}
 alert(ok+" de "+list.length+" registros sincronizados. "+(ok<list.length?"Alguns registros não foram enviados; tente novamente.":"Envio concluído.")+" Os dados locais foram preservados.");
}
async function mtnRestoreCloud(){
 if(!mtnUser)return alert("Entre primeiro.");
 if(!navigator.onLine)return alert("Sem internet. Seus registros locais foram preservados.");
 const accountId=mtnUser.id;
 const owner=localStorage.getItem("mtn-sync-owner");if(owner&&owner!==accountId)return alert("Os dados locais pertencem a outra conta. Restauração bloqueada para evitar mistura de históricos.");
 if(!owner&&(getLog().length||localStorage.getItem("mtn-workout-v2")||localStorage.getItem("mtn-meal-swaps")))return alert("Existem dados locais sem conta vinculada. Faça um backup antes de restaurar da nuvem e confirme a conta correta.");
 const tables=["workout_sessions","workout_sets","food_entries","body_metrics","supplement_entries","cardio_entries","user_preferences"];
 const remote=[];
 for(const table of tables){
  let from=0;
  while(true){
   const {data,error}=await mtnClient.from(table).select("recorded_at,payload").eq("user_id",accountId).order("recorded_at",{ascending:true}).order("id",{ascending:true}).range(from,from+499);
   if(!mtnUser||mtnUser.id!==accountId)return alert("Conta alterada durante a consulta. Restauração cancelada.");
   if(error){alert("Erro ao consultar "+table+": "+error.message);return}
   remote.push(...data.filter(x=>x.payload&&typeof x.payload.detalhe==="string").map(x=>({at:x.recorded_at,tipo:x.payload.tipo||"Registro",detalhe:x.payload.detalhe})));
   if(data.length<500)break;
   from+=500;
  }
 }
 const local=getLog();
 const {data:verified,error:authError}=await mtnClient.auth.getUser();
 if(authError||!verified.user||verified.user.id!==accountId||mtnUser?.id!==accountId)return alert("Não foi possível confirmar a conta. Restauração cancelada.");
 const shouldLink=!localStorage.getItem("mtn-sync-owner")&&remote.length>0&&local.length===0;
 if(shouldLink&&!confirm("Vincular este dispositivo à conta "+(mtnUser.email||"atual")+" para sincronizações futuras?"))return;
 const key=x=>JSON.stringify([x.at,x.tipo,x.detalhe]);
 const seen=new Set(local.map(key));
 const fresh=remote.filter(x=>!seen.has(key(x))&&(seen.add(key(x)),true));
 if(!fresh.length)return alert("Nenhum registro novo na nuvem. Seu histórico local foi preservado.");
 if(!confirm("Foram encontrados "+fresh.length+" registros adicionais. Deseja adicioná-los ao histórico deste aparelho?"))return;
 if(!mtnUser||mtnUser.id!==accountId||verified.user.id!==accountId||(localStorage.getItem("mtn-sync-owner")&&localStorage.getItem("mtn-sync-owner")!==accountId))return alert("A conta ou a vinculação mudou. Restauração cancelada.");
 const merged=local.concat(fresh).sort((a,b)=>String(a.at).localeCompare(String(b.at)));
 try{localStorage.setItem("mtndata",JSON.stringify(merged));if(shouldLink)localStorage.setItem("mtn-sync-owner",accountId)}catch(e){alert("Falha ao salvar o histórico restaurado: "+e.message);return}
 alert(fresh.length+" registros restaurados. Nenhum registro local foi removido.");
 if(typeof render==="function")render();
}
async function mtnLoadCloud(){if(!mtnUser)return;if(!navigator.onLine)return alert("Sem internet. Consulte os dados da nuvem quando a conexão voltar.");let counts=[];for(const t of ["workout_sessions","workout_sets","food_entries","body_metrics","supplement_entries","cardio_entries","user_preferences"]){const {count,error}=await mtnClient.from(t).select("id",{count:"exact",head:true}).eq("user_id",mtnUser.id);counts.push(t+": "+(error?"erro":count))}alert("Registros na nuvem:\n"+counts.join("\n"))}
async function mtnAskAI(){
 const field=document.getElementById("mtn-chat-question"),output=document.getElementById("mtn-chat-output");
 if(!field||!output)return;
 const question=field.value.trim();if(!question)return;
 if(!mtnClient||!mtnUser){output.textContent="Entre na sua conta para usar o assistente.";return}
 output.textContent="Consultando histórico...";
 try{
 const {data,error}=await mtnClient.functions.invoke("treino-assistente",{body:{question}});
 if(error)throw error;
 if(data?.error)throw Error(data.error);
 output.textContent=data?.answer||"Sem resposta do assistente.";
 }catch(e){output.textContent="Assistente indisponível: "+(e.message||"falha de conexão")+". Seus registros continuam acessíveis."}
}
function mtnChatView(){return '<section><h2>💬 Assistente conectado ao histórico</h2><p class="muted">Para consultar seus registros, entre na conta. O chat usa um serviço seguro no Supabase; requer chave de API do provedor configurada no servidor.</p><label>Pergunte sobre treinos e alimentação<textarea id="mtn-chat-question" rows="3" maxlength="1200" placeholder="Como evoluíram minhas cargas esta semana?" style="width:100%"></textarea></label><button class="primary" onclick="mtnAskAI()">Enviar pergunta</button><p id="mtn-chat-output" role="status"></p><p class="muted">Esta conversa não é sincronizada automaticamente com o projeto do ChatGPT.</p></section>'}
window.addEventListener("online",()=>{if(mtnUser&&localStorage.getItem("mtn-sync-owner")===mtnUser.id)mtnSyncPending().catch(e=>mtnStatus("Falha ao retomar sincronização: "+e.message))});
window.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&navigator.onLine&&mtnUser&&localStorage.getItem("mtn-sync-owner")===mtnUser.id)mtnSyncPending().catch(e=>mtnStatus("Falha ao atualizar: "+e.message))});
window.addEventListener("load",mtnInit);
