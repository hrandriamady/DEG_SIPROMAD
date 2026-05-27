// ======================== DASHBOARD ========================
async function loadDashboardStats() {
    try {
        const stats = await fetchAPI("/api/dashboard/stats");
        const stat_total = document.getElementById("stat-total");
        const stat_attente = document.getElementById("stat-attente");
        const stat_valides = document.getElementById("stat-valides");
        const stat_retard = document.getElementById("stat-retard");
        const stat_delai = document.getElementById("stat-delai");
        
        if (stat_total) stat_total.innerText = stats.total_documents;
        if (stat_attente) stat_attente.innerText = stats.en_attente;
        if (stat_valides) stat_valides.innerText = stats.valides;
        if (stat_retard) stat_retard.innerText = stats.en_retard;
        if (stat_delai) stat_delai.innerText = stats.delai_moyen + "j";
    } catch (err) { console.error(err); }
}

async function loadRecentDocuments() {
    try {
        const docs = await fetchAPI("/api/documents?limit=4");
        const tbody = document.getElementById("recent-docs-body");
        if (!tbody) return;
        tbody.innerHTML = "";
        docs.forEach(doc => {
            const row = tbody.insertRow();
            row.style.cursor = "pointer";
            row.onclick = () => { currentDocId = doc.id; showPage("consulter"); };
            const cell0 = row.insertCell(0);
            cell0.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><div class="file-icon pdf">${(doc.file_type || "PDF").toUpperCase()}</div><div><div style="font-weight:500">${doc.title}</div><div style="font-size:11px;color:gray">${doc.filename || ""}</div></div></div>`;
            cell0.setAttribute("data-label", "Document");
            const cell1 = row.insertCell(1);
            cell1.innerHTML = `<span style="font-size:12px">${doc.department || ""}</span>`;
            cell1.setAttribute("data-label", "Département");
            const statusClass = doc.status === "en_attente" ? "badge-warning" : (doc.status === "valide" ? "badge-success" : "badge-info");
            const cell2 = row.insertCell(2);
            cell2.innerHTML = `<span class="badge ${statusClass}">${doc.status === "en_attente" ? "En attente" : (doc.status === "valide" ? "Validé" : "En validation")}</span>`;
            cell2.setAttribute("data-label", "Statut");
            const cell3 = row.insertCell(3);
            cell3.innerHTML = new Date(doc.uploaded_at).toLocaleDateString("fr");
            cell3.setAttribute("data-label", "Date");
        });
    } catch (err) { console.error(err); }
}