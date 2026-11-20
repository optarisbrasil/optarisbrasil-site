/* Seus fornecedores na Reforma Tributária — lê a planilha no navegador, envia ao serviço só
   código, valor e regime de cada linha e mostra crédito recuperável e crédito perdido por fornecedor. */
(function(){
'use strict';
var F = window.Ferramentas, $ = F.$, el = F.el;
var LIMITE = 500;
var FERRAMENTA = 'Fornecedores na Reforma';
var estado = { itens: [], total: 0, origem: '', analise: null };

var MAPA = {
  cClassTrib: [/cclasstrib/, /class\.? ?trib/, /classificacao tributaria/],
  cnpj: [/cnpj/],
  regime: [/regime/, /simples/, /\bcrt\b/, /enquadramento/],
  codigo: [/ncm/, /nbs/, /classificacao fiscal/, /codigo fiscal/],
  valor: [/valor/, /total/, /montante/, /gasto/, /^r\$/],
  descricao: [/descri/, /^itens?$/, /^produto/, /^servico/, /material/],
  fornecedor: [/fornecedor/, /razao social/, /^nome/, /emitente/, /prestador/],
};
var ORDEM = ['fornecedor','cnpj','regime','codigo','descricao','valor','cClassTrib'];

var EXEMPLO = [
  ['Fornecedor','CNPJ','Regime do fornecedor','NCM ou NBS','Descrição','Valor pago (R$)'],
  ['Siderúrgica Paulista S.A.','','Regime regular','72142000','Barras de aço','1.250.000'],
  ['Embalagens Vale Ltda','','Simples Nacional','48191000','Caixas de papelão','186.000'],
  ['Embalagens Vale Ltda','','Simples Nacional','39232190','Sacos plásticos','42.000'],
  ['Transportadora Rota Sul','','Regime regular','105011220','Frete rodoviário','310.000'],
  ['Manutenção Industrial MK','','Simples Nacional','120015000','Manutenção de máquinas','228.000'],
  ['Paletes Madeira Forte ME','','Simples Nacional','44152000','Paletes de madeira','97.000'],
  ['Distribuidora Química Brasil','','Lucro Real','29023000','Tolueno (solvente)','415.000'],
  ['Papelaria Central','','MEI','48025610','Papel A4','12.400'],
  ['Consultoria Fiscal Prisma','','Simples Nacional','113031000','Consultoria tributária','144.000'],
  ['Limpeza Total Serviços','','','118031000','Limpeza das instalações','96.000'],
  ['Cerealista Bom Grão','','Regime regular','10063021','Arroz para o refeitório','38.000'],
  ['Tech Parts Comércio','','','84713012','Notebooks','264.000'],
];

function lerLinhas(linhas, origem){
  var m = F.mapear(linhas, MAPA, ORDEM), c = m.colunas;
  var itens = m.linhas.map(function(l, i){
    function v(k){ return c[k]==null ? '' : l[c[k]]; }
    return { linha: m.linhaInicial + i, fornecedor: String(v('fornecedor')).trim(), cnpj: String(v('cnpj')).trim(), regime: String(v('regime')).trim(),
      codigo: String(v('codigo')).replace(/\D/g,''), descricao: String(v('descricao')).trim(), valor: F.num(v('valor')), cClassTrib: String(v('cClassTrib')).replace(/\D/g,'') };
  }).filter(function(it){ return it.fornecedor || it.codigo || it.valor; });
  estado.itens = itens; estado.total = itens.length; estado.origem = origem;
  mostrarLeitura(m);
}

function mostrarLeitura(m){
  var box = $('leitura'); box.textContent = '';
  var its = estado.itens;
  if(!its.length){ box.appendChild(el('div','Não encontramos linhas com dados. Confira se a planilha tem as colunas do modelo.','info err')); $('go').disabled = true; return; }
  var faltam = ['fornecedor','codigo','valor'].filter(function(k){ return m.colunas[k]==null; });
  var semCodigo = its.filter(function(i){ return !/^\d{8,9}$/.test(i.codigo); }).length;
  var semValor = its.filter(function(i){ return !(i.valor>0); }).length;
  var forn = {}; its.forEach(function(i){ forn[F.norm(i.fornecedor)]=1; });
  var soma = its.reduce(function(s,i){ return s+(i.valor>0?i.valor:0); },0);
  var ok = el('div',null,'info ok');
  ok.appendChild(el('b', its.length.toLocaleString('pt-BR')+' linhas lidas'));
  ok.appendChild(document.createTextNode(' de '+estado.origem+': '+Object.keys(forn).length.toLocaleString('pt-BR')+' fornecedores, '+F.brl0(soma)+' em compras.'));
  box.appendChild(ok);
  if(faltam.length){ box.appendChild(el('div','Não achamos a coluna de '+faltam.map(function(k){ return {fornecedor:'fornecedor',codigo:'NCM/NBS',valor:'valor'}[k]; }).join(', ')+'. Usamos a ordem do modelo; confira o resultado ou ajuste os títulos das colunas.','info warn')); }
  if(semCodigo||semValor){ box.appendChild(el('div',(semCodigo?semCodigo+' linha(s) sem NCM (8 dígitos) ou NBS (9 dígitos)':'')+(semCodigo&&semValor?' e ':'')+(semValor?semValor+' sem valor':'')+': elas aparecem no resultado como não calculadas.','info warn')); }
  if(its.length>LIMITE){ box.appendChild(el('div','O arquivo tem '+its.length.toLocaleString('pt-BR')+' linhas. A análise na hora considera as '+LIMITE+' primeiras; para o arquivo inteiro, fale com a nossa equipe no fim do resultado.','info warn')); }
  // prévia das 4 primeiras linhas, como foram entendidas
  var t = el('table'), h = el('tr'); ['Linha','Fornecedor','Regime','NCM/NBS','Valor'].forEach(function(x,i){ var th=el('th',x); if(i===4) th.className='n'; h.appendChild(th); }); t.appendChild(h);
  its.slice(0,4).forEach(function(i){ var tr=el('tr'); [String(i.linha), i.fornecedor||'—', i.regime||'(não informado)', i.codigo||'—', i.valor>0?F.brl(i.valor):'—'].forEach(function(x,k){ var td=el('td',x); if(k===4) td.className='n'; tr.appendChild(td); }); t.appendChild(tr); });
  var d = el('details'); d.appendChild(el('summary','Como lemos a planilha')); var w=el('div',null,'tbl'); w.appendChild(t); d.appendChild(w); box.appendChild(d);
  $('go').disabled = false;
}

function falhaLeitura(e){ var box=$('leitura'); box.textContent=''; box.appendChild(el('div', e.message || 'Não foi possível ler o arquivo.','info err')); $('go').disabled=true; }

function abrirArquivo(file){
  if(!file) return;
  if(file.size > 15*1024*1024) return falhaLeitura(new Error('Arquivo grande demais (máximo 15 MB).'));
  $('leitura').textContent=''; $('leitura').appendChild(el('div','Lendo '+file.name+'…','info'));
  F.lerArquivo(file).then(function(l){ lerLinhas(l, file.name); F.evento('ferramenta_planilha',{ferramenta:FERRAMENTA,linhas:estado.total}); }).catch(falhaLeitura);
}

$('arq').addEventListener('change', function(){ abrirArquivo(this.files[0]); });
var drop = $('drop');
['dragenter','dragover'].forEach(function(t){ drop.addEventListener(t,function(e){ e.preventDefault(); drop.classList.add('over'); }); });
['dragleave','drop'].forEach(function(t){ drop.addEventListener(t,function(e){ e.preventDefault(); drop.classList.remove('over'); }); });
drop.addEventListener('drop', function(e){ var f=e.dataTransfer&&e.dataTransfer.files[0]; abrirArquivo(f); });
$('modelo').addEventListener('click', function(e){ e.stopPropagation(); F.evento('ferramenta_modelo',{ferramenta:FERRAMENTA}); });
$('usarCola').addEventListener('click', function(){ var t=$('cola').value; if(!t.trim()) return falhaLeitura(new Error('Cole as linhas copiadas do Excel, com o cabeçalho.')); lerLinhas(F.lerTexto(t),'as linhas coladas'); });
$('exemplo').addEventListener('click', function(){ lerLinhas(EXEMPLO,'o exemplo'); F.evento('ferramenta_exemplo',{ferramenta:FERRAMENTA}); });

F.destino($('uf'), $('mun'));

$('go').addEventListener('click', function(){
  var btn=this, res=$('res');
  function erro(msg){ res.hidden=false; res.textContent=''; res.appendChild(el('h2','Resultado')); res.appendChild(el('div',msg,'info err')); res.scrollIntoView({behavior:'smooth',block:'nearest'}); }
  if(!estado.itens.length) return erro('Escolha a planilha ou cole as linhas primeiro.');
  if(!$('uf').value || !$('mun').value) return erro('Escolha a UF e o município de destino.');
  var premissas;
  try{ premissas = F.lerPremissas({cbs:'pcbs',ibsUF:'pibs',ibsMun:'pmun',simplesBens:'psb',simplesServicos:'pss',mei:'pmei'}); }catch(e){ return erro(e.message); }
  var toma = document.querySelector('input[name=cred]:checked').value==='1';
  var corpo = { data:'2027-01-01', uf:$('uf').value, municipio:$('mun').value, compradorTomaCredito:toma, premissas:premissas,
    itens: estado.itens.slice(0,LIMITE).map(function(i){ return {linha:i.linha, fornecedor:i.fornecedor, cnpj:i.cnpj, regime:i.regime, codigo:i.codigo, descricao:i.descricao, valor:i.valor>0?i.valor:0, cClassTrib:i.cClassTrib}; }) };
  btn.disabled=true; btn.textContent='Analisando…';
  F.post('/carteira', corpo).then(function(a){ estado.analise=a; render(a); F.evento('ferramenta_analise',{ferramenta:FERRAMENTA,linhas:a.resumo.itens}); if(window.fbq) fbq('trackCustom','FerramentaAnalise',{ferramenta:FERRAMENTA}); })
    .catch(function(e){ erro(e.status===429 ? 'Muitas análises seguidas. Aguarde um minuto e tente de novo.' : (e.message||'Não foi possível analisar agora.')); })
    .then(function(){ btn.disabled=false; btn.textContent='Analisar meus fornecedores'; });
});

function kpi(cont, rot, val, sub, cls){ var b=el('div',null,'box'+(cls?' '+cls:'')); b.appendChild(el('small',rot)); b.appendChild(el('strong',val)); if(sub) b.appendChild(el('em',sub)); cont.appendChild(b); }
function tabela(cab, linhas, numCols, classe){
  var w=el('div',null,'tbl'), t=el('table'), h=el('tr');
  cab.forEach(function(x,i){ var th=el('th',x); if(numCols.indexOf(i)>-1) th.className='n'; h.appendChild(th); }); t.appendChild(h);
  linhas.forEach(function(l){ var tr=el('tr'); if(classe) { var c=classe(l); if(c) tr.className=c; } l.cel.forEach(function(x,i){ var td=el('td'); if(x instanceof Node) td.appendChild(x); else td.textContent=x; if(numCols.indexOf(i)>-1) td.className='n'; tr.appendChild(td); }); t.appendChild(tr); });
  w.appendChild(t); return w;
}

function render(a){
  var res=$('res'), r=a.resumo, toma=a.compradorTomaCredito; res.hidden=false; res.textContent='';
  res.appendChild(el('h2','Resultado da análise'));
  var lead=el('p',null,'lead');
  var simples = r.gastoPorRegime.simples + r.gastoPorRegime.mei;
  if(!toma){
    lead.textContent='Como sua empresa não toma crédito de CBS e IBS, o regime do fornecedor não muda o custo dos tributos para você. Abaixo estão os tributos estimados sobre as suas compras em 2027.';
  } else if(r.creditoPerdido>0){
    lead.appendChild(document.createTextNode('Em 2027, sua empresa recupera '+F.brl0(r.creditoRecuperavel)+' de crédito de CBS e IBS sobre '+F.brl0(r.gastoCalculado)+' em compras. Os fornecedores do Simples Nacional e MEI ('+F.pct(r.participacaoSimplesOuMei,1)+' do valor) geram '));
    lead.appendChild(el('b',F.brl0(r.creditoPerdido)+' a menos de crédito'));
    lead.appendChild(document.createTextNode(' do que o mesmo valor pago a fornecedores do regime regular.'));
  } else {
    lead.textContent='Em 2027, sua empresa recupera '+F.brl0(r.creditoRecuperavel)+' de crédito de CBS e IBS sobre '+F.brl0(r.gastoCalculado)+' em compras. Nenhum fornecedor da lista foi informado como Simples Nacional ou MEI.';
  }
  res.appendChild(lead);
  var k=el('div',null,'kpis');
  kpi(k,'Valor analisado',F.brl0(r.gastoCalculado), r.itensCalculados.toLocaleString('pt-BR')+' de '+r.itens.toLocaleString('pt-BR')+' linhas calculadas');
  kpi(k, toma?'Crédito recuperável':'Tributos estimados', F.brl0(toma?r.creditoRecuperavel:r.tributos), 'CBS e IBS em 2027', 'big');
  kpi(k,'Crédito perdido com Simples e MEI',F.brl0(r.creditoPerdido), r.fornecedoresSimplesOuMei+' fornecedor(es), '+F.pct(r.participacaoSimplesOuMei,1)+' do valor', r.creditoPerdido>0?'alert':'');
  kpi(k,'Itens com possível redução',String(r.itensComPossivelReducao), r.itensComPossivelReducao? F.brl0(r.gastoComPossivelReducao)+' em compras':'nenhum encontrado');
  res.appendChild(k);
  if(toma && r.fornecedoresSemRegime){
    res.appendChild(el('div',r.fornecedoresSemRegime+' fornecedor(es), com '+F.brl0(r.gastoPorRegime.nao_sei)+' em compras, estão sem regime informado e foram calculados como regime regular. Se forem do Simples Nacional, o crédito perdido sobe até '+F.brl0(r.perdidoSeNaoInformadosForemSimples)+'. Vale confirmar o regime deles.','info warn'));
  }

  // Fornecedores
  var fs=a.fornecedores.filter(function(f){ return f.creditoPerdido>0 || f.perdidoSeSimples>0; });
  var lista = (fs.length? fs : a.fornecedores).slice(0,15);
  var h3=el('h3', fs.length? 'Fornecedores que mais pesam no custo':'Maiores fornecedores'); h3.style.marginTop='22px'; res.appendChild(h3);
  if(toma && fs.length) res.appendChild(el('p','"Crédito perdido" é quanto sua empresa recuperaria a mais se pagasse o mesmo valor a um fornecedor do regime regular. "Desconto para empatar" é a redução de preço que deixaria o custo líquido igual.','muted'));
  res.appendChild(tabela(['Fornecedor','Regime','Valor pago','Crédito recuperável','Crédito perdido','Desconto para empatar'],
    lista.map(function(f){ return {f:f, cel:[f.nome, F.tagRegime(f.regime), F.brl(f.gasto), F.brl(f.credito), f.creditoPerdido? F.brl(f.creditoPerdido) : (f.perdidoSeSimples? 'até '+F.brl(f.perdidoSeSimples)+' se for do Simples':'—'), f.descontoEmpate? F.pct(f.descontoEmpate,1):'—']}; }),
    [2,3,4,5], function(l){ return l.f.creditoPerdido>0?'lose':''; }));
  if(a.fornecedores.length>lista.length) res.appendChild(el('p','Mostrando '+lista.length+' de '+a.fornecedores.length+' fornecedores. O relatório completo traz todos.','muted'));

  // Possível redução
  var red=a.itens.filter(function(i){ return i.possivelReducao; });
  if(red.length){
    var h=el('h3','Itens que podem ter alíquota reduzida'); h.style.marginTop='22px'; res.appendChild(h);
    res.appendChild(el('p','No cadastro oficial da Receita, estes códigos estão ligados a regimes com redução de CBS e IBS. O cálculo acima usou a regra geral; se a sua compra se enquadrar, o tributo e o crédito são menores. Confirme com o fornecedor e o contador.','muted'));
    res.appendChild(tabela(['Linha','Item','Fornecedor','Valor','Possível enquadramento'],
      red.slice(0,10).map(function(i){ var p=i.possivelReducao[0]; return {cel:[String(i.linha), (i.descricao? i.descricao+' · ':'')+i.codigo, i.fornecedor, F.brl(i.valor), p.descricao+' (cClassTrib '+p.cClassTrib+', redução de '+p.reducaoCbs+'%)']}; }), [3]));
  }

  // Linhas não calculadas
  var errs=a.itens.filter(function(i){ return i.estado!=='ok'; });
  if(errs.length){
    var d=el('details'); d.appendChild(el('summary',errs.length+' linha(s) não calculada(s)'));
    d.appendChild(tabela(['Linha','Fornecedor','Código','Motivo'], errs.slice(0,50).map(function(i){ return {cel:[String(i.linha), i.fornecedor, i.codigo||'—', i.erro]}; }), []));
    res.appendChild(d);
  }
  var pm=a.premissas, nota=el('p','Premissas de 2027: CBS '+F.pct(pm.cbs,2)+', IBS '+F.pct(pm.ibsUF+pm.ibsMun,2)+'; parcela do Simples '+F.pct(pm.simplesBens,2)+' (produtos) e '+F.pct(pm.simplesServicos,2)+' (serviços). Motor da Receita '+(a.motor? a.motor.versaoApp+' (base '+a.motor.versaoDb+')':'')+'.','muted');
  nota.style.marginTop='16px'; res.appendChild(nota);
  var pr=el('button','Imprimir ou salvar em PDF','btn sec noprint'); pr.type='button'; pr.style.maxWidth='280px'; pr.addEventListener('click',function(){ window.print(); }); res.appendChild(pr);

  if(estado.total>LIMITE) res.appendChild(el('div','Analisamos as '+LIMITE+' primeiras de '+estado.total.toLocaleString('pt-BR')+' linhas. Para analisar o arquivo inteiro, deixe seu e-mail abaixo e mande o arquivo para comercial@optarisbrasil.com: nossa equipe processa e devolve o resultado.','info warn'));
  F.captura(res, { ferramenta:FERRAMENTA, titulo:'Baixe o relatório completo', botao:'Baixar o relatório (Excel)',
    texto:'Todos os fornecedores e todas as linhas, com crédito recuperável, crédito perdido e desconto para empatar, prontos para abrir no Excel e levar à negociação.',
    resumo:function(){ return FERRAMENTA+': '+r.itens+' linhas'+(estado.total>LIMITE?' (arquivo com '+estado.total+')':'')+', '+r.fornecedores+' fornecedores, '+F.brl0(r.gastoCalculado)+' analisados; crédito recuperável '+F.brl0(r.creditoRecuperavel)+'; crédito perdido com Simples/MEI '+F.brl0(r.creditoPerdido)+' ('+F.pct(r.participacaoSimplesOuMei,1)+' do valor). Destino '+a.uf+'.'; },
    depois:baixar });
  F.cta(res,'O regime de cada fornecedor no cadastro, o custo real em cada cotação','No Vendor Management, a homologação guarda o regime tributário do fornecedor e o mapa de propostas compara cotações pelo custo depois do crédito, com critérios de peso, rodadas e compra dividida.', FERRAMENTA);
  res.scrollIntoView({behavior:'smooth',block:'start'});
}

function baixar(){
  var a=estado.analise; if(!a) return;
  var d=new Date().toISOString().slice(0,10);
  F.baixarCSV('fornecedores-na-reforma-'+d+'-fornecedores.csv', [['Fornecedor','CNPJ','Regime','Valor pago (R$)','Crédito recuperável (R$)','Crédito perdido (R$)','Desconto para empatar (%)','Crédito perdido se for do Simples (R$)','Linhas']].concat(
    a.fornecedores.map(function(f){ return [f.nome,f.cnpj,F.REGIMES[f.regime]||f.regime,f.gasto,f.credito,f.creditoPerdido,f.descontoEmpate,f.perdidoSeSimples,f.itens]; })));
  setTimeout(function(){
    F.baixarCSV('fornecedores-na-reforma-'+d+'-itens.csv', [['Linha','Fornecedor','CNPJ','Regime','NCM/NBS','Descrição','Valor pago (R$)','Alíquota efetiva CBS+IBS (%)','Tributos (R$)','Crédito (R$)','Crédito perdido (R$)','Custo líquido (R$)','Desconto para empatar (%)','Possível redução','Situação']].concat(
      a.itens.map(function(i){ var p=i.possivelReducao&&i.possivelReducao[0]; return [i.linha,i.fornecedor,i.cnpj,F.REGIMES[i.regime]||i.regime,i.codigo,i.descricao,i.valor,i.aliquotaEfetiva,i.tributos,i.credito,i.creditoPerdido,i.custoLiquido,i.descontoEmpate,p? p.descricao+' (cClassTrib '+p.cClassTrib+', -'+p.reducaoCbs+'%)':'', i.estado==='ok'?'Calculado':i.erro]; })));
  }, 400);
}
})();
