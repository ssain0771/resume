/*
    Home page behavior.
    Responsibilities: load text/content from data/index.json, render contact icons, and render the featured project previews from data/projects.json.
*/

/* Inline SVG icons keep the contact links lightweight and easy to style with CSS. */
const ICONS = {
    email: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-13Zm2 0v.38l7 5.25 7-5.25V5.5a.5.5 0 0 0-.5-.5h-13a.5.5 0 0 0-.5.5Zm16 2.88-6.4 4.8a4.5 4.5 0 0 1-5.4 0L3 8.38V18.5c0 .28.22.5.5.5h13a.5.5 0 0 0 .5-.5V8.38Z"></path>
        </svg>
    `,
    github: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 .5A12 12 0 0 0 8.2 23.9c.6.1.8-.2.8-.6v-2.1c-3.3.7-4-1.4-4-1.4-.5-1.3-1.2-1.6-1.2-1.6-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 .1 2-.8 2.5-1.2.1-.7.4-1.2.7-1.5-2.7-.3-5.6-1.3-5.6-6A4.7 4.7 0 0 1 4.9 7c-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2A11.7 11.7 0 0 1 12 4.5c1.2 0 2.5.2 3.7.7C18 3.7 19 4 19 4c.6 1.6.2 2.8.1 3.1a4.7 4.7 0 0 1 1.2 3.3c0 4.7-2.9 5.7-5.7 6 .4.4.8 1.1.8 2.3v3.4c0 .4.2.7.8.6A12 12 0 0 0 12 .5Z"></path>
        </svg>
    `,
    linkedin: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4.98 3.5A1.98 1.98 0 1 1 5 7.46a1.98 1.98 0 0 1-.02-3.96ZM3.5 8.9h3V20h-3V8.9Zm5.25 0h2.88v1.52h.04c.4-.76 1.38-1.56 2.84-1.56 3.04 0 3.6 2 3.6 4.58V20h-3v-5.74c0-1.36-.02-3.12-1.9-3.12-1.91 0-2.2 1.5-2.2 3.02V20h-3V8.9Z"></path>
        </svg>
    `,
    phone: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6.6 2.5h2.8c.5 0 .9.3 1 .8l.8 3.4c.1.4 0 .8-.3 1.1l-1.7 1.7a15.2 15.2 0 0 0 5.3 5.3l1.7-1.7c.3-.3.7-.4 1.1-.3l3.4.8c.5.1.8.5.8 1v2.8c0 .6-.4 1-1 1C11 22 2 13 2 3.5c0-.6.4-1 1-1h3.6Z"></path>
        </svg>
    `
};

/* Infer which icon to show for each contact link based on its href. */
function getLinkType(href) {
    const value = String(href || "").toLowerCase();
    if (value.startsWith("mailto:")) return "email";
    if (value.includes("github.com")) return "github";
    if (value.includes("linkedin.com")) return "linkedin";
    if (value.startsWith("tel:")) return "phone";
    return "email";
}

/* Fetch and render the home-page content blocks. */
(function loadIndexPage() {
    fetch("data/index.json")
        .then((response) => response.json())
        .then((data) => {
            const tagline = document.querySelector("#heroTagline");
            const title = document.querySelector("#heroTitle");
            const lead = document.querySelector("#heroLead");
            const location = document.querySelector("#heroLocation");
            const availability = document.querySelector("#heroAvailability");
            const aboutCopy = document.querySelector("#aboutCopy");
            const focusGrid = document.querySelector("#focusGrid");
            const image = document.querySelector("#aboutImage");
            const contactIcons = document.querySelector("#contactIcons");
            const contactDetails = document.querySelector("#contactDetails");
            const selectedWorkEyebrow = document.querySelector("#selectedWorkEyebrow");
            const selectedWorkTitle = document.querySelector("#selectedWorkTitle");
            const selectedWorkDescription = document.querySelector("#selectedWorkDescription");
            const selectedWorkLink = document.querySelector("#selectedWorkLink");

            if (tagline) tagline.textContent = data.tagline || "";
            if (title) title.textContent = data.heroTitle || data.name || "";
            if (lead) lead.textContent = data.heroLead || "";
            if (location) location.textContent = data.location || "";
            if (availability) availability.textContent = data.availability || "";
            if (image && data.aboutImage) {
                image.src = data.aboutImage.src || image.src;
                image.alt = data.aboutImage.alt || image.alt;
            }

            if (aboutCopy) {
                aboutCopy.innerHTML = "";
                (data.about || []).forEach((paragraph) => {
                    const p = document.createElement("p");
                    p.textContent = paragraph;
                    aboutCopy.appendChild(p);
                });
            }

            if (focusGrid) {
                focusGrid.innerHTML = "";
                (data.focusAreas || []).forEach((item) => {
                    const article = document.createElement("article");
                    article.className = "info-card";
                    article.innerHTML = `
                        <h3>${item.title || ""}</h3>
                        <p>${item.text || ""}</p>
                    `;
                    focusGrid.appendChild(article);
                });
            }

            if (contactIcons) {
                contactIcons.innerHTML = "";
                (data.links || []).forEach((link) => {
                    const type = getLinkType(link.href);
                    const li = document.createElement("li");
                    const a = document.createElement("a");

                    a.className = "contact-icon-link";
                    a.href = link.href || "#";
                    a.innerHTML = ICONS[type] || ICONS.email;
                    a.setAttribute("aria-label", link.label || link.text || type);

                    if (link.target) a.target = link.target;
                    if (link.rel) a.rel = link.rel;

                    li.appendChild(a);
                    contactIcons.appendChild(li);
                });
            }

            if (contactDetails) {
                contactDetails.innerHTML = "";
                (data.contactDetails || []).forEach((item) => {
                    const li = document.createElement("li");
                    li.textContent = item;
                    contactDetails.appendChild(li);
                });
            }

            const featuredSection = data.featuredSection || {};
            if (selectedWorkEyebrow) selectedWorkEyebrow.textContent = featuredSection.eyebrow || selectedWorkEyebrow.textContent;
            if (selectedWorkTitle) selectedWorkTitle.textContent = featuredSection.title || selectedWorkTitle.textContent;
            if (selectedWorkDescription) selectedWorkDescription.textContent = featuredSection.description || selectedWorkDescription.textContent;
            if (selectedWorkLink) {
                selectedWorkLink.href = featuredSection.ctaHref || selectedWorkLink.href;
                selectedWorkLink.textContent = featuredSection.ctaText || selectedWorkLink.textContent;
            }
        })
        .catch((error) => console.error("Failed to load home page content.", error));

    fetch("data/projects.json")
        .then((response) => response.json())
        .then((data) => {
            const preview = document.querySelector("#selectedWorkGrid");
            if (!preview) {
                return;
            }

            preview.innerHTML = "";
            const featured = (data.projects || []).filter((project) => project.featured).slice(0, 3);

            featured.forEach((project) => {
                const article = document.createElement("a");
                article.className = "featured-preview-card";
                article.href = project.pageHref || "#";
                article.innerHTML = `
                    <img class="featured-preview-image" src="${project.image || ""}" alt="${project.imageAlt || project.title || "Project preview"}" loading="lazy">
                    <div class="chip-row">
                        ${(project.tags || []).slice(0, 3).map((tag) => `<span class="chip">${tag}</span>`).join("")}
                    </div>
                    <h3>${project.title || ""}</h3>
                    <p>${project.summary || ""}</p>
                `;
                preview.appendChild(article);
            });
        })
        .catch((error) => console.error("Failed to load project previews.", error));
})();