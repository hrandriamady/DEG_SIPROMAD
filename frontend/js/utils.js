// ======================== UTILITAIRES ========================
function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function showToast(msg, type = "success") {
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toast-msg");
    toastMsg.textContent = msg;
    toast.style.background = type === "error" ? "var(--danger)" : "var(--navy)";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}

async function fetchAPI(endpoint, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };
    if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
    }
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });
    if (response.status === 401) {
        localStorage.removeItem("token");
        authToken = null;
        showToast("Session expirée, veuillez vous reconnecter", "error");
        doLogout();
        throw new Error("Unauthorized");
    }
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || error.error || `Erreur ${response.status}`);
    }
    return response.json();
}

async function fetchFileBlob(endpoint) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: { "Authorization": `Bearer ${authToken}` }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.blob();
}