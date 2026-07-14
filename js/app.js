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
const modalTitle = document.getElementById('modalTitle');
const searchInput = document.getElementById('searchInput');
const filterTabs = document.getElementById('filterTabs');
const entryDetailsOriginal = document.getElementById('entryDetails');

// Botões
const exportWordBtn = document.getElementById('exportWordBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // ... [Mantenha a sua lógica de eventListeners original aqui]
    
    if (exportWordBtn) exportWordBtn.addEventListener('click', exportarWord);
    if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportarPDF);
});

// --- Funções de Exportação Robustas ---

function exportarWord() {
    if (registros.length === 0) return alert("Nenhum registro para exportar.");
    
    let htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset="utf-8"></head>
    <body>
        <h1>Relatório de Caderno de Campo</h1>`;

    registros.forEach(r => {
        htmlContent += `
        <div style="margin-bottom: 20px; border-bottom: 1px solid #000;">
            <h3>${r.entrySummary} (${formatarData(r.entryDate)})</h3>
            <p><strong>Local:</strong> ${r.entryLocation} | <strong>Caso:</strong> ${r.entryCode}</p>
        </div>`;
        
        const pags = (r.entryDetails || '').split('[PAGINA_BREAK]');
        pags.forEach((texto, i) => {
            htmlContent += `<div style="padding: 10px; border: 1px solid #ccc; margin-bottom: 5px; color: #000;">
                <strong>Página ${i + 1}:</strong><br>${texto.replace(/\n/g, '<br>')}
            </div><br clear=all style='page-break-before:always'>`;
        });
    });
    
    htmlContent += `</body></html>`;
    
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Relatorio_${new Date().toISOString().slice(0,10)}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportarPDF() {
    if (registros.length === 0) return alert("Nenhum registro para exportar.");

    // Abre uma nova janela para garantir que não é bloqueada
    const win = window.open('', '_blank');
    let html = `
    <html>
    <head>
        <title>Exportação PDF</title>
        <style>
            body { font-family: Arial, sans-serif; color: #000; padding: 40px; }
            .folha { border: 1px solid #000; padding: 20px; margin-bottom: 30px; page-break-after: always; color: #000; }
            .texto { color: #000 !important; font-family: 'Courier New', monospace; white-space: pre-wrap; font-size: 14px; }
        </style>
    </head>
    <body>`;

    registros.forEach(reg => {
        const pags = (reg.entryDetails || '').split('[PAGINA_BREAK]');
        pags.forEach((texto, i) => {
            html += `<div class="folha"><div class="texto">${texto}</div></div>`;
        });
    });

    html += `</body></html>`;
    win.document.write(html);
    win.document.close();
    
    // Pequeno atraso para garantir o render antes de imprimir
    setTimeout(() => {
        win.print();
    }, 500);
}

// --- Funções Auxiliares (Garanta que estas também estão no seu ficheiro) ---

function carregarDados() {
    const dados = localStorage.getItem(STORAGE_KEY);
    return dados ? JSON.parse(dados) : [];
}

function formatarData(d) {
    if (!d) return '';
    const p = d.split('-');
    return `${p[2]}/${p[1]}/${p[0]}`;
}

function obterDataISO() { return new Date().toISOString().slice(0, 10); }
