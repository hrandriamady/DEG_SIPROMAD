// ======================== RECHERCHE ========================
async function searchDocuments() {
    const query = document.getElementById("search-query")?.value || document.getElementById("search-input")?.value || "";
    if (!query) {
        showToast("Veuillez entrer une recherche", "error");
        return;
    }
    try {
        const results = await fetchAPI(`/api/documents/search?q=${encodeURIComponent(query)}`);
        const container = document.getElementById("search-results");
        if (container) {
            container.innerHTML = `<div style="font-size:13px;color:gray;margin-bottom:12px">${results.length} résultat(s)</div>`;
            if (results.length === 0) {
                container.innerHTML += "<div class='card'><div class='card-body'>Aucun document trouvé</div></div>";
                return;
            }
            results.forEach(doc => {
                const div = document.createElement("div");
                div.className = "card";
                div.style.marginBottom = "12px";
                div.style.cursor = "pointer";
                const statusClass = doc.status === "en_attente" ? "badge-warning" : (doc.status === "valide" ? "badge-success" : "badge-info");
                div.innerHTML = `
                    <div class="card-body" style="display:flex;align-items:center;gap:16px">
                        <div class="file-icon pdf">${(doc.file_type || "PDF").toUpperCase()}</div>
                        <div style="flex:1">
                            <div style="font-weight:500">${doc.title}</div>
                            <div style="font-size:12px;color:gray">${doc.department || ""} · ${new Date(doc.uploaded_at).toLocaleDateString("fr")}</div>
                        </div>
                        <span class="badge ${statusClass}">${doc.status === "en_attente" ? "En attente" : (doc.status === "valide" ? "Validé" : "En validation")}</span>
                    </div>
                `;
                div.onclick = () => { currentDocId = doc.id; showPage("consulter"); };
                container.appendChild(div);
            });
        }
    } catch (err) { 
        console.error(err);
        showToast("Erreur lors de la recherche", "error");
    }
}

// ======================== ARCHIVES ========================
async function loadArchives() {
    try {
        const docs = await fetchAPI("/api/documents?status=archive&limit=50");
        const container = document.getElementById("archive-list");
        if (container) {
            container.innerHTML = "";
            if (docs.length === 0) {
                container.innerHTML = "<div class='card'><div class='card-body'>Aucun document archivé</div></div>";
                return;
            }
            docs.forEach(doc => {
                const div = document.createElement("div");
                div.className = "card";
                div.style.marginBottom = "12px";
                div.style.cursor = "pointer";
                div.innerHTML = `
                    <div class="card-body" style="display:flex;align-items:center;gap:16px;justify-content:space-between">
                        <div style="display:flex;align-items:center;gap:16px;flex:1">
                            <div class="file-icon pdf">${(doc.file_type || "PDF").toUpperCase()}</div>
                            <div>
                                <div style="font-weight:500">${doc.title}</div>
                                <div style="font-size:12px;color:gray">Archivé le ${new Date(doc.archived_at || doc.uploaded_at).toLocaleDateString("fr")}</div>
                            </div>
                        </div>
                        <div style="display:flex;gap:8px">
                            <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();restoreDocument(${doc.id})">Restaurer</button>
                            <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();currentDocId = ${doc.id}; showPage('consulter')">Voir</button>
                        </div>
                    </div>
                `;
                div.onclick = () => { currentDocId = doc.id; showPage("consulter"); };
                container.appendChild(div);
            });
        }
    } catch (err) { 
        console.error(err);
        showToast("Erreur lors du chargement des archives", "error");
    }
}

window.archiveDocument = async function (docId) {
    try {
        await fetchAPI(`/api/documents/${docId}`, {
            method: "PUT",
            body: JSON.stringify({ status: "archive" })
        });
        showToast("Document archivé");
        await loadArchives();
    } catch (err) {
        showToast(err.message, "error");
    }
};

window.restoreDocument = async function (docId) {
    try {
        await fetchAPI(`/api/documents/${docId}`, {
            method: "PUT",
            body: JSON.stringify({ status: "valide" })
        });
        showToast("Document restauré");
        await loadArchives();
    } catch (err) {
        showToast(err.message, "error");
    }
};

window.deleteDocument = async function (docId) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer définitivement ce document ?")) return;
    try {
        await fetchAPI(`/api/documents/${docId}`, { method: "DELETE" });
        showToast("Document supprimé");
        await loadArchives();
    } catch (err) {
        showToast(err.message, "error");
    }
};