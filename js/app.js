const STORAGE_KEY = 'caderno_campo_registros_px';
let registros = carregarDados();
let filtroAtual = 'todos';
let termoBusca = '';

// Variáveis de controlo do Caderno de Páginas
let paginasEdicao = ['']; // Array temporário de páginas durante a edição
let paginaAtivaIndex = 0; // Índice da folha que está a ser visualizada/editada no momento

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

// Input original de detalhes (vamos ocultar e substituir dinamicamente por folhas de caderno)
const entryDetailsOriginal = document.getElementById('entryDetails');

// Criação do contentor de páginas do caderno no formulário
let cadernoContainer = document.createElement('div');
cadernoContainer.id = 'cadernoContainer';
if (entryDetailsOriginal) {
  entryDetailsOriginal.style.display = 'none'; // Oculta a textarea simples original
  entryDetailsOriginal.parentNode.insertBefore(cadernoContainer, entryDetailsOriginal);
}

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

// Injeta o estilo visual das folhas pautadas diretamente na página para evitar que tenha de alterar o seu arquivo CSS
(function injetarEstilosCaderno() {
  const style = document.createElement('style');
  style.innerHTML = `
    .caderno-editor-wrapper {
      margin-top: 8px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #ffffff;
      padding: 10px;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
    }
    .caderno-folha {
      position: relative;
      background: #fdfdfd;
      background-image: linear-gradient(#e2e8f0 1px, transparent 1px);
      background-size: 100% 28px;
      line-height: 28px;
      border-left: 2px solid #f87171; /* Margem vermelha clássica de caderno */
      padding: 0 10px 0 20px;
      margin-bottom: 10px;
      box-sizing: border-box;
    }
    .caderno-textarea {
      width: 100%;
      height: 280px; /* Altura equivalente a 10 linhas pautadas */
      background: transparent !important;
      border: none !important;
      outline: none !important;
      resize: none;
      font-family: 'Courier New', Courier, monospace, Arial;
      font-size: 15px;
      line-height: 28px;
      color: #1e293b;
      padding: 0;
      margin: 0;
    }
    .caderno-controles {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px dashed #e2e8f0;
    }
    .caderno-btn {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #334155;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }
    .caderno-btn:hover {
      background: #e2e8f0;
    }
    .caderno-btn-add {
      background: #6366f1;
      color: #ffffff;
      border-color: #4f46e5;
    }
    .caderno-btn-add:hover {
      background: #4f46e5;
    }
    .caderno-btn-del-folha {
      background: #fee2e2;
      color: #991b1b;
      border-color: #fca5a5;
    }
    .caderno-btn-del-folha:hover {
      background: #fca5a5;
    }
    .caderno-paginacao {
      font-size: 13px;
      font-weight: bold;
      color: #64748b;
    }
    .badge-paginas {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 12px;
      margin-top: 5px;
      font-weight: bold;
    }
  `;
  document.head.appendChild(style);
})();

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
      entryList.innerHTML = filtrados.map(reg => {
        // Divide as folhas de caderno para contar quantas páginas existem gravadas
        const pags = (reg.entryDetails || '').split('[PAGINA_BREAK]');
        const totalPags = pags.length;
        const textoPreview = pags[0] || '';

        return `
          <div class="entry-card" onclick="abrirModal('${reg.id}')" style="border-left: 5px solid ${getCorPorTipo(reg.entryType)};">
            <div class="entry-card-header">
              <span class="badge badge-${reg.entryType}">${traduzirTipo(reg.entryType)}</span>
              <span class="entry-card-date">${formatarData(reg.entryDate)}</span>
            </div>
            <h3 class="entry-card-title">${reg.entrySummary}</h3>
            <p class="entry-card-meta"><strong>Local:</strong> ${reg.entryLocation || 'N/A'} | <strong>Caso:</strong> ${reg.entryCode || 'N/A'}</p>
            <div class="entry-card-preview">${recortarTexto(textoPreview, 120)}</div>
            <div><span class="badge-paginas">📖 ${totalPags} ${totalPags === 1 ? 'Folha' : 'Folhas'} de Anotações</span></div>
            ${reg.entryTags ? `<div class="entry-card-tags">${reg.entryTags.split(',').map(t => `<span class="tag">#${t.trim()}</span>`).join('')}</div>` : ''}
            <div class="entry-card-status status-${reg.entryStatus}">${traduzirStatus(reg.entryStatus)}</div>
          </div>
        `;
      }).join('');
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

// Lógica de manipulação de folhas virtuais no Modal
function desenharInterfaceCaderno() {
  cadernoContainer.innerHTML = `
    <label style="font-weight: bold; font-size: 13px; color: #334155; display: block; margin-bottom: 4px;">Folhas de Anotações (Estilo Caderno)</label>
    <div class="caderno-editor-wrapper">
      <div class="caderno-folha">
        <textarea id="cadernoTextarea" class="caderno-textarea" placeholder="Escreva as suas notas nesta folha..."></textarea>
      </div>
      <div class="caderno-controles">
        <div>
          <button type="button" class="caderno-btn" id="btnFolhaAnterior">← Anterior</button>
          <span class="caderno-paginacao" id="cadernoPaginacao">Pág. 1 de 1</span>
          <button type="button" class="caderno-btn" id="btnFolhaSeguinte">Seguinte →</button>
        </div>
        <div>
          <button type="button" class="caderno-btn caderno-btn-del-folha" id="btnRemoverFolha" title="Remover esta página">Apagar Folha</button>
          <button type="button" class="caderno-btn caderno-btn-add" id="btnAdicionarFolha">+ Nova Folha</button>
        </div>
      </div>
    </div>
  `;

  const textarea = document.getElementById('cadernoTextarea');
  const btnAnterior = document.getElementById('btnFolhaAnterior');
  const btnSeguinte = document.getElementById('btnFolhaSeguinte');
  const btnAdd = document.getElementById('btnAdicionarFolha');
  const btnRemover = document.getElementById('btnRemoverFolha');
  const paginacaoLabel = document.getElementById('cadernoPaginacao');

  function atualizarVisualizadorFolha() {
    textarea.value = paginasEdicao[paginaAtivaIndex] || '';
    paginacaoLabel.textContent = `Pág. ${paginaAtivaIndex + 1} de ${paginasEdicao.length}`;
    
    // Controlo de estados dos botões
    btnAnterior.disabled = paginaAtivaIndex === 0;
    btnAnterior.style.opacity = paginaAtivaIndex === 0 ? '0.5' : '1';
    
    btnSeguinte.disabled = paginaAtivaIndex === paginasEdicao.length - 1;
    btnSeguinte.style.opacity = paginaAtivaIndex === paginasEdicao.length - 1 ? '0.5' : '1';

    // Não permite apagar se for a única folha restante
    btnRemover.style.display = paginasEdicao.length > 1 ? 'inline-block' : 'none';
  }

  textarea.addEventListener('input', (e) => {
    paginasEdicao[paginaAtivaIndex] = e.target.value;
    // Sincroniza com o input oculto original para o formulário ler
    if (entryDetailsOriginal) {
      entryDetailsOriginal.value = paginasEdicao.join('[PAGINA_BREAK]');
    }
  });

  btnAnterior.addEventListener('click', () => {
    if (paginaAtivaIndex > 0) {
      paginaAtivaIndex--;
      atualizarVisualizadorFolha();
    }
  });

  btnSeguinte.addEventListener('click', () => {
    if (paginaAtivaIndex < paginasEdicao.length - 1) {
      paginaAtivaIndex++;
      atualizarVisualizadorFolha();
    }
  });

  btnAdd.addEventListener('click', () => {
    paginasEdicao.push(''); // Adiciona nova folha vazia
    paginaAtivaIndex = paginasEdicao.length - 1; // Vai para a nova folha
    atualizarVisualizadorFolha();
    textarea.focus();
    if (entryDetailsOriginal) {
      entryDetailsOriginal.value = paginasEdicao.join('[PAGINA_BREAK]');
    }
  });

  btnRemover.addEventListener('click', () => {
    if (paginasEdicao.length > 1) {
      if (confirm(`Tem a certeza que deseja eliminar permanentemente a Página ${paginaAtivaIndex + 1}?`)) {
        paginasEdicao.splice(paginaAtivaIndex, 1);
        if (paginaAtivaIndex >= paginasEdicao.length) {
          paginaAtivaIndex = paginasEdicao.length - 1;
        }
        atualizarVisualizadorFolha();
        if (entryDetailsOriginal) {
          entryDetailsOriginal.value = paginasEdicao.join('[PAGINA_BREAK]');
        }
      }
    }
  });

  atualizarVisualizadorFolha();
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
    
    // Inicializa as páginas do caderno a partir do valor gravado
    if (reg.entryDetails && reg.entryDetails.includes('[PAGINA_BREAK]')) {
      paginasEdicao = reg.entryDetails.split('[PAGINA_BREAK]');
    } else {
      paginasEdicao = [reg.entryDetails || ''];
    }
    
    if (entryDetailsOriginal) entryDetailsOriginal.value = reg.entryDetails || '';
    document.getElementById('entryTags').value = reg.entryTags;
    document.getElementById('entryStatus').value = reg.entryStatus;
    deleteEntryBtn.style.display = 'inline-block';
  } else {
    modalTitle.textContent = "Novo registro";
    entryForm.reset();
    document.getElementById('entryId').value = '';
    document.getElementById('entryDate').value = new Date().toISOString().split('T')[0];
    paginasEdicao = ['']; // Inicia caderno limpo com uma folha vazia
    if (entryDetailsOriginal) entryDetailsOriginal.value = '';
    deleteEntryBtn.style.display = 'none';
  }

  paginaAtivaIndex = 0;
  desenharInterfaceCaderno(); // Renderiza o visual de caderno interativo
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
    // Grava as folhas juntas separadas pela quebra padrão
    entryDetails: paginasEdicao.join('[PAGINA_BREAK]'),
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
    // Limpa a quebra de página visual para exportar texto corrido no CSV
    `"${(r.entryDetails||'').replace(/\[PAGINA_BREAK\]/g, '\n\n--- NOVA FOLHA ---\n\n').replace(/"/g, '""')}"`, 
    `"${(r.entryTags||'').replace(/"/g, '""')}"`, 
    r.entryStatus
  ]);
  fazerDownload("data:text/csv;charset=utf-8,\uFEFF" + [colunas.join(","), ...linhas.map(e => e.join(","))].join("\n"), `relatorio_${obterDataISO()}.csv`);
}

// 3. EXPORTAÇÃO WORD COM FOLHAS SEPARADAS POR QUEBRA DE PÁGINA REAL
function exportarWord() {
  if (registros.length === 0) return alert("Nenhum registro para exportar.");
  
  let conteudoHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset="utf-8">
    <title>Caderno de Campo</title>
    <style>
      body { font-family: 'Arial', sans-serif; padding: 20px; color: #232733; line-height: 1.6; }
      h1 { color: #0f172a; border-bottom: 2px solid #6366f1; padding-bottom: 6px; font-size: 22pt; }
      .case-header { margin-bottom: 25px; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px; }
      .meta { font-size: 10pt; color: #64748b; margin-bottom: 8px; font-weight: bold; }
      
      /* Folhas de caderno no Word */
      .folha-caderno {
        margin-bottom: 25px;
        border: 1px solid #cbd5e1;
        border-left: 4px solid #f87171; /* Margem de caderno */
        padding: 20px;
        background: #fafafa;
        font-family: 'Courier New', Courier, monospace;
        font-size: 11pt;
        line-height: 1.6;
        color: #334155;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .page-number {
        font-size: 9pt;
        color: #94a3b8;
        text-align: right;
        margin-top: 5px;
        font-family: Arial, sans-serif;
      }
    </style>
  </head>
  <body>
    <h1>Caderno de Campo</h1>
    <p><strong>Psicólogo:</strong> Paulo Xavier &middot; Relatório Consolidado</p>
    <p>Data de emissão: ${new Date().toLocaleDateString('pt-BR')}</p>
    <hr/>`;

  [...registros].sort((a,b)=>new Date(a.entryDate)-new Date(b.entryDate)).forEach(r => {
    conteudoHtml += `
      <div class="case-header">
        <div class="meta">${traduzirTipo(r.entryType).toUpperCase()} &middot; ${formatarData(r.entryDate)} &middot; Local: ${r.entryLocation||'N/A'} &middot; Caso: ${r.entryCode||'N/A'}</div>
        <h3 style="margin-top:0; font-size:14pt; color:#1e293b;">${r.entrySummary}</h3>
      </div>`;

    const pags = (r.entryDetails || '').split('[PAGINA_BREAK]');
    pags.forEach((textoPag, idx) => {
      conteudoHtml += `
        <div class="folha-caderno">${textoPag.replace(/\n/g, '<br/>')}
          <div class="page-number">Folha ${idx + 1} de ${pags.length}</div>
        </div>
        <br clear=all style='mso-special-character:line-break;page-break-before:always'>`;
    });
  });
  
  conteudoHtml += `</body></html>`;
  
  const blob = new Blob(['\ufeff' + conteudoHtml], { type: 'application/msword' });
  const urlDeDownload = URL.createObjectURL(blob);
  
  const linkTemporario = document.createElement('a');
  linkTemporario.href = urlDeDownload;
  linkTemporario.download = `Caderno_Campo_${obterDataISO()}.doc`;
  linkTemporario.style.display = 'none';
  
  document.body.appendChild(linkTemporario);
  linkTemporario.click();
  
  setTimeout(() => {
    document.body.removeChild(linkTemporario);
    URL.revokeObjectURL(urlDeDownload);
  }, 500);
}

// 4. IMPRESSÃO PDF COM DESIGN DE FOLHAS DE CADERNO LINHAS PAUTADAS E NUMERAÇÃO
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
        body { font-family: Arial, sans-serif; color: #1e293b; padding: 20px; background: #fff; line-height: 1.6; }
        .header { border-bottom: 3px solid #6366f1; padding-bottom: 10px; margin-bottom: 25px; }
        .title { color: #0f172a; margin: 0; font-size: 24px; font-family: Georgia, serif; }
        .subtitle { margin: 5px 0 0 0; color: #64748b; font-size: 13px; }
        
        .registro-bloco {
          margin-bottom: 40px;
          page-break-inside: avoid;
        }
        
        .meta-header {
          font-size: 11px;
          color: #6366f1;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 6px;
          border-bottom: 1px dashed #cbd5e1;
          padding-bottom: 4px;
        }
        .registro-title {
          margin: 0 0 15px 0;
          color: #0f172a;
          font-family: Georgia, serif;
          font-size: 18px;
        }

        /* Estilo visual da Folha Real de Caderno */
        .folha-container {
          position: relative;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          background: #fcfcfc;
          background-image: linear-gradient(#e2e8f0 1px, transparent 1px);
          background-size: 100% 28px; /* Altura da pauta */
          line-height: 28px;
          border-left: 3px solid #f87171; /* Margem esquerda de folha */
          padding: 1px 15px 35px 25px;
          margin-bottom: 20px;
          height: auto !important;
          page-break-inside: avoid;
          page-break-after: always; /* Cada folha vai para uma nova página física no PDF */
        }
        
        .folha-texto { 
          font-size: 14px; 
          color: #334155; 
          font-family: 'Courier New', Courier, monospace;
          white-space: pre-wrap; 
          word-break: break-word;
          overflow-wrap: anywhere;
          margin-top: 14px;
        }

        .folha-rodape {
          position: absolute;
          bottom: 5px;
          right: 15px;
          font-family: Arial, sans-serif;
          font-size: 10px;
          color: #94a3b8;
          font-weight: bold;
        }
        
        @media print {
          body { padding: 0; }
          .folha-container { 
            background-color: #ffffff !important; 
            border: 1px solid #cbd5e1 !important;
            border-left: 3px solid #f87171 !important;
            page-break-inside: avoid;
          }
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
      <div class="registro-bloco">
        <div class="meta-header">${traduzirTipo(reg.entryType)} &middot; ${formatarData(reg.entryDate)} &middot; Local: ${reg.entryLocation || 'N/A'} &middot; Caso: ${reg.entryCode || 'N/A'}</div>
        <h3 class="registro-title">${reg.entrySummary}</h3>
    `;

    // Divide as páginas físicas e gera os blocos correspondentes no PDF
    const pags = (reg.entryDetails || '').split('[PAGINA_BREAK]');
    pags.forEach((textoFolha, index) => {
      htmlContudo += `
        <div class="folha-container">
          <div class="folha-texto">${textoFolha || '<i>Esta folha está em branco.</i>'}</div>
          <div class="folha-rodape">Folha ${index + 1} de ${pags.length}</div>
        </div>
      `;
    });

    htmlContudo += `</div>`;
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
