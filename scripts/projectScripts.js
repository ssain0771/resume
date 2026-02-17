(function loadProjectContent() {
    if (!document.querySelector('#overview')) {
        return;
    }

    fetch('data/project.json')
        .then((res) => res.json())
        .then((data) => {
            const overviewTitle = document.querySelector('#overviewTitle');
            const overviewText = document.querySelector('#overviewText');
            const mapPanelTitle = document.querySelector('#mapPanelTitle');
            const parksLabel = document.querySelector('#parksLabel');
            const trailsLabel = document.querySelector('#trailsLabel');
            const boundaryLabel = document.querySelector('#boundaryLabel');
            const legendTip = document.querySelector('#legendTip');
            const legendDataSource = document.querySelector('#legendDataSource');

            if (overviewTitle) overviewTitle.textContent = data.overviewTitle || overviewTitle.textContent;
            if (overviewText) overviewText.textContent = data.overviewText || '';
            if (mapPanelTitle) mapPanelTitle.textContent = data.mapPanelTitle || mapPanelTitle.textContent;
            if (parksLabel) parksLabel.textContent = (data.layers && data.layers.parks) || parksLabel.textContent;
            if (trailsLabel) trailsLabel.textContent = (data.layers && data.layers.trails) || trailsLabel.textContent;
            if (boundaryLabel) boundaryLabel.textContent = (data.layers && data.layers.boundary) || boundaryLabel.textContent;
            if (legendTip) legendTip.textContent = data.tip || '';
            if (legendDataSource) legendDataSource.textContent = data.dataSource || '';
        })
        .catch((err) => console.error('Failed to load project.json', err));
})();

(function initProjectMap() {
    const DEBUG_MAP = window.localStorage.getItem("debugMap") === "true";
    const mapEl = document.querySelector("#map");
    if (!mapEl) {
        return;
    }

    // Create map
    const map = L.map("map").setView([51.05, -114.07], 11);

    // Basemaps (light + dark)
    const lightTiles = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        { attribution: "&copy; OpenStreetMap contributors" }
    );

    const darkTiles = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { attribution: "&copy; OpenStreetMap contributors &copy; CARTO" }
    );

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

    // Also re-apply basemap after your theme toggle button is clicked
    const themeToggle = document.querySelector("#themeToggle");
    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            // Let baseScripts flip the class first
            setTimeout(applyBasemapForTheme, 0);
        });
    }

    // Related layers: Parks (polygons) + Pathways/Trails (lines)
    const parks = L.esri.featureLayer({
        url: "https://services2.arcgis.com/XSv3KNGfmrd1txPN/ArcGIS/rest/services/Parks_Sites_Calgary_Geog_280/FeatureServer/0",
        style: function () {
            return {
                color: "#2a7fff",
                weight: 1,
                fillColor: "#2a7fff",
                fillOpacity: 0.20
            };
        }
    });

    const trails = L.esri.featureLayer({
        url: "https://services2.arcgis.com/XSv3KNGfmrd1txPN/ArcGIS/rest/services/Parks_Trails_for_Calgary/FeatureServer/0",
        style: function () {
            return {
                color: "#33aa55",
                weight: 3,
                opacity: 0.9
            };
        }
    });

    // Add both by default
    parks.addTo(map);
    // Click a park to view its name (if available)
    parks.bindPopup(function (layer) {
        const props = layer.feature && layer.feature.properties ? layer.feature.properties : {};
        
        // Try a few common field names (different datasets sometimes use different ones)
        const name = props.site_name || props.name || props.park_name || props.PARK_NAME || "Park";
        return `<strong>${name}</strong>`;
    });

    trails.addTo(map);

    // Boundary (GeoJSON), stored so we can toggle it on/off
    let boundaryLayer = null;

    fetch("data/City_Boundary.geojson")
        .then((res) => res.json())
        .then((geo) => {
            boundaryLayer = L.geoJSON(geo, {
                style: {
                    color: "#183de6",
                    weight: 2,
                    fill: false
                }
            }).addTo(map);

            map.fitBounds(boundaryLayer.getBounds());
        })
        .catch((err) => console.error("Boundary load failed", err));

    // Legend toggles (checkboxes)
    const toggleParks = document.querySelector("#toggleParks");
    const toggleTrails = document.querySelector("#toggleTrails");
    const toggleBoundary = document.querySelector("#toggleBoundary");

    function setLayerVisible(layer, visible) {
        if (!layer) {
            return;
        }

        if (visible && !map.hasLayer(layer)) {
            map.addLayer(layer);
        }

        if (!visible && map.hasLayer(layer)) {
            map.removeLayer(layer);
        }
    }

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

    // Optional logging for lab observation (enable with localStorage.debugMap = "true")
    if (DEBUG_MAP) {
        map.on("moveend zoomend resize", () => {
            console.log("---- MAP STATE ----");
            console.log("Size:", map.getSize());
            console.log("Center:", map.getCenter());
            console.log("Zoom:", map.getZoom());
            console.log("Bounds:", map.getBounds());
        });
    }
})();