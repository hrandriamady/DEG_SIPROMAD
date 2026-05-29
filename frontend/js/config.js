// ======================== CONFIGURATION MULTI-ENVIRONNEMENT ========================

// Détermination de l'URL de l'API en fonction de l'environnement
const hostname = window.location.hostname;
const protocol = window.location.protocol;
const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
const isRender = hostname.includes('onrender.com');

let API_BASE;

if (isLocal) {
    // Développement local
    API_BASE = 'http://127.0.0.1:8000';
} else if (isRender) {
    // Production sur Render – à adapter avec le nom de votre service backend
    API_BASE = 'https://sipromad-api.onrender.com';  // ⚠️ Remplacez par votre vrai URL backend Render
} else if (hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
    // Serveur d'entreprise avec IP fixe
    API_BASE = `http://${hostname}:8000`;
} else if (hostname.includes('.local')) {
    // Serveur d'entreprise avec nom local
    API_BASE = `http://${hostname}:8000`;
} else {
    // Autre (domaine personnalisé, etc.)
    API_BASE = `${protocol}//${hostname}/api`;
}

// Variables globales
let authToken = localStorage.getItem("token");
let currentUser = null;
let charts = {};
let sageDetails = { clients: [], factures: [], stocks: [], commandes: [] };
let currentDocId = null;
let userSignatureImage = null;
let userSignatureId = null;
let notifInterval = null;
let currentDocumentForSignature = null;
let currentOverlayImage = null;
let signaturePosition = null;
let signatureOverlay = null;
let tempSignatureImageData = null;
let selectedSignatureId = null;

// Configuration des pages
const pageTitles = {
    dashboard: "Vue d'ensemble", pilotage: "Pilotage Direction",
    "workflow-dash": "Sage (Workflows)", "finance-dash": "Finance",
    "fournisseurs-dash": "Fournisseurs", "projets-dash": "Projets",
    "audit-dash": "Audit & Contrôle", documents: "Mes Documents",
    upload: "Déposer un document", consulter: "Consultation document",
    validation: "File de validation", historique: "Historique & Traçabilité",
    "mobile-val": "Validation Mobile", utilisateurs: "Utilisateurs",
    parametres: "Paramètres", recherche: "Recherche avancée",
    archivage: "Archivage", profil: "Mon Profil",
    "validation-new": "Validation & Signature"
};

const pageLoaders = {
    dashboard: () => { loadDashboardStats(); loadRecentDocuments(); if (!charts.validations) initCharts(); },
    documents: () => loadAllDocuments(),
    upload: () => loadUploadValidators(),
    validation: () => loadValidationQueue(),
    historique: () => loadAuditLogs(),
    "fournisseurs-dash": () => loadFournisseurs(),
    "projets-dash": () => loadProjets(),
    "audit-dash": () => loadAuditLogs(),
    utilisateurs: () => loadUsers(),
    parametres: () => { loadSettings(); initSignatureCanvasParam(); loadUserSignature(); },
    recherche: () => searchDocuments(),
    archivage: () => loadArchives(),
    "mobile-val": () => loadMobileValidation(),
    "workflow-dash": () => loadSageWorkflows(),
    "finance-dash": () => loadFinanceDashboard(),
    consulter: () => loadDocumentDetails(),
    pilotage: () => { loadPilotageStats(); initPilotageCharts(); },
    "validation-new": () => { loadPendingDocuments(); loadUserSignatureForValidation(); }
};

// Exposer la configuration globalement
window.API_BASE = API_BASE;
console.log(`🌍 Environnement détecté : ${isLocal ? 'Local' : isRender ? 'Render' : 'Entreprise'}`);
console.log(`🔗 URL de l'API : ${API_BASE}`);