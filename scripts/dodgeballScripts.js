/*
    Dodgeball — a two-player keyboard game played on a single canvas.
    P1 (blue, left):  W/S = move up/down, D = throw, A = dash.
    P2 (red, right): Up/Down = move up/down, Left = throw, Right = dash.
    Each player starts with 3 health points. First to lose all health loses.
    Balls bounce off the top and bottom walls. Throw and dash both have cooldowns.
    Supports a vs-AI mode with three difficulty levels.
*/

(function initDodgeball() {
    const canvas = document.querySelector("#dodgeballCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    /* Internal canvas resolution. CSS scales it to fit the container. */
    const W = 800;
    const H = 480;
    canvas.width  = W;
    canvas.height = H;

    /* Layout */
    const PADDLE_W  = 14;
    const PADDLE_H  = 88;
    const PADDLE_X1 = 36;
    const PADDLE_X2 = W - 36 - PADDLE_W;
    const BALL_R    = 9;

    /* Gameplay tuning */
    const BALL_SPEED     = 500;   /* px/s — horizontal component at zero angle */
    const PLAYER_SPEED   = 260;   /* px/s — normal vertical speed */
    const DASH_SPEED     = 660;   /* px/s — speed during a dash burst */
    const DASH_DURATION  = 0.18;  /* s    — how long one dash lasts */
    const DASH_COOLDOWN  = 1.2;   /* s    — time between dashes */
    const THROW_COOLDOWN = 1.5;   /* s    — time between throws */
    const MAX_HP         = 3;

    /*
        AI difficulty profiles.

        Easy    — slow, reactive: watches for an attack, dodges it (no bounce prediction,
                  no dashing), then counterattacks. Throws straight. Loosely follows P1
                  when idle and miscalculates often, especially against curved/bounced balls.

        Medium  — medium speed, starting to be proactive, comfortable dashing.
                  Still throws mostly straight. Tracks P1 more closely when idle.
                  Miscalculates less, but curves and bounces still trip it up.

        Hard    — full speed, very aggressive, never waits. Predicts bounces, dashes freely,
                  aims throws at P1's position, and resets its throw timer when P1's dash
                  is on cooldown so it can punish the window. Tracks P1 closely when idle.
                  Rarely miscalculates, but a curved bouncing ball can still fool it.
    */
    const AI_PROFILES = {
        easy: {
            speedFactor:       0.52,   /* fraction of PLAYER_SPEED */
            throwExtraDelay:   1.8,    /* extra seconds to wait after throw cooldown expires */
            predictBounces:    false,  /* track ball's current Y, not where it'll end up */
            useDash:           false,
            dashThreshold:     0,      /* n/a */
            aimAtPlayer:       false,  /* throws straight across */
            proactive:         false,  /* only throws when NOT actively being threatened */
            punishCooldowns:   false,
            dodgeDeadzone:     22,     /* px — stop repositioning once within this range */
            followFactor:      0.35,   /* how much of P1's position bleeds into idle target */
            baseMiscalcChance: 0.22,   /* base probability of misreading a ball's path */
        },
        medium: {
            speedFactor:       0.78,
            throwExtraDelay:   0.4,
            predictBounces:    true,
            useDash:           true,
            dashThreshold:     0.50,   /* dash if ball is within this many seconds away */
            aimAtPlayer:       false,
            proactive:         true,   /* throws whenever ready, even without being attacked */
            punishCooldowns:   false,
            dodgeDeadzone:     14,
            followFactor:      0.55,
            baseMiscalcChance: 0.10,
        },
        hard: {
            speedFactor:       1.0,
            throwExtraDelay:   0,
            predictBounces:    true,
            useDash:           true,
            dashThreshold:     0.65,
            aimAtPlayer:       true,   /* angles throw toward P1's current position */
            proactive:         true,
            punishCooldowns:   true,   /* clears throw timer when P1's dash is on cooldown */
            dodgeDeadzone:     5,
            followFactor:      0.70,
            baseMiscalcChance: 0.04,
        },
    };

    /* Active game settings — updated when the player changes the UI controls. */
    const settings = {
        mode:         "2p",
        aiDifficulty: "medium",
    };

    /* AI-specific runtime state. */
    const aiState = {
        throwTimer:    0,     /* extra delay after throw cooldown expires before AI can throw again */
        currentThreat: null,  /* ball object reference for the current primary threat */
        dodgeOffset:   0,     /* Y offset added to predicted impact when AI miscalculates */
    };

    /* Return theme-appropriate colors each frame so dark-mode switches apply instantly. */
    function getColors() {
        const dark = document.body.classList.contains("is-dark");
        return {
            bg:          dark ? "#0f172a" : "#f8fafc",
            centerLine:  dark ? "#334155" : "#cbd5e1",
            p1:          "#3b82f6",
            p2:          "#ef4444",
            ball:        dark ? "#fbbf24" : "#f59e0b",
            ballStroke:  dark ? "#92400e" : "#b45309",
            muted:       dark ? "#64748b" : "#94a3b8",
            pipFull:     "#22c55e",
            pipEmpty:    dark ? "#1e293b" : "#e2e8f0",
            cdBg:        dark ? "#1e293b" : "#e2e8f0",
            throwReady:  "#3b82f6",
            dashReady:   "#8b5cf6",
            overlayBg:   "rgba(0, 0, 0, 0.62)",
        };
    }

    /* Create a fresh player object for the given side. */
    function makePlayer(side) {
        return {
            side,
            x:               side === "left" ? PADDLE_X1 : PADDLE_X2,
            y:               H / 2 - PADDLE_H / 2,
            vy:              0,
            speedMultiplier: 1.0,
            dashing:         false,
            dashTimer:       0,
            dashCooldown:    0,
            dashDir:         0,
            throwCooldown:   0,
            hp:              MAX_HP,
        };
    }

    const state = {
        p1:     makePlayer("left"),
        p2:     makePlayer("right"),
        balls:  [],
        phase:  "playing",
        winner: null,
    };

    const keys = {};

    function clampY(y) {
        return Math.max(0, Math.min(H - PADDLE_H, y));
    }

    /*
        Throw a ball using an explicit vertical velocity component.
        Human players call tryThrow which passes their current vy.
        The AI calls this directly to control throw angle independently of movement.
    */
    function throwWithVy(player, vy) {
        if (player.throwCooldown > 0) return;
        player.throwCooldown = THROW_COOLDOWN;

        const dir   = player.side === "left" ? 1 : -1;
        const rawVy = vy * PLAYER_SPEED * 0.35;
        const vx    = dir * Math.sqrt(BALL_SPEED * BALL_SPEED - rawVy * rawVy);

        state.balls.push({
            x:       player.side === "left" ? player.x + PADDLE_W + BALL_R + 2
                                            : player.x - BALL_R - 2,
            y:       player.y + PADDLE_H / 2,
            vx,
            vy:      rawVy,
            owner:   player.side,
            bounces: 0,   /* incremented each time the ball reflects off a wall */
        });
    }

    /* Human throw: angle is set by current movement direction. */
    function tryThrow(player) {
        throwWithVy(player, player.vy);
    }

    /* Begin a dash burst in the current movement direction if off cooldown. */
    function tryDash(player) {
        if (player.dashCooldown > 0 || player.vy === 0) return;
        player.dashing      = true;
        player.dashTimer    = DASH_DURATION;
        player.dashCooldown = DASH_COOLDOWN;
        player.dashDir      = player.vy;
    }

    /*
        Predict where a ball's Y will be when it reaches a given X coordinate,
        simulating up to 10 wall bounces. Returns null if the ball is moving away.
    */
    function predictBallY(ball, targetX) {
        const dx = targetX - ball.x;
        if (ball.vx === 0 || (dx > 0) !== (ball.vx > 0)) return null;

        let y         = ball.y;
        let vy        = ball.vy;
        let remaining = Math.abs(dx / ball.vx);

        for (let i = 0; i < 10 && remaining > 0; i++) {
            if (vy === 0) break;
            const wallY = vy < 0 ? BALL_R : H - BALL_R;
            const tWall = Math.abs((wallY - y) / vy);
            if (tWall >= remaining) { y += vy * remaining; break; }
            y = wallY;
            vy = -vy;
            remaining -= tWall;
        }

        return Math.max(BALL_R, Math.min(H - BALL_R, y));
    }

    /*
        Roll a Y offset to apply to the AI's predicted impact when it miscalculates.
        The chance scales up with how much the ball is curved and how many times it has
        bounced, because both make the trajectory harder to read. Returns 0 (no error)
        most of the time; when triggered, returns an offset large enough to change which
        direction the AI dodges (or cause it to not dodge at all).
    */
    function rollMiscalcOffset(ball, profile) {
        const maxVy      = PLAYER_SPEED * 0.35;
        const curveRatio = Math.min(Math.abs(ball.vy) / maxVy, 1); /* 0 = straight, 1 = max curve */
        const chance     = Math.min(
            profile.baseMiscalcChance
                * (1 + curveRatio * 1.5)     /* up to 2.5× for a fully curved ball */
                * (1 + ball.bounces  * 0.8), /* 1.8× per wall bounce */
            0.85
        );
        if (Math.random() >= chance) return 0;
        /* Offset is large enough to push the adjusted impact outside the paddle's range. */
        const sign = Math.random() < 0.5 ? 1 : -1;
        return sign * (PADDLE_H * 0.55 + Math.random() * PADDLE_H * 0.55);
    }

    /*
        Drive P2 autonomously.

        Dodging:  the AI moves AWAY from its perceived impact Y (true prediction plus any
                  miscalculation offset) so the paddle is not there when the ball arrives.
                  A miscalculation shifts the perceived Y enough to change dodge direction
                  or suppress dodging entirely, causing the AI to get hit.
                  The offset is rolled once when a new threat is detected.
                  When not dodging, the AI tracks a blend of the arena center and P1's
                  current position, which keeps it active and interesting to play against.

        Throwing: easy is reactive — waits until the threat is gone then counterattacks.
                  Medium and hard are proactive — throw as soon as the cooldown allows.
                  Hard also clears its throw timer whenever P1 can't dash, punishing
                  the window where P1 has limited dodge options.
    */
    function updateAI(dt) {
        const profile      = AI_PROFILES[settings.aiDifficulty];
        const p2           = state.p2;
        const p1           = state.p1;
        const paddleCenter = p2.y + PADDLE_H / 2;

        /* --- THREAT ASSESSMENT --- */

        const incoming = state.balls.filter((b) => b.vx > 0 && b.owner === "left");
        incoming.sort((a, b) => b.x - a.x); /* closest to P2 first */
        const threat = incoming[0] || null;

        let impactY      = null;
        let timeToArrive = Infinity;

        if (threat) {
            timeToArrive = (p2.x - threat.x) / threat.vx;
            impactY = profile.predictBounces
                ? predictBallY(threat, p2.x + PADDLE_W / 2)
                : threat.y;
        }

        /* Roll miscalculation once whenever the primary threat changes. */
        if (threat !== aiState.currentThreat) {
            aiState.currentThreat = threat;
            aiState.dodgeOffset   = threat ? rollMiscalcOffset(threat, profile) : 0;
        }

        /*
            Perceived impact Y: true prediction shifted by any miscalculation offset.
            A large offset moves the perceived landing point outside the paddle zone,
            causing the AI to ignore the threat or dodge in the wrong direction.
        */
        const perceivedImpactY = impactY !== null ? impactY + aiState.dodgeOffset : null;

        const DODGE_MARGIN = BALL_R + 14;
        const isDangerous  = perceivedImpactY !== null
            && perceivedImpactY >= p2.y - DODGE_MARGIN
            && perceivedImpactY <= p2.y + PADDLE_H + DODGE_MARGIN;

        /* --- MOVEMENT --- */

        if (isDangerous) {
            /*
                Move AWAY from the perceived impact Y.
                Perceived high (above center) → move down to clear it.
                Perceived low  (below center) → move up to clear it.
            */
            p2.vy = perceivedImpactY < paddleCenter ? 1 : -1;
        } else {
            /*
                No active threat (or AI is miscalculating and ignoring it).
                Drift toward a blend of the arena center and P1's current position.
                followFactor controls how strongly the AI mirrors P1's vertical position.
            */
            const p1Center   = p1.y + PADDLE_H / 2;
            const idleTarget = H / 2 * (1 - profile.followFactor)
                             + p1Center * profile.followFactor;
            const diff = idleTarget - paddleCenter;
            p2.vy = Math.abs(diff) > profile.dodgeDeadzone ? (diff > 0 ? 1 : -1) : 0;
        }

        /* --- DASH --- */

        if (profile.useDash
                && isDangerous
                && p2.vy !== 0
                && p2.dashCooldown === 0
                && timeToArrive < profile.dashThreshold) {
            tryDash(p2);
        }

        /* --- THROW --- */

        if (profile.punishCooldowns && p1.dashCooldown > 0.5) {
            aiState.throwTimer = 0;
        }

        if (p2.throwCooldown === 0) {
            aiState.throwTimer = Math.max(0, aiState.throwTimer - dt);

            const clearToThrow = profile.proactive
                ? aiState.throwTimer === 0
                : aiState.throwTimer === 0 && !isDangerous;

            if (clearToThrow) {
                let throwVy = 0;
                if (profile.aimAtPlayer) {
                    const p1Center = p1.y + PADDLE_H / 2;
                    throwVy = p1Center < paddleCenter ? -1 : p1Center > paddleCenter ? 1 : 0;
                }
                throwWithVy(p2, throwVy);
                aiState.throwTimer = profile.throwExtraDelay;
            }
        }
    }

    let lastTs = null;

    function update(ts) {
        if (state.phase !== "playing") return;

        const now = ts / 1000;
        if (lastTs === null) lastTs = now;
        const dt = Math.min(now - lastTs, 0.05);
        lastTs = now;

        const p1 = state.p1;
        const p2 = state.p2;

        /* P1 movement — check both cases for caps-lock safety. */
        p1.vy = (keys["w"] || keys["W"]) ? -1 : (keys["s"] || keys["S"]) ? 1 : 0;

        /* P2: human or AI. */
        if (settings.mode === "ai") {
            updateAI(dt);
        } else {
            p2.vy = keys["ArrowUp"] ? -1 : keys["ArrowDown"] ? 1 : 0;
        }

        for (const p of [p1, p2]) {
            p.throwCooldown = Math.max(0, p.throwCooldown - dt);
            p.dashCooldown  = Math.max(0, p.dashCooldown  - dt);

            if (p.dashing) {
                p.dashTimer -= dt;
                if (p.dashTimer <= 0) { p.dashing = false; p.dashTimer = 0; }
            }

            const vy    = p.dashing ? p.dashDir : p.vy;
            const speed = p.dashing ? DASH_SPEED : PLAYER_SPEED * p.speedMultiplier;
            p.y = clampY(p.y + vy * speed * dt);
        }

        /* Move balls and check collisions. Iterate backward so splicing is safe. */
        for (let i = state.balls.length - 1; i >= 0; i--) {
            const b = state.balls[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;

            if (b.y - BALL_R < 0) { b.y = BALL_R;     b.vy =  Math.abs(b.vy); b.bounces++; }
            if (b.y + BALL_R > H) { b.y = H - BALL_R; b.vy = -Math.abs(b.vy); b.bounces++; }

            /* Hit on P1 — ball moving left, thrown by P2. */
            if (b.vx < 0 && b.owner === "right") {
                if (b.x - BALL_R <= p1.x + PADDLE_W &&
                    b.x + BALL_R >= p1.x             &&
                    b.y + BALL_R >= p1.y             &&
                    b.y - BALL_R <= p1.y + PADDLE_H) {
                    p1.hp -= 1;
                    state.balls.splice(i, 1);
                    if (p1.hp <= 0) { state.phase = "over"; state.winner = "p2"; }
                    continue;
                }
            }

            /* Hit on P2 — ball moving right, thrown by P1. */
            if (b.vx > 0 && b.owner === "left") {
                if (b.x + BALL_R >= p2.x            &&
                    b.x - BALL_R <= p2.x + PADDLE_W &&
                    b.y + BALL_R >= p2.y             &&
                    b.y - BALL_R <= p2.y + PADDLE_H) {
                    p2.hp -= 1;
                    state.balls.splice(i, 1);
                    if (p2.hp <= 0) { state.phase = "over"; state.winner = "p1"; }
                    continue;
                }
            }

            if (b.x < -BALL_R - 20 || b.x > W + BALL_R + 20) {
                state.balls.splice(i, 1);
            }
        }
    }

    /*
        Draw a readiness bar for a cooldown.
        Fills left to right as cooldown expires. Full = ready (colored), empty = on cooldown.
    */
    function drawCooldownBar(x, y, w, h, cooldown, maxCooldown, readyColor, bgColor) {
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, h / 2);
        ctx.fill();

        const readiness = maxCooldown > 0 ? 1 - cooldown / maxCooldown : 1;
        if (readiness > 0) {
            ctx.fillStyle = readyColor;
            ctx.beginPath();
            ctx.roundRect(x, y, w * readiness, h, h / 2);
            ctx.fill();
        }
    }

    /* Draw MAX_HP pip circles for a player, left to right from (x, y center). */
    function drawPips(x, y, hp, fullColor, emptyColor) {
        const r    = 6;
        const step = r * 2 + 5;
        for (let i = 0; i < MAX_HP; i++) {
            ctx.fillStyle = i < hp ? fullColor : emptyColor;
            ctx.beginPath();
            ctx.arc(x + i * step, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /* Render the health pips and cooldown bars for one player. */
    function renderHud(player, side, c) {
        const isLeft   = side === "left";
        const color    = isLeft ? c.p1 : c.p2;
        const label    = isLeft ? "P1" : (settings.mode === "ai" ? "AI" : "P2");
        const PIP_R    = 6;
        const PIP_STEP = PIP_R * 2 + 5;
        const BAR_W    = 54;
        const BAR_H    = 6;
        const MARGIN   = 16;

        const anchor = isLeft ? MARGIN : W - MARGIN;
        const labelY = MARGIN + PIP_R + 2;

        ctx.fillStyle    = color;
        ctx.font         = "bold 13px system-ui, sans-serif";
        ctx.textAlign    = isLeft ? "left" : "right";
        ctx.textBaseline = "middle";
        ctx.fillText(label, anchor, labelY);

        const pipsStart = isLeft
            ? anchor + 28
            : anchor - 28 - (MAX_HP - 1) * PIP_STEP;
        drawPips(pipsStart, labelY, player.hp, c.pipFull, c.pipEmpty);

        const barRowY  = labelY + PIP_R + 10;
        const labelGap = 9;
        const barGap   = 10;

        ctx.fillStyle    = c.muted;
        ctx.font         = "10px system-ui, sans-serif";
        ctx.textBaseline = "middle";

        if (isLeft) {
            ctx.textAlign = "left";
            ctx.fillText("T", anchor, barRowY + BAR_H / 2);
            drawCooldownBar(anchor + labelGap, barRowY, BAR_W, BAR_H,
                player.throwCooldown, THROW_COOLDOWN, c.throwReady, c.cdBg);

            const dStart = anchor + labelGap + BAR_W + barGap;
            ctx.fillText("D", dStart, barRowY + BAR_H / 2);
            drawCooldownBar(dStart + labelGap, barRowY, BAR_W, BAR_H,
                player.dashCooldown, DASH_COOLDOWN, c.dashReady, c.cdBg);
        } else {
            ctx.textAlign = "right";
            ctx.fillText("D", anchor, barRowY + BAR_H / 2);
            drawCooldownBar(anchor - labelGap - BAR_W, barRowY, BAR_W, BAR_H,
                player.dashCooldown, DASH_COOLDOWN, c.dashReady, c.cdBg);

            const tRight = anchor - labelGap - BAR_W - barGap;
            ctx.fillText("T", tRight, barRowY + BAR_H / 2);
            drawCooldownBar(tRight - labelGap - BAR_W, barRowY, BAR_W, BAR_H,
                player.throwCooldown, THROW_COOLDOWN, c.throwReady, c.cdBg);
        }
    }

    function render() {
        const c = getColors();

        ctx.fillStyle = c.bg;
        ctx.fillRect(0, 0, W, H);

        ctx.setLineDash([12, 8]);
        ctx.strokeStyle = c.centerLine;
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.moveTo(W / 2, 0);
        ctx.lineTo(W / 2, H);
        ctx.stroke();
        ctx.setLineDash([]);

        const p1 = state.p1;
        const p2 = state.p2;

        ctx.fillStyle = c.p1;
        ctx.beginPath();
        ctx.roundRect(p1.x, p1.y, PADDLE_W, PADDLE_H, 4);
        ctx.fill();

        ctx.fillStyle = c.p2;
        ctx.beginPath();
        ctx.roundRect(p2.x, p2.y, PADDLE_W, PADDLE_H, 4);
        ctx.fill();

        for (const b of state.balls) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
            ctx.fillStyle = c.ball;
            ctx.fill();
            ctx.strokeStyle = c.ballStroke;
            ctx.lineWidth   = 1.5;
            ctx.stroke();
        }

        renderHud(p1, "left",  c);
        renderHud(p2, "right", c);

        if (state.phase === "over") {
            ctx.fillStyle = c.overlayBg;
            ctx.fillRect(0, 0, W, H);

            const isP1Win  = state.winner === "p1";
            const winColor = isP1Win ? c.p1 : c.p2;
            const winText  = isP1Win ? "Player 1 wins!"
                           : settings.mode === "ai" ? "AI wins!" : "Player 2 wins!";

            ctx.font         = "bold 52px system-ui, sans-serif";
            ctx.textAlign    = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle    = winColor;
            ctx.fillText(winText, W / 2, H / 2 - 28);

            ctx.font      = "20px system-ui, sans-serif";
            ctx.fillStyle = "#cbd5e1";
            ctx.fillText("Press Space or click to play again", W / 2, H / 2 + 22);
        }
    }

    function gameLoop(ts) {
        update(ts);
        render();
        requestAnimationFrame(gameLoop);
    }

    function applySettings() {
        if (settings.mode === "ai") {
            state.p2.speedMultiplier = AI_PROFILES[settings.aiDifficulty].speedFactor;
            aiState.throwTimer       = 0;
        } else {
            state.p2.speedMultiplier = 1.0;
        }
    }

    function resetGame() {
        state.p1           = makePlayer("left");
        state.p2           = makePlayer("right");
        state.balls        = [];
        state.phase        = "playing";
        state.winner       = null;
        lastTs             = null;
        aiState.throwTimer    = 0;
        aiState.currentThreat = null;
        aiState.dodgeOffset   = 0;
        applySettings();
    }

    const gameModeSelect     = document.querySelector("#gameModeSelect");
    const aiDifficultyWrap   = document.querySelector("#aiDifficultyWrap");
    const aiDifficultySelect = document.querySelector("#aiDifficultySelect");

    function syncDifficultyVisibility() {
        if (aiDifficultyWrap) {
            if (settings.mode === "ai") {
                aiDifficultyWrap.removeAttribute("hidden");
            } else {
                aiDifficultyWrap.setAttribute("hidden", "");
            }
        }
    }

    if (gameModeSelect) {
        gameModeSelect.addEventListener("change", () => {
            settings.mode = gameModeSelect.value;
            syncDifficultyVisibility();
            resetGame();
        });
    }

    if (aiDifficultySelect) {
        aiDifficultySelect.addEventListener("change", () => {
            settings.aiDifficulty = aiDifficultySelect.value;
            resetGame();
        });
    }

    syncDifficultyVisibility();

    document.addEventListener("keydown", (e) => {
        keys[e.key] = true;

        if (state.phase === "playing") {
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
                e.preventDefault();
            }
            if (e.key === "d" || e.key === "D") tryThrow(state.p1);
            if (e.key === "a" || e.key === "A") tryDash(state.p1);
            if (settings.mode === "2p") {
                if (e.key === "ArrowLeft")  tryThrow(state.p2);
                if (e.key === "ArrowRight") tryDash(state.p2);
            }
        }

        if (state.phase === "over" && e.key === " ") {
            e.preventDefault();
            resetGame();
        }
    });

    document.addEventListener("keyup", (e) => {
        keys[e.key] = false;
    });

    canvas.addEventListener("click", () => {
        if (state.phase === "over") resetGame();
    });

    requestAnimationFrame(gameLoop);
})();
