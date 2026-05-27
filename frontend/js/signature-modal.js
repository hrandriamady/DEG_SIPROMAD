// Handlers for signature modal (supports pointer events for touch/tablet)
function initSignatureModalHandlers() {
    const canvas = document.getElementById("signature-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let drawing = false;

    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        if (e.touches && e.touches.length) {
            return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        }
        // pointer events and mouse
        return { x: (e.clientX || e.pageX || 0) - rect.left, y: (e.clientY || e.pageY || 0) - rect.top };
    };

    const startDraw = (e) => { e.preventDefault(); drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const draw = (e) => { if (drawing) { e.preventDefault(); const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); } };
    const stopDraw = (e) => { if (drawing) { e.preventDefault(); drawing = false; } };

    canvas.addEventListener('pointerdown', startDraw);
    canvas.addEventListener('pointermove', draw);
    canvas.addEventListener('pointerup', stopDraw);
    canvas.addEventListener('pointercancel', stopDraw);
    canvas.addEventListener('pointerleave', stopDraw);

    canvas.addEventListener('touchstart', startDraw);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDraw);

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);

    document.getElementById("clear-signature")?.addEventListener("click", () => ctx.clearRect(0, 0, canvas.width, canvas.height));

    document.getElementById("save-signature")?.addEventListener("click", async () => {
        const isEmpty = ctx.getImageData(0, 0, canvas.width, canvas.height).data.every(c => c === 0);
        if (isEmpty) {
            showToast("Veuillez dessiner une signature", "error");
            return;
        }
        const imageData = canvas.toDataURL("image/png");
        try {
            await fetchAPI("/api/validation/signatures/save", {
                method: "POST",
                body: JSON.stringify({ image_data: imageData, name: "Modal signature" })
            });
            showToast("Signature enregistrée avec succès");
            // refresh saved signature
            if (typeof loadUserSignature === 'function') await loadUserSignature();
            document.getElementById('signature-modal').style.display = 'none';
        } catch (err) {
            showToast(err.message, "error");
        }
    });

    document.getElementById("use-saved-signature")?.addEventListener("click", async () => {
        if (typeof loadUserSignature !== 'function') return showToast('Impossible de charger la signature', 'error');
        const sig = await loadUserSignature();
        if (sig && sig.signature_data) {
            tempSignatureImageData = sig.signature_data;
            selectedSignatureId = sig.id;
            showToast('Signature sélectionnée. Cliquez sur le document pour la placer.');
            document.getElementById('signature-modal').style.display = 'none';
        } else {
            showToast('Aucune signature enregistrée', 'error');
        }
    });

    document.getElementById("close-modal")?.addEventListener("click", () => {
        document.getElementById('signature-modal').style.display = 'none';
    });
}

// Auto-init when loaded
setTimeout(() => {
    try { initSignatureModalHandlers(); } catch (e) { console.error(e); }
}, 200);
