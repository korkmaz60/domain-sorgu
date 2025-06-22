// Sonuç Gösterimi Sınıfı - Domain sonuçlarının HTML formatında gösterilmesi

class ResultRenderer {
    constructor() {
        this.currentProvider = 'whois';
    }

    renderResults(results, provider = 'whois') {
        this.currentProvider = provider;
        const resultsContainer = document.getElementById('results');
        
        if (!results || results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-search text-4xl text-gray-300 mb-4"></i>
                    <p class="text-xl text-gray-500">Henüz arama yapılmadı</p>
                </div>
            `;
            return;
        }

        const available = results.filter(r => r.available === true);
        const unavailable = results.filter(r => r.available === false);
        const unknown = results.filter(r => r.available === null);

        let html = `
            <div class="space-y-6">
                <!-- Özet Kartlar -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div class="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm opacity-90">Müsait Domainler</p>
                                <p class="text-3xl font-bold">${available.length}</p>
                            </div>
                            <i class="fas fa-check-circle text-3xl opacity-80"></i>
                        </div>
                    </div>
                    <div class="bg-gradient-to-r from-red-500 to-pink-600 rounded-xl p-6 text-white">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm opacity-90">Kayıtlı Domainler</p>
                                <p class="text-3xl font-bold">${unavailable.length}</p>
                            </div>
                            <i class="fas fa-times-circle text-3xl opacity-80"></i>
                        </div>
                    </div>
                    <div class="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-6 text-white">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm opacity-90">Kontrol Edilemeyen</p>
                                <p class="text-3xl font-bold">${unknown.length}</p>
                            </div>
                            <i class="fas fa-question-circle text-3xl opacity-80"></i>
                        </div>
                    </div>
                </div>
        `;

        // Müsait domainler
        if (available.length > 0) {
            html += this.renderAvailableSection(available);
        }

        // Kayıtlı domainler
        if (unavailable.length > 0) {
            html += this.renderUnavailableSection(unavailable);
        }

        // Kontrol edilemeyen domainler
        if (unknown.length > 0) {
            html += this.renderUnknownSection(unknown);
        }

        html += '</div>';
        resultsContainer.innerHTML = html;

        // Event listener'ları ekle
        this.attachEventListeners();
    }

    renderAvailableSection(available) {
        return `
            <div class="mb-8">
                <h3 class="text-2xl font-bold text-green-600 mb-4 flex items-center">
                    <i class="fas fa-check-circle mr-3"></i>
                    Müsait Domainler (${available.length})
                </h3>
                <div class="grid gap-4">
                    ${available.map(result => this.renderDomainCard(result, 'available')).join('')}
                </div>
            </div>
        `;
    }

    renderUnavailableSection(unavailable) {
        return `
            <div class="mb-8">
                <h3 class="text-2xl font-bold text-red-600 mb-4 flex items-center">
                    <i class="fas fa-times-circle mr-3"></i>
                    Kayıtlı Domainler (${unavailable.length})
                </h3>
                <div class="grid gap-4">
                    ${unavailable.map(result => this.renderDomainCard(result, 'unavailable')).join('')}
                </div>
            </div>
        `;
    }

    renderUnknownSection(unknown) {
        return `
            <div class="mb-8">
                <h3 class="text-2xl font-bold text-yellow-600 mb-4 flex items-center">
                    <i class="fas fa-question-circle mr-3"></i>
                    Kontrol Edilemeyen Domainler (${unknown.length})
                </h3>
                <div class="grid gap-4">
                    ${unknown.map(result => this.renderDomainCard(result, 'unknown')).join('')}
                </div>
            </div>
        `;
    }

    renderDomainCard(result, type) {
        const bgColor = type === 'available' ? 'bg-green-50 border-green-200' : 
                       type === 'unavailable' ? 'bg-red-50 border-red-200' : 
                       'bg-yellow-50 border-yellow-200';
        
        const statusIcon = type === 'available' ? 'fa-check-circle text-green-500' : 
                          type === 'unavailable' ? 'fa-times-circle text-red-500' : 
                          'fa-question-circle text-yellow-500';

        const apiProvider = result.provider || this.currentProvider;
        const apiLabel = apiProvider === 'godaddy' ? 'GoDaddy OTE (Test)' : 'WHOIS';

        // GoDaddy API için ek bilgileri göster
        let additionalInfo = '';
        if (result.provider === 'godaddy') {
            let godaddyDetails = '';
            
            // Fiyat bilgisi
            if (result.price && result.price !== '-') {
                godaddyDetails += `<div class="text-sm text-green-600 font-medium">💰 Fiyat: ${result.price}</div>`;
            }
            
            // Period bilgisi
            if (result.period && result.period !== '-') {
                godaddyDetails += `<div class="text-sm text-blue-600">📅 Süre: ${result.period}</div>`;
            }

            if (godaddyDetails) {
                additionalInfo = `<div class="mt-3 pt-3 border-t border-gray-200">${godaddyDetails}</div>`;
            }
        }

        return `
            <div class="domain-card ${bgColor} border-2 rounded-xl p-4 hover:shadow-lg transition-all duration-300">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <i class="fas ${statusIcon} text-xl"></i>
                        <div>
                            <h4 class="font-bold text-lg text-gray-800">${result.domain}</h4>
                            <p class="text-sm text-gray-600">${result.status}</p>
                            <div class="flex items-center mt-1">
                                <i class="fas fa-server text-xs text-gray-400 mr-1"></i>
                                <span class="text-xs text-gray-500">${apiLabel}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex space-x-2">
                        ${type === 'available' ? `
                            <button class="wishlist-btn px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors flex items-center space-x-2" data-domain="${result.domain}">
                                <i class="fas fa-heart"></i>
                                <span>İstek Listesi</span>
                            </button>
                        ` : ''}
                        <button class="details-btn px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors" data-domain="${result.domain}">
                            <i class="fas fa-info-circle"></i>
                        </button>
                    </div>
                </div>
                
                ${result.error ? `
                    <div class="mt-3 p-3 bg-red-100 border border-red-200 rounded-lg">
                        <div class="flex items-center text-red-700">
                            <i class="fas fa-exclamation-triangle mr-2"></i>
                            <span class="text-sm">${result.error}</span>
                        </div>
                    </div>
                ` : ''}
                
                ${additionalInfo}
            </div>
        `;
    }

    // Tekil sonuç HTML'i oluşturmak için kullanılan method (backwards compatibility)
    createResultHTML(result) {
        return this.renderDomainCard(result, result.available === true ? 'available' : 
                                           result.available === false ? 'unavailable' : 'unknown');
    }

    attachEventListeners() {
        // İstek listesi butonları
        document.querySelectorAll('.wishlist-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const domain = e.currentTarget.dataset.domain;
                if (window.wishlistManager) {
                    window.wishlistManager.addToWishlist(domain);
                }
            });
        });

        // Detay butonları
        document.querySelectorAll('.details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const domain = e.currentTarget.dataset.domain;
                this.showDomainDetails(domain);
            });
        });
    }

    showDomainDetails(domain) {
        // WHOIS bilgilerini göster
        window.open(`https://whois.net/whois/${domain}`, '_blank');
    }

    clearResults() {
        const resultsContainer = document.getElementById('results');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-search text-4xl text-gray-300 mb-4"></i>
                    <p class="text-xl text-gray-500">Henüz arama yapılmadı</p>
                </div>
            `;
        }
    }
}

// Global olarak erişilebilir hale getir
window.resultRenderer = new ResultRenderer(); 