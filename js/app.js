const STORAGE_KEY = 'caderno_campo_registros_px';
let registros = carregarDados();
let filtroAtual = 'todos';
let termoBusca = '';

// Mapeamento do DOM
const entryList = document.getElementById('entryList');
const emptyState = document.getElementById('emptyState');
const entryForm = document.getElementById('entryForm');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalTitle = document.getElementById('modalTitle');
const searchInput = document.getElementById('searchInput');
const filterTabs = document.getElementById('filterTabs');

const newEntryBtn = document.getElementById('newEntryBtn');
const emptyNewEntryBtn = document.getElementById('emptyNewEntryBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const deleteEntryBtn = document.getElementById('deleteEntryBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const exportWordBtn = document.getElementById('exportWordBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const importFile = document.getElementById('importFile');

document.addEventListener('DOMContentLoaded', () => {
  renderizar();
  atualizarContadores();
  registrarServiceWorker();

  newEntryBtn.addEventListener('click', () => abrirModal());
  if (emptyNewEntryBtn) emptyNewEntryBtn.addEventListener('click', () => abrirModal());
  closeModalBtn.addEventListener('click', fecharModal);
  cancelModalBtn.addEventListener('click', fecharModal);
  entryForm.addEventListener('submit', salvarRegistro);
  deleteEntryBtn.addEventListener('click', deletarRegistro);

  searchInput.addEventListener('input', (e) => {
    termoBusca = e.target.value.toLowerCase();
    renderizar();
  });

  filterTabs.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.querySelector('.tab.active').classList.remove('active');
      tab.classList.add('active');
      filtroAtual = tab.dataset.filter;
      renderizar();
    });
  });

  exportJsonBtn.addEventListener('click', exportarJSON);
  exportCsvBtn.addEventListener('click', exportarCSV);
  exportWordBtn.addEventListener('click', exportarWord);
  exportPdfBtn.addEventListener('click', exportarPDF);
  importFile.addEventListener('change', importarBackup);
});

function carregarDados() {
  const dados = localStorage.getItem(STORAGE_KEY);
  return dados ? JSON.parse(dados) : [];
}

function salvarDados() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
  atualizarContadores();
}

function renderizar() {
  const filtrados = registros.filter(reg => {
    const atendeFiltro = filtroAtual === 'todos' || (filtroAtual === 'pendente' && reg.entryStatus === 'acompanhamento') || reg.entryType === filtroAtual;
    const texto = `${reg.entryLocation} ${reg.entryCode} ${reg.entrySummary} ${reg.entryDetails} ${reg.entryTags}`.toLowerCase();
    return atendeFiltro && texto.includes(termoBusca);
  });

  filtrados.sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));

  if (filtrados.length === 0) {
    if (entryList) entryList.style.display = 'none';
    if (emptyState) emptyState.style.display = 'flex';
  } else {
    if (emptyState) emptyState.style.display = 'none';
    if (entryList) {
      entryList.style.display = 'grid';
      entryList.innerHTML = filtrados.map(reg => `
        <div class="entry-card" onclick="abrirModal('${reg.id}')" style="border-left: 5px solid ${getCorPorTipo(reg.entryType)};">
          <div class="entry-card-header">
            <span class="badge badge-${reg.entryType}">${traduzirTipo(reg.entryType)}</span>
            <span class="entry-card-date">${formatarData(reg.entryDate)}</span>
          </div>
          <h3 class="entry-card-title">${reg.entrySummary}</h3>
          <p class="entry-card-meta"><strong>Local:</strong> ${reg.entryLocation || 'N/A'} | <strong>Caso:</strong> ${reg.entryCode || 'N/A'}</p>
          <div class="entry-card-preview">${recortarTexto(reg.entryDetails, 140)}</div>
          ${reg.entryTags ? `<div class="entry-card-tags">${reg.entryTags.split(',').map(t => `<span class="tag">#${t.trim()}</span>`).join('')}</div>` : ''}
          <div class="entry-card-status status-${reg.entryStatus}">${traduzirStatus(reg.entryStatus)}</div>
        </div>
      `).join('');
    }
  }
}

function atualizarContadores() {
  const contadores = {
    todos: registros.length,
    visita: registros.filter(r => r.entryType === 'visita').length,
    pesquisa: registros.filter(r => r.entryType === 'pesquisa').length,
    atividade: registros.filter(r => r.entryType === 'atividade').length,
    pendente: registros.filter(r => r.entryStatus === 'acompanhamento').length
  };
  for (const [key, val] of Object.entries(contadores)) {
    const el = document.getElementById(`count-${key}`);
    if (el) el.textContent = val;
  }
}

function abrirModal(id = null) {
  if (!modalBackdrop) return;
  modalBackdrop.style.display = 'flex';
  if (id) {
    const reg = registros.find(r => r.id === id);
    if (!reg) return;
    modalTitle.textContent = "Editar registro";
    document.getElementById('entryId').value = reg.id;
    document.getElementById('entryType').value = reg.entryType;
    document.getElementById('entryDate').value = reg.entryDate;
    document.getElementById('entryLocation').value = reg.entryLocation;
    document.getElementById('entryCode').value = reg.entryCode;
    document.getElementById('entrySummary').value = reg.entrySummary;
    document.getElementById('entryDetails').value = reg.entryDetails;
    document.getElementById('entryTags').value = reg.entryTags;
    document.getElementById('entryStatus').value = reg.entryStatus;
    deleteEntryBtn.style.display = 'inline-block';
  } else {
    modalTitle.textContent = "Novo registro";
    entryForm.reset();
    document.getElementById('entryId').value = '';
    document.getElementById('entryDate').value = new Date().toISOString().split('T')[0];
    deleteEntryBtn.style.display = 'none';
  }
}

function fecharModal() { if (modalBackdrop) modalBackdrop.style.display = 'none'; if (entryForm) entryForm.reset(); }

function salvarRegistro(e) {
  e.preventDefault();
  const id = document.getElementById('entryId').value;
  const novo = {
    id: id || 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    entryType: document.getElementById('entryType').value,
    entryDate: document.getElementById('entryDate').value,
    entryLocation: document.getElementById('entryLocation').value,
    entryCode: document.getElementById('entryCode').value,
    entrySummary: document.getElementById('entrySummary').value,
    entryDetails: document.getElementById('entryDetails').value,
    entryTags: document.getElementById('entryTags').value,
    entryStatus: document.getElementById('entryStatus').value
  };

  if (id) {
    const index = registros.findIndex(r => r.id === id);
    if (index !== -1) registros[index] = novo;
  } else {
    registros.push(novo);
  }
  salvarDados(); fecharModal(); renderizar();
}

function deletarRegistro() {
  const id = document.getElementById('entryId').value;
  if (id && confirm("Remover permanentemente este registro?")) {
    registros = registros.filter(r => r.id !== id);
    salvarDados(); fecharModal(); renderizar();
  }
}

// 1. JSON (Backup)
function exportarJSON() {
  if (registros.length === 0) return alert("Nenhum registro.");
  fazerDownload("data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(registros, null, 2)), `backup_${obterDataISO()}.json`);
}

// 2. CSV (Excel)
function exportarCSV() {
  if (registros.length === 0) return alert("Nenhum registro.");
  const colunas = ["Tipo", "Data", "Local", "Caso", "Resumo", "Detalhes", "Tags", "Status"];
  const linhas = registros.map(r => [
    r.entryType, r.entryDate, 
    `"${(r.entryLocation||'').replace(/"/g, '""')}"`, 
    `"${(r.entryCode||'').replace(/"/g, '""')}"`, 
    `"${r.entrySummary.replace(/"/g, '""')}"`, 
    `"${(r.entryDetails||'').replace(/"/g, '""')}"`, 
    `"${(r.entryTags||'').replace(/"/g, '""')}"`, 
    r.entryStatus
  ]);
  fazerDownload("data:text/csv;charset=utf-8,\uFEFF" + [colunas.join(","), ...linhas.map(e => e.join(","))].join("\n"), `relatorio_${obterDataISO()}.csv`);
}

// 3. EXPORTAÇÃO COMPATÍVEL COM TELEMÓVEIS (WORD)
function exportarWord() {
  if (registros.length === 0) return alert("Nenhum registro para exportar.");
  
  let conteudoHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset="utf-8">
    <title>Caderno de Campo</title>
    <style>
      body { font-family: 'Arial', sans-serif; padding: 20px; color: #232733; line-height: 1.6; }
      h1 { color: #0f172a; border-bottom: 2px solid #6366f1; padding-bottom: 6px; font-size: 22pt; }
      .item { margin-bottom: 25px; border: 1px solid #cbd5e1; padding: 15px; background: #f8fafc; }
      .meta { font-size: 10pt; color: #64748b; margin-bottom: 8px; font-weight: bold; }
      .details { font-size: 11pt; color: #334155; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <h1>Caderno de Campo</h1>
    <p><strong>Psicólogo:</strong> Paulo Xavier &middot; Relatório Consolidado</p>
    <p>Data de emissão: ${new Date().toLocaleDateString('pt-BR')}</p>
    <hr/>`;

  [...registros].sort((a,b)=>new Date(a.entryDate)-new Date(b.entryDate)).forEach(r => {
    conteudoHtml += `
      <div class="item">
        <div class="meta">${traduzirTipo(r.entryType).toUpperCase()} &middot; ${formatarData(r.entryDate)} &middot; Local: ${r.entryLocation||'N/A'} &middot; Caso: ${r.entryCode||'N/A'}</div>
        <h3 style="margin-top:0; font-size:14pt; color:#1e293b;">${r.entrySummary}</h3>
        <div class="details">${(r.entryDetails||'').replace(/\n/g, '<br/>')}</div>
        ${r.entryTags ? `<p style="color:#0ea5e9; font-size:10pt; margin-top:8px;">Tags: ${r.entryTags}</p>` : ''}
      </div>`;
  });
  
  conteudoHtml += `</body></html>`;
  
  // Criação do Blob binário explícito
  const blob = new Blob(['\ufeff' + conteudoHtml], { type: 'application/msword' });
  const urlDeDownload = URL.createObjectURL(blob);
  
  // Injeção física do elemento âncora no DOM para aceitação dos sistemas operacionais móveis
  const linkTemporario = document.createElement('a');
  linkTemporario.href = urlDeDownload;
  linkTemporario.download = `Caderno_Campo_${obterDataISO()}.doc`;
  linkTemporario.style.display = 'none';
  
  document.body.appendChild(linkTemporario);
  linkTemporario.click();
  
  // Liberação assíncrona da memória
  setTimeout(() => {
    document.body.removeChild(linkTemporario);
    URL.revokeObjectURL(urlDeDownload);
  }, 500);
}

// 4. IMPRESSÃO WEB NATIVA CONTRA PÁGINAS EM BRANCO NO TELEMÓVEL (PDF)
function exportarPDF() {
  if (registros.length === 0) return alert("Nenhum registro para exportar.");

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  
  let htmlContudo = `
    <html>
    <head>
      <title>Caderno de Campo - Paulo Xavier</title>
      <style>
        body { font-family: Arial, sans-serif; color: #1e293b; padding: 20px; background: #fff; line-height: 1.5; }
        .header { border-bottom: 3px solid #6366f1; padding-bottom: 10px; margin-bottom: 25px; }
        .title { color: #0f172a; margin: 0; font-size: 24px; font-family: Georgia, serif; }
        .subtitle { margin: 5px 0 0 0; color: #64748b; font-size: 13px; }
        .card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid; background: #f8fafc; }
        .card-meta { font-size: 11px; color: #6366f1; font-weight: bold; text-transform: uppercase; margin-bottom: 6px; }
        .card-title { margin: 0 0 8px 0; color: #0f172a; font-family: Georgia, serif; font-size: 16px; }
        .card-text { font-size: 13px; color: #334155; white-space: pre-wrap; }
        @media print {
          body { padding: 0; }
          .card { background: #ffffff !important; border: 1px solid #cbd5e1 !important; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="title">Caderno de Campo</h1>
        <p class="subtitle"><strong>Psicólogo:</strong> Paulo Xavier &middot; Relatório Técnico Restrito</p>
        <p class="subtitle">Gerado em: ${new Date().toLocaleDateString('pt-BR')}</p>
      </div>
  `;

  [...registros].sort((a,b)=>new Date(a.entryDate)-new Date(b.entryDate)).forEach(reg => {
    htmlContudo += `
      <div class="card">
        <div class="card-meta">${traduzirTipo(reg.entryType)} &middot; ${formatarData(reg.entryDate)} &middot; Local: ${reg.entryLocation || 'N/A'}</div>
        <h3 class="card-title">${reg.entrySummary}</h3>
        <p class="card-text">${reg.entryDetails||''}</p>
      </div>
    `;
  });

  htmlContudo += `</body></html>`;
  
  doc.open();
  doc.write(htmlContudo);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }, 250);
}

function importarBackup(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const arr = JSON.parse(evt.target.result);
      if (Array.isArray(arr) && confirm("Mesclar registros do backup?")) {
        const mapa = new Map(registros.map(r => [r.id, r]));
        arr.forEach(r => mapa.set(r.id, r)); registros = Array.from(mapa.values());
        salvarDados(); renderizar();
      }
    } catch(err) { alert("Arquivo inválido."); }
  };
  reader.readAsText(file);
}

function registrarServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('PWA Ativo.'))
      .catch((err) => console.log('Erro PWA:', err));
  }
}

function fazerDownload(href, filename) {
  const a = document.createElement('a'); a.href = href; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function obterDataISO() { return new Date().toISOString().slice(0, 10); }
function formatarData(d) { if(!d)return''; const p=d.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; }
function traduzirTipo(t) { return {visita:'Visita', pesquisa:'Pesquisa', atividade:'Atividade Técnica'}[t] || t; }
function traduzirStatus(s) { return {concluido:'Concluído', acompanhamento:'Acompanhamento', planejado:'Planejado'}[s] || s; }
function getCorPorTipo(t) { return {visita:'#38bdf8', pesquisa:'#34d399', atividade:'#fbbf24'}[t] || '#64748b'; }
function recortarTexto(t, l) { if(!t)return''; return t.length<=l?t:t.slice(0,l)+'...'; }
