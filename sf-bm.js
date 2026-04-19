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
  if (container.children.length >= 2) {
    alert('Maximum 2 supports allowed.'); return;
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
  addSupport(); addSupport();   // reset with 2 default supports
  addRow('point');
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

  // Sample V(x) and M(x) across full beam length
  var STEPS = 800;
  var sfArr = [], bmArr = [];

  for (var s = 0; s <= STEPS; s++) {
    var x  = (s / STEPS) * L;

    // Start from left end — accumulate all forces to the LEFT of x
    var V  = 0;
    var Mx = 0;

    // Add reaction at posA if it is to the left of (or at) x
    if (posA <= x) { V += RA; Mx += RA * (x - posA); }

    // Add reaction at posB for simply supported
    if (support === 'simply' && posB <= x) { V += RB; Mx += RB * (x - posB); }

    // Fixed moment at posA for cantilever (acts as a counter-moment)
    if (support === 'cantilever' && posA <= x) { Mx -= MA_fixed; }

    // Subtract loads to the left of x
    for (var j = 0; j < pointLoads.length; j++) {
      var pl = pointLoads[j];
      if (pl.a < x)                        { V -= pl.P; Mx -= pl.P * (x - pl.a); }
      else if (Math.abs(pl.a - x) < 1e-9) { V -= pl.P; }
    }
    for (var j = 0; j < udls.length; j++) {
      var ul = udls[j];
      if (x > ul.a) {
        var xEnd = Math.min(x, ul.b);
        var len  = xEnd - ul.a;
        V  -= ul.w * len;
        Mx -= ul.w * len * (x - (ul.a + xEnd) / 2);
      }
    }
    for (var j = 0; j < moments.length; j++) {
      if (moments[j].a <= x) Mx -= moments[j].M;
    }

    sfArr.push({ x: x, v: V });
    bmArr.push({ x: x, m: Mx });
  }

  var maxSF = 0, maxBM = 0;
  for (var j = 0; j < sfArr.length; j++) if (Math.abs(sfArr[j].v) > maxSF) maxSF = Math.abs(sfArr[j].v);
  for (var j = 0; j < bmArr.length; j++) if (Math.abs(bmArr[j].m) > maxBM) maxBM = Math.abs(bmArr[j].m);

  document.getElementById('maxSF').textContent = maxSF.toFixed(2) + ' kN';
  document.getElementById('maxBM').textContent = maxBM.toFixed(2) + ' kN·m';
  document.getElementById('results').classList.remove('hidden');

  drawBeam(L, supports, pointLoads, udls, moments);
  drawDiagrams(L, support, sfArr, bmArr, maxSF, maxBM, posA, posB);
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

// ── Init ───────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('loadsContainer')) {
    addSupport(); addSupport();
    var supRows = document.querySelectorAll('#supportsContainer .load-row');
    if (supRows[0]) supRows[0].querySelector('.sup-pos').value = '0';
    if (supRows[1]) supRows[1].querySelector('.sup-pos').value = '6';
    addRow('point');
  }

  document.querySelectorAll('a[href^="#"]').forEach(function(a) {
    a.addEventListener('click', function(e) {
      e.preventDefault();
      var t = document.querySelector(this.getAttribute('href'));
      if (t) t.scrollIntoView({ behavior: 'smooth' });
    });
  });
});
