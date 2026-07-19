/* ============================================================
   CADERNO DE CAMPO — Paulo Xavier
   Lógica do app: cadastro, filtros, busca, GPS, persistência
   local e exportação (JSON, CSV, Word e PDF).
   ============================================================ */

(function () {
  'use strict';

  var STORAGE_KEY = 'cadernoCampoEntries.v1';

  var TYPE_LABELS = {
    atendimento: 'Atendimento individual (PAIF)',
    visita: 'Visita domiciliar',
    grupo: 'Grupo / Oficina'
  };

  var STATUS_LABELS = {
    concluido: 'Concluído',
    acompanhamento: 'Acompanhamento pendente',
    planejado: 'Planejado'
  };

  var state = {
    entries: [],
    filter: 'todos',
    search: ''
  };

  /* ---------- Elementos ---------- */

  var el = {
    tabs: document.getElementById('filterTabs'),
    entryList: document.getElementById('entryList'),
    emptyState: document.getElementById('emptyState'),
    searchInput: document.getElementById('searchInput'),
    newEntryBtn: document.getElementById('newEntryBtn'),
    emptyNewEntryBtn: document.getElementById('emptyNewEntryBtn'),

    modalBackdrop: document.getElementById('modalBackdrop'),
    entryForm: document.getElementById('entryForm'),
    modalTitle: document.getElementById('modalTitle'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelModalBtn: document.getElementById('cancelModalBtn'),
    deleteEntryBtn: document.getElementById('deleteEntryBtn'),

    entryId: document.getElementById('entryId'),
    entryLat: document.getElementById('entryLat'),
    entryLng: document.getElementById('entryLng'),
    entryType: document.getElementById('entryType'),
    entryDate: document.getElementById('entryDate'),
    entryLocation: document.getElementById('entryLocation'),
    entryCode: document.getElementById('entryCode'),
    entrySummary: document.getElementById('entrySummary'),
    entryDetails: document.getElementById('entryDetails'),
    entryTags: document.getElementById('entryTags'),
    entryStatus: document.getElementById('entryStatus'),
    getLocationBtn: document.getElementById('getLocationBtn'),

    exportJsonBtn: document.getElementById('exportJsonBtn'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    exportWordBtn: document.getElementById('exportWordBtn'),
    exportPdfBtn: document.getElementById('exportPdfBtn'),
    importFile: document.getElementById('importFile'),

    toast: document.getElementById('toast')
  };

  /* ---------- Utilidades ---------- */

  function uid() {
    return 'e_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function formatDateBR(isoDate) {
    if (!isoDate) return '';
    var parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  var toastTimer = null;
  function toast(message, isError) {
    el.toast.textContent = message;
    el.toast.classList.toggle('error', !!isError);
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.toast.classList.remove('show');
    }, 3200);
  }

  /* Download confiável em qualquer navegador (inclusive PWA instalado
     no mobile). Evita window.open(), que costuma ser bloqueado dentro
     de apps instalados — é a causa mais comum de exportações que
     "não aparecem" no celular. */
  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }

  /* ---------- Persistência ---------- */

  function loadEntries() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      state.entries = raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.error('Erro ao carregar registros salvos:', err);
      state.entries = [];
    }
  }

  function saveEntries() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
    } catch (err) {
      console.error('Erro ao salvar registros:', err);
      toast('Não foi possível salvar no armazenamento local do dispositivo.', true);
    }
  }

  /* ---------- Filtros / contagem ---------- */

  function matchesFilter(entry) {
    if (state.filter === 'todos') return true;
    if (state.filter === 'pendente') return entry.status === 'acompanhamento';
    return entry.type === state.filter;
  }

  function matchesSearch(entry) {
    if (!state.search) return true;
    var q = state.search.toLowerCase();
    var haystack = [
      entry.location, entry.code, entry.summary, entry.details,
      (entry.tags || []).join(' ')
    ].join(' ').toLowerCase();
    return haystack.indexOf(q) !== -1;
  }

  function updateCounts() {
    var counts = { todos: state.entries.length, atendimento: 0, visita: 0, grupo: 0, pendente: 0 };
    state.entries.forEach(function (entry) {
      if (counts[entry.type] !== undefined) counts[entry.type]++;
      if (entry.status === 'acompanhamento') counts.pendente++;
    });
    Object.keys(counts).forEach(function (key) {
      var elCount = document.getElementById('count-' + key);
      if (elCount) elCount.textContent = counts[key];
    });
  }

  /* ---------- Renderização ---------- */

  function render() {
    updateCounts();

    var visible = state.entries
      .filter(matchesFilter)
      .filter(matchesSearch)
      .sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });

    el.entryList.innerHTML = '';

    if (visible.length === 0) {
      el.emptyState.style.display = 'flex';
      el.entryList.style.display = 'none';
      return;
    }

    el.emptyState.style.display = 'none';
    el.entryList.style.display = 'grid';

    visible.forEach(function (entry) {
      var card = document.createElement('article');
      card.className = 'entry-card';
      card.setAttribute('data-id', entry.id);

      var mapLink = '';
      if (entry.lat && entry.lng) {
        mapLink = '<a class="entry-map-link" target="_blank" rel="noopener" href="https://www.google.com/maps?q=' +
          encodeURIComponent(entry.lat) + ',' + encodeURIComponent(entry.lng) + '">Ver localização no mapa</a>';
      }

      var statusFlag = entry.status === 'acompanhamento'
        ? '<span class="entry-status-flag">Acompanhamento pendente</span>'
        : '';

      card.innerHTML =
        '<div class="entry-card-head">' +
          '<span class="entry-type-badge entry-type-' + entry.type + '">' + escapeHtml(TYPE_LABELS[entry.type] || entry.type) + '</span>' +
          '<span class="entry-date">' + formatDateBR(entry.date) + '</span>' +
        '</div>' +
        '<h3 class="entry-title">' + escapeHtml(entry.summary) + '</h3>' +
        '<p class="entry-meta">' + escapeHtml(entry.location || 'Local não informado') +
          (entry.code ? ' · ' + escapeHtml(entry.code) : '') + '</p>' +
        mapLink +
        statusFlag;

      card.addEventListener('click', function (ev) {
        if (ev.target.closest('.entry-map-link')) return;
        openModal(entry);
      });

      el.entryList.appendChild(card);
    });
  }

  /* ---------- Modal ---------- */

  function openModal(entry) {
    el.entryForm.reset();
    el.entryLat.value = '';
    el.entryLng.value = '';

    if (entry) {
      el.modalTitle.textContent = 'Editar registro';
      el.entryId.value = entry.id;
      el.entryType.value = entry.type;
      el.entryDate.value = entry.date || '';
      el.entryLocation.value = entry.location || '';
      el.entryCode.value = entry.code || '';
      el.entrySummary.value = entry.summary || '';
      el.entryDetails.value = entry.details || '';
      el.entryTags.value = (entry.tags || []).join(', ');
      el.entryStatus.value = entry.status || 'concluido';
      el.entryLat.value = entry.lat || '';
      el.entryLng.value = entry.lng || '';
      el.deleteEntryBtn.style.display = 'inline-block';
    } else {
      el.modalTitle.textContent = 'Novo registro';
      el.entryId.value = '';
      el.entryDate.value = new Date().toISOString().slice(0, 10);
      el.entryStatus.value = 'concluido';
      el.deleteEntryBtn.style.display = 'none';
    }

    el.modalBackdrop.classList.add('open');
    setTimeout(function () { el.entrySummary.focus(); }, 50);
  }

  function closeModal() {
    el.modalBackdrop.classList.remove('open');
  }

  function handleFormSubmit(ev) {
    ev.preventDefault();

    var id = el.entryId.value || uid();
    var existingIndex = state.entries.findIndex(function (e) { return e.id === id; });

    var entry = {
      id: id,
      type: el.entryType.value,
      date: el.entryDate.value,
      location: el.entryLocation.value.trim(),
      code: el.entryCode.value.trim(),
      summary: el.entrySummary.value.trim(),
      details: el.entryDetails.value.trim(),
      tags: el.entryTags.value.split(',').map(function (t) { return t.trim(); }).filter(Boolean),
      status: el.entryStatus.value,
      lat: el.entryLat.value || null,
      lng: el.entryLng.value || null,
      createdAt: existingIndex >= 0 ? state.entries[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      state.entries[existingIndex] = entry;
      toast('Registro atualizado.');
    } else {
      state.entries.push(entry);
      toast('Registro salvo.');
    }

    saveEntries();
    render();
    closeModal();
  }

  function handleDelete() {
    var id = el.entryId.value;
    if (!id) return;
    if (!confirm('Excluir este registro? Essa ação não pode ser desfeita.')) return;
    state.entries = state.entries.filter(function (e) { return e.id !== id; });
    saveEntries();
    render();
    closeModal();
    toast('Registro excluído.');
  }

  /* ---------- GPS ---------- */

  function handleGetLocation() {
    if (!('geolocation' in navigator)) {
      toast('Este dispositivo/navegador não oferece geolocalização.', true);
      return;
    }
    el.getLocationBtn.disabled = true;
    el.getLocationBtn.textContent = '…';
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        el.entryLat.value = pos.coords.latitude.toFixed(6);
        el.entryLng.value = pos.coords.longitude.toFixed(6);
        if (!el.entryLocation.value.trim()) {
          el.entryLocation.value = 'Local capturado por GPS (' + el.entryLat.value + ', ' + el.entryLng.value + ')';
        }
        toast('Localização capturada.');
        el.getLocationBtn.disabled = false;
        el.getLocationBtn.textContent = '📍';
      },
      function (err) {
        console.error(err);
        toast('Não foi possível obter a localização. Verifique a permissão de GPS.', true);
        el.getLocationBtn.disabled = false;
        el.getLocationBtn.textContent = '📍';
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  /* ---------- Exportação: JSON ---------- */

  function exportJson() {
    if (state.entries.length === 0) { toast('Não há registros para exportar.', true); return; }
    var blob = new Blob([JSON.stringify(state.entries, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'caderno-de-campo-backup.json');
    toast('Backup em JSON baixado.');
  }

  /* ---------- Exportação: CSV ---------- */

  function csvEscape(value) {
    var str = String(value == null ? '' : value);
    if (/[",\n;]/.test(str)) {
      str = '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function exportCsv() {
    if (state.entries.length === 0) { toast('Não há registros para exportar.', true); return; }
    var header = ['Data', 'Tipo', 'Local', 'Código do Caso', 'Resumo', 'Observações', 'Tags', 'Status', 'Latitude', 'Longitude'];
    var rows = state.entries
      .slice()
      .sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); })
      .map(function (e) {
        return [
          formatDateBR(e.date), TYPE_LABELS[e.type] || e.type, e.location, e.code,
          e.summary, e.details, (e.tags || []).join(' | '),
          STATUS_LABELS[e.status] || e.status, e.lat || '', e.lng || ''
        ].map(csvEscape).join(';');
      });
    var csv = '\uFEFF' + header.join(';') + '\n' + rows.join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, 'caderno-de-campo.csv');
    toast('Planilha CSV baixada.');
  }

  /* ---------- Relatório em HTML compartilhado por Word e PDF ---------- */

  function buildReportHtml() {
    var sorted = state.entries.slice().sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });
    var rows = sorted.map(function (e) {
      return (
        '<div style="margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid #ccc;">' +
        '<p style="margin:0 0 4px;font-size:11pt;color:#555;">' + formatDateBR(e.date) + ' · ' + escapeHtml(TYPE_LABELS[e.type] || e.type) + '</p>' +
        '<h3 style="margin:0 0 4px;font-size:14pt;">' + escapeHtml(e.summary) + '</h3>' +
        '<p style="margin:0 0 4px;font-size:11pt;"><b>Local:</b> ' + escapeHtml(e.location || '—') +
          (e.code ? ' &nbsp;|&nbsp; <b>Caso/Família:</b> ' + escapeHtml(e.code) : '') + '</p>' +
        (e.details ? '<p style="margin:0 0 4px;font-size:11pt;white-space:pre-wrap;">' + escapeHtml(e.details) + '</p>' : '') +
        (e.tags && e.tags.length ? '<p style="margin:0;font-size:10pt;color:#666;"><b>Tags:</b> ' + escapeHtml(e.tags.join(', ')) + '</p>' : '') +
        '<p style="margin:4px 0 0;font-size:10pt;color:#666;"><b>Status:</b> ' + escapeHtml(STATUS_LABELS[e.status] || e.status) + '</p>' +
        '</div>'
      );
    }).join('');

    return (
      '<div style="font-family:Calibri,Arial,sans-serif;color:#222;">' +
      '<h1 style="font-size:18pt;margin-bottom:2px;">Caderno de Campo</h1>' +
      '<p style="font-size:11pt;color:#555;margin-top:0;">Paulo Xavier · CRAS &amp; Centro de Convivência</p>' +
      '<p style="font-size:10pt;color:#777;">Relatório gerado em ' + new Date().toLocaleDateString('pt-BR') + '</p>' +
      '<hr style="margin:14px 0;border:none;border-top:1px solid #999;">' +
      (rows || '<p>Nenhum registro cadastrado.</p>') +
      '</div>'
    );
  }

  /* ---------- Exportação: Word (.docx real, não HTML disfarçado) ---------- */

  function exportWord() {
    if (state.entries.length === 0) { toast('Não há registros para exportar.', true); return; }

    if (typeof window.htmlDocx === 'undefined') {
      toast('O gerador de Word não carregou. Verifique sua conexão com a internet e tente de novo.', true);
      return;
    }

    try {
      var fullHtml =
        '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Caderno de Campo</title></head>' +
        '<body>' + buildReportHtml() + '</body></html>';

      var blob = window.htmlDocx.asBlob(fullHtml);
      downloadBlob(blob, 'caderno-de-campo.docx');
      toast('Documento Word baixado. Ele abre normalmente no Word do computador e do celular.');
    } catch (err) {
      console.error(err);
      toast('Não foi possível gerar o Word. Tente novamente.', true);
    }
  }

  /* ---------- Exportação: PDF ---------- */

  function exportPdf() {
    if (state.entries.length === 0) { toast('Não há registros para exportar.', true); return; }

    if (!window.jspdf || !window.jspdf.jsPDF) {
      toast('O gerador de PDF não carregou. Verifique sua conexão com a internet e tente de novo.', true);
      return;
    }

    try {
      var jsPDF = window.jspdf.jsPDF;
      var doc = new jsPDF({ unit: 'pt', format: 'a4' });
      var pageWidth = doc.internal.pageSize.getWidth();
      var pageHeight = doc.internal.pageSize.getHeight();
      var margin = 48;
      var maxWidth = pageWidth - margin * 2;
      var y = margin;

      function ensureSpace(lineHeight) {
        if (y + lineHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      }

      function writeLine(text, size, isBold, gapAfter) {
        doc.setFontSize(size);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        var lines = doc.splitTextToSize(text, maxWidth);
        lines.forEach(function (line) {
          ensureSpace(size * 1.15);
          doc.text(line, margin, y);
          y += size * 1.15;
        });
        y += gapAfter || 0;
      }

      writeLine('Caderno de Campo', 18, true, 2);
      writeLine('Paulo Xavier · CRAS & Centro de Convivência', 10, false, 2);
      writeLine('Relatório gerado em ' + new Date().toLocaleDateString('pt-BR'), 9, false, 10);
      doc.setDrawColor(180);
      doc.line(margin, y, pageWidth - margin, y);
      y += 16;

      var sorted = state.entries.slice().sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });

      if (sorted.length === 0) {
        writeLine('Nenhum registro cadastrado.', 11, false, 0);
      }

      sorted.forEach(function (e) {
        ensureSpace(40);
        writeLine(formatDateBR(e.date) + '  ·  ' + (TYPE_LABELS[e.type] || e.type), 9.5, false, 2);
        writeLine(e.summary || '(sem título)', 13, true, 2);
        writeLine('Local: ' + (e.location || '—') + (e.code ? '   |   Caso/Família: ' + e.code : ''), 10, false, 2);
        if (e.details) writeLine(e.details, 10, false, 2);
        if (e.tags && e.tags.length) writeLine('Tags: ' + e.tags.join(', '), 9, false, 2);
        writeLine('Status: ' + (STATUS_LABELS[e.status] || e.status), 9, false, 6);
        ensureSpace(10);
        doc.setDrawColor(220);
        doc.line(margin, y, pageWidth - margin, y);
        y += 14;
      });

      var blob = doc.output('blob');
      downloadBlob(blob, 'caderno-de-campo.pdf');
      toast('PDF baixado. No celular, ele fica salvo em Arquivos/Downloads.');
    } catch (err) {
      console.error(err);
      toast('Não foi possível gerar o PDF. Tente novamente.', true);
    }
  }

  /* ---------- Importar backup ---------- */

  function handleImportFile(ev) {
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error('Formato inválido');

        var replace = confirm(
          'Importar ' + data.length + ' registro(s).\n\n' +
          'OK = substituir todos os registros atuais\n' +
          'Cancelar = adicionar aos registros existentes'
        );

        if (replace) {
          state.entries = data;
        } else {
          var existingIds = new Set(state.entries.map(function (e) { return e.id; }));
          data.forEach(function (e) {
            if (!e.id || existingIds.has(e.id)) e.id = uid();
            state.entries.push(e);
          });
        }

        saveEntries();
        render();
        toast('Backup importado com sucesso.');
      } catch (err) {
        console.error(err);
        toast('Arquivo de backup inválido.', true);
      } finally {
        ev.target.value = '';
      }
    };
    reader.onerror = function () {
      toast('Não foi possível ler o arquivo selecionado.', true);
      ev.target.value = '';
    };
    reader.readAsText(file);
  }

  /* ---------- Filtros / busca (UI) ---------- */

  function handleTabClick(ev) {
    var btn = ev.target.closest('.tab');
    if (!btn) return;
    state.filter = btn.getAttribute('data-filter');
    Array.prototype.forEach.call(el.tabs.querySelectorAll('.tab'), function (t) {
      t.classList.toggle('active', t === btn);
    });
    render();
  }

  var searchDebounce = null;
  function handleSearchInput() {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(function () {
      state.search = el.searchInput.value.trim();
      render();
    }, 150);
  }

  /* ---------- Service worker ---------- */

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js').catch(function (err) {
          console.warn('Falha ao registrar o service worker:', err);
        });
      });
    }
  }

  /* ---------- Inicialização ---------- */

  function init() {
    loadEntries();
    render();

    el.tabs.addEventListener('click', handleTabClick);
    el.searchInput.addEventListener('input', handleSearchInput);

    el.newEntryBtn.addEventListener('click', function () { openModal(); });
    el.emptyNewEntryBtn.addEventListener('click', function () { openModal(); });
    el.closeModalBtn.addEventListener('click', closeModal);
    el.cancelModalBtn.addEventListener('click', closeModal);
    el.modalBackdrop.addEventListener('click', function (ev) {
      if (ev.target === el.modalBackdrop) closeModal();
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && el.modalBackdrop.classList.contains('open')) closeModal();
    });

    el.entryForm.addEventListener('submit', handleFormSubmit);
    el.deleteEntryBtn.addEventListener('click', handleDelete);
    el.getLocationBtn.addEventListener('click', handleGetLocation);

    el.exportJsonBtn.addEventListener('click', exportJson);
    el.exportCsvBtn.addEventListener('click', exportCsv);
    el.exportWordBtn.addEventListener('click', exportWord);
    el.exportPdfBtn.addEventListener('click', exportPdf);
    el.importFile.addEventListener('change', handleImportFile);

    registerServiceWorker();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
