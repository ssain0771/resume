/*
    Portfolio page behavior.
    Responsibilities: load project data, render the project grid, handle expand/collapse,
    and filter projects by search text or tag.
*/

(function initPortfolio() {
    const projectGrid = document.querySelector("#projectGrid");
    const projectSectionHeading = document.querySelector("#projectSectionHeading");
    const toggleProjects = document.querySelector("#toggleProjects");
    const toggleFilters = document.querySelector("#toggleFilters");
    const filterPanel = document.querySelector("#filterPanel");
    const searchInput = document.querySelector("#projectSearch");
    const tagList = document.querySelector("#tagList");
    const noResults = document.querySelector("#noResults");
    const introEyebrow = document.querySelector("#portfolioEyebrow");
    const introTitle = document.querySelector("#portfolioTitle");
    const introDescription = document.querySelector("#portfolioDescription");

    let projects = [];
    let activeTags = new Set();
    let searchTerm = "";
    let isExpanded = false;
    let pageStrings = {};

    /* Expand to the full project list if not already expanded. */
    function expandIfNeeded() {
        if (isExpanded) return;
        isExpanded = true;
        if (projectSectionHeading) projectSectionHeading.textContent = pageStrings.allProjectsTitle || "All projects";
        if (toggleProjects) {
            toggleProjects.textContent = pageStrings.showLess || "Show fewer projects";
            toggleProjects.setAttribute("aria-expanded", "true");
        }
    }

    /* Return true when a project matches the active search term and all selected tags. */
    function matchesFilter(project) {
        const haystack = [
            project.title,
            project.summary,
            project.tools,
            ...(project.tags || [])
        ].join(" ").toLowerCase();

        const tagMatch = activeTags.size === 0 || [...activeTags].every((t) => (project.tags || []).includes(t));
        const searchMatch = !searchTerm || haystack.includes(searchTerm);
        return tagMatch && searchMatch;
    }

    /* Enable mouse-drag scrolling on an overflow-x element.
       Returns { wasDragged, reset } so the parent card can query and clear drag state. */
    function addDragScroll(el) {
        let isDown = false;
        let startX;
        let scrollLeft;
        let hasDragged = false;

        el.addEventListener("mousedown", (e) => {
            e.preventDefault(); /* stop browser from initiating native link drag */
            isDown = true;
            hasDragged = false;
            startX = e.pageX - el.offsetLeft;
            scrollLeft = el.scrollLeft;
            el.classList.add("is-dragging");
        });

        el.addEventListener("mouseleave", () => {
            isDown = false;
            el.classList.remove("is-dragging");
        });

        el.addEventListener("mouseup", () => {
            isDown = false;
            el.classList.remove("is-dragging");
        });

        el.addEventListener("mousemove", (e) => {
            if (!isDown) return;
            const x = e.pageX - el.offsetLeft;
            const walk = x - startX;
            if (Math.abs(walk) > 4) {
                hasDragged = true;
                e.preventDefault();
            }
            el.scrollLeft = scrollLeft - walk;
        });

        /* Swallow clicks that were actually drags so tags don't activate mid-scroll. */
        el.addEventListener("click", (e) => {
            if (hasDragged) e.stopPropagation();
        }, true);

        return {
            wasDragged: () => hasDragged,
            reset: () => { hasDragged = false; }
        };
    }

    /* Build one clickable project card. */
    function makeProjectCard(project) {
        const article = document.createElement("a");
        article.className = "project-card";
        article.href = project.pageHref || "#";
        article.setAttribute("data-project-id", project.id || "");

        const tagsHtml = (project.tags || []).slice(0, 4)
            .map((tag) => `<span class="card-tag${activeTags.has(tag) ? " is-active" : ""}" data-tag="${tag}">${tag}</span>`)
            .join("");

        article.innerHTML = `
            <img class="project-card-image" src="${project.image || ""}" alt="${project.imageAlt || project.title || "Project image"}" loading="lazy">
            <div class="project-card-content">
                <div class="project-card-meta">${tagsHtml}</div>
                <h3>${project.title || ""}</h3>
                <p>${project.summary || ""}</p>
            </div>
        `;

        const dragState = addDragScroll(article.querySelector(".project-card-meta"));

        // Each new press resets drag state so a previous abandoned drag doesn't
        // block a subsequent legitimate click on the card.
        article.addEventListener("mousedown", () => dragState.reset());

        // Block card navigation when the tag row was being dragged.
        article.addEventListener("click", (e) => {
            if (dragState.wasDragged()) {
                e.preventDefault();
                dragState.reset();
            }
        });

        article.querySelectorAll(".card-tag").forEach((span) => {
            span.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const tag = span.dataset.tag;
                activeTags.has(tag) ? activeTags.delete(tag) : activeTags.add(tag);
                renderTags();
                renderProjects();
            });
        });

        return article;
    }

    /* Render the clickable tag filters.
       Only shows tags that appear on at least one currently-matching project,
       plus any active tags (so they can always be deselected). */
    function renderTags() {
        if (!tagList) return;

        // Tags on projects that pass the current filters.
        const available = new Set();
        projects.filter(matchesFilter).forEach((p) => (p.tags || []).forEach((t) => available.add(t)));
        // Always keep active tags visible so the user can deselect them.
        activeTags.forEach((t) => available.add(t));

        // Maintain stable alphabetical order from the full tag universe.
        const allTags = new Set();
        projects.forEach((p) => (p.tags || []).forEach((t) => allTags.add(t)));

        tagList.innerHTML = "";
        Array.from(allTags).sort().forEach((tag) => {
            if (!available.has(tag)) return;
            const button = document.createElement("button");
            button.type = "button";
            button.className = "tag-button";
            button.textContent = tag;
            if (activeTags.has(tag)) button.classList.add("is-active");
            button.addEventListener("click", () => {
                activeTags.has(tag) ? activeTags.delete(tag) : activeTags.add(tag);
                expandIfNeeded();
                renderTags();
                renderProjects();
            });
            tagList.appendChild(button);
        });
    }

    /*
        Render the project grid.
        Featured mode: 3-column, featured projects only.
        Expanded mode: 2-column, all projects.
        Filters apply in both modes.
    */
    function renderProjects() {
        if (!projectGrid) return;

        const source = isExpanded
            ? [...projects].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
            : projects.filter((p) => p.featured);
        const filtered = source.filter(matchesFilter);

        projectGrid.innerHTML = "";
        filtered.forEach((project) => projectGrid.appendChild(makeProjectCard(project)));

        if (noResults) noResults.hidden = filtered.length > 0;
    }

    /* Toggle the collapsible filter panel. */
    if (toggleFilters && filterPanel) {
        toggleFilters.addEventListener("click", () => {
            const isOpen = !filterPanel.hasAttribute("hidden");
            if (isOpen) {
                filterPanel.setAttribute("hidden", "");
                toggleFilters.setAttribute("aria-expanded", "false");
            } else {
                filterPanel.removeAttribute("hidden");
                toggleFilters.setAttribute("aria-expanded", "true");
            }
        });
    }

    /* Toggle between featured (3-col) and all-projects (2-col) mode. */
    if (toggleProjects) {
        toggleProjects.addEventListener("click", () => {
            isExpanded = !isExpanded;
            renderProjects();

            if (projectSectionHeading) {
                projectSectionHeading.textContent = isExpanded
                    ? (pageStrings.allProjectsTitle || "All projects")
                    : "Featured projects";
            }

            toggleProjects.textContent = isExpanded
                ? (pageStrings.showLess || "Show fewer projects")
                : (pageStrings.showMore || "Show more projects");
            toggleProjects.setAttribute("aria-expanded", isExpanded ? "true" : "false");
        });
    }

    fetch("data/projects.json")
        .then((response) => response.json())
        .then((data) => {
            pageStrings = data.page || {};
            projects = data.projects || [];

            if (introEyebrow) introEyebrow.textContent = pageStrings.eyebrow || introEyebrow.textContent;
            if (introTitle) introTitle.textContent = pageStrings.title || introTitle.textContent;
            if (introDescription) introDescription.textContent = pageStrings.description || introDescription.textContent;
            if (toggleProjects) toggleProjects.textContent = pageStrings.showMore || toggleProjects.textContent;
            if (noResults) noResults.textContent = pageStrings.emptyMessage || noResults.textContent;

            if (searchInput) {
                searchInput.placeholder = pageStrings.searchPlaceholder || searchInput.placeholder;
                searchInput.addEventListener("input", () => {
                    searchTerm = String(searchInput.value || "").trim().toLowerCase();
                    expandIfNeeded();
                    renderProjects();
                });
            }

            renderTags();
            renderProjects();
        })
        .catch((error) => console.error("Failed to load portfolio content.", error));
})();
