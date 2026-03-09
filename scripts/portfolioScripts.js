/*
    Portfolio page behavior.
    Responsibilities: load project data, render featured cards, render the expandable archive, and filter archive cards by search text or tag.
*/

(function initPortfolio() {
    const featuredGrid = document.querySelector("#featuredProjectGrid");
    const allGrid = document.querySelector("#allProjectGrid");
    const allWrap = document.querySelector("#allProjectsWrap");
    const toggleButton = document.querySelector("#toggleProjects");
    const searchInput = document.querySelector("#projectSearch");
    const tagList = document.querySelector("#tagList");
    const noResults = document.querySelector("#noResults");
    const allProjectsTitle = document.querySelector("#allProjectsTitle");
    const introEyebrow = document.querySelector("#portfolioEyebrow");
    const introTitle = document.querySelector("#portfolioTitle");
    const introDescription = document.querySelector("#portfolioDescription");

    let projects = [];
    let activeTag = "";
    let searchTerm = "";

    /* Return true when a project matches the active search term and selected tag. */
    function matchesFilter(project) {
        const haystack = [
            project.title,
            project.summary,
            project.tools,
            ...(project.tags || [])
        ].join(" ").toLowerCase();

        const tagMatch = !activeTag || (project.tags || []).includes(activeTag);
        const searchMatch = !searchTerm || haystack.includes(searchTerm);
        return tagMatch && searchMatch;
    }

    /* Build one clickable project card for either the featured grid or the full archive. */
    function makeProjectCard(project) {
        const article = document.createElement("a");
        article.className = "project-card";
        article.href = project.pageHref || "#";
        article.setAttribute("data-project-id", project.id || "");

        article.innerHTML = `
            <img class="project-card-image" src="${project.image || ""}" alt="${project.imageAlt || project.title || "Project image"}" loading="lazy">
            <div class="project-card-content">
                <div class="project-card-meta">
                    ${(project.tags || []).slice(0, 3).map((tag) => `<span>${tag}</span>`).join("")}
                </div>
                <h3>${project.title || ""}</h3>
                <p>${project.summary || ""}</p>
                <p class="project-card-impact"><strong>Impact:</strong> ${project.impact || "<impact placeholder>"}</p>
                <div class="chip-row">
                    <span class="chip">${project.role || "Project role"}</span>
                </div>
            </div>
        `;

        return article;
    }

    /* Render the clickable tag filters based on all tags found in the project data. */
    function renderTags() {
        if (!tagList) {
            return;
        }

        const tagSet = new Set();
        projects.forEach((project) => {
            (project.tags || []).forEach((tag) => tagSet.add(tag));
        });

        tagList.innerHTML = "";

        Array.from(tagSet).sort().forEach((tag) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "tag-button";
            button.textContent = tag;
            if (tag === activeTag) {
                button.classList.add("is-active");
            }

            button.addEventListener("click", () => {
                activeTag = activeTag === tag ? "" : tag;
                renderTags();
                renderAllProjects();
            });

            tagList.appendChild(button);
        });
    }

    /* Show only featured projects in the top grid. */
    function renderFeaturedProjects() {
        if (!featuredGrid) {
            return;
        }

        featuredGrid.innerHTML = "";
        projects
            .filter((project) => project.featured)
            .forEach((project) => featuredGrid.appendChild(makeProjectCard(project)));
    }

    /* Render the archive grid using the current active filters. */
    function renderAllProjects() {
        if (!allGrid) {
            return;
        }

        allGrid.innerHTML = "";
        const filtered = projects.filter(matchesFilter);

        filtered.forEach((project) => {
            allGrid.appendChild(makeProjectCard(project));
        });

        if (noResults) {
            noResults.hidden = filtered.length > 0;
        }
    }

    fetch("data/projects.json")
        .then((response) => response.json())
        .then((data) => {
            const page = data.page || {};
            projects = data.projects || [];

            if (introEyebrow) introEyebrow.textContent = page.eyebrow || introEyebrow.textContent;
            if (introTitle) introTitle.textContent = page.title || introTitle.textContent;
            if (introDescription) introDescription.textContent = page.description || introDescription.textContent;
            if (allProjectsTitle) allProjectsTitle.textContent = page.allProjectsTitle || allProjectsTitle.textContent;
            if (toggleButton) toggleButton.textContent = page.showMore || toggleButton.textContent;
            if (searchInput) {
                searchInput.placeholder = page.searchPlaceholder || searchInput.placeholder;
                searchInput.addEventListener("input", () => {
                    searchTerm = String(searchInput.value || "").trim().toLowerCase();
                    renderAllProjects();
                });
            }
            if (noResults) noResults.textContent = page.emptyMessage || noResults.textContent;

            renderFeaturedProjects();
            renderTags();
            renderAllProjects();

            if (toggleButton && allWrap) {
                toggleButton.addEventListener("click", () => {
                    const isHidden = allWrap.hasAttribute("hidden");
                    if (isHidden) {
                        allWrap.removeAttribute("hidden");
                        toggleButton.textContent = page.showLess || "Show fewer projects";
                        toggleButton.setAttribute("aria-expanded", "true");
                    } else {
                        allWrap.setAttribute("hidden", "");
                        toggleButton.textContent = page.showMore || "Show more projects";
                        toggleButton.setAttribute("aria-expanded", "false");
                    }
                });
            }
        })
        .catch((error) => console.error("Failed to load portfolio content.", error));
})();