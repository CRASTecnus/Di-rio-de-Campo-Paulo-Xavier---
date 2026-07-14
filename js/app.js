const STORAGE_KEY = 'caderno_campo_registros_px';
let registros = carregarDados();
let filtroAtual = 'todos';
let termoBusca = '';

let paginasEdicao = ['']; 
let paginaAtivaIndex = 0; 

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

const entryDetailsOriginal = document.getElementById('entryDetails');

let cadernoContainer = document.createElement('div');
cadernoContainer.id = 'cadernoContainer';
if (entryDetailsOriginal) {
  entryDetailsOriginal.style.display = 'none'; 
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

(function injetarEstilosCaderno() {
  const style = document.createElement('style');
  style.innerHTML = `
    .caderno-editor-wrapper { margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 8px; background: #ffffff; padding: 10px; }
    .caderno-folha { position: relative; background: #fdfdfd; background-image: linear-gradient(#e2e8f0 1px, transparent 1px); background-size: 100% 28px; line-height: 28px; border-left: 2px solid #f87171; padding: 0 10px 0 20px; margin-bottom: 10px; box-sizing: border-box; }
    .caderno-textarea { width: 100%; height: 280px; background: transparent !important; border: none !important; outline: none !important; resize: none; font-family: 'Courier New', Courier, monospace; font-size: 15px; line-height: 28px; color: #000000 !important; -webkit-text-fill-color: #000000 !important; padding: 0; margin: 0; }
    .caderno-controles { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #e2e8f0; }
    .caderno-btn { background: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; }
    .caderno-btn:hover { background: #e2e8f0; }
    .caderno-btn-add { background: #6366f1; color: #ffffff; border-color: #4f46e5; }
    .caderno-btn-del-folha { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
    .caderno-paginacao { font-size: 13px; font-weight: bold; color: #64748b; }
    .badge-paginas { display: inline-block; background: #e0f2fe; color: #0369a1; font-size: 11px; padding: 2px 8px; border-radius: 12px; margin-top: 5px; font-weight: bold; }
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
        const pags = (reg.entryDetails || '').split('[PAGINA_BREAK]');
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
            <div><span class="badge-paginas">📖 ${pags.length} ${pags.length === 1 ? 'Folha' : 'Folhas'}</span></div>
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

function desenharInterfaceCaderno() {
  cadernoContainer.innerHTML = `
    <label style="font-weight: bold; font-size: 13px; color: #334155; display: block; margin-bottom: 4px;">Folhas de Anotações</label>
    <div class="caderno-editor-wrapper">
      <div class="caderno-folha">
        <textarea id="cadernoTextarea" class="caderno-textarea" placeholder="Escreva suas notas aqui..."></textarea>
      </div>
      <div class="caderno-controles">
        <div>
          <button type="button" class="caderno-btn" id="btnFolhaAnterior">← Anterior</button>
          <span class="caderno-paginacao" id="cadernoPaginacao">Pág. 1 de 1</span>
          <button type="button" class="caderno-btn" id="btnFolhaSeguinte">Seguinte →</button>
        </div>
        <div>
          <button type="button" class="caderno-btn caderno-btn-del-folha" id="btnRemoverFolha">Apagar</button>
          <button type="button" class="caderno-btn caderno-btn-add" id="btnAdicionarFolha">+ Nova</button>
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
    btnAnterior.disabled = paginaAtivaIndex === 0;
    btnSeguinte.disabled = paginaAtivaIndex === paginasEdicao.length - 1;
    btnRemover.style.display = paginasEdicao.length > 1 ? 'inline-block' : 'none';
  }

  textarea.addEventListener('input', (e) => {
    paginasEdicao[paginaAtivaIndex] = e.target.value;
    if (entryDetailsOriginal) entryDetailsOriginal.value = paginasEdicao.join('[PAGINA_BREAK]');
  });

  btnAnterior.addEventListener('click', () => { if (paginaAtivaIndex > 0) { paginaAtivaIndex--; atualizarVisualizadorFolha(); } });
  btnSeguinte.addEventListener('click', () => { if (paginaAtivaIndex < paginasEdicao.length - 1) { paginaAtivaIndex++; atualizarVisualizadorFolha(); } });
  btnAdd.addEventListener('click', () => { paginasEdicao.push(''); paginaAtivaIndex = paginasEdicao.length - 1; atualizarVisualizadorFolha(); textarea.focus(); });
  btnRemover.addEventListener('click', () => { if (paginasEdicao.length > 1 && confirm("Excluir esta página?")) { paginasEdicao.splice(paginaAtivaIndex, 1); if (paginaAtivaIndex >= paginasEdicao.length) paginaAtivaIndex--; atualizarVisualizadorFolha(); } });

  atualizarVisualizadorFolha();
}

function abrirModal(id = null) {
  modalBackdrop.style.display = 'flex';
  if (id) {
    const reg = registros.find(r => r.id === id);
    document.getElementById('entryId').value = reg.id;
    document.getElementById('entryType').value = reg.entryType;
    document.getElementById('entryDate').value = reg.entryDate;
    document.getElementById('entryLocation').value = reg.entryLocation;
    document.getElementById('entryCode').value = reg.entryCode;
    document.getElementById('entrySummary').value = reg.entrySummary;
    paginasEdicao = (reg.entryDetails || '').split('[PAGINA_BREAK]');
    document.getElementById('entryTags').value = reg.entryTags;
    document.getElementById('entryStatus').value = reg.entryStatus;
    deleteEntryBtn.style.display = 'inline-block';
  } else {
    entryForm.reset();
    document.getElementById('entryId').value = '';
    document.getElementById('entryDate').value = new Date().toISOString().split('T')[0];
    paginasEdicao = [''];
    deleteEntryBtn.style.display = 'none';
  }
  paginaAtivaIndex = 0;
  desenharInterfaceCaderno();
}

function fecharModal() { modalBackdrop.style.display = 'none'; }

function salvarRegistro(e) {
  e.preventDefault();
  const id = document.getElementById('entryId').value;
  const novo = {
    id: id || 'id_' + Date.now(),
    entryType: document.getElementById('entryType').value,
    entryDate: document.getElementById('entryDate').value,
    entryLocation: document.getElementById('entryLocation').value,
    entryCode: document.getElementById('entryCode').value,
    entrySummary: document.getElementById('entrySummary').value,
    entryDetails: paginasEdicao.join('[PAGINA_BREAK]'),
    entryTags: document.getElementById('entryTags').value,
    entryStatus: document.getElementById('entryStatus').value
  };
  if (id) {
    const index = registros.findIndex(r => r.id === id);
    registros[index] = novo;
  } else {
    registros.push(novo);
  }
  salvarDados(); fecharModal(); renderizar();
}

function deletarRegistro() {
  const id = document.getElementById('entryId').value;
  if (confirm("Remover este registro?")) {
    registros = registros.filter(r => r.id !== id);
    salvarDados(); fecharModal(); renderizar();
  }
}

function exportarPDF() {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  
  let htmlContudo = `
    <html><head><style>
      body { font-family: Arial; color: #000; padding: 20px; }
      .folha-container { border: 1px solid #000; padding: 20px; margin-bottom: 20px; page-break-after: always; }
      .folha-texto { color: #000000 !important; font-family: 'Courier New', monospace; white-space: pre-wrap; font-size: 14px; }
    </style></head><body>`;

  registros.forEach(reg => {
    const pags = (reg.entryDetails || '').split('[PAGINA_BREAK]');
    pags.forEach((texto, i) => {
      htmlContudo += `<div class="folha-container"><div class="folha-texto">${texto.replace(/\n/g, '<br>')}</div></div>`;
    });
  });

  htmlContudo += `</body></html>`;
  doc.write(htmlContudo);
  doc.close();
  setTimeout(() => { iframe.contentWindow.print(); document.body.removeChild(iframe); }, 500);
}

// Funções utilitárias mantidas para o funcionamento do sistema
function formatarData(d) { const p = d.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; }
function traduzirTipo(t) { return {visita:'Visita', pesquisa:'Pesquisa', atividade:'Atividade Técnica'}[t] || t; }
function getCorPorTipo(t) { return {visita:'#38bdf8', pesquisa:'#34d399', atividade:'#fbbf24'}[t] || '#64748b'; }
function recortarTexto(t, l) { return t.length <= l ? t : t.slice(0, l) + '...'; }
function registrarServiceWorker() { if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js'); }
