const STORAGE_KEY = 'caderno_campo_registros_px';
let registros = carregarDados();
let filtroAtual = 'todos';
let termoBusca = '';

// Elementos da Interface
const entryList = document.getElementById('entryList');
const emptyState = document.getElementById('emptyState');
const entryForm = document.getElementById('entryForm');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalTitle = document.getElementById('modalTitle');
const searchInput = document.getElementById('searchInput');
const filterTabs = document.getElementById('filterTabs');

// Botões e Ações
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

// Inicialização de Eventos
document.addEventListener('DOMContentLoaded', () => {
  renderizar();
  atualizarContadores();

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

// Funções de Persistência de Dados
function carregarDados() {
  const dados = localStorage.getItem(STORAGE_KEY);
  return dados ? JSON.parse(dados) : [];
}

function salvarDados() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
  atualizarContadores();
}

// Renderização Dinâmica dos Cards
function renderizar() {
  const filtrados = registros.filter(reg => {
    const atendeFiltro = filtroAtual === 'todos' || (filtroAtual === 'pendente' && reg.entryStatus === 'acompanhamento') || reg.entryType === filtroAtual;
    const texto = `${reg.entryLocation} ${reg.entryCode} ${reg.entrySummary} ${reg.entryDetails} ${reg.entryTags}`.toLowerCase();
    return atendeFiltro && texto.includes(termoBusca);
  });

  // Ordenação decrescente (mais recentes primeiro na tela do app)
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

// Atualização de Contadores da Barra Lateral
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

// Controle do Modal (Formulário)
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

function fecharModal() { 
  if (modalBackdrop) modalBackdrop.style.display = 'none'; 
  if (entryForm) entryForm.reset(); 
}

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
  if (id && confirm("Deseja excluir permanentemente este registro?")) {
    registros = registros.filter(r => r.id !== id);
    salvarDados(); fecharModal(); renderizar();
  }
}

// Mecanismos de Exportação e Importação
function exportarJSON() {
  if (registros.length === 0) return alert("Nenhum registro para exportar.");
  fazerDownload("data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(registros, null, 2)), `backup_${obterDataISO()}.json`);
}

function exportarCSV() {
  if (registros.length === 0) return alert("Nenhum registro para exportar.");
  const colunas = ["Tipo", "Data", "Local", "Caso", "Resumo", "Detalhes", "Tags", "Status"];
  const linhas = registros.map(r => [
    r.entryType, 
    r.entryDate, 
    `"${(r.entryLocation||'').replace(/"/g, '""')}"`, 
    `"${(r.entryCode||'').replace(/"/g, '""')}"`, 
    `"${r.entrySummary.replace(/"/g, '""')}"`, 
    `"${(r.entryDetails||'').replace(/"/g, '""')}"`, 
    `"${(r.entryTags||'').replace(/"/g, '""')}"`, 
    r.entryStatus
  ]);
  fazerDownload("data:text/csv;charset=utf-8,\uFEFF" + [colunas.join(","), ...linhas.map(e => e.join(","))].join("\n"), `relatorio_${obterDataISO()}.csv`);
}

function exportarWord() {
  if (registros.length === 0) return alert("Nenhum registro para exportar.");
  let htmlDoc = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#2d3748;line-height:1.6;}h1{color:#1a365d;font-size:24pt;border-bottom:2px solid #2b6cb0;padding-bottom:8px;}.registro{margin-bottom:30px;page-break-inside:avoid;border:1px solid #e2e8f0;padding:20px;background-color:#f7fafc;border-radius:6px;}.reg-header{background-color:#edf2f7;padding:10px;margin-bottom:15px;}.reg-meta{font-size:10pt;color:#4a5568;}.reg-titulo{font-size:14pt;font-weight:bold;}</style></head><body><h1>CADERNO DE CAMPO</h1><p><strong>Psicólogo:</strong> Paulo Xavier</p><p>Emitido em: ${new Date().toLocaleDateString('pt-BR')}</p><hr/>`;
  
  [...registros].sort((a,b) => new Date(a.entryDate) - new Date(b.entryDate)).forEach(reg => {
    htmlDoc += `<div class="registro"><div class="reg-header"><div class="reg-meta"><strong>${traduzirTipo(reg.entryType)}</strong> | ${formatarData(reg.entryDate)} | Local: ${reg.entryLocation||'N/A'} | Caso: ${reg.entryCode||'N/A'}</div><div class="reg-titulo">${reg.entrySummary}</div></div><div class="reg-detalhes"><strong>Relato de Campo:</strong><br/>${(reg.entryDetails||'').replace(/\n/g, '<br/>')}</div>${reg.entryTags?`<div style="color:#319795;margin-top:10px;">Tags: ${reg.entryTags}</div>`:''}</div>`;
  });
  htmlDoc += `</body></html>`;
  fazerDownload(URL.createObjectURL(new Blob(['\ufeff' + htmlDoc], {type:'application/msword'})), `Caderno_Campo_Paulo_Xavier_${obterDataISO()}.doc`, true);
}

// 📌 ROTEIRO DE EXPORTAÇÃO CORRIGIDO: PREVINE PÁGINA EM BRANCO
function exportarPDF() {
  if (registros.length === 0) return alert("Nenhum registro para exportar.");
  
  // Criamos o container fora da viewport visível mas com propriedades de rendering físicas ativas
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '800px'; 
  container.style.zIndex = '-9999';
  container.style.opacity = '0.01'; 
  container.style.pointerEvents = 'none';
  
  let html = `
    <div style="font-family: Arial, sans-serif; color: #1e293b; background: #ffffff; padding: 40px; box-sizing: border-box;">
      <div style="border-bottom: 3px solid #6366f1; padding-bottom: 12px; margin-bottom: 30px;">
        <h1 style="color: #0f172a; margin: 0; font-size: 26px; font-family: Georgia, serif;">Caderno de Campo</h1>
        <p style="margin: 6px 0 0 0; color: #64748b; font-size: 14px;"><strong>Psicólogo:</strong> Paulo Xavier &middot; Relatório Técnico Restrito</p>
        <p style="margin: 2px 0 0 0; color: #94a3b8; font-size: 12px;">Gerado em: ${new Date().toLocaleDateString('pt-BR')}</p>
      </div>
  `;
  
  // Ordena cronologicamente para a montagem coerente do relatório físico
  [...registros].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate)).forEach(reg => {
    html += `
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 24px; page-break-inside: avoid; background-color: #f8fafc;">
        <div style="font-size: 11px; color: #6366f1; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
          ${traduzirTipo(reg.entryType)} &middot; ${formatarData(reg.entryDate)} &middot; Local: ${reg.entryLocation || 'N/A'} &middot; Caso: ${reg.entryCode || 'N/A'}
        </div>
        <h3 style="margin: 0 0 14px 0; color: #0f172a; font-size: 18px; font-family: Georgia, serif;">${reg.entrySummary}</h3>
        <div style="font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap;">${reg.entryDetails || ''}</div>
        ${reg.entryTags ? `<div style="margin-top: 14px; font-size: 12px; color: #0ea5e9;"><strong>Tags:</strong> ${reg.entryTags.split(',').map(t => '#' + t.trim()).join(' ')}</div>` : ''}
        <div style="margin-top: 14px; font-size: 12px; color: #64748b; font-style: italic; border-top: 1px dashed #e2e8f0; padding-top: 10px;">Status: ${traduzirStatus(reg.entryStatus)}</div>
      </div>
    `;
  });
  
  html += `</div>`;
  container.innerHTML = html;
  document.body.appendChild(container);

  const opcoes = {
    margin: 15,
    filename: `Caderno_Campo_Paulo_Xavier_${obterDataISO()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      useCORS: true, 
      logging: false, 
      letterRendering: true,
      width: 800, 
      windowWidth: 800 
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  // Pequeno timeout assíncrono para validação estrutural do DOM antes de invocar a biblioteca externa
  setTimeout(() => {
    html2pdf()
      .set(opcoes)
      .from(container)
      .save()
      .then(() => document.body.removeChild(container))
      .catch((erro) => {
        console.error("Erro ao gerar PDF:", erro);
        document.body.removeChild(container);
      });
  }, 120);
}

function importarBackup(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const arr = JSON.parse(evt.target.result);
      if (Array.isArray(arr) && confirm("Deseja mesclar os registros deste backup na sua sessão local atual?")) {
        const mapa = new Map(registros.map(r => [r.id, r]));
        arr.forEach(r => mapa.set(r.id, r));
        registros = Array.from(mapa.values());
        salvarDados(); renderizar();
      }
    } catch(err) { alert("Arquivo inválido. Certifique-se de escolher um arquivo .json gerado pelo app."); }
  };
  reader.readAsText(file);
}

// Utilitários de Formatação de Texto e Download
function fazerDownload(href, filename, isBlob = false) {
  const a = document.createElement('a'); a.href = href; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  if (isBlob) URL.revokeObjectURL(href);
}

function obterDataISO() { return new Date().toISOString().slice(0, 10); }
function formatarData(d) { if(!d) return ''; const p=d.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; }
function traduzirTipo(t) { return {visita:'Visita', pesquisa:'Pesquisa', atividade:'Atividade Técnica'}[t] || t; }
function traduzirStatus(s) { return {concluido:'Concluído', acompanhamento:'Acompanhamento pendente', planejado:'Planejado'}[s] || s; }
function getCorPorTipo(t) { return {visita:'#38bdf8', pesquisa:'#34d399', atividade:'#fbbf24'}[t] || '#64748b'; }
function recortarTexto(t, l) { if(!t) return ''; return t.length <= l ? t : t.slice(0, l) + '...'; }
