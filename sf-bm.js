// ── Tab switching ──────────────────────────────────────────
function showTab(id, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
}

// ── Support management ─────────────────────────────────────
let supportCount = 0;

function addSupport() {
  var container = document.getElementById('supportsContainer');
  if (!container) return;
  if (container.children.length >= 3) {
    alert('Maximum 3 supports allowed.'); return;
  }
  supportCount++;
  var id = 'sup-' + supportCount;
  var row = document.createElement('div');
  row.className = 'load-row type-point';
  row.id = id;
  row.style.borderLeftColor = '#e67e22';
  row.innerHTML =
    '<span class="load-num" style="color:#e67e22;">Support #' + supportCount + '</span>' +
    '<div class="input-group">' +
      '<label>Type</label>' +
      '<select class="sup-type">' +
        '<option value="pin">Pin</option>' +
        '<option value="roller">Roller</option>' +
        '<option value="fixed">Fixed</option>' +
      '</select>' +
    '</div>' +
    '<div class="input-group">' +
      '<label>Position (m from left)</label>' +
      '<input type="number" class="sup-pos" placeholder="e.g. 0" min="0" step="0.1"/>' +
    '</div>' +
    '<button class="remove-btn" onclick="removeRow(\'' + id + '\')">&#x2715;</button>';
  container.appendChild(row);
}

// ── Load row management ────────────────────────────────────
let rowCount = 0;

const rowConfig = {
  point: {
    label: 'Point Load',
    fields: [
      { cls: 'load-p', label: 'Load P (kN)',           placeholder: 'e.g. 10' },
      { cls: 'load-a', label: 'Position a (m from A)', placeholder: 'e.g. 2'  }
    ]
  },
  udl: {
    label: 'UDL',
    fields: [
      { cls: 'load-w', label: 'Intensity w (kN/m)', placeholder: 'e.g. 5' },
      { cls: 'load-a', label: 'Start a (m from A)', placeholder: 'e.g. 1' },
      { cls: 'load-b', label: 'End b (m from A)',   placeholder: 'e.g. 4' }
    ]
  },
  moment: {
    label: 'Applied Moment',
    fields: [
      { cls: 'load-m', label: 'Moment M (kN·m) +CW',  placeholder: 'e.g. 20' },
      { cls: 'load-a', label: 'Position a (m from A)', placeholder: 'e.g. 3'  }
    ]
  }
};

function addRow(type) {
  rowCount++;
  var cfg = rowConfig[type];
  var container = document.getElementById('loadsContainer');
  var row = document.createElement('div');
  row.className = 'load-row type-' + type;
  row.id = 'row-' + rowCount;

  var fieldsHTML = cfg.fields.map(function(f) {
    return '<div class="input-group"><label>' + f.label + '</label>' +
      '<input type="number" class="' + f.cls + '" placeholder="' + f.placeholder + '" step="0.1"/></div>';
  }).join('');

  row.innerHTML =
    '<span class="load-num">' + cfg.label + ' #' + rowCount + '</span>' +
    fieldsHTML +
    '<button class="remove-btn" onclick="removeRow(\'row-' + rowCount + '\')">&#x2715;</button>';
  container.appendChild(row);
}

function removeRow(id) {
  var el = document.getElementById(id);
  if (el) el.remove();
}

function clearAll() {
  document.getElementById('loadsContainer').innerHTML = '';
  document.getElementById('supportsContainer').innerHTML = '';
  document.getElementById('results').classList.add('hidden');
  document.getElementById('spanL').value = '';
  rowCount = 0; supportCount = 0;
  addSupport();
  document.querySelector('#supportsContainer .sup-pos').value = '0';
  addSupport();
  var supRows = document.querySelectorAll('#supportsContainer .load-row');
  if (supRows[1]) {
    supRows[1].querySelector('.sup-pos').value = '6';
    supRows[1].querySelector('.sup-type').value = 'roller';
  }
  addRow('point');
  localStorage.removeItem('sfbm_inputs');
}

// ── Calculate ──────────────────────────────────────────────
function calculate() {
  var L = parseFloat(document.getElementById('spanL').value);
  if (isNaN(L) || L <= 0) { alert('Enter a valid beam span L.'); return; }

  // Read supports
  var supRows = document.querySelectorAll('#supportsContainer .load-row');
  if (supRows.length === 0) { alert('Add at least one support.'); return; }

  var supports = [];
  for (var i = 0; i < supRows.length; i++) {
    var stype = supRows[i].querySelector('.sup-type').value;
    var spos  = parseFloat(supRows[i].querySelector('.sup-pos').value);
    if (isNaN(spos) || spos < 0 || spos > L) {
      alert('Support position must be between 0 and ' + L + ' m.'); return;
    }
    supports.push({ type: stype, pos: spos });
  }
  // Sort by position
  supports.sort(function(a, b) { return a.pos - b.pos; });

  // Determine beam type from supports
  var hasFixed  = supports.some(function(s) { return s.type === 'fixed'; });
  var support   = hasFixed ? 'cantilever' : 'simply';
  var posA      = supports[0].pos;
  var posB      = supports.length > 1 ? supports[supports.length - 1].pos : L;

  // Read loads
  var rows = document.querySelectorAll('#loadsContainer .load-row');
  if (rows.length === 0) { alert('Add at least one load.'); return; }

  var pointLoads = [], udls = [], moments = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (row.classList.contains('type-point')) {
      var P = parseFloat(row.querySelector('.load-p').value);
      var a = parseFloat(row.querySelector('.load-a').value);
      if (isNaN(P) || isNaN(a) || a < 0 || a > L) { alert('Check point load values.'); return; }
      pointLoads.push({ P: P, a: a });
    } else if (row.classList.contains('type-udl')) {
      var w  = parseFloat(row.querySelector('.load-w').value);
      var a1 = parseFloat(row.querySelector('.load-a').value);
      var b1 = parseFloat(row.querySelector('.load-b').value);
      if (isNaN(w) || isNaN(a1) || isNaN(b1) || a1 < 0 || b1 > L || a1 >= b1) {
        alert('Check UDL values.'); return;
      }
      udls.push({ w: w, a: a1, b: b1 });
    } else if (row.classList.contains('type-moment')) {
      var M  = parseFloat(row.querySelector('.load-m').value);
      var am = parseFloat(row.querySelector('.load-a').value);
      if (isNaN(M) || isNaN(am) || am < 0 || am > L) { alert('Check moment values.'); return; }
      moments.push({ M: M, a: am });
    }
  }

  var RA, RB, MA_fixed = 0;
  var span = posB - posA;

  if (support === 'simply' && supports.length >= 2) {
    // Simply supported: take moments about posA to find RB
    var sumMomA = 0;
    for (var j = 0; j < pointLoads.length; j++) sumMomA += pointLoads[j].P * (pointLoads[j].a - posA);
    for (var j = 0; j < udls.length; j++)       sumMomA += udls[j].w * (udls[j].b - udls[j].a) * ((udls[j].a + udls[j].b) / 2 - posA);
    for (var j = 0; j < moments.length; j++)    sumMomA += moments[j].M;
    RB = span > 0 ? sumMomA / span : 0;

    var sumFy = 0;
    for (var j = 0; j < pointLoads.length; j++) sumFy += pointLoads[j].P;
    for (var j = 0; j < udls.length; j++)       sumFy += udls[j].w * (udls[j].b - udls[j].a);
    RA = sumFy - RB;

    document.getElementById('raLabel').innerHTML = 'R<sub>A</sub> at ' + posA + ' m';
    document.getElementById('rbLabel').innerHTML = 'R<sub>B</sub> at ' + posB + ' m';
    document.getElementById('ra').textContent = RA.toFixed(2) + ' kN';
    document.getElementById('rb').textContent = RB.toFixed(2) + ' kN';
  } else {
    // Cantilever / single fixed support
    var sumFy2 = 0;
    for (var j = 0; j < pointLoads.length; j++) sumFy2 += pointLoads[j].P;
    for (var j = 0; j < udls.length; j++)       sumFy2 += udls[j].w * (udls[j].b - udls[j].a);
    RA = sumFy2; RB = 0;

    var sumMomA2 = 0;
    for (var j = 0; j < pointLoads.length; j++) sumMomA2 += pointLoads[j].P * (pointLoads[j].a - posA);
    for (var j = 0; j < udls.length; j++)       sumMomA2 += udls[j].w * (udls[j].b - udls[j].a) * ((udls[j].a + udls[j].b) / 2 - posA);
    for (var j = 0; j < moments.length; j++)    sumMomA2 += moments[j].M;
    MA_fixed = sumMomA2;

    document.getElementById('raLabel').innerHTML = 'R<sub>A</sub> at ' + posA + ' m';
    document.getElementById('rbLabel').innerHTML = 'Fixed Moment M<sub>A</sub>';
    document.getElementById('ra').textContent = RA.toFixed(2) + ' kN';
    document.getElementById('rb').textContent = MA_fixed.toFixed(2) + ' kN·m';
  }

  // Sample V(x) and M(x) across full beam length — use right-side convention
  // Also insert explicit left-side samples at every discontinuity for accurate diagrams
  var STEPS = 800;
  var sfArr = [], bmArr = [];

  // Collect all discontinuity x positions
  var discX = [posA, posB];
  for (var j = 0; j < pointLoads.length; j++) discX.push(pointLoads[j].a);
  for (var j = 0; j < udls.length; j++) { discX.push(udls[j].a); discX.push(udls[j].b); }
  for (var j = 0; j < moments.length; j++) discX.push(moments[j].a);
  discX = discX.filter(function(x) { return x >= 0 && x <= L; });

  for (var s = 0; s <= STEPS; s++) {
    var x  = (s / STEPS) * L;
    // Insert left-side sample just before any discontinuity at this x
    for (var d = 0; d < discX.length; d++) {
      if (Math.abs(discX[d] - x) < (L / STEPS) * 0.6 && discX[d] > 0 && discX[d] < L) {
        var vmLeft = computeVM(discX[d], support, posA, posB, RA, RB, MA_fixed, pointLoads, udls, moments, 'left');
        sfArr.push({ x: discX[d], v: vmLeft.V });
        bmArr.push({ x: discX[d], m: vmLeft.M });
      }
    }
    var vm = computeVM(x, support, posA, posB, RA, RB, MA_fixed, pointLoads, udls, moments, 'right');
    sfArr.push({ x: x, v: vm.V });
    bmArr.push({ x: x, m: vm.M });
  }
  // Sort by x
  sfArr.sort(function(a, b) { return a.x - b.x; });
  bmArr.sort(function(a, b) { return a.x - b.x; });

  var maxSF = 0, maxBM = 0, maxSFx = 0, maxBMx = 0;
  for (var j = 0; j < sfArr.length; j++) {
    if (Math.abs(sfArr[j].v) > maxSF) { maxSF = Math.abs(sfArr[j].v); maxSFx = sfArr[j].x; }
  }
  for (var j = 0; j < bmArr.length; j++) {
    if (Math.abs(bmArr[j].m) > maxBM) { maxBM = Math.abs(bmArr[j].m); maxBMx = bmArr[j].x; }
  }

  // Evaluate BM exactly at all key points (both left & right sides) to catch overhang moments
  // and SF=0 crossings inside UDL zones
  var keyCheckX = [0, L, posA, posB];
  for (var j = 0; j < pointLoads.length; j++) keyCheckX.push(pointLoads[j].a);
  for (var j = 0; j < udls.length; j++) { keyCheckX.push(udls[j].a); keyCheckX.push(udls[j].b); }
  for (var j = 0; j < moments.length; j++) keyCheckX.push(moments[j].a);
  // SF=0 crossings inside UDL zones
  for (var j = 0; j < udls.length; j++) {
    var ul = udls[j];
    var Vstart = computeVM(ul.a, support, posA, posB, RA, RB, MA_fixed, pointLoads, udls, moments, 'right').V;
    var Vend   = computeVM(ul.b, support, posA, posB, RA, RB, MA_fixed, pointLoads, udls, moments, 'left').V;
    if (Vstart * Vend <= 0 && ul.w !== 0) {
      var xzero = ul.a + Vstart / ul.w;
      if (xzero >= ul.a && xzero <= ul.b) keyCheckX.push(xzero);
    }
  }
  var sides = ['left', 'right'];
  for (var j = 0; j < keyCheckX.length; j++) {
    var kx = keyCheckX[j];
    if (kx < 0 || kx > L) continue;
    for (var s2 = 0; s2 < sides.length; s2++) {
      var km = computeVM(kx, support, posA, posB, RA, RB, MA_fixed, pointLoads, udls, moments, sides[s2]).M;
      if (Math.abs(km) > maxBM) { maxBM = Math.abs(km); maxBMx = kx; }
    }
  }

  document.getElementById('maxSF').innerHTML = maxSF.toFixed(2) + ' kN <span class="result-pos">at x = ' + maxSFx.toFixed(2) + ' m (from left end)</span>';
  document.getElementById('maxBM').innerHTML = maxBM.toFixed(2) + ' kN\xb7m <span class="result-pos">at x = ' + maxBMx.toFixed(2) + ' m (from left end)</span>';
  document.getElementById('results').classList.remove('hidden');

  buildCalcSteps(L, support, posA, posB, pointLoads, udls, moments, RA, RB, MA_fixed, sfArr, bmArr, maxSF, maxSFx, maxBM, maxBMx);

  drawBeam(L, supports, pointLoads, udls, moments);
  drawDiagrams(L, support, sfArr, bmArr, maxSF, maxBM, posA, posB);
  saveInputs();
}

// ── Step-by-step calculation display ──────────────────────

// Helper: compute V and M at a given x from the left
// side: 'left' = just before x (exclude loads AT x), 'right' = just after x (include loads AT x)
function computeVM(x, support, posA, posB, RA, RB, MA_fixed, pointLoads, udls, moments, side) {
  var left = (side === 'left');
  var V = 0, Mx = 0;
  // Reactions: include if strictly left of x, or at x for right-side
  if (left ? posA < x : posA <= x) { V += RA; Mx += RA * (x - posA); }
  if (support === 'simply' && (left ? posB < x : posB <= x)) { V += RB; Mx += RB * (x - posB); }
  if (support === 'cantilever' && (left ? posA < x : posA <= x)) { Mx -= MA_fixed; }
  // Point loads: include if strictly left of x, or at x for right-side
  for (var j = 0; j < pointLoads.length; j++) {
    var pl = pointLoads[j];
    if (left ? pl.a < x : pl.a <= x) { V -= pl.P; Mx -= pl.P * (x - pl.a); }
  }
  // UDLs: always continuous, include portion up to x
  for (var j = 0; j < udls.length; j++) {
    var ul = udls[j];
    if (x > ul.a) {
      var xEnd = Math.min(x, ul.b);
      var len  = xEnd - ul.a;
      V  -= ul.w * len;
      Mx -= ul.w * len * (x - (ul.a + xEnd) / 2);
    }
  }
  // Applied moments: include if strictly left of x, or at x for right-side
  for (var j = 0; j < moments.length; j++) {
    if (left ? moments[j].a < x : moments[j].a <= x) Mx -= moments[j].M;
  }
  return { V: V, M: Mx };
}

// Helper: build working string for V at x (left side = just before)
function sfWorking(x, support, posA, posB, RA, RB, pointLoads, udls, side) {
  var left = (side === 'left');
  var work = [];
  if (left ? posA < x : posA <= x) work.push('R<sub>A</sub>(' + RA.toFixed(2) + ')');
  if (support === 'simply' && (left ? posB < x : posB <= x)) work.push('R<sub>B</sub>(' + RB.toFixed(2) + ')');
  for (var j = 0; j < pointLoads.length; j++) {
    var pl = pointLoads[j];
    if (left ? pl.a < x : pl.a <= x) work.push('−P' + (j+1) + '(' + pl.P.toFixed(2) + ')');
  }
  for (var j = 0; j < udls.length; j++) {
    var ul = udls[j];
    if (x > ul.a) {
      var xEnd = Math.min(x, ul.b);
      var len  = xEnd - ul.a;
      work.push('−w' + (j+1) + '\xd7' + len.toFixed(3) + '(' + (ul.w * len).toFixed(2) + ')');
    }
  }
  return work.length ? work.join(' + ') : '0';
}

// Helper: build working string for M at x (left side = just before)
function bmWorking(x, support, posA, posB, RA, RB, MA_fixed, pointLoads, udls, moments, side) {
  var left = (side === 'left');
  var work = [];
  if (left ? posA < x : posA <= x) work.push('R<sub>A</sub>\xd7' + (x - posA).toFixed(3));
  if (support === 'simply' && (left ? posB < x : posB <= x)) work.push('R<sub>B</sub>\xd7(' + (x - posB).toFixed(3) + ')');
  if (support === 'cantilever' && (left ? posA < x : posA <= x)) work.push('−M<sub>A</sub>(' + MA_fixed.toFixed(2) + ')');
  for (var j = 0; j < pointLoads.length; j++) {
    var pl = pointLoads[j];
    if (left ? pl.a < x : pl.a <= x) work.push('−P' + (j+1) + '\xd7' + (x - pl.a).toFixed(3));
  }
  for (var j = 0; j < udls.length; j++) {
    var ul = udls[j];
    if (x > ul.a) {
      var xEnd = Math.min(x, ul.b);
      var len  = xEnd - ul.a;
      work.push('−w' + (j+1) + '\xd7' + len.toFixed(3) + '\xd7' + (x - (ul.a + xEnd) / 2).toFixed(3));
    }
  }
  for (var j = 0; j < moments.length; j++) {
    if (left ? moments[j].a < x : moments[j].a <= x) work.push('−M' + (j+1) + '(' + moments[j].M.toFixed(2) + ')');
  }
  return work.length ? work.join(' + ') : '0';
}

function buildCalcSteps(L, support, posA, posB, pointLoads, udls, moments, RA, RB, MA_fixed, sfArr, bmArr, maxSF, maxSFx, maxBM, maxBMx) {
  var el = document.getElementById('calcSteps');
  if (!el) return;

  var html = '<h4 class="steps-title">\ud83d\udcd0 Step-by-Step Calculation</h4>';
  html += '<p class="steps-note">\ud83d\udccc All positions (x) are measured from the <strong>left end of the beam</strong> (x = 0)</p>';

  // ── STEP 1: Given data ──────────────────────────────────
  html += '<div class="step-block">';
  html += '<div class="step-head">Step 1 \u2014 Given Data</div>';
  html += '<div class="step-body">';
  html += '<p>Beam span: <strong>L = ' + L + ' m</strong></p>';
  html += '<p>Beam type: <strong>' + (support === 'simply' ? 'Simply Supported' : 'Cantilever (Fixed)') + '</strong></p>';
  if (support === 'simply') {
    html += '<p>Support A at <strong>x = ' + posA + ' m</strong> &nbsp;|&nbsp; Support B at <strong>x = ' + posB + ' m</strong></p>';
  } else {
    html += '<p>Fixed support at <strong>x = ' + posA + ' m</strong></p>';
  }
  for (var i = 0; i < pointLoads.length; i++)
    html += '<p>Point Load P' + (i+1) + ' = <strong>' + pointLoads[i].P + ' kN</strong> at x = ' + pointLoads[i].a + ' m</p>';
  for (var i = 0; i < udls.length; i++)
    html += '<p>UDL w' + (i+1) + ' = <strong>' + udls[i].w + ' kN/m</strong> from x = ' + udls[i].a + ' m to x = ' + udls[i].b + ' m</p>';
  for (var i = 0; i < moments.length; i++)
    html += '<p>Applied Moment M' + (i+1) + ' = <strong>' + moments[i].M + ' kN\xb7m</strong> at x = ' + moments[i].a + ' m</p>';
  html += '</div></div>';

  // ── STEP 2: Reactions ───────────────────────────────────
  html += '<div class="step-block">';
  if (support === 'simply') {
    html += '<div class="step-head">Step 2 \u2014 Reactions (\u03a3M<sub>A</sub> = 0)</div>';
    html += '<div class="step-body">';
    var momTerms = [];
    for (var i = 0; i < pointLoads.length; i++)
      momTerms.push('<strong>' + pointLoads[i].P + '</strong> \xd7 ' + (pointLoads[i].a - posA).toFixed(3));
    for (var i = 0; i < udls.length; i++) {
      var ulen = udls[i].b - udls[i].a;
      var ucg  = ((udls[i].a + udls[i].b) / 2 - posA).toFixed(3);
      momTerms.push('<strong>' + udls[i].w + '</strong> \xd7 ' + ulen.toFixed(3) + ' \xd7 ' + ucg);
    }
    for (var i = 0; i < moments.length; i++)
      momTerms.push('<strong>' + moments[i].M + '</strong> (moment)');
    var rspan = posB - posA;
    var sumMom = 0;
    for (var i = 0; i < pointLoads.length; i++) sumMom += pointLoads[i].P * (pointLoads[i].a - posA);
    for (var i = 0; i < udls.length; i++) sumMom += udls[i].w * (udls[i].b - udls[i].a) * ((udls[i].a + udls[i].b) / 2 - posA);
    for (var i = 0; i < moments.length; i++) sumMom += moments[i].M;
    html += '<p class="step-formula">R<sub>B</sub> \xd7 ' + rspan.toFixed(3) + ' = ' + momTerms.join(' + ') + ' = <strong>' + sumMom.toFixed(3) + '</strong></p>';
    html += '<p class="step-formula">R<sub>B</sub> = ' + sumMom.toFixed(3) + ' / ' + rspan.toFixed(3) + ' = <strong>' + RB.toFixed(2) + ' kN</strong></p>';
    var sumFy = 0;
    for (var i = 0; i < pointLoads.length; i++) sumFy += pointLoads[i].P;
    for (var i = 0; i < udls.length; i++) sumFy += udls[i].w * (udls[i].b - udls[i].a);
    html += '<p class="step-formula">\u03a3F<sub>y</sub> = 0 \u2192 R<sub>A</sub> = ' + sumFy.toFixed(3) + ' \u2212 ' + RB.toFixed(3) + ' = <strong>' + RA.toFixed(2) + ' kN</strong></p>';
  } else {
    html += '<div class="step-head">Step 2 \u2014 Reactions (Cantilever)</div>';
    html += '<div class="step-body">';
    var sumFy2 = 0;
    for (var i = 0; i < pointLoads.length; i++) sumFy2 += pointLoads[i].P;
    for (var i = 0; i < udls.length; i++) sumFy2 += udls[i].w * (udls[i].b - udls[i].a);
    html += '<p class="step-formula">\u03a3F<sub>y</sub> = 0 \u2192 R<sub>A</sub> = ' + sumFy2.toFixed(3) + ' = <strong>' + RA.toFixed(2) + ' kN</strong></p>';
    html += '<p class="step-formula">\u03a3M<sub>A</sub> = 0 \u2192 M<sub>A</sub> = <strong>' + MA_fixed.toFixed(2) + ' kN\xb7m</strong></p>';
  }
  html += '</div></div>';

  // ── Build nominal section list ──────────────────────────
  var eps = 1e-6;
  var nominals = [0];
  if (posA > 0 && posA < L) nominals.push(posA);
  for (var i = 0; i < pointLoads.length; i++) nominals.push(pointLoads[i].a);
  for (var i = 0; i < udls.length; i++) { nominals.push(udls[i].a); nominals.push(udls[i].b); }
  for (var i = 0; i < moments.length; i++) nominals.push(moments[i].a);
  if (support === 'simply' && posB > 0 && posB < L) nominals.push(posB);
  nominals.push(L);
  nominals = nominals.filter(function(x) { return x >= 0 && x <= L; });
  nominals.sort(function(a, b) { return a - b; });
  nominals = nominals.filter(function(x, idx) { return idx === 0 || Math.abs(x - nominals[idx-1]) > 1e-9; });

  // ── STEP 3: SF both sides ───────────────────────────────
  html += '<div class="step-block">';
  html += '<div class="step-head">Step 3 \u2014 Shear Force (Left side &amp; Right side at each section)</div>';
  html += '<div class="step-body">';
  html += '<p style="font-size:0.85rem;color:#666;margin-bottom:8px;">V<sup>\u2212</sup> = SF just before &nbsp;|&nbsp; V<sup>+</sup> = SF just after &nbsp;(jump at point loads &amp; reactions)</p>';
  html += '<div class="table-wrap"><table class="steps-table">';
  html += '<thead><tr><th>Section (x)</th><th>V<sup>\u2212</sup> (kN)</th><th>V<sup>+</sup> (kN)</th><th>Working (just before)</th></tr></thead><tbody>';

  for (var i = 0; i < nominals.length; i++) {
    var xn = nominals[i];
    var vmL  = computeVM(xn, support, posA, posB, RA, RB, MA_fixed, pointLoads, udls, moments, 'left');
    var vmR  = computeVM(xn, support, posA, posB, RA, RB, MA_fixed, pointLoads, udls, moments, 'right');
    var wkSF = sfWorking(xn, support, posA, posB, RA, RB, pointLoads, udls, 'left');
    var diff = Math.abs(vmR.V - vmL.V) > 0.005;
    html += '<tr' + (diff ? ' class="sf-jump"' : '') + '>';
    html += '<td>x = ' + xn.toFixed(3) + ' m</td>';
    html += '<td><strong>' + vmL.V.toFixed(2) + '</strong></td>';
    html += '<td><strong>' + vmR.V.toFixed(2) + '</strong>' + (diff ? ' <span class="jump-tag">jump</span>' : '') + '</td>';
    html += '<td>' + wkSF + '</td>';
    html += '</tr>';
  }
  html += '</tbody></table></div>';
  html += '<p class="step-highlight">\u2756 Max |SF| = <strong>' + maxSF.toFixed(2) + ' kN</strong> at x = ' + maxSFx.toFixed(2) + ' m</p>';
  html += '</div></div>';

  // ── STEP 4: SF = 0 → Max BM ────────────────────────────
  html += '<div class="step-block">';
  html += '<div class="step-head">Step 4 \u2014 Location where SF = 0 \u2192 Maximum Bending Moment</div>';
  html += '<div class="step-body">';

  var zeroPoints = [];
  for (var i = 0; i < nominals.length - 1; i++) {
    var xa = nominals[i] + eps;
    var xb = nominals[i+1] - eps;
    if (xb <= xa) continue;
    var Va = computeVM(xa, support, posA, posB, RA, RB, MA_fixed, pointLoads, udls, moments, 'right').V;
    var Vb = computeVM(xb, support, posA, posB, RA, RB, MA_fixed, pointLoads, udls, moments, 'right').V;

    if (Math.abs(Va) < 0.001) {
      // Only add if not at beam end or support
      if (xa > 0.001 && xa < L - 0.001 && Math.abs(xa - posA) > 0.001 && Math.abs(xa - posB) > 0.001)
        zeroPoints.push({ x: xa, how: 'exact' });
      continue;
    }
    if (Math.abs(Vb) < 0.001) {
      if (xb > 0.001 && xb < L - 0.001 && Math.abs(xb - posA) > 0.001 && Math.abs(xb - posB) > 0.001)
        zeroPoints.push({ x: xb, how: 'exact' });
      continue;
    }

    if (Va * Vb < 0) {
      // Find active UDL in this segment
      var activeUDL = null;
      for (var j = 0; j < udls.length; j++) {
        if (udls[j].a <= xa + eps && udls[j].b >= xb - eps) { activeUDL = udls[j]; break; }
      }
      if (activeUDL) {
        // V(x) = Va - w*(x - xa) = 0  =>  x = xa + Va/w
        var xz = xa + Va / activeUDL.w;
        if (xz >= xa && xz <= xb)
          zeroPoints.push({ x: xz, how: 'udl', udlIdx: udls.indexOf(activeUDL), Va: Va, w: activeUDL.w, xa: xa });
      } else {
        // Bisection
        var lo = xa, hi = xb, Vlo = Va;
        for (var iter = 0; iter < 60; iter++) {
          var mid = (lo + hi) / 2;
          var Vm = computeVM(mid, support, posA, posB, RA, RB, MA_fixed, pointLoads, udls, moments, 'right').V;
          if (Math.abs(Vm) < 1e-8) { lo = hi = mid; break; }
          if (Vlo * Vm < 0) hi = mid; else { lo = mid; Vlo = Vm; }
        }
        zeroPoints.push({ x: (lo + hi) / 2, how: 'bisect' });
      }
    }
  }
  // Also check nominals themselves — but skip beam ends and support positions
  for (var i = 0; i < nominals.length; i++) {
    var nx = nominals[i];
    if (Math.abs(nx) < 0.001 || Math.abs(nx - L) < 0.001) continue; // skip beam ends
    if (Math.abs(nx - posA) < 0.001 || Math.abs(nx - posB) < 0.001) continue; // skip supports
    var vm0 = computeVM(nx, support, posA, posB, RA, RB, MA_fixed, pointLoads, udls, moments, 'right');
    if (Math.abs(vm0.V) < 0.001) {
      var already = zeroPoints.some(function(z) { return Math.abs(z.x - nx) < 0.01; });
      if (!already) zeroPoints.push({ x: nx, how: 'exact' });
    }
  }
  zeroPoints.sort(function(a, b) { return a.x - b.x; });

  // Remove trivial zeros: beam ends, support positions, and points where M≈0
  var supportPositions = [posA, posB];
  zeroPoints = zeroPoints.filter(function(zp) {
    if (Math.abs(zp.x) < 0.001 || Math.abs(zp.x - L) < 0.001) return false; // beam ends
    for (var k = 0; k < supportPositions.length; k++) {
      if (Math.abs(zp.x - supportPositions[k]) < 0.001) return false; // at support
    }
    var Mcheck = computeVM(zp.x, support, posA, posB, RA, RB, MA_fixed, pointLoads, udls, moments, 'right').M;
    if (Math.abs(Mcheck) < 0.001) return false; // M≈0, not a useful max BM point
    return true;
  });

  if (zeroPoints.length === 0) {
    html += '<p>No interior SF = 0 crossing found. Max BM occurs at a support or load point.</p>';
    html += '<p class="step-highlight">\u2756 Max |BM| = <strong>' + maxBM.toFixed(2) + ' kN\xb7m</strong> &nbsp;|&nbsp; Position: x = <strong>' + maxBMx.toFixed(4) + ' m</strong> (from left end)</p>';
  } else {
    for (var i = 0; i < zeroPoints.length; i++) {
      var zp = zeroPoints[i];
      var xz = zp.x;
      var Mz = computeVM(xz, support, posA, posB, RA, RB, MA_fixed, pointLoads, udls, moments, 'right').M;
      var wkBMz = bmWorking(xz, support, posA, posB, RA, RB, MA_fixed, pointLoads, udls, moments, 'right');
      if (zp.how === 'udl') {
        var ul0 = udls[zp.udlIdx];
        html += '<p class="step-formula">Within UDL (w = ' + ul0.w + ' kN/m):<br>V(x) = ' + zp.Va.toFixed(3) + ' \u2212 ' + ul0.w + '\xd7(x \u2212 ' + zp.xa.toFixed(3) + ') = 0</p>';
        html += '<p class="step-formula">Position where SF = 0 &nbsp;\u2192&nbsp; x<sub>0</sub> = ' + zp.xa.toFixed(3) + ' + ' + zp.Va.toFixed(3) + ' / ' + ul0.w + ' = <strong>' + xz.toFixed(4) + ' m</strong></p>';
      } else {
        html += '<p class="step-formula">Position where SF = 0 &nbsp;\u2192&nbsp; x<sub>0</sub> = <strong>' + xz.toFixed(4) + ' m</strong></p>';
      }
      html += '<p class="step-formula">M at x<sub>0</sub> = ' + xz.toFixed(4) + ' m &nbsp;\u2192&nbsp; ' + wkBMz + ' = <strong>' + Mz.toFixed(2) + ' kN\xb7m</strong></p>';
      var sfAtZ = computeVM(xz, support, posA, posB, RA, RB, MA_fixed, pointLoads, udls, moments, 'right').V;
      html += '<p class="step-formula">SF at x<sub>0</sub> = ' + xz.toFixed(4) + ' m &nbsp;\u2192&nbsp; V = <strong>' + sfAtZ.toFixed(2) + ' kN</strong></p>';
      html += '<p class="step-highlight">\u2756 Max BM (at SF = 0) &nbsp;|&nbsp; Position: x<sub>0</sub> = <strong>' + xz.toFixed(4) + ' m</strong> (from left end) &nbsp;|&nbsp; M = <strong>' + Mz.toFixed(2) + ' kN\xb7m</strong></p>';
    }
  }
  html += '</div></div>';

  // ── STEP 5: BM both sides ───────────────────────────────
  html += '<div class="step-block">';
  html += '<div class="step-head">Step 5 \u2014 Bending Moment (Left side &amp; Right side at each section)</div>';
  html += '<div class="step-body">';
  html += '<p style="font-size:0.85rem;color:#666;margin-bottom:8px;">M<sup>\u2212</sup> = BM just before &nbsp;|&nbsp; M<sup>+</sup> = BM just after &nbsp;(jump only at applied moments)</p>';
  html += '<div class="table-wrap"><table class="steps-table">';
  html += '<thead><tr><th>Section (x)</th><th>M<sup>\u2212</sup> (kN\xb7m)</th><th>M<sup>+</sup> (kN\xb7m)</th><th>Working (just before)</th></tr></thead><tbody>';

  for (var i = 0; i < nominals.length; i++) {
    var xn2 = nominals[i];
    var vmL2 = computeVM(xn2, support, posA, posB, RA, RB, MA_fixed, pointLoads, udls, moments, 'left');
    var vmR2 = computeVM(xn2, support, posA, posB, RA, RB, MA_fixed, pointLoads, udls, moments, 'right');
    var wkBM2 = bmWorking(xn2, support, posA, posB, RA, RB, MA_fixed, pointLoads, udls, moments, 'left');
    var diff2 = Math.abs(vmR2.M - vmL2.M) > 0.005;
    html += '<tr' + (diff2 ? ' class="sf-jump"' : '') + '>';
    html += '<td>x = ' + xn2.toFixed(3) + ' m</td>';
    html += '<td><strong>' + vmL2.M.toFixed(2) + '</strong></td>';
    html += '<td><strong>' + vmR2.M.toFixed(2) + '</strong>' + (diff2 ? ' <span class="jump-tag">jump</span>' : '') + '</td>';
    html += '<td>' + wkBM2 + '</td>';
    html += '</tr>';
  }
  html += '</tbody></table></div>';
  html += '<p class="step-highlight">\u2756 Max |BM| = <strong>' + maxBM.toFixed(2) + ' kN\xb7m</strong> &nbsp;|&nbsp; Position: x = <strong>' + maxBMx.toFixed(4) + ' m</strong> (from left end)</p>';
  html += '</div></div>';

  el.innerHTML = html;
}

// ── Beam visualisation ─────────────────────────────────────
function drawBeam(L, supports, pointLoads, udls, moments) {
  var canvas = document.getElementById('beamCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  var padL = 60, padR = 40;
  var beamW = W - padL - padR;
  var scale = beamW / L;
  var beamY = 62;
  var bx = function(x) { return padL + x * scale; };

  // Beam bar
  ctx.fillStyle = '#4a90d9';
  ctx.beginPath();
  ctx.roundRect(padL, beamY - 6, beamW, 12, 3);
  ctx.fill();

  // Draw each support at its position
  supports.forEach(function(s) {
    var px = bx(s.pos);
    ctx.fillStyle = '#e67e22';
    if (s.type === 'fixed') {
      ctx.fillStyle = '#555';
      ctx.fillRect(px - 7, beamY - 28, 14, 56);
      ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
      for (var y = beamY - 28; y < beamY + 28; y += 8) {
        ctx.beginPath(); ctx.moveTo(px - 7, y); ctx.lineTo(px - 19, y + 8); ctx.stroke();
      }
      ctx.fillStyle = '#555'; ctx.font = '10px Segoe UI';
      ctx.fillText('Fixed(' + s.pos + 'm)', px - 22, beamY + 46);
    } else if (s.type === 'pin') {
      ctx.fillStyle = '#e67e22';
      ctx.beginPath();
      ctx.moveTo(px, beamY + 6); ctx.lineTo(px - 13, beamY + 28); ctx.lineTo(px + 13, beamY + 28);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px - 17, beamY + 30); ctx.lineTo(px + 17, beamY + 30); ctx.stroke();
      ctx.fillStyle = '#555'; ctx.font = '10px Segoe UI';
      ctx.fillText('Pin(' + s.pos + 'm)', px - 18, beamY + 46);
    } else {
      // Roller
      ctx.fillStyle = '#e67e22';
      ctx.beginPath();
      ctx.moveTo(px, beamY + 6); ctx.lineTo(px - 13, beamY + 28); ctx.lineTo(px + 13, beamY + 28);
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(px, beamY + 34, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#555'; ctx.font = '10px Segoe UI';
      ctx.fillText('Roller(' + s.pos + 'm)', px - 22, beamY + 50);
    }
  });

  // UDLs
  for (var i = 0; i < udls.length; i++) {
    var ul = udls[i];
    ctx.strokeStyle = '#27ae60'; ctx.lineWidth = 1.5;
    var step = Math.max(14, (ul.b - ul.a) * scale / 7);
    for (var px2 = bx(ul.a); px2 <= bx(ul.b) + 1; px2 += step) {
      ctx.beginPath(); ctx.moveTo(px2, beamY - 28); ctx.lineTo(px2, beamY - 8); ctx.stroke();
      ctx.fillStyle = '#27ae60';
      ctx.beginPath(); ctx.moveTo(px2, beamY - 8); ctx.lineTo(px2 - 4, beamY - 16); ctx.lineTo(px2 + 4, beamY - 16); ctx.closePath(); ctx.fill();
    }
    ctx.beginPath(); ctx.moveTo(bx(ul.a), beamY - 28); ctx.lineTo(bx(ul.b), beamY - 28); ctx.stroke();
    ctx.fillStyle = '#27ae60'; ctx.font = '10px Segoe UI';
    ctx.fillText('w=' + ul.w + ' kN/m', (bx(ul.a) + bx(ul.b)) / 2 - 24, beamY - 32);
  }

  // Point loads
  for (var i = 0; i < pointLoads.length; i++) {
    var pl = pointLoads[i];
    ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx(pl.a), beamY - 38); ctx.lineTo(bx(pl.a), beamY - 8); ctx.stroke();
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath(); ctx.moveTo(bx(pl.a), beamY - 8); ctx.lineTo(bx(pl.a) - 5, beamY - 18); ctx.lineTo(bx(pl.a) + 5, beamY - 18); ctx.closePath(); ctx.fill();
    ctx.font = '10px Segoe UI'; ctx.fillText(pl.P + ' kN', bx(pl.a) + 5, beamY - 30);
  }

  // Moments
  for (var i = 0; i < moments.length; i++) {
    var mo = moments[i];
    ctx.strokeStyle = '#8e44ad'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(bx(mo.a), beamY, 16, -Math.PI * 0.9, Math.PI * 0.1); ctx.stroke();
    ctx.fillStyle = '#8e44ad';
    ctx.beginPath(); ctx.moveTo(bx(mo.a) + 16, beamY + 2); ctx.lineTo(bx(mo.a) + 10, beamY - 4); ctx.lineTo(bx(mo.a) + 22, beamY - 4); ctx.closePath(); ctx.fill();
    ctx.font = '10px Segoe UI'; ctx.fillText(mo.M + ' kN·m', bx(mo.a) + 18, beamY - 10);
  }

  ctx.fillStyle = '#888'; ctx.font = '11px Segoe UI';
  ctx.fillText('L = ' + L + ' m', W / 2 - 20, H - 4);
}

// ── SFD / BMD drawing ──────────────────────────────────────
function resizeDiagramCanvas(id) {
  var c = document.getElementById(id);
  if (!c) return c;
  var w = Math.floor(c.parentElement.getBoundingClientRect().width) || 700;
  c.width  = w;
  c.height = Math.max(220, Math.floor(w * 0.3));
  return c;
}

function drawSingleDiagram(canvasId, L, arr, stroke, fill, unit, label) {
  var canvas = resizeDiagramCanvas(canvasId);
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  var padL = 76, padR = 20, padT = 20, padB = 30;
  var plotW = W - padL - padR;
  var plotH = H - padT - padB;
  var midY  = padT + plotH / 2;
  var bx    = function(x) { return padL + (x / L) * plotW; };

  var maxVal = 0;
  for (var k = 0; k < arr.length; k++) if (Math.abs(arr[k].v) > maxVal) maxVal = Math.abs(arr[k].v);
  var amp   = plotH / 2 * 0.88;
  var scl   = maxVal > 0 ? amp / maxVal : 1;

  // background
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, W, H);

  // grid lines
  ctx.strokeStyle = '#eee'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
  for (var g = 1; g <= 4; g++) {
    var gy = padT + (plotH / 4) * g;
    ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(W - padR, gy); ctx.stroke();
  }
  ctx.setLineDash([]);

  // zero baseline
  ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(padL, midY); ctx.lineTo(W - padR, midY); ctx.stroke();

  // filled area
  ctx.beginPath();
  ctx.moveTo(bx(0), midY);
  for (var k = 0; k < arr.length; k++) ctx.lineTo(bx(arr[k].x), midY - arr[k].v * scl);
  ctx.lineTo(bx(L), midY);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();

  // curve line
  ctx.beginPath();
  for (var k = 0; k < arr.length; k++) {
    if (k === 0) ctx.moveTo(bx(arr[k].x), midY - arr[k].v * scl);
    else         ctx.lineTo(bx(arr[k].x), midY - arr[k].v * scl);
  }
  ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; ctx.setLineDash([]);
  ctx.stroke();

  // Y-axis labels
  ctx.fillStyle = '#888'; ctx.font = '10px Segoe UI'; ctx.textAlign = 'right';
  ctx.fillText('0', padL - 6, midY + 4);
  if (maxVal > 0) {
    ctx.fillText('+' + maxVal.toFixed(2) + unit, padL - 6, padT + amp * 0.12 + 4);
    ctx.fillText('-' + maxVal.toFixed(2) + unit, padL - 6, midY + amp + 4);
  }

  // peak label
  var maxPt = arr[0];
  for (var k = 1; k < arr.length; k++) if (Math.abs(arr[k].v) > Math.abs(maxPt.v)) maxPt = arr[k];
  var py = midY - maxPt.v * scl;
  ctx.fillStyle = stroke; ctx.font = 'bold 11px Segoe UI'; ctx.textAlign = 'left';
  ctx.fillText(maxPt.v.toFixed(2) + unit, bx(maxPt.x) + 5, maxPt.v >= 0 ? py - 6 : py + 14);

  // X-axis ticks
  ctx.fillStyle = '#999'; ctx.font = '10px Segoe UI'; ctx.textAlign = 'center';
  var ticks = Math.min(10, Math.floor(L));
  for (var t = 0; t <= ticks; t++) {
    var tx = (t / ticks) * L;
    ctx.fillText(tx.toFixed(1) + 'm', bx(tx), H - 6);
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx(tx), padT); ctx.lineTo(bx(tx), H - padB); ctx.stroke();
  }

  ctx.textAlign = 'left';
}

function drawDiagrams(L, support, sfArr, bmArr, maxSF, maxBM, posA, posB) {
  var bmMapped = bmArr.map(function(b) { return { x: b.x, v: b.m }; });

  drawSingleDiagram('sfdCanvas', L, sfArr,    '#e74c3c', 'rgba(231,76,60,0.15)',   ' kN',   'SFD');
  drawSingleDiagram('bmdCanvas', L, bmMapped, '#27ae60', 'rgba(39,174,96,0.15)',   ' kN·m', 'BMD');
}

// ── Save / Restore inputs via localStorage ─────────────────
function saveInputs() {
  var data = {
    spanL: document.getElementById('spanL').value,
    supports: [],
    loads: []
  };
  document.querySelectorAll('#supportsContainer .load-row').forEach(function(row) {
    data.supports.push({
      type: row.querySelector('.sup-type').value,
      pos:  row.querySelector('.sup-pos').value
    });
  });
  document.querySelectorAll('#loadsContainer .load-row').forEach(function(row) {
    if (row.classList.contains('type-point')) {
      data.loads.push({ kind: 'point', p: row.querySelector('.load-p').value, a: row.querySelector('.load-a').value });
    } else if (row.classList.contains('type-udl')) {
      data.loads.push({ kind: 'udl', w: row.querySelector('.load-w').value, a: row.querySelector('.load-a').value, b: row.querySelector('.load-b').value });
    } else if (row.classList.contains('type-moment')) {
      data.loads.push({ kind: 'moment', m: row.querySelector('.load-m').value, a: row.querySelector('.load-a').value });
    }
  });
  localStorage.setItem('sfbm_inputs', JSON.stringify(data));
}

function restoreInputs() {
  var raw = localStorage.getItem('sfbm_inputs');
  if (!raw) return false;
  try {
    var data = JSON.parse(raw);
    document.getElementById('spanL').value = data.spanL || '';

    // Supports
    document.getElementById('supportsContainer').innerHTML = '';
    supportCount = 0;
    (data.supports || []).forEach(function(s) {
      addSupport();
      var rows = document.querySelectorAll('#supportsContainer .load-row');
      var last = rows[rows.length - 1];
      last.querySelector('.sup-type').value = s.type;
      last.querySelector('.sup-pos').value  = s.pos;
    });

    // Loads
    document.getElementById('loadsContainer').innerHTML = '';
    rowCount = 0;
    (data.loads || []).forEach(function(l) {
      if (l.kind === 'point') {
        addRow('point');
        var rows = document.querySelectorAll('#loadsContainer .load-row');
        var last = rows[rows.length - 1];
        last.querySelector('.load-p').value = l.p;
        last.querySelector('.load-a').value = l.a;
      } else if (l.kind === 'udl') {
        addRow('udl');
        var rows = document.querySelectorAll('#loadsContainer .load-row');
        var last = rows[rows.length - 1];
        last.querySelector('.load-w').value = l.w;
        last.querySelector('.load-a').value = l.a;
        last.querySelector('.load-b').value = l.b;
      } else if (l.kind === 'moment') {
        addRow('moment');
        var rows = document.querySelectorAll('#loadsContainer .load-row');
        var last = rows[rows.length - 1];
        last.querySelector('.load-m').value = l.m;
        last.querySelector('.load-a').value = l.a;
      }
    });
    return true;
  } catch(e) { return false; }
}

// ── Init ───────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('loadsContainer')) {
    var restored = restoreInputs();
    if (!restored) {
      // Default state
      addSupport();
      addSupport();
      var supRows = document.querySelectorAll('#supportsContainer .load-row');
      if (supRows[0]) supRows[0].querySelector('.sup-pos').value = '0';
      if (supRows[1]) {
        supRows[1].querySelector('.sup-pos').value = '6';
        supRows[1].querySelector('.sup-type').value = 'roller';
      }
      addRow('point');
    }
  }

  document.querySelectorAll('a[href^="#"]').forEach(function(a) {
    a.addEventListener('click', function(e) {
      e.preventDefault();
      var t = document.querySelector(this.getAttribute('href'));
      if (t) t.scrollIntoView({ behavior: 'smooth' });
    });
  });
});
