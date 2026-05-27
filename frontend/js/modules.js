// ======================== WORKFLOWS ========================
async function loadWorkflows() {
    try {
        const stats = await fetchAPI("/api/workflows/stats");
        const workflowEnCours = document.getElementById("workflow-en-cours");
        const workflowBloques = document.getElementById("workflow-bloques");
        const workflowDelai = document.getElementById("workflow-delai");
        const workflowDirection = document.getElementById("workflow-direction");
        if (workflowEnCours) workflowEnCours.innerText = stats.en_cours;
        if (workflowBloques) workflowBloques.innerText = stats.bloques;
        if (workflowDelai) workflowDelai.innerText = stats.delai_moyen + "j";
        if (workflowDirection) workflowDirection.innerText = stats.direction;

        const docs = await fetchAPI("/api/workflows/documents-en-cours");
        const tbody = document.getElementById("workflow-table-body");
        if (tbody) {
            tbody.innerHTML = "";
            docs.forEach(doc => {
                const row = tbody.insertRow();
                row.insertCell(0).innerHTML = `<div><strong>${doc.title}</strong><br><small>${doc.department}</small></div>`;
                row.insertCell(1).innerText = doc.department;
                row.insertCell(2).innerHTML = `<div style="display:flex;align-items:center;gap:6px"><div style="width:8px;height:8px;border-radius:50%;background:${doc.status === 'En retard' ? 'var(--danger)' : 'var(--success)'}"></div>${doc.current_role}</div>`;
                row.insertCell(3).innerText = doc.responsable;
                row.insertCell(4).innerText = doc.days_waiting + "j";
                row.insertCell(5).innerHTML = `<span class="badge ${doc.status === 'En retard' ? 'badge-warning' : 'badge-success'}">${doc.status}</span>`;
                row.insertCell(6).innerHTML = `<button class="btn btn-primary btn-sm" onclick="showPage('validation')">Valider</button>`;
            });
        }
    } catch (err) { console.error(err); }
}

async function loadSageWorkflows() {
    try {
        const stats = await fetchAPI("/api/sage/stats");
        const sageClientsCount = document.getElementById("sage-clients-count");
        const sageFacturesCount = document.getElementById("sage-factures-count");
        const sageStocksCount = document.getElementById("sage-stocks-count");
        const sageCommandesCount = document.getElementById("sage-commandes-count");
        const sageSyncStatus = document.getElementById("sage-sync-status");
        if (sageClientsCount) sageClientsCount.innerText = stats.clients;
        if (sageFacturesCount) sageFacturesCount.innerText = stats.factures;
        if (sageStocksCount) sageStocksCount.innerText = stats.stocks;
        if (sageCommandesCount) sageCommandesCount.innerText = stats.commandes;
        if (sageSyncStatus) sageSyncStatus.innerText = `Dernière synchronisation : ${new Date(stats.lastSync).toLocaleString()}`;

        const content = document.getElementById("sage-workflows-content");
        if (content) {
            content.innerHTML = [
                { title: 'Clients', description: 'Liste des clients synchronisés depuis Sage.' },
                { title: 'Factures', description: 'Factures ERP disponibles en temps réel.' },
                { title: 'Stocks', description: 'Niveaux de stock importés de Sage.' },
                { title: 'Commandes', description: 'Commandes Sage synchronisées automatiquement.' }
            ].map(item => `
                <div class="card" style="padding:14px; background:white; border:1px solid var(--border); border-radius:12px; min-height:120px;">
                    <div style="font-weight:700; margin-bottom:8px;">${item.title}</div>
                    <div style="font-size:13px; color:var(--text-muted); line-height:1.5;">${item.description}</div>
                </div>
            `).join('');
        }
        renderSageDetails(sageDetails);
    } catch (err) {
        console.error(err);
    }
}

function renderSageDetails(details) {
    const warning = document.getElementById("sage-details-warning");
    const clientsBody = document.getElementById("sage-clients-body");
    const facturesBody = document.getElementById("sage-factures-body");
    const stocksBody = document.getElementById("sage-stocks-body");
    const commandesBody = document.getElementById("sage-commandes-body");

    if (warning) {
        warning.style.display = details.clients.length || details.factures.length || details.stocks.length || details.commandes.length ? 'none' : 'block';
    }

    const renderRows = (rows, columns) => {
        if (!rows) return '';
        return rows.map(row => `<tr>${columns.map(col => `<td>${row[col] ?? ''}</td>`).join('')}</tr>`).join('');
    };

    if (clientsBody) clientsBody.innerHTML = renderRows(details.clients, ['id', 'name']);
    if (facturesBody) facturesBody.innerHTML = renderRows(details.factures, ['id', 'reference', 'total_amount']);
    if (stocksBody) stocksBody.innerHTML = renderRows(details.stocks, ['id', 'reference', 'quantity']);
    if (commandesBody) commandesBody.innerHTML = renderRows(details.commandes, ['id', 'reference', 'status']);
}

async function syncSageData() {
    const status = document.getElementById("sage-sync-status");
    if (status) status.innerText = "Synchronisation en cours...";
    try {
        const result = await fetchAPI('/api/sage/sync', { method: 'POST' });
        sageDetails = result.data || { clients: [], factures: [], stocks: [], commandes: [] };
        if (status) status.innerText = `Dernière synchronisation : ${new Date(result.synced_at).toLocaleString()}`;
        renderSageDetails(sageDetails);
        await loadSageWorkflows();
        showToast('Synchronisation Sage terminée');
    } catch (err) {
        console.error(err);
        if (status) status.innerText = "Échec de la synchronisation.";
        showToast('Échec synchronisation Sage', 'error');
    }
}

// ======================== FINANCE DASHBOARD ========================
async function loadFinanceDashboard() {
    try {
        const docs = await fetchAPI("/api/documents?category=Facture&limit=1000");
        let valides = 0, attente = 0, rejetees = 0;
        docs.forEach(d => {
            if (d.status === "valide") valides++;
            else if (d.status === "en_attente") attente++;
            else if (d.status === "rejete") rejetees++;
        });
        const finDocs = document.getElementById("finance-docs");
        const finAttente = document.getElementById("finance-factures-attente");
        const finValidations = document.getElementById("finance-validations");
        const finPaiements = document.getElementById("finance-paiements");
        if (finDocs) finDocs.innerText = docs.length;
        if (finAttente) finAttente.innerText = attente;
        if (finValidations) finValidations.innerText = valides;
        if (finPaiements) finPaiements.innerText = "0";

        const lastDocs = await fetchAPI("/api/documents?category=Facture&limit=4");
        const container = document.getElementById("finance-invoices-table");
        if (container) {
            container.innerHTML = "";
            lastDocs.forEach(doc => {
                const div = document.createElement("div");
                div.className = "doc-card";
                div.onclick = () => { currentDocId = doc.id; showPage("consulter"); };
                div.innerHTML = `<div class="file-icon pdf">PDF</div><div style="flex:1"><div style="font-size:13px;font-weight:500">${doc.title}</div><div style="font-size:11px;color:gray">${doc.amount ? doc.amount + " MGA" : ""}</div></div><span class="badge ${doc.status === 'en_attente' ? 'badge-warning' : 'badge-success'}">${doc.status === 'en_attente' ? 'Attente' : 'Validée'}</span>`;
                container.appendChild(div);
            });
        }

        if (charts.finance) charts.finance.destroy();
        const ctx = document.getElementById('chartFinance');
        if (ctx) {
            charts.finance = new Chart(ctx, {
                type: 'doughnut',
                data: { labels: ['Validées', 'En attente', 'Rejetées'], datasets: [{ data: [valides, attente, rejetees], backgroundColor: ['#0D9E6E', '#E67E22', '#D63B3B'], borderWidth: 0, hoverOffset: 6 }] },
                options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
            });
        }
    } catch (err) { console.error(err); }
}

// ======================== FOURNISSEURS ========================
async function loadFournisseurs() {
    try {
        const fournisseurs = await fetchAPI("/api/fournisseurs");
        const tbody = document.getElementById("fournisseurs-table-body");
        if (!tbody) return;
        tbody.innerHTML = "";
        fournisseurs.forEach(f => {
            const row = tbody.insertRow();
            row.insertCell(0).innerHTML = `<div style="font-weight:500">${f.name}</div><div style="font-size:11px">${f.secteur || ""}</div>`;
            row.insertCell(1).innerText = f.total_documents;
            row.insertCell(2).innerHTML = `<span style="color:var(--warning)">${f.en_attente}</span>`;
            row.insertCell(3).innerText = f.valides;
            row.insertCell(4).innerText = f.avg_delay_days + "j";
            row.insertCell(5).innerHTML = `<span class="badge badge-success">${f.statut}</span>`;
        });
    } catch (err) { console.error(err); }
}

// ======================== PROJETS ========================
async function loadProjets() {
    try {
        const projets = await fetchAPI("/api/projets");
        const container = document.getElementById("projets-list");
        if (!container) return;
        container.innerHTML = "";
        projets.forEach(p => {
            const card = document.createElement("div");
            card.className = "card";
            card.style.borderLeft = `4px solid var(--${p.statut === "Terminé" ? "success" : "accent"})`;
            card.innerHTML = `
                <div class="card-body">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
                        <div><div style="font-weight:600;font-size:15px">${p.nom}</div><div style="font-size:12px;color:var(--text-muted)">${p.statut}</div></div>
                        <span class="badge ${p.statut === "Terminé" ? "badge-success" : "badge-info"}">${p.statut}</span>
                    </div>
                    <div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>Avancement</span><span>${p.avancement}%</span></div>
                    <div class="progress"><div class="progress-fill" style="width:${p.avancement}%;background:var(--accent)"></div></div></div>
                    <div class="metric-row"><div class="metric-mini"><div class="metric-mini-val">${p.documents}</div><div class="metric-mini-label">Documents</div></div>
                    <div class="metric-mini"><div class="metric-mini-val">${p.en_attente}</div><div class="metric-mini-label">En attente</div></div>
                    <div class="metric-mini"><div class="metric-mini-val">${p.documents - p.valides}</div><div class="metric-mini-label">Manquants</div></div></div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) { console.error(err); }
}

// ======================== AUDIT ========================
async function loadAuditLogs() {
    try {
        const logs = await fetchAPI("/api/audit/logs?limit=50");
        const tbody = document.getElementById("audit-table-body");
        if (!tbody) return;
        tbody.innerHTML = "";
        logs.forEach(log => {
            const row = tbody.insertRow();
            row.insertCell(0).innerHTML = new Date(log.created_at).toLocaleString();
            row.insertCell(1).innerHTML = `<div style="display:flex;align-items:center;gap:6px"><div class="avatar" style="width:24px;height:24px;background:${log.user_avatar}">${log.user_initials}</div><span>${log.user_name}</span></div>`;
            const actionClass = log.action === "VALIDATION" ? "badge-success" : (log.action === "REJET" ? "badge-danger" : "badge-info");
            row.insertCell(2).innerHTML = `<span class="badge ${actionClass}">${log.action}</span>`;
            row.insertCell(3).innerText = log.document_title || "—";
            row.insertCell(4).innerText = log.ip_address || "—";
            row.insertCell(5).innerHTML = `<span style="color:var(--success)">✓ OK</span>`;
        });
    } catch (err) { console.error(err); }
}

async function loadAuditStats() {
    try {
        const stats = await fetchAPI("/api/audit/stats");
        const auditActions = document.getElementById("audit-actions");
        const auditUsers = document.getElementById("audit-users");
        const auditPlanifies = document.getElementById("audit-planifies");
        if (auditActions) auditActions.innerText = stats.total_actions;
        if (auditUsers) auditUsers.innerText = stats.total_users;
        if (auditPlanifies) auditPlanifies.innerText = stats.audits_planifies;
    } catch (err) { console.error(err); }
}