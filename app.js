const $ = id => document.getElementById(id);
const fields = [
  'produto','cultura','area','propriedade','dataInicio','dataFim',
  'latitude','longitude','municipio','precisao','vento','umidade','temperatura',
  'receita','art','notaFiscal','serie','aplicador','cpf',
  'assinaturaAplicador','assinaturaProdutor','observacoes'
];
const UPPERCASE_FIELDS = [
  'produto','cultura','propriedade','receita','art','notaFiscal','serie',
  'aplicador','assinaturaAplicador','assinaturaProdutor','observacoes'
];
const DEFAULTS = {
  propriedade:'AGROPECUÁRIA PAINEIRA',
  municipio:'RESTINGA SÊCA - RS',
  aplicador:'MARCIO GRIGOLETTO ESPINDOLA',
  cpf:'976.068.470-53',
  assinaturaAplicador:'MARCIO GRIGOLETTO ESPINDOLA',
  observacoes:'CERTIFICADO DE APLICADOR DE AGROTÓXICO VÁLIDO ATÉ 30/06/2030'
};
const STORE='paineira_caderno_campo';
const SAVED_OPTIONS_STORE='paineira_caderno_opcoes';
const LAST_USED_STORE='paineira_caderno_ultimo';
let deferredPrompt=null;

function dbLoad(){
  try{return JSON.parse(localStorage.getItem(STORE)||'[]')}
  catch{return []}
}
function dbSave(data){localStorage.setItem(STORE,JSON.stringify(data))}
function optionsLoad(){
  try{
    const o=JSON.parse(localStorage.getItem(SAVED_OPTIONS_STORE)||'{}');
    return {produtos:Array.isArray(o.produtos)?o.produtos:[],culturas:Array.isArray(o.culturas)?o.culturas:[]};
  }catch{return {produtos:[],culturas:[]}}
}
function optionsSave(o){localStorage.setItem(SAVED_OPTIONS_STORE,JSON.stringify(o))}
function lastUsedLoad(){
  try{return JSON.parse(localStorage.getItem(LAST_USED_STORE)||'{}')}
  catch{return {}}
}
function lastUsedSave(rec){
  localStorage.setItem(LAST_USED_STORE,JSON.stringify({produto:rec.produto||'',cultura:rec.cultura||''}));
}
function normalizeUpper(value){return String(value||'').trim().toLocaleUpperCase('pt-BR')}
function rememberReusable(rec){
  const o=optionsLoad();
  if(rec.produto && !o.produtos.includes(rec.produto))o.produtos.push(rec.produto);
  if(rec.cultura && !o.culturas.includes(rec.cultura))o.culturas.push(rec.cultura);
  o.produtos.sort((a,b)=>a.localeCompare(b,'pt-BR'));
  o.culturas.sort((a,b)=>a.localeCompare(b,'pt-BR'));
  optionsSave(o);lastUsedSave(rec);renderReusableOptions();
}
function renderReusableOptions(){
  const o=optionsLoad();
  $('produtoList').innerHTML=o.produtos.map(v=>`<option value="${esc(v)}"></option>`).join('');
  $('culturaList').innerHTML=o.culturas.map(v=>`<option value="${esc(v)}"></option>`).join('');
}
function bootstrapReusableOptions(){
  const data=dbLoad();
  if(!data.length)return;
  const o=optionsLoad();
  data.forEach(r=>{
    const p=normalizeUpper(r.produto),c=normalizeUpper(r.cultura);
    if(p&&!o.produtos.includes(p))o.produtos.push(p);
    if(c&&!o.culturas.includes(c))o.culturas.push(c);
  });
  o.produtos.sort((a,b)=>a.localeCompare(b,'pt-BR'));
  o.culturas.sort((a,b)=>a.localeCompare(b,'pt-BR'));
  optionsSave(o);
  if(!localStorage.getItem(LAST_USED_STORE)){
    const latest=[...data].sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''))[0];
    if(latest)lastUsedSave({produto:normalizeUpper(latest.produto),cultura:normalizeUpper(latest.cultura)});
  }
}
function localToday(){
  const d=new Date();
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function brDate(iso){
  if(!iso)return '';
  const p=iso.split('-');
  return p.length===3?`${p[2]}-${p[1]}-${p[0]}`:iso;
}
function esc(s=''){
  return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function toast(msg){
  const t=$('toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(t._timer); t._timer=setTimeout(()=>t.classList.remove('show'),2400);
}
function switchTab(name){
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  ['form','history','backup'].forEach(n=>$(n+'Panel').classList.toggle('active',n===name));
  if(name==='history')renderHistory();
  window.scrollTo({top:0,behavior:'smooth'});
}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));

function resetForm({keepReusable=true}={}){
  const last=keepReusable?lastUsedLoad():{};
  $('recordId').value='';
  fields.forEach(f=>$(f).value='');
  Object.entries(DEFAULTS).forEach(([k,v])=>$(k).value=v);
  if(keepReusable){
    if(last.produto)$('produto').value=last.produto;
    if(last.cultura)$('cultura').value=last.cultura;
  }
  $('dataInicio').value=localToday();
  $('gpsStatus').textContent='Toque em GPS para preencher latitude, longitude e precisão.';
  $('editBanner').classList.add('hidden');
}
$('newBtn').addEventListener('click',()=>{resetForm();switchTab('form')});
$('historyNewBtn').addEventListener('click',()=>{resetForm();switchTab('form')});
$('cancelBtn').addEventListener('click',()=>{
  const editing=Boolean($('recordId').value);
  resetForm();
  toast(editing?'Edição cancelada.':'Aplicação cancelada.');
});

UPPERCASE_FIELDS.forEach(id=>{
  $(id).addEventListener('input',e=>{
    const start=e.target.selectionStart,end=e.target.selectionEnd;
    e.target.value=e.target.value.toLocaleUpperCase('pt-BR');
    try{e.target.setSelectionRange(start,end)}catch{}
  });
  $(id).addEventListener('blur',e=>e.target.value=normalizeUpper(e.target.value));
});

$('cpf').addEventListener('input',e=>{
  let d=e.target.value.replace(/\D/g,'').slice(0,11);
  if(d.length>9)d=d.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/,'$1.$2.$3-$4');
  else if(d.length>6)d=d.replace(/(\d{3})(\d{3})(\d+)/,'$1.$2.$3');
  else if(d.length>3)d=d.replace(/(\d{3})(\d+)/,'$1.$2');
  e.target.value=d;
});

function normalizeCoordinate(value){
  return String(value||'').trim().replace(',', '.').replace(/[^0-9+\-.]/g,'');
}
['latitude','longitude'].forEach(id=>{
  $(id).addEventListener('blur',e=>{
    const v=normalizeCoordinate(e.target.value);
    if(!v){e.target.value='';return}
    if(!/^[+-]?\d+(?:\.\d+)?$/.test(v)){
      toast('Use coordenadas como -29.765477.');
      return;
    }
    e.target.value=v;
  });
});

$('gpsBtn').addEventListener('click',()=>{
  if(!navigator.geolocation){toast('GPS indisponível.');return}
  $('gpsBtn').disabled=true;
  $('gpsStatus').textContent='Obtendo localização...';
  navigator.geolocation.getCurrentPosition(pos=>{
    const lat=pos.coords.latitude.toFixed(6);
    const lon=pos.coords.longitude.toFixed(6);
    const acc=Math.round(pos.coords.accuracy);
    $('latitude').value=lat;$('longitude').value=lon;$('precisao').value=acc;
    $('municipio').value=DEFAULTS.municipio;
    $('gpsStatus').textContent=`Localização obtida • ±${acc} m`;
    $('gpsBtn').disabled=false;
    toast('GPS preenchido.');
  },err=>{
    $('gpsBtn').disabled=false;
    let msg='Não foi possível obter o GPS.';
    if(err.code===1)msg='Permita a localização para este site.';
    else if(err.code===2)msg='Localização indisponível.';
    else if(err.code===3)msg='GPS demorou para responder.';
    $('gpsStatus').textContent=msg;toast(msg);
  },{enableHighAccuracy:true,timeout:20000,maximumAge:5000});
});

$('appForm').addEventListener('submit',e=>{
  e.preventDefault();
  const rec={};fields.forEach(f=>rec[f]=$(f).value.trim());
  UPPERCASE_FIELDS.forEach(f=>rec[f]=normalizeUpper(rec[f]));
  rec.latitude=normalizeCoordinate(rec.latitude);
  rec.longitude=normalizeCoordinate(rec.longitude);
  if(rec.latitude && !/^[+-]?\d+(?:\.\d+)?$/.test(rec.latitude)){toast('Latitude inválida. Exemplo: -29.765477');return;}
  if(rec.longitude && !/^[+-]?\d+(?:\.\d+)?$/.test(rec.longitude)){toast('Longitude inválida. Exemplo: -53.500914');return;}
  rec.municipio=DEFAULTS.municipio;
  if(!rec.produto||!rec.cultura||!rec.propriedade||!rec.dataInicio||!rec.aplicador){
    toast('Preencha os campos obrigatórios.');return;
  }
  const existingId=$('recordId').value;
  rec.id=existingId||((globalThis.crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now()));
  rec.updatedAt=new Date().toISOString();
  const data=dbLoad();
  const idx=data.findIndex(x=>x.id===rec.id);
  if(idx>=0)data[idx]=rec;else data.unshift(rec);
  dbSave(data);rememberReusable(rec);
  toast(existingId?'Alterações salvas.':'Aplicação salva.');
  resetForm();renderHistory();
});

function renderHistory(){
  const q=$('search').value.trim().toLowerCase();
  const all=dbLoad().sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
  const data=all.filter(r=>!q||[r.produto,r.cultura,r.propriedade,r.municipio,r.aplicador].join(' ').toLowerCase().includes(q));
  $('historyCount').textContent=`${data.length} ${data.length===1?'registro':'registros'}`;
  $('emptyHistory').style.display=data.length?'none':'block';
  $('historyList').innerHTML=data.map(r=>`
    <article class="history-item">
      <h3>${esc(r.produto||'Sem produto')} — ${esc(r.cultura||'')}</h3>
      <div class="meta">
        <strong>Data:</strong> ${brDate(r.dataInicio)||'-'} &nbsp; <strong>Área:</strong> ${esc(r.area||'-')} ha<br>
        <strong>Propriedade:</strong> ${esc(r.propriedade||'-')}<br>
        <strong>Local:</strong> ${esc(r.municipio||'-')}${r.latitude?` • ${esc(r.latitude)}, ${esc(r.longitude)}`:''}
      </div>
      <div class="item-actions">
        <button class="secondary" onclick="editRecord('${r.id}')">Editar</button>
        <button class="secondary" onclick="printRecord('${r.id}')">Imprimir</button>
        <button class="danger" onclick="deleteRecord('${r.id}')">Excluir</button>
      </div>
    </article>`).join('');
}
$('search').addEventListener('input',renderHistory);

window.editRecord=id=>{
  const r=dbLoad().find(x=>x.id===id);if(!r)return;
  $('recordId').value=id;fields.forEach(f=>$(f).value=r[f]||'');
  $('municipio').value=DEFAULTS.municipio;
  $('editBanner').classList.remove('hidden');$('cancelBtn').classList.remove('hidden');
  switchTab('form');
};
window.deleteRecord=id=>{
  const r=dbLoad().find(x=>x.id===id);if(!r)return;
  if(!confirm(`Excluir a aplicação de ${r.produto||'produto'} em ${brDate(r.dataInicio)||'data não informada'}?`))return;
  dbSave(dbLoad().filter(x=>x.id!==id));renderHistory();toast('Aplicação excluída.');
};

function printHtml(r){
  const vento = r.vento ? `${esc(r.vento)} km/h` : '';
  const temperatura = r.temperatura ? `${esc(r.temperatura)} °C` : '';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Aplicação ${brDate(r.dataInicio)}</title>
  <style>
    @page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#222;margin:0;font-size:12px}
    .head{display:grid;grid-template-columns:85px 1fr;align-items:center;border-bottom:2px solid #215b34;padding-bottom:9px;margin-bottom:12px}
    .head img{width:74px;height:74px;object-fit:cover;border-radius:50%}.head h1{margin:0;color:#215b34;font-size:20px}.head p{margin:3px 0 0;font-size:12px}
    .title{text-align:center;font-weight:bold;font-size:14px;margin:10px 0}.sec{border:1px solid #cfd8d1;border-radius:7px;padding:9px;margin-top:8px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 18px}.f b{display:block;color:#526057;font-size:10px;text-transform:uppercase;margin-bottom:2px}
    .obs{min-height:45px}.sign{display:grid;grid-template-columns:1fr 1fr;gap:45px;margin-top:55px;text-align:center}.line{border-top:1px solid #333;padding-top:5px}
    .actions{display:flex;gap:10px;justify-content:center;margin:16px 0}.actions button{padding:10px 18px;border:0;border-radius:7px;font-weight:bold;cursor:pointer}
    .print{background:#215b34;color:#fff}.back{background:#edf3ef;color:#215b34;border:1px solid #cfd8d1!important}
    @media print{.actions{display:none}}
  </style></head><body>
  <div class="head"><img src="./assets/logo-paineira.png"><div><h1>AGROPECUÁRIA PAINEIRA</h1><p>Caderno de Campo</p></div></div>
  <div class="title">REGISTRO DE APLICAÇÃO</div>
  <div class="sec grid">
    <div class="f"><b>Produto aplicado</b>${esc(r.produto)}</div><div class="f"><b>Cultura tratada</b>${esc(r.cultura)}</div>
    <div class="f"><b>Área tratada (ha)</b>${esc(r.area)}</div><div class="f"><b>Propriedade</b>${esc(r.propriedade)}</div>
    <div class="f"><b>Data de início</b>${brDate(r.dataInicio)}</div><div class="f"><b>Data final</b>${brDate(r.dataFim)}</div>
  </div>
  <div class="sec grid">
    <div class="f"><b>Latitude</b>${esc(r.latitude)}</div><div class="f"><b>Longitude</b>${esc(r.longitude)}</div>
    <div class="f"><b>Município</b>${esc(r.municipio||DEFAULTS.municipio)}</div><div class="f"><b>Precisão GPS</b>${esc(r.precisao)}${r.precisao?' m':''}</div>
    <div class="f"><b>Vento</b>${vento}</div><div class="f"><b>Umidade (%)</b>${esc(r.umidade)}</div>
    <div class="f"><b>Temperatura</b>${temperatura}</div>
  </div>
  <div class="sec grid">
    <div class="f"><b>Receita agronômica</b>${esc(r.receita)}</div><div class="f"><b>ART</b>${esc(r.art)}</div>
    <div class="f"><b>Nota fiscal</b>${esc(r.notaFiscal)}</div><div class="f"><b>Série</b>${esc(r.serie)}</div>
    <div class="f"><b>Aplicador</b>${esc(r.aplicador)}</div><div class="f"><b>CPF</b>${esc(r.cpf)}</div>
  </div>
  <div class="sec obs"><div class="f"><b>Observações</b>${esc(r.observacoes).replace(/\n/g,'<br>')}</div></div>
  <div class="sign"><div class="line">${esc(r.assinaturaAplicador||r.aplicador)}<br>Assinatura do aplicador</div>
  <div class="line">${esc(r.assinaturaProdutor)}<br>Produtor / representante legal</div></div>
  <div class="actions"><button class="back" onclick="if(window.opener){window.close()}else{history.back()}">Voltar</button><button class="print" onclick="window.print()">Imprimir</button></div>
  </body></html>`;
}
window.printRecord=id=>{
  const r=dbLoad().find(x=>x.id===id);if(!r)return;
  const w=window.open('','_blank');
  if(!w){toast('Permita abrir a ficha para imprimir.');return}
  w.document.open();w.document.write(printHtml(r));w.document.close();
};

$('exportBtn').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify(dbLoad(),null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`caderno-campo-backup-${localToday()}.json`;a.click();URL.revokeObjectURL(a.href);
  toast('Backup exportado.');
});
$('importFile').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    const data=JSON.parse(await file.text());
    if(!Array.isArray(data))throw new Error();
    if(!confirm(`Importar ${data.length} registros? Os atuais serão substituídos.`))return;
    dbSave(data);
    const opts=optionsLoad();
    data.forEach(r=>{
      const p=normalizeUpper(r.produto),c=normalizeUpper(r.cultura);
      if(p&&!opts.produtos.includes(p))opts.produtos.push(p);
      if(c&&!opts.culturas.includes(c))opts.culturas.push(c);
    });
    optionsSave(opts);renderReusableOptions();renderHistory();toast('Backup importado.');
  }catch{toast('Arquivo de backup inválido.')}
  e.target.value='';
});
$('clearBtn').addEventListener('click',()=>{
  if(!confirm('Apagar todos os registros deste aparelho?'))return;
  if(!confirm('Confirma a exclusão total?'))return;
  dbSave([]);renderHistory();toast('Registros apagados.');
});

window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();deferredPrompt=e;$('installBtn').classList.remove('hidden');
});
$('installBtn').addEventListener('click',async()=>{
  if(!deferredPrompt){toast('Use Adicionar à Tela de Início no navegador.');return}
  deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('installBtn').classList.add('hidden');
});
window.addEventListener('appinstalled',()=>{$('installBtn').classList.add('hidden');toast('Aplicativo instalado.')});

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}

bootstrapReusableOptions();renderReusableOptions();resetForm();renderHistory();
