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
            row.insertCell(0).innerHTML = `<div style="display:flex;align-items:center;gap:10px"><div class="file-icon pdf">${(doc.file_type || "PDF").toUpperCase()}</div><div><div style="font-weight:500">${doc.title}</div><div style="font-size:11px;color:gray">${doc.filename || ""}</div></div></div>`;
            row.insertCell(1).innerHTML = doc.category || "";
            row.insertCell(2).innerHTML = `<span class="badge badge-info">${doc.department || ""}</span>`;
            row.insertCell(3).innerHTML = doc.supplier || "—";
            const statusClass = doc.status === "en_attente" ? "badge-warning" : (doc.status === "valide" ? "badge-success" : "badge-info");
            row.insertCell(4).innerHTML = `<span class="badge ${statusClass}">${doc.status === "en_attente" ? "En attente" : (doc.status === "valide" ? "Validé" : "En validation")}</span>`;
            row.insertCell(5).innerHTML = new Date(doc.uploaded_at).toLocaleDateString("fr");
            row.insertCell(6).innerHTML = doc.file_size_kb ? `${doc.file_size_kb} KB` : "—";
            row.insertCell(7).innerHTML = `<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();viewDocument(${doc.id})">Voir</button>`;
        });
    } catch (err) { console.error(err); }
}

window.viewDocument = (id) => { currentDocId = id; showPage("consulter"); };

async function loadDocumentDetails() {
    if (!currentDocId) return;
    try {
        const doc = await fetchAPI(`/api/documents/${currentDocId}`);
        document.getElementById("doc-view-title").innerText = doc.title;
        document.getElementById("doc-view-meta").innerHTML = `${doc.department || ""} · Déposé le ${new Date(doc.uploaded_at).toLocaleDateString("fr")}`;
        const statusBadge = doc.status === "en_attente" ? "badge-warning" : (doc.status === "valide" ? "badge-success" : "badge-info");
        document.getElementById("doc-status-badge").innerHTML = `<span class="badge ${statusBadge}">${doc.status === "en_attente" ? "En attente" : (doc.status === "valide" ? "Validé" : "En validation")}</span>`;

        const metaTable = document.getElementById("doc-metadata-table");
        if (metaTable) {
            metaTable.innerHTML = `
                <tr><td style="color:gray">Type</td><td style="text-align:right">${doc.category || ""}</td></tr>
                <tr><td style="color:gray">Service</td><td style="text-align:right">${doc.department || ""}</td></tr>
                <--<tr><td style="color:gray">Fournisseur</td><td style="text-align:right">${doc.supplier || "—"}</td></tr>
                <tr><td style="color:gray">Montant</td><td style="text-align:right;font-weight:bold">${doc.amount ? doc.amount + " MGA" : "—"}</td></tr>
                <tr><td style="color:gray">Taille</td><td style="text-align:right">${doc.file_size_kb ? doc.file_size_kb + " KB" : "—"}</td></tr> -->
            `;
        }

        const previewContainer = document.getElementById("pdf-preview");
        if (!previewContainer) return;
        const fileType = (doc.file_type || "").toLowerCase();
        try {
            const blob = await fetchFileBlob(`/api/documents/${currentDocId}/file`);
            const url = URL.createObjectURL(blob);
            if (fileType === "pdf") {
                    // Try to fetch signatures and render PDF with overlays using PDF.js if available
                    try {
                        const sigs = await fetchAPI(`/api/documents/${currentDocId}/signatures`);
                        if (window.pdfjsLib && sigs && Array.isArray(sigs)) {
                            // render first page with overlays and simple paging controls
                            const container = previewContainer;
                            container.innerHTML = `
                                <div id="doc-view-controls" style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
                                    <button id="doc-prev-page" class="btn btn-sm">Préc</button>
                                    <span id="doc-page-indicator">Page 1 / 1</span>
                                    <button id="doc-next-page" class="btn btn-sm">Suiv</button>
                                </div>
                                <div id="doc-pdf-container" style="position:relative;width:100%;"></div>
                            `;
                            const pdfBlob = await fetchFileBlob(`/api/documents/${currentDocId}/file`);
                            const pdfUrl = URL.createObjectURL(pdfBlob);
                            const loadingTask = pdfjsLib.getDocument(pdfUrl);
                            const pdfDoc = await loadingTask.promise;
                            let currentPage = 1;
                            const totalPages = pdfDoc.numPages;
                            const containerCanvas = document.getElementById('doc-pdf-container');

                            async function renderPage(pageNum) {
                                const page = await pdfDoc.getPage(pageNum);
                                containerCanvas.innerHTML = '';
                                const canvas = document.createElement('canvas');
                                canvas.id = 'doc-pdf-canvas';
                                containerCanvas.appendChild(canvas);
                                const context = canvas.getContext('2d');
                                const viewport = page.getViewport({ scale: 1 });
                                const containerWidth = containerCanvas.clientWidth || 800;
                                const scale = containerWidth / viewport.width;
                                const scaledViewport = page.getViewport({ scale });
                                canvas.width = scaledViewport.width;
                                canvas.height = scaledViewport.height;
                                canvas.style.width = scaledViewport.width + 'px';
                                canvas.style.height = scaledViewport.height + 'px';
                                await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
                                // overlay signatures for this page
                                const pageSigs = sigs.filter(s => Number(s.page) === Number(pageNum));
                                pageSigs.forEach(s => {
                                    if (!s.signature_data) return;
                                    const img = document.createElement('img');
                                    img.src = s.signature_data;
                                    img.style.position = 'absolute';
                                    img.style.width = '120px';
                                    img.style.height = 'auto';
                                    img.style.zIndex = 1200;
                                    img.title = s.full_name || 'Signature';
                                    img.className = 'doc-signature-overlay';
                                    containerCanvas.appendChild(img);
                                    img.onload = () => {
                                        const x = Number(s.x) * scale;
                                        const y = Number(s.y) * scale;
                                        const imgWidth = img.width;
                                        const imgHeight = img.height;
                                        img.style.left = `${Math.max(0, Math.min(canvas.width - imgWidth, x - imgWidth / 2))}px`;
                                        img.style.top = `${Math.max(0, Math.min(canvas.height - imgHeight, canvas.height - y - imgHeight / 2))}px`;
                                    };
                                });
                                document.getElementById('doc-page-indicator').innerText = `Page ${pageNum} / ${totalPages}`;
                                document.getElementById('doc-prev-page').disabled = pageNum <= 1;
                                document.getElementById('doc-next-page').disabled = pageNum >= totalPages;
                            }

                            document.getElementById('doc-prev-page').addEventListener('click', () => { if (currentPage>1) { currentPage--; renderPage(currentPage); } });
                            document.getElementById('doc-next-page').addEventListener('click', () => { if (currentPage<totalPages) { currentPage++; renderPage(currentPage); } });
                            await renderPage(currentPage);
                            URL.revokeObjectURL(pdfUrl);
                        } else if (sigs && sigs.length === 0) {
                            // no signatures, fallback to plain iframe
                            previewContainer.innerHTML = `<iframe src="${url}" width="100%" height="550px" style="border:none;"></iframe>`;
                        } else {
                            previewContainer.innerHTML = `<iframe src="${url}" width="100%" height="550px" style="border:none;"></iframe>`;
                        }
                    } catch (e) {
                        console.error('Rendering signed PDF failed:', e);
                        previewContainer.innerHTML = `<iframe src="${url}" width="100%" height="550px" style="border:none;"></iframe>`;
                    }
                } else if (["jpg", "jpeg", "png", "gif", "webp"].includes(fileType)) {
                previewContainer.innerHTML = `<img src="${url}" style="max-width:100%; max-height:550px; display:block; margin:auto;">`;
            } else if (["txt", "csv", "log"].includes(fileType)) {
                const text = await blob.text();
                previewContainer.innerHTML = `<pre style="white-space:pre-wrap; background:#f5f5f5; padding:10px;">${escapeHtml(text)}</pre>`;
            } else {
                previewContainer.innerHTML = `<div class="pdf-page"><a href="${url}" download="${doc.filename}" class="btn btn-outline">Télécharger le fichier</a> (aperçu non disponible)</div>`;
            }
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        } catch (err) {
            previewContainer.innerHTML = `<div class="pdf-page">Impossible d'afficher le document</div>`;
        }
    } catch (err) { console.error(err); }
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