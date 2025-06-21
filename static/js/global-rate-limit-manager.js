// Profesyonel Rate Limit Yönetici - Basit ve Güvenilir

class GlobalRateLimitManager {
    constructor() {
        this.isRateLimited = false;
        this.requestQueue = [];
        this.isProcessing = false;
        this.rateLimitEndTime = null;
        this.minRequestInterval = 1000; // 1 saniye minimum aralık
        this.lastRequestTime = 0;
        this.rateLimitCount = 0; // Rate limit sayacı
        this.maxRateLimitRetries = 2; // Maksimum 3 defa rate limit
        
        console.log('🔧 Global Rate Limit Manager initialized');
    }

    // Ana istek fonksiyonu
    async makeRequest(domain, apiCallFunction) {
        return new Promise((resolve, reject) => {
            const request = {
                id: Date.now() + Math.random(),
                domain,
                apiCallFunction,
                resolve,
                reject,
                timestamp: Date.now()
            };

            this.requestQueue.push(request);
            console.log(`📝 Queued request for ${domain} (Queue: ${this.requestQueue.length})`);
            
            this.showQueueStatus();
            this.processNextRequest();
        });
    }

    // Sıradaki isteği işle
    async processNextRequest() {
        if (this.isProcessing || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.requestQueue.length > 0) {
            // Rate limit aktifse bekle
            if (this.isRateLimited) {
                console.log(`⏳ Rate limited - waiting...`);
                await this.waitForRateLimit();
            }

            const request = this.requestQueue.shift();
            if (!request) break;

            try {
                console.log(`🚀 Processing: ${request.domain}`);
                this.showProcessingStatus(request.domain);

                // İstekler arası minimum bekleme
                const timeSinceLastRequest = Date.now() - this.lastRequestTime;
                if (timeSinceLastRequest < this.minRequestInterval) {
                    const waitTime = this.minRequestInterval - timeSinceLastRequest;
                    console.log(`⏱️ Waiting ${waitTime}ms between requests`);
                    await this.sleep(waitTime);
                }

                // API isteğini yap
                const result = await request.apiCallFunction();
                this.lastRequestTime = Date.now();

                // Rate limit kontrolü
                if (this.isRateLimitResponse(result)) {
                    console.log(`🚫 Rate limit detected for ${request.domain}`);
                    
                    // Rate limit sayacını artır
                    this.rateLimitCount++;
                    
                    // 3 defa rate limit alındıysa işlemleri durdur
                    if (this.rateLimitCount >= this.maxRateLimitRetries) {
                        console.log(`❌ Maximum rate limit retries (${this.maxRateLimitRetries}) reached - stopping operations`);
                        
                        // Tüm bekleyen istekleri iptal et
                        this.cancelAllRequests();
                        
                        // WHOIS'e geçiş önerisi göster
                        this.showWhoisSuggestion();
                        
                        // İşlemleri durdur
                        this.isProcessing = false;
                        this.hideQueueStatus();
                        return;
                    }
                    
                    // İsteği geri kuyruğa ekle
                    this.requestQueue.unshift(request);
                    
                                         // Rate limit'i başlat - 12 saniye garanti
                     const waitSeconds = 12;
                    await this.activateRateLimit(waitSeconds);
                    
                    continue; // Bu isteği tekrar dene
                }

                // Başarılı sonuç - rate limit sayacını sıfırla
                this.rateLimitCount = 0;
                console.log(`✅ Success for ${request.domain}: ${result.status}`);
                request.resolve(result);

            } catch (error) {
                console.error(`❌ Error for ${request.domain}:`, error);
                request.reject(error);
            }
        }

        this.isProcessing = false;
        this.hideQueueStatus();
        console.log(`✅ Queue processing completed`);
    }

    // Rate limit response kontrolü
    isRateLimitResponse(result) {
        return result.rate_limit || 
               (result.status && result.status.toLowerCase().includes('rate limit')) ||
               (result.error && result.error.toLowerCase().includes('rate limit'));
    }

    // Rate limit'i aktive et
    async activateRateLimit(waitSeconds) {
        this.isRateLimited = true;
        this.rateLimitEndTime = Date.now() + (waitSeconds * 1000);
        
        console.log(`🕐 Rate limit activated - waiting ${waitSeconds} seconds`);
        
        // UI güncellemeleri
        this.hideQueueStatus();
        this.showRateLimitNotification(waitSeconds);
        
        // Geri sayım
        await this.startCountdown(waitSeconds);
        
        // Rate limit bitti
        this.isRateLimited = false;
        this.rateLimitEndTime = null;
        
        console.log(`🟢 Rate limit cleared`);
        this.hideRateLimitNotification();
    }

    // Rate limit bitene kadar bekle
    async waitForRateLimit() {
        if (!this.isRateLimited || !this.rateLimitEndTime) {
            return;
        }

        const remainingTime = this.rateLimitEndTime - Date.now();
        if (remainingTime > 0) {
            await this.sleep(remainingTime);
        }
    }

    // Geri sayım
    async startCountdown(seconds) {
        return new Promise((resolve) => {
            let remaining = seconds;
            
            const tick = () => {
                if (remaining <= 0) {
                    resolve();
                    return;
                }
                
                this.updateCountdownDisplay(remaining);
                remaining--;
                setTimeout(tick, 1000);
            };
            
            tick();
        });
    }

    // Geri sayım display güncelle
    updateCountdownDisplay(seconds) {
        const notification = document.getElementById('rate-limit-notification');
        if (!notification) return;

        const countdownEl = notification.querySelector('.countdown-text');
        const progressEl = notification.querySelector('.countdown-progress');
        
        if (countdownEl) {
            countdownEl.textContent = `${seconds} saniye kaldı`;
        }
        
                 if (progressEl) {
             const totalSeconds = 12; // 12 saniye garanti
            const progress = ((totalSeconds - seconds) / totalSeconds) * 100;
            progressEl.style.width = `${Math.max(0, Math.min(100, progress))}%`;
        }
    }

    // Queue durumu göster
    showQueueStatus() {
        if (this.requestQueue.length === 0) return;

        let statusEl = document.getElementById('queue-status');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'queue-status';
            statusEl.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #3b82f6;
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 9998;
                font-size: 14px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            document.body.appendChild(statusEl);
        }

        statusEl.innerHTML = `
            <div style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <span>${this.requestQueue.length} sorgu sırada</span>
        `;
    }

    // İşleniyor durumu göster
    showProcessingStatus(domain) {
        let statusEl = document.getElementById('processing-status');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'processing-status';
            statusEl.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: #10b981;
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                z-index: 9997;
                font-size: 12px;
                display: flex;
                align-items: center;
                gap: 6px;
            `;
            document.body.appendChild(statusEl);
        }

        statusEl.innerHTML = `
            <div style="width: 8px; height: 8px; background: white; border-radius: 50%; animation: pulse 1.5s ease-in-out infinite;"></div>
            <span>Kontrol: ${domain}</span>
        `;

        // 3 saniye sonra gizle
        setTimeout(() => {
            if (statusEl && statusEl.parentNode) {
                statusEl.remove();
            }
        }, 3000);
    }

    // Queue durumu gizle
    hideQueueStatus() {
        const statusEl = document.getElementById('queue-status');
        if (statusEl) {
            statusEl.remove();
        }
    }

    // Rate limit bildirimi göster
    showRateLimitNotification(seconds) {
        this.hideRateLimitNotification();

        const notification = document.createElement('div');
        notification.id = 'rate-limit-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f97316;
            color: white;
            padding: 16px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            z-index: 9999;
            max-width: 320px;
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s ease;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div style="flex-shrink: 0; margin-top: 2px;">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                    </svg>
                </div>
                <div style="flex: 1;">
                    <h4 style="margin: 0; font-size: 14px; font-weight: 600;">Rate Limit Aktif</h4>
                    <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Porkbun API limiti aşıldı</p>
                    <div style="margin-top: 12px;">
                        <div class="countdown-text" style="font-size: 14px; font-weight: 500;">${seconds} saniye kaldı</div>
                        <div style="width: 100%; background: rgba(255,255,255,0.3); border-radius: 4px; height: 6px; margin-top: 6px; overflow: hidden;">
                            <div class="countdown-progress" style="background: white; height: 100%; border-radius: 4px; width: 0%; transition: width 1s ease;"></div>
                        </div>
                    </div>
                    <p style="margin: 8px 0 0 0; font-size: 11px; opacity: 0.75;">Sorgular otomatik devam edecek</p>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // Animasyonla göster
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 100);
    }

    // Rate limit bildirimi gizle
    hideRateLimitNotification() {
        const notification = document.getElementById('rate-limit-notification');
        if (notification) {
            notification.style.transform = 'translateX(100%)';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }

    // Yardımcı fonksiyon - bekleme
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Queue durumu
    getQueueStatus() {
        return {
            isRateLimited: this.isRateLimited,
            queueLength: this.requestQueue.length,
            isProcessing: this.isProcessing,
            rateLimitEndTime: this.rateLimitEndTime
        };
    }

    // Queue temizle
    clearQueue() {
        console.log(`🗑️ Clearing ${this.requestQueue.length} requests`);
        
        this.requestQueue.forEach(request => {
            request.reject(new Error('Request cancelled'));
        });
        
        this.requestQueue = [];
        this.isProcessing = false;
        this.hideQueueStatus();
        this.hideRateLimitNotification();
    }

    // Tüm bekleyen istekleri iptal et
    cancelAllRequests() {
        console.log(`❌ Cancelling ${this.requestQueue.length} pending requests`);
        
        // Tüm bekleyen isteklere hata gönder
        this.requestQueue.forEach(request => {
            request.reject(new Error('Rate limit exceeded - operations cancelled'));
        });
        
        // Queue'yu temizle
        this.requestQueue = [];
        this.hideQueueStatus();
        this.hideRateLimitNotification();
        
        // Loading modal'ını da kapat (güvenlik için)
        this.forceHideLoading();
    }

    // Loading modal'ını zorla kapat
    forceHideLoading() {
        try {
            const loading = document.getElementById('loading');
            if (loading) {
                loading.classList.add('hidden');
                loading.classList.remove('flex');
                console.log('🔧 Loading modal force closed');
            }
        } catch (error) {
            console.error('❌ Error force closing loading modal:', error);
        }
    }

    // WHOIS'e geçiş önerisi göster
    showWhoisSuggestion() {
        // Varolan bildirimleri gizle
        this.hideQueueStatus();
        this.hideRateLimitNotification();

        // WHOIS önerisi bildirimi oluştur
        let suggestionEl = document.getElementById('whois-suggestion');
        if (!suggestionEl) {
            suggestionEl = document.createElement('div');
            suggestionEl.id = 'whois-suggestion';
            document.body.appendChild(suggestionEl);
        }

        suggestionEl.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            padding: 24px;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 500px;
            width: 90%;
            text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            animation: slideInScale 0.4s ease-out;
        `;

        suggestionEl.innerHTML = `
            <style>
                @keyframes slideInScale {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.8);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                }
                @keyframes slideOutScale {
                    from {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                    to {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.8);
                    }
                }
            </style>
            <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <h3 style="font-size: 24px; font-weight: bold; margin: 0 0 12px 0;">
                Rate Limit Aşıldı!
            </h3>
            <p style="font-size: 16px; margin: 0 0 20px 0; opacity: 0.9; line-height: 1.5;">
                Porkbun API'si 3 defa rate limit hatası verdi.<br>
                Daha hızlı sonuç almak için <strong>WHOIS</strong> sorgusuna geçmenizi öneriyoruz.
            </p>
            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                <button onclick="window.globalRateLimitManager.switchToWhois()" 
                        style="background: white; color: #d97706; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; transition: all 0.2s;">
                    WHOIS'e Geç
                </button>
                <button onclick="window.globalRateLimitManager.hideWhoisSuggestion()" 
                        style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; transition: all 0.2s;">
                    Kapat
                </button>
            </div>
        `;

        console.log('🔄 WHOIS suggestion displayed');
    }

    // WHOIS'e geçiş yap
    switchToWhois() {
        console.log('🔄 Switching to WHOIS provider');
        
        // Settings manager'dan WHOIS'e geç
        if (window.settingsManager) {
            window.settingsManager.updateProvider('whois');
        }
        
        // Rate limit sayacını sıfırla
        this.rateLimitCount = 0;
        this.isRateLimited = false;
        this.isProcessing = false;
        
        // Bildirimi gizle
        this.hideWhoisSuggestion();
        
        // Başarı mesajı göster
        this.showSuccessMessage('WHOIS sorgusuna geçildi! Lütfen aramayı tekrar başlatın.');
        
        // 3 saniye sonra aramayı tekrar başlatma önerisi göster
        setTimeout(() => {
            this.showRestartSuggestion();
        }, 3000);
    }

    // WHOIS önerisini gizle
    hideWhoisSuggestion() {
        const suggestionEl = document.getElementById('whois-suggestion');
        if (suggestionEl) {
            suggestionEl.style.animation = 'slideOutScale 0.3s ease-in forwards';
            setTimeout(() => {
                if (suggestionEl.parentNode) {
                    suggestionEl.parentNode.removeChild(suggestionEl);
                }
            }, 300);
        }
    }

    // Başarı mesajı göster
    showSuccessMessage(message) {
        let messageEl = document.createElement('div');
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            font-size: 14px;
            font-weight: 500;
            max-width: 350px;
            animation: slideIn 0.3s ease-out;
        `;

        messageEl.innerHTML = `
            <style>
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            </style>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">✅</span>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(messageEl);

        // 5 saniye sonra otomatik gizle
        setTimeout(() => {
            messageEl.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, 5000);
    }

    // Rate limit sayacını sıfırla (yeni arama için)
    resetRateLimitCount() {
        this.rateLimitCount = 0;
        console.log('🔄 Rate limit count reset');
    }

    // Aramayı yeniden başlatma önerisi göster
    showRestartSuggestion() {
        let suggestionEl = document.getElementById('restart-suggestion');
        if (suggestionEl) {
            suggestionEl.remove(); // Varsa kaldır
        }

        suggestionEl = document.createElement('div');
        suggestionEl.id = 'restart-suggestion';
        suggestionEl.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            z-index: 9999;
            max-width: 350px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            animation: slideInFromBottom 0.4s ease-out;
        `;

        suggestionEl.innerHTML = `
            <style>
                @keyframes slideInFromBottom {
                    from {
                        opacity: 0;
                        transform: translateY(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes slideOutToBottom {
                    from {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateY(100%);
                    }
                }
            </style>
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div style="flex-shrink: 0; margin-top: 2px;">
                    <span style="font-size: 20px;">🔄</span>
                </div>
                <div style="flex: 1;">
                    <h4 style="margin: 0; font-size: 16px; font-weight: 600;">WHOIS Aktif</h4>
                    <p style="margin: 6px 0 12px 0; font-size: 14px; opacity: 0.9; line-height: 1.4;">
                        Artık WHOIS ile hızlı sorgulama yapabilirsiniz. Aramayı tekrar başlatın.
                    </p>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="window.globalRateLimitManager.hideRestartSuggestion()" 
                                style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 8px 16px; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 13px; transition: all 0.2s;">
                            Anladım
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(suggestionEl);

        // 10 saniye sonra otomatik gizle
        setTimeout(() => {
            this.hideRestartSuggestion();
        }, 10000);

        console.log('💡 Restart suggestion displayed');
    }

    // Yeniden başlatma önerisini gizle
    hideRestartSuggestion() {
        const suggestionEl = document.getElementById('restart-suggestion');
        if (suggestionEl) {
            suggestionEl.style.animation = 'slideOutToBottom 0.3s ease-in forwards';
            setTimeout(() => {
                if (suggestionEl.parentNode) {
                    suggestionEl.parentNode.removeChild(suggestionEl);
                }
            }, 300);
        }
    }
}

// CSS animasyonları ekle
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
`;
document.head.appendChild(style);

// Global instance
window.globalRateLimitManager = new GlobalRateLimitManager(); 