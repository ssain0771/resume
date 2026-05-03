/*
    Generic case-study page behavior.
    Reads the project id from ?id=<projectId> in the URL, fetches from projects.json,
    and renders: title, summary, image/embed, what it is (overview), tools (chips),
    why it matters (impact), and an external link in the hero if present.
*/

(function initCaseStudyPage() {
    const root = document.body.dataset.root || "";
    const projectId = new URLSearchParams(location.search).get("id");
    if (!projectId) return;

    fetch(root + "data/projects.json")
        .then((response) => response.json())
        .then((data) => {
            const project = (data.projects || []).find((item) => item.id === projectId);
            if (!project) throw new Error(`Project not found: ${projectId}`);

            const documentTitle = document.querySelector("title");
            const pageTitle = document.querySelector("#caseStudyPageTitle");
            const pageLead = document.querySelector("#caseStudyPageLead");
            const image = document.querySelector("#caseStudyImage");
            const overviewEl = document.querySelector("#caseStudyOverview");
            const tagsEl = document.querySelector("#caseStudyTags");
            const impactEl = document.querySelector("#caseStudyImpact");

            if (documentTitle) documentTitle.textContent = `${project.title || "Project"} | Simranjot Saini`;
            if (pageTitle) pageTitle.textContent = project.title || "";
            if (pageLead) pageLead.textContent = project.summary || "";

            const heroActions = document.querySelector(".hero-card .hero-actions");
            if (heroActions && project.links && project.links.length > 0) {
                const firstLink = project.links[0];
                const a = document.createElement("a");
                a.className = "button-link";
                a.href = firstLink.href || "#";
                a.textContent = firstLink.text || "View project";
                if (/^https?:\/\//i.test(firstLink.href || "")) {
                    a.target = "_blank";
                    a.rel = "noopener noreferrer";
                }
                heroActions.appendChild(a);
            }

            if (image) {
                if (project.iframe) {
                    image.style.display = "none";
                    const embed = document.createElement("iframe");
                    embed.src = project.iframe;
                    embed.className = "case-study-embed";
                    if (project.iframeHeight) embed.style.height = project.iframeHeight;
                    embed.setAttribute("frameborder", "0");
                    embed.setAttribute("allowfullscreen", "");
                    embed.setAttribute("allow", "geolocation");
                    embed.title = project.title || "Project embed";
                    image.parentNode.insertBefore(embed, image);

                    // Prevent the iframe's internal navigation from scrolling the parent page.
                    let savedScrollY = window.scrollY;
                    embed.addEventListener("mouseenter", () => {
                        savedScrollY = window.scrollY;
                    });
                    window.addEventListener("scroll", () => {
                        if (document.activeElement === embed) {
                            window.scrollTo({ top: savedScrollY, behavior: "instant" });
                        }
                    });
                } else {
                    image.src = root + (project.image || "");
                    image.alt = project.imageAlt || project.title || "";
                }
            }

            if (overviewEl) overviewEl.textContent = project.overview || "";

            if (tagsEl) {
                tagsEl.innerHTML = "";
                const toolList = (project.tools || "").split(",").map((t) => t.trim()).filter(Boolean);
                toolList.forEach((tool) => {
                    const span = document.createElement("span");
                    span.className = "chip";
                    span.textContent = tool;
                    tagsEl.appendChild(span);
                });
            }

            if (impactEl) impactEl.textContent = project.impact || "";
        })
        .catch((error) => console.error("Failed to load case study.", error));
})();
