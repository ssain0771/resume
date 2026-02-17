/*
   portfolio scripts
   Interactions for specifically the portfolio page:
   1) Card selection expands it in the project info panel
   2) Tag filtering in a new filter panel
   This was made with AI assistance, to generate the initial code,
   which was then manually reviewed and altered.
*/

const projectContainer = document.querySelector('#project-container'); // Parent container holding all project cards

function getProjectCards() {
    return projectContainer
        ? Array.from(projectContainer.querySelectorAll('.projects'))
        : [];
}

const projectInfo = document.querySelector('#projectInfo'); // The "Project Info" section (where details appear)
const projectInfoTitle = document.querySelector('#projectInfoTitle'); // The title element inside the Project Info section
const projectInfoBody = document.querySelector('#projectInfoBody'); // The body container inside the Project Info section

// Save the initial "empty state" so we can restore it when deselecting.
let initialInfoTitle = projectInfoTitle ? projectInfoTitle.textContent : 'Project Info';
let initialInfoBodyHTML = projectInfoBody ? projectInfoBody.innerHTML : '';

let selectedCard = null; // Tracks which card is currently selected (null = none)

/*
    prefersReducedMotion()
    - Returns true if the user’s OS/browser prefers reduced motion.
    - We use this to decide whether to smooth-scroll or not.
*/
function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/*
    clearSelection()
    - Deselects any selected card
    - Resets the Project Info panel back to its initial “empty state”
*/
function clearSelection() {
    getProjectCards().forEach((card) => {
        card.classList.remove('is-selected');
        card.setAttribute('aria-selected', 'false');
        card.setAttribute('aria-expanded', 'false');
    });

    selectedCard = null;

    if (projectInfoTitle) {
        projectInfoTitle.textContent = initialInfoTitle;
    }

    if (projectInfoBody) {
        projectInfoBody.innerHTML = initialInfoBodyHTML;
    }
}

/*
    buildProjectInfo(card)
    - Reads the clicked card’s content (title, image, details)
    - Rebuilds the Project Info panel using CLONED content (so cards remain unchanged)
*/
function buildProjectInfo(card) {
    const titleEl = card.querySelector('h3');
    const imgEl = card.querySelector('img');
    const detailsEl = card.querySelector('.project-details');

    const titleText = titleEl ? titleEl.textContent.trim() : 'Project';

    if (!projectInfoTitle || !projectInfoBody) {
        return;
    }

    projectInfoTitle.textContent = titleText;
    projectInfoBody.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'project-info-wrap';

    if (imgEl) {
        const imgClone = imgEl.cloneNode(true);
        imgClone.classList.add('project-info-image');
        wrap.appendChild(imgClone);
    }

    const text = document.createElement('div');
    text.className = 'project-info-text';

    if (detailsEl) {
        text.appendChild(detailsEl.cloneNode(true));
    } else {
        text.innerHTML = '<p>Details coming soon…</p>';
    }

    wrap.appendChild(text);
    projectInfoBody.appendChild(wrap);
}

/*
    selectCard(card)
    - If the user clicks the already-selected card: deselect + reset panel
    - Otherwise: select the new card, rebuild info panel, and scroll into view
*/
function selectCard(card) {
    if (!card) return;

    // If you click the selected card again => deselect + reset panel
    if (selectedCard === card) {
        clearSelection();
        return;
    }

    // New selection: clear selection from all cards first
    getProjectCards().forEach((c) => {
        c.classList.remove('is-selected');
        c.setAttribute('aria-selected', 'false');
        c.setAttribute('aria-expanded', 'false');
    });

    card.classList.add('is-selected');
    card.setAttribute('aria-selected', 'true');
    card.setAttribute('aria-expanded', 'true');
    selectedCard = card;

    buildProjectInfo(card);

    // Scroll to the info panel (only on select, not deselect)
    if (projectInfo) {
        projectInfo.scrollIntoView({
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
            block: 'start'
        });
    }
}

/*
    makeProjectCard(p)
    - Builds an <article class="projects"> card that matches your existing DOM structure
*/
function makeProjectCard(p) {
    const cardTemplate = document.querySelector('#projectCardTemplate');
    const article = cardTemplate
        ? cardTemplate.content.firstElementChild.cloneNode(true)
        : document.createElement('article');

    article.classList.add('projects');
    article.id = p.id || '';

    article.tabIndex = 0;
    article.setAttribute('role', 'button');
    article.setAttribute('aria-selected', 'false');
    article.setAttribute('aria-expanded', 'false');
    article.setAttribute('aria-controls', 'projectInfoBody');

    // tags used by your filter (space-separated)
    const tags = Array.isArray(p.tags) ? p.tags : [];
    article.dataset.tags = tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean).join(' ');

    let titleEl = article.querySelector('.project-title') || article.querySelector('h3');
    const imageEl = article.querySelector('.project-thumb') || article.querySelector('img');
    const summaryEl = article.querySelector('.project-summary') || document.createElement('p');
    const details = article.querySelector('.project-details') || document.createElement('div');

    if (!titleEl) {
        titleEl = document.createElement('h3');
        titleEl.className = 'project-title';
        article.appendChild(titleEl);
    }

    if (!summaryEl.classList.contains('project-summary')) {
        summaryEl.className = 'project-summary';
        article.appendChild(summaryEl);
    }

    if (!details.classList.contains('project-details')) {
        details.className = 'project-details';
        article.appendChild(details);
    }

    titleEl.textContent = p.title || '';

    if (imageEl) {
        if (p.image) {
            imageEl.src = p.image;
            imageEl.alt = p.imageAlt || `${p.title || 'Project'} Screenshot`;
            imageEl.loading = 'lazy';
            imageEl.hidden = false;
        } else {
            imageEl.remove();
        }
    }

    summaryEl.textContent = p.summary || '';
    details.innerHTML = '';

    function addLabeledParagraph(label, value) {
        if (!value) return;

        const para = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = label;
        para.appendChild(strong);
        para.appendChild(document.createTextNode(` ${value}`));
        details.appendChild(para);
    }

    addLabeledParagraph('Tools:', p.tools);
    addLabeledParagraph('Description:', p.description);

    if (p.result || (p.link && p.link.href)) {
        const para = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = 'Result:';
        para.appendChild(strong);

        if (p.result) {
            para.appendChild(document.createTextNode(` ${p.result}`));
        }

        if (p.link && p.link.href) {
            para.appendChild(document.createTextNode(' '));
            const a = document.createElement('a');
            a.href = p.link.href;
            a.textContent = p.link.text || 'Link';
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            para.appendChild(a);
        }

        details.appendChild(para);
    }

    return article;
}

/*
    setupSelectionHandlers()
    - Uses event delegation so it works with dynamically created cards
*/
function setupSelectionHandlers() {
    if (!projectContainer) return;

    // Click selection (ignore clicks on links inside cards)
    projectContainer.addEventListener('click', (e) => {
        if (e.target.closest('a')) return; // don't toggle selection when clicking a link
        const card = e.target.closest('article.projects');
        if (!card) return;
        selectCard(card);
    });

    // Keyboard selection on cards
    projectContainer.addEventListener('keydown', (e) => {
        const card = e.target.closest('article.projects');
        if (!card) return;

        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectCard(card);
        }
    });
}

/*
    setupPortfolioTagFilter()
    - Handles the searchable dropdown of tags + active tag chips
    - Filters visible projects based on selected tags
    - IMPORTANT: call this AFTER cards exist (after fetch render)
*/
function setupPortfolioTagFilter() {
    const container = document.querySelector('#project-container');
    const input = document.querySelector('#tagSearch');
    const optionsEl = document.querySelector('#tagOptions');
    const activeTagsEl = document.querySelector('#activeTags');
    const clearBtn = document.querySelector('#clearTags');

    if (!container || !input || !optionsEl || !activeTagsEl || !clearBtn) {
        return;
    }

    /*
        formatTagLabel(tag)
        - Converts tag slugs into display labels
        - Handles acronyms like GIS/HTML/CSS/etc.
    */
    function formatTagLabel(tag) {
        const special = {
            arcgis: 'ArcGIS',
            gis: 'GIS',
            ppo: 'PPO',
            html: 'HTML',
            css: 'CSS',
            sql: 'SQL',
            ai: 'AI',
            ml: 'ML'
        };

        if (special[tag]) {
            return special[tag];
        }

        return tag
            .split('-')
            .filter(Boolean)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
    }

    function getCardTags(card) {
        return (card.dataset.tags || '')
            .split(/\s+/)
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean);
    }

    const active = new Set(); // Stores currently selected tags (used to filter cards)

    let availableTags = [];
    let filteredTags = [];
    let activeIndex = -1;

    function cardMatchesActiveTags(card) {
        const tags = getCardTags(card);
        return Array.from(active).every((t) => tags.includes(t));
    }

    function applyFilter() {
        const cards = Array.from(container.querySelectorAll('article.projects'));

        cards.forEach((card) => {
            card.hidden = !cardMatchesActiveTags(card);
        });

        if (selectedCard && selectedCard.hidden) {
            clearSelection();
        }
    }

    function renderChips() {
        activeTagsEl.innerHTML = '';

        active.forEach((tag) => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'tag-chip';
            chip.dataset.tag = tag;
            chip.textContent = `${formatTagLabel(tag)} ✕`;
            activeTagsEl.appendChild(chip);
        });
    }

    function computeAvailableTags() {
        const cards = Array.from(container.querySelectorAll('article.projects'));
        const set = new Set();

        cards.forEach((card) => {
            if (!cardMatchesActiveTags(card)) return;
            getCardTags(card).forEach((t) => set.add(t));
        });

        active.forEach((t) => set.delete(t));

        availableTags = Array.from(set).sort();
    }

    function openOptions() {
        optionsEl.classList.add('is-open');
        input.setAttribute('aria-expanded', 'true');
    }

    function closeOptions() {
        optionsEl.classList.remove('is-open');
        input.setAttribute('aria-expanded', 'false');
        activeIndex = -1;
    }

    function renderOptions() {
        optionsEl.innerHTML = '';

        filteredTags.forEach((tag, idx) => {
            const div = document.createElement('div');
            div.className = 'tag-option';
            div.setAttribute('role', 'option');
            div.dataset.tag = tag;
            div.textContent = formatTagLabel(tag);

            if (idx === activeIndex) {
                div.classList.add('is-active');
            }

            optionsEl.appendChild(div);
        });

        if (filteredTags.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'tag-option';
            empty.textContent = 'No matching tags';
            empty.style.cursor = 'default';
            optionsEl.appendChild(empty);
        }
    }

    function filterOptionsByInput() {
        const q = (input.value || '').trim().toLowerCase();

        if (!q) {
            filteredTags = availableTags.slice();
        } else {
            filteredTags = availableTags.filter((tag) => {
                const label = formatTagLabel(tag).toLowerCase();
                return tag.includes(q) || label.includes(q);
            });
        }

        activeIndex = filteredTags.length > 0 ? 0 : -1;
        renderOptions();
    }

    function addTag(tag) {
        if (!tag || active.has(tag)) return;

        active.add(tag);
        input.value = '';

        applyFilter();
        renderChips();

        computeAvailableTags();
        filterOptionsByInput();
        openOptions();
    }

    // Events-

    input.addEventListener('focus', () => {
        computeAvailableTags();
        filterOptionsByInput();
        openOptions();
    });

    input.addEventListener('input', () => {
        filterOptionsByInput();
        openOptions();
    });

    input.addEventListener('keydown', (e) => {
        if (!optionsEl.classList.contains('is-open')) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (filteredTags.length === 0) return;
            activeIndex = Math.min(activeIndex + 1, filteredTags.length - 1);
            renderOptions();
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (filteredTags.length === 0) return;
            activeIndex = Math.max(activeIndex - 1, 0);
            renderOptions();
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && activeIndex < filteredTags.length) {
                addTag(filteredTags[activeIndex]);
            }
        }

        if (e.key === 'Escape') {
            e.preventDefault();
            closeOptions();
        }
    });

    optionsEl.addEventListener('mousedown', (e) => {
        const opt = e.target.closest('.tag-option');
        if (!opt) return;
        const tag = opt.dataset.tag;
        if (!tag) return;
        addTag(tag);
    });

    document.addEventListener('mousedown', (e) => {
        const within = e.target === input || optionsEl.contains(e.target);
        if (!within) {
            closeOptions();
        }
    });

    activeTagsEl.addEventListener('click', (e) => {
        const chip = e.target.closest('.tag-chip');
        if (!chip) return;

        active.delete(chip.dataset.tag);

        applyFilter();
        renderChips();

        computeAvailableTags();
        filterOptionsByInput();
    });

    clearBtn.addEventListener('click', () => {
        active.clear();
        input.value = '';

        applyFilter();
        renderChips();

        computeAvailableTags();
        filterOptionsByInput();
        closeOptions();
    });

    // Initial
    applyFilter();
    renderChips();
    computeAvailableTags();
    filteredTags = availableTags.slice();
    renderOptions();
}

// Boot

// Set up event delegation for selection (works for dynamic cards)
setupSelectionHandlers();

// Load projects into the grid
if (projectContainer) {
    fetch('data/projects.json')
        .then(res => res.json())
        .then(data => {
            const page = data.page || {};
            const filterLabel = document.querySelector('#filterProjectsLabel');
            const tagSearch = document.querySelector('#tagSearch');
            const clearTags = document.querySelector('#clearTags');

            if (filterLabel) {
                filterLabel.textContent = page.filterLabel || filterLabel.textContent;
            }
            if (tagSearch) {
                tagSearch.placeholder = page.searchPlaceholder || tagSearch.placeholder;
            }
            if (clearTags) {
                clearTags.textContent = page.clearButton || clearTags.textContent;
            }
            if (projectInfoTitle && page.infoTitle) {
                projectInfoTitle.textContent = page.infoTitle;
            }
            if (projectInfoBody && page.emptyMessage) {
                projectInfoBody.innerHTML = `<p>${page.emptyMessage}</p>`;
            }

            initialInfoTitle = projectInfoTitle ? projectInfoTitle.textContent : initialInfoTitle;
            initialInfoBodyHTML = projectInfoBody ? projectInfoBody.innerHTML : initialInfoBodyHTML;

            projectContainer.innerHTML = '';
            (data.projects || []).forEach(p => {
                projectContainer.appendChild(makeProjectCard(p));
            });

            // reset info panel state + selection (safe if nothing selected)
            clearSelection();

            // Start tag filter AFTER cards exist
            setupPortfolioTagFilter();
        })
        .catch(err => console.error('Failed to load projects.json', err));
}