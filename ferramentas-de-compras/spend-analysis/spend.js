/* Raio-x do gasto (Agente de Spend Analysis) — lê o relatório no navegador, envia descrição,
   fornecedor e valor; mostra gasto por categoria, curva ABC e oportunidades. */
(function(){
'use strict';
var F = window.Ferramentas, $ = F.$, el = F.el;
var LIMITE = 5000, MAX_DESCRICOES = 300, FERRAMENTA = 'Spend Analysis';
var estado = { linhas: [], total: 0, origem: '', analise: null };

var MAPA = {
  valor: [/valor/, /total/, /montante/, /gasto/, /^r\$/, /preco total/],
  fornecedor: [/fornecedor/, /razao social/, /emitente/, /prestador/, /^nome/],
  descricao: [/descri/, /^itens?$/, /produto/, /servico/, /material/, /historico/],
};
var ORDEM = ['descricao','fornecedor','valor'];

var EXEMPLO = (function(){
  var l=[['Descrição do item','Fornecedor','Valor (R$)']];
  function add(d,f,v){ l.push([d,f,v]); }
  add('Bobina de aço laminado a frio 1,5 mm','Usina Siderúrgica Paulista',1480000);
  add('Chapa de aço galvanizado 0,9 mm','Usina Siderúrgica Paulista',612000);
  add('Resina de polipropileno homopolímero','Petroquímica Sul',388000);
  ['Caixa de papelão ondulado 40x30x20','Caixa de papelão 60x40x40','Filme stretch 50 cm','Fita adesiva transparente 48 mm','Cantoneira de papelão','Saco plástico 60x90'].forEach(function(d,i){
    ['Embalagens Vale','Papelão Forte','Embalaminas','Box Center Embalagens','Rio Pack','PlastiFlex'].forEach(function(f,j){ if((i+j)%2===0) add(d,f,8000+((i*7+j*13)%9)*2100); });
  });
  ['Luva nitrílica','Óculos de proteção incolor','Protetor auricular plug','Botina de segurança bico composite','Uniforme operacional'].forEach(function(d,i){
    ['EPI Brasil','Segura Mais','Protege Já','Uniformes Ideal'].forEach(function(f,j){ if((i+j)%2===1) add(d,f,3200+((i*5+j*11)%7)*900); });
  });
  add('Frete rodoviário de matéria-prima (carga fechada)','Transportadora Rota Sul',412000);
  add('Frete de distribuição para clientes','LogBrasil Transportes',356000);
  add('Coleta e entrega fracionada','Expresso Rápido',48000);
  add('Manutenção preventiva das prensas','Manutenção Industrial MK',228000);
  add('Reparo de motores elétricos','Rebobinadora Central',64000);
  add('Rolamento 6205 2RS','Rolamentos e Cia',18400);
  add('Correia em V A-48','Rolamentos e Cia',7200);
  add('Óleo hidráulico ISO 68 (tambor 200 L)','Lubrificantes Norte',42000);
  add('Serviço de limpeza predial e industrial','Limpeza Total Serviços',196000);
  add('Vigilância patrimonial 24 horas','Segurança Alfa',288000);
  add('Refeições do restaurante industrial','Nutri Refeições',344000);
  add('Licenças de ERP (manutenção anual)','Software Gestão S.A.',186000);
  add('Notebook i7 16 GB','Tech Parts Comércio',96000);
  add('Link de internet dedicado 500 Mbps','Telecom Fibra',38400);
  add('Consultoria tributária para a reforma','Consultoria Fiscal Prisma',144000);
  add('Auditoria das demonstrações financeiras','Auditores Associados',120000);
  add('Energia elétrica','Distribuidora de Energia',920000);
  add('Locação de empilhadeiras','Loca Máquinas',156000);
  add('Seguro patrimonial','Seguradora Brasil',98000);
  add('Papel A4 75 g (caixa)','Papelaria Central',12400);
  add('Café em grãos 1 kg','Café da Serra',9600);
  add('Passagens aéreas','Agência Viaje Bem',64000);
  return l;
})();

function lerLinhas(linhas, origem){
  var m = F.mapear(linhas, MAPA, ORDEM), c = m.colunas;
  var out = m.linhas.map(function(l){ function v(k){ return c[k]==null ? '' : l[c[k]]; }
    return { descricao: String(v('descricao')).trim(), fornecedor: String(v('fornecedor')).trim(), valor: F.num(v('valor')) }; })
    .filter(function(x){ return x.descricao || x.fornecedor || x.valor; });
  estado.linhas = out; estado.total = out.length; estado.origem = origem;
  var box=$('leitura'); box.textContent='';
  if(!out.length){ box.appendChild(el('div','Não encontramos linhas com dados. Confira se o relatório tem descrição, fornecedor e valor.','info err')); $('go').disabled=true; return; }
  var faltam = ['descricao','fornecedor','valor'].filter(function(k){ return c[k]==null; });
  var validas = out.filter(function(x){ return x.descricao && x.valor>0; });
  var soma = validas.reduce(function(s,x){ return s+x.valor; },0);
  var forn = {}; validas.forEach(function(x){ forn[F.norm(x.fornecedor)]=1; });
  var ok=el('div',null,'info ok'); ok.appendChild(el('b',out.length.toLocaleString('pt-BR')+' linhas lidas')); ok.appendChild(document.createTextNode(' '+origem+': '+Object.keys(forn).length.toLocaleString('pt-BR')+' fornecedores, '+F.brl0(soma)+' em compras.')); box.appendChild(ok);
  if(faltam.length) box.appendChild(el('div','Não achamos a coluna de '+faltam.join(', ')+'. Usamos a ordem descrição, fornecedor, valor; confira ou ajuste os títulos.','info warn'));
  if(validas.length<out.length) box.appendChild(el('div',(out.length-validas.length)+' linha(s) sem descrição ou sem valor ficam de fora.','info warn'));
  if(out.length>LIMITE) box.appendChild(el('div','O relatório tem '+out.length.toLocaleString('pt-BR')+' linhas. A análise na hora considera as '+LIMITE.toLocaleString('pt-BR')+' primeiras.','info warn'));
  var unicas={}; validas.forEach(function(x){ unicas[F.norm(x.descricao)]=1; }); var nu=Object.keys(unicas).length;
  if(nu>MAX_DESCRICOES) box.appendChild(el('div','O relatório tem '+nu.toLocaleString('pt-BR')+' descrições diferentes. Na análise na hora, o agente classifica as '+MAX_DESCRICOES+' de maior valor (leva cerca de 30 segundos); as demais entram no total, nos fornecedores e na curva ABC como "não classificado". Para classificar o arquivo inteiro, fale com a nossa equipe no fim do resultado.','info warn'));
  $('go').disabled = !validas.length;
}
function falhaLeitura(e){ var b=$('leitura'); b.textContent=''; b.appendChild(el('div',e.message||'Não foi possível ler o arquivo.','info err')); $('go').disabled=true; }
function abrir(file){ if(!file) return; if(file.size>25*1024*1024) return falhaLeitura(new Error('Arquivo grande demais (máximo 25 MB).')); $('leitura').textContent=''; $('leitura').appendChild(el('div','Lendo '+file.name+'…','info')); F.lerArquivo(file).then(function(l){ lerLinhas(l,'do arquivo '+file.name); F.evento('ferramenta_planilha',{ferramenta:FERRAMENTA,linhas:estado.total}); }).catch(falhaLeitura); }
$('arq').addEventListener('change',function(){ abrir(this.files[0]); });
var drop=$('drop');
['dragenter','dragover'].forEach(function(t){ drop.addEventListener(t,function(e){ e.preventDefault(); drop.classList.add('over'); }); });
['dragleave','drop'].forEach(function(t){ drop.addEventListener(t,function(e){ e.preventDefault(); drop.classList.remove('over'); }); });
drop.addEventListener('drop',function(e){ abrir(e.dataTransfer&&e.dataTransfer.files[0]); });
$('usarCola').addEventListener('click',function(){ var t=$('cola').value; if(!t.trim()) return falhaLeitura(new Error('Cole as linhas copiadas do Excel, com a linha de títulos.')); lerLinhas(F.lerTexto(t),'das linhas coladas'); });
$('exemplo').addEventListener('click',function(){ lerLinhas(EXEMPLO,'do exemplo'); F.evento('ferramenta_exemplo',{ferramenta:FERRAMENTA}); });

$('go').addEventListener('click',function(){
  var btn=this, res=$('res');
  function erro(m){ res.hidden=false; res.textContent=''; res.appendChild(el('h2','Resultado')); res.appendChild(el('div',m,'info err')); res.scrollIntoView({behavior:'smooth',block:'nearest'}); }
  var linhas = estado.linhas.filter(function(x){ return x.descricao && x.valor>0; }).slice(0,LIMITE);
  if(!linhas.length) return erro('Escolha o relatório ou cole as linhas primeiro.');
  btn.disabled=true; btn.textContent='Analisando… pode levar até um minuto';
  F.post('/spend',{linhas:linhas}).then(function(a){ estado.analise=a; render(a); F.evento('ferramenta_analise',{ferramenta:FERRAMENTA,linhas:a.resumo.linhas}); if(window.fbq) fbq('trackCustom','FerramentaAnalise',{ferramenta:FERRAMENTA}); })
    .catch(function(e){ erro(e.message||'Não foi possível analisar agora.'); })
    .then(function(){ btn.disabled=false; btn.textContent='Fazer o raio-x do gasto'; });
});

function kpi(c,r,v,s,cls){ var b=el('div',null,'box'+(cls?' '+cls:'')); b.appendChild(el('small',r)); b.appendChild(el('strong',v)); if(s) b.appendChild(el('em',s)); c.appendChild(b); }
function tabela(cab, linhas, nums){
  var w=el('div',null,'tbl'), t=el('table'), h=el('tr'); cab.forEach(function(x,i){ var th=el('th',x); if(nums.indexOf(i)>-1) th.className='n'; h.appendChild(th); }); t.appendChild(h);
  linhas.forEach(function(l){ var tr=el('tr'); l.forEach(function(x,i){ var td=el('td'); if(x instanceof Node) td.appendChild(x); else td.textContent=x; if(nums.indexOf(i)>-1) td.className='n'; tr.appendChild(td); }); t.appendChild(tr); });
  w.appendChild(t); return w;
}
var OPORT = { consolidar:['Consolidar','s'], fornecedor_unico:['Fornecedor único','s'], cauda:['Cauda longa','q'] };

function render(a){
  var res=$('res'), r=a.resumo; res.hidden=false; res.textContent='';
  res.appendChild(el('h2','Raio-x do seu gasto'));
  var lead=el('p',null,'lead');
  lead.appendChild(document.createTextNode(F.brl0(r.gastoTotal)+' em compras, com '+r.fornecedores.toLocaleString('pt-BR')+' fornecedores em '+r.categorias+' categorias. Os 10 maiores fornecedores concentram '+F.pct(r.participacaoTop10,1)+' do gasto'));
  if(r.abc.C.fornecedores) { lead.appendChild(document.createTextNode(', e ')); lead.appendChild(el('b',r.abc.C.fornecedores.toLocaleString('pt-BR')+' fornecedores somam só '+F.pct(r.abc.C.participacao,1))); lead.appendChild(document.createTextNode(' do valor.')); } else lead.appendChild(document.createTextNode('.'));
  res.appendChild(lead);
  var k=el('div',null,'kpis');
  kpi(k,'Gasto analisado',F.brl0(r.gastoTotal),r.linhas.toLocaleString('pt-BR')+' linhas','big');
  kpi(k,'Fornecedores',r.fornecedores.toLocaleString('pt-BR'),'classe A: '+r.abc.A.fornecedores+' · B: '+r.abc.B.fornecedores+' · C: '+r.abc.C.fornecedores);
  kpi(k,'Categorias',String(r.categorias), r.descricoesUnicas.toLocaleString('pt-BR')+' itens diferentes');
  kpi(k,'10 maiores fornecedores',F.pct(r.participacaoTop10,1),'do gasto total', r.participacaoTop10>=80?'alert':'');
  res.appendChild(k);
  if(r.descricoesClassificadas<r.descricoesUnicas) res.appendChild(el('div','O relatório tem '+r.descricoesUnicas.toLocaleString('pt-BR')+' descrições diferentes; o agente classificou as '+r.descricoesClassificadas.toLocaleString('pt-BR')+' de maior valor. O restante ('+F.brl0(r.gastoNaoClassificado)+') aparece como "Não classificado".','info warn'));

  // Barras por categoria
  var h3=el('h3','Gasto por categoria'); h3.style.marginTop='22px'; res.appendChild(h3);
  var max = a.categorias.length ? a.categorias[0].gasto : 1, barras=el('div'); barras.style.margin='10px 0 6px';
  a.categorias.slice(0,12).forEach(function(c){
    var row=el('div'); row.style.cssText='display:grid;grid-template-columns:minmax(140px,280px) 1fr auto;gap:10px;align-items:center;margin:6px 0;font-size:14px';
    row.appendChild(el('span',c.categoria));
    var bg=el('div'); bg.style.cssText='background:#eef1f5;border-radius:4px;height:14px;overflow:hidden';
    var bar=el('div'); bar.style.cssText='height:100%;background:'+(c.oportunidade?'#e59a00':'#0496ff')+';width:'+Math.max(1,Math.round(c.gasto/max*100))+'%'; bg.appendChild(bar); row.appendChild(bg);
    var v=el('span',F.brl0(c.gasto)+' · '+F.pct(c.participacao,1)); v.style.cssText='white-space:nowrap;color:#26384f;font-variant-numeric:tabular-nums'; row.appendChild(v);
    barras.appendChild(row);
  });
  res.appendChild(barras);
  res.appendChild(el('p','Em laranja, categorias com oportunidade de consolidação, dependência de um fornecedor ou cauda longa.','muted'));

  // Oportunidades
  if(a.oportunidades.length){
    var h4=el('h3','Oportunidades'); h4.style.marginTop='22px'; res.appendChild(h4);
    var ul=el('ul'); ul.style.cssText='margin:8px 0 0;padding-left:20px';
    a.oportunidades.forEach(function(o){ var li=el('li'); li.style.margin='6px 0'; li.appendChild(el('b',o.tipo+': ')); li.appendChild(document.createTextNode(o.texto)); ul.appendChild(li); });
    res.appendChild(ul);
  }

  // Categorias
  var h5=el('h3','Categorias'); h5.style.marginTop='22px'; res.appendChild(h5);
  res.appendChild(tabela(['Categoria','Principais itens','Gasto','% do total','Fornecedores','Maior fornecedor','Sinal'],
    a.categorias.map(function(c){ var o=OPORT[c.oportunidade]; return [c.categoria, c.subcategorias.join(', '), F.brl(c.gasto), F.pct(c.participacao,1), String(c.fornecedores), c.maiorFornecedor+' ('+F.pct(c.participacaoMaior,0)+')', o? el('span',o[0],'tag '+o[1]) : '']; }), [2,3,4]));

  // Curva ABC
  var h6=el('h3','Curva ABC de fornecedores'); h6.style.marginTop='22px'; res.appendChild(h6);
  res.appendChild(tabela(['Classe','Fornecedores','Gasto','% do gasto'], ['A','B','C'].map(function(x){ var c=r.abc[x]; return ['Classe '+x, c.fornecedores.toLocaleString('pt-BR'), F.brl(c.gasto), F.pct(c.participacao,1)]; }), [1,2,3]));
  res.appendChild(tabela(['#','Fornecedor','Categoria principal','Gasto','%','Acumulado','Classe'], a.fornecedores.slice(0,15).map(function(f){ return [String(f.posicao), f.nome, f.categoriaPrincipal, F.brl(f.gasto), F.pct(f.participacao,1), F.pct(f.acumulado,1), f.classe]; }), [3,4,5]));
  if(a.fornecedores.length>15) res.appendChild(el('p','Mostrando 15 de '+a.fornecedores.length.toLocaleString('pt-BR')+' fornecedores. O relatório completo traz todos, com a categoria de cada linha.','muted'));
  var pr=el('button','Imprimir ou salvar em PDF','btn sec noprint'); pr.type='button'; pr.style.maxWidth='280px'; pr.addEventListener('click',function(){ window.print(); }); res.appendChild(pr);
  F.captura(res,{ ferramenta:FERRAMENTA, titulo:'Baixe o relatório completo', botao:'Baixar o relatório (Excel)',
    texto:'Todas as linhas com categoria e subcategoria, a curva ABC completa e o resumo por categoria, para abrir no Excel e montar o plano de categorias.',
    resumo:function(){ return FERRAMENTA+': '+r.linhas+' linhas, '+F.brl0(r.gastoTotal)+', '+r.fornecedores+' fornecedores, '+r.categorias+' categorias; top 10 = '+F.pct(r.participacaoTop10,1)+'; classe C = '+r.abc.C.fornecedores+' fornecedores ('+F.pct(r.abc.C.participacao,1)+').'; },
    depois:baixar });
  F.cta(res,'Esse raio-x, todo dia, com os seus pedidos reais','No Vendor Management, cada pedido nasce classificado, o gasto por categoria e por fornecedor fica atualizado e as oportunidades viram cotações no mesmo sistema.', FERRAMENTA);
  res.scrollIntoView({behavior:'smooth',block:'start'});
}

function baixar(){
  var a=estado.analise; if(!a) return; var d=new Date().toISOString().slice(0,10);
  F.baixarCSV('raio-x-do-gasto-'+d+'-linhas.csv',[['Descrição','Fornecedor','Valor (R$)','Categoria','Subcategoria']].concat(a.linhas.map(function(l){ return [l.descricao,l.fornecedor,l.valor,l.categoria,l.subcategoria]; })));
  setTimeout(function(){ F.baixarCSV('raio-x-do-gasto-'+d+'-fornecedores.csv',[['#','Fornecedor','Categoria principal','Gasto (R$)','% do gasto','% acumulado','Classe ABC']].concat(a.fornecedores.map(function(f){ return [f.posicao,f.nome,f.categoriaPrincipal,f.gasto,f.participacao,f.acumulado,f.classe]; }))); },400);
  setTimeout(function(){ F.baixarCSV('raio-x-do-gasto-'+d+'-categorias.csv',[['Categoria','Gasto (R$)','% do total','Fornecedores','Maior fornecedor','% do maior','Sinal']].concat(a.categorias.map(function(c){ return [c.categoria,c.gasto,c.participacao,c.fornecedores,c.maiorFornecedor,c.participacaoMaior,(OPORT[c.oportunidade]||[''])[0]]; }))); },800);
}
})();
