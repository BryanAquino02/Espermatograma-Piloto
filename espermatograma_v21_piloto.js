// ═══════════════════════════════════════════════
// CONFIGURACIÓN (v21)
// ═══════════════════════════════════════════════
const APP_VERSION = 'v21-piloto';

// Límites de validación (editables). Valores PROPUESTOS, pendientes de
// confirmación por el médico responsable.
const LIMITES = {
  volumen:  {min:0, max:20},   // ml  (m-a, m-a-print)  — propuesto
  ph:       {min:5, max:10},   //     (m-ph)            — propuesto
  concentracion: {min:0, max:1000}, // x10^6/ml (m-b)    — propuesto
  celulasRedondas: {min:0, max:1000} // (m-q)             — propuesto
};

// Campos de identificación del paciente / muestra (listeners y reset)
const CAMPOS_PACIENTE = ['p-nombre','p-referencia','p-fecha-nac','p-abstinencia','p-conyuge','p-medico','p-institucion','p-informe','p-tipo-muestra','p-operador','p-fecha','p-hora-emision','p-hora-recepcion','p-hora-procesamiento'];

// PAGINATION
const PAGES = [
  { id:'page-2', title:'General' },
  { id:'page-3', title:'Motilidad' },
  { id:'page-4', title:'Morfología' },
  { id:'page-5', title:'Vitalidad' },
  { id:'page-6', title:'Leucocitos' },
];
let currentPage = 0;

function buildDots(){
  const container = document.getElementById('page-dots');
  PAGES.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'page-dot' + (i === 0 ? ' active' : '');
    dot.id = 'dot-' + i;
    container.appendChild(dot);
  });
}

let appReady = false;
function showPage(index){
  PAGES.forEach((p, i) => {
    const el = document.getElementById(p.id);
    el.classList.toggle('active', i === index);
    document.getElementById('dot-' + i).classList.toggle('active', i === index);
  });
  document.getElementById('current-page-title').textContent = PAGES[index].title;
  document.getElementById('btn-prev').disabled = (index === 0);
  const nextBtn = document.getElementById('btn-next');
  if(index === PAGES.length - 1){
    nextBtn.textContent = '✓ Listo';
    nextBtn.disabled = true;
  } else {
    nextBtn.textContent = 'Siguiente →';
    nextBtn.disabled = false;
  }
  currentPage = index;
}

function changePage(dir){
  const next = currentPage + dir;
  if(next >= 0 && next < PAGES.length){ showPage(next); if(appReady) computeAll(); }
}

buildDots();
showPage(0);

function calcEdad(){
  const fechaNac = document.getElementById('p-fecha-nac').value;
  const edadEl = document.getElementById('p-edad');
  if(!fechaNac){ edadEl.value = ''; return; }
  const hoy = new Date();
  const nac = new Date(fechaNac + 'T00:00:00');
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if(m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  edadEl.value = edad >= 0 ? edad + ' años' : '';
}

// CALCULATION HELPERS
function val(id){
  const v = parseFloat(document.getElementById(id).value);
  return isFinite(v) ? v : NaN;
}
function setOut(id, value, decimals, unit){
  const el = document.getElementById(id);
  el.textContent = isFinite(value) ? value.toFixed(decimals) + (unit ? ' '+unit : '') : '—';
}
// Suma ignorando los valores no numéricos (equivale a los reduce de v20)
function sum(arr){
  return arr.reduce((acc, v) => isFinite(v) ? acc + v : acc, 0);
}
function pct(num, den){
  return (isFinite(num) && isFinite(den) && den > 0) ? (num/den)*100 : NaN;
}
const SVG_NS = 'http://www.w3.org/2000/svg';

/* Dona con segmentos redondeados separados por espacios y porcentaje afuera,
   estilo "donut chart" (referencia: gráfico con anillo hueco, extremos
   redondeados, huecos entre segmentos y % fuera del anillo). */
function drawDonutChart(svg, cx, cy, outerR, slices, emptyText, legendCols){
  while(svg.firstChild) svg.removeChild(svg.firstChild);

  function emptyMessage(){
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('x', cx); t.setAttribute('y', cy);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('font-size', '12'); t.setAttribute('fill', '#9AA1AE');
    t.textContent = emptyText;
    svg.appendChild(t);
  }

  const total = slices.reduce((acc, s) => acc + s.value, 0);
  if(total <= 0){ emptyMessage(); return; }

  function polar(angleDeg, radius){
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  const ringWidth = outerR * 0.42;
  const midR = outerR - ringWidth / 2;
  const circumference = 2 * Math.PI * midR;
  const visibleCount = slices.filter(s => s.value > 0).length;
  const gapDeg = visibleCount > 1 ? 1.5 : 0;

  let cumAngle = 0;
  slices.forEach(s => {
    const angle = (s.value / total) * 360;
    if(angle > 0.05){
      const drawAngle = Math.max(angle - gapDeg, angle * 0.15);
      const arcLen = (drawAngle / 360) * circumference;
      const circleEl = document.createElementNS(SVG_NS, 'circle');
      circleEl.setAttribute('cx', cx); circleEl.setAttribute('cy', cy);
      circleEl.setAttribute('r', midR);
      circleEl.setAttribute('fill', 'none');
      circleEl.setAttribute('stroke', s.color);
      circleEl.setAttribute('stroke-width', ringWidth);
      circleEl.setAttribute('stroke-linecap', 'butt');
      circleEl.setAttribute('stroke-dasharray', arcLen + ' ' + (circumference - arcLen));
      const rotateDeg = (cumAngle / 360) * 360 - 90 + (gapDeg / 2);
      circleEl.setAttribute('transform', 'rotate(' + rotateDeg + ' ' + cx + ' ' + cy + ')');
      svg.appendChild(circleEl);

      if(angle > 8){
        const mid = cumAngle + angle / 2;
        const lp = polar(mid, midR);
        const pctText = document.createElementNS(SVG_NS, 'text');
        pctText.setAttribute('x', lp.x); pctText.setAttribute('y', lp.y + 4);
        pctText.setAttribute('text-anchor', 'middle');
        pctText.setAttribute('font-size', '13');
        pctText.setAttribute('font-weight', '700');
        pctText.setAttribute('fill', '#FFFFFF');
        pctText.textContent = s.value.toFixed(0) + '%';
        svg.appendChild(pctText);
      }
    }
    cumAngle += angle;
  });

  const legendY = cy + outerR + 24;
  const visibleSlices = slices.filter(s => s.value > 0);
  const cols = legendCols || visibleSlices.length;
  const itemW = 96;
  const totalW = Math.min(visibleSlices.length, cols) * itemW;
  const startX = cx - totalW / 2 + 6;

  visibleSlices.forEach((s, idx) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const lx = startX + col * itemW;
    const ly = legendY + row * 18;
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', lx); rect.setAttribute('y', ly);
    rect.setAttribute('width', 10); rect.setAttribute('height', 10);
    rect.setAttribute('rx', 2.5); rect.setAttribute('fill', s.color);
    svg.appendChild(rect);

    const labelEl = document.createElementNS(SVG_NS, 'text');
    labelEl.setAttribute('x', lx + 14); labelEl.setAttribute('y', ly + 9.5);
    labelEl.setAttribute('font-size', '10.5'); labelEl.setAttribute('fill', '#16213D');
    labelEl.textContent = s.label;
    svg.appendChild(labelEl);
  });
}

/* Barra horizontal apilada al 100 % (reemplaza a la dona de motilidad).
   Segmentos redondeados separados por un pequeño hueco, % dentro de cada
   segmento, eje 0–50–100 % debajo y leyenda centrada. */
function drawStackedBar(svg, slices, emptyText, separacionLeyenda){
  while(svg.firstChild) svg.removeChild(svg.firstChild);

  const VB_W = 520, VB_H = 130;
  const X0 = 20, BAR_W = 480, BAR_Y = 8, BAR_H = 34;
  const GAP = 4, RX = 5;
  const AXIS_Y = 58, LEGEND_Y = 104;
  svg.setAttribute('viewBox', '0 0 ' + VB_W + ' ' + VB_H);

  function el(tag, attrs, text){
    const e = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs).forEach(k => e.setAttribute(k, attrs[k]));
    if(text !== undefined) e.textContent = text;
    svg.appendChild(e);
    return e;
  }

  const visibles = slices.filter(s => s.value > 0);
  const total = visibles.reduce((acc, s) => acc + s.value, 0);
  if(total <= 0){
    el('text', { x: VB_W / 2, y: VB_H / 2, 'text-anchor': 'middle',
                 'font-size': '12', fill: '#9AA1AE' }, emptyText);
    return;
  }

  // Segmentos
  const disponible = BAR_W - GAP * (visibles.length - 1);
  let x = X0;
  visibles.forEach(s => {
    const w = (s.value / total) * disponible;
    el('rect', { x: x, y: BAR_Y, width: Math.max(w, 1), height: BAR_H,
                 rx: Math.min(RX, w / 2), fill: s.color });
    const etiqueta = s.value.toFixed(0) + '%';
    if(w >= etiqueta.length * 8 + 8){
      el('text', { x: x + w / 2, y: BAR_Y + BAR_H / 2 + 4.5, 'text-anchor': 'middle',
                   'font-size': '13', 'font-weight': '700', fill: '#FFFFFF' },
         s.value.toFixed(0) + '%');
    }
    x += w + GAP;
  });

  // Eje 0 % – 50 % – 100 %
  el('line', { x1: X0, y1: AXIS_Y, x2: X0 + BAR_W, y2: AXIS_Y,
               stroke: '#D5D9E0', 'stroke-width': '1' });
  [[0, 'start'], [50, 'middle'], [100, 'end']].forEach(([p, anchor]) => {
    const tx = X0 + (p / 100) * BAR_W;
    el('line', { x1: tx, y1: AXIS_Y, x2: tx, y2: AXIS_Y + 4,
                 stroke: '#D5D9E0', 'stroke-width': '1' });
    el('text', { x: tx, y: AXIS_Y + 17, 'text-anchor': anchor,
                 'font-size': '10.5', 'font-weight': '600', fill: '#9AA1AE' }, p + '%');
  });

  // Leyenda centrada (ancho estimado: el panel puede estar oculto y no se puede medir)
  const SQ = 14, SEP = 8, ENTRE = separacionLeyenda || 28, CHAR_W = 6.4;
  const anchos = visibles.map(s => SQ + SEP + s.label.length * CHAR_W);
  const totalLeyenda = anchos.reduce((a, b) => a + b, 0) + ENTRE * (anchos.length - 1);
  let lx = (VB_W - totalLeyenda) / 2;
  visibles.forEach((s, idx) => {
    el('rect', { x: lx, y: LEGEND_Y - SQ / 2, width: SQ, height: SQ, rx: 3, fill: s.color });
    el('text', { x: lx + SQ + SEP, y: LEGEND_Y + 4, 'font-size': '11.5', fill: '#16213D' }, s.label);
    lx += anchos[idx] + ENTRE;
  });
}

function drawMotilityPie(prog, noProg, inmov){
  const svg = document.getElementById('motility-pie');
  const values = [prog, noProg, inmov];
  if(!values.every(isFinite)){
    drawStackedBar(svg, [], 'Completa la motilidad para ver el gráfico');
    return;
  }
  const slices = [
    { label: 'Progresiva',    value: Math.max(prog, 0),   color: '#0E7C9B' },
    { label: 'No progresiva', value: Math.max(noProg, 0), color: '#F5C400' },
    { label: 'Inmótil',       value: Math.max(inmov, 0),  color: '#666666' }
  ];
  drawStackedBar(svg, slices, 'Completa la motilidad para ver el gráfico');
}

function drawMorphologyPie(normal, cabeza, pieza, flagelo, inmaduros, otros){
  const svg = document.getElementById('morphology-pie');
  const values = [normal, cabeza, pieza, flagelo, inmaduros, otros];
  if(!values.every(isFinite)){
    drawStackedBar(svg, [], 'Completa la morfología para ver el gráfico');
    return;
  }
  const slices = [
    { label: 'Normal',    value: Math.max(normal,    0), color: '#1F4E96' },
    { label: 'Cabeza',    value: Math.max(cabeza,    0), color: '#C0392B' },
    { label: 'P. Media',  value: Math.max(pieza,     0), color: '#E67E22' },
    { label: 'Flagelo',   value: Math.max(flagelo,   0), color: '#8E44AD' },
    { label: 'Inmaduros', value: Math.max(inmaduros, 0), color: '#16A085' },
    { label: 'Otros',     value: Math.max(otros,     0), color: '#7F8C8D' }
  ];
  drawStackedBar(svg, slices, 'Completa la morfología para ver el gráfico', 16);
}

function stepCard(id, delta){
  const input = document.getElementById(id);
  if(!input) return;
  const step = parseFloat(input.getAttribute('step')) || 1;
  const decimals = (input.getAttribute('step') || '1').includes('.') ? (input.getAttribute('step').split('.')[1] || '').length : 0;
  const current = parseFloat(input.value) || 0;
  let next = current + delta;
  const min = input.hasAttribute('min') ? parseFloat(input.getAttribute('min')) : 0;
  if(!isNaN(min) && next < min) next = min;
  next = parseFloat(next.toFixed(decimals));
  input.value = next;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function syncVolumenFromMacros(){
  const macroEl = document.getElementById('m-a-print');
  const mainEl = document.getElementById('m-a');
  if(macroEl && mainEl) mainEl.value = macroEl.value;
  computeAll();
}

// ═══════════════════════════════════════════════
// VALIDACIÓN DE ENTRADAS (v21) — reemplaza a checkSum()
// No modifica ningún valor ingresado: solo marca los campos inválidos
// y bloquea el botón de impresión mientras exista alguno.
// ═══════════════════════════════════════════════
const CAMPOS_ENTEROS = ['m-c','m-d','m-e','m-g','m-h','m-i','m-j','m-k','m-l','m-esp-anormales','m-n','m-o','m-leuco','m-no-leuco'];
const CAMPOS_CON_LIMITE = {
  'm-a': LIMITES.volumen,
  'm-a-print': LIMITES.volumen,
  'm-ph': LIMITES.ph,
  'm-b': LIMITES.concentracion,
  'm-q': LIMITES.celulasRedondas
};
// Todos los campos numéricos editables (ninguno puede ser negativo)
const CAMPOS_NUMERICOS = ['p-abstinencia','m-a','m-a-print','m-ph','m-b','m-q'].concat(CAMPOS_ENTEROS);

function nombreCampo(input){
  const cont = input.closest('.card, .macro-field, .field');
  const lbl = cont ? cont.querySelector('.card-label, label') : null;
  return lbl ? lbl.textContent.trim() : input.id;
}

function errorDeCampo(input){
  if(input.validity && input.validity.badInput) return 'Valor no numérico';
  const raw = input.value.trim();
  if(raw === '') return '';
  const v = Number(raw);
  if(!isFinite(v)) return 'Valor no numérico';
  if(v < 0) return 'No puede ser negativo';
  if(CAMPOS_ENTEROS.includes(input.id) && !Number.isInteger(v)) return 'Debe ser un número entero';
  const lim = CAMPOS_CON_LIMITE[input.id];
  if(lim && (v < lim.min || v > lim.max)) return 'Fuera de rango (' + lim.min + ' – ' + lim.max + ')';
  return '';
}

function marcarCampo(input, mensaje){
  const contenedor = input.closest('.card, .macro-field, .field') || input.parentNode;
  let msgEl = document.getElementById('err-' + input.id);
  if(mensaje){
    input.classList.add('input-invalid');
    input.setAttribute('aria-invalid', 'true');
    if(!msgEl){
      msgEl = document.createElement('div');
      msgEl.id = 'err-' + input.id;
      msgEl.className = 'input-error-msg';
      contenedor.appendChild(msgEl);
    }
    msgEl.textContent = mensaje;
  } else {
    input.classList.remove('input-invalid');
    input.removeAttribute('aria-invalid');
    if(msgEl) msgEl.remove();
  }
}

function validateInputs(){
  const invalidos = [];
  CAMPOS_NUMERICOS.forEach(id => {
    const input = document.getElementById(id);
    if(!input) return;
    const msg = errorDeCampo(input);
    marcarCampo(input, msg);
    if(msg){
      const nombre = nombreCampo(input);
      if(!invalidos.includes(nombre)) invalidos.push(nombre);
    }
  });
  const aviso = document.getElementById('aviso-invalidos');
  const btnPrint = document.getElementById('btn-print');
  if(invalidos.length > 0){
    aviso.textContent = 'Hay valores inválidos: corrígelos antes de imprimir (' + invalidos.join(', ') + ').';
    aviso.style.display = '';
    btnPrint.disabled = true;
    btnPrint.title = 'Corrige los valores inválidos para poder imprimir';
  } else {
    aviso.textContent = '';
    aviso.style.display = 'none';
    btnPrint.disabled = false;
    btnPrint.removeAttribute('title');
  }
  return invalidos.length === 0;
}

function computeAll(){
  validateInputs();
  const a = val('m-a'), b = val('m-b');
  const c = val('m-c'), d = val('m-d'), e = val('m-e');
  const g = val('m-g'), h = val('m-h'), i = val('m-i'), j = val('m-j'), k = val('m-k'), l = val('m-l');
  const n = val('m-n'), o = val('m-o');
  const leuco = val('m-leuco'), noLeuco = val('m-no-leuco');

  // AUTO-TOTALES
  const f = sum([c,d,e]);
  const anyMot = [c,d,e].some(v => isFinite(v));
  document.getElementById('m-f').value = anyMot ? f : '';

  const m = sum([g,h,i,j,k,l]);
  const anyMorf = [g,h,i,j,k,l].some(v => isFinite(v));
  document.getElementById('m-esp-normales').value = isFinite(g) ? g : '';

  const p = sum([n,o]);
  const anyVit = [n,o].some(v => isFinite(v));
  document.getElementById('m-p').value = anyVit ? p : '';

  const leucoTotal = sum([leuco,noLeuco]);
  const anyLeuco = [leuco,noLeuco].some(v => isFinite(v));
  document.getElementById('m-leuco-total').value = anyLeuco ? leucoTotal : '';

  // SYNC VOLUMEN TO MACROS PRINT
  const aPrintEl = document.getElementById('m-a-print');
  if(aPrintEl) aPrintEl.value = isFinite(a) ? a : '';

  // aa — RECUENTO TOTAL: a × b
  const aa = (isFinite(a) && isFinite(b)) ? a * b : NaN;
  setOut('out-b', b, 2, 'x10⁶/ml');
  setOut('out-aa', aa, 2, 'x10⁶/eyac.');

  // MOTILIDAD
  const fVal = anyMot ? f : NaN;
  const bb = pct(c, fVal);                                            // bb = c/f×100
  const motNoProg = pct(d, fVal);                                     // d/f×100
  const noMot = pct(e, fVal);                                         // e/f×100
  const motTotal = pct((isFinite(c)?c:0)+(isFinite(d)?d:0), fVal);   // Ø = (c+d)/f×100
  const motProgTotal = (isFinite(a) && isFinite(b) && isFinite(bb)) ? a * b * (bb/100) : NaN; // a×b×bb/100

  setOut('out-motTotal', motTotal, 1, '%');
  setOut('out-bb', bb, 1, '%');
  setOut('out-motNoProg', motNoProg, 1, '%');
  setOut('out-noMot', noMot, 1, '%');
  setOut('out-motProgTotal', motProgTotal, 2, 'x10⁶');
  drawMotilityPie(bb, motNoProg, noMot);

  // MORFOLOGÍA
  const mVal = anyMorf ? m : NaN;
  const atVal = pct(g, mVal);   // @ = g/m×100
  setOut('out-at', atVal, 1, '%');
  setOut('out-anomCabeza', pct(h, mVal), 1, '%');
  setOut('out-anomPieza',  pct(i, mVal), 1, '%');
  setOut('out-anomFlagelo',pct(j, mVal), 1, '%');
  setOut('out-inmaduros',  pct(k, mVal), 1, '%');
  setOut('out-otros',      pct(l, mVal), 1, '%');
  drawMorphologyPie(atVal, pct(h,mVal), pct(i,mVal), pct(j,mVal), pct(k,mVal), pct(l,mVal));

  // & — VITALIDAD: n/p×100
  const pVal = anyVit ? p : NaN;
  setOut('out-amp', pct(n, pVal), 1, '%');

  // XY — Total anormales (usado internamente para el índice de teratozoospermia): h+i+j+k+l
  const xy = sum([h,i,j,l]);
  const anyAnorm = [h,i,j,l].some(v => isFinite(v));
  document.getElementById('m-anom-total').value = anyAnorm ? xy : '';
  setOut('out-anomTotal', anyAnorm ? pct(xy, mVal) : NaN, 1, '%');
  // LEUCOCITOS: α × (µ/π) × 100
  const q = val('m-q');
  setOut('out-celulas-redondas', q, 2, 'x10⁶/ml');
  const leucResult = (isFinite(q) && isFinite(leuco) && leucoTotal > 0) ? q * (leuco / leucoTotal) : NaN;
  setOut('out-leucocitos', leucResult, 3, 'x10⁶/ml');

  // ÍNDICE DE TERATOZOOSPERMIA: total de anomalías / espermatozoides anormales
  const espAnormales = val('m-esp-anormales');
  setOut('out-tzi', (anyAnorm && isFinite(espAnormales) && espAnormales > 0) ? xy / espAnormales : NaN, 2, '');
  
  // BAR CHART
  drawBarChart(b, motTotal, atVal, pct(n, pVal));

  // CONCLUSIÓN CLÍNICA
  computeConclusion(b, motTotal, atVal, pct(n, pVal));

  // SCORE SEMINAL
  computeScoreSeminal(b, motTotal, pct(n, pVal), atVal);
}

// ═══════════════════════════════════════════════
// SCORE SEMINAL — tabla de puntuación por escalones (umbral alcanzado)
// ═══════════════════════════════════════════════
// Puntos de referencia: [valor, score]
const SCORE_TABLE = {
  concentracion: [[6,0.5],[8,0.4],[10,0.3],[12,0.2],[14,0.1],[16,1.0],[18,1.1],[20,1.2],[22,1.3],[24,1.4],[26,1.5]],
  motilidad:     [[22,0.5],[26,0.4],[30,0.3],[34,0.2],[38,0.1],[42,1.0],[46,1.1],[50,1.2],[54,1.3],[58,1.4],[62,1.5]],
  vitalidad:     [[29,0.5],[34,0.4],[39,0.3],[44,0.2],[49,0.1],[54,1.0],[59,1.1],[64,1.2],[69,1.3],[74,1.4],[79,1.5]],
  morfologia:    [[1,0.5],[2,0.3],[3,0.1],[4,1.0],[5,1.1],[6,1.2],[7,1.3],[8,1.4],[9,1.5]]
};

// Score = el score del punto más alto de la tabla que sea <= valor.
// Si el valor no alcanza el primer punto, se usa el escalón más bajo (peor score).
function stepScore(value, table){
  if(!isFinite(value)) return NaN;
  if(value < table[0][0]) return table[0][1];
  let result = table[0][1];
  for(let idx = 0; idx < table.length; idx++){
    const [v, s] = table[idx];
    if(value >= v) result = s;
    else break;
  }
  return result;
}

function scoreClass(score){
  if(!isFinite(score)) return '';
  if(score < 1.0) return 'score-low';
  if(score === 1.0) return 'score-normal';
  return 'score-high';
}

function setScoreOut(id, score){
  const el = document.getElementById(id);
  if(!el) return;
  el.classList.remove('score-low','score-normal','score-high');
  if(isFinite(score)){
    el.textContent = score.toFixed(1).replace('.', ',');
    el.classList.add(scoreClass(score));
  } else {
    el.textContent = '—';
  }
}

function computeScoreSeminal(concentracion, motTotal, vitalidad, morfNormal){
  setScoreOut('score-conc', stepScore(concentracion, SCORE_TABLE.concentracion));
  setScoreOut('score-mot',  stepScore(motTotal,       SCORE_TABLE.motilidad));
  setScoreOut('score-vit',  stepScore(vitalidad,      SCORE_TABLE.vitalidad));
  setScoreOut('score-morf', stepScore(morfNormal,     SCORE_TABLE.morfologia));
}

function drawBarChart(concentracion, motTotal, morfNormal, vitalidad){
  const svg = document.getElementById('bar-chart');
  while(svg.firstChild) svg.removeChild(svg.firstChild);

  // Paleta clínica sobria
  const COLOR_OK  = '#2a8fa3';   // teal institucional, dentro de rango
  const COLOR_BAD = '#b04a3a';   // rojo discreto, fuera de rango
  const COLOR_BG  = '#EEEFF1';   // track gris claro
  const COLOR_REF = '#F5B400';   // línea/flecha referencia amarilla (contraste con celeste)

  const bars = [
    { label: 'Concentración',    unit: 'x10⁶/ml', ref: 16, val: concentracion, max: 80  },
    { label: 'Motilidad total',  unit: '%',        ref: 42, val: motTotal,      max: 100 },
    { label: 'Morfología normal',unit: '%',        ref: 4,  val: morfNormal,    max: 20  },
    { label: 'Vitalidad',        unit: '%',        ref: 54, val: vitalidad,     max: 100 },
  ];

  // Dimensiones compactas para PDF clínico
  const padL = 108, padR = 80, padT = 2;
  const barH = 5, gap = 7;
  const svgW = 420;
  const trackW = svgW - padL - padR;
  const totalH = padT + bars.length * (barH + gap) + 16;

  svg.setAttribute('viewBox', '0 0 ' + svgW + ' ' + totalH);
  svg.setAttribute('width', '100%');
  // v21: antes se hacía setAttribute('height','auto'), valor inválido para el
  // atributo SVG (el navegador lo ignoraba y lo reportaba como error en consola).
  // La altura automática ya la da el style="height:auto" del <svg> en el HTML.
  svg.removeAttribute('height');

  bars.forEach((bar, i) => {
    const y = padT + i * (barH + gap);
    const hasVal = isFinite(bar.val);
    const ratio  = hasVal ? Math.min(Math.max(bar.val / bar.max, 0), 1) : 0;
    const refX   = padL + (bar.ref / bar.max) * trackW;
    const ok     = hasVal && bar.val >= bar.ref;
    const fillColor = ok ? COLOR_OK : COLOR_BAD;

    // Etiqueta izquierda
    const lbl = document.createElementNS(SVG_NS, 'text');
    lbl.setAttribute('x', padL - 6);
    lbl.setAttribute('y', y + barH / 2 + 3.5);
    lbl.setAttribute('text-anchor', 'end');
    lbl.setAttribute('font-size', '8');
    lbl.setAttribute('font-weight', '500');
    lbl.setAttribute('fill', '#374151');
    lbl.textContent = bar.label;
    svg.appendChild(lbl);

    // Track fondo
    const track = document.createElementNS(SVG_NS, 'rect');
    track.setAttribute('x', padL);
    track.setAttribute('y', y);
    track.setAttribute('width', trackW);
    track.setAttribute('height', barH);
    track.setAttribute('rx', 3);
    track.setAttribute('fill', COLOR_BG);
    svg.appendChild(track);

    // Barra de valor
    if(hasVal && ratio > 0){
      const barW = Math.max(ratio * trackW, 4);
      const filled = document.createElementNS(SVG_NS, 'rect');
      filled.setAttribute('x', padL);
      filled.setAttribute('y', y);
      filled.setAttribute('width', barW);
      filled.setAttribute('height', barH);
      filled.setAttribute('rx', 3);
      filled.setAttribute('fill', fillColor);
      filled.setAttribute('fill-opacity', '0.82');
      svg.appendChild(filled);
    }

    // Flecha de referencia OMS
    const refArrow = document.createElementNS(SVG_NS, 'path');
    const ay2 = y - 2;
    refArrow.setAttribute('d', `M${refX-4},${ay2} L${refX+4},${ay2} L${refX},${ay2+7} Z`);
    refArrow.setAttribute('fill', COLOR_REF);
    svg.appendChild(refArrow);

    // Valor numérico — centrado en el área derecha (padR)
    const valTxt = document.createElementNS(SVG_NS, 'text');
    valTxt.setAttribute('x', svgW - padR / 2);
    valTxt.setAttribute('y', y + barH / 2 + 3.5);
    valTxt.setAttribute('text-anchor', 'middle');
    valTxt.setAttribute('font-size', '7');
    valTxt.setAttribute('font-weight', '700');
    valTxt.setAttribute('fill', hasVal ? fillColor : '#9AA1AE');
    valTxt.textContent = hasVal ? bar.val.toFixed(1) + ' ' + bar.unit : '—';
    svg.appendChild(valTxt);
  });

  // Leyenda inferior compacta — centrada bajo el track
  const legendY = padT + bars.length * (barH + gap) + 4;
  const legendTotalW = 380;
  const legendStartX = (svgW - legendTotalW) / 2;
  const items = [
    { color: COLOR_OK,  label: 'Dentro del rango OMS' },
    { color: COLOR_BAD, label: 'Por debajo del rango OMS' },
    { color: COLOR_REF, label: 'Ref. OMS', dashed: true },
  ];
  items.forEach((it, idx) => {
    const lx = legendStartX + idx * 128;
    if(it.dashed){
      const arrow = document.createElementNS(SVG_NS, 'path');
      const ax = lx + 5;
      const ay = legendY;
      // Flechita apuntando hacia abajo
      arrow.setAttribute('d', `M${ax-4},${ay} L${ax+4},${ay} L${ax},${ay+9} Z`);
      arrow.setAttribute('fill', COLOR_REF);
      svg.appendChild(arrow);
    } else {
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', lx); rect.setAttribute('y', legendY);
      rect.setAttribute('width', 9); rect.setAttribute('height', 8);
      rect.setAttribute('rx', 2); rect.setAttribute('fill', it.color);
      rect.setAttribute('fill-opacity', '0.82');
      svg.appendChild(rect);
    }
    const lt = document.createElementNS(SVG_NS, 'text');
    lt.setAttribute('x', lx + 13); lt.setAttribute('y', legendY + 8);
    lt.setAttribute('font-size', '6.5'); lt.setAttribute('fill', '#6B7280');
    lt.textContent = it.label;
    svg.appendChild(lt);
  });
}

function computeConclusion(b, motTotal, morfNormal, vitalidad){
  const el = document.getElementById('conclusion-body');
  if(!el) return;
  const diagnosticos = [];

  // CONCENTRACIÓN (b en x10⁶/ml)
  if(isFinite(b)){
    if(b === 0){
      diagnosticos.push('azoospérmico');
    } else if(b <= 0.1){
      diagnosticos.push('criptozoospérmico');
    } else if(b < 8){
      diagnosticos.push('oligozoospérmico severo');
    } else if(b < 16){
      diagnosticos.push('oligozoospérmico moderado');
    }
  }

  // MOTILIDAD TOTAL (Ø)
  if(isFinite(motTotal)){
    if(motTotal < 21){
      diagnosticos.push('astenozoospérmico severo');
    } else if(motTotal < 42){
      diagnosticos.push('astenozoospérmico moderado');
    }
  }

  // MORFOLOGÍA NORMAL (@)
  if(isFinite(morfNormal) && morfNormal < 4){
    diagnosticos.push('teratozoospérmico');
  }

  // VITALIDAD (&)
  if(isFinite(vitalidad) && vitalidad < 54){
    diagnosticos.push('necrozoospérmico');
  }

  // PARÁMETROS FALTANTES
  const faltantes = [];
  if(!isFinite(b))         faltantes.push('Concentración');
  if(!isFinite(motTotal))  faltantes.push('Motilidad');
  if(!isFinite(morfNormal))faltantes.push('Morfología');
  if(!isFinite(vitalidad)) faltantes.push('Vitalidad');

  let html = '';
  if(diagnosticos.length === 0){
    html = isFinite(b)
      ? '<span style="color:#0E7C7B; font-weight:600;">Eyaculado normozoospérmico</span>'
      : '<span style="color:#9AA1AE;">—</span>';
  } else {
    html = '<span style="font-weight:600;">Eyaculado ' + diagnosticos.join(', ') + '</span>';
  }

  if(faltantes.length > 0){
    html += '<div style="margin-top:6px; font-size:11px; color:#B23A3A;">⚠ Sin datos: ' + faltantes.join(' · ') + '</div>';
  }

  el.innerHTML = html;
}

function resetAll(){
  if(!confirm('¿Borrar todos los datos de la muestra actual?')) return;
  CAMPOS_PACIENTE.forEach(id=>{
    document.getElementById(id).value = '';
  });
  document.getElementById('p-referencia').value = 'OMS 2021';
  document.getElementById('p-edad').value = '';
  calcEdad();
  ['m-a','m-a-print','m-ph','m-licuefaccion','m-apariencia','m-viscosidad','m-aglutinacion',
   'm-globulos-rojos','m-debris',
   'm-b','m-q','m-c','m-d','m-e','m-g','m-h','m-i','m-j','m-k','m-l','m-n','m-o',
   'm-esp-anormales','m-leuco','m-no-leuco'].forEach(id=>{
    document.getElementById(id).value = '';
  });
  ['m-f','m-esp-normales','m-anom-total','m-p','m-leuco-total'].forEach(id=>{ document.getElementById(id).value = ''; });
  showPage(0);
  computeAll();
  document.getElementById('obs-texto').value = '';
  syncObs();
  // Los campos cambiados por código no disparan 'input': sincronizar el informe
  // impreso explícitamente. La firma NO se borra (mismo profesional entre muestras).
  syncPrintPatient();
  syncFirma();
}

function syncObs(){
  const txt = document.getElementById('obs-texto');
  const lineas = txt.value.split('\n');
  if(lineas.length > 6) txt.value = lineas.slice(0, 6).join('\n');
  document.getElementById('obs-print').textContent = txt.value;
}

function syncFirma(){
  const nombre = document.getElementById('firma-nombre').value || 'Nombre del profesional';
  const cargo  = document.getElementById('firma-cargo').value  || 'Biólogo';
  const cbp    = document.getElementById('firma-cbp').value    || 'C.B.P. 0000';
  document.getElementById('firma-print-nombre').textContent = nombre;
  document.getElementById('firma-print-cargo').textContent  = cargo;
  document.getElementById('firma-print-cbp').textContent    = cbp;
}

computeAll();
appReady = true;

// Sync print patient table
function syncPrintPatient(){
  const nombre = document.getElementById('p-nombre').value;
  const conyuge = document.getElementById('p-conyuge').value;
  const medico = document.getElementById('p-medico').value;
  const fecha = document.getElementById('p-fecha').value;
  const abstinencia = document.getElementById('p-abstinencia').value;
  const informe = document.getElementById('p-informe').value;
  const referencia = document.getElementById('p-referencia').value;
  const fechaNac = document.getElementById('p-fecha-nac').value;
  const institucion = document.getElementById('p-institucion').value;
  const operador = document.getElementById('p-operador').value;
  const horaEmision = document.getElementById('p-hora-emision').value;
  const horaRecepcion = document.getElementById('p-hora-recepcion').value;
  const horaProcesamiento = document.getElementById('p-hora-procesamiento').value;

  // Fila 1
  document.getElementById('pp-nombre').textContent = nombre || '—';
  const edadVal = document.getElementById('p-edad').value;
  document.getElementById('pp-edad-line').textContent = edadVal || '';
  document.getElementById('pp-referencia-display').textContent = referencia || '—';
  document.getElementById('pp-conyuge').textContent = conyuge || '—';
  document.getElementById('pp-medico').textContent = institucion || '—';
  const medicoSubEl = document.getElementById('pp-medico-sub-display');
  if(medicoSubEl) medicoSubEl.textContent = medico || '—';

  // Fila 2: cada dato en su propia celda
  if(fecha){ const d = new Date(fecha + 'T00:00:00'); document.getElementById('pp-fecha-display').textContent = d.toLocaleDateString('es-PE', {day:'numeric', month:'short', year:'numeric'}); }
  else { document.getElementById('pp-fecha-display').textContent = '—'; }

  document.getElementById('pp-abstinencia-display').textContent = abstinencia ? abstinencia + ' día' + (abstinencia == 1 ? '' : 's') : '—';

  document.getElementById('pp-hora-e').textContent = horaEmision || '—';
  document.getElementById('pp-hora-r').textContent = horaRecepcion || '—';
  document.getElementById('pp-hora-p').textContent = horaProcesamiento || '—';

  document.getElementById('pp-operador-display').textContent = operador || '—';

  const tipoSel = document.getElementById('p-tipo-muestra');
  document.getElementById('pp-tipo-muestra').textContent =
    (tipoSel.value && tipoSel.selectedIndex >= 0) ? tipoSel.options[tipoSel.selectedIndex].text : '—';

  document.querySelectorAll('.js-informe-num').forEach(el => { el.textContent = informe || '—'; });
}

CAMPOS_PACIENTE.forEach(id => {
  document.getElementById(id).addEventListener('input', syncPrintPatient);
});
// p-abstinencia no recalcula (no llama a computeAll): validarla al editar
document.getElementById('p-abstinencia').addEventListener('input', validateInputs);
syncPrintPatient();



// P0-4 — botón Demo solo con ?dev=1
if(new URLSearchParams(location.search).get('dev') === '1'){
  document.getElementById('btn-demo').style.display = '';
}

function loadDemo(){
  document.getElementById('p-nombre').value       = 'García López, Carlos Eduardo';
  document.getElementById('p-referencia').value   = 'OMS 2021';
  document.getElementById('p-conyuge').value      = 'García López, María';
  document.getElementById('p-fecha-nac').value    = '1991-03-15';
  calcEdad();
  document.getElementById('p-informe').value      = 'ESP-2025-0847';
  document.getElementById('print-informe-num-display').textContent = 'ESP-2025-0847';
  document.getElementById('p-fecha').value        = '2025-07-14';
  document.getElementById('p-medico').value       = 'Dr. Ramírez Flores, Jorge';
  document.getElementById('p-abstinencia').value  = '4';
  document.getElementById('p-institucion').value  = 'Concebir - San Isidro';
  document.getElementById('p-operador').value     = 'OP-001';
  document.getElementById('p-hora-emision').value       = '08:30';
  document.getElementById('p-hora-recepcion').value     = '08:45';
  document.getElementById('p-hora-procesamiento').value = '09:00';
  document.getElementById('m-a').value            = '3.2';
  document.getElementById('m-ph').value           = '7.4';
  document.getElementById('m-licuefaccion').value = 'completa';
  document.getElementById('m-apariencia').value   = 'normal';
  document.getElementById('m-viscosidad').value   = 'normal';
  document.getElementById('m-aglutinacion').value = 'ausente';
  document.getElementById('m-b').value            = '22';
  document.getElementById('m-q').value            = '0.8';
  document.getElementById('m-c').value            = '142';
  document.getElementById('m-d').value            = '28';
  document.getElementById('m-e').value            = '30';
  document.getElementById('m-g').value            = '30';
  document.getElementById('m-h').value            = '72';
  document.getElementById('m-i').value            = '44';
  document.getElementById('m-j').value            = '30';
  document.getElementById('m-k').value            = '14';
  document.getElementById('m-l').value            = '10';
  document.getElementById('m-n').value            = '158';
  document.getElementById('m-o').value            = '42';
  document.getElementById('m-leuco').value        = '8';
  document.getElementById('m-no-leuco').value     = '192';
  computeAll();
  syncPrintPatient();
}
