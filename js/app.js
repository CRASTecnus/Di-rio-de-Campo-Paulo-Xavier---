/**
 * DIÁRIO DE CAMPO - PAULO XAVIER (CRP-20/09816)
 * Versão Final: Edição, Paginação e Impressão Independente
 */

const STORAGE_KEY = 'caderno_campo_registros_px';
let registros = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let paginasEdicao = ['']; 
let paginaAtivaIndex = 0;
let filtroAtual = 'todos';
let termoBusca = '';

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    renderizar();
    document.getElementById('newEntryBtn')?.addEventListener('click', () => abrirModal());
    document.getElementById('entryForm')?.addEventListener('submit', salvarRegistro);
});

// --- MOTOR DO CADERNO ---
function desenharInterfaceCaderno() {
    let container = document.getElementById('cadernoContainer') || document.createElement('div');
    container.id = 'cadernoContainer';
    const details = document.getElementById('entryDetails');
    if (details) {
        details.style.display = 'none';
        details.parentNode.insertBefore(container, details);
    }
    
    container.innerHTML = `
        <div style="background:#fff; border:1px solid #ccc; padding:15px; margin-bottom:10px;">
            <textarea id="cadernoTextarea" style="width:100%; height:300px; font-family:'Courier New', monospace; font-size:16px;"></textarea>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
            <button type="button" onclick="mudarPagina(-1)">Anterior</button>
            <span id="labelPag">Pág 1</span>
            <button type="button" onclick="mudarPagina(1)">Seguinte</button>
            <button type="button" onclick="novaPagina()">+ Nova Folha</button>
        </div>
    `;
    
    const txt = document.getElementById('cadernoTextarea');
    txt.value = paginasEdicao[paginaAtivaIndex] || '';
    txt.oninput = (e) => { paginasEdicao[paginaAtivaIndex] = e.target.value; };
    document.getElementById('labelPag').textContent = `Página ${paginaAtivaIndex + 1} de ${paginasEdicao.length}`;
}

function mudarPagina(dir) {
    if (paginaAtivaIndex + dir >= 0 && paginaAtivaIndex + dir < paginasEdicao.length) {
        paginaAtivaIndex += dir;
        desenharInterfaceCaderno();
    }
}

function novaPagina() {
    paginasEdicao.push('');
    paginaAtivaIndex = paginasEdicao.length - 1;
    desenharInterfaceCaderno();
}

// --- MODAL E DADOS ---
function abrirModal(id = null) {
    document.getElementById('modalBackdrop').style.display = 'flex';
    document.getElementById('entryForm').reset();
    
    if (id) {
        const reg = registros.find(r => r.id === id);
        document.getElementById('entryId').value = reg.id;
        document.getElementById('entrySummary').value = reg.entrySummary;
        paginasEdicao = (reg.entryDetails || '').split('[PAGINA_BREAK]');
    } else {
        document.getElementById('entryId').value = '';
        paginasEdicao = [''];
    }
    paginaAtivaIndex = 0;
    desenharInterfaceCaderno();
}

function salvarRegistro(e) {
    e.preventDefault();
    const id = document.getElementById('entryId').value || 'id_' + Date.now();
    const novo = {
        id: id,
        entrySummary: document.getElementById('entrySummary').value,
        entryDetails: paginasEdicao.join('[PAGINA_BREAK]')
    };
    
    const idx = registros.findIndex(r => r.id === id);
    if (idx !== -1) registros[idx] = novo; else registros.push(novo);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
    document.getElementById('modalBackdrop').style.display = 'none';
    renderizar();
}

// --- IMPRESSÃO INDEPENDENTE (A Chave para o seu pedido) ---
function imprimirRegistro() {
    const p = paginasEdicao;
    const html = `
        <html><head><style>
            @page { size: A4; margin: 20mm; }
            .folha { border: 1px solid #000; padding: 20px; margin-bottom: 20px; page-break-after: always; }
        </style></head><body>
            ${p.map((txt, i) => `<div class="folha"><h3>Página ${i+1}</h3><p>${txt.replace(/\n/g, '<br>')}</p></div>`).join('')}
        </body></html>
    `;
    const w = window.open();
    w.document.write(html);
    w.document.close();
    w.print();
}

function renderizar() {
    const list = document.getElementById('entryList');
    if (!list) return;
    list.innerHTML = registros.map(r => `
        <div style="border-bottom:1px solid #ccc; padding:10px; cursor:pointer;" onclick="abrirModal('${r.id}')">
            <strong>${r.entrySummary}</strong>
        </div>
    `).join('');
}
