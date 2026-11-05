/* Supabase: public publishable key only. Never store a secret API key in frontend. */
const MTN_URL="https://wndvkpbggwvaxgibwgqd.supabase.co";
const MTN_PUBLIC_KEY="sb_publishable_jXyyMbDxSl1UOUeLbnCLtw_1G78TFA9";
let mtnClient=null,mtnUser=null;
let mtnLoginReady=false;
let mtnRecoverMode=location.hash.includes("type=recovery")||new URLSearchParams(location.search).get("reset")==="1";
const mtnRememberKey="mtn-remember-login";
const mtnRemember=()=>localStorage.getItem(mtnRememberKey)!=="no";
const mtnSessionStorage={getItem:k=>(mtnRemember()?localStorage:sessionStorage).getItem(k),setItem:(k,v)=>(mtnRemember()?localStorage:sessionStorage).setItem(k,v),removeItem:k=>{localStorage.removeItem(k);sessionStorage.removeItem(k)}};
function mtnGate(){
 if(mtnRecoverMode){mtnRecoveryView();return}
 let el=document.getElementById("mtn-login-gate");
 if(!el){el=document.createElement("div");el.id="mtn-login-gate";el.style.cssText="position:fixed;inset:0;z-index:99999;background:#0e1726;color:#f5f7fb;overflow:auto;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;font:16px system-ui";document.body.appendChild(el)}
 if(mtnUser){el.style.display="none";return}
 el.style.display="flex";
 el.innerHTML='<div style="width:min(100%,420px);padding:28px 22px;border-radius:22px;background:#19283b;border:1px solid #3c556b;box-sizing:border-box"><h1 style="font-size:26px;margin:0 0 8px">Meu Treino & Nutri</h1><p style="color:#b8cad8">Entre para acessar seus treinos, alimentacao e evolucao.</p><form onsubmit="event.preventDefault();mtnGateLogin()"><label for="mtn-gate-email" style="display:block;margin:16px 0 8px">E-mail</label><input id="mtn-gate-email" type="email" required autocomplete="email" placeholder="voce@exemplo.com" style="box-sizing:border-box;width:100%;padding:14px;background:#0d1928;color:white;border:1px solid #5a6d80;border-radius:10px"><label for="mtn-gate-password" style="display:block;margin:16px 0 8px">Senha</label><input id="mtn-gate-password" type="password" required minlength="6" autocomplete="current-password" placeholder="Sua senha" style="box-sizing:border-box;width:100%;padding:14px;background:#0d1928;color:white;border:1px solid #5a6d80;border-radius:10px"><label style="display:flex;align-items:center;gap:10px;margin:20px 0"><input type="checkbox" id="mtn-gate-remember" '+(mtnRemember()?'checked':'')+'> Manter conectado neste aparelho</label><button class="primary" style="width:100%;padding:14px" type="submit">Entrar</button></form><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:16px"><button type="button" onclick="mtnGateRegister()">Cadastrar novo usuario</button><button type="button" onclick="mtnGateReset()">Esqueci minha senha</button></div><p id="mtn-gate-message" role="status" style="color:#b8cad8;font-size:13px;margin-top:16px">Se voce ja usava acesso por e-mail sem senha, escolha Esqueci minha senha para criar uma.</p></div>';
}
function mtnRecoveryView(){
 let el=document.getElementById("mtn-login-gate");
 if(!el){el=document.createElement("div");el.id="mtn-login-gate";el.style.cssText="position:fixed;inset:0;z-index:99999;background:#0e1726;color:#f5f7fb;overflow:auto;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;font:16px system-ui";document.body.appendChild(el)}
 el.style.display="flex";
 el.innerHTML='<div style="width:min(100%,420px);padding:28px 22px;border-radius:22px;background:#19283b;border:1px solid #3c556b;box-sizing:border-box"><h1 style="font-size:25px;margin:0 0 12px">Redefinir senha</h1><p style="color:#b8cad8">Crie uma senha nova para o Meu Treino & Nutri.</p><form onsubmit="event.preventDefault();mtnRecoverySave()"><label for="mtn-new-password" style="display:block;margin:16px 0 8px">Nova senha</label><input id="mtn-new-password" type="password" autocomplete="new-password" minlength="8" required style="box-sizing:border-box;width:100%;padding:14px;background:#0d1928;color:white;border:1px solid #5a6d80;border-radius:10px"><label for="mtn-confirm-password" style="display:block;margin:16px 0 8px">Confirmar nova senha</label><input id="mtn-confirm-password" type="password" autocomplete="new-password" minlength="8" required style="box-sizing:border-box;width:100%;padding:14px;background:#0d1928;color:white;border:1px solid #5a6d80;border-radius:10px"><button class="primary" type="submit" style="width:100%;padding:14px;margin-top:20px">Salvar nova senha</button></form><p id="mtn-recovery-message" role="status" style="color:#b8cad8;font-size:14px;margin-top:16px">Aguarde a validacao do link de recuperacao.</p><button type="button" onclick="mtnRecoverMode=false;history.replaceState(null,\'\',location.pathname);mtnGate()" style="margin-top:12px">Voltar ao login</button></div>';
}
async function mtnRecoverySave(){
 const msg=document.getElementById("mtn-recovery-message");
 try{if(!mtnClient)throw Error("Conexao indisponivel.");const a=document.getElementById("mtn-new-password")?.value||"",b=document.getElementById("mtn-confirm-password")?.value||"";
 if(a.length<8)throw Error("Use pelo menos 8 caracteres.");if(a!==b)throw Error("As senhas nao coincidem.");
 const {data:{session}}=await mtnClient.auth.getSession();if(!session)throw Error("Link expirado ou aberto em outro navegador. Solicite um novo link pelo login.");
 msg.textContent="Salvando senha...";const {error}=await mtnClient.auth.updateUser({password:a});if(error)throw error;
 msg.textContent="Senha alterada com sucesso. Voce ja pode entrar.";
 mtnRecoverMode=false;history.replaceState(null,"",location.pathname);await mtnClient.auth.signOut({scope:"local"});mtnGate();
 alert("Senha atualizada! Entre com seu e-mail e a nova senha.");
 }catch(e){if(msg)msg.textContent="Erro: "+e.message}
}
function mtnGateFields(){const email=document.getElementById("mtn-gate-email")?.value.trim()||"",password=document.getElementById("mtn-gate-password")?.value||"";if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error("Informe um e-mail valido.");return {email,password}}
function mtnGateMessage(message){const el=document.getElementById("mtn-gate-message");if(el)el.textContent=message}
async function mtnGateLogin(){
 try{if(!mtnClient)throw Error("Conexao indisponivel.");const {email,password}=mtnGateFields();if(!password)throw Error("Informe sua senha.");
 const remember=!!document.getElementById("mtn-gate-remember")?.checked;localStorage.setItem(mtnRememberKey,remember?"yes":"no");
 mtnGateMessage("Entrando...");const {error}=await mtnClient.auth.signInWithPassword({email,password});if(error)throw error;
 mtnGateMessage("Login realizado.");}catch(e){mtnGateMessage("Nao foi possivel entrar: "+e.message)}
}
async function mtnGateRegister(){
 try{if(!mtnClient)throw Error("Conexao indisponivel.");const {email,password}=mtnGateFields();if(password.length<8)throw Error("Crie uma senha com pelo menos 8 caracteres.");
 const confirmPassword=prompt("Confirme a senha digitada:");if(confirmPassword===null)return;if(password!==confirmPassword)throw Error("As senhas nao coincidem.");
 mtnGateMessage("Criando conta...");const {data,error}=await mtnClient.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}});if(error)throw error;
 mtnGateMessage(data.session?"Conta criada e conectada.":"Cadastro solicitado. Confirme o e-mail recebido para ativar sua conta.");}catch(e){mtnGateMessage("Cadastro: "+e.message)}
}
async function mtnGateReset(){
 try{if(!mtnClient)throw Error("Conexao indisponivel.");const {email}=mtnGateFields();const {error}=await mtnClient.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname+"?reset=1"});if(error)throw error;mtnGateMessage("Se o e-mail estiver cadastrado, voce recebera um link para definir sua senha.");}catch(e){mtnGateMessage("Recuperacao: "+e.message)}
}

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

  mtnGate();
  mtnClient = window.supabase.createClient(
    MTN_URL,
    MTN_PUBLIC_KEY,
    {
      auth: {
        persistSession: true,
        storage: mtnSessionStorage,
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
    mtnGate();
  }

  mtnClient.auth.onAuthStateChange((event, session) => {
    if(event==="PASSWORD_RECOVERY"){mtnRecoverMode=true;mtnRecoveryView()}
    updateAuth(session);

    if (
      event === "SIGNED_IN" &&
      session?.user &&
      localStorage.getItem("mtn-sync-owner") === session.user.id
    ) {
      setTimeout(() => {
        mtnSyncPending().then(()=>mtnReceiveCloud()).catch(e =>
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
async function mtnManualSync(){if(!mtnUser)return alert("Entre na sua conta primeiro.");if(localStorage.getItem("mtn-sync-owner")!==mtnUser.id)return alert("Confirme primeiro a vinculação dos registros à conta.");if(mtnSyncRunning)return alert("Uma sincronização já está em andamento.");if(!navigator.onLine)return alert("Sem internet. Os registros continuam salvos neste dispositivo.");try{await mtnSyncPending();await mtnReceiveCloud();alert("Sincronização concluída. Confira os dados no histórico.")}catch(e){alert("Falha ao sincronizar: "+e.message)}}
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
async function mtnReceiveCloud(){
 if(!mtnClient||!mtnUser||localStorage.getItem("mtn-sync-owner")!==mtnUser.id)return;
 const owner=mtnUser.id, tables=["workout_sessions","workout_sets","food_entries","body_metrics","supplement_entries","cardio_entries","user_preferences"];
 const remote=[];
 for(const table of tables){
  const {data,error}=await mtnClient.from(table).select("recorded_at,payload").eq("user_id",owner).order("recorded_at",{ascending:false}).limit(500);
  if(error)throw Error(table+": "+error.message);
  for(const row of data||[])if(typeof row.payload?.detalhe==="string")remote.push({at:row.recorded_at,tipo:row.payload.tipo||"Registro",detalhe:row.payload.detalhe});
 }
 if(mtnUser?.id!==owner||localStorage.getItem("mtn-sync-owner")!==owner)return;
 const existing=getLog(),seen=new Set(existing.map(x=>JSON.stringify([x.at,x.tipo,x.detalhe])));
 const incoming=remote.filter(x=>{const id=JSON.stringify([x.at,x.tipo,x.detalhe]);if(seen.has(id))return false;seen.add(id);return true});
 if(!incoming.length)return;
 localStorage.setItem("mtndata",JSON.stringify(existing.concat(incoming).sort((a,b)=>String(a.at).localeCompare(String(b.at)))));
 mtnStatus(incoming.length+" registro(s) recuperado(s) da nuvem");
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
 output.textContent=data?.answer||"Sem resposta do assistente.";await mtnChatHistory();
 }catch(e){output.textContent="Assistente indisponível: "+(e.message||"falha de conexão")+". Seus registros continuam acessíveis."}
}
async function mtnChatHistory(){
 const output=document.getElementById("mtn-chat-history");
 if(!output)return;
 if(!mtnClient||!mtnUser){output.textContent="Entre na conta para consultar o histórico.";return}
 output.textContent="Carregando conversas...";
 const owner=mtnUser.id;
 const {data,error}=await mtnClient.from("chat_messages").select("role,content,recorded_at").eq("user_id",owner).order("recorded_at",{ascending:false}).limit(20);
 if(mtnUser?.id!==owner)return;
 if(error){output.textContent="Não foi possível carregar o histórico: "+error.message;return}
 output.replaceChildren();
 if(!data?.length){output.textContent="Nenhuma conversa salva.";return}
 for(const item of data.slice().reverse()){
  const article=document.createElement("article"),label=document.createElement("b"),p=document.createElement("p");
  label.textContent=(item.role==="assistant"?"Assistente":"Você")+" · "+new Date(item.recorded_at).toLocaleString("pt-BR");
  p.textContent=item.content;article.append(label,p);output.append(article);
 }
}
function mtnChatView(){return '<section><h2>Análise no ChatGPT</h2><p>Continue registrando treinos, alimentação e evolução neste aplicativo, sem cobrança de API da OpenAI.</p><p><a href="https://chatgpt.com/" target="_blank" rel="noopener">Abrir ChatGPT</a></p><p class="muted">Compartilhe seu histórico aqui no ChatGPT quando quiser uma análise. A integração paga está desativada.</p></section>'}

window.addEventListener("online",()=>{if(mtnUser&&localStorage.getItem("mtn-sync-owner")===mtnUser.id)mtnSyncPending().then(()=>mtnReceiveCloud()).catch(e=>mtnStatus("Falha ao retomar sincronização: "+e.message))});
window.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&navigator.onLine&&mtnUser&&localStorage.getItem("mtn-sync-owner")===mtnUser.id)mtnSyncPending().then(()=>mtnReceiveCloud()).catch(e=>mtnStatus("Falha ao atualizar: "+e.message))});
window.addEventListener("load",()=>{mtnGate();mtnInit()});
