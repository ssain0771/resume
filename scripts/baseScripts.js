/*
    Shared site behavior used on every page.
    Responsibilities: load site-wide content (nav/footer labels), handle theme switching, and manage the back-to-top button.
*/

let siteConfig = null;

/* Resolve the correct relative path for nested pages such as /projects/*. */
function getRootPath() {
    return document.body.dataset.root || "";
}

/* Load shared chrome content from data/site.json so navigation and footer text stay consistent across pages. */
(function loadSiteChrome() {
    const navList = document.querySelector("#globalNavList");
    const footerAuthor = document.querySelector("#footerAuthor");
    const backToTop = document.querySelector("#backToTop");
    const brandName = document.querySelector("#brandName");
    const brandTagline = document.querySelector("#brandTagline");

    fetch(`${getRootPath()}data/site.json`)
        .then((response) => response.json())
        .then((data) => {
            siteConfig = data;

            if (brandName) {
                brandName.textContent = data.siteTitle || brandName.textContent;
            }

            if (brandTagline) {
                brandTagline.textContent = data.tagline || brandTagline.textContent;
            }

            if (navList) {
                navList.innerHTML = "";
                const currentPath = window.location.pathname.split("/").pop() || "index.html";
                const pageKey = document.body.dataset.page || "";

                (data.navLinks || []).forEach((link) => {
                    const item = document.createElement("li");
                    const anchor = document.createElement("a");
                    const resolvedHref = `${getRootPath()}${link.href || ""}`;

                    anchor.href = resolvedHref || "#";
                    anchor.textContent = link.text || "";
                    const linkFile = (link.href || "").split("/").pop();
                    const shouldHighlight =
                        linkFile === currentPath ||
                        ((pageKey === "case-study" || pageKey === "webgames" || pageKey === "game") && linkFile === "portfolio.html");

                    if (shouldHighlight) {
                        anchor.classList.add("is-current");
                        anchor.setAttribute("aria-current", "page");
                    }

                    item.appendChild(anchor);
                    navList.appendChild(item);
                });
            }

            if (footerAuthor) {
                footerAuthor.textContent = data.footerAuthor || footerAuthor.textContent;
            }

            if (backToTop) {
                backToTop.textContent = data.backToTop || backToTop.textContent;
            }

            renderThemeButton();
        })
        .catch((error) => {
            console.error("Failed to load site configuration.", error);
            renderThemeButton();
        });
})();

/* Apply the saved theme, then wire up the theme-toggle button. */
(function setupTheme() {
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
        document.body.classList.add("is-dark");
    } else if (savedTheme === "light") {
        document.body.classList.remove("is-dark");
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.body.classList.add("is-dark");
    }

    const toggle = document.querySelector("#themeToggle");
    if (!toggle) {
        return;
    }

    toggle.addEventListener("click", () => {
        document.body.classList.toggle("is-dark");
        localStorage.setItem("theme", document.body.classList.contains("is-dark") ? "dark" : "light");
        renderThemeButton();
    });

    renderThemeButton();
})();

/* Update the theme button label so it always matches the current state. */
function renderThemeButton() {
    const toggle = document.querySelector("#themeToggle");
    if (!toggle) {
        return;
    }

    const isDark = document.body.classList.contains("is-dark");
    const lightLabel = (siteConfig && siteConfig.themeToggle && siteConfig.themeToggle.light) || "Dark mode";
    const darkLabel = (siteConfig && siteConfig.themeToggle && siteConfig.themeToggle.dark) || "Light mode";

    toggle.textContent = isDark ? darkLabel : lightLabel;
    toggle.setAttribute("aria-pressed", String(isDark));
}

/* Reveal a back-to-top button after the user scrolls far enough down the page. */
(function setupBackToTop() {
    const button = document.querySelector("#backToTop");
    if (!button) {
        return;
    }

    const prefersReducedMotion =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function onScroll() {
        const offset = window.scrollY || document.documentElement.scrollTop || 0;
        const isVisible = offset > 240;

        button.classList.toggle("is-visible", isVisible);
        button.setAttribute("aria-hidden", String(!isVisible));
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    button.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: prefersReducedMotion ? "auto" : "smooth"
        });
    });
})();