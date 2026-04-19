const canvas = document.getElementById("canvas");
const ctx    = canvas.getContext("2d");

let forces = [];
let graphCleared = false;   // tracks if user manually cleared graph

/* ════════════════════════════════
   CANVAS HELPERS
════════════════════════════════ */
function ox() { return canvas.width  / 2; }
function oy() { return canvas.height / 2; }

function drawAxes() {
    const W = canvas.width, H = canvas.height;
    const x0 = ox(), y0 = oy();

    ctx.clearRect(0, 0, W, H);

    // grid
    ctx.strokeStyle = "#e8e8e8";
    ctx.lineWidth   = 1;
    ctx.setLineDash([3, 3]);
    for (let x = x0 % 40; x < W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = y0 % 40; y < H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.setLineDash([]);

    // main axes
    ctx.strokeStyle = "#aaa";
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0, H); ctx.stroke();

    // labels
    ctx.fillStyle = "#999";
    ctx.font      = "13px Segoe UI";
    ctx.fillText("+X", W - 26, y0 - 8);
    ctx.fillText("-X", 6,      y0 - 8);
    ctx.fillText("+Y", x0 + 7, 16);
    ctx.fillText("-Y", x0 + 7, H - 6);

    // origin dot
    ctx.beginPath();
    ctx.arc(x0, y0, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#555";
    ctx.fill();
}

function getScale(fxList, fyList) {
    const maxVal = Math.max(...fxList.map(Math.abs), ...fyList.map(Math.abs), 1);
    return (Math.min(ox(), oy()) * 0.75) / maxVal;
}

function drawVector(Fx, Fy, scale, color, label) {
    const x0 = ox(), y0 = oy();
    const x  = x0 + Fx * scale;
    const y  = y0 - Fy * scale;

    // line
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x, y);
    ctx.stroke();

    // arrowhead
    const ang = Math.atan2(y0 - y, x - x0);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 11 * Math.cos(ang - 0.35), y + 11 * Math.sin(ang - 0.35));
    ctx.lineTo(x - 11 * Math.cos(ang + 0.35), y + 11 * Math.sin(ang + 0.35));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // label pill
    if (label) {
        ctx.font = "bold 12px Segoe UI";
        const tw = ctx.measureText(label).width;
        const lx = x + 10, ly = y - 6;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.roundRect(lx - 3, ly - 13, tw + 8, 18, 4);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.fillText(label, lx, ly);
    }
}

function drawAngleArc(angleDeg, index) {
    if (angleDeg === 0) return;
    const x0 = ox(), y0 = oy();
    const r   = 34 + index * 18;
    const end = angleDeg * Math.PI / 180;

    ctx.beginPath();
    ctx.arc(x0, y0, r, 0, -end, angleDeg > 0);
    ctx.strokeStyle = "#bbb";
    ctx.lineWidth   = 1;
    ctx.stroke();

    const mid = end / 2;
    ctx.fillStyle = "#777";
    ctx.font      = "11px Segoe UI";
    ctx.fillText(angleDeg + "°",
        x0 + (r + 12) * Math.cos(mid),
        y0 - (r + 12) * Math.sin(mid)
    );
}

/* ════════════════════════════════
   REDRAW — plots all forces
════════════════════════════════ */
function redraw() {
    drawAxes();
    if (forces.length === 0) return;

    let sumFx = 0, sumFy = 0;
    forces.forEach(f => { sumFx += f.Fx; sumFy += f.Fy; });

    const scale = getScale(
        [...forces.map(f => f.Fx), sumFx],
        [...forces.map(f => f.Fy), sumFy]
    );

    forces.forEach((f, i) => {
        drawVector(f.Fx, f.Fy, scale, "#e74c3c", `F${i+1}=${f.F}N`);
        drawAngleArc(f.angle, i);
    });

    const R = Math.sqrt(sumFx * sumFx + sumFy * sumFy);
    drawVector(sumFx, sumFy, scale, "#4a90d9", `R=${R.toFixed(1)}N`);
}

/* ════════════════════════════════
   UI UPDATES
════════════════════════════════ */
function updateTable() {
    const table = document.getElementById("forceTable");
    table.innerHTML = `<tr>
        <th>No</th><th>Force (N)</th><th>Angle (°)</th>
        <th>Fx (N)</th><th>Fy (N)</th><th>Remove</th>
    </tr>`;
    forces.forEach((f, i) => {
        table.innerHTML += `<tr>
            <td>${i + 1}</td>
            <td>${f.F.toFixed(2)}</td>
            <td>${f.angle.toFixed(2)}</td>
            <td>${f.Fx.toFixed(2)}</td>
            <td>${f.Fy.toFixed(2)}</td>
            <td><button class="remove-btn" onclick="removeForce(${i})">✕</button></td>
        </tr>`;
    });
}

function updateSteps() {
    const el = document.getElementById("steps");
    if (forces.length === 0) {
        el.innerHTML = `<p class="empty-msg">No forces added yet.</p>`;
        return;
    }

    let html = "";
    forces.forEach((f, i) => {
        html += `<p>
            <strong>Force ${i+1} &nbsp;(${f.F} N @ ${f.angle}°)</strong><br>
            Fx = ${f.F} × cos(${f.angle}°) = <strong>${f.Fx.toFixed(2)} N</strong><br>
            Fy = ${f.F} × sin(${f.angle}°) = <strong>${f.Fy.toFixed(2)} N</strong>
        </p>`;
    });

    let sumFx = 0, sumFy = 0;
    forces.forEach(f => { sumFx += f.Fx; sumFy += f.Fy; });
    const R     = Math.sqrt(sumFx * sumFx + sumFy * sumFy);
    const theta = Math.atan2(sumFy, sumFx) * 180 / Math.PI;

    html += `<p class="summary-step">
        <strong>ΣFx = ${sumFx.toFixed(2)} N &nbsp;|&nbsp; ΣFy = ${sumFy.toFixed(2)} N</strong><br>
        R = √(${sumFx.toFixed(2)}² + ${sumFy.toFixed(2)}²) = <strong>${R.toFixed(2)} N</strong><br>
        θ = arctan(${sumFy.toFixed(2)} / ${sumFx.toFixed(2)}) = <strong>${theta.toFixed(2)}°</strong>
    </p>`;

    el.innerHTML = html;
}

function updateResults() {
    if (forces.length === 0) {
        ["resSumFx","resSumFy","resR","resTheta"]
            .forEach(id => document.getElementById(id).textContent = "—");
        return;
    }
    let sumFx = 0, sumFy = 0;
    forces.forEach(f => { sumFx += f.Fx; sumFy += f.Fy; });
    const R     = Math.sqrt(sumFx * sumFx + sumFy * sumFy);
    const theta = Math.atan2(sumFy, sumFx) * 180 / Math.PI;

    document.getElementById("resSumFx").textContent = sumFx.toFixed(2) + " N";
    document.getElementById("resSumFy").textContent = sumFy.toFixed(2) + " N";
    document.getElementById("resR").textContent     = R.toFixed(2)     + " N";
    document.getElementById("resTheta").textContent = theta.toFixed(2) + "°";
}

function updateAll() {
    updateTable();
    updateSteps();
    updateResults();
    if (!graphCleared) redraw();
}

/* ════════════════════════════════
   ACTIONS
════════════════════════════════ */

// Add a force
function addForce() {
    const fEl = document.getElementById("force");
    const aEl = document.getElementById("angle");

    const fVal = fEl.value.trim();
    const aVal = aEl.value.trim();

    if (fVal === "" || aVal === "") {
        alert("Enter both Force (N) and Angle (°).");
        return;
    }

    const F     = parseFloat(fVal);
    const angle = parseFloat(aVal);

    if (isNaN(F) || isNaN(angle)) {
        alert("Force and Angle must be valid numbers.");
        return;
    }

    const rad = angle * Math.PI / 180;
    forces.push({ F, angle, Fx: F * Math.cos(rad), Fy: F * Math.sin(rad) });

    fEl.value = "";
    aEl.value = "";
    fEl.focus();

    graphCleared = false;   // new force added — show graph
    updateAll();
}

// Remove one force by index
function removeForce(index) {
    forces.splice(index, 1);
    graphCleared = false;
    updateAll();
}

// Clear graph only — keeps all data intact
function clearGraph() {
    graphCleared = true;
    drawAxes();
}

// Clear everything
function clearAll() {
    forces       = [];
    graphCleared = false;
    updateTable();
    updateSteps();
    updateResults();
    drawAxes();
}

/* ════════════════════════════════
   INIT
════════════════════════════════ */

// Resize canvas to match its CSS display size
function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.max(Math.floor(w * 0.75), 260);   // 4:3 ratio, min 260px
    if (canvas.width !== w || canvas.height !== h) {
        canvas.width  = w;
        canvas.height = h;
    }
}

document.addEventListener("keydown", e => {
    if (e.key === "Enter") addForce();
});

window.addEventListener("resize", () => {
    resizeCanvas();
    if (graphCleared) drawAxes();
    else redraw();
});

resizeCanvas();
drawAxes();
