// ==========================================
// ESTADO DA APLICAÇÃO E CHAVE LOCALSTORAGE
// ==========================================
const STORAGE_KEY = 'caderno_campo_registros_px';
let registros = carregarDados();
let filtroAtual = 'todos';
let termoBusca = '';

// Elements DOM
const entryList = document.getElementById('entryList');
const emptyState = document.getElementById('emptyState');
const entryForm = document.getElementById('entryForm');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalTitle = document.getElementById('modalTitle');
const searchInput = document.getElementById('searchInput');
const filterTabs = document.getElementById('filterTabs');

// Buttons
const newEntryBtn = document.getElementById('newEntryBtn');
const emptyNewEntryBtn = document.getElementById('emptyNewEntryBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const deleteEntryBtn = document.getElementById('deleteEntryBtn');

// Export / Import Buttons
const exportJsonBtn = document.getElementById('exportJsonBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const exportWordBtn = document.getElementById('exportWordBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const importFile = document.getElementById('importFile');

// ==========================================
// INICIALIZAÇÃO E EVENTOS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  renderizar();
  atualizarContadores();

  // Modal Events
  newEntryBtn.addEventListener('click', () => abrirModal());
  if (emptyNewEntryBtn) emptyNewEntryBtn.addEventListener('click', () => abrirModal());
  closeModalBtn.addEventListener('click', fecharModal);
  cancelModalBtn.addEventListener('click', fecharModal);
  entryForm.addEventListener('submit', salvarRegistro);
  deleteEntryBtn.addEventListener('click', deletarRegistro);

  // Search & Filter Events
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

  // Export / Import Events
  exportJsonBtn.addEventListener('click', exportarJSON);
  exportCsvBtn.addEventListener('click', exportarCSV);
  exportWordBtn.addEventListener('click', exportarWord);
  exportPdfBtn.addEventListener('click', exportarPDF);
  importFile.addEventListener('change', importarBackup);
});

// ==========================================
// PERSISTÊNCIA DE DADOS (LOCALSTORAGE)
// ==========================================
function carregarDados() {
  const dados = localStorage.getItem(STORAGE_KEY);
  return dados ? JSON.parse(dados) : [];
}

function salvarDados() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
  atualizarContadores();
}

// ==========================================
// RENDERIZAÇÃO DA INTERFACE
// ==========================================
function renderizar() {
  // Filtra os registros com base no tipo selecionado e no termo de busca
  const registrosFiltrados = registros.filter(reg => {
    const atendeFiltro = 
      filtroAtual === 'todos' || 
      (filtroAtual === 'pendente' && reg.entryStatus === 'acompanhamento') ||
      reg.entryType === filtroAtual;

    const textoBusca = `
      ${reg.entryLocation} 
      ${reg.entryCode} 
      ${reg.entrySummary} 
      ${reg.entryDetails} 
      ${reg.entryTags}
    `.toLowerCase();

    const atendeBusca = textoBusca.includes(termoBusca);

    return atendeFiltro && atendeBusca;
  });

  // Ordena por data decrescente (mais recentes primeiro)
  registrosFiltrados.sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));

  if (registrosFiltrados.length === 0) {
    entryList.style.display = 'none';
    emptyState.style.display = 'flex';
  } else {
    emptyState.style.display = 'none';
    entryList.style.display = 'grid';
    
    entryList.innerHTML = registrosFiltrados.map(reg => `
      <div class="entry-card" onclick="abrirModal('${reg.id}')" style="cursor: pointer; border-left: 5px solid ${getCorPorTipo(reg.entryType)};">
        <div class="entry-card-header">
          <span class="badge badge-${reg.entryType}">${traduzirTipo(reg.entryType)}</span>
          <span class="entry-card-date">${formatarData(reg.entryDate)}</span>
        </div>
        <h3 class="entry-card-title">${reg.entrySummary}</h3>
        <p class="entry-card-meta">
          <strong>Local:</strong> ${reg.entryLocation || 'Não especificado'} | 
          <strong>Caso/Sujeito:</strong> ${reg.entryCode || 'N/A'}
        </p>
        <div class="entry-card-preview">${recortarTexto(reg.entryDetails, 140)}</div>
        ${reg.entryTags ? `
          <div class="entry-card-tags">
            ${reg.entryTags.split(',').map(tag => `<span class="tag">#${tag.trim()}</span>`).join('')}
          </div>
        ` : ''}
        <div class="entry-card-status status-${reg.entryStatus}">
          ${traduzirStatus(reg.entryStatus)}
        </div>
      </div>
    `).join('');
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

// ==========================================
// OPERAÇÕES DO MODAL (CREATE / UPDATE / DELETE)
// ==========================================
function abrirModal(id = null) {
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

function fecharModal() {
  modalBackdrop.style.display = 'none';
  entryForm.reset();
}

function salvarRegistro(e) {
  e.preventDefault();

  const id = document.getElementById('entryId').value;
  const novoRegistro = {
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
    if (index !== -1) registros[index] = novoRegistro;
  } else {
    registros.push(novoRegistro);
  }

  salvarDados();
  fecharModal();
  renderizar();
}

function deletarRegistro() {
  const id = document.getElementById('entryId').value;
  if (!id) return;

  if (confirm("Tem certeza de que deseja excluir permanentemente este registro do diário?")) {
    registros = registros.filter(r => r.id !== id);
    salvarDados();
    fecharModal();
    renderizar();
  }
}

// ==========================================
// MÓDULOS DE EXPORTAÇÃO E IMPORTAÇÃO
// ==========================================

// 1. Exportação nativa JSON
function exportarJSON() {
  if (registros.length === 0) return alert("Nenhum registro para exportar.");
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(registros, null, 2));
  fazerDownload(dataStr, `caderno_campo_backup_${obterDataISO()}.json`);
}

// 2. Exportação nativa CSV
function exportarCSV() {
  if (registros.length === 0) return alert("Nenhum registro para exportar.");
  
  const colunas = ["Tipo", "Data", "Local", "Caso_Codigo", "Resumo", "Detalhes", "Tags", "Status"];
  const linhas = registros.map(r => [
    r.entryType,
    r.entryDate,
    `"${(r.entryLocation || '').replace(/"/g, '""')}"`,
    `"${(r.entryCode || '').replace(/"/g, '""')}"`,
    `"${r.entrySummary.replace(/"/g, '""')}"`,
    `"${(r.entryDetails || '').replace(/"/g, '""')}"`,
    `"${(r.entryTags || '').replace(/"/g, '""')}"`,
    r.entryStatus
  ]);

  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
    + [colunas.join(","), ...linhas.map(e => e.join(","))].join("\n");
  
  fazerDownload(csvContent, `caderno_campo_relatorio_${obterDataISO()}.csv`);
}

// 3. EXPORTAR PARA WORD (.doc compatível com MS Word)
function exportarWord() {
  if (registros.length === 0) return alert("Nenhum registro para exportar.");

  let htmlDoc = `
  <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset="utf-8">
    <title>Caderno de Campo - Paulo Xavier</title>
    <style>
      body { font-family: 'Arial', sans-serif; color: #2d3748; line-height: 1.6; }
      h1 { color: #1a365d; font-size: 24pt; border-bottom: 2px solid #2b6cb0; padding-bottom: 8px; margin-bottom: 20px; }
      .meta-global { margin-bottom: 30px; font-size: 11pt; color: #4a5568; }
      .registro { margin-bottom: 40px; page-break-inside: avoid; border: 1px solid #e2e8f0; padding: 20px; background-color: #f7fafc; border-radius: 6px; }
      .reg-header { background-color: #edf2f7; padding: 10px; margin-bottom: 15px; border-radius: 4px; }
      .reg-meta { font-size: 10pt; color: #4a5568; margin-bottom: 5px; text-transform: uppercase; }
      .reg-titulo { font-size: 14pt; font-weight: bold; color: #2d3748; margin: 0; }
      .reg-detalhes { font-size: 11pt; line-height: 1.6; margin-top: 15px; color: #2d3748; }
      .reg-tags { font-size: 10pt; color: #319795; margin-top: 15px; font-style: italic; }
    </style>
  </head>
  <body>
    <h1>CADERNO DE CAMPO</h1>
    <div class="meta-global">
      <strong>Psicólogo Responsável:</strong> Paulo Xavier<br>
      <strong>Data de Emissão do Relatório:</strong> ${new Date().toLocaleDateString('pt-BR')}
    </div>
    <hr style="border: 1px solid #e2e8f0;" />
  `;

  // Ordena os registros chronologicamente para o documento do Word
  const ordenados = [...registros].sort((a,b) => new Date(a.entryDate) - new Date(b.entryDate));

  ordenados.forEach(reg => {
    htmlDoc += `
      <div class="registro">
        <div class="reg-header">
          <div class="reg-meta">
            <strong>Tipo:</strong> ${traduzirTipo(reg.entryType)} | 
            <strong>Data:</strong> ${formatarData(reg.entryDate)} | 
            <strong>Local:</strong> ${reg.entryLocation || 'Não especificado'} | 
            <strong>Caso:</strong> ${reg.entryCode || 'N/A'}
          </div>
          <div class="reg-titulo">${reg.entrySummary}</div>
        </div>
        <div class="reg-detalhes">
          <strong>Observações e Registros de Campo:</strong><br/>
          ${(reg.entryDetails || 'Sem observações detalhadas registradas.').replace(/\n/g, '<br/>')}
        </div>
        ${reg.entryTags ? `<div class="reg-tags"><strong>Tags de busca:</strong> ${reg.entryTags}</div>` : ''}
      </div>
    `;
  });

  htmlDoc += `</body></html>`;

  const blob = new Blob(['\ufeff' + htmlDoc], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `Caderno_de_Campo_Paulo_Xavier_${obterDataISO()}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 4. EXPORTAR PARA PDF (Utiliza a biblioteca externa html2pdf já mapeada)
function exportarPDF() {
  if (registros.length === 0) return alert("Nenhum registro para exportar.");

  // Elemento gerador virtual temporário
  const pdfContainer = document.createElement('div');
  pdfContainer.style.padding = '30px';
  pdfContainer.style.fontFamily = 'Helvetica, Arial, sans-serif';
  pdfContainer.style.color = '#2d3748';

  let htmlPDF = `
    <div style="border-bottom: 3px solid #2b6cb0; padding-bottom: 12px; margin-bottom: 25px;">
      <h1 style="color: #1a365d; margin: 0; font-size: 24px; font-weight: bold;">Caderno de Campo</h1>
      <p style="margin: 6px 0 0 0; color: #4a5568; font-size: 13px; line-height: 1.4;">
        <strong>Psicólogo:</strong> Paulo Xavier &middot; Registro Profissional<br>
        <strong>Gerado em:</strong> ${new Date().toLocaleDateString('pt-BR')} &middot; Documento Sigiloso
      </p>
    </div>
  `;

  // Ordena os registros
  const ordenados = [...registros].sort((a,b) => new Date(a.entryDate) - new Date(b.entryDate));

  ordenados.forEach(reg => {
    htmlPDF += `
    <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 18px; margin-bottom: 25px; page-break-inside: avoid; background-color: #f7fafc;">
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; font-size: 10px; color: #718096; text-transform: uppercase;">
        <span><strong>TIPO:</strong> ${traduzirTipo(reg.entryType)}</span>
        <span><strong>DATA:</strong> ${formatarData(reg.entryDate)}</span>
        <span><strong>LOCAL:</strong> ${reg.entryLocation || 'N/A'}</span>
        <span><strong>CÓDIGO:</strong> ${reg.entryCode || 'N/A'}</span>
      </div>
      <h3 style="margin: 0 0 10px 0; color: #1a365d; font-size: 15px; font-weight: bold;">${reg.entrySummary}</h3>
      <div style="font-size: 12px; line-height: 1.6; color: #2d3748; white-space: pre-wrap; margin-top: 10px;">
        <strong>Relato de Atividade:</strong><br>
        ${reg.entryDetails || 'Sem observações adicionais cadastrados.'}
      </div>
      ${reg.entryTags ? `
        <div style="margin-top: 12px; font-size: 10px; color: #319795; border-top: 1px dashed #e2e8f0; padding-top: 6px;">
          <strong>Tags:</strong> ${reg.entryTags.split(',').map(tag => `#${tag.trim()}`).join(' ')}
        </div>
      ` : ''}
    </div>
    `;
  });

  pdfContainer.innerHTML = htmlPDF;
  document.body.appendChild(pdfContainer);

  const configuracoes = {
    margin:       12,
    filename:     `Caderno_de_Campo_Paulo_Xavier_${obterDataISO()}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(configuracoes).from(pdfContainer).save().then(() => {
    document.body.removeChild(pdfContainer);
  });
}

// 5. Importação de Backup JSON
function importarBackup(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const importados = JSON.parse(evt.target.result);
      if (Array.isArray(importados)) {
        if (confirm(`Deseja mesclar estes ${importados.length} registros com os seus atuais? (Registros duplicados por ID serão substituídos)`)) {
          const mapaAtual = new Map(registros.map(r => [r.id, r]));
          importados.forEach(reg => mapaAtual.set(reg.id, reg));
          registros = Array.from(mapaAtual.values());
          salvarDados();
          renderizar();
          alert("Backup importado com sucesso!");
        }
      } else {
        alert("Erro: O formato do arquivo JSON importado não é válido.");
      }
    } catch (err) {
      alert("Ocorreu um erro ao processar o arquivo de backup: " + err.message);
    }
  };
  reader.readAsText(file);
}

// ==========================================
// FUNÇÕES AUXILIARES / FORMATADORES
// ==========================================
function fazerDownload(href, filename) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function obterDataISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatarData(dataStr) {
  if (!dataStr) return '';
  const partes = dataStr.split('-');
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function traduzirTipo(tipo) {
  const tipos = {
    visita: 'Visita',
    pesquisa: 'Pesquisa',
    atividade: 'Atividade Técnica'
  };
  return tipos[tipo] || tipo;
}

function traduzirStatus(status) {
  const statusLabels = {
    concluido: 'Concluído',
    acompanhamento: 'Acompanhamento pendente',
    planejado: 'Planejado'
  };
  return statusLabels[status] || status;
}

function getCorPorTipo(tipo) {
  const cores = {
    visita: '#3182ce',    // Azul
    pesquisa: '#319795',  // Teal/Verde água
    atividade: '#805ad5' // Roxo
  };
  return cores[tipo] || '#718096';
}

function recortarTexto(texto, limite) {
  if (!texto) return '';
  if (texto.length <= limite) return texto;
  return texto.slice(0, limite) + '...';
}
