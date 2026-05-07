(function initOutlierHunt() {
    "use strict";

    // Canvas setup
    const canvas = document.getElementById("outlierCanvas");
    const ctx    = canvas.getContext("2d");
    const W = 700, H = 480;
    canvas.width  = W;
    canvas.height = H;

    // Constants
    const POINT_R     = 7;
    const HIT_R       = 15;
    const PENALTY_S   = 3;
    const MARGIN      = 65;
    const BAR_Y       = 18;
    const BAR_H       = 9;
    const MIN_CTR_SEP = 120;

    // DOM
    const elIntro    = document.getElementById("outlierIntro");
    const elOver     = document.getElementById("outlierGamePanel");
    const btnStart   = document.getElementById("outlierStartBtn");
    const btnRestart = document.getElementById("outlierRestartBtn");
    const elRound    = document.getElementById("ohRound");
    const elScore    = document.getElementById("ohScore");
    const elBest     = document.getElementById("ohBest");
    const elGoMsg    = document.getElementById("ohGoMsg");
    const elGoRound  = document.getElementById("ohGoRound");

    // State
    let state; // "intro" | "playing" | "roundEnd" | "gameOver"
    let round, score, highScore;
    let timeLeft, maxTime, outliersLeft;
    let points, feedbacks;
    let lastTs = null;

    // Colors — normal resolves from CSS var so it respects dark mode
    const COLORS = { found: "#43a047", miss: "#e53935", revealed: "#2979ff" };
    function normalColor() {
        return getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#112033";
    }

    // Round config
    function cfg(r) {
        return {
            clusters:   Math.min(5, 2 + Math.floor(r / 2)),
            perCluster: Math.min(22, 10 + r * 2),
            spread:     Math.max(16, 42 - r * 3),
            outliers:   r >= 3 ? 2 : 1,
            minODist:   Math.max(55, 108 - r * 8),
            time:       Math.max(9, 22 - r)
        };
    }

    // Math helpers
    function gauss() {
        let u, v;
        do { u = Math.random(); } while (!u);
        do { v = Math.random(); } while (!v);
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    // Round generation
    function genRound(r) {
        const c = cfg(r);
        const centers = [];

        for (let i = 0; i < c.clusters; i++) {
            let cen, tries = 0;
            do {
                cen = {
                    x: MARGIN + Math.random() * (W - 2 * MARGIN),
                    y: MARGIN + Math.random() * (H - 2 * MARGIN)
                };
                tries++;
            } while (tries < 250 && centers.some(e => dist(e, cen) < MIN_CTR_SEP));
            centers.push(cen);
        }

        const pts = [];
        for (const cen of centers) {
            for (let i = 0; i < c.perCluster; i++) {
                pts.push({
                    x:       clamp(cen.x + gauss() * c.spread, 12, W - 12),
                    y:       clamp(cen.y + gauss() * c.spread, 42, H - 12),
                    outlier: false,
                    vis:     "normal"
                });
            }
        }

        for (let i = 0; i < c.outliers; i++) {
            let p, tries = 0;
            do {
                p = {
                    x: MARGIN + Math.random() * (W - 2 * MARGIN),
                    y: MARGIN + Math.random() * (H - 2 * MARGIN)
                };
                tries++;
            } while (tries < 400 && centers.some(cen => dist(cen, p) < c.minODist));
            pts.push({ ...p, outlier: true, vis: "normal" });
        }

        return pts;
    }

    // Game flow
    function startRound() {
        const c      = cfg(round);
        points       = genRound(round);
        outliersLeft = c.outliers;
        timeLeft     = maxTime = c.time;
        feedbacks    = [];
        lastTs       = null;
        state        = "playing";
        hide(elIntro);
        hide(elOver);
        updateHUD();
    }

    function endGame() {
        state = "gameOver";
        points.forEach(p => { if (p.outlier && p.vis === "normal") p.vis = "revealed"; });
        if (score > highScore) highScore = score;
        elGoMsg.textContent   = `Final score: ${score}`;
        elGoRound.textContent = `You reached round ${round + 1}. Missed outliers are shown in blue.`;
        updateHUD();
        show(elOver);
    }

    function resetGame() {
        round = 0;
        score = 0;
        updateHUD();
        startRound();
    }

    function updateHUD() {
        elRound.textContent = round + 1;
        elScore.textContent = score;
        elBest.textContent  = highScore;
    }

    function show(el) { el.classList.remove("hidden"); }
    function hide(el) { el.classList.add("hidden"); }

    // Input
    canvas.addEventListener("click", e => {
        if (state !== "playing") return;
        const r  = canvas.getBoundingClientRect();
        const sx = W / r.width, sy = H / r.height;
        const mx = (e.clientX - r.left) * sx;
        const my = (e.clientY - r.top)  * sy;

        let hit = null, bestD = Infinity;
        for (const pt of points) {
            if (pt.vis !== "normal") continue;
            const d = dist({ x: mx, y: my }, pt);
            if (d < HIT_R && d < bestD) { hit = pt; bestD = d; }
        }
        if (!hit) return;

        if (hit.outlier) {
            hit.vis = "found";
            outliersLeft--;
            const gained = 100 + round * 50 + Math.floor(timeLeft * 5);
            score += gained;
            feedbacks.push({ x: hit.x, y: hit.y, text: `+${gained}`, col: "#43a047", life: 1.3 });
            updateHUD();
            if (outliersLeft === 0) {
                state = "roundEnd";
                setTimeout(() => { round++; startRound(); }, 950);
            }
        } else {
            hit.vis = "miss";
            timeLeft = Math.max(0, timeLeft - PENALTY_S);
            feedbacks.push({ x: mx, y: my, text: `-${PENALTY_S}s`, col: "#e53935", life: 1.0 });
        }
    });

    canvas.addEventListener("mousemove", e => {
        if (state !== "playing") { canvas.style.cursor = "default"; return; }
        const r  = canvas.getBoundingClientRect();
        const sx = W / r.width, sy = H / r.height;
        const mx = (e.clientX - r.left) * sx;
        const my = (e.clientY - r.top)  * sy;
        const near = points.some(pt => pt.vis === "normal" && dist({ x: mx, y: my }, pt) < HIT_R);
        canvas.style.cursor = near ? "pointer" : "crosshair";
    });

    btnStart.addEventListener("click",   resetGame);
    btnRestart.addEventListener("click", resetGame);

    // Update
    function update(ts) {
        if (lastTs === null) { lastTs = ts; return; }
        const dt = Math.min((ts - lastTs) / 1000, 0.1);
        lastTs = ts;

        if (state === "playing") {
            timeLeft = Math.max(0, timeLeft - dt);
            feedbacks.forEach(f => { f.life -= dt * 1.5; f.y -= dt * 28; });
            feedbacks = feedbacks.filter(f => f.life > 0);
            if (timeLeft === 0) endGame();
        }
    }

    // Draw
    function draw() {
        ctx.clearRect(0, 0, W, H);
        if (state === "intro") return;

        const nClr = normalColor();

        for (const pt of points) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, POINT_R, 0, Math.PI * 2);
            ctx.fillStyle = pt.vis === "normal" ? nClr : (COLORS[pt.vis] || nClr);
            ctx.fill();
        }

        // Draw rings around revealed outliers so they stand out clearly
        if (state === "gameOver") {
            for (const pt of points) {
                if (pt.vis !== "revealed") continue;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, POINT_R + 7, 0, Math.PI * 2);
                ctx.strokeStyle = "#2979ff";
                ctx.lineWidth   = 2;
                ctx.stroke();
            }
        }

        for (const f of feedbacks) {
            ctx.globalAlpha = Math.max(0, f.life * 0.85);
            ctx.fillStyle   = f.col;
            ctx.font        = "bold 13px system-ui, sans-serif";
            ctx.textAlign   = "center";
            ctx.fillText(f.text, f.x, f.y);
        }
        ctx.globalAlpha = 1;

        // Timer bar
        const fill = Math.max(0, timeLeft / (maxTime || 1));
        ctx.fillStyle = "rgba(128,128,128,0.15)";
        ctx.fillRect(20, BAR_Y, W - 40, BAR_H);
        if (fill > 0) {
            ctx.fillStyle = fill > 0.5 ? "#43a047" : fill > 0.25 ? "#fb8c00" : "#e53935";
            ctx.fillRect(20, BAR_Y, (W - 40) * fill, BAR_H);
        }
        if (state === "playing") {
            ctx.fillStyle = "rgba(0,0,0,0.4)";
            ctx.font      = "12px system-ui, sans-serif";
            ctx.textAlign = "right";
            ctx.fillText(`${outliersLeft} outlier${outliersLeft !== 1 ? "s" : ""} left`, W - 22, BAR_Y + BAR_H + 16);
        }

        if (state === "roundEnd") {
            ctx.fillStyle = "rgba(67,160,71,0.08)";
            ctx.fillRect(0, 0, W, H);
        }
    }

    // Loop
    function loop(ts) {
        update(ts);
        draw();
        requestAnimationFrame(loop);
    }

    // Init
    state     = "intro";
    round     = 0;
    score     = 0;
    highScore = 0;
    updateHUD();
    requestAnimationFrame(loop);
})();
