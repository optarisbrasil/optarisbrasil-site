/* Comparador de cotações pelo custo real — grade de itens × propostas, ranking pelo custo depois
   do crédito de CBS e IBS, compra dividida e desconto para empatar. */
(function(){
'use strict';
var F = window.Ferramentas, $ = F.$, el = F.el;
var MAX_ITENS = 30, MAX_PROP = 5, FERRAMENTA = 'Comparador de cotações';
var g = { itens: [], props: [], precos: [] }, analise = null;

function novoItem(){ return { descricao:'', codigo:'', quantidade:'1' }; }
function novaProp(n){ return { nome:'Proposta '+n, regime:'regular', comTributos:false }; }
function inicial(){ g.itens=[novoItem(),novoItem(),novoItem()]; g.props=[novaProp(1),novaProp(2),novaProp(3)]; g.precos=g.itens.map(function(){ return g.props.map(function(){ return ''; }); }); }
try{ var salvo=JSON.parse(sessionStorage.getItem('ob_cotacoes')||'null'); if(salvo&&salvo.itens&&salvo.props){ g=salvo; } else inicial(); }catch(e){ inicial(); }
function guardar(){ try{ sessionStorage.setItem('ob_cotacoes',JSON.stringify(g)); }catch(e){} }

var REG = [['regular','Regime regular'],['simples','Simples Nacional'],['simples_por_fora','Simples (CBS/IBS por fora)'],['mei','MEI']];

function input(val, ph, on, attrs){ var i=document.createElement('input'); i.value=val; i.placeholder=ph||''; i.addEventListener('input',function(){ on(this.value); guardar(); }); if(attrs) Object.keys(attrs).forEach(function(k){ i.setAttribute(k,attrs[k]); }); return i; }

function desenhar(){
  var t=$('grade'); t.textContent='';
  var h=el('tr');
  ['Item','NCM ou NBS','Qtd.'].forEach(function(x){ var th=el('th',x); h.appendChild(th); });
  g.props.forEach(function(p,j){
    var th=el('th'); th.style.minWidth='170px';
    var nome=input(p.nome,'Fornecedor',function(v){ p.nome=v; },{'aria-label':'Nome da proposta '+(j+1),maxlength:'80'}); th.appendChild(nome);
    var s=document.createElement('select'); s.setAttribute('aria-label','Regime do fornecedor da proposta '+(j+1)); REG.forEach(function(r){ s.appendChild(new Option(r[1],r[0])); }); s.value=p.regime; s.style.marginTop='6px';
    var lab=el('label',null,'chk'); var cb=document.createElement('input'); cb.type='checkbox'; cb.checked=!!p.comTributos; lab.appendChild(cb); lab.appendChild(el('span','preços já incluem CBS/IBS'));
    function visivel(){ lab.style.display = (p.regime==='simples'||p.regime==='mei') ? 'none' : 'flex'; }
    s.addEventListener('change',function(){ p.regime=this.value; visivel(); guardar(); });
    cb.addEventListener('change',function(){ p.comTributos=this.checked; guardar(); });
    th.appendChild(s); th.appendChild(lab); visivel();
    if(g.props.length>2){ var x=el('button','×','del'); x.type='button'; x.title='Remover proposta'; x.setAttribute('aria-label','Remover proposta '+(j+1)); x.addEventListener('click',function(){ g.props.splice(j,1); g.precos.forEach(function(l){ l.splice(j,1); }); guardar(); desenhar(); }); th.appendChild(x); }
    h.appendChild(th);
  });
  h.appendChild(el('th','')); t.appendChild(h);
  g.itens.forEach(function(it,i){
    var tr=el('tr');
    var td=el('td'); td.appendChild(input(it.descricao,'Ex.: Papel A4',function(v){ it.descricao=v; },{'aria-label':'Descrição do item '+(i+1),maxlength:'120'})); tr.appendChild(td);
    td=el('td'); td.appendChild(input(it.codigo,'8 ou 9 dígitos',function(v){ it.codigo=v; },{'aria-label':'NCM ou NBS do item '+(i+1),inputmode:'numeric',maxlength:'12'})); td.style.minWidth='130px'; tr.appendChild(td);
    td=el('td'); td.appendChild(input(it.quantidade,'1',function(v){ it.quantidade=v; },{'aria-label':'Quantidade do item '+(i+1),inputmode:'decimal'})); td.style.minWidth='80px'; tr.appendChild(td);
    g.props.forEach(function(p,j){ td=el('td'); td.appendChild(input(g.precos[i][j],'Preço unitário',function(v){ g.precos[i][j]=v; },{'aria-label':'Preço do item '+(i+1)+' na proposta '+(j+1),inputmode:'decimal'})); tr.appendChild(td); });
    td=el('td'); if(g.itens.length>1){ var x=el('button','×','del'); x.type='button'; x.title='Remover item'; x.setAttribute('aria-label','Remover item '+(i+1)); x.addEventListener('click',function(){ g.itens.splice(i,1); g.precos.splice(i,1); guardar(); desenhar(); }); td.appendChild(x); } tr.appendChild(td);
    t.appendChild(tr);
  });
  $('maisItem').disabled = g.itens.length>=MAX_ITENS; $('maisProp').disabled = g.props.length>=MAX_PROP;
}

$('maisItem').addEventListener('click',function(){ if(g.itens.length>=MAX_ITENS) return; g.itens.push(novoItem()); g.precos.push(g.props.map(function(){ return ''; })); guardar(); desenhar(); });
$('maisProp').addEventListener('click',function(){ if(g.props.length>=MAX_PROP) return; g.props.push(novaProp(g.props.length+1)); g.precos.forEach(function(l){ l.push(''); }); guardar(); desenhar(); });
$('limpar').addEventListener('click',function(){ inicial(); guardar(); desenhar(); $('res').hidden=true; });
$('exemplo').addEventListener('click',function(){
  g.itens=[{descricao:'Papel A4 (caixa com 10 resmas)',codigo:'48025610',quantidade:'120'},{descricao:'Caixa de papelão',codigo:'48191000',quantidade:'2000'},{descricao:'Palete de madeira',codigo:'44152000',quantidade:'300'},{descricao:'Manutenção das máquinas (mês)',codigo:'120015000',quantidade:'12'}];
  g.props=[{nome:'Distribuidora Atlas',regime:'regular',comTributos:false},{nome:'Comercial Ipê ME',regime:'simples',comTributos:true},{nome:'Grupo Sul Suprimentos',regime:'regular',comTributos:true}];
  g.precos=[['245,00','251,00','268,00'],['4,10','4,25','4,49'],['62,00','64,00','69,90'],['8.500,00','8.900,00','9.150,00']];
  guardar(); desenhar(); F.evento('ferramenta_exemplo',{ferramenta:FERRAMENTA});
});
desenhar();
F.destino($('uf'), $('mun'));

$('go').addEventListener('click',function(){
  var btn=this, res=$('res');
  function erro(m){ res.hidden=false; res.textContent=''; res.appendChild(el('h2','Resultado')); res.appendChild(el('div',m,'info err')); res.scrollIntoView({behavior:'smooth',block:'nearest'}); }
  var usados=[]; g.itens.forEach(function(it,i){ if(it.codigo||it.descricao||g.precos[i].some(function(p){ return String(p).trim(); })) usados.push(i); });
  if(!usados.length) return erro('Preencha ao menos um item com o NCM ou o NBS e os preços das propostas.');
  for(var k=0;k<usados.length;k++){ var it=g.itens[usados[k]]; if(!/^\d{8,9}$/.test(String(it.codigo).replace(/\D/g,''))) return erro('Item '+(usados[k]+1)+(it.descricao?' ('+it.descricao+')':'')+': informe o NCM (8 dígitos) ou o NBS (9 dígitos).'); }
  if(!$('uf').value||!$('mun').value) return erro('Escolha a UF e o município de destino.');
  var premissas; try{ premissas=F.lerPremissas({cbs:'pcbs',ibsUF:'pibs',ibsMun:'pmun',simplesBens:'psb',simplesServicos:'pss',mei:'pmei'}); }catch(e){ return erro(e.message); }
  var precos=usados.map(function(i){ return g.props.map(function(p,j){ var v=String(g.precos[i][j]).trim(); return v? F.num(v) : null; }); });
  if(precos.some(function(l){ return l.some(function(v){ return v!=null && !(v>0); }); })) return erro('Revise os preços: use números maiores que zero, como 1.234,56.');
  var corpo={ data:'2027-01-01', uf:$('uf').value, municipio:$('mun').value, compradorTomaCredito: document.querySelector('input[name=cred]:checked').value==='1', premissas:premissas,
    itens: usados.map(function(i){ var it=g.itens[i]; return {descricao:it.descricao, codigo:it.codigo, quantidade: F.num(it.quantidade)||1}; }),
    fornecedores: g.props.map(function(p){ return {nome:p.nome, regime:p.regime, precosComTributos:!!p.comTributos}; }), precos: precos };
  btn.disabled=true; btn.textContent='Comparando…';
  F.post('/cotacoes',corpo).then(function(a){ analise=a; render(a); F.evento('ferramenta_analise',{ferramenta:FERRAMENTA,itens:a.resumo.itens,propostas:a.resumo.fornecedores}); if(window.fbq) fbq('trackCustom','FerramentaAnalise',{ferramenta:FERRAMENTA}); })
    .catch(function(e){ erro(e.status===429?'Muitas comparações seguidas. Aguarde um minuto e tente de novo.':(e.message||'Não foi possível comparar agora.')); })
    .then(function(){ btn.disabled=false; btn.textContent='Comparar pelo custo real'; });
});

function kpi(c,r,v,s,cls){ var b=el('div',null,'box'+(cls?' '+cls:'')); b.appendChild(el('small',r)); b.appendChild(el('strong',v)); if(s) b.appendChild(el('em',s)); c.appendChild(b); }

function render(a){
  var res=$('res'), r=a.resumo, fs=a.fornecedores; res.hidden=false; res.textContent='';
  res.appendChild(el('h2','Resultado da comparação'));
  var best = r.vencedorCustoReal!=null ? fs[r.vencedorCustoReal] : null, face = r.vencedorPreco!=null ? fs[r.vencedorPreco] : null;
  var lead=el('p',null,'lead');
  if(!best){ lead.textContent='Nenhuma proposta pôde ser comparada. Revise os códigos e os preços.'; }
  else if(r.inverteu){
    lead.appendChild(document.createTextNode('A proposta com o menor valor a pagar, '+face.nome+', sai '));
    lead.appendChild(el('b',F.brl(r.diferencaInversao)+' mais cara no custo real'));
    lead.appendChild(document.createTextNode('. Depois do crédito de CBS e IBS, a melhor é '+best.nome+', com custo de '+F.brl(best.custoLiquido)+'.'));
  } else {
    lead.textContent = best.nome+' tem o menor valor a pagar e também o menor custo real depois do crédito de CBS e IBS: '+F.brl(best.custoLiquido)+'.';
  }
  res.appendChild(lead);
  if(r.fornecedoresCompletos < fs.filter(function(f){ return f.cotados; }).length) res.appendChild(el('div','O ranking considera só as propostas que cotaram todos os itens. As incompletas aparecem na tabela, sem posição.','info warn'));
  var k=el('div',null,'kpis');
  if(best) kpi(k,'Melhor custo real',F.brl0(best.custoLiquido),best.nome,'big');
  if(face&&best) kpi(k,'Menor valor a pagar',F.brl0(face.totalPago),face.nome+(r.inverteu?' (perde no custo real)':''), r.inverteu?'alert':'');
  var seg = a.rankingCustoReal.length>1 ? fs[a.rankingCustoReal[1]] : null;
  if(seg&&best) kpi(k,'Vantagem sobre a 2ª',F.brl0(seg.custoLiquido-best.custoLiquido),seg.nome);
  if(r.compraDividida!=null && r.economiaCompraDividida>0.005) kpi(k,'Dividindo a compra',F.brl0(r.economiaCompraDividida),'a menos, entre '+r.fornecedoresNaDivisao+' fornecedores','alert');
  res.appendChild(k);

  // Ranking
  var w=el('div',null,'tbl'), t=el('table'), h=el('tr');
  ['Posição','Proposta','Regime','Preço cotado','Total pago com tributos','Crédito','Custo real','Desconto para empatar'].forEach(function(x,i){ var th=el('th',x); if(i>=3) th.className='n'; h.appendChild(th); }); t.appendChild(h);
  var ordem = a.rankingCustoReal.concat(fs.map(function(f){ return f.indice; }).filter(function(i){ return a.rankingCustoReal.indexOf(i)<0; }));
  ordem.forEach(function(i){
    var f=fs[i], pos=a.rankingCustoReal.indexOf(i), tr=el('tr'); if(pos===0) tr.className='win';
    var c1=el('td'); if(pos===0) c1.appendChild(el('span','1º','tag w')); else c1.textContent = pos>0 ? (pos+1)+'º' : (f.cotados? 'incompleta ('+f.cotados+'/'+r.itensValidos+')' : 'sem preços');
    tr.appendChild(c1); tr.appendChild(el('td',f.nome)); var tdr=el('td'); tdr.appendChild(F.tagRegime(f.regime)); tr.appendChild(tdr);
    [F.brl(f.totalCotado),F.brl(f.totalPago),F.brl(f.credito),F.brl(f.custoLiquido), f.descontoEmpate? F.pct(f.descontoEmpate,1) : (pos===0?'—':'')].forEach(function(x){ var td=el('td',x,'n'); tr.appendChild(td); });
    t.appendChild(tr);
  });
  w.appendChild(t); res.appendChild(w);
  res.appendChild(el('p','"Preço cotado" é o total das propostas como vieram. "Total pago" soma CBS e IBS quando o preço veio sem tributos: é o que sai do caixa. "Custo real" é o total pago menos o crédito que sua empresa recupera. "Desconto para empatar" é quanto a proposta precisaria baixar para igualar a 1ª colocada.','muted'));

  // Item a item
  var h3=el('h3','Item a item: custo real de cada proposta'); h3.style.marginTop='22px'; res.appendChild(h3);
  var w2=el('div',null,'tbl'), t2=el('table'), h2=el('tr'); h2.appendChild(el('th','Item'));
  fs.forEach(function(f){ var th=el('th',f.nome,'n'); h2.appendChild(th); }); t2.appendChild(h2);
  a.itens.forEach(function(it,i){
    var tr=el('tr'); var nome=(it.descricao||'Item '+it.numero)+' · '+it.codigo; var td=el('td',nome);
    if(it.estado!=='ok'){ td.appendChild(el('div',it.erro,'muted')); }
    else if(it.possivelReducao){ td.appendChild(el('div','Pode ter redução: '+it.possivelReducao[0].descricao,'muted')); }
    tr.appendChild(td);
    var win=a.porItem[i];
    fs.forEach(function(f){ var c=f.celulas[i]; var td2=el('td', c? F.brl(c.liquido) : '—','n'); if(win&&c&&win.fornecedor===f.indice){ td2.style.fontWeight='700'; td2.style.background='#effaf3'; } tr.appendChild(td2); });
    t2.appendChild(tr);
  });
  w2.appendChild(t2); res.appendChild(w2);
  if(r.compraDividida!=null && r.economiaCompraDividida>0.005) res.appendChild(el('div','Comprando cada item da proposta com melhor custo real (em verde), o total cai para '+F.brl(r.compraDividida)+', '+F.brl(r.economiaCompraDividida)+' a menos que a melhor proposta inteira. Vale considerar o frete e o pedido mínimo de cada fornecedor.','info ok'));
  var pm=a.premissas; var nota=el('p','Premissas de 2027: CBS '+F.pct(pm.cbs,2)+', IBS '+F.pct(pm.ibsUF+pm.ibsMun,2)+'; parcela do Simples '+F.pct(pm.simplesBens,2)+' (produtos) e '+F.pct(pm.simplesServicos,2)+' (serviços). Destino '+a.uf+'. Motor da Receita '+(a.motor? a.motor.versaoApp+' (base '+a.motor.versaoDb+')':'')+'.','muted'); nota.style.marginTop='16px'; res.appendChild(nota);
  var pr=el('button','Imprimir ou salvar em PDF','btn sec noprint'); pr.type='button'; pr.style.maxWidth='280px'; pr.addEventListener('click',function(){ window.print(); }); res.appendChild(pr);

  F.captura(res,{ ferramenta:FERRAMENTA, titulo:'Baixe o mapa comparativo', botao:'Baixar o mapa (Excel)',
    texto:'O mapa completo, item a item, com preço cotado, tributos, crédito e custo real de cada proposta, pronto para anexar ao processo de compra.',
    resumo:function(){ return FERRAMENTA+': '+r.itens+' itens, '+r.fornecedores+' propostas; melhor custo real '+(best?best.nome+' ('+F.brl0(best.custoLiquido)+')':'—')+(r.inverteu?'; a de menor valor a pagar ('+face.nome+') perde por '+F.brl0(r.diferencaInversao):'')+(r.economiaCompraDividida>0?'; compra dividida economiza '+F.brl0(r.economiaCompraDividida):'')+'.'; },
    depois:baixar });
  F.cta(res,'Esse mapa, automático, em cada cotação','No Vendor Management, os fornecedores respondem pelo portal e o mapa de propostas já chega ranqueado, com critérios qualitativos com peso, várias rodadas e compra dividida.', FERRAMENTA);
  res.scrollIntoView({behavior:'smooth',block:'start'});
}

function baixar(){
  var a=analise; if(!a) return;
  var fs=a.fornecedores, cab=['Item','NCM/NBS','Quantidade','Alíquota CBS+IBS (%)'];
  fs.forEach(function(f){ cab.push(f.nome+' — total pago (R$)', f.nome+' — crédito (R$)', f.nome+' — custo real (R$)'); });
  cab.push('Melhor custo real');
  var linhas=[cab];
  a.itens.forEach(function(it,i){ var l=[it.descricao||('Item '+it.numero), it.codigo, it.quantidade, it.aliquotaEfetiva==null?'':it.aliquotaEfetiva]; fs.forEach(function(f){ var c=f.celulas[i]; l.push(c?c.pago:'', c?c.credito:'', c?c.liquido:''); }); var w=a.porItem[i]; l.push(w? fs[w.fornecedor].nome : ''); linhas.push(l); });
  var tot=['Total','','','']; fs.forEach(function(f){ tot.push(f.totalPago,f.credito,f.custoLiquido); }); tot.push(a.resumo.vencedorCustoReal!=null? fs[a.resumo.vencedorCustoReal].nome : ''); linhas.push(tot);
  linhas.push([]); linhas.push(['Proposta','Regime','Preço cotado (R$)','Total pago (R$)','Crédito (R$)','Custo real (R$)','Desconto para empatar (%)','Itens cotados']);
  fs.forEach(function(f){ linhas.push([f.nome, F.REGIMES[f.regime]||f.regime, f.totalCotado, f.totalPago, f.credito, f.custoLiquido, f.descontoEmpate, f.cotados]); });
  F.baixarCSV('mapa-de-cotacoes-'+new Date().toISOString().slice(0,10)+'.csv', linhas);
}
})();
