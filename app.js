"use strict";

const STORAGE_KEYS = {
  reports: "psn-reports-v1",
  theme: "psn-theme-v1"
};

const facilities = [
  {
    id: 1,
    name: "Nairobi Community Hospital (Demo)",
    area: "Central Nairobi",
    type: "Hospital",
    lat: -1.2864,
    lng: 36.8172,
    services: ["Outpatient", "Maternity", "Laboratory", "Pharmacy", "Emergency"],
    description: "Fictional demonstration record used to test the locator.",
    phone: "+254 700 111 222",
    hours: "Open 24 hours"
  },
  {
    id: 2,
    name: "Eastlands Health Centre (Demo)",
    area: "Eastlands",
    type: "Health Centre",
    lat: -1.2868,
    lng: 36.8795,
    services: ["Outpatient", "Laboratory", "Immunization"],
    description: "Fictional demonstration record used to test service filters.",
    phone: "+254 700 333 444",
    hours: "Open today • 8:00 AM – 6:00 PM"
  },
  {
    id: 3,
    name: "Westlands Family Clinic (Demo)",
    area: "Westlands",
    type: "Health Centre",
    lat: -1.2647,
    lng: 36.8089,
    services: ["Outpatient", "Pharmacy", "Maternity"],
    description: "Fictional demonstration record used to test nearby search.",
    phone: "+254 700 555 666",
    hours: "Open today • 7:00 AM – 8:00 PM"
  },
  {
    id: 4,
    name: "Kibera Community Dispensary (Demo)",
    area: "Kibera",
    type: "Dispensary",
    lat: -1.3107,
    lng: 36.7827,
    services: ["Outpatient", "Immunization", "Emergency"],
    description: "Fictional demonstration record used to test area filtering.",
    phone: "+254 700 777 888",
    hours: "Open today • 9:00 AM – 5:00 PM"
  },
  {
    id: 5,
    name: "South B Mobile Clinic (Demo)",
    area: "South B",
    type: "Dispensary",
    lat: -1.3153,
    lng: 36.8455,
    services: ["Outpatient", "Immunization", "Laboratory"],
    description: "Fictional demonstration record used to test mobile service display.",
    phone: "+254 700 999 000",
    hours: "Open today • 8:30 AM – 4:30 PM"
  },
  {
    id: 6,
    name: "Ngong Road Wellness Centre (Demo)",
    area: "Ngong Road",
    type: "Health Centre",
    lat: -1.302,
    lng: 36.7831,
    services: ["Outpatient", "Pharmacy", "Emergency"],
    description: "Fictional demonstration record used to test service cards and results.",
    phone: "+254 701 222 333",
    hours: "Open today • 8:00 AM – 7:00 PM"
  }
];

const initialReports = [
  { facilityId: 1, service: "Outpatient", status: "available" },
  { facilityId: 3, service: "Pharmacy", status: "available" },
  { facilityId: 4, service: "Immunization", status: "unavailable" }
];

function loadReports() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.reports);
    if (!raw) return [...initialReports];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : [...initialReports];
  } catch (error) {
    return [...initialReports];
  }
}

function saveReports() {
  try {
    window.localStorage.setItem(STORAGE_KEYS.reports, JSON.stringify(state.reports));
  } catch (error) {
    // Ignore storage errors in restricted browsers.
  }
}

const state = {
  query: "",
  service: "",
  type: "",
  selectedId: facilities[0]?.id ?? null,
  reports: loadReports(),
  userLocation: null,
  nearestFirst: false,
  darkMode: (() => {
    try {
      const cached = window.localStorage.getItem(STORAGE_KEYS.theme);
      return cached ? cached === "dark" : false;
    } catch (error) {
      return false;
    }
  })()
};

const ui = {
  searchForm: document.getElementById("search-form"),
  searchInput: document.getElementById("search-input"),
  suggestions: document.getElementById("search-suggestions"),
  serviceFilter: document.getElementById("service-filter"),
  typeFilter: document.getElementById("type-filter"),
  clearFiltersButton: document.getElementById("clear-filters"),
  nearestToggle: document.getElementById("nearest-toggle"),
  locateButton: document.getElementById("locate-button"),
  locationMessage: document.getElementById("location-message"),
  facilityList: document.getElementById("facility-list"),
  resultCount: document.getElementById("result-count"),
  emptyState: document.getElementById("empty-state"),
  facilityCount: document.getElementById("facility-count"),
  serviceCount: document.getElementById("service-count"),
  reportCount: document.getElementById("report-count"),
  reportForm: document.getElementById("report-form"),
  reportFacility: document.getElementById("report-facility"),
  reportService: document.getElementById("report-service"),
  reportStatus: document.getElementById("report-status"),
  reportMessage: document.getElementById("report-message"),
  facilityDialog: document.getElementById("facility-dialog"),
  facilityDetails: document.getElementById("facility-details"),
  closeDialogButton: document.getElementById("close-dialog"),
  themeToggle: document.getElementById("theme-toggle")
};

let map;
let markerLayer;

function getUniqueServiceCount() {
  return new Set(facilities.flatMap((facility) => facility.services)).size;
}

function getDistanceKm(from, to) {
  if (!from || !to) return Number.POSITIVE_INFINITY;

  const earthRadiusKm = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function formatDistance(distance) {
  if (!Number.isFinite(distance)) return "Distance unavailable";
  return `${distance.toFixed(1)} km away`;
}

function getSuggestions() {
  const query = state.query.trim().toLowerCase();
  if (!query) {
    return [];
  }

  const options = [
    ...facilities.map((facility) => facility.name),
    ...facilities.flatMap((facility) => facility.services),
    ...facilities.map((facility) => facility.area)
  ];

  return [...new Set(options)]
    .filter((option) => option.toLowerCase().includes(query))
    .slice(0, 6);
}

function renderSuggestions() {
  const suggestions = getSuggestions();
  const hasSuggestions = suggestions.length > 0;
  ui.suggestions.hidden = !hasSuggestions;
  ui.searchInput.setAttribute("aria-expanded", String(hasSuggestions));

  if (!hasSuggestions) {
    ui.suggestions.innerHTML = "";
    return;
  }

  ui.suggestions.innerHTML = suggestions
    .map(
      (suggestion) => `
        <li tabindex="0" data-value="${suggestion}">${suggestion}</li>
      `
    )
    .join("");

  ui.suggestions.querySelectorAll("li").forEach((item) => {
    item.addEventListener("click", () => {
      ui.searchInput.value = item.dataset.value;
      state.query = item.dataset.value;
      ui.suggestions.hidden = true;
      ui.searchInput.setAttribute("aria-expanded", "false");
      renderFacilities();
      renderMap();
      renderStats();
    });

    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        item.click();
      }
    });
  });
}

function applyTheme() {
  document.body.classList.toggle("theme-dark", state.darkMode);
  ui.themeToggle.textContent = state.darkMode ? "☀️" : "🌙";
  try {
    window.localStorage.setItem(STORAGE_KEYS.theme, state.darkMode ? "dark" : "light");
  } catch (error) {
    // Ignore storage issues.
  }
}

function getFilteredFacilities() {
  let filtered = [...facilities];

  if (state.query) {
    const query = state.query.trim().toLowerCase();
    filtered = filtered.filter((facility) => {
      const haystack = [facility.name, facility.area, facility.type, ...facility.services].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }

  if (state.service) {
    filtered = filtered.filter((facility) => facility.services.includes(state.service));
  }

  if (state.type) {
    filtered = filtered.filter((facility) => facility.type === state.type);
  }

  if (state.userLocation || state.nearestFirst) {
    const reference = state.userLocation ?? { lat: -1.2864, lng: 36.8172 };
    filtered = filtered
      .map((facility) => ({
        ...facility,
        distance: getDistanceKm(reference, facility)
      }))
      .filter((facility) => !state.userLocation || facility.distance <= 10)
      .sort((a, b) => a.distance - b.distance);
  }

  return filtered;
}

function renderStats() {
  const visibleCount = getFilteredFacilities().length;
  ui.facilityCount.textContent = String(visibleCount);
  ui.serviceCount.textContent = String(getUniqueServiceCount());
  ui.reportCount.textContent = String(state.reports.length);
}

function findFacility(id) {
  const facilityId = Number(id);
  return facilities.find((facility) => facility.id === facilityId) || null;
}

function getFacilityStatusSummary(facilityId) {
  const recentReports = state.reports.filter((entry) => entry.facilityId === facilityId);
  if (!recentReports.length) return "No recent reports";
  const latest = recentReports[recentReports.length - 1];
  return latest.status === "available" ? "Community update: available" : "Community update: unavailable";
}

function renderFacilities() {
  const filtered = getFilteredFacilities();
  ui.resultCount.textContent = `${filtered.length} result${filtered.length === 1 ? "" : "s"}`;
  ui.emptyState.hidden = filtered.length !== 0;

  if (!filtered.length) {
    ui.facilityList.innerHTML = "";
    return;
  }

  if (!state.selectedId || !filtered.some((facility) => facility.id === Number(state.selectedId))) {
    state.selectedId = filtered[0].id;
  }

  ui.facilityList.innerHTML = filtered
    .map((facility) => {
      const distance = state.userLocation || state.nearestFirst ? formatDistance(facility.distance) : "";
      const statusText = getFacilityStatusSummary(facility.id);

      return `
        <button
          type="button"
          class="facility-card ${facility.id === Number(state.selectedId) ? "selected" : ""}"
          data-id="${facility.id}"
        >
          <span class="facility-type">${facility.type}</span>
          <h4>${facility.name}</h4>
          <p>${facility.area} • ${facility.hours}</p>
          <p>${facility.services.join(", ")}</p>
          <span class="inline-distance">${distance || "🔎"} ${statusText}</span>
        </button>
      `;
    })
    .join("");

  ui.facilityList.querySelectorAll(".facility-card").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = Number(button.dataset.id);
      renderFacilities();
      renderMap();
      openFacilityDialog(findFacility(button.dataset.id));
    });
  });
}

function makeMarkerIcon(isSelected) {
  return L.divIcon({
    className: "custom-pin",
    html: `<span class="custom-pin-dot ${isSelected ? "selected" : ""}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}

function initMap() {
  map = L.map("map").setView([-1.2921, 36.8219], 11);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  markerLayer = L.layerGroup().addTo(map);
  renderMap();
}

function renderMap() {
  if (!map || !markerLayer) {
    return;
  }

  markerLayer.clearLayers();
  const visible = getFilteredFacilities();

  if (state.userLocation) {
    const userMarker = L.circleMarker([state.userLocation.lat, state.userLocation.lng], {
      radius: 7,
      color: "#0ea5e9",
      fillColor: "#38bdf8",
      fillOpacity: 0.9,
      weight: 2
    }).addTo(markerLayer);
    userMarker.bindPopup("Your current location");
  }

  visible.forEach((facility) => {
    const marker = L.marker([facility.lat, facility.lng], {
      icon: makeMarkerIcon(facility.id === Number(state.selectedId))
    }).addTo(markerLayer);

    marker.bindPopup(`
      <strong>${facility.name}</strong><br>
      ${facility.area}<br>
      ${facility.type}<br>
      ${facility.services.join(", ")}
    `);

    marker.on("click", () => {
      state.selectedId = facility.id;
      renderFacilities();
      renderMap();
      openFacilityDialog(facility);
    });
  });

  if (visible.length) {
    const bounds = L.latLngBounds(visible.map((facility) => [facility.lat, facility.lng]));
    map.fitBounds(bounds.pad(0.35));
  }
}

function openFacilityDialog(facility) {
  if (!facility) return;

  const reportList = state.reports
    .filter((entry) => entry.facilityId === facility.id)
    .map(
      (entry) => `<li>${entry.service}: ${entry.status === "available" ? "reported available" : "reported unavailable"}</li>`
    )
    .join("");

  ui.facilityDetails.innerHTML = `
    <div class="dialog-content">
      <h2>${facility.name}</h2>
      <p><strong>${facility.type}</strong> • ${facility.area}</p>
      <p>${facility.description}</p>
      <ul>
        <li>Hours: ${facility.hours}</li>
        <li>Phone: ${facility.phone}</li>
        <li>Services: ${facility.services.join(", ")}</li>
      </ul>
      <h3>Community notices</h3>
      <ul>${reportList || "<li>No recent reports yet.</li>"}</ul>
    </div>
  `;

  if (typeof ui.facilityDialog.showModal === "function") {
    ui.facilityDialog.showModal();
  }
}

function closeDialog() {
  if (typeof ui.facilityDialog.close === "function") {
    ui.facilityDialog.close();
  }
}

function populateReportFacilityOptions() {
  ui.reportFacility.innerHTML = `
    <option value="">Select a facility</option>
    ${facilities
      .map((facility) => `<option value="${facility.id}">${facility.name}</option>`)
      .join("")}
  `;
}

function applyOfflineSupport() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") {
    return;
  }

  navigator.serviceWorker.register("./sw.js").catch(() => {
    // Service worker registration is optional; fail gracefully.
  });
}

ui.searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.query = ui.searchInput.value.trim();
  renderSuggestions();
  renderStats();
  renderFacilities();
  renderMap();
});

ui.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value.trim();
  renderSuggestions();
  renderStats();
  renderFacilities();
  renderMap();
});

ui.searchInput.addEventListener("blur", () => {
  window.setTimeout(() => {
    ui.suggestions.hidden = true;
    ui.searchInput.setAttribute("aria-expanded", "false");
  }, 120);
});

ui.serviceFilter.addEventListener("change", (event) => {
  state.service = event.target.value;
  renderStats();
  renderFacilities();
  renderMap();
});

ui.typeFilter.addEventListener("change", (event) => {
  state.type = event.target.value;
  renderStats();
  renderFacilities();
  renderMap();
});

ui.clearFiltersButton.addEventListener("click", () => {
  state.query = "";
  state.service = "";
  state.type = "";
  state.userLocation = null;
  state.nearestFirst = false;
  ui.searchInput.value = "";
  ui.serviceFilter.value = "";
  ui.typeFilter.value = "";
  ui.nearestToggle.textContent = "Nearest first";
  ui.locationMessage.textContent = "Allow location access when your browser asks.";
  renderSuggestions();
  renderStats();
  renderFacilities();
  renderMap();
});

ui.nearestToggle.addEventListener("click", () => {
  state.nearestFirst = !state.nearestFirst;
  ui.nearestToggle.textContent = state.nearestFirst ? "Nearest active" : "Nearest first";
  renderStats();
  renderFacilities();
  renderMap();
});

ui.locateButton.addEventListener("click", () => {
  if (!("geolocation" in navigator)) {
    ui.locationMessage.textContent = "Location services are not supported in this browser.";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      state.nearestFirst = true;
      ui.nearestToggle.textContent = "Nearest active";

      const nearest = getFilteredFacilities()[0];
      ui.locationMessage.textContent = nearest
        ? `Showing facilities within 10 km of your location. Closest: ${nearest.name}.`
        : "No facilities are within 10 km of your current location.";

      renderStats();
      renderFacilities();
      renderMap();
    },
    () => {
      ui.locationMessage.textContent = "Location access was blocked. Please allow it to use nearby search.";
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
});

ui.reportForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const facilityId = Number(ui.reportFacility.value);
  const service = ui.reportService.value;
  const status = ui.reportStatus.value;

  if (!facilityId || !service || !status) {
    ui.reportMessage.textContent = "Please complete all fields before submitting a report.";
    return;
  }

  state.reports.push({ facilityId, service, status });
  saveReports();
  ui.reportMessage.textContent = "Thank you. Your community report has been added.";
  ui.reportForm.reset();
  renderStats();
  renderFacilities();
  renderMap();

  const selected = findFacility(state.selectedId);
  if (selected) {
    openFacilityDialog(selected);
  }
});

ui.closeDialogButton.addEventListener("click", closeDialog);
ui.facilityDialog.addEventListener("click", (event) => {
  if (event.target === ui.facilityDialog) {
    closeDialog();
  }
});

ui.themeToggle.addEventListener("click", () => {
  state.darkMode = !state.darkMode;
  applyTheme();
});

window.addEventListener("online", () => {
  ui.locationMessage.textContent = "Connection restored. You can continue browsing the directory.";
});

window.addEventListener("offline", () => {
  ui.locationMessage.textContent = "You are offline. The app will keep working with cached data.";
});

populateReportFacilityOptions();
applyTheme();
renderSuggestions();
renderStats();
renderFacilities();
initMap();
applyOfflineSupport();
