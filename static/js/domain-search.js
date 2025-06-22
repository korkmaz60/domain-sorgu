// Domain Arama Sınıfı - Ana domain arama işlevleri

class DomainSearchApp {
    constructor() {
        this.aiConfig = {
            apiKey: localStorage.getItem('openrouter_api_key') || '',
            model: localStorage.getItem('openrouter_model') || 'openai/gpt-4o-mini',
            enabled: localStorage.getItem('ai_enabled') === 'true' || false
        };
        this.searchConfig = {
            provider: localStorage.getItem('domain_search_provider') || 'whois',
            godaddyApiKey: localStorage.getItem('godaddy_api_key') || '',
            godaddySecretKey: localStorage.getItem('godaddy_secret_key') || '',
            aiEnabled: localStorage.getItem('ai_enabled') === 'true' || false,
            openrouterApiKey: localStorage.getItem('openrouter_api_key') || '',
            aiModel: localStorage.getItem('ai_model') || ''
        };
        this.currentBaseName = '';
        this.usedSuggestions = new Set();
        this.isSearching = false;
        this.currentResults = [];
        
        console.log('🔍 DomainSearch başlatıldı:');
        console.log('📋 Config bilgileri:', {
            provider: this.searchConfig.provider,
            godaddyApiKeyLength: this.searchConfig.godaddyApiKey.length,
            godaddySecretKeyLength: this.searchConfig.godaddySecretKey.length,
            aiEnabled: this.searchConfig.aiEnabled,
            openrouterApiKeyLength: this.searchConfig.openrouterApiKey.length,
            aiModel: this.searchConfig.aiModel
        });
        console.log('💾 LocalStorage durumu:', {
            domain_search_provider: localStorage.getItem('domain_search_provider'),
            godaddy_api_key_length: (localStorage.getItem('godaddy_api_key') || '').length,
            godaddy_secret_key_length: (localStorage.getItem('godaddy_secret_key') || '').length,
            ai_enabled: localStorage.getItem('ai_enabled')
        });
    }

    showLoading(show = true) {
        const loading = document.getElementById('loading');
        if (show) {
            loading.classList.remove('hidden');
            loading.classList.add('flex');
        } else {
            loading.classList.add('hidden');
            loading.classList.remove('flex');
        }
    }

    async handleVariations(e) {
        e.preventDefault();
        
        const domainInput = document.getElementById('base-name').value.trim();
        if (!domainInput) {
            this.showError('variations-results', 'Lütfen domain adı girin');
            return;
        }

        // Yeni arama için rate limit sayacını sıfırla
        if (window.globalRateLimitManager) {
            window.globalRateLimitManager.resetRateLimitCount();
        }

        // Eğer tam domain yazılmışsa (nokta içeriyorsa) tek domain kontrolü yap
        if (domainInput.includes('.')) {
            await this.handleSingleDomainCheck(domainInput);
            return;
        }

        // Eğer sadece isim yazılmışsa çoklu uzantı kontrolü yap
        const extensions = Array.from(document.querySelectorAll('.extension-label input:checked'))
            .map(input => input.value);

        if (extensions.length === 0) {
            this.showError('variations-results', 'Lütfen en az bir uzantı seçin');
            return;
        }

        this.showLoading(true);

        try {
            // Domain listesi oluştur
            const domains = extensions.map(ext => `${domainInput}.${ext}`);
            console.log(`🔍 Checking ${domains.length} domains one by one:`, domains);

            // Sonuçları tutacak arrays
            const availableResults = [];
            const takenResults = [];
            const unknownResults = [];

            // Her domain'i tek tek kontrol et
            for (const domain of domains) {
                try {
                    const result = await this.checkSingleDomain(domain);
            
                    if (result.error && !result.rate_limit) {
                        // Hata varsa unknown olarak işaretle
                        unknownResults.push({
                            domain: domain,
                            available: null,
                            error: result.error
                        });
            } else {
                        // Başarılı sonuç
                        const domainResult = {
                            domain: domain,
                            available: result.available,
                            price: result.price || null
                        };

                        if (result.available === true) {
                            availableResults.push(domainResult);
                        } else if (result.available === false) {
                            takenResults.push(domainResult);
                        } else {
                            unknownResults.push(domainResult);
                        }
                    }
                } catch (error) {
                    console.error(`❌ Error checking ${domain}:`, error);
                    
                    // Rate limit aşıldığında işlemler iptal edildi
                    if (error.message && error.message.includes('Rate limit exceeded')) {
                        console.log('🛑 Operations cancelled due to rate limit - stopping loop');
                        this.showError('variations-results', 'İşlemler rate limit nedeniyle iptal edildi. WHOIS\'e geçiş yapın.');
                        this.showLoading(false); // Loading'i kapat
                        return; // Fonksiyondan çık
                    }
                    
                    unknownResults.push({
                        domain: domain,
                        available: null,
                        error: 'Kontrol hatası'
                    });
                }
            }

            // Sonuçları göster
                this.displayCategorizedResults(domainInput, availableResults, takenResults, unknownResults, 'variations-results');
                
                // AI önerilerini al (eğer aktifse)
            console.log('🔍 AI kontrol:', { enabled: this.searchConfig.aiEnabled, hasApiKey: !!this.searchConfig.openrouterApiKey, hasModel: !!this.searchConfig.aiModel });
                if (this.searchConfig.aiEnabled && this.searchConfig.openrouterApiKey && this.searchConfig.aiModel) {
                    this.currentBaseName = domainInput;
                    this.usedSuggestions.clear(); // Yeni arama için önceki önerileri temizle
                // AISuggestions class'ının currentBaseName'ini de set et
                window.aiSuggestions.currentBaseName = domainInput;
                window.aiSuggestions.usedSuggestions.clear();
                    window.aiSuggestions.getAISuggestions(domainInput);
            } else {
                // AI kapalıysa veya ayar eksikse placeholder göster
                const aiSuggestions = document.getElementById('ai-suggestions');
                const aiResults = document.getElementById('ai-results');
                
                if (this.searchConfig.aiEnabled && (!this.searchConfig.openrouterApiKey || !this.searchConfig.aiModel)) {
                    aiSuggestions.classList.remove('hidden');
                    aiResults.innerHTML = `
                        <div class="bg-yellow-100 border border-yellow-200 rounded-xl p-6 text-center">
                            <i class="fas fa-exclamation-triangle text-2xl text-yellow-600 mb-2"></i>
                            <p class="text-yellow-700 font-medium">AI önerileri için API anahtarı ve model seçimi gerekli!</p>
                            <button onclick="document.getElementById('settings-btn').click()" class="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
                                Ayarları Aç
                            </button>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('❌ Variations check error:', error);
            this.showError('variations-results', 'Bağlantı hatası oluştu');
        } finally {
            this.showLoading(false);
        }
    }

    async handleSingleDomainCheck(domain) {
        this.showLoading(true);
        
        try {
            const result = await this.checkSingleDomain(domain);
            
            if (result.error && !result.rate_limit) {
                this.showError('variations-results', result.error);
            } else {
                this.displaySingleResult(result, 'variations-results');
            }
        } catch (error) {
            this.showError('variations-results', 'Bağlantı hatası oluştu');
        } finally {
            this.showLoading(false);
        }
    }

    // Yardımcı fonksiyon - tek domain kontrolü
    async checkSingleDomain(domain) {
        // Porkbun API kullanılıyorsa global rate limit manager'ı kullan
        if (this.searchConfig.provider === 'godaddy' && window.globalRateLimitManager) {
            console.log(`🔄 Using rate limit manager for: ${domain}`);
            return await window.globalRateLimitManager.makeRequest(domain, async () => {
                return await this.makeDirectAPICall(domain);
            });
        } else {
            // WHOIS için direkt çağrı
            console.log(`🔄 Direct API call for: ${domain}`);
            return await this.makeDirectAPICall(domain);
        }
    }

    // Direkt API çağrısı (queue'dan veya WHOIS için)
    async makeDirectAPICall(domain) {
            const requestBody = { 
                domain,
                provider: this.searchConfig.provider
            };

            if (this.searchConfig.provider === 'godaddy') {
                requestBody.godaddy_api_key = this.searchConfig.godaddyApiKey;
                requestBody.godaddy_secret_key = this.searchConfig.godaddySecretKey;
                
                console.log('🔑 GoDaddy API anahtarları kontrol:', {
                    apiKeyLength: this.searchConfig.godaddyApiKey.length,
                    secretKeyLength: this.searchConfig.godaddySecretKey.length,
                    apiKeyPreview: this.searchConfig.godaddyApiKey.substring(0, 8) + '...',
                    secretKeyPreview: this.searchConfig.godaddySecretKey.substring(0, 8) + '...'
                });
            }

        console.log(`📡 Making API call for: ${domain} via ${this.searchConfig.provider}`);
        console.log('📦 Request body:', {
            domain: requestBody.domain,
            provider: requestBody.provider,
            hasGodaddyApiKey: !!requestBody.godaddy_api_key,
            hasGodaddySecretKey: !!requestBody.godaddy_secret_key
        });

            const response = await fetch('/api/check-domain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();
        console.log(`📡 API response for ${domain}:`, {
            status: result.status,
            available: result.available,
            provider: result.provider,
            error: result.error || 'none',
            httpStatus: response.status
        });
        
        return result;
    }

    async handleBulkCheck(e) {
        e.preventDefault();
        
        const domainsText = document.getElementById('bulk-domains').value.trim();
        if (!domainsText) return;

        // Yeni arama için rate limit sayacını sıfırla
        if (window.globalRateLimitManager) {
            window.globalRateLimitManager.resetRateLimitCount();
        }

        const domains = domainsText.split('\n')
            .map(domain => domain.trim())
            .filter(domain => domain.length > 0);

        if (domains.length === 0) {
            this.showError('bulk-results', 'Lütfen en az bir domain girin');
            return;
        }

        this.showLoading(true);

        try {
            console.log(`🔍 Bulk checking ${domains.length} domains one by one:`, domains);
            const results = [];

            // Her domain'i tek tek kontrol et
            for (const domain of domains) {
                try {
                    const result = await this.checkSingleDomain(domain);
                    
                    results.push({
                        domain: domain,
                        available: result.available,
                        price: result.price || null,
                        error: result.error || null
                    });
                } catch (error) {
                    console.error(`❌ Error checking ${domain}:`, error);
                    
                    // Rate limit aşıldığında işlemler iptal edildi
                    if (error.message && error.message.includes('Rate limit exceeded')) {
                        console.log('🛑 Bulk operations cancelled due to rate limit - stopping loop');
                        this.showError('bulk-results', 'İşlemler rate limit nedeniyle iptal edildi. WHOIS\'e geçiş yapın.');
                        this.showLoading(false); // Loading'i kapat
                        return; // Fonksiyondan çık
                    }
                    
                    results.push({
                        domain: domain,
                        available: null,
                        error: 'Kontrol hatası'
                    });
                }
            }

            // Sonuçları göster
            this.displayMultipleResults(results, 'bulk-results');
        } catch (error) {
            console.error('❌ Bulk check error:', error);
            this.showError('bulk-results', 'Bağlantı hatası oluştu');
        } finally {
            this.showLoading(false);
        }
    }

    displayCategorizedResults(baseName, availableResults, takenResults, unknownResults, containerId) {
        const resultsContainer = document.getElementById(containerId);
        
        let html = `
            <div class="bg-white rounded-2xl shadow-xl p-8 mb-6 animate-fade-in">
                <div class="flex items-center mb-6">
                    <i class="fas fa-search text-2xl text-primary-500 mr-3"></i>
                    <h3 class="text-2xl font-bold text-gray-800">"${baseName}" için Domain Kontrolü</h3>
                </div>
                <div class="grid grid-cols-3 gap-4 mb-6">
                    <div class="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                        <div class="text-3xl font-bold text-green-600">${availableResults.length}</div>
                        <div class="text-green-700 font-medium">Müsait</div>
                    </div>
                    <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                        <div class="text-3xl font-bold text-red-600">${takenResults.length}</div>
                        <div class="text-red-700 font-medium">Kayıtlı</div>
                    </div>
                    <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                        <div class="text-3xl font-bold text-yellow-600">${unknownResults.length}</div>
                        <div class="text-yellow-700 font-medium">Bilinmeyen</div>
                    </div>
                </div>
            </div>
        `;

        if (availableResults.length > 0) {
            html += `<div class="bg-white rounded-2xl shadow-xl p-8 mb-6 animate-fade-in">
                        <h4 class="text-xl font-bold text-green-600 mb-4 flex items-center">
                            <i class="fas fa-check-circle mr-2"></i>
                            Müsait Domainler
                        </h4>
                        <div class="grid gap-4">`;
            
            availableResults.forEach(result => {
                html += window.resultRenderer.createResultHTML(result);
            });
            
            html += `</div></div>`;
        }

        if (takenResults.length > 0) {
            html += `<div class="bg-white rounded-2xl shadow-xl p-8 mb-6 animate-fade-in">
                        <h4 class="text-xl font-bold text-red-600 mb-4 flex items-center">
                            <i class="fas fa-times-circle mr-2"></i>
                            Kayıtlı Domainler
                        </h4>
                        <div class="grid gap-4">`;
            
            takenResults.forEach(result => {
                html += window.resultRenderer.createResultHTML(result);
            });
            
            html += `</div></div>`;
        }

        if (unknownResults.length > 0) {
            html += `<div class="bg-white rounded-2xl shadow-xl p-8 mb-6 animate-fade-in">
                        <h4 class="text-xl font-bold text-yellow-600 mb-4 flex items-center">
                            <i class="fas fa-question-circle mr-2"></i>
                            Kontrol Edilemeyen Domainler
                        </h4>
                        <div class="grid gap-4">`;
            
            unknownResults.forEach(result => {
                html += window.resultRenderer.createResultHTML(result);
            });
            
            html += `</div></div>`;
        }

        resultsContainer.innerHTML = html;
    }

    displaySingleResult(result, containerId = 'variations-results') {
        const resultsContainer = document.getElementById(containerId);
        
        const html = `
            <div class="single-domain-result">
                <h3><i class="fas fa-search"></i> "${result.domain}" Kontrolü</h3>
                ${window.resultRenderer.createResultHTML(result)}
            </div>
        `;
        
        resultsContainer.innerHTML = html;
    }

    displayMultipleResults(results, containerId) {
        const resultsContainer = document.getElementById(containerId);
        
        // Özet oluştur
        const available = results.filter(r => r.available === true).length;
        const taken = results.filter(r => r.available === false).length;
        const unknown = results.filter(r => r.available === null).length;

        let html = `
            <div class="results-summary">
                <h3>📊 Kontrol Sonuçları</h3>
                <div class="summary-stats">
                    <div class="summary-stat">
                        <div class="summary-stat-number">${available}</div>
                        <div class="summary-stat-label">Müsait</div>
                    </div>
                    <div class="summary-stat">
                        <div class="summary-stat-number">${taken}</div>
                        <div class="summary-stat-label">Kayıtlı</div>
                    </div>
                    <div class="summary-stat">
                        <div class="summary-stat-number">${unknown}</div>
                        <div class="summary-stat-label">Bilinmeyen</div>
                    </div>
                </div>
            </div>
        `;

        // Sonuçları ekle
        results.forEach(result => {
            html += window.resultRenderer.createResultHTML(result);
        });

        resultsContainer.innerHTML = html;
    }

    showError(containerId, message) {
        const container = document.getElementById(containerId);
        container.innerHTML = `
            <div class="bg-red-50 border-2 border-red-200 rounded-xl p-6 animate-fade-in">
                <div class="flex items-center mb-4">
                    <i class="fas fa-exclamation-triangle text-2xl text-red-500 mr-3"></i>
                    <h4 class="text-xl font-bold text-red-700">Hata Oluştu</h4>
                </div>
                <div class="bg-white/50 rounded-lg p-4">
                    <p class="text-red-800">${message}</p>
                </div>
            </div>
        `;
    }

    async checkVariations(baseName, extensions) {
        if (this.isSearching) {
            window.notificationManager.showWarning('Önceki arama devam ediyor...');
            return;
        }

        if (!baseName || extensions.length === 0) {
            window.notificationManager.showError('Domain adı ve en az bir uzantı seçilmelidir!');
            return;
        }

        this.isSearching = true;
        this.showLoading(true);
        
        try {
            const requestBody = {
                base_name: baseName,
                extensions: extensions,
                provider: this.searchConfig.provider
            };

            // API key'leri ekle (eğer provider GoDaddy ise)
            if (this.searchConfig.provider === 'godaddy') {
                if (!this.searchConfig.godaddyApiKey || !this.searchConfig.godaddySecretKey) {
                    window.notificationManager.showError('GoDaddy API anahtarları eksik! Ayarlardan ekleyin.');
                    return;
                }
                requestBody.godaddy_api_key = this.searchConfig.godaddyApiKey;
                requestBody.godaddy_secret_key = this.searchConfig.godaddySecretKey;
            }

            console.log('📡 Varyasyon kontrolü başlatılıyor:', {
                provider: this.searchConfig.provider,
                baseName,
                extensionCount: extensions.length
            });

            const response = await fetch('/api/check-variations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const results = await response.json();
            console.log('📊 Varyasyon sonuçları alındı:', results.length);

            this.currentResults = results;
            
            // Rate limit kontrolü
            this.handleRateLimitedResults(results);
            
            // Sonuçları göster
            window.resultRenderer.renderResults(results, this.searchConfig.provider);
            
            // AI önerisi varsa göster
            if (this.searchConfig.aiEnabled && this.searchConfig.openrouterApiKey) {
                window.aiSuggestions.generateSuggestions(baseName);
            }

        } catch (error) {
            console.error('❌ Varyasyon kontrolü hatası:', error);
            window.notificationManager.showError(`Arama hatası: ${error.message}`);
        } finally {
            this.isSearching = false;
            this.showLoading(false);
        }
    }

    async checkBulkDomains(domains) {
        if (this.isSearching) {
            window.notificationManager.showWarning('Önceki arama devam ediyor...');
            return;
        }

        if (!domains || domains.length === 0) {
            window.notificationManager.showError('En az bir domain girilmelidir!');
            return;
        }

        this.isSearching = true;
        this.showLoading(true);

        try {
            const requestBody = {
                domains: domains,
                provider: this.searchConfig.provider
            };

            // API key'leri ekle
            if (this.searchConfig.provider === 'godaddy') {
                if (!this.searchConfig.godaddyApiKey || !this.searchConfig.godaddySecretKey) {
                    window.notificationManager.showError('GoDaddy API anahtarları eksik!');
                    return;
                }
                requestBody.godaddy_api_key = this.searchConfig.godaddyApiKey;
                requestBody.godaddy_secret_key = this.searchConfig.godaddySecretKey;
            }

            console.log('📡 Toplu kontrol başlatılıyor:', {
                provider: this.searchConfig.provider,
                domainCount: domains.length
            });

            const response = await fetch('/api/check-multiple', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const results = await response.json();
            console.log('📊 Toplu sonuçlar alındı:', results.length);

            this.currentResults = results;
            
            // Rate limit kontrolü
            this.handleRateLimitedResults(results);
            
            // Sonuçları göster
            window.resultRenderer.renderResults(results, this.searchConfig.provider);

        } catch (error) {
            console.error('❌ Toplu kontrol hatası:', error);
            window.notificationManager.showError(`Arama hatası: ${error.message}`);
        } finally {
            this.isSearching = false;
            this.showLoading(false);
        }
    }

    handleRateLimitedResults(results) {
        const rateLimitedResults = results.filter(r => r.rate_limit || r.status === 'Rate Limit');
        
        if (rateLimitedResults.length > 0) {
            console.log(`🚫 ${rateLimitedResults.length} domain rate limit'e takıldı`);
            
            // Global rate limit manager'a bildir
            if (window.globalRateLimitManager) {
                rateLimitedResults.forEach(result => {
                    window.globalRateLimitManager.addToRetryQueue(result.domain);
                });
            }
        }
    }

    updateProvider(newProvider) {
        console.log(`🔄 Provider değiştiriliyor: ${this.searchConfig.provider} → ${newProvider}`);
        
        this.searchConfig.provider = newProvider;
        localStorage.setItem('domain_search_provider', newProvider);
        
        window.notificationManager.showInfo(`Arama sağlayıcısı ${newProvider === 'whois' ? 'WHOIS' : 'GoDaddy API'} olarak değiştirildi`);
        
        console.log('✅ Provider güncellendi:', this.searchConfig.provider);
    }

    // API anahtarlarını güncelle
    updateGodaddyKeys(apiKey, secretKey) {
        this.searchConfig.godaddyApiKey = apiKey;
        this.searchConfig.godaddySecretKey = secretKey;
        
        localStorage.setItem('godaddy_api_key', apiKey);
        localStorage.setItem('godaddy_secret_key', secretKey);
        
        console.log('🔑 GoDaddy API anahtarları güncellendi');
    }

    // AI ayarlarını güncelle
    updateAIConfig(enabled, apiKey, model) {
        this.searchConfig.aiEnabled = enabled;
        this.searchConfig.openrouterApiKey = apiKey;
        this.searchConfig.aiModel = model;
        
        localStorage.setItem('ai_enabled', enabled.toString());
        localStorage.setItem('openrouter_api_key', apiKey);
        localStorage.setItem('ai_model', model);
        
        console.log('🤖 AI konfigürasyonu güncellendi:', { enabled, model });
    }
}

// Not: DomainSearchApp class'ı app.js'de initialize edilir 