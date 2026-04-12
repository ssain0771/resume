/*
    Generic case-study page behavior.
    Looks up the project by data-project-id and renders a concise one-page view:
    title, summary, image, what it is (overview), tools (chips), why it matters (impact), and links.
*/

(function initCaseStudyPage() {
    const projectId = document.body.dataset.projectId;
    if (!projectId) return;

    fetch("../data/projects.json")
        .then((response) => response.json())
        .then((data) => {
            const project = (data.projects || []).find((item) => item.id === projectId);
            if (!project) throw new Error(`Project not found: ${projectId}`);

            const documentTitle = document.querySelector("title");
            const pageTitle = document.querySelector("#caseStudyPageTitle");
            const pageLead = document.querySelector("#caseStudyPageLead");
            const backLink = document.querySelector("#backToPortfolioLink");
            const image = document.querySelector("#caseStudyImage");
            const overviewEl = document.querySelector("#caseStudyOverview");
            const tagsEl = document.querySelector("#caseStudyTags");
            const impactEl = document.querySelector("#caseStudyImpact");
            const linkList = document.querySelector("#caseStudyLinkList");

            if (documentTitle) documentTitle.textContent = `${project.title || "Project"} | Simranjot Saini`;
            if (pageTitle) pageTitle.textContent = project.title || "";
            if (pageLead) pageLead.textContent = project.summary || "";
            if (backLink) backLink.href = "../portfolio.html";

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
                    image.src = `../${project.image || ""}`;
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

            if (linkList) {
                linkList.innerHTML = "";
                (project.links || []).forEach((link) => {
                    const a = document.createElement("a");
                    a.className = "button-link";
                    a.href = link.href || "#";
                    a.textContent = link.text || "Project link";
                    if (/^https?:\/\//i.test(link.href || "")) {
                        a.target = "_blank";
                        a.rel = "noopener noreferrer";
                    }
                    linkList.appendChild(a);
                });
            }
        })
        .catch((error) => console.error("Failed to load case study.", error));
})();
