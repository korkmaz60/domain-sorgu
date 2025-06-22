// Ayarlar Yöneticisi - AI ve API ayarları yönetimi

class SettingsManager {
    constructor() {
        this.isInitialized = false;
        this.initializeSettings();
    }

    async initializeSettings() {
        try {
            await this.loadStoredSettings();
            this.setupEventListeners();
            this.isInitialized = true;
            console.log('✅ Settings Manager başlatıldı');
        } catch (error) {
            console.error('❌ Settings Manager başlatma hatası:', error);
        }
    }

    async loadStoredSettings() {
        // DomainSearch henüz initialize olmamış olabilir, localStorage'dan oku
        const godaddyApiKey = localStorage.getItem('godaddy_api_key') || '';
        const godaddySecretKey = localStorage.getItem('godaddy_secret_key') || '';
        
        // GoDaddy ayarlarını yükle
        const godaddyApiKeyInput = document.getElementById('godaddy-api-key');
        const godaddySecretKeyInput = document.getElementById('godaddy-secret-key');

        if (godaddyApiKeyInput) {
            godaddyApiKeyInput.value = godaddyApiKey;
        }

        if (godaddySecretKeyInput) {
            godaddySecretKeyInput.value = godaddySecretKey;
        }

        // API sağlayıcısı seçimini yükle
        const savedProvider = localStorage.getItem('domain_search_provider') || 'whois';
        const providerRadios = document.querySelectorAll('input[name="search-api"]');
        
        providerRadios.forEach(radio => {
            if (radio.value === savedProvider) {
                radio.checked = true;
                this.showProviderSettings(savedProvider);
            }
        });

        // AI ayarlarını yükle
        const aiEnabled = localStorage.getItem('ai_enabled') === 'true';
        const openrouterApiKey = localStorage.getItem('openrouter_api_key') || '';
        const aiModel = localStorage.getItem('ai_model') || '';
        
        const aiToggle = document.getElementById('ai-toggle');
        const openrouterApiKeyInput = document.getElementById('openrouter-api-key');
        const aiModelSelect = document.getElementById('ai-model');

        if (aiToggle) {
            aiToggle.checked = aiEnabled;
        }

        if (openrouterApiKeyInput) {
            openrouterApiKeyInput.value = openrouterApiKey;
        }

        if (aiModelSelect) {
            aiModelSelect.value = aiModel;
        }
    }

    setupEventListeners() {
        // GoDaddy API key visibility toggle
        const toggleGodaddyKeyBtn = document.getElementById('toggle-godaddy-key-visibility');
        if (toggleGodaddyKeyBtn) {
            toggleGodaddyKeyBtn.addEventListener('click', () => this.toggleGodaddyKeyVisibility());
        }

        const toggleGodaddySecretBtn = document.getElementById('toggle-godaddy-secret-visibility');
        if (toggleGodaddySecretBtn) {
            toggleGodaddySecretBtn.addEventListener('click', () => this.toggleGodaddySecretVisibility());
        }

        // Ayarları kaydet butonu
        const saveButton = document.getElementById('save-settings');
        if (saveButton) {
            saveButton.addEventListener('click', () => this.saveSettings());
        }

        // API sağlayıcı değişikliği
        const providerRadios = document.querySelectorAll('input[name="search-api"]');
        providerRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.showProviderSettings(e.target.value);
            });
        });

        // Test bağlantısı butonu
        const testButton = document.getElementById('test-connection');
        if (testButton) {
            testButton.addEventListener('click', () => this.testConnection());
        }

        // AI toggle
        const aiToggle = document.getElementById('ai-toggle');
        if (aiToggle) {
            aiToggle.addEventListener('change', (e) => {
                this.updateAISettings(e.target.checked);
            });
        }

        console.log('⚙️ Settings event listener\'ları kuruldu');
    }

    // Eski adla uyumluluk için alias
    async loadSettings() {
        return this.loadStoredSettings();
    }

    async saveSettings() {
        try {
            const provider = document.querySelector('input[name="search-api"]:checked')?.value || 'whois';
            const godaddyApiKey = document.getElementById('godaddy-api-key')?.value.trim() || '';
            const godaddySecretKey = document.getElementById('godaddy-secret-key')?.value.trim() || '';
            const aiEnabled = document.getElementById('ai-toggle')?.checked || false;
            const openrouterApiKey = document.getElementById('openrouter-api-key')?.value.trim() || '';
            const aiModel = document.getElementById('ai-model')?.value || '';

            console.log('💾 Ayarlar kaydediliyor:', {
                provider,
                godaddyApiKeyLength: godaddyApiKey.length,
                godaddySecretKeyLength: godaddySecretKey.length,
                aiEnabled,
                openrouterApiKeyLength: openrouterApiKey.length,
                aiModel,
                domainSearchExists: !!window.domainSearch,
                domainSearchConfigExists: !!(window.domainSearch && window.domainSearch.searchConfig)
            });

            // Global config'i güncelle (eğer domainSearch varsa)
            if (window.domainSearch && window.domainSearch.searchConfig) {
                console.log('🔄 DomainSearch config güncelleniyor...');
                window.domainSearch.searchConfig.provider = provider;
                window.domainSearch.searchConfig.godaddyApiKey = godaddyApiKey;
                window.domainSearch.searchConfig.godaddySecretKey = godaddySecretKey;
                window.domainSearch.searchConfig.aiEnabled = aiEnabled;
                window.domainSearch.searchConfig.openrouterApiKey = openrouterApiKey;
                window.domainSearch.searchConfig.aiModel = aiModel;
                
                console.log('✅ DomainSearch config güncellendi:', {
                    provider: window.domainSearch.searchConfig.provider,
                    godaddyApiKeyLength: window.domainSearch.searchConfig.godaddyApiKey.length,
                    godaddySecretKeyLength: window.domainSearch.searchConfig.godaddySecretKey.length
                });
            } else {
                console.warn('⚠️ DomainSearch veya config mevcut değil!');
            }

            // Local storage'a kaydet
            console.log('💾 LocalStorage\'a kaydediliyor...');
            localStorage.setItem('domain_search_provider', provider);
            localStorage.setItem('godaddy_api_key', godaddyApiKey);
            localStorage.setItem('godaddy_secret_key', godaddySecretKey);
            localStorage.setItem('ai_enabled', aiEnabled.toString());
            localStorage.setItem('openrouter_api_key', openrouterApiKey);
            localStorage.setItem('ai_model', aiModel);

            // Başarı bildirimi
            if (window.notificationManager) {
                window.notificationManager.showSuccess('Ayarlar başarıyla kaydedildi!');
            }

            console.log('✅ Ayarlar kaydedildi:', {
                provider,
                godaddyApiKeyLength: godaddyApiKey.length,
                godaddySecretKeyLength: godaddySecretKey.length,
                aiEnabled,
                openrouterApiKeyLength: openrouterApiKey.length,
                aiModel
            });

        } catch (error) {
            console.error('❌ Ayar kaydetme hatası:', error);
            if (window.notificationManager) {
                window.notificationManager.showError('Ayarlar kaydedilemedi!');
            }
        }
    }

    async testConnection() {
        const provider = document.querySelector('input[name="search-api"]:checked')?.value;
        
        if (provider === 'godaddy') {
            await this.testGodaddyConnection();
        } else {
            if (window.notificationManager) {
                window.notificationManager.showInfo('WHOIS için test gerekmez, doğrudan kullanılabilir.');
            }
        }
    }

    async testGodaddyConnection() {
        const apiKey = document.getElementById('godaddy-api-key')?.value.trim();
        const secretKey = document.getElementById('godaddy-secret-key')?.value.trim();

        if (!apiKey || !secretKey) {
            if (window.notificationManager) {
                window.notificationManager.showError('API Key ve Secret Key gerekli!');
            }
            return;
        }

        const testButton = document.getElementById('test-connection');
        const originalText = testButton.innerHTML;
        
        try {
            testButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Test ediliyor...';
            testButton.disabled = true;

            const response = await fetch('/api/test-godaddy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    api_key: apiKey,
                    secret_key: secretKey
                })
            });

            const result = await response.json();

            if (result.success) {
                if (window.notificationManager) {
                    window.notificationManager.showSuccess('GoDaddy API bağlantısı başarılı! ✅');
                }
            } else {
                if (window.notificationManager) {
                    window.notificationManager.showError(`GoDaddy API Hatası: ${result.error}`);
                }
            }

        } catch (error) {
            console.error('❌ GoDaddy test hatası:', error);
            if (window.notificationManager) {
                window.notificationManager.showError('Bağlantı testi başarısız!');
            }
        } finally {
            testButton.innerHTML = originalText;
            testButton.disabled = false;
        }
    }

    showProviderSettings(provider) {
        // Tüm settings'leri gizle
        const godaddySettings = document.getElementById('godaddy-settings');

        if (provider === 'godaddy') {
            godaddySettings.classList.remove('hidden');
        } else {
            godaddySettings.classList.add('hidden');
        }
    }

    toggleGodaddyKeyVisibility() {
        const godaddyKeyInput = document.getElementById('godaddy-api-key');
        const toggleBtn = document.getElementById('toggle-godaddy-key-visibility');

        if (godaddyKeyInput.type === 'password') {
            godaddyKeyInput.type = 'text';
            toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            godaddyKeyInput.type = 'password';
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
        }
    }

    toggleGodaddySecretVisibility() {
        const godaddySecretInput = document.getElementById('godaddy-secret-key');
        const toggleBtn = document.getElementById('toggle-godaddy-secret-visibility');
        
        if (godaddySecretInput.type === 'password') {
            godaddySecretInput.type = 'text';
            toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            godaddySecretInput.type = 'password';
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
        }
    }

    updateAISettings(enabled) {
        window.domainSearch.searchConfig.aiEnabled = enabled;
        localStorage.setItem('ai_enabled', enabled.toString());
        
        if (window.aiToggle) {
            window.aiToggle.updateUIState();
        }
        
        console.log('🤖 AI ayarları güncellendi:', enabled);
    }
}

// Global olarak erişilebilir hale getir
window.settingsManager = new SettingsManager(); 