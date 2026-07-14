/**
 * DIÁRIO DE CAMPO - PAULO XAVIER (Versão Robusta)
 * Arquitetura Centralizada para máxima estabilidade.
 */

const STORAGE_KEY = 'caderno_campo_registros_px';

const App = {
    state: {
        registros: JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'),
        paginas: [''],
        idx: 0,
        editId: null
    },

    // --- PERSISTÊNCIA ---
    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state.registros));
    },

    // --- MOTOR DA UI ---
    renderList() {
        const list = document.getElementById('entryList');
        if (!list) return;
        list.innerHTML = this.state.registros.map(reg => `
            <div class="card" onclick="App.openEdit('${reg.id}')" style="cursor:pointer; padding:10px; border:1px solid #ccc; margin:5px 0;">
                <h3>${reg.entrySummary}</h3>
            </div>
        `).join('');
    },

    renderEditor() {
        const container = document.getElementById('cadernoContainer');
        if (!container) return;
        
        container.innerHTML = `
            <div class="editor-box">
                <textarea id="mainText" style="width:100%; height:300px; font-family:monospace;">${this.state.paginas[this.state.idx]}</textarea>
            </div>
            <div class="controls" style="display:flex; justify-content:space-between; margin-top:10px;">
                <button onclick="App.nav(-1)">← Anterior</button>
                <span>Pág ${this.state.idx + 1} de ${this.state.paginas.length}</span>
                <button onclick="App.nav(1)">Próximo →</button>
                <button onclick="App.addPage()">+ Nova Folha</button>
                <button onclick="App.printCurrent()" style="background:#ddd;">Imprimir Registro</button>
            </div>
        `;
    },

    // --- AÇÕES ---
    openEdit(id = null) {
        if (id) {
            const reg = this.state.registros.find(r => r.id === id);
            this.state.editId = id;
            this.state.paginas = reg.entryDetails.split('[PAGINA_BREAK]');
            document.getElementById('entrySummary').value = reg.entrySummary;
        } else {
            this.state.editId = null;
            this.state.paginas = [''];
            document.getElementById('entryForm').reset();
        }
        this.state.idx = 0;
        document.getElementById('modalBackdrop').style.display = 'flex';
        this.renderEditor();
    },

    nav(dir) {
        this.state.paginas[this.state.idx] = document.getElementById('mainText').value;
        const next = this.state.idx + dir;
        if (next >= 0 && next < this.state.paginas.length) {
            this.state.idx = next;
            this.renderEditor();
        }
    },

    addPage() {
        this.state.paginas[this.state.idx] = document.getElementById('mainText').value;
        this.state.paginas.push('');
        this.state.idx = this.state.paginas.length - 1;
        this.renderEditor();
    },

    saveRecord() {
        this.state.paginas[this.state.idx] = document.getElementById('mainText').value;
        const novo = {
            id: this.state.editId || 'id_' + Date.now(),
            entrySummary: document.getElementById('entrySummary').value,
            entryDetails: this.state.paginas.join('[PAGINA_BREAK]')
        };

        const i = this.state.registros.findIndex(r => r.id === novo.id);
        i !== -1 ? this.state.registros[i] = novo : this.state.registros.push(novo);
        
        this.save();
        document.getElementById('modalBackdrop').style.display = 'none';
        this.renderList();
    },

    printCurrent() {
        const pages = this.state.paginas;
        const html = `<html><body>${pages.map((p, i) => `
            <div style="page-break-after:always; font-family:sans-serif;">
                <h3>Página ${i+1}</h3>
                <p style="white-space:pre-wrap;">${p}</p>
            </div>`).join('')}</body></html>`;
        
        const w = window.open();
        w.document.write(html);
        w.document.close();
        w.print();
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => App.renderList());
