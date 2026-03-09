(function loadProjectCaseStudyContent() {
    fetch(`${typeof getRootPath === "function" ? getRootPath() : ""}data/project.json`)
        .then((response) => response.json())
        .then((data) => {
            const breadcrumb = document.querySelector("#projectBreadcrumb");
            const heroTitle = document.querySelector("#projectHeroTitle");
            const heroLead = document.querySelector("#projectHeroLead");
            const overviewTitle = document.querySelector("#overviewTitle");
            const overviewText = document.querySelector("#overviewText");
            const metaList = document.querySelector("#projectMetaList");
            const detailGrid = document.querySelector("#detailSectionGrid");
            const mapPanelTitle = document.querySelector("#mapPanelTitle");
            const parksLabel = document.querySelector("#parksLabel");
            const trailsLabel = document.querySelector("#trailsLabel");
            const boundaryLabel = document.querySelector("#boundaryLabel");
            const legendTip = document.querySelector("#legendTip");
            const legendDataSource = document.querySelector("#legendDataSource");
            const filterNamedTrailsLabel = document.querySelector("#filterNamedTrailsLabel");
            const filterMajorParksLabel = document.querySelector("#filterMajorParksLabel");
            const resetViewBtn = document.querySelector("#resetViewBtn");
            const backLink = document.querySelector("#backToPortfolioLink");

            if (breadcrumb) breadcrumb.textContent = data.breadcrumb || breadcrumb.textContent;
            if (heroTitle) heroTitle.textContent = data.heroTitle || heroTitle.textContent;
            if (heroLead) heroLead.textContent = data.heroLead || heroLead.textContent;
            if (overviewTitle) overviewTitle.textContent = data.overviewTitle || overviewTitle.textContent;
            if (overviewText) overviewText.textContent = data.overviewText || "";
            if (mapPanelTitle) mapPanelTitle.textContent = data.mapPanelTitle || mapPanelTitle.textContent;
            if (parksLabel) parksLabel.textContent = (data.layers && data.layers.parks) || parksLabel.textContent;
            if (trailsLabel) trailsLabel.textContent = (data.layers && data.layers.trails) || trailsLabel.textContent;
            if (boundaryLabel) boundaryLabel.textContent = (data.layers && data.layers.boundary) || boundaryLabel.textContent;
            if (legendTip) legendTip.textContent = data.tip || "";
            if (legendDataSource) legendDataSource.textContent = data.dataSource || "";
            if (filterNamedTrailsLabel) filterNamedTrailsLabel.textContent = data.filterNamedTrailsLabel || filterNamedTrailsLabel.textContent;
            if (filterMajorParksLabel) filterMajorParksLabel.textContent = data.filterMajorParksLabel || filterMajorParksLabel.textContent;
            if (resetViewBtn) resetViewBtn.textContent = data.resetViewLabel || resetViewBtn.textContent;
            if (backLink) backLink.textContent = data.backLabel || backLink.textContent;

            if (metaList) {
                metaList.innerHTML = "";
                (data.meta || []).forEach((item) => {
                    const li = document.createElement("li");
                    li.className = "meta-item";
                    li.innerHTML = `
                        <span class="meta-label">${item.label || ""}</span>
                        <span>${item.value || ""}</span>
                    `;
                    metaList.appendChild(li);
                });
            }

            if (detailGrid) {
                detailGrid.innerHTML = "";
                (data.detailSections || []).forEach((section) => {
                    const article = document.createElement("article");
                    article.className = "info-card";
                    article.innerHTML = `
                        <h3>${section.title || ""}</h3>
                        <p>${section.body || ""}</p>
                    `;
                    detailGrid.appendChild(article);
                });
            }
        })
        .catch((error) => console.error("Failed to load case study content.", error));
})();

/* Initialize the interactive Leaflet map and connect the UI controls to the map layers. */
(function initProjectMap() {
    const mapElement = document.querySelector("#map");
    if (!mapElement) {
        return;
    }

    const config = {
        initialCenter: [51.05, -114.07],
        initialZoom: 11,
        boundaryGeoJsonUrl: `${typeof getRootPath === "function" ? getRootPath() : ""}data/City_Boundary.geojson`,
        parksUrl: "https://services2.arcgis.com/XSv3KNGfmrd1txPN/ArcGIS/rest/services/Parks_Sites_Calgary_Geog_280/FeatureServer/0",
        trailsUrl: "https://services2.arcgis.com/XSv3KNGfmrd1txPN/ArcGIS/rest/services/Parks_Trails_for_Calgary/FeatureServer/0",
        parksAreaField: "Shape__Area",
        parksNameField: "site_name",
        trailsNameField: "trail_name"
    };

    const map = L.map("map", {
        zoomControl: true
    }).setView(config.initialCenter, config.initialZoom);

    map.createPane("pane-parks");
    map.getPane("pane-parks").style.zIndex = 200;
    map.createPane("pane-trails");
    map.getPane("pane-trails").style.zIndex = 300;
    map.createPane("pane-boundary");
    map.getPane("pane-boundary").style.zIndex = 400;

    const lightTiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    });

    const darkTiles = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
    });

    /* Swap map tiles when the site theme changes so the map matches light/dark mode. */
    function applyBasemapForTheme() {
        const isDark = document.body.classList.contains("is-dark");

        if (isDark) {
            if (map.hasLayer(lightTiles)) map.removeLayer(lightTiles);
            if (!map.hasLayer(darkTiles)) darkTiles.addTo(map);
        } else {
            if (map.hasLayer(darkTiles)) map.removeLayer(darkTiles);
            if (!map.hasLayer(lightTiles)) lightTiles.addTo(map);
        }
    }

    applyBasemapForTheme();
    const observer = new MutationObserver(applyBasemapForTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    let defaultBounds = null;

    /* Escape popup text before injecting it into HTML. */
    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    /* Add or remove a layer from the map based on a checkbox state. */
    function setLayerVisible(layer, visible) {
        if (!layer) return;

        if (visible && !map.hasLayer(layer)) {
            map.addLayer(layer);
        }

        if (!visible && map.hasLayer(layer)) {
            map.removeLayer(layer);
        }
    }

    /* Convert user-entered square-kilometre values into square metres for the ArcGIS query. */
    function km2ToM2(km2) {
        const number = Number(km2);
        if (!Number.isFinite(number) || number < 0) {
            return null;
        }
        return number * 1000000;
    }

    const parks = L.esri.featureLayer({
        url: config.parksUrl,
        pane: "pane-parks",
        style: () => ({
            color: "#2a7fff",
            weight: 1,
            fillColor: "#2a7fff",
            fillOpacity: 0.2
        })
    }).addTo(map);

    parks.bindPopup((layer) => {
        const properties = layer && layer.feature && layer.feature.properties ? layer.feature.properties : {};
        const name = properties[config.parksNameField] || "Park";
        return `<strong>${escapeHtml(name)}</strong>`;
    });

    const trails = L.esri.featureLayer({
        url: config.trailsUrl,
        pane: "pane-trails",
        style: () => ({
            color: "#33aa55",
            weight: 3,
            opacity: 0.9
        })
    }).addTo(map);

    trails.bindPopup((layer) => {
        const properties = layer && layer.feature && layer.feature.properties ? layer.feature.properties : {};
        const name = properties[config.trailsNameField] || "Unnamed trail";
        return `<strong>${escapeHtml(name)}</strong>`;
    });

    let boundaryLayer = null;

    fetch(config.boundaryGeoJsonUrl)
        .then((response) => response.json())
        .then((geojson) => {
            boundaryLayer = L.geoJSON(geojson, {
                pane: "pane-boundary",
                style: {
                    color: "#183de6",
                    weight: 2,
                    fill: false
                }
            }).addTo(map);

            const bounds = boundaryLayer.getBounds();
            if (bounds && bounds.isValid()) {
                defaultBounds = bounds;
                map.fitBounds(bounds);
            }
        })
        .catch((error) => console.error("Failed to load city boundary.", error));

    const toggleParks = document.querySelector("#toggleParks");
    const toggleTrails = document.querySelector("#toggleTrails");
    const toggleBoundary = document.querySelector("#toggleBoundary");
    const resetViewBtn = document.querySelector("#resetViewBtn");
    const filterMajorParks = document.querySelector("#filterMajorParks");
    const minParkAreaKm2 = document.querySelector("#minParkAreaKm2");
    const filterNamedTrails = document.querySelector("#filterNamedTrails");

    if (toggleParks) {
        toggleParks.addEventListener("change", () => setLayerVisible(parks, toggleParks.checked));
    }

    if (toggleTrails) {
        toggleTrails.addEventListener("change", () => setLayerVisible(trails, toggleTrails.checked));
    }

    if (toggleBoundary) {
        toggleBoundary.addEventListener("change", () => setLayerVisible(boundaryLayer, toggleBoundary.checked));
    }

    if (resetViewBtn) {
        resetViewBtn.addEventListener("click", () => {
            if (defaultBounds) {
                map.fitBounds(defaultBounds);
            } else {
                map.setView(config.initialCenter, config.initialZoom);
            }
        });
    }

    /* Reset the parks layer query so all parks are visible again. */
    function clearParkAreaFilter() {
        parks.setWhere("1=1");
    }

    /* Apply a minimum-area filter to the parks layer when enabled. */
    function applyParkAreaFilter() {
        if (!filterMajorParks || !minParkAreaKm2 || !filterMajorParks.checked) {
            clearParkAreaFilter();
            return;
        }

        const area = km2ToM2(minParkAreaKm2.value);
        if (area === null || area === 0) {
            clearParkAreaFilter();
            return;
        }

        parks.setWhere(`${config.parksAreaField} >= ${area}`);
    }

    /* Restrict the trails layer to named trails when that filter is enabled. */
    function applyNamedTrailFilter() {
        if (filterNamedTrails && filterNamedTrails.checked) {
            trails.setWhere(`${config.trailsNameField} IS NOT NULL AND ${config.trailsNameField} <> ''`);
        } else {
            trails.setWhere("1=1");
        }
    }

    if (filterMajorParks) {
        filterMajorParks.addEventListener("change", applyParkAreaFilter);
    }

    if (minParkAreaKm2) {
        minParkAreaKm2.addEventListener("input", applyParkAreaFilter);
        minParkAreaKm2.addEventListener("blur", applyParkAreaFilter);
    }

    if (filterNamedTrails) {
        filterNamedTrails.addEventListener("change", applyNamedTrailFilter);
    }
})();