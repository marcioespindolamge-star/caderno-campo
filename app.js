const $ = id => document.getElementById(id);
const fields = ['produto','cultura','area','propriedade','dataInicio','dataFim','latitude','longitude','municipio','precisao','vento','umidade','temperatura','receita','art','notaFiscal','serie','aplicador','cpf','assinaturaAplicador','assinaturaProdutor','observacoes'];
const DEFAULTS = {propriedade:'AGROPECUÁRIA PAINEIRA',aplicador:'MARCIO GRIGOLETTO ESPINDOLA',cpf:'976.068.470-53',assinaturaAplicador:'MARCIO GRIGOLETTO ESPINDOLA'};
let deferredPrompt;

function dbLoad(){ try{return JSON.parse(localStorage.getItem('paineira_caderno_campo')||'[]')}catch{return []} }
function dbSave(data){ localStorage.setItem('paineira_caderno_campo',JSON.stringify(data)); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function brDate(iso){ if(!iso)return ''; const [y,m,d]=iso.split('-'); return `${d}-${m}-${y}`; }
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); }
function switchTab(name){ document.querySelectorAll('.panel').forEach(x=>x.classList.toggle('active',x.id===name)); document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===name)); if(name==='history')renderHistory(); }
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));

function resetForm(){ $('recordId').value=''; fields.forEach(f=>$(f).value=''); Object.entries(DEFAULTS).forEach(([k,v])=>$(k).value=v); $('dataInicio').value=todayISO(); $('gpsStatus').textContent='Latitude e longitude podem ser preenchidas automaticamente pelo GPS.'; }
$('newBtn').addEventListener('click',()=>{resetForm(); window.scrollTo({top:0,behavior:'smooth'});});

$('cpf').addEventListener('input',e=>{let d=e.target.value.replace(/\D/g,'').slice(0,11); if(d.length>9)d=d.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/,'$1.$2.$3-$4'); else if(d.length>6)d=d.replace(/(\d{3})(\d{3})(\d+)/,'$1.$2.$3'); else if(d.length>3)d=d.replace(/(\d{3})(\d+)/,'$1.$2'); e.target.value=d;});

$('gpsBtn').addEventListener('click',()=>{
  if(!navigator.geolocation){ toast('GPS não disponível neste aparelho.'); return; }
  $('gpsStatus').textContent='Obtendo localização...';
  navigator.geolocation.getCurrentPosition(pos=>{
    $('latitude').value=pos.coords.latitude.toFixed(6); $('longitude').value=pos.coords.longitude.toFixed(6); $('precisao').value=Math.round(pos.coords.accuracy);
    $('gpsStatus').textContent=`Localização obtida. Precisão aproximada: ${Math.round(pos.coords.accuracy)} m.`; toast('Localização preenchida.');
  },err=>{ $('gpsStatus').textContent='Não foi possível obter a localização. Verifique a permissão do GPS.'; toast('Localização não autorizada ou indisponível.'); },{enableHighAccuracy:true,timeout:15000,maximumAge:10000});
});

$('appForm').addEventListener('submit',e=>{
  e.preventDefault();
  const rec={}; fields.forEach(f=>rec[f]=$(f).value.trim());
  rec.id=$('recordId').value || crypto.randomUUID(); rec.updatedAt=new Date().toISOString();
  const data=dbLoad(); const idx=data.findIndex(x=>x.id===rec.id); if(idx>=0)data[idx]=rec; else data.unshift(rec); dbSave(data);
  toast(idx>=0?'Aplicação atualizada.':'Aplicação salva.'); resetForm(); renderHistory(); switchTab('history');
});

function renderHistory(){ const q=$('search').value.toLowerCase().trim(); const data=dbLoad().filter(r=>!q||Object.values(r).some(v=>String(v).toLowerCase().includes(q))); $('emptyHistory').style.display=data.length?'none':'block'; $('historyList').innerHTML=data.map(r=>`<article class="history-item"><h3>${esc(r.produto||'Sem produto')} — ${esc(r.cultura||'')}</h3><div class="meta"><strong>Data:</strong> ${brDate(r.dataInicio)} &nbsp; <strong>Área:</strong> ${esc(r.area||'-')} ha<br><strong>Propriedade:</strong> ${esc(r.propriedade||'-')}<br><strong>Local:</strong> ${esc(r.municipio||'-')} ${r.latitude?`(${esc(r.latitude)}, ${esc(r.longitude)})`:''}</div><div class="actions"><button class="secondary" onclick="editRecord('${r.id}')">Editar</button><button class="secondary" onclick="printRecord('${r.id}')">Imprimir</button><button class="danger" onclick="deleteRecord('${r.id}')">Excluir</button></div></article>`).join(''); }
$('search').addEventListener('input',renderHistory);

window.editRecord=id=>{ const r=dbLoad().find(x=>x.id===id); if(!r)return; $('recordId').value=id; fields.forEach(f=>$(f).value=r[f]||''); switchTab('form'); window.scrollTo({top:0,behavior:'smooth'}); };
window.deleteRecord=id=>{ if(!confirm('Excluir esta aplicação?'))return; dbSave(dbLoad().filter(x=>x.id!==id)); renderHistory(); toast('Aplicação excluída.'); };
window.printRecord=id=>{ const r=dbLoad().find(x=>x.id===id); if(!r)return; const w=open('','_blank'); w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Aplicação ${brDate(r.dataInicio)}</title><style>body{font-family:Arial;margin:28px;color:#222}h1{text-align:center;font-size:20px;margin-bottom:2px}h2{text-align:center;font-size:14px;font-weight:normal;margin-top:0}.sec{margin-top:18px;border-top:1px solid #999;padding-top:8px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px}.f{font-size:13px}.f b{display:block;font-size:11px;color:#555}.sign{display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-top:70px;text-align:center}.line{border-top:1px solid #333;padding-top:5px}@media print{button{display:none}}</style></head><body><h1>AGROPECUÁRIA PAINEIRA</h1><h2>CADERNO DE CAMPO — REGISTRO DE APLICAÇÃO</h2><div class="sec grid"><div class="f"><b>Produto aplicado</b>${esc(r.produto)}</div><div class="f"><b>Cultura tratada</b>${esc(r.cultura)}</div><div class="f"><b>Área tratada (ha)</b>${esc(r.area)}</div><div class="f"><b>Propriedade</b>${esc(r.propriedade)}</div><div class="f"><b>Data de início</b>${brDate(r.dataInicio)}</div><div class="f"><b>Data final</b>${brDate(r.dataFim)}</div></div><div class="sec grid"><div class="f"><b>Latitude</b>${esc(r.latitude)}</div><div class="f"><b>Longitude</b>${esc(r.longitude)}</div><div class="f"><b>Município</b>${esc(r.municipio)}</div><div class="f"><b>Precisão GPS</b>${esc(r.precisao)} m</div><div class="f"><b>Vento (km/h)</b>${esc(r.vento)}</div><div class="f"><b>Umidade (%)</b>${esc(r.umidade)}</div><div class="f"><b>Temperatura (°C)</b>${esc(r.temperatura)}</div></div><div class="sec grid"><div class="f"><b>Nº receita agronômica</b>${esc(r.receita)}</div><div class="f"><b>Nº ART</b>${esc(r.art)}</div><div class="f"><b>Nota fiscal</b>${esc(r.notaFiscal)} ${r.serie?`— Série ${esc(r.serie)}`:''}</div><div class="f"><b>Aplicador</b>${esc(r.aplicador)} — CPF ${esc(r.cpf)}</div></div><div class="sec"><div class="f"><b>Observações</b>${esc(r.observacoes).replace(/\n/g,'<br>')}</div></div><div class="sign"><div class="line">${esc(r.assinaturaAplicador||r.aplicador)}<br>Assinatura do aplicador</div><div class="line">${esc(r.assinaturaProdutor)}<br>Produtor / representante legal</div></div><script>window.onload=()=>window.print()<\/script></body></html>`); w.document.close(); };

$('exportBtn').addEventListener('click',()=>{ const blob=new Blob([JSON.stringify({app:'Caderno de Campo Paineira',version:1,exportedAt:new Date().toISOString(),records:dbLoad()},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`caderno-campo-backup-${todayISO()}.json`; a.click(); URL.revokeObjectURL(a.href); });
$('importFile').addEventListener('change',async e=>{ const f=e.target.files[0]; if(!f)return; try{const obj=JSON.parse(await f.text()); const records=Array.isArray(obj)?obj:obj.records; if(!Array.isArray(records))throw 0; if(!confirm(`Importar ${records.length} registro(s) e substituir os dados atuais?`))return; dbSave(records); renderHistory(); toast('Backup importado.');}catch{alert('Arquivo de backup inválido.')} e.target.value=''; });

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault(); deferredPrompt=e; $('installBtn').classList.remove('hidden');});
$('installBtn').addEventListener('click',async()=>{if(!deferredPrompt)return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; $('installBtn').classList.add('hidden');});
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
resetForm(); renderHistory();
