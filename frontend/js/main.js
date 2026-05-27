// ======================== INITIALISATION PRINCIPALE ========================
window.addEventListener("DOMContentLoaded", async () => {
    setTimeout(() => {
        const splash = document.getElementById("splash");
        if (splash) splash.style.display = "none";
    }, 2200);
    
    if (authToken) {
        try {
            await loadCurrentUser();
            document.getElementById("login-screen").classList.remove("active");
            document.getElementById("app").classList.add("active");
            showPage("dashboard");
            if (window.innerWidth <= 900) document.getElementById("menu-toggle").style.display = "block";
            if (notifInterval) clearInterval(notifInterval);
            notifInterval = setInterval(loadNotifications, 30000);
            loadNotifications();
        } catch (err) {
            localStorage.removeItem("token");
            authToken = null;
            document.getElementById("login-screen").classList.add("active");
            document.getElementById("app").classList.remove("active");
        }
    } else {
        document.getElementById("login-screen").classList.add("active");
        document.getElementById("app").classList.remove("active");
    }
});