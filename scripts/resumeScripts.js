/*
    Resume page behavior.
    Responsibilities:
    - load shared profile/contact content from data/index.json
    - load resume variants from data/resume.json
    - render the selected variant for the on-screen layout
    - render a separate print-friendly resume structure for PDF / paper export
*/

/* Resolve the correct root path if this page is ever reused from a nested folder. */
function getResumeDataPath(fileName) {
    if (typeof getRootPath === "function") {
        return `${getRootPath()}data/${fileName}`;
    }

    return `data/${fileName}`;
}

/* Basic HTML escaping keeps injected text safe when we build markup from JSON. */
function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/* Convert contact links into a cleaner display string for the resume. */
function prettyContactText(link) {
    const text = String(link.text || "").trim();
    const href = String(link.href || "").trim();

    if (/^mailto:/i.test(href)) return href.replace(/^mailto:/i, "");
    if (/^tel:/i.test(href)) {
        const digits = href.replace(/^tel:/i, "").replace(/\D/g, "");
        const normalized = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
        if (normalized.length === 10) {
            return `+1 (${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
        }
        return href.replace(/^tel:/i, "");
    }
    if (/^https?:\/\//i.test(href)) return href.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    return text || href;
}


/*
    Print contact text can be shorter than the on-screen chips.
    Email and phone keep their full human-readable values, while profile links use compact domains.
*/
function prettyPrintContactText(link) {
    const href = String(link.href || "").trim();

    if (/^mailto:/i.test(href) || /^tel:/i.test(href)) {
        return prettyContactText(link);
    }

    if (/linkedin\.com/i.test(href)) {
        return href.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
    }

    if (/github\.com/i.test(href)) {
        return href.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
    }

    return prettyContactText(link);
}

/* Render the compact contact line used by the print-only resume header. */
function renderPrintContactList(target, links) {
    if (!target) {
        return;
    }

    target.innerHTML = "";

    (links || []).forEach((link) => {
        const li = document.createElement("li");
        const a = document.createElement("a");

        a.href = link.href || "#";
        a.textContent = prettyPrintContactText(link);

        if (link.target) a.target = link.target;
        if (link.rel) a.rel = link.rel;

        li.appendChild(a);
        target.appendChild(li);
    });
}

/* Build a simple bullet-list string from an array of details. */
function renderDetailList(details) {
    const items = Array.isArray(details) ? details : [];
    if (!items.length) {
        return "";
    }

    return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

/* Render one list of contact links to a <ul>. */
function renderContactList(target, links) {
    if (!target) {
        return;
    }

    target.innerHTML = "";

    (links || []).forEach((link) => {
        const li = document.createElement("li");
        const a = document.createElement("a");

        a.href = link.href || "#";
        a.textContent = prettyContactText(link);

        if (link.target) a.target = link.target;
        if (link.rel) a.rel = link.rel;

        li.appendChild(a);
        target.appendChild(li);
    });
}

/* Render the grouped skill cards used by the screen layout. */
function renderScreenSkillGroups(target, groups) {
    if (!target) {
        return;
    }

    target.innerHTML = "";

    (groups || []).forEach((group) => {
        const article = document.createElement("article");
        article.className = "resume-skill-group";
        article.innerHTML = `
            <h3>${escapeHtml(group.label || "")}</h3>
            <ul>${(group.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        `;
        target.appendChild(article);
    });
}

/* Render education / experience cards for the screen layout. */
function renderScreenEntryList(target, entries) {
    if (!target) {
        return;
    }

    target.innerHTML = "";

    (entries || []).forEach((entry) => {
        const article = document.createElement("article");
        article.className = "resume-entry";
        article.innerHTML = `
            <div class="resume-entry-header">
                <div>
                    <h3>${escapeHtml(entry.program || entry.role || "")}</h3>
                    <div class="resume-entry-org">${escapeHtml(entry.institution || entry.organization || "")}</div>
                </div>
                <div class="resume-entry-period">${escapeHtml(entry.year || entry.period || "")}</div>
            </div>
            ${renderDetailList(entry.details)}
        `;
        target.appendChild(article);
    });
}

/* Render compact inline skill lines for the print layout. */
function renderPrintSkills(target, groups) {
    if (!target) {
        return;
    }

    target.innerHTML = "";

    (groups || []).forEach((group) => {
        const line = document.createElement("p");
        line.className = "print-skill-line";
        line.innerHTML = `<strong>${escapeHtml(group.label || "")}:</strong> ${escapeHtml((group.items || []).join(", "))}`;
        target.appendChild(line);
    });
}

/* Render education / experience rows for the print layout. */
function renderPrintEntries(target, entries) {
    if (!target) {
        return;
    }

    target.innerHTML = "";

    (entries || []).forEach((entry) => {
        const article = document.createElement("article");
        article.className = "print-resume-item";

        const primary = escapeHtml(entry.program || entry.role || "");
        const organization = escapeHtml(entry.institution || entry.organization || "");
        const period = escapeHtml(entry.year || entry.period || "");

        article.innerHTML = `
            <div class="print-resume-item-row">
                <h3 class="print-resume-item-title">
                    <strong>${primary}</strong>${organization ? ` <span class="print-resume-item-org">&mdash; ${organization}</span>` : ""}
                </h3>
                <div class="print-resume-item-period">${period}</div>
            </div>
            ${renderDetailList(entry.details)}
        `;

        target.appendChild(article);
    });
}

/* Main initializer for the resume page. */
(function initResume() {
    const variantSelect = document.querySelector("#resumeVariant");
    const printButton = document.querySelector("#printResume");

    let indexContent = null;
    let resumeContent = null;

    if (printButton) {
        printButton.addEventListener("click", () => window.print());
    }

    /* Render the shared intro/profile content used by all resume variants. */
    function renderProfile() {
        if (!indexContent) {
            return;
        }

        const title = document.querySelector("#resumeIntroTitle");
        const paragraphs = document.querySelector("#resumeIntroCopy");
        const contact = document.querySelector("#resumeContact");
        const printName = document.querySelector("#printResumeName");
        const printProfile = document.querySelector("#printResumeProfile");
        const printContact = document.querySelector("#printResumeContact");

        if (title) {
            title.textContent = indexContent.heroTitle || indexContent.name || "";
        }

        if (paragraphs) {
            paragraphs.innerHTML = "";
            (indexContent.about || []).slice(0, 2).forEach((paragraph) => {
                const p = document.createElement("p");
                p.textContent = paragraph;
                paragraphs.appendChild(p);
            });
        }

        renderContactList(contact, indexContent.links || []);

        /*
            The print header uses all core contact links, but renders them in a tighter two-column grid.
            This keeps the phone number available without forcing the longer social links onto one crowded line.
        */
        renderPrintContactList(printContact, indexContent.links || []);

        if (printName) {
            printName.textContent = indexContent.name || "Simranjot Saini";
        }

        if (printProfile) {
            printProfile.innerHTML = "";
            (indexContent.about || []).slice(0, 2).forEach((paragraph) => {
                const p = document.createElement("p");
                p.textContent = paragraph;
                printProfile.appendChild(p);
            });
        }
    }

    /* Render the selected resume variant into both the screen and print layouts. */
    function renderVariant(variantKey) {
        if (!resumeContent || !resumeContent.variants || !resumeContent.variants[variantKey]) {
            return;
        }

        const variant = resumeContent.variants[variantKey];
        const labels = resumeContent.variantLabels || {};
        const groups = variant.printSkillsGrouped || indexContent?.skills?.grouped || [];

        const pageTitle = document.querySelector("#resumePageTitle");
        const pageLead = document.querySelector("#resumePageLead");
        const educationList = document.querySelector("#educationList");
        const skillsList = document.querySelector("#skillsList");
        const experienceList = document.querySelector("#experienceList");
        const printSkills = document.querySelector("#printResumeSkills");
        const printExperience = document.querySelector("#printResumeExperience");
        const printEducation = document.querySelector("#printResumeEducation");
        const printProfile = document.querySelector("#printResumeProfile");
        const printLayout = document.querySelector("#printResumeLayout");

        if (pageTitle) {
            pageTitle.textContent = `${labels[variantKey] || variantKey} resume`;
        }

        if (pageLead) {
            pageLead.textContent = "Structured for screen and print, with grouped skills and content tailored to the selected resume version.";
        }

        renderScreenSkillGroups(skillsList, groups);
        renderPrintSkills(printSkills, groups);
        renderScreenEntryList(educationList, variant.education || []);
        renderPrintEntries(printEducation, variant.education || []);
        renderScreenEntryList(experienceList, variant.experience || []);
        renderPrintEntries(printExperience, variant.experience || []);

        /* For non-full variants, swap in the condensed single-paragraph print profile. */
        if (printProfile && variant.printProfile) {
            printProfile.innerHTML = "";
            const p = document.createElement("p");
            p.textContent = variant.printProfile;
            printProfile.appendChild(p);
        } else if (printProfile && !variant.printProfile && indexContent) {
            printProfile.innerHTML = "";
            (indexContent.about || []).slice(0, 2).forEach((paragraph) => {
                const p = document.createElement("p");
                p.textContent = paragraph;
                printProfile.appendChild(p);
            });
        }

        /* Compact print spacing for one-page variants; full variant gets standard spacing. */
        if (printLayout) {
            printLayout.classList.toggle("print-resume--compact", !!variant.printProfile);
        }

        const url = new URL(window.location.href);
        url.searchParams.set("variant", variantKey);
        window.history.replaceState({}, "", `${url.pathname}${url.search}`);
        localStorage.setItem("resumeVariant", variantKey);
    }

    Promise.all([
        fetch(getResumeDataPath("index.json")).then((response) => response.json()),
        fetch(getResumeDataPath("resume.json")).then((response) => response.json())
    ])
        .then(([indexJson, resumeJson]) => {
            indexContent = indexJson;
            resumeContent = resumeJson;

            renderProfile();

            const labels = resumeContent.variantLabels || {};
            const keys = Object.keys(resumeContent.variants || {});

            if (variantSelect) {
                variantSelect.innerHTML = "";
                keys.forEach((key) => {
                    const option = document.createElement("option");
                    option.value = key;
                    option.textContent = labels[key] || key;
                    variantSelect.appendChild(option);
                });
            }

            const queryVariant = new URLSearchParams(window.location.search).get("variant");
            const savedVariant = localStorage.getItem("resumeVariant");
            const defaultVariant = resumeContent.defaultVariant || keys[0] || "full";
            const chosen = [queryVariant, savedVariant, defaultVariant].find((variantKey) => keys.includes(variantKey)) || defaultVariant;

            if (variantSelect) {
                variantSelect.value = chosen;
                variantSelect.addEventListener("change", () => renderVariant(variantSelect.value));
            }

            renderVariant(chosen);
        })
        .catch((error) => console.error("Failed to initialize resume page.", error));
})();
