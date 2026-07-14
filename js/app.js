// ============================================================
// CADERNO DE CAMPO - Paulo Xavier
// app.js — compatível com index.html (ver estrutura de IDs abaixo)
// ============================================================

const STORAGE_KEY = 'caderno_campo_registros_px';

let registros = [];
try {
    registros = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
} catch (e) {
    console.error('Não foi possível ler os registros salvos, iniciando lista vazia.', e);
    registros = [];
}

let filtroAtual = 'todos';
let termoBusca = '';

// ------------------------------------------------------------
// Persistência
// ------------------------------------------------------------
function persistir() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
    } catch (e) {
        console.error('Erro ao salvar no localStorage:', e);
        alert('Não foi possível salvar. O armazenamento local pode estar cheio.');
    }
}

function gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function formatarData(d) {
    if (!d) return '';
    const p = d.split('-');
    if (p.length !== 3) return d;
    return `${p[2]}/${p[1]}/${p[0]}`;
}

const LABELS_TIPO = { visita: 'Visita', pesquisa: 'Pesquisa', atividade: 'Atividade técnica' };
const LABELS_STATUS = { concluido: 'Concluído', acompanhamento: 'Acompanhamento pendente', planejado: 'Planejado' };

// ------------------------------------------------------------
// Modal - abrir / fechar
// ------------------------------------------------------------
function abrirModal(id = null) {
    const modalBackdrop = document.getElementById('modalBackdrop');
    const entryForm = document.getElementById('entryForm');
    const deleteEntryBtn = document.getElementById('deleteEntryBtn');
    const modalTitle = document.getElementById('modalTitle');

    if (!modalBackdrop) return;
    modalBackdrop.style.display = 'flex';

    if (id) {
        const reg = registros.find(r => r.id === id);
        if (!reg) return;
        modalTitle.textContent = 'Editar registro';
        document.getElementById('entryId').value = reg.id;
        document.getElementById('entryType').value = reg.entryType;
        document.getElementById('entryDate').value = reg.entryDate;
        document.getElementById('entryLocation').value = reg.entryLocation || '';
        document.getElementById('entryCode').value = reg.entryCode || '';
        document.getElementById('entrySummary').value = reg.entrySummary || '';
        document.getElementById('entryDetails').value = reg.entryDetails || '';
        document.getElementById('entryTags').value = reg.entryTags || '';
        document.getElementById('entryStatus').value = reg.entryStatus || 'concluido';
        deleteEntryBtn.style.display = 'inline-block';
    } else {
        modalTitle.textContent = 'Novo registro';
        entryForm.reset();
        document.getElementById('entryId').value = '';
        document.getElementById('entryDate').value = new Date().toISOString().split('T')[0];
        deleteEntryBtn.style.display = 'none';
    }
}

function fecharModal() {
    const modalBackdrop = document.getElementById('modalBackdrop');
    if (modalBackdrop) modalBackdrop.style.display = 'none';
}

// ------------------------------------------------------------
// Salvar / Excluir
// ------------------------------------------------------------
function salvarRegistro(e) {
    e.preventDefault();

    const idAtual = document.getElementById('entryId').value;
    const id = idAtual || gerarId();

    const reg = {
        id,
        entryType: document.getElementById('entryType').value,
        entryDate: document.getElementById('entryDate').value,
        entryLocation: document.getElementById('entryLocation').value.trim(),
        entryCode: document.getElementById('entryCode').value.trim(),
        entrySummary: document.getElementById('entrySummary').value.trim(),
        entryDetails: document.getElementById('entryDetails').value,
        entryTags: document.getElementById('entryTags').value.trim(),
        entryStatus: document.getElementById('entryStatus').value,
    };

    const idx = registros.findIndex(r => r.id === id);
    if (idx >= 0) registros[idx] = reg; else registros.push(reg);

    persistir();
    fecharModal();
    renderizar();
}

function excluirRegistro() {
    const id = document.getElementById('entryId').value;
    if (!id) return;
    if (!confirm('Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.')) return;

    registros = registros.filter(r => r.id !== id);
    persistir();
    fecharModal();
    renderizar();
}

// ------------------------------------------------------------
// Listagem / filtro / busca / contadores
// ------------------------------------------------------------
function correspondeAoFiltro(reg) {
    if (filtroAtual === 'todos') return true;
    if (filtroAtual === 'pendente') return reg.entryStatus === 'acompanhamento';
    return reg.entryType === filtroAtual;
}

function atualizarContadores() {
    const contagens = { todos: registros.length, visita: 0, pesquisa: 0, atividade: 0, pendente: 0 };
    registros.forEach(reg => {
        if (contagens[reg.entryType] !== undefined) contagens[reg.entryType]++;
        if (reg.entryStatus === 'acompanhamento') contagens.pendente++;
    });
    Object.keys(contagens).forEach(chave => {
        const el = document.getElementById(`count-${chave}`);
        if (el) el.textContent = contagens[chave];
    });
}

function renderizar() {
    const entryList = document.getElementById('entryList');
    const emptyState = document.getElementById('emptyState');
    if (!entryList) return;

    atualizarContadores();

    const busca = termoBusca.toLowerCase();
    const filtrados = registros.filter(reg => {
        const texto = `${reg.entryLocation} ${reg.entryCode} ${reg.entrySummary} ${reg.entryTags}`.toLowerCase();
        return correspondeAoFiltro(reg) && texto.includes(busca);
    });

    filtrados.sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));

    entryList.style.display = filtrados.length ? 'grid' : 'none';
    if (emptyState) emptyState.style.display = filtrados.length ? 'none' : 'flex';

    entryList.innerHTML = filtrados.map(reg => `
        <div class="entry-card" data-type="${escapeHtml(reg.entryType)}" data-status="${escapeHtml(reg.entryStatus)}" onclick="abrirModal('${reg.id}')">
            <div class="entry-card-head">
                <span class="entry-type-badge entry-type-${escapeHtml(reg.entryType)}">${escapeHtml(LABELS_TIPO[reg.entryType] || reg.entryType)}</span>
                <span class="entry-date">${formatarData(reg.entryDate)}</span>
            </div>
            <h3 class="entry-title">${escapeHtml(reg.entrySummary)}</h3>
            <p class="entry-meta">${escapeHtml(reg.entryLocation || '')}${reg.entryCode ? ' · ' + escapeHtml(reg.entryCode) : ''}</p>
            ${reg.entryStatus === 'acompanhamento' ? '<span class="entry-status-flag">Acompanhamento pendente</span>' : ''}
        </div>
    `).join('');
}

// ------------------------------------------------------------
// Exportações
// ------------------------------------------------------------
function baixarArquivo(conteudo, nomeArquivo, mimeType) {
    const blob = new Blob([conteudo], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportarJSON() {
    if (registros.length === 0) return alert('Nenhum registro para exportar.');
    baixarArquivo(JSON.stringify(registros, null, 2), `caderno-campo-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
}

function exportarCSV() {
    if (registros.length === 0) return alert('Nenhum registro para exportar.');
    const colunas = ['entryDate', 'entryType', 'entryStatus', 'entryLocation', 'entryCode', 'entrySummary', 'entryTags', 'entryDetails'];
    const cabecalho = ['Data', 'Tipo', 'Status', 'Local', 'Código', 'Resumo', 'Tags', 'Observações'];

    const escapeCsv = (v) => {
        const s = String(v ?? '');
        return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const linhas = [cabecalho.join(';')];
    registros.forEach(reg => {
        linhas.push(colunas.map(c => escapeCsv(reg[c])).join(';'));
    });

    baixarArquivo('\uFEFF' + linhas.join('\n'), `caderno-campo-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8');
}

function exportarWord() {
    if (registros.length === 0) return alert('Nenhum registro para exportar.');

    const ordenados = [...registros].sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));

    let corpo = ordenados.map(reg => `
        <div style="margin-bottom:24px; padding-bottom:16px; border-bottom:1px solid #ccc;">
            <p style="font-size:11pt; color:#555; margin:0;">${formatarData(reg.entryDate)} — ${escapeHtml(LABELS_TIPO[reg.entryType] || reg.entryType)} — ${escapeHtml(LABELS_STATUS[reg.entryStatus] || reg.entryStatus)}</p>
            <h2 style="margin:4px 0;">${escapeHtml(reg.entrySummary)}</h2>
            <p style="margin:2px 0;"><strong>Local/Instituição:</strong> ${escapeHtml(reg.entryLocation || '—')}</p>
            <p style="margin:2px 0;"><strong>Código do caso/sujeito:</strong> ${escapeHtml(reg.entryCode || '—')}</p>
            <p style="margin:2px 0;"><strong>Tags:</strong> ${escapeHtml(reg.entryTags || '—')}</p>
            <p style="margin-top:8px; white-space:pre-wrap;">${escapeHtml(reg.entryDetails || '')}</p>
        </div>
    `).join('');

    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset="utf-8"><title>Caderno de Campo</title></head>
        <body style="font-family: Calibri, Arial, sans-serif;">
            <h1>Caderno de Campo — Paulo Xavier</h1>
            ${corpo}
        </body></html>`;

    baixarArquivo(html, `caderno-campo-${new Date().toISOString().split('T')[0]}.doc`, 'application/msword');
}

function exportarPDF() {
    if (registros.length === 0) return alert('Nenhum registro para exportar.');

    const win = window.open('', '_blank');
    if (!win) {
        alert('O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente novamente.');
        return;
    }

    const ordenados = [...registros].sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));

    let html = `<html><head><meta charset="utf-8"><style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #000; }
        .folha { border: 1px solid #000; padding: 20px; margin-bottom: 20px; page-break-after: always; }
        h1 { font-size: 18px; }
        h2 { font-size: 15px; margin: 4px 0; }
        .meta { color: #555; font-size: 11px; }
        .campo { margin: 4px 0; }
        .obs { white-space: pre-wrap; margin-top: 10px; }
    </style></head><body>`;

    ordenados.forEach(reg => {
        html += `<div class="folha">
            <p class="meta">${formatarData(reg.entryDate)} — ${escapeHtml(LABELS_TIPO[reg.entryType] || reg.entryType)} — ${escapeHtml(LABELS_STATUS[reg.entryStatus] || reg.entryStatus)}</p>
            <h2>${escapeHtml(reg.entrySummary)}</h2>
            <p class="campo"><strong>Local/Instituição:</strong> ${escapeHtml(reg.entryLocation || '—')}</p>
            <p class="campo"><strong>Código:</strong> ${escapeHtml(reg.entryCode || '—')}</p>
            <p class="campo"><strong>Tags:</strong> ${escapeHtml(reg.entryTags || '—')}</p>
            <p class="obs">${escapeHtml(reg.entryDetails || '')}</p>
        </div>`;
    });

    html += `</body></html>`;
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 500);
}

// ------------------------------------------------------------
// Importar backup (JSON)
// ------------------------------------------------------------
function importarBackup(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        let dados;
        try {
            dados = JSON.parse(e.target.result);
        } catch (err) {
            alert('Arquivo inválido. Selecione um backup .json exportado por este aplicativo.');
            return;
        }
        if (!Array.isArray(dados)) {
            alert('Formato de backup não reconhecido.');
            return;
        }

        const substituir = confirm(
            `Encontrados ${dados.length} registro(s) no backup.\n\nClique "OK" para MESCLAR com os registros atuais (mantendo os já existentes).\nClique "Cancelar" para SUBSTITUIR todos os registros atuais por este backup.`
        );

        if (substituir) {
            dados.forEach(reg => {
                if (!reg || !reg.id) reg = { ...reg, id: gerarId() };
                const idx = registros.findIndex(r => r.id === reg.id);
                if (idx >= 0) registros[idx] = reg; else registros.push(reg);
            });
        } else {
            registros = dados.map(reg => (reg && reg.id) ? reg : { ...reg, id: gerarId() });
        }

        persistir();
        renderizar();
        alert('Backup importado com sucesso.');
    };
    reader.onerror = () => alert('Não foi possível ler o arquivo selecionado.');
    reader.readAsText(file);
}

// ------------------------------------------------------------
// Inicialização de eventos
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    renderizar();

    // Formulário
    document.getElementById('entryForm').addEventListener('submit', salvarRegistro);
    document.getElementById('deleteEntryBtn').addEventListener('click', excluirRegistro);
    document.getElementById('closeModalBtn').addEventListener('click', fecharModal);
    document.getElementById('cancelModalBtn').addEventListener('click', fecharModal);

    // Fecha ao clicar fora do modal
    document.getElementById('modalBackdrop').addEventListener('click', (e) => {
        if (e.target.id === 'modalBackdrop') fecharModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') fecharModal();
    });

    // Novo registro
    document.getElementById('newEntryBtn').addEventListener('click', () => abrirModal());
    document.getElementById('emptyNewEntryBtn').addEventListener('click', () => abrirModal());

    // Busca
    document.getElementById('searchInput').addEventListener('input', (e) => {
        termoBusca = e.target.value;
        renderizar();
    });

    // Abas de filtro
    document.querySelectorAll('#filterTabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#filterTabs .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filtroAtual = tab.dataset.filter;
            renderizar();
        });
    });

    // Exportações
    document.getElementById('exportJsonBtn').addEventListener('click', exportarJSON);
    document.getElementById('exportCsvBtn').addEventListener('click', exportarCSV);
    document.getElementById('exportWordBtn').addEventListener('click', exportarWord);
    document.getElementById('exportPdfBtn').addEventListener('click', exportarPDF);

    // Importar backup
    document.getElementById('importFile').addEventListener('change', (e) => {
        importarBackup(e.target.files[0]);
        e.target.value = ''; // permite importar o mesmo arquivo de novo depois
    });
});
