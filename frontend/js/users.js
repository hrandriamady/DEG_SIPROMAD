// ======================== UTILISATEURS ========================
async function loadUsers() {
    try {
        const users = await fetchAPI("/api/users");
        const tbody = document.getElementById("users-table-body");
        if (!tbody) return;
        tbody.innerHTML = "";
        users.forEach(u => {
            const row = tbody.insertRow();
            row.insertCell(0).innerHTML = `<div style="display:flex;align-items:center;gap:10px"><div class="avatar" style="background:${u.avatar_color || '#ccc'}">${(u.full_name?.substring(0, 2) || u.username.substring(0, 2)).toUpperCase()}</div><div><div style="font-weight:500">${u.full_name || u.username}</div><div style="font-size:11px;color:gray">${u.email}</div></div></div>`;
            row.insertCell(1).innerHTML = `<span class="badge badge-purple">${u.role || "—"}</span>`;
            row.insertCell(2).innerText = u.department || "—";
            row.insertCell(3).innerText = u.last_login ? new Date(u.last_login).toLocaleString() : "Jamais";
            row.insertCell(4).innerText = u.doc_count;
            row.insertCell(5).innerHTML = `<span class="badge ${u.is_active ? "badge-success" : "badge-danger"}">${u.is_active ? "Actif" : "Inactif"}</span>`;
            row.insertCell(6).innerHTML = `<button class="btn btn-outline btn-sm" onclick="toggleUserActive(${u.id})">${u.is_active ? "Désactiver" : "Activer"}</button>`;
        });
    } catch (err) { console.error(err); }
}

window.toggleUserActive = async function (userId) {
    try {
        await fetchAPI(`/api/users/${userId}/toggle-active`, { method: "PUT" });
        showToast("Statut modifié");
        loadUsers();
    } catch (err) { showToast(err.message, "error"); }
};