const STORAGE_KEY = 'caderno_campo_registros_px';
let registros = carregarDados();
let filtroAtual = 'todos';
let termoBusca = '';

let paginasEdicao = ['']; 
let paginaAtivaIndex = 0;

// Mapeamento do DOM seguro
const entryList = document.getElementById('entryList');
const emptyState = document.getElementById('emptyState');
const entryForm = document.getElementById('entryForm');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalTitle = document.getElementById('modalTitle');
const searchInput = document.getElementById('searchInput');
const filterTabs = document.getElementById('filterTabs');
const entryId = document.getElementById('entryId');
const entryType = document.getElementById('entryType');
const entryDate = document.getElementById('entryDate');
const entryLocation = document.getElementById('entryLocation');
const entryCode = document.getElementById('entryCode');
const entrySummary = document.getElementById('entrySummary');
const entryTags = document.getElementById('entryTags');
const entryStatus = document.getElementById('entryStatus');

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

let cadernoContainer = document.getElementById('cadernoContainer') || document.createElement('div');
cadernoContainer.id = 'cadernoContainer';
if (entryDetailsOriginal) {
    entryDetailsOriginal.style.display = 'none';
    entryDetailsOriginal.parentNode.insertBefore(cadernoContainer, entryDetailsOriginal);
}

// Estilos pautados e cor preta garantida
(function injetarEstilos() {
    const style = document.createElement('style');
    style.innerHTML = `
        .caderno-editor-wrapper {
            margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 8px; background: #ffffff; padding: 10px;
        }
        .caderno-folha {
            position: relative; background: #fdfdfd; background-image: linear-gradient(#e2e8f0 1px, transparent 1px);
            background-size: 100% 28px; line-height: 28px; border-left: 3px solid #ef4444; padding: 10px 15px 10px 20px; margin-bottom: 10px;
        }
        .caderno-textarea {
            width: 100%; min-height: 280px; background: transparent !important; border: none !important; outline: none !important;
            font-family: 'Courier New', monospace; font-size: 16px; color: #000000 !important; line-height: 28px; resize: none;
        }
        .caderno-controles { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #e2e8f0; }
        .caderno-btn { background: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; }
        .caderno-btn:hover { background: #e2e8f0; }
        .caderno-paginacao { font-size: 13px; font-weight: bold; color: #64748b; }
        .badge-paginas { display: inline-block; background: #e0f2fe; color: #0369a1; font-size: 11px; padding: 2px 8px; border-radius: 12px; margin-top: 5px; font-weight: bold; }
    `;
    document.head.appendChild(style);
})();

document.addEventListener('DOMContentLoaded', () => {
    renderizar();
    atualizarContadores();
    registrarServiceWorker();

    if (newEntryBtn) newEntryBtn.addEventListener('click', () => abrirModal());
    if (emptyNewEntryBtn) emptyNewEntryBtn.addEventListener('click', () => abrirModal());
    if (closeModalBtn) closeModalBtn.addEventListener('click', fecharModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', fecharModal);
    if (entryForm) entryForm.addEventListener('submit', salvarRegistro);
    if (deleteEntryBtn) deleteEntryBtn.addEventListener('click', deletarRegistro);

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            termoBusca = e.target.value.toLowerCase();
            renderizar();
        });
    }

    if (filterTabs) {
        filterTabs.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const activeTab = filterTabs.querySelector('.tab.active');
                if (activeTab) activeTab.classList.remove('active');
                tab.classList.add('active');
                filtroAtual = tab.dataset.filter;
                renderizar();
            });
        });
    }

    if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportarJSON);
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportarCSV);
    if (exportWordBtn) exportWordBtn.addEventListener('click', exportarWord);
    if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportarPDF);
    if (importFile) importFile.addEventListener('change', importarBackup);
});

function carregarDados() { const d = localStorage.getItem(STORAGE_KEY); return d ? JSON.parse(d) : []; }
function salvarDados() { localStorage.setItem(STORAGE_KEY, JSON.stringify(registros)); atualizarContadores(); }

function atualizarDadosOcultos() {
    if (entryDetailsOriginal) entryDetailsOriginal.value = paginasEdicao.join('[PAGINA_BREAK]');
}

function desenharInterfaceCaderno() {
    cadernoContainer.innerHTML = `
        <div class="caderno-editor-wrapper">
            <div class="caderno-folha">
                <textarea id="cadernoTextarea" class="caderno-textarea" placeholder="Escreva aqui..."></textarea>
            </div>
            <div class="caderno-controles">
                <div>
                    <button type="button" class="caderno-btn" id="btnFolhaAnterior">← Anterior</button>
                    <span class="caderno-paginacao" id="cadernoPaginacao">Pág. 1 de 1</span>
                    <button type="button" class="caderno-btn" id="btnFolhaSeguinte">Seguinte →</button>
                </div>
                <div>
                    <button type="button" class="caderno-btn" id="btnRemoverFolha" style="background:#fee2e2; color:#991b1b; border-color:#fca5a5;">Apagar Folha</button>
                    <button type="button" class="caderno-btn" id="btnAdicionarFolha" style="background:#6366f1; color:#fff; border-color:#4f46e5;">+ Nova Folha</button>
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
        btnAnterior.style.opacity = paginaAtivaIndex === 0 ? '0.5' : '1';
        btnSeguinte.disabled = paginaAtivaIndex === paginasEdicao.length - 1;
        btnSeguinte.style.opacity = paginaAtivaIndex === paginasEdicao.length - 1 ? '0.5' : '1';
        btnRemover.style.display = paginasEdicao.length > 1 ? 'inline-block' : 'none';
    }

    textarea.addEventListener('input', (e) => {
        paginasEdicao[paginaAtivaIndex] = e.target.value;
        atualizarDadosOcultos();
    });

    btnAnterior.addEventListener('click', () => {
        if (paginaAtivaIndex > 0) { paginaAtivaIndex--; atualizarVisualizadorFolha(); }
    });

    btnSeguinte.addEventListener('click', () => {
        if (paginaAtivaIndex < paginasEdicao.length - 1) { paginaAtivaIndex++; atualizarVisualizadorFolha(); }
    });

    btnAdd.addEventListener('click', () => {
        paginasEdicao.push(''); paginaAtivaIndex = paginasEdicao.length - 1;
        atualizarVisualizadorFolha(); textarea.focus();
        atualizarDadosOcultos();
    });

    btnRemover.addEventListener('click', () => {
        if (paginasEdicao.length > 1 && confirm(`Deseja apagar a Página ${paginaAtivaIndex + 1}?`)) {
            paginasEdicao.splice(paginaAtivaIndex, 1);
            if (paginaAtivaIndex >= paginasEdicao.length) paginaAtivaIndex = paginasEdicao.length - 1;
            atualizarVisualizadorFolha();
            atualizarDadosOcultos();
        }
    });

    atualizarVisualizadorFolha();
}

function renderizar() {
    const filtrados = registros.filter(reg => {
        const atendeFiltro = filtroAtual === 'todos' || (filtroAtual === 'pendente' && reg.entryStatus === 'acompanhamento') || reg.entryType === filtroAtual;
        const texto = `${reg.entryLocation || ''} ${reg.entryCode || ''} ${reg.entrySummary || ''} ${reg.entryDetails || ''} ${reg.entryTags || ''}`.toLowerCase();
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

function abrirModal(id = null) {
    if (!modalBackdrop) return;
    modalBackdrop.style.display = 'flex';

    if (id) {
        const reg = registros.find(r => r.id === id);
        if (!reg) return;
        if (modalTitle) modalTitle.textContent = "Editar registro";
        if (entryId) entryId.value = reg.id;
        if (entryType) entryType.value = reg.entryType || '';
        if (entryDate) entryDate.value = reg.entryDate || '';
        if (entryLocation) entryLocation.value = reg.entryLocation || '';
        if (entryCode) entryCode.value = reg.entryCode || '';
        if (entrySummary) entrySummary.value = reg.entrySummary || '';
        paginasEdicao = (reg.entryDetails && reg.entryDetails.includes('[PAGINA_BREAK]')) ? reg.entryDetails.split('[PAGINA_BREAK]') : [reg.entryDetails || ''];
        if (entryDetailsOriginal) entryDetailsOriginal.value = reg.entryDetails || '';
        if (entryTags) entryTags.value = reg.entryTags || '';
        if (entryStatus) entryStatus.value = reg.entryStatus || '';
        if (deleteEntryBtn) deleteEntryBtn.style.display = 'inline-block';
    } else {
        if (modalTitle) modalTitle.textContent = "Novo registro";
        if (entryForm) entryForm.reset();
        if (entryId) entryId.value = '';
        if (entryDate) entryDate.value = new Date().toISOString().split('T')[0];
        paginasEdicao = [''];
        if (entryDetailsOriginal) entryDetailsOriginal.value = '';
        if (deleteEntryBtn) deleteEntryBtn.style.display = 'none';
    }

    paginaAtivaIndex = 0;
    desenharInterfaceCaderno();
}

function fecharModal() {
    if (modalBackdrop) modalBackdrop.style.display = 'none';
    if (entryForm) entryForm.reset();
}

function salvarRegistro(e) {
    e.preventDefault();
    atualizarDadosOcultos();
    const id = entryId ? entryId.value : '';
    const novo = {
        id: id || 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        entryType: entryType ? entryType.value : 'visita',
        entryDate: entryDate ? entryDate.value : obterDataISO(),
        entryLocation: entryLocation ? entryLocation.value : '',
        entryCode: entryCode ? entryCode.value : '',
        entrySummary: entrySummary ? entrySummary.value : '',
        entryDetails: entryDetailsOriginal ? entryDetailsOriginal.value : '',
        entryTags: entryTags ? entryTags.value : '',
        entryStatus: entryStatus ? entryStatus.value : 'concluido'
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
    const id = entryId ? entryId.value : '';
    if (id && confirm("Remover permanentemente este registro?")) {
        registros = registros.filter(r => r.id !== id);
        salvarDados(); fecharModal(); renderizar();
    }
}

function exportarJSON() {
    if (registros.length === 0) return alert("Nenhum registro.");
    fazerDownload("data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(registros, null, 2)), `backup_${obterDataISO()}.json`);
}

function exportarCSV() {
    if (registros.length === 0) return alert("Nenhum registro.");
    const colunas = ["Tipo", "Data", "Local", "Caso", "Resumo", "Detalhes", "Tags", "Status"];
    const linhas = registros.map(r => [
        r.entryType, r.entryDate, 
        `"${(r.entryLocation||'').replace(/"/g, '""')}"`, 
        `"${(r.entryCode||'').replace(/"/g, '""')}"`, 
        `"${(r.entrySummary||'').replace(/"/g, '""')}"`, 
        `"${(r.entryDetails||'').replace(/\[PAGINA_BREAK\]/g, '\n\n--- NOVA FOLHA ---\n\n').replace(/"/g, '""')}"`, 
        `"${(r.entryTags||'').replace(/"/g, '""')}"`, 
        r.entryStatus
    ]);
    fazerDownload("data:text/csv;charset=utf-8,\uFEFF" + [colunas.join(","), ...linhas.map(e => e.join(","))].join("\n"), `relatorio_${obterDataISO()}.csv`);
}

function exportarWord() {
    if (registros.length === 0) return alert("Nenhum registro para exportar.");
    let conteudoHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset="utf-8"><title>Caderno de Campo</title>
    <style>body { font-family: Arial, sans-serif; padding: 20px; color: #000000; line-height: 1.6; }
    .case-header { margin-bottom: 25px; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px; }
    .meta { font-size: 10pt; color: #64748b; margin-bottom: 8px; font-weight: bold; }
    .folha-caderno { margin-bottom: 25px; border: 1px solid #cbd5e1; border-left: 4px solid #f87171; padding: 20px; background: #fafafa; font-family: 'Courier New', Courier, monospace; font-size: 11pt; line-height: 1.6; color: #000000; white-space: pre-wrap; word-break: break-word; }
    .page-number { font-size: 9pt; color: #94a3b8; text-align: right; margin-top: 5px; font-family: Arial, sans-serif; }</style></head>
    <body style="color:#000000;"><h1>Caderno de Campo</h1><hr/>`;

    [...registros].sort((a,b)=>new Date(a.entryDate)-new Date(b.entryDate)).forEach(r => {
        conteudoHtml += `<div class="case-header"><div class="meta">${traduzirTipo(r.entryType).toUpperCase()} &middot; ${formatarData(r.entryDate)} &middot; Local: ${r.entryLocation||'N/A'} &middot; Caso: ${r.entryCode||'N/A'}</div><h3 style="margin-top:0; color:#000000;">${r.entrySummary}</h3></div>`;
        const pags = (r.entryDetails || '').split('[PAGINA_BREAK]');
        pags.forEach((textoPag, idx) => {
            conteudoHtml += `<div class="folha-caderno">${textoPag.replace(/\n/g, '<br/>')}<div class="page-number">Folha ${idx + 1} de ${pags.length}</div></div><br clear=all style='mso-special-character:line-break;page-break-before:always'>`;
        });
    });
    conteudoHtml += `</body></html>`;
    fazerDownload('data:application/msword;charset=utf-8,' + encodeURIComponent('\ufeff' + conteudoHtml), `Caderno_Campo_${obterDataISO()}.doc`);
}

function exportarPDF() {
    if (registros.length === 0) return alert("Nenhum registro para exportar.");
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;

    let htmlContudo = `<html><head><title>Caderno de Campo</title><style>body { font-family: Arial, sans-serif; color: #000000 !important; padding: 20px; line-height: 1.6; }
    .folha-container { position: relative; border: 1px solid #cbd5e1; border-radius: 4px; background: #fcfcfc; background-image: linear-gradient(#e2e8f0 1px, transparent 1px); background-size: 100% 28px; line-height: 28px; border-left: 3px solid #f87171; padding: 1px 15px 35px 25px; margin-bottom: 20px; page-break-after: always; }
    .folha-texto { font-size: 14px; color: #000000 !important; font-family: 'Courier New', Courier, monospace; white-space: pre-wrap; word-break: break-word; margin-top: 14px; }
    .folha-rodape { position: absolute; bottom: 5px; right: 15px; font-family: Arial, sans-serif; font-size: 10px; color: #94a3b8; font-weight: bold; }</style></head><body><h1>Caderno de Campo</h1><hr/>`;

    [...registros].sort((a,b)=>new Date(a.entryDate)-new Date(b.entryDate)).forEach(reg => {
        htmlContudo += `<div><strong>${traduzirTipo(reg.entryType)} &middot; ${formatarData(reg.entryDate)}</strong><h3>${reg.entrySummary}</h3></div>`;
        const pags = (reg.entryDetails || '').split('[PAGINA_BREAK]');
        pags.forEach((textoFolha, index) => {
            htmlContudo += `<div class="folha-container"><div class="folha-texto">${textoFolha || '<i>Folha em branco.</i>'}</div><div class="folha-rodape">Folha ${index + 1} de ${pags.length}</div></div>`;
        });
    });
    htmlContudo += `</body></html>`;

    doc.open(); doc.write(htmlContudo); doc.close();
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
        navigator.serviceWorker.register('sw.js').catch(() => {});
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
