/*
    RL Hub page behavior.
    Responsibilities: load page copy and render one card per model from data/rlhub.json.
*/

(function initRlHubPage() {
    const eyebrow = document.querySelector("#rlhubEyebrow");
    const title = document.querySelector("#rlhubTitle");
    const description = document.querySelector("#rlhubDescription");
    const grid = document.querySelector("#rlhubGrid");

    /* Build one card that links to the model's Hugging Face page. */
    function makeModelCard(model) {
        const article = document.createElement("article");
        article.className = "game-card";

        article.innerHTML = `
            <div class="game-card-body">
                <div class="game-card-topline">
                    <span class="status-pill">${model.algorithm || ""}</span>
                    <span class="rl-env-label">${model.environment || ""}</span>
                </div>
                <h2>${model.title || "Untitled model"}</h2>
                <p>${model.summary || ""}</p>
                <p class="game-card-note"><strong>Why it matters:</strong> ${model.note || ""}</p>
                <div class="hero-actions">
                    <a class="button-link button-link-primary" href="${model.hfHref || "#"}" target="_blank" rel="noopener noreferrer">View on Hugging Face</a>
                </div>
            </div>
        `;

        return article;
    }

    fetch("data/rlhub.json")
        .then((response) => response.json())
        .then((data) => {
            const page = data.page || {};
            const models = data.models || [];

            if (eyebrow) eyebrow.textContent = page.eyebrow || eyebrow.textContent;
            if (title) title.textContent = page.title || title.textContent;
            if (description) description.textContent = page.description || description.textContent;

            if (!grid) return;

            grid.innerHTML = "";
            models.forEach((model) => {
                grid.appendChild(makeModelCard(model));
            });
        })
        .catch((error) => {
            console.error("Failed to load RL hub content.", error);
            if (grid) {
                grid.innerHTML = `
                    <article class="info-card">
                        <h2>Models unavailable</h2>
                        <p>The model list could not be loaded. Check data/rlhub.json.</p>
                    </article>
                `;
            }
        });
})();
