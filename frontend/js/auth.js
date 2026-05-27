// ======================== AUTHENTIFICATION ========================
function selectRole(btn, role, name, badge) {
    document.querySelectorAll(".role-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const loginUsername = name.toLowerCase().replace(/ /g, ".") + "@sipromad.mg";
    document.getElementById("login-user").value = loginUsername;
    document.getElementById("login-password").value = "";
}

async function doLogin() {
    const username = document.getElementById("login-user").value.trim();
    const password = document.getElementById("login-password").value.trim();
    if (!username || !password) {
        showToast("Veuillez saisir un identifiant et un mot de passe", "error");
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Échec de connexion");
        }
        const { token } = await response.json();
        authToken = token;
        localStorage.setItem("token", token);
        await loadCurrentUser();
        document.getElementById("login-screen").classList.remove("active");
        document.getElementById("app").classList.add("active");
        showPage("dashboard");
        if (window.innerWidth <= 900) document.getElementById("menu-toggle").style.display = "block";
        if (notifInterval) clearInterval(notifInterval);
        notifInterval = setInterval(loadNotifications, 30000);
        loadNotifications();
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function loadCurrentUser() {
    try {
        const user = await fetchAPI("/api/auth/me");
        currentUser = {
            name: user.full_name,
            first: user.full_name?.split(" ")[0] || user.username,
            role: user.role + " — " + user.department,
            roleName: user.role,
            departmentName: user.department,
            badge: user.badge,
            initials: user.username.substring(0, 2).toUpperCase(),
            color: user.avatar_color || "#1A73E8",
        };
        updateUserUI();
        applyMenuPermissions();
    } catch (err) {
        console.error("Impossible de charger l'utilisateur", err);
        throw err;
    }
}

function applyMenuPermissions() {
    if (!currentUser) return;
    const roleLower = (currentUser.roleName || "").toLowerCase();
    const deptLower = (currentUser.departmentName || "").toLowerCase();
    const isDirection = roleLower.includes("direction") || deptLower.includes("direction") || roleLower.includes("dg");
    const isValidator = isDirection || ["finance", "daf", "dg", "audit", "validateur", "validation"].includes(roleLower);

    document.getElementById("nav-validation")?.classList.toggle("hidden", !isValidator);
    document.getElementById("nav-validation-new")?.classList.toggle("hidden", !isValidator);
    document.getElementById("nav-audit")?.classList.toggle("hidden", !isValidator);
    document.getElementById("nav-utilisateurs")?.classList.toggle("hidden", !isDirection);
    document.getElementById("nav-parametres")?.classList.toggle("hidden", !isDirection);
}

function updateUserUI() {
    if (!currentUser) return;
    document.getElementById("user-name").textContent = currentUser.name;
    document.getElementById("user-role").textContent = currentUser.role;
    document.getElementById("user-badge").textContent = currentUser.badge;
    document.getElementById("welcome-name").textContent = currentUser.first;
    const av = document.getElementById("user-avatar");
    av.textContent = currentUser.initials;
    av.style.background = currentUser.color;
}

function doLogout() {
    localStorage.removeItem("token");
    authToken = null;
    if (notifInterval) clearInterval(notifInterval);
    document.getElementById("app").classList.remove("active");
    document.getElementById("login-screen").classList.add("active");
}