// ── Tab switching (index page) ─────────────────────────────
function showTab(id, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
}

// ── Row management ─────────────────────────────────────────
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
      { cls: 'load-w', label: 'Intensity w (kN/m)',  placeholder: 'e.g. 5' },
      { cls: 'load-a', label: 'Start a (m from A)',  placeholder: 'e.g. 1' },
      { cls: 'load-b', label: 'End b (m from A)',    placeholder: 'e.g. 4' }
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
  const cfg = rowConfig[type];
  const container = document.getElementById('loadsContainer');
  const row = document.createElement('div');
  row.className = 'load-row type-' + type;
  row.id = 'row-' + rowCount;

  const fieldsHTML = cfg.fields.map(function(f) {
    return '<div class="input-group">' +
      '<label>' + f.label + '</label>' +
      '<input type="number" class="' + f.cls + '" placeholder="' + f.placeholder + '" step="0.1"/>' +
      '</div>';
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
  document.getElementById('results').classList.add('hidden');
  document.getElementById('spanL').value = '';
  rowCount = 0;
  addRow('point');
}

// ── Calculate ──────────────────────────────────────────────
function calculate() {
  var L = parseFloat(document.getElementById('spanL').value);
  if (isNaN(L) || L <= 0) { alert('Enter a valid beam span L.'); return; }

  var support = document.getElementById('supportType').value;
  var rows = document.querySelectorAll('.load-row');
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
        alert('Check UDL values. Start must be less than End.'); return;
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

  if (support === 'simply') {
    var sumMomA = 0;
    for (var j = 0; j < pointLoads.length; j++) sumMomA += pointLoads[j].P * pointLoads[j].a;
    for (var j = 0; j < udls.length; j++)       sumMomA += udls[j].w * (udls[j].b - udls[j].a) * ((udls[j].a + udls[j].b) / 2);
    for (var j = 0; j < moments.length; j++)    sumMomA += moments[j].M;
    RB = sumMomA / L;

    var sumFy = 0;
    for (var j = 0; j < pointLoads.length; j++) sumFy += pointLoads[j].P;
    for (var j = 0; j < udls.length; j++)       sumFy += udls[j].w * (udls[j].b - udls[j].a);
    RA = sumFy - RB;

    document.getElementById('raLabel').innerHTML = 'Reaction at A (R<sub>A</sub>)';
    document.getElementById('rbLabel').innerHTML = 'Reaction at B (R<sub>B</sub>)';
    document.getElementById('ra').textContent = RA.toFixed(2) + ' kN';
    document.getElementById('rb').textContent = RB.toFixed(2) + ' kN';
  } else {
    var sumFy2 = 0;
    for (var j = 0; j < pointLoads.length; j++) sumFy2 += pointLoads[j].P;
    for (var j = 0; j < udls.length; j++)       sumFy2 += udls[j].w * (udls[j].b - udls[j].a);
    RA = sumFy2; RB = 0;

    var sumMomA2 = 0;
    for (var j = 0; j < pointLoads.length; j++) sumMomA2 += pointLoads[j].P * pointLoads[j].a;
    for (var j = 0; j < udls.length; j++)       sumMomA2 += udls[j].w * (udls[j].b - udls[j].a) * ((udls[j].a + udls[j].b) / 2);
    for (var j = 0; j < moments.length; j++)    sumMomA2 += moments[j].M;
    MA_fixed = sumMomA2;

    document.getElementById('raLabel').innerHTML = 'Reaction at A (R<sub>A</sub>)';
    document.getElementById('rbLabel').innerHTML = 'Fixed Moment M<sub>A</sub>';
    document.getElementById('ra').textContent = RA.toFixed(2) + ' kN';
    document.getElementById('rb').textContent = MA_fixed.toFixed(2) + ' kN·m';
  }

  // Sample V(x) and M(x)
  var STEPS = 800;
  var sfArr = [], bmArr = [];

  for (var s = 0; s <= STEPS; s++) {
    var x = (s / STEPS) * L;
    var V  = RA;
    var Mx = (support === 'simply') ? RA * x : -MA_fixed + RA * x;

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

  drawBeam(L, support, pointLoads, udls, moments);
  drawDiagrams(L, support, sfArr, bmArr, maxSF, maxBM);
}

// ── Beam visualisation ─────────────────────────────────────
function drawBeam(L, support, pointLoads, udls, moments) {
  var canvas = document.getElementById('beamCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  var padL = 60, padR = 40;
  var beamW = W - padL - padR;
  var scale = beamW / L;
  var beamY = 62;
  var cx = function(x) { return padL + x * scale; };

  // Beam bar
  ctx.fillStyle = '#4a90d9';
  ctx.beginPath();
  ctx.roundRect(padL, beamY - 6, beamW, 12, 3);
  ctx.fill();

  // Supports
  if (support === 'simply') {
    // Pin at A
    ctx.fillStyle = '#e67e22';
    ctx.beginPath();
    ctx.moveTo(cx(0), beamY + 6);
    ctx.lineTo(cx(0) - 14, beamY + 30);
    ctx.lineTo(cx(0) + 14, beamY + 30);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx(0) - 18, beamY + 32); ctx.lineTo(cx(0) + 18, beamY + 32); ctx.stroke();
    // Roller at B
    ctx.fillStyle = '#e67e22';
    ctx.beginPath();
    ctx.moveTo(cx(L), beamY + 6);
    ctx.lineTo(cx(L) - 14, beamY + 30);
    ctx.lineTo(cx(L) + 14, beamY + 30);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.arc(cx(L), beamY + 36, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#555'; ctx.font = '11px Segoe UI';
    ctx.fillText('A (Pin)',    cx(0) - 20, beamY + 48);
    ctx.fillText('B (Roller)', cx(L) - 24, beamY + 52);
  } else {
    // Fixed wall at A
    ctx.fillStyle = '#555';
    ctx.fillRect(padL - 18, beamY - 28, 14, 56);
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
    for (var y = beamY - 28; y < beamY + 28; y += 8) {
      ctx.beginPath(); ctx.moveTo(padL - 18, y); ctx.lineTo(padL - 30, y + 8); ctx.stroke();
    }
    ctx.fillStyle = '#555'; ctx.font = '11px Segoe UI';
    ctx.fillText('A (Fixed)', padL - 16, beamY + 48);
    ctx.fillText('B (Free)',  cx(L) - 16, beamY + 48);
  }

  // UDLs
  for (var i = 0; i < udls.length; i++) {
    var ul = udls[i];
    ctx.strokeStyle = '#27ae60'; ctx.lineWidth = 1.5;
    var step = Math.max(14, (ul.b - ul.a) * scale / 7);
    for (var px = cx(ul.a); px <= cx(ul.b) + 1; px += step) {
      ctx.beginPath(); ctx.moveTo(px, beamY - 28); ctx.lineTo(px, beamY - 8); ctx.stroke();
      ctx.fillStyle = '#27ae60';
      ctx.beginPath();
      ctx.moveTo(px, beamY - 8);
      ctx.lineTo(px - 4, beamY - 16);
      ctx.lineTo(px + 4, beamY - 16);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = '#27ae60'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx(ul.a), beamY - 28); ctx.lineTo(cx(ul.b), beamY - 28); ctx.stroke();
    ctx.fillStyle = '#27ae60'; ctx.font = '10px Segoe UI';
    ctx.fillText('w=' + ul.w + ' kN/m', (cx(ul.a) + cx(ul.b)) / 2 - 24, beamY - 32);
  }

  // Point loads
  for (var i = 0; i < pointLoads.length; i++) {
    var pl = pointLoads[i];
    ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx(pl.a), beamY - 38); ctx.lineTo(cx(pl.a), beamY - 8); ctx.stroke();
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(cx(pl.a), beamY - 8);
    ctx.lineTo(cx(pl.a) - 5, beamY - 18);
    ctx.lineTo(cx(pl.a) + 5, beamY - 18);
    ctx.closePath(); ctx.fill();
    ctx.font = '10px Segoe UI';
    ctx.fillText(pl.P + ' kN', cx(pl.a) + 5, beamY - 30);
  }

  // Applied moments (arc arrow)
  for (var i = 0; i < moments.length; i++) {
    var mo = moments[i];
    ctx.strokeStyle = '#8e44ad'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx(mo.a), beamY, 16, -Math.PI * 0.9, Math.PI * 0.1);
    ctx.stroke();
    ctx.fillStyle = '#8e44ad';
    ctx.beginPath();
    ctx.moveTo(cx(mo.a) + 16, beamY + 2);
    ctx.lineTo(cx(mo.a) + 10, beamY - 4);
    ctx.lineTo(cx(mo.a) + 22, beamY - 4);
    ctx.closePath(); ctx.fill();
    ctx.font = '10px Segoe UI';
    ctx.fillText(mo.M + ' kN·m', cx(mo.a) + 18, beamY - 10);
  }

  // Span label
  ctx.fillStyle = '#888'; ctx.font = '11px Segoe UI';
  ctx.fillText('L = ' + L + ' m', W / 2 - 20, H - 4);
}

// ── SFD / BMD drawing ──────────────────────────────────────
function drawDiagrams(L, support, sfArr, bmArr, maxSF, maxBM) {
  var canvas = document.getElementById('sfbmCanvas');
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  var padL = 72, padR = 30, padT = 16;
  var halfH = H / 2;
  var beamW = W - padL - padR;
  var scale = beamW / L;
  var amp = 58;

  var sfMidY = padT + 28 + amp + 10;
  var bmMidY = halfH + padT + 28 + amp + 10;
  var cx = function(x) { return padL + x * scale; };

  // Section labels
  ctx.fillStyle = '#222'; ctx.font = 'bold 12px Segoe UI';
  ctx.fillText('Shear Force Diagram (SFD)', padL, padT + 12);
  ctx.fillText('Bending Moment Diagram (BMD)', padL, halfH + padT + 12);

  // Zero baselines + axis value labels
  var pairs = [
    { midY: sfMidY, maxVal: maxSF, unit: ' kN' },
    { midY: bmMidY, maxVal: maxBM, unit: ' kNm' }
  ];
  for (var i = 0; i < pairs.length; i++) {
    var p = pairs[i];
    ctx.strokeStyle = '#ddd'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, p.midY); ctx.lineTo(W - padR, p.midY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#bbb'; ctx.font = '10px Segoe UI';
    ctx.fillText('0', padL - 20, p.midY + 4);
    if (p.maxVal > 0) {
      ctx.fillStyle = '#aaa'; ctx.font = '9px Segoe UI';
      ctx.fillText('+' + p.maxVal.toFixed(1) + p.unit, padL - 66, p.midY - amp + 4);
      ctx.fillText('-' + p.maxVal.toFixed(1) + p.unit, padL - 66, p.midY + amp + 4);
    }
  }

  var sfScale = maxSF > 0 ? amp / maxSF : 1;
  var bmScale = maxBM > 0 ? amp / maxBM : 1;

  function drawCurve(arr, midY, scl, stroke, fill) {
    ctx.strokeStyle = stroke; ctx.fillStyle = fill; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx(0), midY);
    for (var k = 0; k < arr.length; k++) ctx.lineTo(cx(arr[k].x), midY - arr[k].v * scl);
    ctx.lineTo(cx(L), midY);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    for (var k = 0; k < arr.length; k++) {
      if (k === 0) ctx.moveTo(cx(arr[k].x), midY - arr[k].v * scl);
      else         ctx.lineTo(cx(arr[k].x), midY - arr[k].v * scl);
    }
    ctx.stroke();
  }

  drawCurve(sfArr, sfMidY, sfScale, '#e74c3c', 'rgba(231,76,60,0.13)');

  var bmMapped = [];
  for (var k = 0; k < bmArr.length; k++) bmMapped.push({ x: bmArr[k].x, v: bmArr[k].m });
  drawCurve(bmMapped, bmMidY, bmScale, '#27ae60', 'rgba(39,174,96,0.13)');

  // Peak value labels
  function peakLabel(arr, midY, scl, color, unit) {
    var maxPt = arr[0];
    for (var k = 1; k < arr.length; k++) if (Math.abs(arr[k].v) > Math.abs(maxPt.v)) maxPt = arr[k];
    ctx.fillStyle = color; ctx.font = '10px Segoe UI';
    var yy = midY - maxPt.v * scl;
    ctx.fillText(maxPt.v.toFixed(2) + unit, cx(maxPt.x) + 4, maxPt.v >= 0 ? yy - 5 : yy + 13);
  }
  peakLabel(sfArr,    sfMidY, sfScale, '#c0392b', ' kN');
  peakLabel(bmMapped, bmMidY, bmScale, '#1e8449', ' kN·m');

  // A / B labels
  ctx.fillStyle = '#555'; ctx.font = '11px Segoe UI';
  var aLbl = support === 'cantilever' ? 'A(Fixed)' : 'A(Pin)';
  var bLbl = support === 'cantilever' ? 'B(Free)'  : 'B(Roller)';
  ctx.fillText(aLbl, cx(0) - 4,  sfMidY + 22);
  ctx.fillText(bLbl, cx(L) - 4,  sfMidY + 22);
  ctx.fillText(aLbl, cx(0) - 4,  bmMidY + 22);
  ctx.fillText(bLbl, cx(L) - 4,  bmMidY + 22);
}

// ── Init ───────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('loadsContainer')) {
    addRow('point');
  }

  // Smooth scroll (index page only)
  document.querySelectorAll('a[href^="#"]').forEach(function(a) {
    a.addEventListener('click', function(e) {
      e.preventDefault();
      var t = document.querySelector(this.getAttribute('href'));
      if (t) t.scrollIntoView({ behavior: 'smooth' });
    });
  });
});
