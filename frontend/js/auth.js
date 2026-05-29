// ======================== AUTHENTIFICATION ========================

function selectRole(btn, role, name, badge) {
    document.querySelectorAll(".role-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const loginUsername = name.toLowerCase().replace(/ /g, ".") + "@sipromad.mg";
    const loginUser = document.getElementById("login-user");
    const loginPassword = document.getElementById("login-password");
    if (loginUser) loginUser.value = loginUsername;
    if (loginPassword) loginPassword.value = "";
}

async function doLogin() {
    const username = document.getElementById("login-user")?.value.trim();
    const password = document.getElementById("login-password")?.value.trim();
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
        
        // Stockage du token
        localStorage.setItem("token", token);
        
        await loadCurrentUser();
        
        const loginScreen = document.getElementById("login-screen");
        const appScreen = document.getElementById("app");
        if (loginScreen) loginScreen.classList.remove("active");
        if (appScreen) appScreen.classList.add("active");
        
        showPage("dashboard");
        
        if (window.innerWidth <= 900) {
            const menuToggle = document.getElementById("menu-toggle");
            if (menuToggle) menuToggle.style.display = "block";
        }
        
        if (window.notifInterval) clearInterval(window.notifInterval);
        window.notifInterval = setInterval(loadNotifications, 30000);
        loadNotifications();
        
        console.log("Connexion réussie !");
        
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function loadCurrentUser() {
    try {
        const user = await fetchAPI("/api/auth/me");
        
        // ✅ Vérifier que user existe
        if (!user) {
            throw new Error("Utilisateur non trouvé");
        }
        
        window.currentUser = {
            id: user.id,
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
        // ✅ Rediriger vers login si erreur
        doLogout();
        throw err;
    }
}

function applyMenuPermissions() {
    // ✅ Vérifier que currentUser existe
    if (!window.currentUser) return;
    
    const roleLower = (window.currentUser.roleName || "").toLowerCase();
    const deptLower = (window.currentUser.departmentName || "").toLowerCase();
    const isDirection = roleLower.includes("direction") || deptLower.includes("direction") || roleLower.includes("dg");
    const isValidator = isDirection || ["finance", "daf", "dg", "audit", "validateur", "validation"].includes(roleLower);

    const navValidation = document.getElementById("nav-validation");
    const navValidationNew = document.getElementById("nav-validation-new");
    const navAudit = document.getElementById("nav-audit");
    const navUtilisateurs = document.getElementById("nav-utilisateurs");
    const navParametres = document.getElementById("nav-parametres");
    
    if (navValidation) navValidation.classList.toggle("hidden", !isValidator);
    if (navValidationNew) navValidationNew.classList.toggle("hidden", !isValidator);
    if (navAudit) navAudit.classList.toggle("hidden", !isValidator);
    if (navUtilisateurs) navUtilisateurs.classList.toggle("hidden", !isDirection);
    if (navParametres) navParametres.classList.toggle("hidden", !isDirection);
}

function updateUserUI() {
    // ✅ Vérifier que currentUser existe
    if (!window.currentUser) return;
    
    const userNameEl = document.getElementById("user-name");
    const userRoleEl = document.getElementById("user-role");
    const userBadgeEl = document.getElementById("user-badge");
    const welcomeNameEl = document.getElementById("welcome-name");
    const avatarEl = document.getElementById("user-avatar");
    
    if (userNameEl) userNameEl.textContent = window.currentUser.name;
    if (userRoleEl) userRoleEl.textContent = "";
    if (userBadgeEl) userBadgeEl.textContent = window.currentUser.badge;
    if (welcomeNameEl) welcomeNameEl.textContent = "";
    if (avatarEl) {
        avatarEl.textContent = window.currentUser.initials;
        avatarEl.style.background = window.currentUser.color;
    }
}

function doLogout() {
    localStorage.removeItem("token");
    window.currentUser = null;
    if (window.notifInterval) clearInterval(window.notifInterval);
    
    const appEl = document.getElementById("app");
    const loginScreenEl = document.getElementById("login-screen");
    
    if (appEl) appEl.classList.remove("active");
    if (loginScreenEl) loginScreenEl.classList.add("active");
}