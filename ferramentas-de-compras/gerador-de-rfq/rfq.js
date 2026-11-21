/* Agente de RFQ — envia a necessidade descrita e mostra o pedido de cotação estruturado. */
(function(){
'use strict';
var F = window.Ferramentas, $ = F.$, el = F.el;
var FERRAMENTA = 'Gerador de RFQ', rfq = null;

$('exemplo').addEventListener('click', function(){
  $('nec').value = 'Contratar serviço de limpeza para uma fábrica de 8.000 m² em Jundiaí (SP), com área administrativa de 1.200 m², vestiários e refeitório para 250 pessoas. Dois turnos, de segunda a sábado. A empresa contratada fornece os materiais de limpeza e repõe os descartáveis dos banheiros.';
  $('qtd').value = 'Contrato de 12 meses'; $('prazo').value = 'Início em 30 dias'; $('local').value = 'Jundiaí (SP)'; $('crit').value = 'Preço, equipe fixa e experiência em indústria';
  F.evento('ferramenta_exemplo',{ferramenta:FERRAMENTA});
});

$('go').addEventListener('click', function(){
  var btn=this, res=$('res');
  function erro(m){ res.hidden=false; res.textContent=''; res.appendChild(el('h2','Cotação')); res.appendChild(el('div',m,'info err')); res.scrollIntoView({behavior:'smooth',block:'nearest'}); }
  var nec=$('nec').value.trim();
  if(nec.length<20) return erro('Descreva a necessidade com um pouco mais de detalhe: o que, para quê e em que quantidade.');
  btn.disabled=true; btn.textContent='Montando a cotação… leva uns 30 segundos';
  F.post('/rfq',{ necessidade:nec, quantidade:$('qtd').value.trim(), prazo:$('prazo').value.trim(), local:$('local').value.trim(), criterios:$('crit').value.trim() })
    .then(function(a){ rfq=a.rfq; render(rfq); F.evento('ferramenta_analise',{ferramenta:FERRAMENTA}); if(window.fbq) fbq('trackCustom','FerramentaAnalise',{ferramenta:FERRAMENTA}); })
    .catch(function(e){ erro(e.message||'Não foi possível montar a cotação agora.'); })
    .then(function(){ btn.disabled=false; btn.textContent='Montar a cotação'; });
});

function sec(cont, titulo){ var h=el('h3',titulo); h.style.margin='20px 0 8px'; cont.appendChild(h); }
function lista(cont, itens, ordenada){ var u=el(ordenada?'ol':'ul'); u.style.cssText='margin:0;padding-left:22px'; (itens||[]).forEach(function(x){ var li=el('li',x); li.style.margin='4px 0'; u.appendChild(li); }); cont.appendChild(u); }
function tabela(cont, cab, linhas, nums){ var w=el('div',null,'tbl'), t=el('table'), h=el('tr'); cab.forEach(function(x,i){ var th=el('th',x); if((nums||[]).indexOf(i)>-1) th.className='n'; h.appendChild(th); }); t.appendChild(h); linhas.forEach(function(l){ var tr=el('tr'); l.forEach(function(x,i){ var td=el('td',x); if((nums||[]).indexOf(i)>-1) td.className='n'; tr.appendChild(td); }); t.appendChild(tr); }); w.appendChild(t); cont.appendChild(w); }

function documento(r){
  var d=el('div'); d.id='doc';
  var t=el('h2',r.titulo); t.style.fontSize='24px'; d.appendChild(t);
  var o=el('p'); o.appendChild(el('b','Objeto: ')); o.appendChild(document.createTextNode(r.objeto)); o.style.margin='10px 0 4px'; d.appendChild(o);
  if(r.contexto){ var c=el('p',r.contexto,'muted'); c.style.fontSize='14.5px'; d.appendChild(c); }
  sec(d,'1. Itens'); tabela(d,['Item','Especificação','Unidade','Quantidade'],(r.itens||[]).map(function(i){ return [i.descricao,i.especificacao,i.unidade,i.quantidade]; }),[3]);
  sec(d,'2. Requisitos técnicos'); lista(d,r.requisitosTecnicos);
  var cc=r.condicoesComerciais||{};
  sec(d,'3. Condições comerciais'); tabela(d,['Condição','Proposta do comprador'],[['Prazo de entrega ou início',cc.prazoEntrega],['Local',cc.localEntrega],['Pagamento',cc.condicaoPagamento],['Validade da proposta',cc.validadeProposta],['Frete',cc.frete],['Garantia',cc.garantia],['Reajuste',cc.reajuste]].filter(function(x){ return x[1]; }));
  sec(d,'4. Preços e tributos'); d.appendChild(el('p',r.condicoesTributarias));
  sec(d,'5. Critérios de avaliação'); tabela(d,['Critério','Peso','Como será avaliado'],(r.criterios||[]).map(function(c){ return [c.criterio,c.peso+'%',c.comoAvaliar]; }),[1]);
  sec(d,'6. Perguntas para o fornecedor'); lista(d,r.perguntas,true);
  sec(d,'7. Documentos para homologação'); lista(d,r.documentos);
  sec(d,'8. Cronograma'); tabela(d,['Etapa','Prazo'],(r.cronograma||[]).map(function(c){ return [c.etapa,c.prazo]; }));
  return d;
}

function texto(r){
  var cc=r.condicoesComerciais||{}, L=[];
  L.push(r.titulo.toUpperCase(),'','Objeto: '+r.objeto); if(r.contexto) L.push(r.contexto);
  L.push('','1. ITENS'); (r.itens||[]).forEach(function(i,n){ L.push((n+1)+'. '+i.descricao+' — '+i.especificacao+' — '+i.quantidade+' '+i.unidade); });
  L.push('','2. REQUISITOS TÉCNICOS'); (r.requisitosTecnicos||[]).forEach(function(x){ L.push('- '+x); });
  L.push('','3. CONDIÇÕES COMERCIAIS','- Prazo: '+cc.prazoEntrega,'- Local: '+cc.localEntrega,'- Pagamento: '+cc.condicaoPagamento,'- Validade da proposta: '+cc.validadeProposta,'- Frete: '+cc.frete,'- Garantia: '+cc.garantia,'- Reajuste: '+cc.reajuste);
  L.push('','4. PREÇOS E TRIBUTOS',r.condicoesTributarias);
  L.push('','5. CRITÉRIOS DE AVALIAÇÃO'); (r.criterios||[]).forEach(function(c){ L.push('- '+c.criterio+' ('+c.peso+'%): '+c.comoAvaliar); });
  L.push('','6. PERGUNTAS PARA O FORNECEDOR'); (r.perguntas||[]).forEach(function(x,n){ L.push((n+1)+'. '+x); });
  L.push('','7. DOCUMENTOS PARA HOMOLOGAÇÃO'); (r.documentos||[]).forEach(function(x){ L.push('- '+x); });
  L.push('','8. CRONOGRAMA'); (r.cronograma||[]).forEach(function(c){ L.push('- '+c.etapa+': '+c.prazo); });
  return L.join('\n');
}

function render(r){
  var res=$('res'); res.hidden=false; res.textContent='';
  var top=el('div',null,'noprint'); top.appendChild(el('div','Cotação pronta para revisão. Confira especificações, quantidades e prazos antes de enviar aos fornecedores.','info ok')); res.appendChild(top);
  if((r.pontosDeAtencao||[]).length){ var pa=el('div',null,'info warn noprint'); pa.appendChild(el('b','Pontos de atenção do agente: ')); pa.appendChild(document.createTextNode(r.pontosDeAtencao.join(' · '))); res.appendChild(pa); }
  var doc=documento(r); doc.style.marginTop='16px'; res.appendChild(doc);
  var acts=el('div',null,'acts noprint');
  var cp=el('button','Copiar o texto','btn sec inline'); cp.type='button'; cp.addEventListener('click',function(){ var t=texto(r); (navigator.clipboard? navigator.clipboard.writeText(t) : Promise.reject()).then(function(){ cp.textContent='Texto copiado'; setTimeout(function(){ cp.textContent='Copiar o texto'; },2000); }).catch(function(){ var ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); cp.textContent='Texto copiado'; }catch(e){} ta.remove(); }); F.evento('ferramenta_copiar',{ferramenta:FERRAMENTA}); });
  var pr=el('button','Imprimir ou salvar em PDF','btn sec inline'); pr.type='button'; pr.addEventListener('click',function(){ window.print(); });
  acts.appendChild(cp); acts.appendChild(pr); res.appendChild(acts);
  F.captura(res,{ ferramenta:FERRAMENTA, titulo:'Baixe a cotação em Word', botao:'Baixar em Word', liberado:'Cotação liberada',
    texto:'O arquivo editável, com a tabela de itens e os critérios de avaliação, pronto para ajustar e enviar aos fornecedores.',
    resumo:function(){ return FERRAMENTA+': '+r.titulo+' — '+r.objeto.slice(0,300); },
    depois:baixarWord });
  F.cta(res,'Da cotação ao pedido, sem planilha','No Vendor Management, a cotação vai aos fornecedores pelo portal, as propostas voltam ranqueadas no mapa, com critérios com peso e custo real depois do crédito, e o vencedor vira pedido no mesmo fluxo.', FERRAMENTA);
  res.scrollIntoView({behavior:'smooth',block:'start'});
}

function baixarWord(){
  if(!rfq) return;
  var corpo=documento(rfq).outerHTML;
  var html='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>'+rfq.titulo.replace(/</g,'&lt;')+'</title><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#222}h2{font-size:18pt;color:#02132d}h3{font-size:13pt;color:#02132d;margin-top:16pt}table{border-collapse:collapse;width:100%}th,td{border:1px solid #c5cfdb;padding:4pt 6pt;text-align:left;vertical-align:top}th{background:#eef4fb}</style></head><body>'+corpo+'</body></html>';
  var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['﻿'+html],{type:'application/msword'}));
  a.download=(rfq.titulo||'cotacao').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)+'.doc';
  document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },500);
}
})();
