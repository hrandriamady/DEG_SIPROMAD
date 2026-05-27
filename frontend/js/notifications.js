// ======================== NOTIFICATIONS ========================
async function loadNotifications() {
    if (!authToken) return;
    try {
        const notifs = await fetchAPI("/api/notifications");
        const unreadCount = notifs.filter(n => !n.is_read).length;
        const dot = document.querySelector(".notif-dot");
        if (dot) dot.style.display = unreadCount > 0 ? "block" : "none";
        const panelList = document.querySelector(".notif-list");
        if (panelList) {
            if (notifs.length === 0) {
                panelList.innerHTML = "<div style='padding:16px; text-align:center; color:gray'>Aucune notification</div>";
            } else {
                panelList.innerHTML = notifs.map(n => `
                    <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="markNotificationRead(${n.id})">
                        ${n.is_read ? '' : '<div class="notif-dot-indicator"></div>'}
                        <div>
                            <div class="notif-text">${n.message}</div>
                            <div class="notif-time">${new Date(n.created_at).toLocaleString()}</div>
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (err) { console.error(err); }
}

async function markNotificationRead(id) {
    try {
        await fetchAPI(`/api/notifications/${id}/read`, { method: "PUT" });
        loadNotifications();
    } catch (err) { console.error(err); }
}

async function markAllNotificationsRead() {
    try {
        await fetchAPI('/api/notifications/read-all', { method: 'PUT' });
        loadNotifications();
    } catch (err) {
        console.error(err);
    }
}