// UI Yöneticisi - Tab switching, modal yönetimi ve UI etkileşimleri

class UIManager {
    constructor() {}

    setupTabs() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        // İlk tab'ı aktif yap
        this.switchTab('variations');
    }

    switchTab(tabName) {
        // Tüm tab butonlarını pasif yap
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('bg-primary-500', 'text-white', 'shadow-lg');
            btn.classList.add('text-gray-600', 'hover:text-primary-600', 'hover:bg-primary-50');
        });
        
        // Tüm tab içeriklerini gizle
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        // Seçilen tab'ı aktif yap
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        const activeContent = document.getElementById(`${tabName}-tab`);
        
        if (activeBtn && activeContent) {
            activeBtn.classList.remove('text-gray-600', 'hover:text-primary-600', 'hover:bg-primary-50');
            activeBtn.classList.add('bg-primary-500', 'text-white', 'shadow-lg');
            activeContent.classList.remove('hidden');
        }
    }

    setupExtensionSelection() {
        // Extension seçim butonları
        document.querySelectorAll('.extension-label input').forEach(checkbox => {
            checkbox.addEventListener('change', this.updateExtensionSelection);
        });
        
        // Hepsini seç/kaldır butonları
        const selectAllBtn = document.getElementById('select-all-extensions');
        const clearAllBtn = document.getElementById('unselect-all-extensions');
        const selectPopularBtn = document.getElementById('select-popular-extensions');
        
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => this.selectAllExtensions(true));
        }
        
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.selectAllExtensions(false));
        }
        
        if (selectPopularBtn) {
            selectPopularBtn.addEventListener('click', () => this.selectPopularExtensions());
        }
    }

    updateExtensionSelection() {
        const checkboxes = document.querySelectorAll('.extension-label input');
        const selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        
        // Seçim sayısını güncelle
        const countDisplay = document.getElementById('selected-count');
        if (countDisplay) {
            countDisplay.textContent = selectedCount;
        }
    }

    selectAllExtensions(select = true) {
        document.querySelectorAll('.extension-label input').forEach(checkbox => {
            checkbox.checked = select;
        });
        this.updateExtensionSelection();
    }

    selectPopularExtensions() {
        const popularExtensions = ['com', 'net', 'org', 'io'];
        
        // Önce tümünü temizle
        document.querySelectorAll('.extension-label input').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Popüler olanları seç
        popularExtensions.forEach(ext => {
            const checkbox = document.querySelector(`.extension-label input[value="${ext}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
        
        this.updateExtensionSelection();
    }

    setupSettingsModal() {
        const settingsBtn = document.getElementById('settings-btn');
        const settingsModal = document.getElementById('settings-modal');
        const closeModalBtn = document.getElementById('close-settings');
        const saveSettingsBtn = document.getElementById('save-settings');
        
        if (settingsBtn && settingsModal) {
            settingsBtn.addEventListener('click', () => {
                settingsModal.classList.remove('hidden');
                settingsModal.classList.add('flex');
                window.settingsManager.loadSettings();
                // İlk tab'ı aktif yap
                this.switchSettingsTab('ai-settings');
            });
        }
        
        if (closeModalBtn && settingsModal) {
            closeModalBtn.addEventListener('click', () => {
                settingsModal.classList.add('hidden');
                settingsModal.classList.remove('flex');
            });
        }
        
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => window.settingsManager.saveSettings());
        }
        
        // Modal dışına tıklayınca kapat
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    settingsModal.classList.add('hidden');
                    settingsModal.classList.remove('flex');
                }
            });
        }
        
        // Settings tab switching
        this.setupSettingsTabs();
    }

    setupSettingsTabs() {
        const settingsTabBtns = document.querySelectorAll('.settings-tab-btn');
        settingsTabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchSettingsTab(tabName);
            });
        });
    }

    switchSettingsTab(tabName) {
        // Tüm settings tab butonlarını pasif yap
        document.querySelectorAll('.settings-tab-btn').forEach(btn => {
            btn.classList.remove('text-primary-600', 'bg-primary-50', 'border-primary-500');
            btn.classList.add('text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300', 'border-transparent');
        });
        
        // Tüm settings tab içeriklerini gizle
        document.querySelectorAll('.settings-tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        // Seçilen tab'ı aktif yap
        const activeBtn = document.querySelector(`.settings-tab-btn[data-tab="${tabName}"]`);
        const activeContent = document.getElementById(`${tabName}-tab`);
        
        if (activeBtn && activeContent) {
            activeBtn.classList.remove('text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300', 'border-transparent');
            activeBtn.classList.add('text-primary-600', 'bg-primary-50', 'border-primary-500');
            activeContent.classList.remove('hidden');
        }
    }

    setupAIToggle() {
        const aiToggleBtn = document.getElementById('ai-toggle-btn');
        const quickSettingsBtn = document.getElementById('quick-settings-btn');
        
        if (aiToggleBtn) {
            aiToggleBtn.addEventListener('click', () => window.aiToggle.toggleAI());
        }
        
        if (quickSettingsBtn) {
            quickSettingsBtn.addEventListener('click', () => {
                const settingsModal = document.getElementById('settings-modal');
                if (settingsModal) {
                    settingsModal.classList.remove('hidden');
                    settingsModal.classList.add('flex');
                    window.settingsManager.loadSettings();
                    this.switchSettingsTab('ai-settings');
                }
            });
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Enter: Form gönder
            if (e.ctrlKey && e.key === 'Enter') {
                const activeTab = document.querySelector('.tab-content:not(.hidden)');
                if (activeTab) {
                    const form = activeTab.querySelector('form');
                    if (form) {
                        form.dispatchEvent(new Event('submit'));
                    }
                }
            }
            
            // Esc: Modal kapat
            if (e.key === 'Escape') {
                const modal = document.getElementById('settings-modal');
                if (modal && !modal.classList.contains('hidden')) {
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');
                }
            }
        });
    }
} 