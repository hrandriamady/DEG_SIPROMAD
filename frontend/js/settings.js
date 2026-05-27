// ======================== PARAMÈTRES ========================
async function loadSettings() {
    try {
        const settings = await fetchAPI("/api/settings");
        const orgName = document.getElementById("org-name");
        const sysEmail = document.getElementById("system-email");
        const retYears = document.getElementById("retention-years");
        const valDeadline = document.getElementById("validation-deadline");
        if (orgName) orgName.value = settings.org_name;
        if (sysEmail) sysEmail.value = settings.system_email;
        if (retYears) retYears.value = settings.retention_years;
        if (valDeadline) valDeadline.value = settings.validation_deadline;
    } catch (err) { console.error(err); }
}

async function saveSettings() {
    const orgName = document.getElementById("org-name");
    const sysEmail = document.getElementById("system-email");
    const retYears = document.getElementById("retention-years");
    const valDeadline = document.getElementById("validation-deadline");
    
    if (!orgName || !sysEmail || !retYears || !valDeadline) {
        showToast("Erreur: Formulaire incomplète", "error");
        return;
    }
    
    const data = {
        org_name: orgName.value,
        system_email: sysEmail.value,
        retention_years: parseInt(retYears.value),
        validation_deadline: parseInt(valDeadline.value)
    };
    try {
        await fetchAPI("/api/settings", { method: "PUT", body: JSON.stringify(data) });
        showToast("Paramètres sauvegardés");
    } catch (err) { showToast(err.message, "error"); }
}

function initSignatureCanvasParam() {
    const canvas = document.getElementById("signature-canvas-param");
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
        if (e.pointerType) {
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }
        return { x: e.offsetX, y: e.offsetY };
    };

    const startDraw = (e) => { e.preventDefault(); drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const draw = (e) => { if (drawing) { e.preventDefault(); const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); } };
    const stopDraw = (e) => { if (drawing) { e.preventDefault(); drawing = false; } };

    // Pointer events (recommended) — covers mouse, touch, pen
    canvas.addEventListener('pointerdown', startDraw);
    canvas.addEventListener('pointermove', draw);
    canvas.addEventListener('pointerup', stopDraw);
    canvas.addEventListener('pointercancel', stopDraw);
    canvas.addEventListener('pointerleave', stopDraw);

    // Fallback for older touch events
    canvas.addEventListener('touchstart', startDraw);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDraw);

    // Mouse fallback
    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);

    document.getElementById("clear-signature-param")?.addEventListener("click", () => ctx.clearRect(0, 0, canvas.width, canvas.height));
}

async function loadUserSignature() {
    try {
        const sig = await fetchAPI("/api/validation/signatures/user");
        const previewDiv = document.getElementById("current-signature-preview");
        if (previewDiv) {
            if (sig && sig.signature_data) {
                previewDiv.innerHTML = "<strong>Signature actuelle :</strong><br>";
                const img = document.createElement("img");
                img.src = sig.signature_data;
                img.style.maxWidth = "200px";
                img.style.border = "1px solid #ccc";
                img.style.marginTop = "8px";
                previewDiv.appendChild(img);
                userSignatureImage = sig.signature_data;
                userSignatureId = sig.id;
            } else {
                previewDiv.innerHTML = "Aucune signature enregistrée.";
                userSignatureImage = null;
                userSignatureId = null;
            }
        }
        return sig;
    } catch (e) { console.error(e); return null; }
}

document.getElementById("save-signature-param")?.addEventListener("click", async () => {
    const canvas = document.getElementById("signature-canvas-param");
    const ctx = canvas.getContext("2d");
    const isEmpty = ctx.getImageData(0, 0, canvas.width, canvas.height).data.every(c => c === 0);
    if (isEmpty) {
        showToast("Veuillez dessiner une signature", "error");
        return;
    }
    const imageData = canvas.toDataURL("image/png");
    try {
        await fetchAPI("/api/validation/signatures/save", {
            method: "POST",
            body: JSON.stringify({ image_data: imageData, name: "Ma signature" })
        });
        showToast("Signature enregistrée avec succès");
        await loadUserSignature();
    } catch (err) {
        showToast(err.message, "error");
    }
});