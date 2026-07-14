/**
 * DIÁRIO DE CAMPO - PAULO XAVIER (Versão Unificada e Segura)
 */

const STORAGE_KEY = 'caderno_campo_registros_px';

const App = {
    state: {
        registros: JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'),
        paginas: [''],
        idx: 0,
        editId: null
    },

    // --- SEGURANÇA E PERSISTÊNCIA ---
    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state.registros));
    },

    // --- LÓGICA DO EDITOR ---
    renderEditor() {
        const container = document.getElementById('cadernoContainer');
        if (!container) return;
        
        container.innerHTML = `
            <div style="padding:10px; border:1px solid #ccc;">
                <textarea id="mainText" style="width:100%; height:300px; font-family:monospace;">${this.state.paginas[this.state.idx]}</textarea>
            </div>
            <div style="margin-top:10px;">
                <button onclick="App.nav(-1)">Anterior</button>
                <span>Pág ${this.state.idx + 1}/${this.state.paginas.length}</span>
                <button onclick="App.nav(1)">Próximo</button>
                <button onclick="App.addPage()">+ Nova Folha</button>
            </div>
        `;
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

    // --- AÇÕES DO MODAL ---
    openEdit(id = null) {
        const modal = document.getElementById('modalBackdrop');
        if (!modal) { alert("Erro: Modal não encontrado."); return; }
        
        modal.style.display = 'flex';
        const form = document.getElementById('entryForm');
        if (form) form.reset();

        if (id) {
            const reg = this.state.registros.find(r => r.id === id);
            this.state.editId = id;
            this.state.paginas = reg.entryDetails.split('[PAGINA_BREAK]');
            document.getElementById('entrySummary').value = reg.entrySummary;
        } else {
            this.state.editId = null;
            this.state.paginas = [''];
        }
        this.state.idx = 0;
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

    renderList() {
        const list = document.getElementById('entryList');
        if (!list) return;
        list.innerHTML = this.state.registros.map(reg => `
            <div style="padding:10px; border-bottom:1px solid #eee; cursor:pointer;" onclick="App.openEdit('${reg.id}')">
                <strong>${reg.entrySummary}</strong>
            </div>
        `).join('');
    }
};

// --- INICIALIZAÇÃO DE SEGURANÇA ---
document.addEventListener('DOMContentLoaded', () => {
    App.renderList();
    
    // Liga o botão de novo registro com segurança
    const btn = document.getElementById('newEntryBtn');
    if (btn) btn.onclick = () => App.openEdit(null);
    
    // Liga o salvamento
    const form = document.getElementById('entryForm');
    if (form) form.onsubmit = (e) => { e.preventDefault(); App.saveRecord(); };
});
