// AI Toggle Yöneticisi - AI özelliklerinin açılıp kapatılması

class AIToggle {
    constructor() {}

    setupAIToggle() {
        // AI toggle durumunu kontrol et ve UI'yi güncelle
        this.updateAIToggleUI();
    }

    toggleAI() {
        window.domainSearch.aiConfig.enabled = !window.domainSearch.aiConfig.enabled;
        localStorage.setItem('ai_enabled', window.domainSearch.aiConfig.enabled.toString());
        this.updateAIToggleUI();
        
        // Bildirim göster
        if (window.domainSearch.aiConfig.enabled) {
            window.notificationManager.showNotification('AI önerileri aktif edildi! 🤖', 'success');
        } else {
            window.notificationManager.showNotification('AI önerileri devre dışı bırakıldı', 'info');
        }
    }

    updateAIToggleUI() {
        const toggleBtn = document.getElementById('ai-toggle-btn');
        const aiStatusText = document.getElementById('ai-status-text');
        const toggleSwitch = document.getElementById('ai-toggle-switch');
        const aiQuickSettings = document.getElementById('ai-quick-settings');
        const apiKeyStatus = document.getElementById('api-key-status');
        const modelStatus = document.getElementById('model-status');
        
        if (!toggleBtn || !aiStatusText || !toggleSwitch) return;
        
        const isEnabled = window.domainSearch.aiConfig.enabled;
        const hasApiKey = window.domainSearch.aiConfig.apiKey && window.domainSearch.aiConfig.model;
        
        // Toggle switch'i güncelle
        if (isEnabled) {
            toggleBtn.classList.remove('bg-gray-200');
            toggleBtn.classList.add('bg-purple-600');
            toggleSwitch.classList.remove('translate-x-1');
            toggleSwitch.classList.add('translate-x-6');
        } else {
            toggleBtn.classList.remove('bg-purple-600');
            toggleBtn.classList.add('bg-gray-200');
            toggleSwitch.classList.remove('translate-x-6');
            toggleSwitch.classList.add('translate-x-1');
        }
        
        // Status text'i güncelle
        if (isEnabled && hasApiKey) {
            aiStatusText.textContent = 'Aktif';
            aiStatusText.className = 'text-sm font-medium text-green-600';
        } else if (isEnabled && !hasApiKey) {
            aiStatusText.textContent = 'Ayar Gerekli';
            aiStatusText.className = 'text-sm font-medium text-yellow-600';
        } else {
            aiStatusText.textContent = 'Kapalı';
            aiStatusText.className = 'text-sm font-medium text-gray-600';
        }
        
        // Quick settings'i göster/gizle ve güncelle
        if (aiQuickSettings) {
            if (isEnabled) {
                aiQuickSettings.classList.remove('hidden');
                
                if (apiKeyStatus) {
                    apiKeyStatus.textContent = hasApiKey ? 'API Key: Girildi' : 'API Key: Girilmedi';
                }
                
                if (modelStatus) {
                    const modelName = this.getModelDisplayName(window.domainSearch.aiConfig.model);
                    modelStatus.textContent = window.domainSearch.aiConfig.model ? `Model: ${modelName}` : 'Model: Seçilmedi';
                }
            } else {
                aiQuickSettings.classList.add('hidden');
            }
        }
    }

    getModelDisplayName(modelId) {
        const modelNames = {
            'openai/gpt-4o-mini': 'GPT-4O Mini',
            'openai/gpt-4o': 'GPT-4O',
            'openai/gpt-4-turbo': 'GPT-4 Turbo',
            'openai/gpt-3.5-turbo': 'GPT-3.5 Turbo',
            'google/gemini-2.5-flash': 'Gemini 2.5 Flash',
            'anthropic/claude-3.5-sonnet': 'Claude 3.5 Sonnet',
            'meta-llama/llama-3.1-405b-instruct': 'Llama 3.1 405B'
        };
        return modelNames[modelId] || modelId.split('/').pop();
    }
} 