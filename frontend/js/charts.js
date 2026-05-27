// ======================== GRAPHIQUES DASHBOARD ========================
function initCharts() {
    const ctxValidations = document.getElementById("chartValidations");
    const ctxDepts = document.getElementById("chartDepts");
    
    if (!ctxValidations || !ctxDepts) return;
    
    // Graphique des validations
    charts.validations = new Chart(ctxValidations, {
        type: 'line',
        data: {
            labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
            datasets: [
                {
                    label: 'Validés',
                    data: [45, 52, 48, 61, 55, 67, 72, 78, 82, 85, 89, 92],
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'En cours',
                    data: [12, 15, 18, 14, 16, 13, 11, 9, 8, 7, 5, 3],
                    borderColor: '#F59E0B',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Rejetés',
                    data: [3, 2, 4, 2, 3, 1, 2, 1, 1, 0, 1, 0],
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { padding: 16, usePointStyle: true }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { drawBorder: false, color: 'rgba(0,0,0,0.05)' },
                    ticks: { callback: (v) => v + '', color: '#666' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#666' }
                }
            }
        }
    });

    // Graphique par département
    charts.depts = new Chart(ctxDepts, {
        type: 'doughnut',
        data: {
            labels: ['Finance', 'RH', 'Achat', 'Projets', 'Autres'],
            datasets: [{
                data: [28, 18, 22, 20, 12],
                backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 16, usePointStyle: true }
                }
            }
        }
    });
}

// Initialiser les graphiques des dashboards avancés
function initPilotageCharts() {
    const ctx1 = document.getElementById("chartPilotageStatus");
    const ctx2 = document.getElementById("chartPilotageFlow");
    
    if (!ctx1 || !ctx2) return;
    
    charts.pilotageStatus = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: ['Validés', 'En attente', 'Retard', 'Rejetés'],
            datasets: [{
                label: 'Nombre de documents',
                data: [245, 38, 12, 8],
                backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#6B7280']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: { legend: { display: false } }
        }
    });
}

function initFinanceCharts() {
    const ctx1 = document.getElementById("chartFinanceAmount");
    if (!ctx1) return;
    
    charts.financeAmount = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: ['Semaine 1', 'Semaine 2', 'Semaine 3', 'Semaine 4'],
            datasets: [{
                label: 'Montant total (MGA)',
                data: [1250000, 1890000, 2340000, 1950000],
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { position: 'top' } }
        }
    });
}
