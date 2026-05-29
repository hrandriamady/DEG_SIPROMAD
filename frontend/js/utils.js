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
    if (!toast || !toastMsg) return;
    toastMsg.textContent = msg;
    toast.style.background = type === "error" ? "var(--danger)" : "var(--navy)";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}

async function fetchAPI(endpoint, options = {}) {
    // ✅ Récupérer le token directement depuis localStorage
    const token = localStorage.getItem("token");
    
    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });
    
    if (response.status === 401) {
        localStorage.removeItem("token");
        showToast("Session expirée, veuillez vous reconnecter", "error");
        if (typeof doLogout === 'function') doLogout();
        throw new Error("Unauthorized");
    }
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || error.error || `Erreur ${response.status}`);
    }
    
    return response.json();
}

async function fetchFileBlob(endpoint) {
    // ✅ Récupérer le token directement depuis localStorage
    const token = localStorage.getItem("token");
    const headers = {};
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, { headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.blob();
}