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
        const toggleBtn = document.getElementById('ai-toggle');
        const aiStatus = document.getElementById('ai-status');
        
        if (!toggleBtn || !aiStatus) return;
        
        const isEnabled = window.domainSearch.aiConfig.enabled;
        const hasApiKey = window.domainSearch.aiConfig.apiKey && window.domainSearch.aiConfig.model;
        
        // Buton durumunu güncelle
        if (isEnabled && hasApiKey) {
            toggleBtn.className = 'px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center space-x-2';
            toggleBtn.innerHTML = '<i class="fas fa-robot"></i><span>AI Aktif</span>';
            aiStatus.innerHTML = '<i class="fas fa-check-circle text-green-500"></i><span class="text-green-700">AI Önerileri Aktif</span>';
        } else if (isEnabled && !hasApiKey) {
            toggleBtn.className = 'px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors flex items-center space-x-2';
            toggleBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>Ayar Gerekli</span>';
            aiStatus.innerHTML = '<i class="fas fa-exclamation-triangle text-yellow-500"></i><span class="text-yellow-700">API Anahtarı Gerekli</span>';
        } else {
            toggleBtn.className = 'px-4 py-2 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors flex items-center space-x-2';
            toggleBtn.innerHTML = '<i class="fas fa-robot"></i><span>AI Kapalı</span>';
            aiStatus.innerHTML = '<i class="fas fa-times-circle text-gray-500"></i><span class="text-gray-700">AI Önerileri Kapalı</span>';
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