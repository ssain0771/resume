/*
    resume scripts
    - Data: data/resume.json (education + experience variants)
    - Print-only extras: data/index.json (name, bio, grouped skills, links)
*/

(() => {
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => Array.from(document.querySelectorAll(sel));

    // ---------- Print-only content from index.json ----------
    function extractNameFromIndexTitle(titleText) {
        const raw = String(titleText || "").trim();
        const m = raw.match(/I'm\s+([^,(]+)(?:\s*\(|,|\.|$)/i);
        return m ? m[1].trim() : "";
    }

    function renderGroupedSkills(groups, targetUl) {
        if (!targetUl) return;
        targetUl.innerHTML = "";

        (groups || []).forEach((group) => {
            const label = String(group.label || "").trim();
            const items = Array.isArray(group.items) ? group.items : [];

            const li = document.createElement("li");
            // Compact print-friendly format: "Programming: Python, JavaScript, SQL"
            const strong = document.createElement("strong");
            strong.textContent = label ? `${label}: ` : "";

            li.appendChild(strong);
            li.appendChild(document.createTextNode(items.join(", ")));
            targetUl.appendChild(li);
        });
    }

    function fillPrintOnlyFromIndexJson() {
        return fetch("data/index.json")
            .then((res) => res.json())
            .then((data) => {
                const rawTitle = String(data.title || "").trim();
                const resolvedName = extractNameFromIndexTitle(rawTitle);

                const printName = $("#printName");
                if (printName) printName.textContent = resolvedName || "";

                const titleLine = $("#printTitleLine");
                const bio1 = $("#printBio1");
                const bio2 = $("#printBio2");

                if (titleLine) titleLine.textContent = rawTitle || "";
                if (bio1) bio1.textContent = data.bio?.[0] || "";
                if (bio2) bio2.textContent = data.bio?.[1] || "";

                // ✅ grouped skills (NOT individual)
                renderGroupedSkills(data.skills?.grouped || [], $("#printSkills"));

                // Contact links
                const contactUl = $("#printContact");
                if (contactUl) {
                    contactUl.innerHTML = "";
                    (data.links || []).forEach((link) => {
                        const li = document.createElement("li");
                        const a = document.createElement("a");
                        a.href = link.href || "#";
                        a.textContent = link.text || "";
                        if (link.target) a.target = link.target;
                        if (link.rel) a.rel = link.rel;
                        li.appendChild(a);
                        contactUl.appendChild(li);
                    });
                }

                // Optional: only change the browser tab title while printing
                const originalTitle = document.title;
                window.addEventListener("beforeprint", () => {
                    if (resolvedName) document.title = `${resolvedName} — Resume`;
                });
                window.addEventListener("afterprint", () => {
                    document.title = originalTitle;
                });

                return { resolvedName };
            })
            .catch((err) => {
                console.error("Failed to load data/index.json for print-only content", err);
                return { resolvedName: "" };
            });
    }

    // ---------- Rendering resume variants from resume.json ----------
    function clearAndRenderExperience(experience) {
        const list = $("#experienceList");
        const tpl = $("#experienceItemTemplate");
        if (!list || !tpl) return;

        list.innerHTML = "";

        (experience || []).forEach((job) => {
            const node = tpl.content.cloneNode(true);

            node.querySelector(".exp-role").textContent = job.role || "";
            node.querySelector(".exp-org").textContent = job.organization ? ` — ${job.organization}` : "";
            node.querySelector(".exp-period").textContent = job.period || "";

            const ul = node.querySelector(".exp-details");
            ul.innerHTML = "";
            (job.details || []).forEach((detail) => {
                const li = document.createElement("li");
                li.textContent = detail;
                ul.appendChild(li);
            });

            list.appendChild(node);
        });
    }

    function clearAndRenderEducation(education) {
        const list = $("#educationList");
        const tpl = $("#educationItemTemplate");
        if (!list || !tpl) return;

        list.innerHTML = "";

        (education || []).forEach((item) => {
            const node = tpl.content.cloneNode(true);

            const programEl = node.querySelector(".edu-program");
            const instEl = node.querySelector(".edu-inst");
            const yearEl = node.querySelector(".edu-year");
            const ul = node.querySelector(".edu-details");
            const body = node.querySelector(".exp-body");

            if (programEl) programEl.textContent = item.program || "";
            if (instEl) instEl.textContent = item.institution ? ` — ${item.institution}` : "";
            if (yearEl) yearEl.textContent = item.year || "";

            const details = Array.isArray(item.details) ? item.details : [];
            if (ul) {
                ul.innerHTML = "";
                details.forEach((d) => {
                    const li = document.createElement("li");
                    li.textContent = d;
                    ul.appendChild(li);
                });
            }

            // Hide body if no detail bullets
            if (body && details.length === 0) body.style.display = "none";

            list.appendChild(node);
        });
    }

    // ---------- Preferences + expand/collapse ----------
    function openKey(variant, section) {
        return `resumeOpenState:${variant}:${section}`;
    }

    function getSectionCards(section) {
        if (section === "education") return $$("#educationList details.exp-card");
        if (section === "experience") return $$("#experienceList details.exp-card");
        return [];
    }

    function setSectionOpen(section, isOpen) {
        getSectionCards(section).forEach((d) => (d.open = isOpen));
    }

    function applySavedPreference(variant, section) {
        const pref = localStorage.getItem(openKey(variant, section));
        if (pref === "all") setSectionOpen(section, true);
        if (pref === "collapsed") setSectionOpen(section, false);
    }

    function trackSectionTogglePreference(section, variantSelect) {
        const container = section === "education" ? $("#educationList") : $("#experienceList");
        if (!container) return;

        container.addEventListener(
            "toggle",
            () => {
                const variant = variantSelect ? variantSelect.value : "general";
                const cards = getSectionCards(section);
                if (cards.length === 0) return;

                const allOpen = cards.every((c) => c.open);
                const allClosed = cards.every((c) => !c.open);

                if (allOpen) localStorage.setItem(openKey(variant, section), "all");
                if (allClosed) localStorage.setItem(openKey(variant, section), "collapsed");
            },
            true
        );
    }

    // ---------- Variant handling ----------
    function setVariantInUrl(variant) {
        const url = new URL(window.location.href);
        url.searchParams.set("variant", variant);
        window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    }

    function syncVariantSelectOptions(selectEl, keys) {
        if (!selectEl) return;
        const labelMap = {
            general: "General",
            analyst: "Data Analyst",
            geospatial: "Geospatial",
            science: "Science",
        };

        const current = selectEl.value;
        selectEl.innerHTML = "";
        keys.forEach((k) => {
            const opt = document.createElement("option");
            opt.value = k;
            opt.textContent = labelMap[k] || k;
            selectEl.appendChild(opt);
        });
        if (keys.includes(current)) selectEl.value = current;
    }

    // ---------- Main ----------
    function initResumeVariants() {
        const variantSelect = $("#resumeVariant");

        // Education controls (NEW)
        const expandEdu = $("#expandAllEdu");
        const collapseEdu = $("#collapseAllEdu");

        // Experience controls (existing)
        const expandExp = $("#expandAllExp");
        const collapseExp = $("#collapseAllExp");

        const printBtn = $("#printResume");

        // Hook up section controls
        if (expandEdu) {
            expandEdu.addEventListener("click", () => {
                const v = variantSelect ? variantSelect.value : "general";
                setSectionOpen("education", true);
                localStorage.setItem(openKey(v, "education"), "all");
            });
        }

        if (collapseEdu) {
            collapseEdu.addEventListener("click", () => {
                const v = variantSelect ? variantSelect.value : "general";
                setSectionOpen("education", false);
                localStorage.setItem(openKey(v, "education"), "collapsed");
            });
        }

        if (expandExp) {
            expandExp.addEventListener("click", () => {
                const v = variantSelect ? variantSelect.value : "general";
                setSectionOpen("experience", true);
                localStorage.setItem(openKey(v, "experience"), "all");
            });
        }

        if (collapseExp) {
            collapseExp.addEventListener("click", () => {
                const v = variantSelect ? variantSelect.value : "general";
                setSectionOpen("experience", false);
                localStorage.setItem(openKey(v, "experience"), "collapsed");
            });
        }

        // Track toggles for both sections (NEW)
        trackSectionTogglePreference("education", variantSelect);
        trackSectionTogglePreference("experience", variantSelect);

        // Print expands everything + restores previous states
        let prePrintStates = [];
        const allCards = () =>
            $$("#educationList details.exp-card, #experienceList details.exp-card");

        if (printBtn) {
            printBtn.addEventListener("click", () => {
                allCards().forEach((d) => (d.open = true));
                window.print();
            });
        }

        window.addEventListener("beforeprint", () => {
            const cards = allCards();
            prePrintStates = cards.map((c) => c.open);
            cards.forEach((c) => (c.open = true));
        });

        window.addEventListener("afterprint", () => {
            const cards = allCards();
            if (prePrintStates.length === cards.length) {
                cards.forEach((c, i) => (c.open = prePrintStates[i]));
            }
        });

        // Load resume.json variants
        return fetch("data/resume.json")
            .then((res) => res.json())
            .then((data) => {
                const variants = data.variants || {};
                const keys = Object.keys(variants);
                if (keys.length === 0) return;

                syncVariantSelectOptions(variantSelect, keys);

                const defaultVariant =
                    data.defaultVariant && variants[data.defaultVariant] ? data.defaultVariant : keys[0];

                const urlVariant = new URLSearchParams(window.location.search).get("variant");
                const savedVariant = localStorage.getItem("resumeVariant");

                const chosen =
                    [urlVariant, savedVariant, defaultVariant].find((v) => v && variants[v]) || defaultVariant;

                const renderVariant = (variantKey) => {
                    const v = variants[variantKey];
                    clearAndRenderEducation(v.education || []);
                    clearAndRenderExperience(v.experience || []);

                    // Apply saved prefs to BOTH sections (NEW)
                    applySavedPreference(variantKey, "education");
                    applySavedPreference(variantKey, "experience");
                };

                if (variantSelect) variantSelect.value = chosen;
                localStorage.setItem("resumeVariant", chosen);
                setVariantInUrl(chosen);
                renderVariant(chosen);

                if (variantSelect) {
                    variantSelect.addEventListener("change", () => {
                        const next = variantSelect.value;
                        localStorage.setItem("resumeVariant", next);
                        setVariantInUrl(next);
                        renderVariant(next);
                    });
                }
            })
            .catch((err) => console.error("Failed to load data/resume.json", err));
    }

    // boot
    fillPrintOnlyFromIndexJson();
    initResumeVariants();
})();

function prettyContactText(link) {
  const text = String(link.text || "").trim();
  const href = String(link.href || "").trim();

  // If text is already descriptive (contains @, digits, or a dot/slug), keep it.
  const looksDescriptive =
    /@/.test(text) || /\d/.test(text) || /\.com|\.ca|\.io|\.org|\/in\//i.test(text);
  if (text && looksDescriptive) return text;

  // Otherwise derive from href
  if (href.startsWith("mailto:")) return href.replace(/^mailto:/i, "");
  if (href.startsWith("tel:")) return href.replace(/^tel:/i, "");
  if (/^https?:\/\//i.test(href)) return href.replace(/^https?:\/\//i, "").replace(/\/$/, "");

  return text || href;
}

function fillPrintContact(links) {
  const contactUl = document.getElementById("printContact");
  if (!contactUl) return;

  contactUl.innerHTML = "";
  (links || []).forEach((link) => {
    const li = document.createElement("li");
    const a = document.createElement("a");

    a.href = link.href || "#";
    a.textContent = prettyContactText(link);

    // For print + general accessibility
    if (link.target) a.target = link.target;
    if (link.rel) a.rel = link.rel;

    li.appendChild(a);
    contactUl.appendChild(li);
  });
}

fillPrintContact(data.links || []);