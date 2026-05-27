// ======================== SOUMISSION DOCUMENT ========================
window.submitDocument = async function () {
    const title = document.getElementById("doc-title")?.value || "";
    const description = document.getElementById("doc-description")?.value || "";
    const fileInput = document.getElementById("doc-file");
    const file = fileInput?.files[0];
    const validatorSelect = document.getElementById("doc-validators");
    const selectedValidators = validatorSelect ? Array.from(validatorSelect.selectedOptions).map(opt => opt.value) : [];

    if (!title) {
        showToast("Veuillez remplir au minimum le titre du document", "error");
        return;
    }
    if (!file) {
        showToast("Veuillez sélectionner un fichier", "error");
        return;
    }
    if (!selectedValidators.length) {
        showToast("Veuillez sélectionner au moins un validateur", "error");
        return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("validators", JSON.stringify(selectedValidators));
    if (description) formData.append("description", description);
    formData.append("file", file);

    try {
        const response = await fetch(`${API_BASE}/api/documents/`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${authToken}` },
            body: formData
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || "Erreur lors de l'upload");
        }
        showToast("Document soumis avec succès");
        if (document.getElementById("doc-title")) document.getElementById("doc-title").value = "";
        if (document.getElementById("doc-description")) document.getElementById("doc-description").value = "";
        if (document.getElementById("doc-validators")) {
            Array.from(document.getElementById("doc-validators").options).forEach(opt => opt.selected = false);
        }
        if (fileInput) fileInput.value = "";
        const uploadPreview = document.getElementById("upload-preview");
        if (uploadPreview) uploadPreview.style.display = "none";
        showPage("documents");
    } catch (err) {
        showToast(err.message, "error");
    }
};

window.simulateUpload = function (zone) {
    const fileInput = document.getElementById("doc-file");
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showToast("Veuillez sélectionner un fichier", "error");
        return;
    }
    zone.classList.add("active");
    setTimeout(() => {
        zone.classList.remove("active");
        document.getElementById("upload-preview").style.display = "block";
        const fileName = fileInput.files[0].name;
        showToast(`✓ ${fileName} chargé — Prêt à soumettre`);
    }, 800);
};

async function loadUploadValidators() {
    const select = document.getElementById("doc-validators");
    if (!select) return;
    select.innerHTML = "<option value=''>Chargement...</option>";
    try {
        const users = await fetchAPI("/api/users");
        const validatorRoles = ["finance", "daf", "dg", "audit", "validateur", "validation"];
        const choices = users.filter(u => {
            const role = (u.role || "").toLowerCase();
            const dept = (u.department || "").toLowerCase();
            return role.includes("direction") || dept.includes("direction") || validatorRoles.includes(role);
        });
        if (!choices.length) {
            select.innerHTML = "<option value=''>Aucun validateur disponible</option>";
            return;
        }
        select.innerHTML = "";
        choices.forEach(u => {
            const option = document.createElement("option");
            option.value = u.id;
            option.textContent = `${u.full_name || u.username} (${u.role || u.department || "Validateur"})`;
            select.appendChild(option);
        });
    } catch (err) {
        console.error("Impossible de charger les validateurs", err);
        select.innerHTML = "<option value=''>Erreur de chargement</option>";
    }
}
