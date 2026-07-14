// Configuração Inicial
const STORAGE_KEY = 'caderno_campo_registros_px';
let registros = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let filtroAtual = 'todos';
let termoBusca = '';
let paginasEdicao = [''];
let paginaAtivaIndex = 0;

// Garantir acesso global às funções principais para o HTML
window.abrirModal = function(id = null) {
    const modalBackdrop = document.getElementById('modalBackdrop');
    const entryForm = document.getElementById('entryForm');
    const deleteEntryBtn = document.getElementById('deleteEntryBtn');
    
    if (!modalBackdrop) return;
    modalBackdrop.style.display = 'flex';
    
    if (id) {
        const reg = registros.find(r => r.id === id);
        if (!reg) return;
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
};

function renderizar() {
    const entryList = document.getElementById('entryList');
    const emptyState = document.getElementById('emptyState');
    if (!entryList) return;

    const filtrados = registros.filter(reg => {
        const texto = `${reg.entryLocation} ${reg.entryCode} ${reg.entrySummary}`.toLowerCase();
        return (filtroAtual === 'todos' || reg.entryType === filtroAtual) && texto.includes(termoBusca);
    });

    filtrados.sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));

    entryList.style.display = filtrados.length ? 'grid' : 'none';
    if (emptyState) emptyState.style.display = filtrados.length ? 'none' : 'flex';

    entryList.innerHTML = filtrados.map(reg => `
        <div class="entry-card" onclick="abrirModal('${reg.id}')" style="cursor:pointer; border-left: 5px solid ${getCorPorTipo(reg.entryType)}; padding: 15px; background: #fff; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px;">
            <h3 style="color:#000; margin:0;">${reg.entrySummary}</h3>
            <p style="color:#333; margin: 5px 0 0 0; font-size: 13px;">${formatarData(reg.entryDate)} - ${reg.entryLocation || ''}</p>
        </div>
    `).join('');
}

function exportarPDF() {
    if (registros.length === 0) return alert("Nenhum registro.");
    const win = window.open('', '_blank');
    let html = `<html><head><style>
        body { font-family: Arial; padding: 40px; color: #000 !important; }
        .folha { border: 1px solid #000; padding: 20px; margin-bottom: 20px; page-break-after: always; }
        * { color: #000000 !important; }
    </style></head><body>`;

    registros.forEach(reg => {
        const pags = (reg.entryDetails || '').split('[PAGINA_BREAK]');
        pags.forEach(texto => html += `<div class="folha">${texto.replace(/\n/g, '<br>')}</div>`);
    });

    html += `</body></html>`;
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 500);
}

function desenharInterfaceCaderno() {
    const container = document.getElementById('cadernoContainer');
    if (!container) return;
    container.innerHTML = `
        <textarea id="cadernoTextarea" style="width:100%; height:200px; color:#000; font-family:monospace;"></textarea>
        <div style="margin-top:10px;">
            <button type="button" onclick="mudarPagina(-1)">Anterior</button>
            <button type="button" onclick="mudarPagina(1)">Seguinte</button>
            <button type="button" onclick="adicionarPagina()">+ Nova Página</button>
        </div>
    `;
    document.getElementById('cadernoTextarea').value = paginasEdicao[paginaAtivaIndex];
}

// Funções de apoio
window.mudarPagina = (dir) => {
    paginasEdicao[paginaAtivaIndex] = document.getElementById('cadernoTextarea').value;
    paginaAtivaIndex = Math.max(0, Math.min(paginasEdicao.length - 1, paginaAtivaIndex + dir));
    document.getElementById('cadernoTextarea').value = paginasEdicao[paginaAtivaIndex];
};

window.adicionarPagina = () => {
    paginasEdicao.push('');
    paginaAtivaIndex = paginasEdicao.length - 1;
    desenharInterfaceCaderno();
};

function formatarData(d) { const p = d.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; }
function getCorPorTipo(t) { return {visita:'#38bdf8', pesquisa:'#34d399', atividade:'#fbbf24'}[t] || '#64748b'; }

// Inicialização de eventos
document.addEventListener('DOMContentLoaded', renderizar);
