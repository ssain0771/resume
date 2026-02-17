/*
   index scripts
   Interactions for specifically the index page.
*/

(function setupSkillsGrouping() {
    const btn = document.querySelector('#skillsGroupToggle');
    const individual = document.querySelector('#skillsIndividual');
    const grouped = document.querySelector('#skillsGrouped');

    if (!btn || !individual || !grouped) {
        return;
    }

    const savedMode = localStorage.getItem('skillsView');
    let groupedMode = savedMode === 'grouped';

    function render() {
        individual.classList.toggle('is-hidden', groupedMode);
        grouped.classList.toggle('is-hidden', !groupedMode);

        grouped.setAttribute('aria-hidden', String(!groupedMode));
        individual.setAttribute('aria-hidden', String(groupedMode));

        btn.setAttribute('aria-pressed', String(groupedMode));
        btn.textContent = groupedMode ? 'Individual skills' : 'Group skills';
    }

    render();

    btn.addEventListener('click', () => {
        groupedMode = !groupedMode;
        localStorage.setItem('skillsView', groupedMode ? 'grouped' : 'individual');
        render();
    });
})();

(function loadIndexContent() {
    if (!document.querySelector('#about')) return;

    fetch('data/index.json')
        .then((res) => res.json())
        .then((data) => {
            const heroLine = document.querySelector('#heroLine');
            const heroIntro = document.querySelector('#heroIntro');
            const bio1 = document.querySelector('#aboutBio1');
            const bio2 = document.querySelector('#aboutBio2');
            const skillsIndividual = document.querySelector('#skillsIndividual');
            const skillsGrouped = document.querySelector('#skillsGrouped');
            const connectList = document.querySelector('#connectList');
            const aboutImage = document.querySelector('#aboutImage');

            if (heroLine) heroLine.textContent = data.tagline || '';
            if (heroIntro) heroIntro.textContent = data.title || '';
            if (bio1) bio1.textContent = (data.bio && data.bio[0]) ? data.bio[0] : '';
            if (bio2) bio2.textContent = (data.bio && data.bio[1]) ? data.bio[1] : '';

            if (skillsIndividual) {
                skillsIndividual.innerHTML = '';
                (data.skills && data.skills.individual ? data.skills.individual : []).forEach((skill) => {
                    const li = document.createElement('li');
                    li.textContent = skill;
                    skillsIndividual.appendChild(li);
                });
            }

            if (skillsGrouped) {
                skillsGrouped.innerHTML = '';
                (data.skills && data.skills.grouped ? data.skills.grouped : []).forEach((group) => {
                    const li = document.createElement('li');
                    const strong = document.createElement('strong');
                    strong.textContent = `${group.label}:`;
                    li.appendChild(strong);
                    li.appendChild(document.createTextNode(` ${(group.items || []).join(', ')}`));
                    skillsGrouped.appendChild(li);
                });
            }

            if (aboutImage && data.aboutImage) {
                aboutImage.src = data.aboutImage.src || aboutImage.src;
                aboutImage.alt = data.aboutImage.alt || aboutImage.alt;
            }

            if (connectList) {
                connectList.innerHTML = '';
                (data.links || []).forEach((link) => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = link.href || '#';
                    a.textContent = link.text || '';
                    if (link.target) a.target = link.target;
                    if (link.rel) a.rel = link.rel;
                    li.appendChild(a);
                    connectList.appendChild(li);
                });
            }
        })
        .catch((err) => console.error('Failed to load index.json', err));
})();
