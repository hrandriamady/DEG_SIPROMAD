// ======================== DOCUMENTS ========================

async function loadAllDocuments() {
    try {
        const docs = await fetchAPI("/api/documents?limit=100");
        const tbody = document.getElementById("docs-table-body");
        if (!tbody) return;
        tbody.innerHTML = "";
        docs.forEach(doc => {
            const row = tbody.insertRow();
            row.onclick = () => { currentDocId = doc.id; showPage("consulter"); };
            row.insertCell(0).innerHTML = `<div style="display:flex;align-items:center;gap:10px"><div class="file-icon pdf">${(doc.file_type || "PDF").toUpperCase()}</div><div><div style="font-weight:500">${doc.title}</div></div></div>`;
            row.insertCell(1).innerHTML = `<span class="badge badge-info">${doc.department || ""}</span>`;
            const statusClass = doc.status === "en_attente" ? "badge-warning" : (doc.status === "signe" ? "badge-success" : "badge-info");
            const statusText = doc.status === "en_attente" ? "En attente" : (doc.status === "signe" ? "Signé" : "En validation");
            row.insertCell(2).innerHTML = `<span class="badge ${statusClass}">${statusText}</span>`;
            row.insertCell(3).innerHTML = new Date(doc.uploaded_at).toLocaleDateString("fr");
            row.insertCell(4).innerHTML = `<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();viewDocument(${doc.id})">Voir</button>`;
        });
    } catch (err) { console.error(err); }
}

window.viewDocument = (id) => { currentDocId = id; showPage("consulter"); };

// ======================== CIRCUIT DE VALIDATION ========================

function displayValidationCircuit(validators, docStatus, uploadedBy, uploadedAt) {
    const container = document.getElementById("doc-validation-circuit");
    if (!container) return;
    
    const depositStep = {
        name: uploadedBy?.full_name || "Déposant",
        firstName: (uploadedBy?.full_name || "Déposant").split(' ')[0],
        signed: true,
        signed_at: uploadedAt,
        isDeposit: true
    };
    
    const allSteps = [depositStep, ...validators];
    
    let activeStepIndex = 0;
    for (let i = 0; i < allSteps.length; i++) {
        if (!allSteps[i].signed) {
            activeStepIndex = i;
            break;
        }
        activeStepIndex = allSteps.length;
    }
    
    const allSigned = allSteps.every(v => v.signed);
    const currentStep = allSteps.filter(v => v.signed).length;
    
    let html = `
        <div style="margin-bottom: 15px; overflow-x: auto; padding-bottom: 8px;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; min-width: 400px;">
    `;
    
    allSteps.forEach((step, index) => {
        const isCompleted = step.signed;
        const isActive = !isCompleted && (index === activeStepIndex);
        const isLast = index === allSteps.length - 1;
        
        let stepColor = "";
        let icon = "";
        
        let displayName = step.firstName || step.name?.split(' ')[0] || step.name || "?";
        if (displayName.length > 12) displayName = displayName.substring(0, 10) + '...';
        
        if (isCompleted) {
            stepColor = "#10b981";
            icon = "✓";
        } else if (isActive) {
            stepColor = "#3b82f6";
            icon = "⏳";
        } else {
            stepColor = "#e2e8f0";
            icon = "○";
        }
        
        let statusText = "";
        let statusColor = "";
        
        if (step.isDeposit) {
            statusText = "Terminé";
            statusColor = "#10b981";
        } else if (isCompleted) {
            statusText = "Signé";
            statusColor = "#10b981";
        } else if (isActive) {
            statusText = "En cours";
            statusColor = "#3b82f6";
        } else {
            statusText = "En attente";
            statusColor = "#94a3b8";
        }
        
        html += `
            <div style="flex: 1; text-align: center; min-width: 80px;">
                <div style="position: relative;">
                    <div style="
                        width: 36px;
                        height: 36px;
                        margin: 0 auto 6px auto;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: ${isCompleted ? '16px' : '14px'};
                        background: ${stepColor};
                        color: ${isCompleted || isActive ? 'white' : '#64748b'};
                        border: ${isActive ? '2px solid #3b82f6' : 'none'};
                        box-shadow: ${isActive ? '0 0 0 2px rgba(59,130,246,0.2)' : 'none'};
                    ">
                        ${icon}
                    </div>
                    <div style="font-weight: 500; font-size: 11px; color: ${isActive ? '#1a73e8' : '#475569'}; line-height: 1.3;">
                        ${displayName}
                    </div>
                    <div style="font-size: 9px; margin-top: 4px; font-weight: 500; color: ${statusColor};">
                        ${statusText}
                    </div>
                </div>
            </div>
        `;
        
        if (!isLast) {
            html += `
                <div style="flex: 0 0 20px; text-align: center; margin-bottom: 24px;">
                    <svg width="14" height="10" viewBox="0 0 24 24" fill="none" stroke="${isCompleted ? '#10b981' : '#cbd5e1'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                </div>
            `;
        }
    });
    
    html += `
            </div>
        </div>
        <div style="margin-top: 10px; padding: 8px 12px; background: #f8fafc; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <div>
                <span style="font-size: 10px; color: var(--text-muted);">Statut</span>
                <div style="font-weight: 500; color: ${allSigned ? '#10b981' : '#3b82f6'}; font-size: 11px;">
                    ${allSigned ? '✅ Document complété' : `⏳ Étape ${currentStep}/${allSteps.length}`}
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

async function loadValidationCircuit(docId) {
    try {
        const doc = await fetchAPI(`/api/documents/${docId}`);
        const signatures = await fetchAPI(`/api/documents/${docId}/signatures`);
        
        // ✅ CORRECTION: Récupérer le vrai nom du déposant depuis l'API users
        let uploadedByName = "Déposant";
        let uploadedByFirstName = "Déposant";
        
        try {
            const uploader = await fetchAPI(`/api/users/${doc.uploaded_by}`);
            if (uploader && uploader.full_name) {
                uploadedByName = uploader.full_name;
                uploadedByFirstName = uploader.full_name.split(' ')[0];
            } else if (doc.uploaded_by_name) {
                uploadedByName = doc.uploaded_by_name;
                uploadedByFirstName = doc.uploaded_by_name.split(' ')[0];
            }
        } catch (e) {
            console.warn("Impossible de récupérer le nom du déposant via API, utilisation de doc.uploaded_by_name");
            if (doc.uploaded_by_name) {
                uploadedByName = doc.uploaded_by_name;
                uploadedByFirstName = doc.uploaded_by_name.split(' ')[0];
            }
        }
        
        const uploadedBy = {
            full_name: uploadedByName,
            first_name: uploadedByFirstName,
            id: doc.uploaded_by
        };
        
        // Récupérer la liste des IDs des validateurs
        const validatorIds = doc.doc_metadata?.validators || [];
        
        if (validatorIds.length === 0) {
            document.getElementById("doc-validation-circuit").innerHTML = `
                <div style="text-align: center; padding: 12px; color: var(--text-muted); background: #f8fafc; border-radius: 6px;">
                    <span style="font-size: 11px;">📋 Aucun validateur désigné</span>
                </div>
            `;
            return;
        }
        
        // ✅ CORRECTION: Construire la liste des validateurs avec leurs vrais noms
        const validators = [];
        
        for (let i = 0; i < validatorIds.length; i++) {
            const validatorId = validatorIds[i];
            const signature = signatures.find(s => s.user_id == validatorId);
            
            let validatorName = `Validateur ${i + 1}`;
            let validatorFirstName = `V${i + 1}`;
            
            // Essayer de récupérer depuis la signature d'abord (contient déjà le nom)
            if (signature && signature.full_name) {
                validatorName = signature.full_name;
                validatorFirstName = signature.full_name.split(' ')[0];
                console.log(`Validateur ${i+1} trouvé dans signature:`, validatorName);
            } else {
                // Sinon, récupérer depuis l'API users
                try {
                    const user = await fetchAPI(`/api/users/${validatorId}`);
                    if (user && user.full_name) {
                        validatorName = user.full_name;
                        validatorFirstName = user.full_name.split(' ')[0];
                        console.log(`Validateur ${i+1} récupéré depuis API:`, validatorName);
                    }
                } catch (e) {
                    console.warn(`Impossible de récupérer l'utilisateur ${validatorId}:`, e);
                }
            }
            
            validators.push({
                id: validatorId,
                name: validatorName,
                firstName: validatorFirstName,
                signed: !!signature,
                signed_at: signature?.signed_at
            });
        }
        
        console.log("Déposant:", uploadedBy);
        console.log("Validateurs:", validators);
        
        displayValidationCircuit(validators, doc.status, uploadedBy, doc.uploaded_at);
        
    } catch (err) {
        console.error("Erreur chargement circuit:", err);
        const container = document.getElementById("doc-validation-circuit");
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 12px; color: var(--danger); background: #fef2f2; border-radius: 6px;">
                    <span style="font-size: 11px;">⚠️ Impossible de charger le circuit</span>
                </div>
            `;
        }
    }
}
// ======================== CHARGEMENT DES DÉTAILS ========================
// ======================== CHARGEMENT DES DÉTAILS ========================

async function loadDocumentDetails() {
    if (!currentDocId) return;
    try {
        const doc = await fetchAPI(`/api/documents/${currentDocId}`);
        
        const statusClass = doc.status === "en_attente" ? "badge-warning" : (doc.status === "signe" ? "badge-success" : "badge-info");
        const statusText = doc.status === "en_attente" ? "En attente" : (doc.status === "signe" ? "Signé" : "En validation");
        const statusBadge = document.getElementById("doc-status-badge");
        if (statusBadge) {
            statusBadge.innerHTML = `<span class="badge ${statusClass}">${statusText}</span>`;
        }

        const metaTable = document.getElementById("doc-metadata-table");
        if (metaTable) {
            metaTable.innerHTML = `
                <tr><td style="color:gray">Service</td><td style="text-align:right">${doc.department || ""}</td></tr>
                <tr><td style="color:gray">Déposé par</td><td style="text-align:right">${doc.uploaded_by_name || "—"}</td></tr>
                <tr><td style="color:gray">Date dépôt</td><td style="text-align:right">${new Date(doc.uploaded_at).toLocaleString("fr")}</td></tr>
            `;
        }

        await loadValidationCircuit(currentDocId);

        const previewContainer = document.getElementById("pdf-preview");
        if (!previewContainer) return;
        
        const fileType = (doc.file_type || "").toLowerCase();
        
        try {
            if (fileType === "pdf") {
                // Afficher un indicateur de chargement
                previewContainer.innerHTML = `<div style="height:70vh;display:flex;align-items:center;justify-content:center;">Chargement du document...</div>`;
                
                // Récupérer le token
                const token = localStorage.getItem("token");
                
                console.log("Token trouvé:", token ? "Oui" : "Non");
                
                if (!token) {
                    previewContainer.innerHTML = `<div style="height:70vh;display:flex;align-items:center;justify-content:center;color:var(--danger);">⚠️ Veuillez vous reconnecter</div>`;
                    return;
                }
                
                const url = `${API_BASE}/api/documents/${currentDocId}/signed?t=${Date.now()}`;
                console.log("URL appelée:", url);
                
                const response = await fetch(url, {
                    headers: { 
                        "Authorization": `Bearer ${token}`
                    }
                });
                
                console.log("Statut réponse:", response.status);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("Erreur réponse:", errorText);
                    
                    if (response.status === 401) {
                        previewContainer.innerHTML = `<div style="height:70vh;display:flex;align-items:center;justify-content:center;color:var(--danger);">🔒 Session expirée, veuillez vous reconnecter</div>`;
                    } else {
                        previewContainer.innerHTML = `<div style="height:70vh;display:flex;align-items:center;justify-content:center;color:var(--danger);">❌ Erreur ${response.status}: Impossible de charger le document</div>`;
                    }
                    return;
                }
                
                const blob = await response.blob();
                console.log("Taille du blob:", blob.size, "bytes");
                
                if (blob.size === 0) {
                    previewContainer.innerHTML = `<div style="height:70vh;display:flex;align-items:center;justify-content:center;color:var(--danger);">📄 Le document est vide</div>`;
                    return;
                }
                
                const blobUrl = URL.createObjectURL(blob);
                previewContainer.innerHTML = `<iframe src="${blobUrl}" style="width:100%;height:70vh;border:none;"></iframe>`;
                
                setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
                
            } else if (["jpg", "jpeg", "png", "gif", "webp"].includes(fileType)) {
                const token = localStorage.getItem("token");
                const response = await fetch(`${API_BASE}/api/documents/${currentDocId}/file`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                previewContainer.innerHTML = `<img src="${url}" style="width:100%;height:auto;max-height:70vh;object-fit:contain;">`;
                setTimeout(() => URL.revokeObjectURL(url), 10000);
            } else {
                const token = localStorage.getItem("token");
                const response = await fetch(`${API_BASE}/api/documents/${currentDocId}/file`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                previewContainer.innerHTML = `<div style="height:70vh;display:flex;align-items:center;justify-content:center;"><a href="${url}" download="${doc.filename}" class="btn btn-outline">📥 Télécharger le fichier</a></div>`;
                setTimeout(() => URL.revokeObjectURL(url), 10000);
            }
        } catch (err) {
            console.error("Erreur détaillée:", err);
            previewContainer.innerHTML = `<div style="height:70vh;display:flex;align-items:center;justify-content:center;color:var(--danger);">⚠️ Erreur: ${err.message}</div>`;
        }
    } catch (err) { 
        console.error("Erreur loadDocumentDetails:", err); 
    }
}
window.approveDocument = async function (docId) {
    try {
        await fetchAPI(`/api/documents/${docId}/validate`, { method: "PUT", body: JSON.stringify({ action: "approuve", comment: "Validé" }) });
        showToast("Document validé");
        await loadValidationQueue();
        await loadDashboardStats();
        await loadRecentDocuments();
        if (window.location.hash === "#validation") loadValidationQueue();
    } catch (err) { showToast(err.message, "error"); }
};

window.rejectDocument = async function (docId) {
    try {
        await fetchAPI(`/api/documents/${docId}/validate`, { method: "PUT", body: JSON.stringify({ action: "rejete", comment: "Rejeté" }) });
        showToast("Document rejeté");
        await loadValidationQueue();
        await loadDashboardStats();
        await loadRecentDocuments();
    } catch (err) { showToast(err.message, "error"); }
};

window.downloadDocument = async function () {
    if (!currentDocId) {
        showToast("Aucun document sélectionné", "error");
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/api/documents/${currentDocId}/signed`, {
            headers: { "Authorization": `Bearer ${authToken}` }
        });
        if (!response.ok) throw new Error("Erreur téléchargement");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `document_signe_${currentDocId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Téléchargement démarré");
    } catch (err) { showToast(err.message, "error"); }
};