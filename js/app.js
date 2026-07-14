/**
 * SISTEMA DE CADERNO DE CAMPO - COMPLETO (Listagem, Filtros, Caderno e Exportação)
 */

const STORAGE_KEY = 'caderno_campo_registros_px';
let registros = carregarDados();
let filtroAtual = 'todos';
let termoBusca = '';
let paginasEdicao = ['']; 
let paginaAtivaIndex = 0;

// Elementos DOM
const entryList = document.getElementById('entryList');
const emptyState = document.getElementById('emptyState');
const entryForm = document.getElementById('entryForm');
const modalBackdrop = document.getElementById('modalBackdrop');
const entryDetailsOriginal = document.getElementById('entryDetails');

// Injeção de Estilos
(function injetarEstilos() {
    const style = document.createElement('style');
    style.innerHTML = `
        .caderno-textarea {
            width: 100%; min-height: 350px; background: #fff; border: 1px solid #ccc;
            font-family: 'Courier New', monospace; font-size: 16px;
            color: #000000 !important; line-height: 28px; resize: vertical; padding: 10px;
        }
        .caderno-folha { background: #fdfdfd; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; }
        .caderno-btn { background: #eee; border: 1px solid #999; padding: 8px 12px; cursor: pointer; margin: 2px; }
    `;
    document.head.appendChild(style);
})();

// Lógica Básica
function carregarDados() { const d = localStorage.getItem(STORAGE_KEY); return d ? JSON.parse(d) : []; }
function salvarDados() { localStorage.setItem(STORAGE_KEY, JSON.stringify(registros)); atualizarContadores(); }

function atualizarDadosOcultos() {
    if (entryDetailsOriginal) entryDetailsOriginal.value = paginasEdicao.join('[PAGINA_BREAK]');
}

// Interface Caderno
function desenharInterfaceCaderno() {
    let container = document.getElementById('cadernoContainer') || document.createElement('div');
    container.id = 'cadernoContainer';
    if (entryDetailsOriginal) {
        entryDetailsOriginal.style.display = 'none';
        entryDetailsOriginal.parentNode.insertBefore(container, entryDetailsOriginal);
    }
    
    container.innerHTML = `
        <div class="caderno-folha">
            <textarea id="cadernoTextarea" class="caderno-textarea" placeholder="Escreva aqui..."></textarea>
        </div>
        <div>
            <button type="button" class="caderno-btn" id="btnAnterior">← Anterior</button>
            <span id="labelPag">Pág 1</span>
            <button type="button" class="caderno-btn" id="btnSeguinte">Seguinte →</button>
            <button type="button" class="caderno-btn" id="btnAdd">+ Nova Folha</button>
        </div>
    `;

    const txt = document.getElementById('cadernoTextarea');
    txt.value = paginasEdicao[paginaAtivaIndex] || '';

    txt.addEventListener('input', (e) => {
        paginasEdicao[paginaAtivaIndex] = e.target.value;
        atualizarDadosOcultos();
    });

    document.getElementById('btnAnterior').onclick = () => { if(paginaAtivaIndex > 0) { paginaAtivaIndex--; desenharInterfaceCaderno(); } };
    document.getElementById('btnSeguinte').onclick = () => {
        if(paginaAtivaIndex === paginasEdicao.length - 1) paginasEdicao.push('');
        paginaAtivaIndex++; desenharInterfaceCaderno();
    };
    document.getElementById('btnAdd').onclick = () => {
        paginasEdicao.push(''); paginaAtivaIndex = paginasEdicao.length - 1; desenharInterfaceCaderno();
    };
    document.getElementById('labelPag').textContent = `Página ${paginaAtivaIndex + 1} de ${paginasEdicao.length}`;
}

// Listagem e Renderização
function renderizar() {
    const filtrados = registros.filter(r => {
        const atende = (filtroAtual === 'todos' || r.entryType === filtroAtual);
        return atende && JSON.stringify(r).toLowerCase().includes(termoBusca);
    });
    
    if (entryList) {
        entryList.innerHTML = filtrados.map(reg => `
            <div class="entry-card" onclick="abrirModal('${reg.id}')">
                <h3>${reg.entrySummary}</h3>
                <p>${reg.entryDate}</p>
            </div>
        `).join('');
    }
}

function atualizarContadores() { /* Lógica de contagem */ }

// Abertura e Salvar
function abrirModal(id = null) {
    modalBackdrop.style.display = 'flex';
    if (id) {
        const reg = registros.find(r => r.id === id);
        paginasEdicao = (reg.entryDetails || '').split('[PAGINA_BREAK]');
    } else {
        paginasEdicao = [''];
    }
    paginaAtivaIndex = 0;
    desenharInterfaceCaderno();
}

function salvarRegistro(e) {
    e.preventDefault();
    atualizarDadosOcultos();
    const id = document.getElementById('entryId').value || 'id_' + Date.now();
    const novo = {
        id: id,
        entryType: document.getElementById('entryType').value,
        entryDate: document.getElementById('entryDate').value,
        entrySummary: document.getElementById('entrySummary').value,
        entryDetails: entryDetailsOriginal.value
    };
    const idx = registros.findIndex(r => r.id === id);
    if (idx !== -1) registros[idx] = novo; else registros.push(novo);
    salvarDados(); modalBackdrop.style.display = 'none'; renderizar();
}

// Exportação (Preto e Quebras reais)
function exportarWord() {
    let html = `<html><body style="color:#000000; font-family:Arial;">`;
    registros.forEach(r => {
        (r.entryDetails || '').split('[PAGINA_BREAK]').forEach((p) => {
            html += `<div style="color:#000000; margin-bottom:20px;">${p.replace(/\n/g, '<br>')}</div><br clear=all style='page-break-before:always'>`;
        });
    });
    html += `</body></html>`;
    const b = new Blob(['\ufeff'+html], {type:'application/msword'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'Caderno.doc'; a.click();
}

function exportarPDF() {
    const i = document.createElement('iframe'); i.style.display='none'; document.body.appendChild(i);
    let html = `<html><body style="color:#000000 !important; font-family:Arial;">`;
    registros.forEach(r => {
        (r.entryDetails || '').split('[PAGINA_BREAK]').forEach((p) => {
            html += `<div style="margin-bottom:20px; page-break-after:always; color:#000000 !important;">${p.replace(/\n/g, '<br>')}</div>`;
        });
    });
    i.contentWindow.document.write(html);
    setTimeout(() => { i.contentWindow.print(); document.body.removeChild(i); }, 500);
}
