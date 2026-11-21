/* Ferramentas de compras (Vendor de bolso) — funções comuns às páginas.
   Os dados das planilhas são lidos no navegador; só os campos necessários vão para o cálculo
   e nada é guardado no servidor. */
(function(){
'use strict';
var F = window.Ferramentas = {};

// ---- Endereços
F.API = window.FERRAMENTAS_API || 'https://ferramentas-compras-sadpik5z4a-rj.a.run.app/api/ferramentas';
F.MOTOR = window.CALC_API_BASE || 'https://calculadora-rtc-proxy-ocqi7adrrq-rj.a.run.app/api/calculadora';

// ---- Captura (HubSpot)
F.HS_PORTAL = '45901870';
F.HS_FORM = window.FERRAMENTAS_HS_FORM || '';
F.SUB_ONE = 336630888; F.SUB_MKT = 336630886;
F.PRIV = 'https://br.deyel.com/privacidade/';
var BLOCKED=['gmail','googlemail','hotmail','outlook','live','msn','yahoo','ymail','icloud','me.com','mac.com','aol','proton','protonmail','gmx','zoho','uol','bol','terra','ig.com.br','globo.com','globomail','r7','oi.com.br','yandex','mail.com'];
F.pessoal = function(em){ var d=(em.split('@')[1]||'').toLowerCase().trim(), label=d.split('.')[0]; return BLOCKED.some(function(b){ return b.indexOf('.')>-1 ? (d===b||d.slice(-(b.length+1))==='.'+b) : label===b; }); };

F.utm = (function(){ try{ var q=new URLSearchParams(location.search), o={}, any=false; ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function(k){ var v=q.get(k); if(v){ o[k]=v.slice(0,120); any=true; } }); if(any){ sessionStorage.setItem('ob_utm',JSON.stringify(o)); return o; } var s=sessionStorage.getItem('ob_utm'); return s?JSON.parse(s):{}; }catch(e){ return {}; } })();
F.evento = function(nome, params){ try{ if(window.gtag) gtag('event', nome, params||{}); }catch(e){} };

// ---- Formatação
var BRL = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
var BRL0 = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
F.brl = function(v){ return BRL.format(v||0).replace(/ /g,' '); };
F.brl0 = function(v){ return (Math.abs(v)>=100000?BRL0:BRL).format(v||0).replace(/ /g,' '); };
F.pct = function(v,d){ return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:d==null?1:d,maximumFractionDigits:d==null?2:d})+'%'; };
F.num = function(s){ if(typeof s==='number') return s; s=String(s==null?'':s).replace(/R\$|\s| /g,''); if(!s) return NaN; if(s.indexOf(',')>-1 && s.indexOf('.')>-1 && s.lastIndexOf('.')>s.lastIndexOf(',')) s=s.replace(/,/g,''); else if(s.indexOf(',')>-1) s=s.replace(/\./g,'').replace(',','.'); else if(/^\d{1,3}(\.\d{3})+$/.test(s)) s=s.replace(/\./g,''); return Number(s); };
F.el = function(tag,text,cls){ var e=document.createElement(tag); if(text!=null) e.textContent=text; if(cls) e.className=cls; return e; };
F.$ = function(id){ return document.getElementById(id); };
F.REGIMES = {regular:'Regime regular', simples:'Simples Nacional', simples_por_fora:'Simples (CBS/IBS por fora)', mei:'MEI', nao_sei:'Não informado', misto:'Vários'};
F.tagRegime = function(r){ var t=F.el('span',F.REGIMES[r]||r,'tag '+(r==='simples'||r==='mei'?'s':r==='nao_sei'||r==='misto'?'q':'r')); return t; };

// ---- Chamadas
F.getJSON = function(url){ return fetch(url).then(function(r){ return r.json().catch(function(){return {};}).then(function(j){ if(!r.ok) throw new Error(j.erro||j.detail||('HTTP '+r.status)); return j; }); }); };
F.post = function(rota, corpo){
  return fetch(F.API+rota,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(corpo)})
    .catch(function(){ throw new Error('A análise demorou mais do que o esperado ou a conexão caiu. Tente de novo; se o arquivo for grande, envie a planilha para comercial@optarisbrasil.com e devolvemos o resultado.'); })
    .then(function(r){ return r.json().catch(function(){return {};}).then(function(j){ if(!r.ok){ var e=new Error(j.erro||('Não foi possível concluir a análise (HTTP '+r.status+').')); e.status=r.status; throw e; } return j; }); });
};

// ---- Destino (UF e município), pelo proxy do motor da Receita
F.destino = function(ufSel, munSel){
  var hoje=new Date().toISOString().slice(0,10);
  function opt(s,t,v){ s.appendChild(new Option(t,v)); }
  F.getJSON(F.MOTOR+'/dados-abertos/ufs').then(function(l){
    ufSel.textContent=''; opt(ufSel,'Selecione','');
    l.filter(function(u){return u.sigla!=='EX';}).sort(function(a,b){return a.sigla<b.sigla?-1:1;}).forEach(function(u){ opt(ufSel,u.sigla+' — '+u.nome,u.sigla); });
    try{ var s=JSON.parse(localStorage.getItem('ob_destino')||'null'); if(s&&s.uf){ ufSel.value=s.uf; carregar(s.uf, s.mun); } }catch(e){}
  }).catch(function(){ ufSel.textContent=''; opt(ufSel,'Serviço indisponível no momento',''); });
  function carregar(uf, mun){
    munSel.disabled=true; munSel.textContent=''; opt(munSel,'Carregando…','');
    if(!uf){ munSel.textContent=''; opt(munSel,'Escolha a UF',''); return; }
    F.getJSON(F.MOTOR+'/dados-abertos/ufs/municipios?siglaUf='+uf).then(function(l){
      if(ufSel.value!==uf) return;
      munSel.textContent=''; opt(munSel,'Selecione','');
      l.forEach(function(x){ opt(munSel,x.nome,x.codigo); }); munSel.disabled=false;
      if(mun) munSel.value=String(mun);
    }).catch(function(){ munSel.textContent=''; opt(munSel,'Não foi possível carregar',''); });
  }
  ufSel.addEventListener('change',function(){ carregar(this.value); });
  munSel.addEventListener('change',function(){ try{ localStorage.setItem('ob_destino',JSON.stringify({uf:ufSel.value,mun:munSel.value})); }catch(e){} });
  return {hoje:hoje};
};

// ---- Premissas (2027): editáveis, com os padrões do serviço
F.lerPremissas = function(ids){
  var o={}; Object.keys(ids).forEach(function(k){ var v=F.num(F.$(ids[k]).value); if(!(v>=0)) throw new Error('Revise as premissas: valor inválido.'); o[k]=v; }); return o;
};

// ---- Planilhas: .xlsx (read-excel-file), .csv/.txt ou texto colado do Excel
function norm(s){ return String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim(); }
F.norm = norm;
function splitCSV(texto){
  var linhas=texto.replace(/\r\n?/g,'\n').split('\n').filter(function(l){ return l.trim()!==''; });
  if(!linhas.length) return [];
  var cab=linhas[0], sep = cab.indexOf('\t')>-1 ? '\t' : (cab.split(';').length>=cab.split(',').length ? ';' : ',');
  return linhas.map(function(l){
    var out=[], cur='', q=false;
    for(var i=0;i<l.length;i++){ var c=l[i];
      if(c==='"'){ if(q&&l[i+1]==='"'){ cur+='"'; i++; } else q=!q; }
      else if(c===sep&&!q){ out.push(cur); cur=''; }
      else cur+=c;
    }
    out.push(cur); return out.map(function(x){ return x.trim(); });
  });
}
F.lerTexto = splitCSV;
F.lerArquivo = function(file){
  var nome=(file.name||'').toLowerCase();
  if(/\.xlsx$/.test(nome)){
    if(!window.readXlsxFile) return Promise.reject(new Error('Leitor de Excel não carregou. Recarregue a página.'));
    return window.readXlsxFile(file).then(function(r){
      // versão 9: devolve [{sheet, data}]; versões anteriores: devolvem as linhas da primeira aba
      var linhas = Array.isArray(r) && r.length && r[0] && Array.isArray(r[0].data) ? (r.find(function(s){ return !/instru/i.test(s.sheet) && s.data.length>1; })||r[0]).data : r;
      return linhas.map(function(l){ return l.map(function(c){ return c==null?'':(c instanceof Date? c.toISOString().slice(0,10) : c); }); });
    });
  }
  if(/\.xls$/.test(nome)) return Promise.reject(new Error('Arquivos .xls antigos não são lidos. No Excel, use "Salvar como" .xlsx ou .csv.'));
  return file.arrayBuffer().then(function(b){ var t; try{ t=new TextDecoder('utf-8',{fatal:true}).decode(b); }catch(e){ t=new TextDecoder('windows-1252').decode(b); } return splitCSV(t.replace(/^\uFEFF/,'')); });
};

// Descobre a linha de cabeçalho e o papel de cada coluna. mapa: {campo: [regex, ...]}
F.mapear = function(linhas, mapa, ordemPadrao){
  var cabIdx=-1, cols=null;
  for(var i=0;i<Math.min(linhas.length,10);i++){
    var achou={}, n=0;
    linhas[i].forEach(function(c,j){ var t=norm(c); if(!t) return; Object.keys(mapa).some(function(campo){ if(achou[campo]!=null) return false; if(mapa[campo].some(function(re){ return re.test(t); })){ achou[campo]=j; n++; return true; } return false; }); });
    if(n>=2){ cabIdx=i; cols=achou; break; }
  }
  if(!cols){ cols={}; ordemPadrao.forEach(function(c,j){ cols[c]=j; }); cabIdx=-1; }
  var dados=linhas.slice(cabIdx+1).filter(function(l){ return l.some(function(c){ return String(c).trim()!==''; }); })
    .filter(function(l){ var t=l.filter(function(c){ return typeof c!=='number' && String(c).trim()!==''; }); return !(t.length && t.length<=2 && /^(sub)?tota(l|is)\b|^soma\b/.test(norm(t[0]))); });
  return {colunas:cols, linhas:dados, cabecalho: cabIdx>-1? linhas[cabIdx] : null, linhaInicial: cabIdx+2};
};

// ---- Exportar (CSV para Excel em português: separador ; e BOM)
F.baixarCSV = function(nome, linhas){
  var csv = '﻿'+linhas.map(function(l){ return l.map(function(c){ if(c==null) return ''; if(typeof c==='number') return String(c).replace('.',','); var s=String(c); return /[;"\n]/.test(s)? '"'+s.replace(/"/g,'""')+'"' : s; }).join(';'); }).join('\r\n');
  var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})); a.download=nome; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },500);
};

// ---- Bloco de captura: e-mail corporativo para baixar o relatório completo
function hutk(){ var m=document.cookie.match(/(?:^|;\s*)hubspotutk=([^;]+)/); return m?m[1]:''; }
F.captura = function(cont, o){
  var TXT_CONSENT='Ao enviar, você concorda que a Optaris do Brasil armazene e processe seus dados para enviar o relatório e responder a este contato, conforme a LGPD e a Política de Privacidade.';
  var TXT_ONE='Quero receber o relatório completo desta análise.';
  var TXT_IA_T='IA sob a governança da sua empresa';
  var TXT_IA='A Deyel funciona com a IA que já vem na plataforma ou com o fornecedor de IA que a sua empresa escolher. A camada de controle em tempo de execução da arquitetura Deyel dá governança corporativa a qualquer IA ou agente, e já foi homologada por empresas em vários países. Se o compliance não permitir IA, basta desligá-la: a plataforma segue 100% em automação de workflows e integrações.';
  var TXT_MKT='Quero receber conteúdo da Optaris e da Deyel sobre gestão de compras e a reforma tributária.';
  var box=F.el('div',null,'cap noprint'); box.appendChild(F.el('h3',o.titulo)); box.appendChild(F.el('p',o.texto)); var ia=F.el('div',null,'ia'); ia.appendChild(F.el('strong',TXT_IA_T)); ia.appendChild(F.el('span',TXT_IA)); box.appendChild(ia);
  var f=document.createElement('form'); f.noValidate=true; f.setAttribute('data-hs-do-not-collect','true');
  function campo(id,lbl,type,ac,ph,max){ var w=F.el('div'), l=F.el('label',lbl); l.htmlFor=id; var i=document.createElement('input'); i.id=id; i.type=type; i.autocomplete=ac; i.placeholder=ph; i.maxLength=max; if(type==='email'){ i.setAttribute('inputmode','email'); i.setAttribute('autocapitalize','off'); i.spellcheck=false; } w.appendChild(l); w.appendChild(i); return {w:w,i:i}; }
  var fe=campo('cap-email','E-mail corporativo','email','email','voce@suaempresa.com.br',120), fc=campo('cap-cargo','Cargo (opcional)','text','organization-title','Ex.: Gerente de Compras',80);
  var row=F.el('div',null,'row'); row.appendChild(fe.w); row.appendChild(fc.w); f.appendChild(row);
  var hp=F.el('div',null,'hp'); hp.setAttribute('aria-hidden','true'); var hpi=document.createElement('input'); hpi.type='text'; hpi.name='ob_hp'; hpi.tabIndex=-1; hpi.autocomplete='off'; hp.appendChild(hpi); f.appendChild(hp);
  function check(id,t){ var l=F.el('label',null,'opt'); l.htmlFor=id; var i=document.createElement('input'); i.type='checkbox'; i.id=id; l.appendChild(i); l.appendChild(F.el('span',t)); return {l:l,i:i}; }
  var o1=check('cap-o1',TXT_ONE), o2=check('cap-o2',TXT_MKT); f.appendChild(o1.l); f.appendChild(o2.l);
  var err=F.el('div',null,'info err'); err.setAttribute('role','alert'); err.hidden=true; f.appendChild(err);
  var btn=F.el('button',o.botao,'btn'); btn.type='submit'; f.appendChild(btn);
  var fine=F.el('p',null,'fine'), cp=TXT_CONSENT.split('Política de Privacidade'); fine.appendChild(document.createTextNode(cp[0])); var pa=F.el('a','Política de Privacidade'); pa.href=F.PRIV; pa.target='_blank'; pa.rel='noopener'; fine.appendChild(pa); fine.appendChild(document.createTextNode(cp[1]||'')); f.appendChild(fine);
  box.appendChild(f); cont.appendChild(box);
  try{ var sv=JSON.parse(sessionStorage.getItem('ob_cap')||'null'); if(sv){ fe.i.value=sv.e||''; fc.i.value=sv.c||''; } }catch(e){}
  F.evento('ferramenta_captura_exibida',{ferramenta:o.ferramenta});
  function fail(m,foco){ err.textContent=m; err.hidden=false; if(foco) foco.focus(); }
  f.addEventListener('submit',function(ev){
    ev.preventDefault(); if(btn.disabled) return; err.hidden=true;
    var email=fe.i.value.trim(), cargo=fc.i.value.trim();
    if(hpi.value){ return; }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Informe um e-mail válido.',fe.i);
    if(F.pessoal(email)) return fail('Use o e-mail da empresa.',fe.i);
    if(!o1.i.checked) return fail('Marque a caixa para receber o relatório.',o1.i);
    try{ sessionStorage.setItem('ob_cap',JSON.stringify({e:email,c:cargo})); }catch(e){}
    btn.disabled=true; btn.textContent='Enviando…';
    var campos=[{name:'email',value:email},{name:'origem',value:'Ferramentas de compras'},{name:'ferramenta_usada',value:o.ferramenta},{name:'ferramenta_resumo',value:String(o.resumo()).slice(0,1000)}];
    if(cargo) campos.push({name:'jobtitle',value:cargo});
    if(F.utm.utm_campaign) campos.push({name:'campanha',value:F.utm.utm_campaign});
    var ctx={pageUri:location.href,pageName:document.title}, k=hutk(); if(k) ctx.hutk=k;
    var payload={fields:campos,context:ctx,legalConsentOptions:{consent:{consentToProcess:true,text:TXT_CONSENT,communications:[{value:true,subscriptionTypeId:F.SUB_ONE,text:TXT_ONE},{value:!!o2.i.checked,subscriptionTypeId:F.SUB_MKT,text:TXT_MKT}]}}};
    var envio = (!F.HS_FORM || window.FERRAMENTAS_DRY) ? Promise.resolve({ok:true}) :
      fetch('https://api.hsforms.com/submissions/v3/integration/submit/'+F.HS_PORTAL+'/'+F.HS_FORM,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(function(r){ return {ok:r.ok,status:r.status}; });
    if(window.FERRAMENTAS_DRY){ try{ console.log('FERRAMENTAS_DRY '+JSON.stringify(payload)); }catch(e){} }
    envio.then(function(r){
      if(!r.ok) throw new Error('hs');
      F.evento('ferramenta_lead',{ferramenta:o.ferramenta});
      F.evento('generate_lead',{ferramenta:o.ferramenta, lead_source:'ferramentas_de_compras'});
      try{ if(window.fbq) fbq('track','Lead',{content_name:o.ferramenta, content_category:'ferramentas_de_compras'}); }catch(e){}
      o.depois();
      var ok=F.el('div',null,'cap'); ok.setAttribute('role','status'); ok.appendChild(F.el('h3',o.liberado||'Relatório liberado'));
      ok.appendChild(F.el('p','O download começou. Se não começar, use o botão abaixo. Nossa equipe pode ajudar a transformar esta análise em economia: fale com a gente quando quiser.'));
      var b=F.el('button','Baixar o relatório de novo','btn sec'); b.type='button'; b.addEventListener('click',o.depois); ok.appendChild(b);
      box.replaceWith(ok);
    }).catch(function(){ btn.disabled=false; btn.textContent=o.botao; fail('Não foi possível enviar agora. Tente de novo em instantes.'); });
  });
};

// ---- Chamada para o Vendor
F.cta = function(cont, titulo, texto, origem){
  var c=F.el('div',null,'cta noprint'); c.appendChild(F.el('h3',titulo)); c.appendChild(F.el('p',texto));
  [['Conhecer o Vendor','/gestao-de-compras-e-fornecedores/','p',false],['Agendar uma demonstração','https://calendly.com/paulocacciari/demo-plataforma-gestao-de-compras','s',true],['Falar pelo WhatsApp','https://wa.me/5511955700002?text='+encodeURIComponent('Olá! Usei a ferramenta "'+origem+'" e quero conhecer o Vendor Management.'),'s',true]].forEach(function(l){ var a=F.el('a',l[0],l[2]); a.href=l[1]; if(l[3]){ a.target='_blank'; a.rel='noopener'; } a.addEventListener('click',function(){ F.evento('ferramenta_cta',{ferramenta:origem,destino:l[0]}); }); c.appendChild(a); });
  cont.appendChild(c);
};
})();
