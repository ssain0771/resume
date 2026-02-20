(function loadProjectContent() {
    if (!document.querySelector("#overview")) {
        return;
    }

    fetch("data/project.json")
        .then((res) => res.json())
        .then((data) => {
            const overviewTitle = document.querySelector("#overviewTitle");
            const overviewText = document.querySelector("#overviewText");
            const mapPanelTitle = document.querySelector("#mapPanelTitle");
            const parksLabel = document.querySelector("#parksLabel");
            const trailsLabel = document.querySelector("#trailsLabel");
            const boundaryLabel = document.querySelector("#boundaryLabel");
            const legendTip = document.querySelector("#legendTip");
            const legendDataSource = document.querySelector("#legendDataSource");

            const filterNamedTrailsLabel = document.querySelector("#filterNamedTrailsLabel");

            if (overviewTitle) {
                overviewTitle.textContent = data.overviewTitle || overviewTitle.textContent;
            }
            if (overviewText) {
                overviewText.textContent = data.overviewText || "";
            }
            if (mapPanelTitle) {
                mapPanelTitle.textContent = data.mapPanelTitle || mapPanelTitle.textContent;
            }
            if (parksLabel) {
                parksLabel.textContent = (data.layers && data.layers.parks) || parksLabel.textContent;
            }
            if (trailsLabel) {
                trailsLabel.textContent = (data.layers && data.layers.trails) || trailsLabel.textContent;
            }
            if (boundaryLabel) {
                boundaryLabel.textContent = (data.layers && data.layers.boundary) || boundaryLabel.textContent;
            }
            if (legendTip) {
                legendTip.textContent = data.tip || "";
            }
            if (legendDataSource) {
                legendDataSource.textContent = data.dataSource || "";
            }

            if (filterNamedTrailsLabel) {
                filterNamedTrailsLabel.textContent =
                    data.filterNamedTrailsLabel || filterNamedTrailsLabel.textContent;
            }
        })
        .catch((err) => console.error("Failed to load project.json", err));
})();

(function initProjectMap() {
    const DEBUG_MAP = window.localStorage.getItem("debugMap") === "true";
    const mapEl = document.querySelector("#map");
    if (!mapEl) {
        return;
    }

    const CONFIG = {
        initialCenter: [51.05, -114.07],
        initialZoom: 11,
        boundaryGeoJsonUrl: "data/City_Boundary.geojson",
        parksUrl:
            "https://services2.arcgis.com/XSv3KNGfmrd1txPN/ArcGIS/rest/services/Parks_Sites_Calgary_Geog_280/FeatureServer/0",
        trailsUrl:
            "https://services2.arcgis.com/XSv3KNGfmrd1txPN/ArcGIS/rest/services/Parks_Trails_for_Calgary/FeatureServer/0",

        parksAreaField: "Shape__Area",
        parksNameField: "site_name",
        trailsNameField: "trail_name"
    };

    const map = L.map("map").setView(CONFIG.initialCenter, CONFIG.initialZoom);

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

    function applyBasemapForTheme() {
        const isDark = document.body.classList.contains("is-dark");

        if (isDark) {
            if (map.hasLayer(lightTiles)) {
                map.removeLayer(lightTiles);
            }
            if (!map.hasLayer(darkTiles)) {
                map.addLayer(darkTiles);
            }
        } else {
            if (map.hasLayer(darkTiles)) {
                map.removeLayer(darkTiles);
            }
            if (!map.hasLayer(lightTiles)) {
                map.addLayer(lightTiles);
            }
        }
    }

    applyBasemapForTheme();

    const bodyObserver = new MutationObserver(applyBasemapForTheme);
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    const DEFAULT_VIEW = {
        center: CONFIG.initialCenter,
        zoom: CONFIG.initialZoom
    };
    let defaultBounds = null;

    function escapeHtml(v) {
        return String(v ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function km2ToM2(km2) {
        const n = Number(km2);
        if (!Number.isFinite(n) || n < 0) {
            return null;
        }
        return n * 1000000;
    }

    const parks = L.esri.featureLayer({
        url: CONFIG.parksUrl,
        pane: "pane-parks",
        style: () => ({
            color: "#2a7fff",
            weight: 1,
            fillColor: "#2a7fff",
            fillOpacity: 0.20
        })
    }).addTo(map);

    parks.bindPopup((layer) => {
        const props = layer && layer.feature && layer.feature.properties ? layer.feature.properties : {};
        const name = props[CONFIG.parksNameField] || "Park";
        return `<strong>${escapeHtml(name)}</strong>`;
    });

    const trails = L.esri.featureLayer({
        url: CONFIG.trailsUrl,
        pane: "pane-trails",
        style: () => ({
            color: "#33aa55",
            weight: 3,
            opacity: 0.9
        })
    }).addTo(map);

    trails.bindPopup((layer) => {
        const props = layer && layer.feature && layer.feature.properties ? layer.feature.properties : {};
        const name = props[CONFIG.trailsNameField] || "Unnamed trail";
        return `<strong>${escapeHtml(name)}</strong>`;
    });

    let boundaryLayer = null;

    fetch(CONFIG.boundaryGeoJsonUrl)
        .then((res) => res.json())
        .then((geo) => {
            boundaryLayer = L.geoJSON(geo, {
                pane: "pane-boundary",
                style: {
                    color: "#183de6",
                    weight: 2,
                    fill: false
                }
            }).addTo(map);

            const b = boundaryLayer.getBounds();
            if (b && b.isValid()) {
                defaultBounds = b;
                map.fitBounds(b);
            } else {
                map.setView(DEFAULT_VIEW.center, DEFAULT_VIEW.zoom);
            }
        })
        .catch((err) => console.error("Boundary load failed", err));

    function setLayerVisible(layer, visible) {
        if (!layer) {
            return;
        }

        if (visible) {
            if (!map.hasLayer(layer)) {
                map.addLayer(layer);
            }
        } else {
            if (map.hasLayer(layer)) {
                map.removeLayer(layer);
            }
        }
    }

    const toggleParks = document.querySelector("#toggleParks");
    const toggleTrails = document.querySelector("#toggleTrails");
    const toggleBoundary = document.querySelector("#toggleBoundary");

    if (toggleParks) {
        toggleParks.addEventListener("change", () => {
            setLayerVisible(parks, toggleParks.checked);
        });
    }

    if (toggleTrails) {
        toggleTrails.addEventListener("change", () => {
            setLayerVisible(trails, toggleTrails.checked);
        });
    }

    if (toggleBoundary) {
        toggleBoundary.addEventListener("change", () => {
            setLayerVisible(boundaryLayer, toggleBoundary.checked);
        });
    }

    const resetBtn = document.querySelector("#resetViewBtn");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            if (defaultBounds) {
                map.fitBounds(defaultBounds);
            } else {
                map.setView(DEFAULT_VIEW.center, DEFAULT_VIEW.zoom);
            }
        });
    }

    const filterMajorParksCb = document.querySelector("#filterMajorParks");
    const minParkAreaInput = document.querySelector("#minParkAreaKm2");
    const minParkAreaEcho = document.querySelector("#minParkAreaKm2Echo");

    function clearParkAreaFilter() {
        parks.setWhere("1=1");
    }

    function isParkAreaFilterEnabled() {
        return !!(filterMajorParksCb && filterMajorParksCb.checked);
    }

    function applyParkAreaFilterFromInput() {
        if (!minParkAreaInput) {
            return;
        }

        const km2 = Number(minParkAreaInput.value);
        const m2 = km2ToM2(km2);

        if (minParkAreaEcho && Number.isFinite(km2) && km2 >= 0) {
            minParkAreaEcho.textContent = String(km2);
        }

        if (!isParkAreaFilterEnabled()) {
            return;
        }

        if (m2 === null || m2 === 0) {
            clearParkAreaFilter();
            return;
        }

        parks.setWhere(`${CONFIG.parksAreaField} >= ${m2}`);
    }

    if (isParkAreaFilterEnabled()) {
        applyParkAreaFilterFromInput();
    } else {
        clearParkAreaFilter();
    }

    if (minParkAreaInput) {
        minParkAreaInput.addEventListener("input", applyParkAreaFilterFromInput);

        minParkAreaInput.addEventListener("blur", () => {
            const km2 = Number(minParkAreaInput.value);
            if (!Number.isFinite(km2) || km2 < 0) {
                minParkAreaInput.value = "0";
                if (minParkAreaEcho) {
                    minParkAreaEcho.textContent = "0";
                }
                if (isParkAreaFilterEnabled()) {
                    clearParkAreaFilter();
                }
            } else {
                applyParkAreaFilterFromInput();
            }
        });
    }

    if (filterMajorParksCb) {
        filterMajorParksCb.addEventListener("change", () => {
            if (filterMajorParksCb.checked) {
                applyParkAreaFilterFromInput();
            } else {
                clearParkAreaFilter();
            }
        });
    }

    function applyNamedTrailsFilter(enabled) {
        const field = CONFIG.trailsNameField;

        if (enabled) {
            trails.setWhere(`${field} IS NOT NULL AND ${field} <> ''`);
        } else {
            trails.setWhere("1=1");
        }
    }

    const filterNamedTrailsCb = document.querySelector("#filterNamedTrails");
    if (filterNamedTrailsCb) {
        filterNamedTrailsCb.addEventListener("change", () => {
            applyNamedTrailsFilter(filterNamedTrailsCb.checked);
        });
    }

    if (DEBUG_MAP) {
        map.on("moveend zoomend resize", () => {
            console.log("MAP STATE:");
            console.log("Center:", map.getCenter());
            console.log("Zoom:", map.getZoom());
            console.log("Bounds:", map.getBounds());
        });
    }
})();