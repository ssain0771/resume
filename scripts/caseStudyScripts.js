/*
    Generic case-study page behavior.
    Responsibilities: look up the correct project in data/projects.json using the body data-project-id value, then render the matching project details into the template.
*/

(function initCaseStudyPage() {
    const projectId = document.body.dataset.projectId;
    if (!projectId) {
        return;
    }

    fetch("../data/projects.json")
        .then((response) => response.json())
        .then((data) => {
            const project = (data.projects || []).find((item) => item.id === projectId);
            if (!project) {
                throw new Error(`Project not found for id: ${projectId}`);
            }

            const pageTitle = document.querySelector("#caseStudyPageTitle");
            const pageLead = document.querySelector("#caseStudyPageLead");
            const backLink = document.querySelector("#backToPortfolioLink");
            const image = document.querySelector("#caseStudyImage");
            const metaList = document.querySelector("#caseStudyMeta");
            const overviewTitle = document.querySelector("#caseStudyOverviewTitle");
            const overviewText = document.querySelector("#caseStudyOverviewText");
            const sectionGrid = document.querySelector("#caseStudySectionGrid");
            const linkList = document.querySelector("#caseStudyLinkList");
            const documentTitle = document.querySelector("title");

            if (documentTitle) {
                documentTitle.textContent = `${project.title || "Project"} | Simranjot Saini`;
            }

            if (pageTitle) pageTitle.textContent = project.title || pageTitle.textContent;
            if (pageLead) pageLead.textContent = project.summary || pageLead.textContent;
            if (backLink) backLink.href = "../portfolio.html";
            if (image) {
                image.src = `../${project.image || ""}`;
                image.alt = project.imageAlt || project.title || image.alt;
            }

            if (metaList) {
                const items = [
                    { label: "Role", value: project.role || "<role placeholder>" },
                    { label: "Tools", value: project.tools || "<tools placeholder>" },
                    { label: "Impact", value: project.impact || "<impact placeholder>" }
                ];

                metaList.innerHTML = "";
                items.forEach((item) => {
                    const li = document.createElement("li");
                    li.className = "meta-item";
                    li.innerHTML = `
                        <span class="meta-label">${item.label}</span>
                        <span>${item.value}</span>
                    `;
                    metaList.appendChild(li);
                });
            }

            if (overviewTitle) {
                overviewTitle.textContent = "Project overview";
            }

            if (overviewText) {
                overviewText.textContent = project.overview || "";
            }

            if (sectionGrid) {
                sectionGrid.innerHTML = "";

                const cards = [
                    { title: "Challenge", body: project.challenge || "<challenge placeholder>" },
                    {
                        title: "Process",
                        body: (project.process || []).join(" ")
                    },
                    { title: "Outcome", body: project.outcome || "<outcome placeholder>" },
                    ...(project.detailSections || [])
                ];

                cards.forEach((card) => {
                    const article = document.createElement("article");
                    article.className = "info-card";
                    article.innerHTML = `
                        <h3>${card.title || ""}</h3>
                        <p>${card.body || ""}</p>
                    `;
                    sectionGrid.appendChild(article);
                });
            }

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
        .catch((error) => {
            console.error("Failed to load case study page.", error);
            const sectionGrid = document.querySelector("#caseStudySectionGrid");
            if (sectionGrid) {
                sectionGrid.innerHTML = `
                    <article class="info-card">
                        <h3>Project unavailable</h3>
                        <p>The case study data could not be loaded. Check the project id and data file paths.</p>
                    </article>
                `;
            }
        });
})();