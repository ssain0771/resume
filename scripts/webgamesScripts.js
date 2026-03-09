/*
    Web Games page behavior.
    Responsibilities: load the landing-page copy and render one card per game from data/webgames.json.
*/

(function initWebGamesPage() {
    const eyebrow = document.querySelector("#webgamesEyebrow");
    const title = document.querySelector("#webgamesTitle");
    const description = document.querySelector("#webgamesDescription");
    const grid = document.querySelector("#webgamesGrid");

    /* Build one card that links to an individual game page. */
    function makeGameCard(game) {
        const article = document.createElement("article");
        article.className = "game-card";

        article.innerHTML = `
            <img class="game-card-image" src="${game.image || ""}" alt="${game.imageAlt || game.title || "Game preview"}" loading="lazy">
            <div class="game-card-body">
                <div class="game-card-topline">
                    <span class="status-pill">${game.status || "Playable"}</span>
                </div>
                <h2>${game.title || "Untitled game"}</h2>
                <p>${game.summary || "<summary placeholder>"}</p>
                <p class="game-card-note"><strong>Why this exists:</strong> ${game.learningGoal || "<learning goal placeholder>"}</p>
                <div class="chip-row">
                    ${(game.tools || []).map((tool) => `<span class="chip">${tool}</span>`).join("")}
                </div>
                <div class="hero-actions">
                    <a class="button-link button-link-primary" href="${game.pageHref || '#'}">Play game</a>
                </div>
            </div>
        `;

        return article;
    }

    fetch("data/webgames.json")
        .then((response) => response.json())
        .then((data) => {
            const page = data.page || {};
            const games = data.games || [];

            if (eyebrow) eyebrow.textContent = page.eyebrow || eyebrow.textContent;
            if (title) title.textContent = page.title || title.textContent;
            if (description) description.textContent = page.description || description.textContent;

            if (!grid) {
                return;
            }

            grid.innerHTML = "";
            games.forEach((game) => {
                grid.appendChild(makeGameCard(game));
            });
        })
        .catch((error) => {
            console.error("Failed to load web games content.", error);
            if (grid) {
                grid.innerHTML = `
                    <article class="info-card">
                        <h2>Web games unavailable</h2>
                        <p>The game list could not be loaded. Check data/webgames.json and the page paths.</p>
                    </article>
                `;
            }
        });
})();
