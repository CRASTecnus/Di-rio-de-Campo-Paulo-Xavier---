(() => {
  "use strict";

  const STORAGE_KEY = "px-caderno-de-campo-v1";

  /** @typedef {{id:string, type:string, date:string, location:string, code:string, summary:string, details:string, tags:string[], status:string, createdAt:string, updatedAt:string}} Entry */

  /** @type {Entry[]} */
  let entries = [];
  let activeFilter = "todos";
  let searchQuery = "";

  const TYPE_LABELS = {
    visita: "Visita",
    pesquisa: "Pesquisa",
    atividade: "Atividade técnica",
  };

  const STATUS_LABELS = {
    concluido: "Concluído",
    acompanhamento: "Acompanhamento pendente",
    planejado: "Planejado",
  };

  // ---------- Persistence ----------
  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      entries = raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Falha ao carregar dados salvos:", e);
      entries = [];
    }
  }

  function saveEntries() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // ---------- DOM refs ----------
  const entryList = document.getElementById("entryList");
  const emptyState = document.getElementById("emptyState");
  const filterTabs = document.getElementById("filterTabs");
  const searchInput = document.getElementById("searchInput");

  const modalBackdrop = document.getElementById("modalBackdrop");
  const entryForm = document.getElementById("entryForm");
  const modalTitle = document.getElementById("modalTitle");
  const deleteEntryBtn = document.getElementById("deleteEntryBtn");

  const fId = document.getElementById("entryId");
  const fType = document.getElementById("entryType");
  const fDate = document.getElementById("entryDate");
  const fLocation = document.getElementById("entryLocation");
  const fCode = document.getElementById("entryCode");
  const fSummary = document.getElementById("entrySummary");
  const fDetails = document.getElementById("entryDetails");
  const fTags = document.getElementById("entryTags");
  const fStatus = document.getElementById("entryStatus");

  // ---------- Rendering ----------
  function formatDate(isoDate) {
    if (!isoDate) return "";
    const [y, m, d] = isoDate.split("-");
    return `${d}/${m}/${y}`;
  }

  function matchesFilter(entry) {
    if (activeFilter === "todos") return true;
    if (activeFilter === "pendente") return entry.status === "acompanhamento";
    return entry.type === activeFilter;
  }

  function matchesSearch(entry) {
    if (!searchQuery) return true;
    const haystack = [
      entry.location, entry.code, entry.summary, entry.details,
      ...(entry.tags || []),
    ].join(" ").toLowerCase();
    return haystack.includes(searchQuery.toLowerCase());
  }

  function renderCounts() {
    document.getElementById("count-todos").textContent = entries.length;
    document.getElementById("count-visita").textContent = entries.filter(e => e.type === "visita").length;
    document.getElementById("count-pesquisa").textContent = entries.filter(e => e.type === "pesquisa").length;
    document.getElementById("count-atividade").textContent = entries.filter(e => e.type === "atividade").length;
    document.getElementById("count-pendente").textContent = entries.filter(e => e.status === "acompanhamento").length;
  }

  function renderList() {
    const visible = entries
      .filter(matchesFilter)
      .filter(matchesSearch)
      .sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.createdAt.localeCompare(a.createdAt));

    entryList.innerHTML = "";

    if (visible.length === 0) {
      emptyState.classList.add("visible");
    } else {
      emptyState.classList.remove("visible");
    }

    for (const entry of visible) {
      const card = document.createElement("article");
      card.className = "entry-card";
      card.dataset.id = entry.id;

      const tagsHtml = (entry.tags || [])
        .map(t => `<span class="entry-tag">${escapeHtml(t)}</span>`)
        .join("");

      card.innerHTML = `
        <span class="stamp ${entry.type}">${escapeHtml(TYPE_LABELS[entry.type] || entry.type)}</span>
        <div class="entry-date">${formatDate(entry.date)}</div>
        <h3 class="entry-summary">${escapeHtml(entry.summary)}</h3>
        <div class="entry-meta">
          ${entry.location ? `<div><strong>Local:</strong> ${escapeHtml(entry.location)}</div>` : ""}
          ${entry.code ? `<div><strong>Código:</strong> ${escapeHtml(entry.code)}</div>` : ""}
        </div>
        ${tagsHtml ? `<div class="entry-tags">${tagsHtml}</div>` : ""}
        <span class="status-pill ${entry.status}">${escapeHtml(STATUS_LABELS[entry.status] || entry.status)}</span>
      `;
      card.addEventListener("click", () => openModal(entry.id));
      entryList.appendChild(card);
    }

    renderCounts();
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
  }

  // ---------- Modal ----------
  function openModal(id) {
    entryForm.reset();
    if (id) {
      const entry = entries.find(e => e.id === id);
      if (!entry) return;
      modalTitle.textContent = "Editar registro";
      fId.value = entry.id;
      fType.value = entry.type;
      fDate.value = entry.date;
      fLocation.value = entry.location || "";
      fCode.value = entry.code || "";
      fSummary.value = entry.summary;
      fDetails.value = entry.details || "";
      fTags.value = (entry.tags || []).join(", ");
      fStatus.value = entry.status;
      deleteEntryBtn.style.display = "inline-block";
    } else {
      modalTitle.textContent = "Novo registro";
      fId.value = "";
      fDate.value = new Date().toISOString().slice(0, 10);
      fStatus.value = "concluido";
      deleteEntryBtn.style.display = "none";
    }
    modalBackdrop.classList.add("open");
    fSummary.focus();
  }

  function closeModal() {
    modalBackdrop.classList.remove("open");
  }

  entryForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = fId.value || uid();
    const now = new Date().toISOString();
    const existing = entries.find(en => en.id === id);

    const entry = {
      id,
      type: fType.value,
      date: fDate.value,
      location: fLocation.value.trim(),
      code: fCode.value.trim(),
      summary: fSummary.value.trim(),
      details: fDetails.value.trim(),
      tags: fTags.value.split(",").map(t => t.trim()).filter(Boolean),
      status: fStatus.value,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };

    if (existing) {
      entries = entries.map(en => en.id === id ? entry : en);
    } else {
      entries.push(entry);
    }

    saveEntries();
    renderList();
    closeModal();
  });

  deleteEntryBtn.addEventListener("click", () => {
    const id = fId.value;
    if (!id) return;
    if (!confirm("Excluir este registro? Esta ação não pode ser desfeita.")) return;
    entries = entries.filter(en => en.id !== id);
    saveEntries();
    renderList();
    closeModal();
  });

  document.getElementById("closeModalBtn").addEventListener("click", closeModal);
  document.getElementById("cancelModalBtn").addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalBackdrop.classList.contains("open")) closeModal();
  });

  document.getElementById("newEntryBtn").addEventListener("click", () => openModal(null));
  document.getElementById("emptyNewEntryBtn").addEventListener("click", () => openModal(null));

  // ---------- Filters & search ----------
  filterTabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    filterTabs.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    renderList();
  });

  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderList();
  });

  // ---------- Export / Import ----------
  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  document.getElementById("exportJsonBtn").addEventListener("click", () => {
    const stamp = new Date().toISOString().slice(0, 10);
    download(`caderno-de-campo-backup-${stamp}.json`, JSON.stringify(entries, null, 2), "application/json");
  });

  document.getElementById("exportCsvBtn").addEventListener("click", () => {
    const headers = ["data", "tipo", "local", "codigo", "resumo", "detalhes", "tags", "status"];
    const rows = entries
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      .map(en => [
        en.date, TYPE_LABELS[en.type] || en.type, en.location, en.code,
        en.summary, en.details, (en.tags || []).join("; "), STATUS_LABELS[en.status] || en.status,
      ].map(csvEscape).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const stamp = new Date().toISOString().slice(0, 10);
    download(`caderno-de-campo-${stamp}.csv`, "\uFEFF" + csv, "text/csv;charset=utf-8");
  });

  function csvEscape(value) {
    const str = (value ?? "").toString();
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  }

  document.getElementById("importFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!Array.isArray(imported)) throw new Error("Formato inválido");
        const existingIds = new Set(entries.map(en => en.id));
        let added = 0;
        for (const item of imported) {
          if (item && item.id && !existingIds.has(item.id)) {
            entries.push(item);
            added++;
          }
        }
        saveEntries();
        renderList();
        alert(`Importação concluída: ${added} registro(s) adicionado(s).`);
      } catch (err) {
        alert("Não foi possível importar o arquivo. Verifique se é um backup JSON válido gerado por este aplicativo.");
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  });

  // ---------- Init ----------
  loadEntries();
  renderList();
})();
