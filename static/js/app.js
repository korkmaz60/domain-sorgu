// Ana Uygulama Dosyası - Tüm modüllerin başlatılması ve koordinasyonu

class App {
    constructor() {
        this.init();
    }

    init() {
        // Global modül instance'larını oluştur
        window.domainSearch = new DomainSearchApp();
        window.resultRenderer = new ResultRenderer();
        window.wishlistManager = new WishlistManager();
        window.aiSuggestions = new AISuggestions();
        window.uiManager = new UIManager();
        window.settingsManager = new SettingsManager();
        window.aiToggle = new AIToggle();
        window.notificationManager = new NotificationManager();

        // Event listener'ları kur
        this.setupEventListeners();
        
        // UI bileşenlerini başlat
        this.initializeUI();
    }

    setupEventListeners() {
        // Form submissions
        document.getElementById('variations-form').addEventListener('submit', (e) => window.domainSearch.handleVariations(e));
        document.getElementById('bulk-form').addEventListener('submit', (e) => window.domainSearch.handleBulkCheck(e));
        
        // AI suggestions events
        const moreAiBtn = document.getElementById('more-ai-suggestions');
        if (moreAiBtn) {
            moreAiBtn.addEventListener('click', () => window.aiSuggestions.getMoreAISuggestions());
        }
    }

    initializeUI() {
        // Tab sistemi
        window.uiManager.setupTabs();
        
        // Extension selection
        window.uiManager.setupExtensionSelection();
        
        // Settings modal
        window.uiManager.setupSettingsModal();
        
        // AI toggle
        window.uiManager.setupAIToggle();
        
        // Keyboard shortcuts
        window.uiManager.setupKeyboardShortcuts();
        
        // AI ayarlarını yükle ve toggle'ı başlat
        window.settingsManager.loadAISettings();
        window.aiToggle.setupAIToggle();
        
        // İlk yüklemede AI durumunu kontrol et
        const savedAIEnabled = localStorage.getItem('ai_enabled') === 'true';
        const hasApiKey = window.domainSearch.aiConfig.apiKey && window.domainSearch.aiConfig.model;
        
        // Eğer API anahtarı yoksa ama AI açıksa, kapat
        if (savedAIEnabled && !hasApiKey) {
            window.domainSearch.aiConfig.enabled = false;
            localStorage.setItem('ai_enabled', 'false');
        }
        
        // AI toggle UI'sını güncelle
        window.aiToggle.updateAIToggleUI();
    }
}

// Global değişken ve uygulama başlatma
window.app = null;

// Sayfa yüklendiğinde uygulamayı başlat
document.addEventListener('DOMContentLoaded', function() {
    window.app = new App();
}); 