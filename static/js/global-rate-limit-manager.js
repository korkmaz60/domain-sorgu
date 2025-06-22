// Profesyonel Rate Limit Yönetici - Basit ve Güvenilir

class GlobalRateLimitManager {
    constructor() {
        this.retryQueue = [];
        this.isProcessing = false;
        this.rateLimitCount = 0;
        this.lastRateLimit = null;
        this.retryAttempts = new Map(); // domain -> attempt count
        this.maxRetryAttempts = 3;
        this.baseDelay = 10000; // 10 saniye base delay
        this.rateLimitWindow = 60000; // 1 dakika window
        
        console.log('🌐 Global Rate Limit Manager başlatıldı');
    }

    async makeRequest(domain, requestFunction) {
        const key = this.generateRequestKey(domain);
        
        // Rate limit kontrolü
        if (this.isInRateLimit()) {
            console.log(`🚫 Rate limit aktif, ${domain} kuyruğa ekleniyor`);
            return this.addToRetryQueue(domain, requestFunction);
        }

        try {
            const result = await requestFunction();
            
            // Rate limit kontrolü sonuçta
            if (this.isResultRateLimited(result)) {
                console.log(`📊 Rate limit sonuç algılandı: ${domain}`);
                return this.handleRateLimitedResult(domain, result, requestFunction);
            }

            // Başarılı sonuç için retry attempt'i sıfırla
            this.retryAttempts.delete(key);
            return result;

        } catch (error) {
            console.error(`❌ Request error for ${domain}:`, error);
            throw error;
        }
    }

    isResultRateLimited(result) {
        if (!result) return false;
        
        return (
            result.rate_limit === true ||
            result.status === 'Rate Limit' ||
            (result.error && result.error.includes('rate limit')) ||
            (result.error && result.error.includes('Rate limit')) ||
            (result.status && result.status.includes('Rate Limit'))
        );
    }

    async handleRateLimitedResult(domain, result, requestFunction) {
        this.rateLimitCount++;
        this.lastRateLimit = Date.now();
        
        // Wait seconds bilgisini al
        const waitSeconds = result.wait_seconds || result.retry_after || 60;
        
        console.log(`⏳ GoDaddy API rate limit: ${domain}, ${waitSeconds}s beklenecek`);
        
        // UI notification
        this.showRateLimitNotification(domain, waitSeconds);
        
        // Retry queue'ya ekle
        return this.addToRetryQueue(domain, requestFunction, waitSeconds * 1000);
    }

    async addToRetryQueue(domain, requestFunction = null, customDelay = null) {
        const key = this.generateRequestKey(domain);
        const currentAttempts = this.retryAttempts.get(key) || 0;
        
        if (currentAttempts >= this.maxRetryAttempts) {
            console.log(`🚫 Max retry attempts reached for ${domain}`);
            this.showMaxRetryNotification(domain);
            
            return {
                domain: domain,
                available: null,
                status: 'Max Retry Aşıldı',
                error: `${this.maxRetryAttempts} deneme sonrası başarısız`,
                rate_limit: true
            };
        }

        // Retry attempt'i artır
        this.retryAttempts.set(key, currentAttempts + 1);
        
        // Delay hesapla
        const delay = customDelay || this.calculateRetryDelay(currentAttempts);
        
        const queueItem = {
            domain: domain,
            requestFunction: requestFunction,
            retryAfter: Date.now() + delay,
            attempts: currentAttempts + 1
        };

        // Queue'ya ekle (zaten varsa güncelle)
        const existingIndex = this.retryQueue.findIndex(item => item.domain === domain);
        if (existingIndex !== -1) {
            this.retryQueue[existingIndex] = queueItem;
        } else {
            this.retryQueue.push(queueItem);
        }

        console.log(`🔄 ${domain} retry queue'ya eklendi (${delay}ms delay, attempt ${currentAttempts + 1})`);
        
        // Processing başlat
        if (!this.isProcessing) {
            this.startProcessing();
        }

        // Geçici sonuç döndür
        return {
            domain: domain,
            available: null,
            status: 'Retry Kuyruğunda',
            error: `${Math.ceil(delay / 1000)} saniye sonra yeniden denenecek`,
            rate_limit: true,
            retry_after: delay / 1000,
            queue_position: this.retryQueue.length
        };
    }

    async startProcessing() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        console.log('🔄 Retry queue processing başlatıldı');

        while (this.retryQueue.length > 0) {
            const now = Date.now();
            
            // Ready olan item'ları bul
            const readyItems = this.retryQueue.filter(item => item.retryAfter <= now);
            
            if (readyItems.length === 0) {
                // En yakın retry time'ını bekle
                const nextRetry = Math.min(...this.retryQueue.map(item => item.retryAfter));
                const waitTime = Math.max(1000, nextRetry - now); // En az 1 saniye bekle
                
                console.log(`⏰ ${waitTime}ms bekliyor, queue size: ${this.retryQueue.length}`);
                await this.sleep(waitTime);
                continue;
            }

            // Ready item'ları işle
            for (const item of readyItems) {
                try {
                    console.log(`🔄 Retry işleniyor: ${item.domain} (attempt ${item.attempts})`);
                    
                    if (item.requestFunction) {
                        const result = await item.requestFunction();
                        
                        // Sonucu kontrol et
                        if (this.isResultRateLimited(result)) {
                            console.log(`🚫 Hala rate limited: ${item.domain}`);
                            
                            // Tekrar kuyruğa ekle (recursive)
                            await this.handleRateLimitedResult(item.domain, result, item.requestFunction);
                        } else {
                            console.log(`✅ Retry başarılı: ${item.domain}`);
                            
                            // Başarı notification'ı
                            this.showRetrySuccessNotification(item.domain, result);
                            
                            // Results'ı güncelle
                            this.updateResultsDisplay(item.domain, result);
                            
                            // Retry attempt'i temizle
                            const key = this.generateRequestKey(item.domain);
                            this.retryAttempts.delete(key);
                        }
                    }
                    
                } catch (error) {
                    console.error(`❌ Retry error for ${item.domain}:`, error);
                    this.showRetryErrorNotification(item.domain, error);
                }
                
                // Queue'dan çıkar
                const index = this.retryQueue.findIndex(i => i.domain === item.domain);
                if (index !== -1) {
                    this.retryQueue.splice(index, 1);
                }
                
                // Rate limit'e karşı delay
                await this.sleep(1000);
            }
        }

        this.isProcessing = false;
        console.log('✅ Retry queue processing tamamlandı');
    }

    calculateRetryDelay(attempt) {
        // Exponential backoff with jitter
        const exponentialDelay = this.baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 1000; // 0-1000ms jitter
        return Math.min(exponentialDelay + jitter, 120000); // Max 2 dakika
    }

    generateRequestKey(domain) {
        return domain.toLowerCase();
    }

    isInRateLimit() {
        if (!this.lastRateLimit) return false;
        
        const timeSinceLastRateLimit = Date.now() - this.lastRateLimit;
        return timeSinceLastRateLimit < this.rateLimitWindow;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // UI Notification Methods
    showRateLimitNotification(domain, waitSeconds) {
        const message = `🚫 ${domain} - GoDaddy API rate limit (${waitSeconds}s bekle)`;
        this.showNotification(message, 'warning', 5000);
        
        // Console için detaylı bilgi
        console.log(`🚫 RATE LIMIT: ${domain}`);
        console.log(`⏰ Wait time: ${waitSeconds} seconds`);
        console.log(`📊 Total rate limits: ${this.rateLimitCount}`);
    }

    showRetrySuccessNotification(domain, result) {
        const availableText = result.available === true ? '✅ Müsait' : 
                            result.available === false ? '❌ Kayıtlı' : '❓ Bilinmeyen';
        
        const message = `🔄 ${domain} - Retry başarılı! ${availableText}`;
        this.showNotification(message, 'success', 3000);
    }

    showRetryErrorNotification(domain, error) {
        const message = `❌ ${domain} - Retry hatası: ${error.message}`;
        this.showNotification(message, 'error', 4000);
    }

    showMaxRetryNotification(domain) {
        const message = `🚫 ${domain} - Max retry aşıldı, manuel kontrol gerekli`;
        this.showNotification(message, 'error', 6000);
    }

    showNotification(message, type = 'info', duration = 3000) {
        // Window notification manager kullan
        if (window.notificationManager) {
            if (type === 'warning') {
                window.notificationManager.showWarning(message);
            } else if (type === 'success') {
                window.notificationManager.showSuccess(message);
            } else if (type === 'error') {
                window.notificationManager.showError(message);
            } else {
                window.notificationManager.showInfo(message);
            }
            return;
        }

        // Fallback: Manuel notification
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full`;
        
        const bgColor = type === 'success' ? 'bg-green-500' :
                        type === 'error' ? 'bg-red-500' :
                        type === 'warning' ? 'bg-yellow-500' :
                        'bg-blue-500';
        
        notification.classList.add(bgColor);
        notification.innerHTML = `
            <div class="flex items-start">
                <div class="text-white text-sm font-medium pr-2">
                    ${message}
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200 ml-auto">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);

        // Auto remove
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.add('translate-x-full');
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);
    }

    updateResultsDisplay(domain, result) {
        // Ana sonuç display'ini güncelle
        if (window.resultRenderer && window.domainSearch) {
            // Mevcut sonuçları bul ve güncelle
            const currentResults = window.domainSearch.currentResults || [];
            const index = currentResults.findIndex(r => r.domain === domain);
            
            if (index !== -1) {
                currentResults[index] = result;
                window.resultRenderer.renderResults(currentResults, window.domainSearch.searchConfig.provider);
            }
        }
    }

    // Stats Methods
    getStats() {
        return {
            queueSize: this.retryQueue.length,
            rateLimitCount: this.rateLimitCount,
            isProcessing: this.isProcessing,
            lastRateLimit: this.lastRateLimit,
            activeRetries: Array.from(this.retryAttempts.entries())
        };
    }

    clearQueue() {
        this.retryQueue = [];
        this.retryAttempts.clear();
        this.isProcessing = false;
        console.log('🧹 Retry queue temizlendi');
    }

    // Rate limit sayacını sıfırla
    resetRateLimitCount() {
        this.rateLimitCount = 0;
        this.lastRateLimit = null;
        console.log('🔄 Rate limit count sıfırlandı');
    }

    // Advanced Rate Limit Detection
    detectAdvancedRateLimit(responseText, statusCode) {
        const rateLimitIndicators = [
            'rate limit',
            'too many requests',
            'quota exceeded',
            'throttled',
            'retry after',
            'rate-limited',
            'api limit',
            'request limit'
        ];

        const text = responseText.toLowerCase();
        const hasRateLimitText = rateLimitIndicators.some(indicator => text.includes(indicator));
        const hasRateLimitStatus = statusCode === 429 || statusCode === 503;

        return hasRateLimitText || hasRateLimitStatus;
    }
}

// Global instance
window.globalRateLimitManager = new GlobalRateLimitManager(); 