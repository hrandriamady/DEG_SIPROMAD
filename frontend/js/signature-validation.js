// ======================== VALIDATION & SIGNATURE (NOUVEAU) ========================
(function() {
    // Éviter les doubles inclusions
    if (window.signatureValidationLoaded) return;
    window.signatureValidationLoaded = true;

    let pdfDocumentForSignature = null;
    let currentPdfPageNumber = 1;
    let totalPdfPages = 1;
    let pdfScale = 1;
    let pendingPollIntervalId = null;
    const PENDING_POLL_MS = 15000;

    let currentDocumentForSignature = null;
    let currentSignaturesList = [];
    let userSignatureImage = null;
    let userSignatureId = null;
    let tempSignatureImageData = null;
    let selectedSignatureId = null;
    let signatureOverlay = null;
    let currentOverlayImage = null;
    let signaturePosition = null;

    // Vérifier si l'utilisateur est connecté
    function isUserLoggedIn() {
        const token = localStorage.getItem("token");
        return token !== null && token !== "";
    }

    // Récupérer l'ID utilisateur sans erreur
    function getCurrentUserId() {
        if (window.currentUser && typeof window.currentUser === 'object' && window.currentUser.id) {
            return window.currentUser.id;
        }
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const parts = token.split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(atob(parts[1]));
                    if (payload.id) return payload.id;
                    if (payload.userId) return payload.userId;
                    if (payload.sub) return payload.sub;
                }
            } catch(e) {
                console.error("Erreur décodage token:", e);
            }
        }
        console.warn("Impossible de récupérer l'ID utilisateur");
        return null;
    }

    // Récupérer la signature de l'utilisateur
    async function loadUserSignatureForValidation() {
        if (!isUserLoggedIn()) return false;
        try {
            const sig = await fetchAPI("/api/validation/signatures/user");
            if (sig && sig.signature_data) {
                userSignatureImage = sig.signature_data;
                userSignatureId = sig.id;
                return true;
            }
            userSignatureImage = null;
            userSignatureId = null;
            return false;
        } catch (e) { console.error(e); return false; }
    }

    // Charger les documents en attente
    async function loadPendingDocuments() {
        if (!isUserLoggedIn()) {
            console.log("Pas de token, chargement ignoré");
            return;
        }
        try {
            const docs = await fetchAPI("/api/validation/pending");
            const tbody = document.getElementById("validation-table-body");
            if (!tbody) return;
            tbody.innerHTML = "";
            if (!docs || docs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4">Aucun document en attente de signature</td></tr>';
                return;
            }
            docs.forEach(doc => {
                const row = tbody.insertRow();
                row.onclick = () => selectDocumentForSignature(doc);
                row.insertCell(0).innerHTML = `<strong>${escapeHtml(doc.title)}</strong>`;
                row.insertCell(1).innerText = doc.department || "";
                row.insertCell(2).innerHTML = `<span class="badge ${doc.status === 'en_attente' ? 'badge-warning' : 'badge-info'}">${doc.status === 'en_attente' ? 'À valider' : 'À signer'}</span>`;
                row.insertCell(3).innerText = new Date(doc.uploaded_at).toLocaleDateString();
            });
        } catch (err) {
            console.error('Erreur loadPendingDocuments:', err);
        }
    }

    function startPendingPolling() {
        if (pendingPollIntervalId) return;
        if (isUserLoggedIn()) loadPendingDocuments();
        pendingPollIntervalId = setInterval(() => {
            if (isUserLoggedIn()) loadPendingDocuments();
        }, PENDING_POLL_MS);
    }

    // Sélectionner un document
    async function selectDocumentForSignature(doc) {
        if (!isUserLoggedIn()) {
            showToast("Veuillez vous connecter", "error");
            return;
        }
        currentDocumentForSignature = doc;
        const previewStatus = document.getElementById("preview-status");
        if (previewStatus) previewStatus.innerHTML = doc.status === "en_attente" ? "En attente de validation" : "En attente de signature";

        currentPdfPageNumber = 1;
        pdfDocumentForSignature = null;
        pdfScale = 1;
        signaturePosition = null;
        if (currentOverlayImage) currentOverlayImage.remove();
        if (signatureOverlay) signatureOverlay.remove();
        currentOverlayImage = null;
        signatureOverlay = null;

        const container = document.getElementById("pdf-viewer-container");
        if (!container) return;
        container.innerHTML = '<div style="text-align:center;padding:20px;">Chargement du document...</div>';

        try {
            currentSignaturesList = await fetchAPI(`/api/documents/${doc.id}/signatures`);
        } catch (err) {
            console.error("Erreur chargement signatures", err);
            currentSignaturesList = [];
        }

        const fileType = (doc.file_type || "").toLowerCase();
        try {
            const blob = await fetchFileBlob(`/api/documents/${doc.id}/file`);
            const url = URL.createObjectURL(blob);
            if (fileType === "pdf" && window.pdfjsLib) {
                await loadPdfWithSignatures(url);
            } else if (["jpg", "jpeg", "png", "gif", "webp"].includes(fileType)) {
                await loadImageWithSignatures(url);
            } else {
                container.innerHTML = `<div class="pdf-page">Aperçu non disponible. <a href="${url}" target="_blank">Télécharger</a></div>`;
            }
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        } catch (err) {
            console.error(err);
            container.innerHTML = `<div class="pdf-page">Impossible d'afficher le document</div>`;
        }

        if (!userSignatureImage) await loadUserSignatureForValidation();
        if (userSignatureImage) {
            tempSignatureImageData = userSignatureImage;
            selectedSignatureId = userSignatureId;
            const validateBtn = document.getElementById("validate-final-btn");
            if (validateBtn) validateBtn.disabled = false;
            showToast("Signature prête, cliquez sur le document pour la placer", "info");
        } else {
            showToast("Aucune signature trouvée. Veuillez en créer une dans Paramètres", "error");
            const validateBtn = document.getElementById("validate-final-btn");
            if (validateBtn) validateBtn.disabled = true;
        }
    }

    async function loadPdfWithSignatures(url) {
        const loadingTask = pdfjsLib.getDocument(url);
        pdfDocumentForSignature = await loadingTask.promise;
        totalPdfPages = pdfDocumentForSignature.numPages;
        currentPdfPageNumber = 1;
        await renderPdfPageWithSignatures(currentPdfPageNumber);
        const prevBtn = document.getElementById("prev-page");
        const nextBtn = document.getElementById("next-page");
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = totalPdfPages <= 1;
        const pageIndicator = document.getElementById("page-indicator");
        if (pageIndicator) pageIndicator.innerText = `Page 1 / ${totalPdfPages}`;
        enablePlacementMode();
    }

    async function renderPdfPageWithSignatures(pageNumber) {
        if (!pdfDocumentForSignature) return;
        const page = await pdfDocumentForSignature.getPage(pageNumber);
        const container = document.getElementById("pdf-viewer-container");
        if (!container) return;
        container.innerHTML = "";

        const canvas = document.createElement("canvas");
        canvas.id = "pdf-canvas";
        canvas.style.display = "block";
        canvas.style.margin = "0 auto";
        container.appendChild(canvas);

        const context = canvas.getContext("2d");
        const viewport = page.getViewport({ scale: 1 });
        const containerWidth = container.clientWidth || 800;
        pdfScale = containerWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale: pdfScale });
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        canvas.style.width = `${scaledViewport.width}px`;
        canvas.style.height = `${scaledViewport.height}px`;

        await page.render({ canvasContext: context, viewport: scaledViewport }).promise;

        const pageSignatures = currentSignaturesList.filter(s => Number(s.page) === pageNumber);
        pageSignatures.forEach(sig => {
            if (!sig.signature_data) return;
            const img = document.createElement("img");
            img.src = sig.signature_data;
            img.style.position = "absolute";
            img.style.width = "120px";
            img.style.height = "auto";
            img.style.pointerEvents = "none";
            img.style.zIndex = "10";
            img.title = sig.full_name || "Signature";
            container.appendChild(img);
            img.onload = () => {
                const x = sig.x * pdfScale;
                const y = sig.y * pdfScale;
                const imgWidth = img.width;
                const imgHeight = img.height;
                const left = x - imgWidth / 2;
                const top = canvas.height - y - imgHeight / 2;
                img.style.left = `${left}px`;
                img.style.top = `${top}px`;
            };
        });

        const pageIndicator = document.getElementById("page-indicator");
        if (pageIndicator) pageIndicator.innerText = `Page ${pageNumber} / ${totalPdfPages}`;
        const prevBtn = document.getElementById("prev-page");
        const nextBtn = document.getElementById("next-page");
        if (prevBtn) prevBtn.disabled = pageNumber <= 1;
        if (nextBtn) nextBtn.disabled = pageNumber >= totalPdfPages;
        enablePlacementMode();
    }

    async function loadImageWithSignatures(url) {
        const container = document.getElementById("pdf-viewer-container");
        if (!container) return;
        container.innerHTML = `<img id="preview-image" src="${url}" style="max-width:100%; max-height:500px; display:block; margin:auto;">`;
        const imgElement = document.getElementById("preview-image");
        if (!imgElement) return;
        await new Promise(resolve => { imgElement.onload = resolve; });
        const pageSignatures = currentSignaturesList.filter(s => Number(s.page) === 1);
        pageSignatures.forEach(sig => {
            if (!sig.signature_data) return;
            const overlayImg = document.createElement("img");
            overlayImg.src = sig.signature_data;
            overlayImg.style.position = "absolute";
            overlayImg.style.width = "120px";
            overlayImg.style.height = "auto";
            overlayImg.style.pointerEvents = "none";
            overlayImg.style.zIndex = "10";
            overlayImg.title = sig.full_name || "Signature";
            container.appendChild(overlayImg);
            const rect = imgElement.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const naturalWidth = imgElement.naturalWidth;
            const naturalHeight = imgElement.naturalHeight;
            const scaleX = rect.width / naturalWidth;
            const scaleY = rect.height / naturalHeight;
            const x = sig.x * scaleX;
            const y = (naturalHeight - sig.y) * scaleY;
            const imgWidth = overlayImg.width;
            const imgHeight = overlayImg.height;
            const left = rect.left - containerRect.left + x - imgWidth/2;
            const top = rect.top - containerRect.top + y - imgHeight/2;
            overlayImg.style.left = `${left}px`;
            overlayImg.style.top = `${top}px`;
        });
        enablePlacementMode();
    }

    function createPlacementOverlay() {
        const viewer = document.getElementById("pdf-viewer-container");
        if (!viewer) return;
        const existing = viewer.querySelector(".signature-overlay");
        if (existing) existing.remove();
        viewer.style.position = "relative";
        const overlay = document.createElement("div");
        overlay.className = "signature-overlay";
        overlay.style.position = "absolute";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100%";
        overlay.style.height = "100%";
        overlay.style.cursor = "crosshair";
        overlay.style.zIndex = "50";
        overlay.style.backgroundColor = "transparent";
        overlay.addEventListener("click", placeSignatureOnDocument);
        viewer.appendChild(overlay);
        signatureOverlay = overlay;
    }

    function enablePlacementMode() {
        createPlacementOverlay();
    }

    function placeSignatureOnDocument(e) {
        if (!tempSignatureImageData) {
            showToast("Aucune signature chargée", "error");
            return;
        }
        const viewer = document.getElementById("pdf-viewer-container");
        const canvas = document.getElementById("pdf-canvas");
        const previewImage = document.getElementById("preview-image");
        let xPx, yPx, pageX, pageY;
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            xPx = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            yPx = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
            pageX = xPx / pdfScale;
            pageY = (canvas.height - yPx) / pdfScale;
        } else if (previewImage) {
            const rect = previewImage.getBoundingClientRect();
            xPx = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            yPx = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
            const naturalHeight = previewImage.naturalHeight || rect.height;
            const scale = rect.width / (previewImage.naturalWidth || rect.width);
            pageX = xPx / scale;
            pageY = (naturalHeight - yPx) / scale;
        } else {
            showToast("Aucun document cliquable", "error");
            return;
        }

        if (currentOverlayImage) currentOverlayImage.remove();
        const img = document.createElement("img");
        img.src = tempSignatureImageData;
        img.style.position = "absolute";
        img.style.width = "120px";
        img.style.border = "1px solid #ccc";
        img.style.boxShadow = "0 0 5px rgba(0,0,0,0.3)";
        img.style.zIndex = "100";
        img.style.pointerEvents = "none";
        viewer.style.position = "relative";
        viewer.appendChild(img);
        currentOverlayImage = img;
        img.onload = () => {
            const displayWidth = 120;
            const displayHeight = img.naturalHeight * (displayWidth / img.naturalWidth);
            const left = Math.max(0, Math.min(viewer.clientWidth - displayWidth, xPx - displayWidth / 2));
            const top = Math.max(0, Math.min(viewer.clientHeight - displayHeight, yPx - displayHeight / 2));
            img.style.left = `${left}px`;
            img.style.top = `${top}px`;
        };
        signaturePosition = {
            page: currentPdfPageNumber,
            x: Math.round(pageX),
            y: Math.round(pageY),
            signatureId: selectedSignatureId
        };
        const validateBtn = document.getElementById("validate-final-btn");
        if (validateBtn) validateBtn.disabled = false;
        showToast(`Signature placée sur la page ${currentPdfPageNumber}`, "success");
    }

    function gotoPage(pageNumber) {
        if (!pdfDocumentForSignature || pageNumber < 1 || pageNumber > totalPdfPages) return;
        currentPdfPageNumber = pageNumber;
        renderPdfPageWithSignatures(currentPdfPageNumber);
    }

    // Écouteur du bouton de validation
    document.getElementById("validate-final-btn")?.addEventListener("click", async () => {
        if (!currentDocumentForSignature) {
            showToast("Aucun document sélectionné", "error");
            return;
        }
        if (!signaturePosition || !signaturePosition.signatureId) {
            showToast("Veuillez placer une signature avant de valider", "error");
            return;
        }
        try {
            await fetchAPI(`/api/validation/${currentDocumentForSignature.id}/sign`, {
                method: "POST",
                body: JSON.stringify({
                    signature_id: signaturePosition.signatureId,
                    page: signaturePosition.page,
                    x: signaturePosition.x,
                    y: signaturePosition.y
                })
            });
            showToast(`Document signé avec succès`, "success");
            await loadPendingDocuments();
            try {
                currentSignaturesList = await fetchAPI(`/api/documents/${currentDocumentForSignature.id}/signatures`);
            } catch(e) {
                console.warn("Impossible de recharger les signatures");
            }
            if (pdfDocumentForSignature) {
                await renderPdfPageWithSignatures(currentPdfPageNumber);
            }
            if (currentOverlayImage) currentOverlayImage.remove();
            signaturePosition = null;
            const userId = getCurrentUserId();
            if (userId && currentSignaturesList && Array.isArray(currentSignaturesList)) {
                const alreadySigned = currentSignaturesList.some(sig => sig.user_id == userId);
                const validateBtn = document.getElementById("validate-final-btn");
                if (validateBtn) validateBtn.disabled = alreadySigned;
            }
        } catch (err) {
            showToast(err.message, "error");
        }
    });

    // Écouteurs de pagination
    document.getElementById("prev-page")?.addEventListener("click", () => gotoPage(currentPdfPageNumber - 1));
    document.getElementById("next-page")?.addEventListener("click", () => gotoPage(currentPdfPageNumber + 1));
    document.getElementById("add-signature-btn")?.addEventListener("click", enablePlacementMode);

    // Exposer les fonctions nécessaires globalement
    window.loadPendingDocuments = loadPendingDocuments;
    window.loadUserSignatureForValidation = loadUserSignatureForValidation;

    // Démarrer
    startPendingPolling();
})();