/* Buscador de fornecedores: simulação do sourcing do Vendor.
   A lista vem da base aberta do CNPJ (Receita Federal). A checagem de protestos e o convite são simulados:
   nenhuma consulta a cartório e nenhum e-mail a fornecedor. */
(function(){
'use strict';
var F = window.Ferramentas, $ = F.$, el = F.el;
var FERRAMENTA = 'Buscador de fornecedores', dados = null, sel = {}, convite = false;
var PASSO = (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) ? 0 : 450;
var MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
function tag(t, cls){ return el('span', t, 'tag' + (cls ? ' ' + cls : '')); }
function rolar(e, onde){ e.scrollIntoView({behavior: PASSO ? 'smooth' : 'auto', block: onde || 'start'}); }
function referencia(r){ var m = /^(\d{4})-(\d{2})$/.exec(r || ''); return m ? MESES[Number(m[2]) - 1] + ' de ' + m[1] : ''; }
function regiao(d){ var r = d.regiao; return r.municipio ? ('em ' + r.municipio + ' (' + r.uf + ')' + (r.ampliada ? ' e no restante do estado' : '')) : 'no estado de ' + r.uf; }

F.destino($('uf'), $('mun'));
$('exemplo').addEventListener('click', function(){
  $('prod').value = 'frascos e garrafas de plástico para envase';
  var u = $('uf'); if (!u.value) { u.value = 'SP'; u.dispatchEvent(new Event('change')); }
  F.evento('ferramenta_exemplo', {ferramenta: FERRAMENTA});
});

// ---- O que o agente faz, passo a passo
var TITULOS = ['Item identificado', 'Atividades de quem fornece', 'Empresas ativas na região', 'Cadastro na base da Receita Federal', 'Checagem de protestos simulada', 'Fornecedores selecionados'];
function iniciarPassos(){
  var box = $('passos'); box.hidden = false; box.textContent = '';
  box.appendChild(el('h2', 'O que o agente está fazendo'));
  var ol = el('ol', null, 'passos'), itens = [];
  TITULOS.forEach(function(t, i){ var li = el('li'), ic = el('span', '✓', 'ic'); ic.setAttribute('aria-hidden', 'true'); var w = el('div'), b = el('b', t), d = el('span', null, 'd'); d.hidden = true; w.appendChild(b); w.appendChild(d); li.appendChild(ic); li.appendChild(w); if (i === 0) li.className = 'run'; ol.appendChild(li); itens.push({li: li, b: b, d: d}); });
  box.appendChild(ol); rolar(box, 'nearest');
  return itens;
}
function concluirPassos(itens, d, fim){
  var n = d.fornecedores.length, ref = referencia(d.referencia);
  var det = [
    d.produto + (d.codigo ? ' (' + d.codigo + ')' : ''),
    d.atividades.map(function(a){ return 'CNAE ' + a.cnae + ', ' + a.descricao.toLowerCase(); }).join(' · '),
    d.total.toLocaleString('pt-BR') + (d.total === 1 ? ' empresa ' : ' empresas ') + regiao(d) + ', na base aberta do CNPJ',
    'Situação cadastral, data de abertura, porte, capital social e regime tributário' + (ref ? ' (base de ' + ref + ')' : ''),
    'Nesta demonstração não há consulta a cartórios',
    'Critérios: ' + d.criterios
  ];
  itens[5].b.textContent = n === 1 ? '1 fornecedor selecionado' : n + ' fornecedores selecionados';
  var i = 0;
  (function prox(){
    if (i > 0) { itens[i - 1].li.className = 'done'; itens[i - 1].d.textContent = det[i - 1]; itens[i - 1].d.hidden = false; }
    if (i >= itens.length) return fim();
    itens[i].li.className = 'run'; i++; setTimeout(prox, PASSO);
  })();
}

$('go').addEventListener('click', function(){
  var btn = this, res = $('res'), m = $('mun');
  function erro(msg){ $('passos').hidden = true; res.hidden = false; res.textContent = ''; res.appendChild(el('h2', 'Busca de fornecedores')); res.appendChild(el('div', msg, 'info err')); rolar(res, 'nearest'); }
  var prod = $('prod').value.trim(), uf = $('uf').value;
  if (prod.length < 3) return erro('Diga o que você precisa comprar: uma descrição, o NCM ou o NBS.');
  if (!uf) return erro('Escolha o estado onde você precisa do fornecedor.');
  if (!$('t-fab').checked && !$('t-dis').checked) return erro('Marque fabricantes, distribuidores ou os dois.');
  btn.disabled = true; btn.textContent = 'Buscando fornecedores…'; res.hidden = true;
  var itens = iniciarPassos();
  F.post('/fornecedores', { produto: prod, uf: uf, municipio: m.value ? m.options[m.selectedIndex].text : '', tipos: { fabricantes: $('t-fab').checked, distribuidores: $('t-dis').checked }, incluirMicro: $('t-mic').checked })
    .then(function(d){
      dados = d; convite = false; sel = {}; d.fornecedores.forEach(function(f){ sel[f.cnpj] = true; });
      F.evento('ferramenta_analise', {ferramenta: FERRAMENTA}); try{ if (window.fbq) fbq('trackCustom', 'FerramentaAnalise', {ferramenta: FERRAMENTA}); }catch(e){}
      return new Promise(function(ok){ concluirPassos(itens, d, ok); }).then(function(){ render(); rolar($('res')); });
    })
    .catch(function(e){ erro(e.message || 'Não foi possível buscar os fornecedores agora.'); })
    .then(function(){ btn.disabled = false; btn.textContent = 'Buscar fornecedores'; });
});

// ---- Resultado
function box(rot, val, obs, cls){ var b = el('div', null, 'box' + (cls ? ' ' + cls : '')); b.appendChild(el('small', rot)); b.appendChild(el('strong', val)); if (obs) b.appendChild(el('em', obs)); return b; }
function dado(dl, rot, val){ var w = el('div'); w.appendChild(el('dt', rot)); w.appendChild(el('dd', val)); dl.appendChild(w); }
function escolhidos(){ return dados.fornecedores.filter(function(f){ return sel[f.cnpj]; }); }

function cartao(f, conta){
  var c = el('div', null, 'forn' + (sel[f.cnpj] ? ' sel' : ''));
  var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!sel[f.cnpj]; cb.setAttribute('aria-label', 'Convidar ' + f.razaoSocial + ' para a cotação');
  cb.addEventListener('change', function(){ sel[f.cnpj] = cb.checked; c.classList.toggle('sel', cb.checked); conta(); });
  c.appendChild(cb);
  var m = el('div');
  m.appendChild(el('h3', f.razaoSocial || f.nomeFantasia || 'Empresa sem nome no cadastro'));
  m.appendChild(el('p', 'CNPJ ' + f.cnpj + ' · ' + f.municipio + ' (' + f.uf + ')' + (f.nomeFantasia && f.nomeFantasia !== f.razaoSocial ? ' · ' + f.nomeFantasia : '') + (f.matriz ? '' : ' · filial'), 'meta'));
  var tg = el('div', null, 'tags'); tg.appendChild(tag('Receita: cadastro ativo', 'r')); if (f.papel) tg.appendChild(tag(f.papel)); tg.appendChild(tag(f.regime, f.regime === 'Simples Nacional' ? 's' : 'q')); m.appendChild(tg);
  var dl = el('dl');
  dado(dl, 'Abertura', f.abertura ? f.abertura.slice(0, 4) + (f.anos != null ? ' · ' + (f.anos === 1 ? '1 ano' : f.anos + ' anos') : '') : 'Não informada');
  dado(dl, 'Porte', f.porte); dado(dl, 'Capital social', f.capitalSocial != null ? F.brl0(f.capitalSocial) : 'Não informado'); dado(dl, 'CNAE principal', f.cnae);
  m.appendChild(dl);
  var p = el('div', null, 'prot'); p.appendChild(el('strong', 'Protestos em cartório')); p.appendChild(tag('Simulado: nenhum protesto', 'q')); p.appendChild(el('span', 'Checagem demonstrativa, sem consulta a cartórios.')); m.appendChild(p);
  c.appendChild(m); return c;
}

function render(){
  var d = dados, n = d.fornecedores.length, res = $('res'); res.hidden = false; res.textContent = '';
  res.appendChild(el('h2', n === 1 ? '1 fornecedor para a sua cotação' : n + ' fornecedores para a sua cotação'));
  res.appendChild(el('p', 'Para ' + d.produto + (d.codigo ? ' (' + d.codigo + ')' : '') + ', ' + regiao(d) + '.', 'sub'));
  var k = el('div', null, 'kpis');
  k.appendChild(box('Empresas ativas na região', d.total.toLocaleString('pt-BR'), d.atividades.length === 1 ? '1 atividade econômica' : d.atividades.length + ' atividades econômicas'));
  k.appendChild(box('Selecionadas pelo agente', String(n), 'Pelos critérios abaixo', 'big'));
  k.appendChild(box('Cadastro na Receita', n + ' de ' + n, 'Situação ativa'));
  k.appendChild(box('Protestos em cartório', 'Nenhum', 'Checagem simulada'));
  res.appendChild(k);
  res.appendChild(el('p', 'Como o agente escolheu: ' + d.criterios + '. Marque quem você quer convidar.', 'muted'));
  if (d.regiao.ampliada) res.appendChild(el('div', 'Havia poucas empresas dessa atividade em ' + d.regiao.municipio + ': a lista foi completada com empresas de outros municípios do estado.', 'info'));

  var cont = el('span'), bconv;
  function conta(){ var q = escolhidos().length; cont.textContent = q === 0 ? 'Nenhum fornecedor selecionado' : q === 1 ? '1 fornecedor selecionado' : q + ' fornecedores selecionados'; if (bconv) bconv.disabled = q === 0; if (convite) montarConvite(); }
  d.fornecedores.forEach(function(f){ res.appendChild(cartao(f, conta)); });
  var bar = el('div', null, 'selbar'); bar.appendChild(cont);
  bconv = el('button', 'Convidar para a cotação', 'btn'); bconv.type = 'button';
  bconv.addEventListener('click', function(){ convite = true; montarConvite(); rolar($('conv')); F.evento('ferramenta_convite_simulado', {ferramenta: FERRAMENTA, fornecedores: escolhidos().length}); });
  bar.appendChild(bconv); res.appendChild(bar); conta();
  var cv = el('div'); cv.id = 'conv'; res.appendChild(cv);

  F.captura(res, { ferramenta: FERRAMENTA, titulo: 'Baixe a lista em Excel', botao: 'Baixar em Excel', liberado: 'Lista liberada',
    texto: 'Os fornecedores encontrados, com os dados do cadastro na Receita: CNPJ, município, atividade, data de abertura, porte, capital social e regime tributário.',
    resumo: function(){ return FERRAMENTA + ': ' + d.produto + ' ' + regiao(d) + ' — ' + d.total + ' empresas ativas, ' + n + ' selecionadas'; },
    depois: baixar });
  F.cta(res, 'Do convite ao mapa de propostas, sem planilha', 'No Vendor Management, o fornecedor entra pelo portal, envia os documentos de homologação e a proposta, e as respostas chegam ranqueadas no mapa de propostas.', FERRAMENTA);
}

// ---- Convite para a cotação: a simulação para aqui, sem envio
function montarConvite(){
  var cv = $('conv'); if (!cv) return; cv.textContent = '';
  var q = escolhidos().length; if (!q) return;
  var b = el('div', null, 'conv');
  b.appendChild(el('h3', q === 1 ? 'Simulação concluída: 1 fornecedor pronto para o convite' : 'Simulação concluída: ' + q + ' fornecedores prontos para o convite'));
  b.appendChild(el('div', 'A simulação não envia e-mails para empresas reais. Nenhum dos fornecedores listados foi contatado.', 'info'));
  b.appendChild(el('p', 'No Vendor Management, a jornada continua a partir daqui:', 'ass'));
  var ol = el('ol', null, 'segue');
  ['Cada fornecedor escolhido recebe o convite e entra pelo portal.', 'Envia os documentos de homologação, que ficam no cadastro com validade controlada.', 'Responde à cotação no próprio portal.', 'Você recebe as propostas ranqueadas no mapa de propostas, com critérios e pesos.'].forEach(function(t){ ol.appendChild(el('li', t)); });
  b.appendChild(ol);
  var acts = el('div', null, 'acts');
  var dm = el('a', 'Agendar uma demonstração', 'btn inline'); dm.href = 'https://calendly.com/paulocacciari/demo-plataforma-gestao-de-compras'; dm.target = '_blank'; dm.rel = 'noopener'; dm.style.minHeight = '46px'; acts.appendChild(dm);
  var r = el('a', 'Montar o pedido de cotação (RFQ)', 'btn sec inline'); r.href = '/ferramentas-de-compras/gerador-de-rfq/'; r.style.minHeight = '46px'; acts.appendChild(r);
  b.appendChild(acts); cv.appendChild(b);
}

function baixar(){
  if (!dados) return;
  var ref = referencia(dados.referencia);
  F.baixarCSV('fornecedores-para-cotacao.csv', [['Razão social', 'Nome fantasia', 'CNPJ', 'Município', 'UF', 'Atividade', 'CNAE principal', 'Abertura', 'Porte', 'Capital social (R$)', 'Regime tributário', 'Situação cadastral', 'Base da Receita']].concat(
    dados.fornecedores.map(function(f){ return [f.razaoSocial, f.nomeFantasia, f.cnpj, f.municipio, f.uf, f.papel, f.cnae, f.abertura, f.porte, f.capitalSocial, f.regime, f.situacao, ref]; })));
}
})();
