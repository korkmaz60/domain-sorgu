// Ayarlar Yöneticisi - AI ve API ayarları yönetimi

class SettingsManager {
    constructor() {}

    loadAISettings() {
        document.getElementById('api-key').value = window.domainSearch.aiConfig.apiKey;
        document.getElementById('ai-model').value = window.domainSearch.aiConfig.model;
        
        // Search provider ayarlarını yükle
        const providerRadio = document.querySelector(`input[name="search-api"][value="${window.domainSearch.searchConfig.provider}"]`);
        if (providerRadio) {
            providerRadio.checked = true;
        }
        
        // Porkbun ayarlarını yükle
        const porkbunApiKeyInput = document.getElementById('porkbun-api-key');
        const porkbunSecretKeyInput = document.getElementById('porkbun-secret-key');
        
        if (porkbunApiKeyInput) {
            porkbunApiKeyInput.value = window.domainSearch.searchConfig.porkbunApiKey;
        }
        
        if (porkbunSecretKeyInput) {
            porkbunSecretKeyInput.value = window.domainSearch.searchConfig.porkbunSecretKey;
        }
        
        // API provider değişiklik olaylarını dinle
        document.querySelectorAll('input[name="search-api"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.handleApiProviderChange(e.target.value));
        });
        
        // İlk kez yüklendiğinde provider ayarını göster
        this.handleApiProviderChange(window.domainSearch.searchConfig.provider);
        
        // Test connection butonunu dinle
        const testConnectionBtn = document.getElementById('test-connection');
        if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', () => this.testAIConnection());
        }
        
        // Toggle key visibility butonunu dinle
        const toggleKeyBtn = document.getElementById('toggle-key-visibility');
        if (toggleKeyBtn) {
            toggleKeyBtn.addEventListener('click', () => this.toggleAPIKeyVisibility());
        }
        
        // Porkbun API key visibility toggle
        const togglePorkbunKeyBtn = document.getElementById('toggle-porkbun-key-visibility');
        if (togglePorkbunKeyBtn) {
            togglePorkbunKeyBtn.addEventListener('click', () => this.togglePorkbunKeyVisibility());
        }
        
        const togglePorkbunSecretBtn = document.getElementById('toggle-porkbun-secret-visibility');
        if (togglePorkbunSecretBtn) {
            togglePorkbunSecretBtn.addEventListener('click', () => this.togglePorkbunSecretVisibility());
        }
    }

    saveAISettings() {
        const apiKey = document.getElementById('api-key').value.trim();
        const model = document.getElementById('ai-model').value;
        const searchProvider = document.querySelector('input[name="search-api"]:checked')?.value || 'whois';
        const porkbunApiKey = document.getElementById('porkbun-api-key')?.value.trim() || '';
        const porkbunSecretKey = document.getElementById('porkbun-secret-key')?.value.trim() || '';

        // AI ayarlarını kaydet
        window.domainSearch.aiConfig.apiKey = apiKey;
        window.domainSearch.aiConfig.model = model;
        
        // Search provider ayarlarını kaydet
        window.domainSearch.searchConfig.provider = searchProvider;
        window.domainSearch.searchConfig.porkbunApiKey = porkbunApiKey;
        window.domainSearch.searchConfig.porkbunSecretKey = porkbunSecretKey;

        // LocalStorage'a kaydet
        localStorage.setItem('openrouter_api_key', apiKey);
        localStorage.setItem('openrouter_model', model);
        localStorage.setItem('search_provider', searchProvider);
        localStorage.setItem('porkbun_api_key', porkbunApiKey);
        localStorage.setItem('porkbun_secret_key', porkbunSecretKey);

        // Modal'ı kapat
        const modal = document.getElementById('settings-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');

        // AI durumunu güncelle
        if (apiKey && model) {
            window.domainSearch.aiConfig.enabled = true;
            localStorage.setItem('ai_enabled', 'true');
        } else {
            // API key veya model eksikse AI'yı devre dışı bırak
            window.domainSearch.aiConfig.enabled = false;
            localStorage.setItem('ai_enabled', 'false');
        }
        
        window.aiToggle.updateAIToggleUI();
        window.notificationManager.showNotification('Ayarlar kaydedildi! ⚙️', 'success');
    }

    async testAIConnection() {
        const apiKey = document.getElementById('api-key').value.trim();
        const model = document.getElementById('ai-model').value;

        if (!apiKey || !model) {
            window.notificationManager.showNotification('API anahtarı ve model seçimi gerekli!', 'warning');
            return;
        }

        const testBtn = document.getElementById('test-connection');
        const originalText = testBtn.innerHTML;
        testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Test Ediliyor...';
        testBtn.disabled = true;

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Domain Query App'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: 'Test' }],
                    max_tokens: 10
                })
            });

            if (response.ok) {
                window.notificationManager.showNotification('✅ AI bağlantısı başarılı!', 'success');
            } else {
                const error = await response.json();
                window.notificationManager.showNotification(`❌ Bağlantı hatası: ${error.error?.message || 'Bilinmeyen hata'}`, 'error');
            }
        } catch (error) {
            window.notificationManager.showNotification(`❌ Bağlantı hatası: ${error.message}`, 'error');
        } finally {
            testBtn.innerHTML = originalText;
            testBtn.disabled = false;
        }
    }

    toggleAPIKeyVisibility() {
        const apiKeyInput = document.getElementById('api-key');
        const toggleBtn = document.getElementById('toggle-key-visibility');
        
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            apiKeyInput.type = 'password';
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
        }
    }

    handleApiProviderChange(provider) {
        const porkbunSettings = document.getElementById('porkbun-settings');
        
        if (provider === 'porkbun') {
            porkbunSettings.classList.remove('hidden');
        } else {
            porkbunSettings.classList.add('hidden');
        }
    }
    
    togglePorkbunKeyVisibility() {
        const porkbunKeyInput = document.getElementById('porkbun-api-key');
        const toggleBtn = document.getElementById('toggle-porkbun-key-visibility');
        
        if (porkbunKeyInput.type === 'password') {
            porkbunKeyInput.type = 'text';
            toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            porkbunKeyInput.type = 'password';
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
        }
    }
    
    togglePorkbunSecretVisibility() {
        const porkbunSecretInput = document.getElementById('porkbun-secret-key');
        const toggleBtn = document.getElementById('toggle-porkbun-secret-visibility');
        
        if (porkbunSecretInput.type === 'password') {
            porkbunSecretInput.type = 'text';
            toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            porkbunSecretInput.type = 'password';
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
        }
    }
} 