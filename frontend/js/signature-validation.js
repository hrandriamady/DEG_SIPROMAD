// ======================== VALIDATION & SIGNATURE (NOUVEAU) ========================
let pdfDocumentForSignature = null;
let currentPdfPageNumber = 1;
let totalPdfPages = 1;
let pdfScale = 1;
let pendingPollIntervalId = null;
const PENDING_POLL_MS = 15000; // 15s

async function loadUserSignatureForValidation() {
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

async function loadPendingDocuments() {
    try {
        const docs = await fetchAPI("/api/validation/pending");
        const tbody = document.getElementById("validation-table-body");
        if (!tbody) return;
        tbody.innerHTML = "";
        let aValider = 0, aSigner = 0;
        docs.forEach(doc => {
            if (doc.status === "en_attente") aValider++;
            if (doc.status === "en_validation") aSigner++;
            const row = tbody.insertRow();
            row.onclick = () => selectDocumentForSignature(doc);
            row.insertCell(0).innerHTML = `<strong>${escapeHtml(doc.title)}</strong>`;
            row.insertCell(1).innerText = doc.department || "";
            row.insertCell(2).innerHTML = `<span class="badge ${doc.status === 'en_attente' ? 'badge-warning' : 'badge-info'}">${doc.status === 'en_attente' ? 'À valider' : 'À signer'}</span>`;
            row.insertCell(3).innerText = new Date(doc.uploaded_at).toLocaleDateString();
        });
        document.getElementById("stats-a-valider").innerText = aValider;
        document.getElementById("stats-a-signer").innerText = aSigner;
        document.getElementById("last-update").innerText = new Date().toLocaleTimeString();
    } catch (err) { console.error(err); }
}

function startPendingPolling() {
    if (pendingPollIntervalId) return;
    // initial load
    loadPendingDocuments();
    pendingPollIntervalId = setInterval(() => {
        loadPendingDocuments();
    }, PENDING_POLL_MS);
}

function stopPendingPolling() {
    if (!pendingPollIntervalId) return;
    clearInterval(pendingPollIntervalId);
    pendingPollIntervalId = null;
}

async function selectDocumentForSignature(doc) {
    currentDocumentForSignature = doc;
    const container = document.getElementById("pdf-viewer-container");
    document.getElementById("preview-status").innerHTML = doc.status === "en_attente" ? "En attente de validation" : "En attente de signature";

    currentPdfPageNumber = 1;
    totalPdfPages = 1;
    pdfDocumentForSignature = null;
    pdfScale = 1;
    document.getElementById("page-indicator").innerText = "Page 1 / 1";
    document.getElementById("prev-page").disabled = true;
    document.getElementById("next-page").disabled = true;

    container.innerHTML = "";
    if (currentOverlayImage) currentOverlayImage.remove();
    currentOverlayImage = null;
    if (signatureOverlay) {
        signatureOverlay.remove();
        signatureOverlay = null;
    }
    const previewDiv = document.getElementById("document-preview");
    previewDiv.style.cursor = "default";
    signaturePosition = null;

    const fileType = (doc.file_type || "").toLowerCase();
    try {
        const blob = await fetchFileBlob(`/api/documents/${doc.id}/file`);
        const url = URL.createObjectURL(blob);
        if (fileType === "pdf" && window.pdfjsLib) {
            await loadPdfDocument(url);
        } else if (["jpg", "jpeg", "png", "gif", "webp"].includes(fileType)) {
            container.innerHTML = `<img id="preview-image" src="${url}" style="max-width:100%; max-height:500px; display:block; margin:auto;">`;
        } else {
            container.innerHTML = `<div class="pdf-page">Aperçu non disponible. <a href="${url}" target="_blank">Télécharger</a></div>`;
        }
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="pdf-page">Impossible d'afficher le document</div>`;
    }

    if (!userSignatureImage) {
        await loadUserSignatureForValidation();
    }
    if (userSignatureImage) {
        tempSignatureImageData = userSignatureImage;
        selectedSignatureId = userSignatureId;
        showToast("Signature prête, cliquez sur le document pour la placer");
        enablePlacementMode();
        document.getElementById("validate-final-btn").disabled = false;
    } else {
        showToast("Aucune signature trouvée. Veuillez en créer une dans Paramètres", "error");
        document.getElementById("validate-final-btn").disabled = true;
    }
}

function placeSignatureOnDocument(e) {
    if (!tempSignatureImageData) {
        showToast("Aucune signature chargée", "error");
        return;
    }
    if (signatureOverlay) {
        signatureOverlay.remove();
        signatureOverlay = null;
    }
    const viewer = document.getElementById("pdf-viewer-container");
    const canvas = document.getElementById("pdf-canvas");
    const previewImage = document.getElementById("preview-image");
    let xPx;
    let yPx;
    let relativeScale = 1;

    let pageX;
    let pageY;
    if (canvas) {
        const rect = canvas.getBoundingClientRect();
        xPx = e.clientX - rect.left;
        yPx = e.clientY - rect.top;
        xPx = Math.max(0, Math.min(xPx, rect.width));
        yPx = Math.max(0, Math.min(yPx, rect.height));
        relativeScale = pdfScale;
        pageX = xPx / relativeScale;
        pageY = (canvas.height - yPx) / relativeScale;
    } else if (previewImage) {
        const rect = previewImage.getBoundingClientRect();
        xPx = e.clientX - rect.left;
        yPx = e.clientY - rect.top;
        xPx = Math.max(0, Math.min(xPx, rect.width));
        yPx = Math.max(0, Math.min(yPx, rect.height));
        const naturalWidth = previewImage.naturalWidth || rect.width;
        const naturalHeight = previewImage.naturalHeight || rect.height;
        relativeScale = rect.width / naturalWidth || 1;
        pageX = xPx / relativeScale;
        pageY = (naturalHeight - yPx) / relativeScale;
    } else {
        showToast("Aucun document cliquable disponible", "error");
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
        signatureId: selectedSignatureId,
        signatureImage: tempSignatureImageData
    };
    document.getElementById("validate-final-btn").disabled = false;
    showToast("Signature placée, vous pouvez valider");
}

async function loadPdfDocument(url) {
    try {
        const loadingTask = pdfjsLib.getDocument(url);
        pdfDocumentForSignature = await loadingTask.promise;
        totalPdfPages = pdfDocumentForSignature.numPages;
        currentPdfPageNumber = 1;
        await renderPdfPage(currentPdfPageNumber);
        document.getElementById("prev-page").disabled = true;
        document.getElementById("next-page").disabled = totalPdfPages <= 1;
        document.getElementById("page-indicator").innerText = `Page ${currentPdfPageNumber} / ${totalPdfPages}`;
    } catch (err) {
        console.error(err);
        document.getElementById("pdf-viewer-container").innerHTML = `<div class="pdf-page">Impossible d'afficher le PDF</div>`;
    }
}

async function renderPdfPage(pageNumber) {
    if (!pdfDocumentForSignature) return;
    const page = await pdfDocumentForSignature.getPage(pageNumber);
    const container = document.getElementById("pdf-viewer-container");
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

    const renderContext = {
        canvasContext: context,
        viewport: scaledViewport
    };
    await page.render(renderContext).promise;
    renderPageControls();
    enablePlacementMode();
}

function renderPageControls() {
    document.getElementById("page-indicator").innerText = `Page ${currentPdfPageNumber} / ${totalPdfPages}`;
    document.getElementById("prev-page").disabled = currentPdfPageNumber <= 1;
    document.getElementById("next-page").disabled = currentPdfPageNumber >= totalPdfPages;
}

function gotoPage(pageNumber) {
    if (!pdfDocumentForSignature || pageNumber < 1 || pageNumber > totalPdfPages) return;
    currentPdfPageNumber = pageNumber;
    renderPdfPage(currentPdfPageNumber);
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

function disablePlacementMode() {
    if (signatureOverlay) {
        signatureOverlay.remove();
        signatureOverlay = null;
    }
}

document.getElementById("prev-page")?.addEventListener("click", () => gotoPage(currentPdfPageNumber - 1));
document.getElementById("next-page")?.addEventListener("click", () => gotoPage(currentPdfPageNumber + 1));
document.getElementById("add-signature-btn")?.addEventListener("click", enablePlacementMode);

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
        showToast("Document signé avec succès");
        await loadPendingDocuments();
        document.getElementById("pdf-viewer-container").innerHTML = "<div class='pdf-page'>Document signé</div>";
        document.getElementById("validate-final-btn").disabled = true;
        currentDocumentForSignature = null;
        if (currentOverlayImage) currentOverlayImage.remove();
        signaturePosition = null;
    } catch (err) {
        showToast(err.message, "error");
    }
});

// Start polling for pending documents to keep the page dynamic
startPendingPolling();