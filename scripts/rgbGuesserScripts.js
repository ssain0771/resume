/*
    RGB Guesser.
    Responsibilities:
    1) Generate a random target RGB triplet.
    2) Create one exact-match answer plus a set of distractor colours.
    3) Treat difficulty as the number of visible answer choices.
    4) Track score, streak, and round count.
    5) Allow the player to advance by clicking the game panel after a round ends.
*/

(function initRgbGuesser() {
    const difficultyInput = document.querySelector("#difficultyInput");
    const difficultyExplanation = document.querySelector("#difficultyExplanation");
    const targetLabel = document.querySelector("#targetRgbValue");
    const feedbackPanel = document.querySelector("#feedbackPanel");
    const paletteGrid = document.querySelector("#paletteGrid");
    const newRoundButton = document.querySelector("#newRoundButton");
    const scoreValue = document.querySelector("#scoreValue");
    const streakValue = document.querySelector("#streakValue");
    const roundValue = document.querySelector("#roundValue");
    const gameMain = document.querySelector("#gameMain");
    const targetPanel = document.querySelector("#targetPanel");

    const state = {
        score: 0,
        streak: 0,
        rounds: 0,
        target: null,
        guessed: false,
        answerKey: ""
    };

    /* Clamp a numeric input to the supported difficulty range. */
    function getDifficulty() {
        const raw = Number(difficultyInput && difficultyInput.value);
        if (!Number.isFinite(raw)) return 6;
        return Math.min(25, Math.max(4, Math.round(raw)));
    }

    /* Convert an RGB object into a stable string key used to remove duplicate colours. */
    function toKey(rgb) {
        return `${rgb.r},${rgb.g},${rgb.b}`;
    }

    /* Pretty-print an RGB object for labels and feedback. */
    function toRgbText(rgb) {
        return `RGB(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    }

    /* Standard Euclidean distance in RGB space. */
    function colourDistance(a, b) {
        return Math.sqrt(
            ((a.r - b.r) ** 2) +
            ((a.g - b.g) ** 2) +
            ((a.b - b.b) ** 2)
        );
    }

    /* Shuffle a copy of an array so the correct answer does not stay in one position. */
    function shuffle(items) {
        const copy = [...items];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    /* Generate a new random RGB triplet. */
    function makeRandomColour() {
        return {
            r: Math.floor(Math.random() * 256),
            g: Math.floor(Math.random() * 256),
            b: Math.floor(Math.random() * 256)
        };
    }

    /*
        Create distractor colours that stay visually separated from the correct answer and from each other.
        The distance threshold relaxes slowly if a rare round becomes hard to fill.
    */
    function buildOptions(target, difficulty) {
        const paletteMap = new Map();
        let minimumDistance = 120;
        let attempts = 0;

        paletteMap.set(toKey(target), target);

        while (paletteMap.size < difficulty && attempts < 2500) {
            attempts += 1;
            const candidate = makeRandomColour();
            const candidateKey = toKey(candidate);

            if (paletteMap.has(candidateKey)) {
                continue;
            }

            const distances = Array.from(paletteMap.values()).map((colour) => colourDistance(candidate, colour));
            const isFarEnough = distances.every((distance) => distance >= minimumDistance);

            if (isFarEnough) {
                paletteMap.set(candidateKey, candidate);
            }

            if (attempts % 200 === 0 && paletteMap.size < difficulty) {
                minimumDistance = Math.max(45, minimumDistance - 15);
            }
        }

        while (paletteMap.size < difficulty) {
            const fallback = makeRandomColour();
            paletteMap.set(toKey(fallback), fallback);
        }

        return shuffle(Array.from(paletteMap.values()));
    }

    /* Update score/streak/round values in the sidebar. */
    function renderStats() {
        if (scoreValue) scoreValue.textContent = String(state.score);
        if (streakValue) streakValue.textContent = String(state.streak);
        if (roundValue) roundValue.textContent = String(state.rounds);
    }

    /* Show a human-readable reminder of what the current difficulty means. */
    function renderDifficultyExplanation(difficulty) {
        if (!difficultyExplanation) {
            return;
        }

        difficultyExplanation.textContent = `This round will show ${difficulty} colour option${difficulty === 1 ? "" : "s"}.`;
    }

    /* Pick a sensible number of grid columns for the current difficulty. */
    function getGridColumnCount(difficulty) {
        if (difficulty <= 4) return 2;
        if (difficulty <= 9) return 3;
        if (difficulty <= 16) return 4;
        return 5;
    }

    /* Build one clickable swatch button in the answer grid. */
    function makeSwatchButton(rgb, index) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "swatch-button";
        button.dataset.rgbKey = toKey(rgb);
        button.setAttribute("role", "listitem");
        button.setAttribute("aria-label", `Colour option ${index + 1}`);

        button.innerHTML = `
            <span class="swatch-colour" style="background: rgb(${rgb.r}, ${rgb.g}, ${rgb.b});"></span>
        `;

        button.addEventListener("click", (event) => {
            /* Prevent the same click from bubbling to the game panel and instantly starting the next round. */
            event.stopPropagation();
            handleGuess(rgb, button);
        });
        return button;
    }

    /* Render the palette for the current round. */
    function renderPalette(options) {
        if (!paletteGrid) {
            return;
        }

        const columnCount = getGridColumnCount(options.length);
        paletteGrid.style.setProperty("--game-columns", String(columnCount));
        paletteGrid.innerHTML = "";
        options.forEach((rgb, index) => {
            paletteGrid.appendChild(makeSwatchButton(rgb, index));
        });
    }

    /* Update the large game panel state so the player knows they can advance. */
    function setAdvanceState(isReady) {
        if (gameMain) {
            gameMain.classList.toggle("is-ready", isReady);
        }
        if (feedbackPanel) {
            feedbackPanel.classList.toggle("is-ready", isReady);
        }
        if (targetPanel) {
            targetPanel.classList.toggle("is-ready", isReady);
        }
    }

    /* Lock the round when the player clicks a swatch, then explain the result. */
    function handleGuess(guess, button) {
        if (state.guessed) {
            return;
        }

        state.guessed = true;
        state.rounds += 1;
        setAdvanceState(true);

        const buttons = Array.from(document.querySelectorAll(".swatch-button"));
        buttons.forEach((item) => {
            item.disabled = true;
            const isCorrect = item.dataset.rgbKey === state.answerKey;
            if (isCorrect) {
                item.classList.add("is-correct");
            }
        });

        const guessedKey = toKey(guess);
        const wasCorrect = guessedKey === state.answerKey;

        if (button && !wasCorrect) {
            button.classList.add("is-incorrect");
        }

        if (wasCorrect) {
            state.score += 1;
            state.streak += 1;
            if (feedbackPanel) {
                feedbackPanel.innerHTML = `<strong>Correct.</strong> You matched ${toRgbText(guess)}. Click this panel or the game area to start the next round.`;
            }
        } else {
            state.streak = 0;
            const guessDistance = colourDistance(state.target, guess).toFixed(2);
            if (feedbackPanel) {
                feedbackPanel.innerHTML = `
                    <strong>Not quite.</strong>
                    You picked a swatch ${guessDistance} units away from ${toRgbText(state.target)}. The highlighted swatch is the exact match. Click this panel or the game area to start the next round.
                `;
            }
        }

        renderStats();
    }

    /* Start a brand-new round using the current difficulty. */
    function startRound() {
        const difficulty = getDifficulty();
        if (difficultyInput) {
            difficultyInput.value = String(difficulty);
        }

        const target = makeRandomColour();
        const options = buildOptions(target, difficulty);

        state.target = target;
        state.answerKey = toKey(target);
        state.guessed = false;

        renderDifficultyExplanation(difficulty);
        renderPalette(options);
        renderStats();
        setAdvanceState(false);

        if (targetLabel) {
            targetLabel.textContent = toRgbText(target);
        }

        if (feedbackPanel) {
            feedbackPanel.textContent = "Pick a swatch to lock in your answer.";
        }
    }

    /* Advance to a fresh round after the previous one is complete. */
    function advanceRoundIfReady() {
        if (!state.guessed) {
            return;
        }
        startRound();
    }

    if (difficultyInput) {
        difficultyInput.addEventListener("change", startRound);
        difficultyInput.addEventListener("input", () => {
            renderDifficultyExplanation(getDifficulty());
        });
    }

    if (newRoundButton) {
        newRoundButton.addEventListener("click", startRound);
    }

    if (gameMain) {
        gameMain.addEventListener("click", (event) => {
            if (!state.guessed) {
                return;
            }

            const clickedSwatch = event.target.closest(".swatch-button");
            if (clickedSwatch && !clickedSwatch.disabled) {
                return;
            }

            advanceRoundIfReady();
        });
    }

    if (feedbackPanel) {
        feedbackPanel.addEventListener("keydown", (event) => {
            if (!state.guessed) {
                return;
            }

            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                advanceRoundIfReady();
            }
        });
    }

    startRound();
})();
