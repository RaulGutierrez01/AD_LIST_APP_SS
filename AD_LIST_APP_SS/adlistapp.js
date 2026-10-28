(() => {
  "use strict";

  const STORAGE_KEY = "adControl.records.v1";
  const SETTINGS_KEY = "adControl.settings.v1";
  const $ = (id) => document.getElementById(id);
  const todayISO = new Date().toISOString().slice(0, 10);

  const ATA_CATALOG = {
    "00": "Introduction", "01": "Maintenance Policy", "02": "Operations", "03": "Support Equipment",
    "04": "Airworthiness Limitations", "05": "Time Limits/Maintenance Checks", "06": "Dimensions and Areas",
    "07": "Lifting and Shoring", "08": "Leveling and Weighing", "09": "Towing and Taxiing",
    "10": "Parking, Mooring, Storage", "11": "Placards and Markings", "12": "Servicing",
    "16": "Doors", "17": "Flight Deck", "18": "Vibration and Noise Analysis",
    "20": "Standard Practices", "21": "Air Conditioning", "22": "Auto Flight",
    "23": "Communications", "24": "Electrical Power", "25": "Equipment/Furnishings",
    "26": "Fire Protection", "27": "Flight Controls", "28": "Fuel System",
    "29": "Hydraulic Power", "30": "Ice and Rain Protection", "31": "Indicating and Recording Systems",
    "32": "Landing Gear", "33": "Lights", "34": "Navigation", "35": "Oxygen System",
    "36": "Pneumatic System", "37": "Vacuum System", "38": "Water/Waste System",
    "39": "Electrical Static Protection", "41": "Water Ballast", "42": "Integrated Modular Avionics",
    "44": "Cabin Systems", "45": "Central Maintenance System", "46": "Information Systems",
    "47": "Inert Gas Systems", "49": "APU", "50": "Cargo Compartments",
    "51": "Standard Practices (Structures)", "52": "Doors", "53": "Fuselage",
    "54": "Nacelles/Pylons", "55": "Stabilizers", "56": "Windows", "57": "Wings",
    "60": "Standard Practices (Propellers)", "61": "Propellers", "62": "Main Rotors",
    "63": "Rotor Drives", "64": "Tail Rotors", "65": "Tail Rotor Drive",
    "66": "Folding Blades/Pylons", "67": "Rotors Flight Controls", "70": "Standard Practices (Engines)",
    "71": "Powerplant", "72": "Engine", "73": "Engine Fuel and Control",
    "74": "Ignition System", "75": "Air System", "76": "Engine Controls",
    "77": "Engine Indicating", "78": "Exhaust System", "79": "Oil System",
    "80": "Starting System", "81": "Turbine Engine Air", "82": "Water Injection",
    "83": "Accessory Gearboxes"
  };

  function getATA(subject = "") {
    const s = subject.toLowerCase();
    const rules = [
      { ata: "21", keywords: ["air conditioning"] },
      { ata: "22", keywords: ["auto flight"] },
      { ata: "23", keywords: ["communication"] },
      { ata: "24", keywords: ["electrical power", "electrical"] },
      { ata: "25", keywords: ["equipment", "furnishing"] },
      { ata: "26", keywords: ["fire"] },
      { ata: "27", keywords: ["flight control", "aileron", "rudder", "elevator"] },
      { ata: "28", keywords: ["fuel"] },
      { ata: "29", keywords: ["hydraulic"] },
      { ata: "30", keywords: ["ice", "rain protection"] },
      { ata: "31", keywords: ["indicating", "recording"] },
      { ata: "32", keywords: ["landing gear"] },
      { ata: "33", keywords: ["light", "lighting"] },
      { ata: "34", keywords: ["avionics", "navigation", "instrument"] },
      { ata: "35", keywords: ["oxygen"] },
      { ata: "36", keywords: ["pneumatic"] },
      { ata: "37", keywords: ["vacuum"] },
      { ata: "38", keywords: ["water", "waste"] },
      { ata: "42", keywords: ["integrated modular avionics"] },
      { ata: "44", keywords: ["cabin"] },
      { ata: "45", keywords: ["maintenance system"] },
      { ata: "46", keywords: ["information system"] },
      { ata: "47", keywords: ["inert gas"] },
      { ata: "49", keywords: ["apu"] },
      { ata: "50", keywords: ["cargo"] },
      { ata: "52", keywords: ["door"] },
      { ata: "53", keywords: ["fuselage", "structure"] },
      { ata: "54", keywords: ["nacelle", "pylon"] },
      { ata: "55", keywords: ["stabilizer"] },
      { ata: "56", keywords: ["window"] },
      { ata: "57", keywords: ["wing"] },
      { ata: "61", keywords: ["propeller"] },
      { ata: "71", keywords: ["powerplant"] },
      { ata: "72", keywords: ["engine"] },
      { ata: "73", keywords: ["engine fuel"] },
      { ata: "74", keywords: ["ignition"] },
      { ata: "75", keywords: ["air system"] },
      { ata: "76", keywords: ["engine control"] },
      { ata: "77", keywords: ["engine indicating"] },
      { ata: "78", keywords: ["exhaust"] },
      { ata: "79", keywords: ["oil system"] },
      { ata: "80", keywords: ["starting system"] }
    ];

    for (const rule of rules) {
      if (rule.keywords.some(k => s.includes(k))) {
        return rule.ata;
      }
    }
    return "--";
  }

  let records = [];
  let settings = { fleetModel: "Boeing 737" };
  let currentDetailId = null;
  let toastTimeout = null;

  async function loadData() {
    try {
      const res = await fetch("http://localhost:1000/api/ads");
      if (res.ok) {
        const fetchedRecords = await res.json();
        records = fetchedRecords.map((r) => ({
          ...r,
          ata: r.ata || getATA(r.subject),
          status: r.status || "Pending",
          make: r.type === "component" ? "" : (r.make || "The Boeing"),
          model: r.type === "component" ? "" : (r.model || settings.fleetModel)
        }));
      } else {
        throw new Error("Error en la respuesta del servidor");
      }
    } catch (e) {
      console.warn("No se pudo conectar al servidor backend de ADs.", e);
      records = [];
    }

    try {
      settings = { ...settings, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}")) };
    } catch (e) { /* Mantiene valores por defecto */ }

    persist();
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      showToast("No se pudo guardar en el navegador.");
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[ch]);
  }

  function formatDate(value) {
    if (!value) return "—";
    const parts = String(value).slice(0, 10).split("-");
    if (parts.length !== 3) return escapeHTML(value);
    const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(parts[1]) - 1];
    return month ? `${parts[2]} ${month} ${parts[0]}` : escapeHTML(value);
  }

  function statusLabel(status) {
    return status === "Reviewed" ? "Reviewed" : "Pending";
  }

  function getVisibleRecords() {
    const q = $("searchInput").value.trim().toLowerCase();
    const status = $("statusFilter").value;
    const type = $("typeFilter").value;
    const year = $("yearFilter").value;
    return records
      .filter((r) => !q || [r.number, r.status, r.subject, r.make, r.model, r.cfr, r.summary].some((v) => String(v || "").toLowerCase().includes(q)))
      .filter((r) => status === "all" || r.status === status)
      .filter((r) => type === "all" || r.type === type)
      .filter((r) => year === "all" || (r.effectiveDate && r.effectiveDate.startsWith(year)))
      .sort((a, b) => String(b.publishDate || "").localeCompare(String(a.publishDate || "")));
  }

  function render() {
    const visible = getVisibleRecords();
    $("sidebarCount").textContent = records.length;
    $("dashboardADCount").textContent = records.length;
    $("metricTotal").textContent = records.length;
    $("metricReview").textContent = records.filter((r) => r.status !== "Reviewed").length;
    $("metricFleet").textContent = settings.fleetModel || "Boeing 737";
    $("tableCount").textContent = `Mostrando ${visible.length} de ${records.length} registros`;
    $("adTableBody").innerHTML = visible.map((r) => `
      <tr data-open-record="${escapeHTML(r.id)}" tabindex="0" aria-label="Ver detalles de ${escapeHTML(r.number)}">
        <td><span class="ad-number">${escapeHTML(r.number)}</span>${r.type === "component" && r.status !== "Reviewed" ? '<span class="warning-mini" title="AD de componente. Requiere análisis de stock." aria-label="AD de componente. Requiere análisis de stock.">⚠</span>' : ""}</td>
        <td>${r.type === "component" ? "—" : escapeHTML(r.make || "Boeing")}</td>
        <td>${r.type === "component" ? "—" : escapeHTML(r.model || "737")}</td>
        <td><span class="subject-cell">${escapeHTML(r.subject || "—")}</span></td>
        <td>${escapeHTML(r.ata || "--")}</td>
        <td>${formatDate(r.publishDate)}</td>
        <td>${formatDate(r.effectiveDate)}</td>
        <td><select class="row-status-select ${r.status === "Reviewed" ? "status-reviewed" : "status-pending"}" data-status-record="${escapeHTML(r.id)}" aria-label="Estado de revisión para ${escapeHTML(r.number)}"><option value="Reviewed" ${r.status === "Reviewed" ? "selected" : ""}>Reviewed</option><option value="Pending" ${r.status !== "Reviewed" ? "selected" : ""}>Pending</option></select></td>
      </tr>`).join("");
    $("emptyState").classList.toggle("hidden", visible.length !== 0);
    $("adTableBody").classList.toggle("hidden", visible.length === 0);
  }

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.remove("hidden");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.add("hidden"), 3600);
  }

  function setView(view) {
    const isDashboard = view === "dashboard";
    $("dashboardView").classList.toggle("hidden", !isDashboard);
    $("adView").classList.toggle("hidden", isDashboard);
    $("navDashboard").classList.toggle("active", isDashboard);
    $("navAD").classList.toggle("active", !isDashboard);
    $("breadcrumbCurrent").textContent = isDashboard ? "Dashboard" : "AD Control";
    $("sidebar").classList.remove("open");
    if (!isDashboard) render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openDetail(id) {
    const r = records.find((item) => item.id === id);
    if (!r) return;
    currentDetailId = id;
    $("detailTitle").textContent = "AD Details";
    const fields = [
      ["Subject", r.subject], ["ATA Chapter", r.ata ? `${r.ata} ${ATA_CATALOG[r.ata] || ""}` : "--"],
      ["Citation Publish Date", formatDate(r.publishDate)], ["Effective Date", formatDate(r.effectiveDate)],
      ["Make", r.type === "component" ? "—" : (r.make || "Airbus SAS")], ["Model", r.type === "component" ? "—" : (r.model || "737")],
      ["CFR Part Reference", r.cfr || "Not specified"]
    ];
    const linkHTML = r.link && /^https?:\/\//i.test(r.link)
      ? `<a class="source-link" href="${escapeHTML(r.link)}" target="_blank" rel="noopener noreferrer">↗ Open official AD document <span>↗</span></a>`
      : `<span class="source-link" style="color:#91a0b3">Official document link not configured</span>`;
    $("detailContent").innerHTML = `
      <div class="detail-body">
        <div class="detail-topline"><span class="detail-number">${escapeHTML(r.number)}</span>
          ${r.type === "component" && r.status !== "Reviewed" ? '<span class="warning-label" title="AD de componente. Verificar stock.">⚠ AD de componente. Requiere verificación de stock.</span>' : ""}
        </div>
        <div class="detail-grid">${fields.map(([label, value]) => `<div class="detail-field"><label>${escapeHTML(label)}</label><div>${escapeHTML(value || "—")}</div></div>`).join("")}</div>
        <div class="detail-section"><h3>AD Description</h3><p>${escapeHTML(r.description || "No description entered.")}</p></div>
        <div class="detail-section"><h3>AD Summary</h3><p>${escapeHTML(r.summary || "No summary entered.")}</p></div>
        <div class="detail-section"><h3>Official AD Document</h3>${linkHTML}</div>
        ${r.notes ? `<div class="detail-section"><h3>Review Notes</h3><div class="notes-box">${escapeHTML(r.notes)}</div></div>` : ""}
        <div class="detail-section"><p style="font-size:10px;color:#9aa6b5">Created / saved: ${escapeHTML(r.createdAt ? new Date(r.createdAt).toLocaleString() : "Not available")}</p></div>
      </div>`;
    $("detailModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeModal(id) {
    $(id).classList.add("hidden");
    if ([$("detailModal"), $("formModal"), $("fleetModal")].every((el) => el.classList.contains("hidden"))) {
      document.body.style.overflow = "";
    }
  }

  function saveRecord(event) {
    event.preventDefault();
    const id = $("recordId").value || `ad-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
    const previous = records.find((r) => r.id === id);
    const record = {
      id, number: $("fNumber").value.trim(), status: $("fStatus").value,
      subject: $("fSubject").value.trim(), ata: getATA($("fSubject").value.trim()), publishDate: $("fPublishDate").value,
      effectiveDate: $("fEffectiveDate").value, make: $("fMake").value.trim(),
      model: $("fModel").value.trim(), cfr: $("fCFR").value.trim(),
      type: $("fType").value, description: $("fDescription").value.trim(),
      summary: $("fSummary").value.trim(), link: $("fLink").value.trim(),
      notes: $("fNotes").value.trim(),
      createdAt: previous?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const duplicate = records.find((r) => r.number.toLowerCase() === record.number.toLowerCase() && r.id !== id);
    if (duplicate) {
      showToast("Ya existe un registro con ese AD Number.");
      return;
    }
    if (previous) records = records.map((r) => r.id === id ? record : r);
    else records.push(record);
    persist(); render(); closeModal("formModal");
    showToast(previous ? "Registro actualizado." : "Registro guardado.");
  }

  function openFleetModal() {
    $("fleetModelInput").value = settings.fleetModel || "";
    $("fleetModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function exportCSV() {
    const visible = getVisibleRecords();
    if (!visible.length) { showToast("No hay registros para exportar."); return; }
    const columns = [
      ["AD number", "number"], ["Make", "make"], ["Model", "model"], ["Subjects", "subject"], ["ATA", "ata"],
      ["Citation publish date", "publishDate"], ["Effective Date", "effectiveDate"], ["Status", "status"]
    ];
    const quote = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = "\uFEFF" + [columns.map(([label]) => quote(label)).join(","), ...visible.map((r) => columns.map(([, key]) => quote(key === "make" && r.type === "component" ? "" : key === "model" && r.type === "component" ? "" : key === "publishDate" || key === "effectiveDate" ? formatDate(r[key]) : key === "status" ? statusLabel(r[key]) : r[key])).join(","))].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `AD_List_${todayISO}.csv`; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    showToast("Exportación CSV preparada.");
  }

  function populateYearFilter() {
    const select = $("yearFilter");
    if (!select) return;
    const years = [...new Set(
      records
        .map(r => r.effectiveDate?.slice(0, 4))
        .filter(Boolean)
    )].sort((a, b) => b - a);

    select.innerHTML =
      '<option value="all">All Years</option>' +
      years.map(year => `<option value="${year}">${year}</option>`).join("");
  }

  function bindEvents() {
    ["navAD", "cardAD", "heroOpenAD"].forEach((id) => $(id).addEventListener("click", () => setView("ad")));
    ["navDashboard", "brandHome", "backDashboard"].forEach((id) => $(id).addEventListener("click", (e) => { e.preventDefault(); setView("dashboard"); }));
    $("mobileMenu").addEventListener("click", () => $("sidebar").classList.toggle("open"));
    $("searchInput").addEventListener("input", render);
    $("statusFilter").addEventListener("change", render);
    $("typeFilter").addEventListener("change", render);
    $("yearFilter").addEventListener("change", render);
    $("configureFleet").addEventListener("click", openFleetModal);
    $("exportCSV").addEventListener("click", exportCSV);
    $("adForm").addEventListener("submit", saveRecord);
    $("fleetForm").addEventListener("submit", (e) => {
      e.preventDefault(); settings.fleetModel = $("fleetModelInput").value.trim(); persist(); render();
      closeModal("fleetModal"); showToast("Modelo de flota guardado.");
    });
    $("adTableBody").addEventListener("change", (e) => {
      const select = e.target.closest("[data-status-record]");
      if (!select) return;
      const record = records.find((r) => r.id === select.dataset.statusRecord);
      if (record) { record.status = select.value; persist(); render(); if (record.type === "component" && record.status === "Reviewed") showToast("AD marcado como Reviewed."); }
    });
    $("adTableBody").addEventListener("click", (e) => {
      if (e.target.closest("[data-status-record]")) { e.stopPropagation(); return; }
      const row = e.target.closest("[data-open-record]");
      if (row) openDetail(row.dataset.openRecord);
    });
    $("adTableBody").addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        const row = e.target.closest("[data-open-record]");
        if (row) { e.preventDefault(); openDetail(row.dataset.openRecord); }
      }
    });
    $("closeDetail").addEventListener("click", () => closeModal("detailModal"));
    $("closeDetailBottom").addEventListener("click", () => closeModal("detailModal"));
    $("closeForm").addEventListener("click", () => closeModal("formModal"));
    $("cancelForm").addEventListener("click", () => closeModal("formModal"));
    $("closeFleet").addEventListener("click", () => closeModal("fleetModal"));
    $("cancelFleet").addEventListener("click", () => closeModal("fleetModal"));
    ["detailModal", "formModal", "fleetModal"].forEach((id) => $(id).addEventListener("click", (e) => {
      if (e.target === $(id)) closeModal(id);
    }));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") ["detailModal", "formModal", "fleetModal"].forEach((id) => closeModal(id));
    });
  }

  async function init() {
    await loadData();
    populateYearFilter();
    $("todayLabel").textContent = new Date().toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" });
    bindEvents();
    render();
  }

  init();
})();
