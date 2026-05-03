/*
    Hub page behavior.
    Reads ?id=<hubId> from the URL, fetches the matching JSON file, and renders
    the page header and a card grid. Supported hub IDs: webgames, rl, fcc.
*/

(function initHubPage() {
    const root = document.body.dataset.root || "";
    const hubId = new URLSearchParams(location.search).get("id");

    const hubMap = {
        "webgames": "data/webgames.json",
        "rl":       "data/rlhub.json",
        "fcc":      "data/fcc.json"
    };

    const dataFile = hubMap[hubId];
    if (!dataFile) return;

    function makeCard(item) {
        const imageHtml = item.image
            ? `<img class="game-card-image" src="${root}${item.image}" alt="${item.imageAlt || item.title || ""}" loading="lazy">`
            : "";

        const toplineHtml = (item.label || item.sublabel)
            ? `<div class="game-card-topline">
                   ${item.label ? `<span class="status-pill">${item.label}</span>` : ""}
                   ${item.sublabel ? `<span class="hub-sublabel">${item.sublabel}</span>` : ""}
               </div>`
            : "";

        const noteHtml = item.note
            ? `<p class="game-card-note"><strong>${item.noteLabel || "Note"}:</strong> ${item.note}</p>`
            : "";

        const tagsHtml = (item.tags || []).length > 0
            ? `<div class="chip-row">${item.tags.map((t) => `<span class="chip">${t}</span>`).join("")}</div>`
            : "";

        const isExternal = item.actionExternal || /^https?:\/\//i.test(item.actionHref || "");
        const actionTarget = isExternal ? `target="_blank" rel="noopener noreferrer"` : "";
        const actionHref = isExternal ? (item.actionHref || "#") : root + (item.actionHref || "");

        const article = document.createElement("article");
        article.className = "game-card";
        article.innerHTML = `
            ${imageHtml}
            <div class="game-card-body">
                ${toplineHtml}
                <h2>${item.title || "Untitled"}</h2>
                <p>${item.summary || ""}</p>
                ${noteHtml}
                ${tagsHtml}
                <div class="hero-actions">
                    <a class="button-link button-link-primary" href="${actionHref}" ${actionTarget}>${item.actionText || "View"}</a>
                </div>
            </div>
        `;
        return article;
    }

    fetch(root + dataFile)
        .then((response) => response.json())
        .then((data) => {
            const page = data.page || {};
            const section = page.section || {};
            const items = data.items || [];

            const docTitle = document.querySelector("title");
            const eyebrow = document.querySelector("#hubEyebrow");
            const title = document.querySelector("#hubTitle");
            const description = document.querySelector("#hubDescription");
            const sectionEyebrow = document.querySelector("#hubSectionEyebrow");
            const sectionHeading = document.querySelector("#hubSectionHeading");
            const sectionDescription = document.querySelector("#hubSectionDescription");
            const grid = document.querySelector("#hubGrid");

            if (docTitle && page.title) docTitle.textContent = `${page.title} | Simranjot Saini`;
            if (eyebrow) eyebrow.textContent = page.eyebrow || "";
            if (title) title.textContent = page.title || "";
            if (description) description.textContent = page.description || "";
            if (sectionEyebrow) sectionEyebrow.textContent = section.eyebrow || "";
            if (sectionHeading) sectionHeading.textContent = section.heading || "";
            if (sectionDescription) sectionDescription.textContent = section.description || "";

            if (!grid) return;
            grid.innerHTML = "";
            items.forEach((item) => grid.appendChild(makeCard(item)));
        })
        .catch((error) => {
            console.error("Failed to load hub content.", error);
            const grid = document.querySelector("#hubGrid");
            if (grid) {
                grid.innerHTML = `
                    <article class="info-card">
                        <h2>Content unavailable</h2>
                        <p>The hub content could not be loaded.</p>
                    </article>
                `;
            }
        });
})();
