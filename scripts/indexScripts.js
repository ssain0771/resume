/*
    Home page behavior.
    Responsibilities: load text/content from data/index.json, render contact icons, and render the featured project previews from data/projects.json.
*/

/* Inline SVG icons keep the contact links lightweight and easy to style with CSS. */
const ICONS = {
    email: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67z"/>
            <path d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908z"/>
        </svg>
    `,
    github: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
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