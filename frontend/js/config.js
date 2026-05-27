// ======================== CONFIGURATION ========================
const API_BASE = "http://127.0.0.1:8000";
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
    "audit-dash": () => { loadAuditLogs(); loadAuditStats(); },
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