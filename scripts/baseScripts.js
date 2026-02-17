/*
   base scripts
   Shared interactions for all pages:
   1) Dark mode toggle (persistent via localStorage)
   2) Back-to-top button (appears after scrolling)
   3) Shared site chrome (nav/jump links/footer labels) from JSON
*/

let siteConfig = null;

(function loadSiteChrome() {
    const pageKey = document.body.dataset.page;

    fetch('data/site.json')
        .then((res) => res.json())
        .then((data) => {
            siteConfig = data;

            const navLabelNavigate = document.querySelector('#navLabelNavigate');
            const navLabelJump = document.querySelector('#navLabelJump');
            const navList = document.querySelector('#globalNavList');
            const jumpList = document.querySelector('#pageJumpList');
            const footerAuthor = document.querySelector('#footerAuthor');
            const backToTop = document.querySelector('#backToTop');

            if (navLabelNavigate) {
                navLabelNavigate.textContent = data.navigationLabel || 'Navigate to:';
            }

            if (navLabelJump) {
                navLabelJump.textContent = data.jumpLabel || 'Jump to:';
            }

            if (navList) {
                navList.innerHTML = '';
                (data.navLinks || []).forEach((link) => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = link.href || '#';
                    a.textContent = link.text || '';
                    li.appendChild(a);
                    navList.appendChild(li);
                });
            }

            if (jumpList) {
                jumpList.innerHTML = '';
                (data.jumpLinks && pageKey ? data.jumpLinks[pageKey] : []).forEach((link) => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = link.href || '#';
                    a.textContent = link.text || '';
                    li.appendChild(a);
                    jumpList.appendChild(li);
                });
            }

            if (footerAuthor) {
                footerAuthor.textContent = data.footerAuthor || footerAuthor.textContent;
            }

            if (backToTop) {
                backToTop.textContent = data.backToTop || backToTop.textContent;
            }

            const toggleBtn = document.querySelector('#themeToggle');
            if (toggleBtn) {
                const isDark = document.body.classList.contains('is-dark');
                toggleBtn.textContent = isDark
                    ? (data.themeToggle && data.themeToggle.dark) || 'Light mode'
                    : (data.themeToggle && data.themeToggle.light) || 'Dark mode';
            }
        })
        .catch((err) => console.error('Failed to load site.json', err));
})();

(function setupDarkMode() {
    const toggleBtn = document.querySelector('#themeToggle');
    if (!toggleBtn) {
        return;
    }

    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'dark') {
        document.body.classList.add('is-dark');
    }
    if (savedTheme === 'light') {
        document.body.classList.remove('is-dark');
    }

    function renderThemeButton() {
        const isDark = document.body.classList.contains('is-dark');

        toggleBtn.setAttribute('aria-pressed', String(isDark));

        const lightLabel = (siteConfig && siteConfig.themeToggle && siteConfig.themeToggle.light) || 'Dark mode';
        const darkLabel = (siteConfig && siteConfig.themeToggle && siteConfig.themeToggle.dark) || 'Light mode';
        toggleBtn.textContent = isDark ? darkLabel : lightLabel;
    }

    renderThemeButton();

    toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('is-dark');

        const isDark = document.body.classList.contains('is-dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');

        renderThemeButton();
    });
})();

(function setupBackToTop() {
    const btn = document.querySelector('#backToTop');
    if (!btn) {
        return;
    }

    const reduceMotion =
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function setVisible(visible) {
        btn.classList.toggle('is-visible', visible);
        btn.setAttribute('aria-hidden', String(!visible));
    }

    function onScroll() {
        const y = window.scrollY || document.documentElement.scrollTop;
        setVisible(y > 100);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    btn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: reduceMotion ? 'auto' : 'smooth'
        });
    });
})();
