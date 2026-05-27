// ======================== VALIDATION ========================
async function loadValidationQueue() {
    try {
        const docs = await fetchAPI("/api/documents?status=en_attente");
        const container = document.getElementById("validation-list");
        if (!container) return;
        container.innerHTML = "";
        if (docs.length === 0) {
            container.innerHTML = "<div class='card'><div class='card-body'>Aucun document en attente</div></div>";
            return;
        }
        docs.forEach(doc => {
            const card = document.createElement("div");
            card.className = "card";
            card.style.borderLeft = "4px solid var(--danger)";
            card.innerHTML = `
                <div class="card-body">
                    <div style="display:flex;gap:16px;flex-wrap:wrap">
                        <div class="file-icon pdf">${(doc.file_type || "PDF").toUpperCase()}</div>
                        <div style="flex:1">
                            <div style="font-weight:600">${doc.title}</div>
                            <div class="text-muted">${doc.department} · ${doc.supplier || ""}</div>
                        </div>
                        <div style="display:flex;gap:8px">
                            <button class="btn btn-outline btn-sm" onclick="viewDocument(${doc.id})">Consulter</button>
                            <button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger)" onclick="rejectDocument(${doc.id})">Rejeter</button>
                            <button class="btn btn-primary btn-sm" onclick="approveDocument(${doc.id})">Valider</button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) { console.error(err); }
}