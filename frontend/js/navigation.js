// ======================== NAVIGATION ========================
window.showPage = async function (id) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    const pg = document.getElementById("page-" + id);
    if (pg) pg.classList.add("active");
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    const matched = [...document.querySelectorAll(".nav-item")].find(n => n.getAttribute("onclick")?.includes("'" + id + "'"));
    if (matched) matched.classList.add("active");
    document.getElementById("page-title").textContent = pageTitles[id] || "SIPROMAD GED";
    document.getElementById("notif-panel")?.classList.remove("open");
    if (window.innerWidth <= 900) document.getElementById("sidebar")?.classList.remove("open");
    if (pageLoaders[id]) await pageLoaders[id]();
    else if (id === "dashboard" && !charts.validations) setTimeout(initCharts, 100);
    else if (id === "pilotage" && !charts.temps) setTimeout(initPilotageCharts, 100);
    else if (id === "finance-dash" && !charts.finance) setTimeout(initFinanceChart, 100);
};

window.toggleSidebar = () => document.getElementById("sidebar").classList.toggle("open");
window.toggleNotif = () => document.getElementById("notif-panel").classList.toggle("open");

document.addEventListener("click", e => {
    const panel = document.getElementById("notif-panel");
    if (panel?.classList.contains("open") && !panel.contains(e.target) && !e.target.closest('[onclick="toggleNotif()"]'))
        panel.classList.remove("open");
});