/* Buscador de fornecedores: simulação do sourcing do Vendor.
   A lista vem da base aberta do CNPJ (Receita Federal). O quadro de homologação consulta bases públicas oficiais:
   sanções federais (Portal da Transparência) e lista suja do trabalho escravo (Ministério do Trabalho).
   O convite é simulado: nenhum e-mail a fornecedor. */
(function(){
'use strict';
var F = window.Ferramentas, $ = F.$, el = F.el;
var FERRAMENTA = 'Buscador de fornecedores', dados = null, sel = {}, convite = false, ultima = null;
var PASSO = (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) ? 0 : 450;
var MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
function tag(t, cls){ return el('span', t, 'tag' + (cls ? ' ' + cls : '')); }
function rolar(e, onde){ e.scrollIntoView({behavior: PASSO ? 'smooth' : 'auto', block: onde || 'start'}); }
function referencia(r){ var m = /^(\d{4})-(\d{2})$/.exec(r || ''); return m ? MESES[Number(m[2]) - 1] + ' de ' + m[1] : ''; }
function custoOk(d){ return !!(d && d.custo && d.custo.estado === 'ok'); }
function custoDe(d, f){ return custoOk(d) ? d.custo.regimes[f.regime === 'Simples Nacional' ? 'simples' : 'regular'] : null; }
function regiao(d){ var r = d.regiao; return r.municipio ? ('em ' + r.municipio + ' (' + r.uf + ')' + (r.ampliada ? ' e no restante do estado' : '')) : 'no estado de ' + r.uf; }
function dataBR(s){ var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }

// ---- Homologação: sanções federais e lista suja. Sem o dado (versão antiga do serviço), vale "não consultado".
function homDe(f){
  var h = f.homologacao || {};
  return { sancoes: h.sancoes && h.sancoes.status ? h.sancoes : { status: 'nao_consultado', registros: [] }, listaSuja: h.listaSuja && h.listaSuja.status ? h.listaSuja : { status: 'nao_consultado' } };
}
function basesDe(d){ var b = d.bases || {}; return { receita: b.receita || d.referencia || '', sancoes: b.sancoes || '', listaSuja: b.listaSuja || '' }; }
function registro(r){ return [r.cadastro, r.categoria, r.orgao].filter(function(x){ return x; }).join(' · ') + (r.inicio ? ' · desde ' + dataBR(r.inicio) : ''); }
function contagem(d){
  var c = { nada: 0, consta: 0, nc: 0, ls: 0, lsnc: 0, n: d.fornecedores.length };
  d.fornecedores.forEach(function(f){ var h = homDe(f);
    if (h.sancoes.status === 'consta') c.consta++; else if (h.sancoes.status === 'nada_consta') c.nada++; else c.nc++;
    if (h.listaSuja.status === 'consta') c.ls++; else if (h.listaSuja.status !== 'nao_consta') c.lsnc++; });
  return c;
}
function resumoHom(d){
  var c = contagem(d);
  if (c.nc === c.n && c.lsnc === c.n) return 'Sanções e lista suja não consultadas nesta busca';
  var s = c.nc === c.n ? 'Sanções federais: não consultado' : (c.consta ? 'Sanções federais: consta em ' + c.consta + ' de ' + c.n : 'Sanções federais: nada consta em ' + c.nada + ' de ' + c.n);
  var l = c.lsnc === c.n ? 'lista suja: não consultada' : (c.ls ? 'lista suja: consta em ' + c.ls : 'lista suja: nada consta');
  return s + ' · ' + l + ', nas bases públicas oficiais';
}
var SVG = 'http://www.w3.org/2000/svg';
function desenho(d, cls){ var s = document.createElementNS(SVG, 'svg'); s.setAttribute('viewBox', '0 0 16 16'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); if (cls) s.setAttribute('class', cls); d.forEach(function(x){ var p = document.createElementNS(SVG, x[0]); for (var k in x[1]) p.setAttribute(k, x[1][k]); s.appendChild(p); }); return s; }
var TRACO = { fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
function com(o, extra){ var r = {}, k; for (k in o) r[k] = o[k]; for (k in extra) r[k] = extra[k]; return r; }
function estado(tipo){
  var e = el('span', null, 'est est-' + tipo);
  e.appendChild(tipo === 'ok' ? desenho([['path', com(TRACO, { d: 'M3.5 8.5l3 3 6-7' })]])
    : tipo === 'al' ? desenho([['path', com(TRACO, { d: 'M8 3.5v5.5' })], ['circle', { cx: '8', cy: '12.5', r: '1.3', fill: 'currentColor' }]])
    : desenho([['path', com(TRACO, { d: 'M4 8h8' })]]));
  return e;
}
function cadeado(){ return desenho([['rect', { x: '3', y: '7', width: '10', height: '8', rx: '1.5', fill: 'currentColor' }], ['path', com(TRACO, { d: 'M5.5 7V5a2.5 2.5 0 0 1 5 0v2', 'stroke-width': '1.8' })]], 'cad'); }
var VENDOR = '/gestao-de-compras-e-fornecedores/?utm_source=ferramenta&utm_medium=buscador&utm_campaign=homologacao';
var TRAVADOS = ['Emitir CND federal', 'Emitir CNDT trabalhista', 'Emitir CRF do FGTS', 'Protestos e processos', 'Pedir balanço e analisar liquidez', 'Controlar a validade dos documentos', 'Dossiê de homologação em PDF'];

F.destino($('uf'), $('mun'));
// Quem vem do Gerador de RFQ chega com o objeto da cotação preenchido.
try{ var pre = sessionStorage.getItem('ob_busca'); if (pre) { $('prod').value = pre; sessionStorage.removeItem('ob_busca'); } }catch(e){}
$('exemplo').addEventListener('click', function(){
  $('prod').value = 'frascos e garrafas de plástico para envase';
  var u = $('uf'); if (!u.value) { u.value = 'SP'; u.dispatchEvent(new Event('change')); }
  F.evento('ferramenta_exemplo', {ferramenta: FERRAMENTA});
});

// ---- O que o agente faz, passo a passo
var TITULOS = ['Item identificado', 'Atividades de quem fornece', 'Empresas ativas na região', 'Cadastro na base da Receita Federal', 'Efeito de CBS e IBS no custo', 'Homologação: sanções e lista suja', 'Fornecedores selecionados'];
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
    custoOk(d) ? 'Alíquota efetiva de ' + F.pct(d.custo.aliquotaEfetiva) + ' em 2027, pelo motor de cálculo da Receita Federal' : (d.custo && d.custo.estado === 'sugestao' ? 'O agente sugeriu o NCM do item: confirme abaixo para calcular' : (d.custo && d.custo.estado === 'sem_codigo' ? 'Informe o NCM ou o NBS do item para calcular' : 'Não calculado para este item')),
    resumoHom(d),
    'Critérios: ' + d.criterios
  ];
  itens[6].b.textContent = n === 1 ? '1 fornecedor selecionado' : n + ' fornecedores selecionados';
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
  ultima = { uf: uf, destino: m.value || (m.options[1] ? m.options[1].value : ''), valor: $('valor').value.trim() };
  F.post('/fornecedores', { produto: prod, uf: uf, municipio: m.value ? m.options[m.selectedIndex].text : '', destino: ultima.destino, valor: ultima.valor, tipos: { fabricantes: $('t-fab').checked, distribuidores: $('t-dis').checked }, incluirMicro: $('t-mic').checked })
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
  var tg = el('div', null, 'tags'); tg.appendChild(tag('Receita: cadastro ativo', 'r')); if (f.alerta) tg.appendChild(tag(f.alerta, 's')); if (f.papel) tg.appendChild(tag(f.papel)); tg.appendChild(tag(f.regime, f.regime === 'Simples Nacional' ? 's' : 'q')); m.appendChild(tg);
  var dl = el('dl');
  dado(dl, 'Abertura', f.abertura ? f.abertura.slice(0, 4) + (f.anos != null ? ' · ' + (f.anos === 0 ? 'menos de 1 ano' : f.anos === 1 ? '1 ano' : f.anos + ' anos') : '') : 'Não informada');
  dado(dl, 'Porte', f.porte); dado(dl, 'Capital social', f.capitalSocial != null ? F.brl0(f.capitalSocial) : 'Não informado'); dado(dl, 'CNAE principal', f.cnae);
  m.appendChild(dl);
  if (f.alerta) m.appendChild(el('p', f.alerta + ', conforme o nome empresarial registrado na Receita. Avalie o risco de fornecimento antes de convidar.', 'obs'));
  var c0 = custoDe(dados, f);
  if (c0) {
    var cu = el('div', null, 'custo' + (c0.creditoPerdido > 0 ? ' perde' : '')); cu.appendChild(el('strong', 'CBS e IBS em 2027, numa compra de ' + F.brl(dados.custo.valor)));
    function par(r, v){ var s = el('span'); s.appendChild(document.createTextNode(r + ': ')); s.appendChild(el('b', v)); cu.appendChild(s); }
    par('Crédito que você recupera', F.brl(c0.credito)); par('Custo líquido', F.brl(c0.custoLiquido));
    if (c0.creditoPerdido > 0) { par('Desconto para empatar com o regime regular', F.pct(c0.descontoEmpate)); cu.appendChild(el('small', 'Se esta empresa recolher CBS e IBS por fora do Simples, o crédito é cheio e o custo líquido cai para ' + F.brl(dados.custo.regimes.simples_por_fora.custoLiquido) + '. Vale perguntar na cotação.')); }
    m.appendChild(cu);
  }
  m.appendChild(quadro(f));
  c.appendChild(m); return c;
}

// Quadro de homologação do cartão: três linhas respondidas e, abaixo, o que só o Vendor faz.
function quadro(f){
  var h = homDe(f), b = basesDe(dados), s = h.sancoes, ls = h.listaSuja;
  var q = el('div', null, 'hom' + (s.status === 'consta' || ls.status === 'consta' ? ' tem' : ''));
  q.appendChild(el('strong', 'Homologação'));
  var ul = el('ul');
  function linha(tipo, rot, txt){ var li = el('li', null, 'h-' + tipo); li.appendChild(estado(tipo)); var w = el('div'); w.appendChild(el('b', rot + ': ')); w.appendChild(document.createTextNode(txt)); li.appendChild(w); ul.appendChild(li); return w; }
  var ref = referencia(b.receita);
  linha('ok', 'Receita Federal', (!f.situacao || f.situacao === 'Ativa' ? 'cadastro ativo' : 'situação ' + String(f.situacao).toLowerCase()) + (ref ? ' · base de ' + ref : ''));
  var rs = 'Sanções federais (CEIS, CNEP, CEPIM e leniência)';
  if (s.status === 'nada_consta') linha('ok', rs, 'nada consta');
  else if (s.status === 'consta') {
    var regs = s.registros || [];
    var w = linha('al', rs, regs.length === 1 ? 'consta: ' + registro(regs[0]) : 'consta');
    if (regs.length > 1) {
      var rl = el('ul', null, 'regs'); regs.slice(0, 3).forEach(function(r){ rl.appendChild(el('li', registro(r))); });
      if (regs.length > 3) rl.appendChild(el('li', 'e mais ' + (regs.length - 3) + (regs.length - 3 === 1 ? ' registro' : ' registros')));
      w.appendChild(rl);
    }
  } else linha('nc', rs, 'não consultado');
  var rl2 = 'Lista suja do trabalho escravo';
  if (ls.status === 'nao_consta') linha('ok', rl2, 'não consta');
  else if (ls.status === 'consta') linha('al', rl2, 'consta' + (ls.inclusao ? ' desde ' + dataBR(ls.inclusao) : ''));
  else linha('nc', rl2, 'não consultado');
  q.appendChild(ul);
  var fontes = [];
  if (b.sancoes && s.status !== 'nao_consultado') fontes.push('Sanções: base de ' + dataBR(b.sancoes));
  if (b.listaSuja && ls.status !== 'nao_consultado') fontes.push('Lista suja: atualizada em ' + dataBR(b.listaSuja));
  q.appendChild(el('p', s.status === 'nao_consultado' && ls.status === 'nao_consultado' ? 'Sanções e lista suja não consultadas nesta busca.' : 'Consultado nas fontes oficiais.' + (fontes.length ? ' ' + fontes.join(' · ') + '.' : ''), 'fonte'));
  var tv = el('div', null, 'travas');
  TRAVADOS.forEach(function(nome){
    var a = el('a', null, 'trava'); a.href = VENDOR; a.setAttribute('aria-label', nome + ': disponível no Vendor Management');
    a.appendChild(cadeado()); var t = el('span'); t.appendChild(el('b', nome)); t.appendChild(el('small', 'disponível no Vendor')); a.appendChild(t);
    a.addEventListener('click', function(){ F.evento('ferramenta_vendor_bloqueado', {item: nome}); });
    tv.appendChild(a);
  });
  q.appendChild(tv);
  return q;
}

function render(){
  var d = dados, n = d.fornecedores.length, res = $('res'); res.hidden = false; res.textContent = '';
  res.appendChild(el('h2', n === 1 ? '1 fornecedor para a sua cotação' : n + ' fornecedores para a sua cotação'));
  res.appendChild(el('p', 'Para ' + d.produto + (d.codigo ? ' (' + d.codigo + ')' : '') + ', ' + regiao(d) + '.', 'sub'));
  var k = el('div', null, 'kpis');
  k.appendChild(box('Empresas ativas na região', d.total.toLocaleString('pt-BR'), d.atividades.length === 1 ? '1 atividade econômica' : d.atividades.length + ' atividades econômicas'));
  k.appendChild(box('Selecionadas pelo agente', String(n), 'Pelos critérios abaixo', 'big'));
  k.appendChild(box('Cadastro na Receita', n + ' de ' + n, 'Situação ativa'));
  var hc = contagem(d), lsTxt = hc.lsnc === n ? 'Lista suja: não consultada' : (hc.ls ? 'Lista suja: consta em ' + hc.ls : 'Lista suja: nada consta');
  if (hc.consta) k.appendChild(box('Sanções federais', 'Consta em ' + hc.consta, 'de ' + n + ' · ' + lsTxt, 'alert'));
  else if (hc.nc === n) k.appendChild(box('Sanções federais', 'Não consultado', lsTxt, hc.ls ? 'alert' : ''));
  else k.appendChild(box('Sanções federais', 'Nada consta em ' + hc.nada + ' de ' + n, lsTxt, hc.ls ? 'alert' : ''));
  res.appendChild(k);
  res.appendChild(el('p', 'Como o agente escolheu: ' + d.criterios + '. Marque quem você quer convidar.', 'muted'));
  if (d.regiao.ampliada) res.appendChild(el('div', 'Havia poucas empresas dessa atividade em ' + d.regiao.municipio + ': a lista foi completada com empresas de outros municípios do estado.', 'info'));

  efeito(res, d);
  var cont = el('span'), bconv;
  function conta(){ var q = escolhidos().length; cont.textContent = q === 0 ? 'Nenhum fornecedor selecionado' : q === 1 ? '1 fornecedor selecionado' : q + ' fornecedores selecionados'; if (bconv) bconv.disabled = q === 0; if (convite) montarConvite(); }
  d.fornecedores.forEach(function(f){ res.appendChild(cartao(f, conta)); });
  var bar = el('div', null, 'selbar'); bar.appendChild(cont);
  bconv = el('button', 'Convidar para a cotação', 'btn'); bconv.type = 'button';
  bconv.addEventListener('click', function(){ convite = true; montarConvite(); rolar($('conv')); F.evento('ferramenta_convite_simulado', {ferramenta: FERRAMENTA, fornecedores: escolhidos().length}); });
  bar.appendChild(bconv); res.appendChild(bar); conta();
  var cv = el('div'); cv.id = 'conv'; res.appendChild(cv);

  F.captura(res, { ferramenta: FERRAMENTA, titulo: 'Baixe a lista em Excel', botao: 'Baixar em Excel', liberado: 'Lista liberada',
    texto: 'Os fornecedores encontrados, com os dados do cadastro na Receita (CNPJ, município, atividade, data de abertura, porte, capital social e regime tributário) e o resultado das sanções federais e da lista suja.',
    resumo: function(){ return FERRAMENTA + ': ' + d.produto + ' ' + regiao(d) + ' — ' + d.total + ' empresas ativas, ' + n + ' selecionadas'; },
    depois: baixar });
  F.cta(res, 'Do convite ao mapa de propostas, sem planilha', 'No Vendor Management, o fornecedor entra pelo portal, envia os documentos de homologação e a proposta, e as respostas chegam ranqueadas no mapa de propostas.', FERRAMENTA);
}

// ---- Efeito de CBS e IBS no custo, por regime do fornecedor
function efeito(res, d){
  var c = d.custo || {}, b = el('div', null, 'efeito');
  if (c.estado === 'ok') {
    b.id = 'efeito';
    var reg = c.regimes.regular, sim = c.regimes.simples;
    b.appendChild(el('h3', 'O regime do fornecedor muda o seu custo'));
    b.appendChild(el('p', 'Em 2027, ' + (d.codigo || 'este item') + ' tem alíquota efetiva de CBS e IBS de ' + F.pct(c.aliquotaEfetiva) + '. Numa compra de ' + F.brl(c.valor) + ' com tributos, de um fornecedor do regime regular você recupera ' + F.brl(reg.credito) + ' e o custo líquido fica em ' + F.brl(reg.custoLiquido) + '. De um fornecedor do Simples Nacional, recupera ' + F.brl(sim.credito) + ' e o custo líquido fica em ' + F.brl(sim.custoLiquido) + ': para empatar, ele precisa cobrar ' + F.pct(sim.descontoEmpate) + ' a menos.'));
    if (d.ncmConfirmado) b.appendChild(el('p', 'O NCM foi sugerido pelo agente e confirmado por você. Confira o código na nota fiscal ou no cadastro do item antes de decidir.', 'muted'));
    if ((c.possivelReducao || []).length) b.appendChild(el('p', 'Atenção: este item pode ter alíquota reduzida, conforme a classificação tributária da operação (' + c.possivelReducao.map(function(x){ return x.descricao; }).join('; ') + '). O cálculo acima usa a tributação integral.'));
    var n = el('p'); n.appendChild(document.createTextNode('Cálculo pelo motor de código aberto da Receita Federal, com alíquotas de referência de 2027. Quando as propostas chegarem, compare pelo custo líquido no ')); var a = el('a', 'Comparador de cotações'); a.href = '/ferramentas-de-compras/comparador-de-cotacoes/'; n.appendChild(a); n.appendChild(document.createTextNode('.')); n.className = 'muted'; b.appendChild(n);
  } else if (c.estado === 'sugestao') {
    b.id = 'efeito';
    b.appendChild(el('h3', c.sugestoes.length === 1 ? 'Este é o NCM do item?' : 'Qual é o NCM do item?'));
    b.appendChild(el('p', 'A partir da sua descrição, o agente sugere ' + (c.sugestoes.length === 1 ? 'o código abaixo' : 'os códigos abaixo') + '. Confirme o que corresponde ao item para ver o crédito de CBS e IBS e o custo líquido com cada fornecedor.'));
    var acts = el('div', null, 'acts'), aviso = el('div', null, 'info err'); aviso.hidden = true;
    c.sugestoes.forEach(function(sg){
      var bt = el('button', sg.rotulo + ' · ' + sg.descricao, 'btn sec inline ncm'); bt.type = 'button';
      bt.addEventListener('click', function(){
        if (bt.disabled) return; aviso.hidden = true;
        var todos = acts.querySelectorAll('button'); todos.forEach(function(x){ x.disabled = true; }); bt.textContent = 'Calculando…';
        F.post('/fornecedores/custo', { codigo: sg.codigo, uf: ultima.uf, destino: ultima.destino, valor: ultima.valor })
          .then(function(r){ d.custo = r.custo; d.codigo = r.codigo; d.ncmConfirmado = true; F.evento('ferramenta_ncm_confirmado', {ferramenta: FERRAMENTA}); render(); var e = $('efeito'); if (e) rolar(e, 'center'); })
          .catch(function(e){ todos.forEach(function(x){ x.disabled = false; }); bt.textContent = sg.rotulo + ' · ' + sg.descricao; aviso.textContent = e.message || 'Não foi possível calcular agora.'; aviso.hidden = false; });
      });
      acts.appendChild(bt);
    });
    b.appendChild(acts); b.appendChild(aviso);
    var q = el('p', null, 'muted'); q.appendChild(document.createTextNode('Nenhum destes? Consulte o código na ')); var lk = el('a', 'calculadora de CBS e IBS'); lk.href = '/calculadora-reforma-tributaria/'; q.appendChild(lk); q.appendChild(document.createTextNode(' e busque de novo com o NCM.')); b.appendChild(q);
  } else if (c.estado === 'sem_codigo') {
    b.appendChild(el('h3', 'Quer ver o efeito de CBS e IBS no custo?'));
    var p = el('p'); p.appendChild(document.createTextNode('Inclua o NCM (mercadoria) ou o NBS (serviço) do item na busca e mostramos o crédito e o custo líquido com cada fornecedor. Não sabe o código? Consulte na ')); var l = el('a', 'calculadora de CBS e IBS'); l.href = '/calculadora-reforma-tributaria/'; p.appendChild(l); p.appendChild(document.createTextNode('.')); b.appendChild(p);
  } else if (c.estado === 'nao_calculado') {
    b.appendChild(el('h3', 'Efeito de CBS e IBS não calculado'));
    var pn = el('p'); pn.appendChild(document.createTextNode(c.naoEncontrado ? 'O código ' + (c.codigo || 'informado') + ' não existe na tabela da Receita Federal para 2027: ele pode ter sido desdobrado em outros códigos. Confira o código vigente na ' : 'O motor de cálculo da Receita não calculou o código informado. Confira o NCM ou o NBS na ')); var ln = el('a', 'calculadora de CBS e IBS'); ln.href = '/calculadora-reforma-tributaria/'; pn.appendChild(ln); pn.appendChild(document.createTextNode(' e busque de novo.')); b.appendChild(pn);
  } else { return; }
  res.appendChild(b);
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
  var b = basesDe(dados);
  var ok = custoOk(dados), cab = ['Razão social', 'Nome fantasia', 'CNPJ', 'Município', 'UF', 'Atividade', 'CNAE principal', 'Abertura', 'Porte', 'Capital social (R$)', 'Regime tributário', 'Situação cadastral', 'Alerta', 'Base da Receita', 'Sanções federais', 'Lista suja', 'Sanções consultadas em', 'Lista suja atualizada em'];
  if (ok) cab = cab.concat(['Compra de referência (R$)', 'Crédito de CBS e IBS (R$)', 'Custo líquido (R$)', 'Desconto para empatar (%)']);
  F.baixarCSV('fornecedores-para-cotacao.csv', [cab].concat(dados.fornecedores.map(function(f){
    var h = homDe(f), s = h.sancoes, ls = h.listaSuja;
    var sTxt = s.status === 'nada_consta' ? 'Nada consta' : s.status === 'consta' ? 'Consta: ' + (s.registros || []).map(registro).join('; ') : 'Não consultado';
    var lTxt = ls.status === 'nao_consta' ? 'Não consta' : ls.status === 'consta' ? 'Consta' + (ls.inclusao ? ' desde ' + dataBR(ls.inclusao) : '') : 'Não consultado';
    var l = [f.razaoSocial, f.nomeFantasia, f.cnpj, f.municipio, f.uf, f.papel, f.cnae, f.abertura, f.porte, f.capitalSocial, f.regime, f.situacao, f.alerta || '', ref,
      sTxt, lTxt, s.status !== 'nao_consultado' ? dataBR(b.sancoes) : '', ls.status !== 'nao_consultado' ? dataBR(b.listaSuja) : ''], c = custoDe(dados, f);
    return ok ? l.concat([dados.custo.valor, c.credito, c.custoLiquido, c.descontoEmpate]) : l; })));
}
})();
