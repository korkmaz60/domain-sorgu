// Domain Sorgulama Uygulaması JavaScript Kodu

class DomainSearchApp {
    constructor() {
        this.aiConfig = {
            apiKey: localStorage.getItem('openrouter_api_key') || '',
            model: localStorage.getItem('openrouter_model') || 'openai/gpt-4o-mini',
            enabled: localStorage.getItem('ai_enabled') === 'true' || false
        };
        this.currentBaseName = '';
        this.usedSuggestions = new Set();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTabs();
        this.setupSettingsModal();
        this.setupAIToggle();
        this.loadAISettings();
        this.updateAIToggleUI();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Form submissions
        document.getElementById('variations-form').addEventListener('submit', (e) => this.handleVariations(e));
        document.getElementById('bulk-form').addEventListener('submit', (e) => this.handleBulkCheck(e));
        
        // Extension selection events
        document.getElementById('select-all-extensions').addEventListener('click', () => this.selectAllExtensions());
        document.getElementById('unselect-all-extensions').addEventListener('click', () => this.unselectAllExtensions());
        document.getElementById('select-popular-extensions').addEventListener('click', () => this.selectPopularExtensions());
        
        // Wishlist events
        document.getElementById('wishlist-add-form').addEventListener('submit', (e) => this.handleAddToWishlist(e));
        document.getElementById('check-all-wishlist').addEventListener('click', () => this.checkAllWishlist());
        document.getElementById('clear-wishlist').addEventListener('click', () => this.clearWishlist());
        document.getElementById('export-wishlist').addEventListener('click', () => this.exportWishlist());
        
        // AI suggestions events
        document.getElementById('more-ai-suggestions').addEventListener('click', () => this.getMoreAISuggestions());
        
        // AI toggle events
        document.getElementById('ai-toggle-btn').addEventListener('click', () => this.toggleAI());
        document.getElementById('quick-settings-btn').addEventListener('click', () => this.openSettings());
    }

    setupTabs() {
        // İlk tab'ı aktif yap
        this.switchTab('variations');
        // İstek listesini yükle
        this.loadWishlist();
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
            content.classList.remove('active');
        });

        // Seçilen tab butonunu aktif yap
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        activeBtn.classList.remove('text-gray-600', 'hover:text-primary-600', 'hover:bg-primary-50');
        activeBtn.classList.add('bg-primary-500', 'text-white', 'shadow-lg');
        
        // Seçilen tab içeriğini göster
        const activeContent = document.getElementById(`${tabName}-tab`);
        activeContent.classList.remove('hidden');
        activeContent.classList.add('active');
        
        // İstek listesi tab'ına geçildiyse listeyi yenile
        if (tabName === 'wishlist') {
            this.loadWishlist();
        }
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
            const response = await fetch('/api/check-variations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ baseName: domainInput, extensions })
            });

            const data = await response.json();
            
            if (data.error) {
                this.showError('variations-results', data.error);
            } else {
                // Sonuçları kategorize et
                const availableResults = data.results.filter(result => result.available === true);
                const takenResults = data.results.filter(result => result.available === false);
                const unknownResults = data.results.filter(result => result.available === null);
                
                this.displayCategorizedResults(domainInput, availableResults, takenResults, unknownResults, 'variations-results');
                
                // AI önerilerini al (eğer aktifse)
                if (this.aiConfig.enabled && this.aiConfig.apiKey && this.aiConfig.model) {
                    this.currentBaseName = domainInput;
                    this.usedSuggestions.clear(); // Yeni arama için önceki önerileri temizle
                    this.getAISuggestions(domainInput);
                }
            }
        } catch (error) {
            this.showError('variations-results', 'Bağlantı hatası oluştu');
        } finally {
            this.showLoading(false);
        }
    }

    async handleSingleDomainCheck(domain) {
        this.showLoading(true);
        
        try {
            const response = await fetch('/api/check-domain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ domain })
            });

            const result = await response.json();
            
            if (result.error) {
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
                html += this.createResultHTML(result);
            });
            
            html += `</div></div>`;
        }

        if (takenResults.length > 0) {
            html += `<div class="taken-domains-section" style="margin-top: 20px;">
                        <h4><i class="fas fa-times-circle" style="color: #dc3545;"></i> Kayıtlı Domainler</h4>`;
            
            takenResults.forEach(result => {
                html += this.createResultHTML(result);
            });
            
            html += `</div>`;
        }

        if (unknownResults.length > 0) {
            html += `<div class="unknown-domains-section" style="margin-top: 20px;">
                        <h4><i class="fas fa-question-circle" style="color: #ffc107;"></i> Kontrol Edilemeyen Domainler</h4>`;
            
            unknownResults.forEach(result => {
                html += this.createResultHTML(result);
            });
            
            html += `</div>`;
        }

        resultsContainer.innerHTML = html;
    }

    async handleBulkCheck(e) {
        e.preventDefault();
        
        const domainsText = document.getElementById('bulk-domains').value.trim();
        if (!domainsText) return;

        const domains = domainsText.split('\n')
            .map(domain => domain.trim())
            .filter(domain => domain.length > 0);

        if (domains.length === 0) {
            this.showError('bulk-results', 'Lütfen en az bir domain girin');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch('/api/check-multiple', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ domains })
            });

            const data = await response.json();
            
            if (data.error) {
                this.showError('bulk-results', data.error);
            } else {
                this.displayMultipleResults(data.results, 'bulk-results');
            }
        } catch (error) {
            this.showError('bulk-results', 'Bağlantı hatası oluştu');
        } finally {
            this.showLoading(false);
        }
    }

    displaySingleResult(result, containerId = 'variations-results') {
        const resultsContainer = document.getElementById(containerId);
        
        const html = `
            <div class="single-domain-result">
                <h3><i class="fas fa-search"></i> "${result.domain}" Kontrolü</h3>
                ${this.createResultHTML(result)}
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
            html += this.createResultHTML(result);
        });

        resultsContainer.innerHTML = html;
    }

    createResultHTML(result) {
        const statusClass = result.available === true ? 'border-green-200 bg-green-50' : 
                           result.available === false ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50';
        const statusIcon = result.available === true ? 'fa-check-circle text-green-500' : 
                          result.available === false ? 'fa-times-circle text-red-500' : 'fa-question-circle text-yellow-500';
        const statusText = result.available === true ? 'MÜSAİT' : 
                          result.available === false ? 'KAYITLI' : 'BİLİNMEYEN';
        const statusTextClass = result.available === true ? 'text-green-700' : 
                               result.available === false ? 'text-red-700' : 'text-yellow-700';

        const isInWishlist = this.isInWishlist(result.domain);
        const wishlistButtonClass = isInWishlist ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-pink-100 text-pink-700 hover:bg-pink-200';
        const wishlistButtonText = isInWishlist ? 'Listede' : 'İstek Listesine Ekle';
        const wishlistButtonIcon = isInWishlist ? 'fa-check' : 'fa-heart';
        const wishlistButtonDisabled = isInWishlist ? 'disabled' : '';

        return `
            <div class="border-2 ${statusClass} rounded-xl p-6 card-hover">
                <div class="flex items-center justify-between mb-4">
                    <h4 class="text-xl font-bold text-gray-800">${result.domain}</h4>
                    <div class="flex items-center space-x-2 px-3 py-1 rounded-full ${statusClass}">
                        <i class="fas ${statusIcon}"></i>
                        <span class="font-medium ${statusTextClass}">${statusText}</span>
                    </div>
                </div>
                ${this.createResultDetails(result)}
                <div class="mt-4">
                    <button class="px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${wishlistButtonClass}" onclick="app.addToWishlistFromResult('${result.domain}', this)" ${wishlistButtonDisabled}>
                        <i class="fas ${wishlistButtonIcon}"></i>
                        <span>${wishlistButtonText}</span>
                    </button>
                </div>
            </div>
        `;
    }

    createResultDetails(result) {
        if (result.available === false) {
            return `
                <div class="bg-white/50 rounded-lg p-4 space-y-2">
                    <div class="flex justify-between">
                        <span class="font-medium text-gray-600">Kayıt Tarihi:</span>
                        <span class="text-gray-800">${result.creation_date}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium text-gray-600">Son Kullanma:</span>
                        <span class="text-gray-800">${result.expiration_date}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium text-gray-600">Kayıt Şirketi:</span>
                        <span class="text-gray-800">${result.registrar}</span>
                    </div>
                </div>
            `;
        } else if (result.available === null && result.error) {
            return `
                <div class="bg-white/50 rounded-lg p-4">
                    <div class="flex justify-between">
                        <span class="font-medium text-gray-600">Hata:</span>
                        <span class="text-gray-800">${result.error}</span>
                    </div>
                </div>
            `;
        }
        
        return '';
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

    // Extension Selection Methods
    selectAllExtensions() {
        document.querySelectorAll('.extension-label input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = true;
        });
    }

    unselectAllExtensions() {
        document.querySelectorAll('.extension-label input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
    }

    selectPopularExtensions() {
        const popularExtensions = ['com', 'net', 'org', 'io'];
        
        document.querySelectorAll('.extension-label input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = popularExtensions.includes(checkbox.value);
        });
    }

    // Wishlist Methods
    getWishlist() {
        const wishlist = localStorage.getItem('domainWishlist');
        return wishlist ? JSON.parse(wishlist) : [];
    }

    saveWishlist(wishlist) {
        localStorage.setItem('domainWishlist', JSON.stringify(wishlist));
    }

    isInWishlist(domain) {
        const wishlist = this.getWishlist();
        return wishlist.some(item => item.domain === domain);
    }

    addToWishlist(domain) {
        if (this.isInWishlist(domain)) {
            this.showNotification('Bu domain zaten istek listenizde!', 'warning');
            return;
        }

        const wishlist = this.getWishlist();
        const newItem = {
            domain: domain,
            addedDate: new Date().toISOString(),
            status: 'unchecked',
            lastChecked: null
        };

        wishlist.push(newItem);
        this.saveWishlist(wishlist);
        this.showNotification(`${domain} istek listesine eklendi!`, 'success');
        
        // Eğer wishlist tab'ındaysak listeyi yenile
        if (document.getElementById('wishlist-tab').classList.contains('active')) {
            this.loadWishlist();
        }
    }

    addToWishlistFromResult(domain, buttonElement) {
        if (this.isInWishlist(domain)) {
            this.showNotification('Bu domain zaten istek listenizde!', 'warning');
            return;
        }

        const wishlist = this.getWishlist();
        const newItem = {
            domain: domain,
            addedDate: new Date().toISOString(),
            status: 'unchecked',
            lastChecked: null
        };

        wishlist.push(newItem);
        this.saveWishlist(wishlist);
        
        // Butonu güncelle
        buttonElement.innerHTML = '<i class="fas fa-heart"></i> Listede';
        buttonElement.className = 'btn btn-wishlist-added';
        buttonElement.disabled = true;
        buttonElement.onclick = null;
        
        // Başarı animasyonu
        buttonElement.style.transform = 'scale(1.1)';
        setTimeout(() => {
            buttonElement.style.transform = 'scale(1)';
        }, 200);
        
        this.showNotification(`${domain} istek listesine eklendi! 💝`, 'success');
        
        // Eğer wishlist tab'ındaysak listeyi yenile
        if (document.getElementById('wishlist-tab').classList.contains('active')) {
            this.loadWishlist();
        }
    }

    removeFromWishlist(domain) {
        const wishlist = this.getWishlist();
        const updatedWishlist = wishlist.filter(item => item.domain !== domain);
        this.saveWishlist(updatedWishlist);
        this.showNotification(`${domain} istek listesinden kaldırıldı!`, 'info');
        this.loadWishlist();
    }

    async handleAddToWishlist(e) {
        e.preventDefault();
        const domain = document.getElementById('wishlist-domain').value.trim();
        if (!domain) return;

        this.addToWishlist(domain);
        document.getElementById('wishlist-domain').value = '';
    }

    loadWishlist() {
        const wishlist = this.getWishlist();
        const container = document.getElementById('wishlist-content');
        const emptyState = document.getElementById('wishlist-empty');

        if (wishlist.length === 0) {
            emptyState.style.display = 'block';
            container.innerHTML = '';
            container.appendChild(emptyState);
            return;
        }

        emptyState.style.display = 'none';
        
        let html = '';
        wishlist.forEach(item => {
            html += this.createWishlistItemHTML(item);
        });

        container.innerHTML = html;
    }

    createWishlistItemHTML(item) {
        const statusClass = item.status === 'available' ? 'available' :
                           item.status === 'taken' ? 'taken' :
                           item.status === 'checking' ? 'checking' : '';

        const statusBadge = item.status === 'available' ? '<span class="wishlist-status-badge available">Müsait</span>' :
                           item.status === 'taken' ? '<span class="wishlist-status-badge taken">Kayıtlı</span>' :
                           item.status === 'checking' ? '<span class="wishlist-status-badge checking">Kontrol Ediliyor</span>' :
                           '<span class="wishlist-status-badge unknown">Kontrol Edilmedi</span>';

        const addedDate = new Date(item.addedDate).toLocaleDateString('tr-TR');
        const lastChecked = item.lastChecked ? 
            `Son kontrol: ${new Date(item.lastChecked).toLocaleDateString('tr-TR')}` : 
            'Henüz kontrol edilmedi';

        return `
            <div class="wishlist-item ${statusClass}">
                <div class="wishlist-domain-info">
                    <div class="wishlist-domain-name">${item.domain}</div>
                    <div class="wishlist-domain-status">${lastChecked}</div>
                    <div class="wishlist-domain-date">Eklenme: ${addedDate}</div>
                </div>
                <div class="wishlist-item-actions">
                    ${statusBadge}
                    <button class="btn btn-secondary" onclick="domainApp.checkWishlistDomain('${item.domain}')">
                        <i class="fas fa-search"></i> Kontrol Et
                    </button>
                    <button class="btn btn-danger" onclick="domainApp.removeFromWishlist('${item.domain}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    async checkWishlistDomain(domain) {
        // Durumu kontrol ediliyor olarak işaretle
        this.updateWishlistItemStatus(domain, 'checking');
        
        try {
            const response = await fetch('/api/check-domain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ domain })
            });

            const result = await response.json();
            
            const status = result.available === true ? 'available' :
                          result.available === false ? 'taken' : 'unknown';
            
            this.updateWishlistItemStatus(domain, status, result);
            
        } catch (error) {
            this.updateWishlistItemStatus(domain, 'unknown');
            this.showNotification('Domain kontrolü sırasında hata oluştu', 'error');
        }
    }

    updateWishlistItemStatus(domain, status, result = null) {
        const wishlist = this.getWishlist();
        const item = wishlist.find(item => item.domain === domain);
        
        if (item) {
            item.status = status;
            item.lastChecked = new Date().toISOString();
            if (result) {
                item.lastResult = result;
            }
            this.saveWishlist(wishlist);
            this.loadWishlist();
        }
    }

    async checkAllWishlist() {
        const wishlist = this.getWishlist();
        if (wishlist.length === 0) {
            this.showNotification('İstek listesi boş!', 'warning');
            return;
        }

        this.showLoading(true);
        
        const domains = wishlist.map(item => item.domain);
        
        try {
            // Tüm domainleri kontrol ediliyor olarak işaretle
            wishlist.forEach(item => {
                this.updateWishlistItemStatus(item.domain, 'checking');
            });

            const response = await fetch('/api/check-multiple', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ domains })
            });

            const data = await response.json();
            
            if (data.error) {
                this.showNotification(data.error, 'error');
            } else {
                // Sonuçları güncelle
                data.results.forEach(result => {
                    const status = result.available === true ? 'available' :
                                  result.available === false ? 'taken' : 'unknown';
                    this.updateWishlistItemStatus(result.domain, status, result);
                });
                
                this.showNotification('Tüm domainler kontrol edildi!', 'success');
            }
        } catch (error) {
            this.showNotification('Toplu kontrol sırasında hata oluştu', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    clearWishlist() {
        if (confirm('İstek listesindeki tüm domainleri silmek istediğinizden emin misiniz?')) {
            this.saveWishlist([]);
            this.loadWishlist();
            this.showNotification('İstek listesi temizlendi!', 'info');
        }
    }

    exportWishlist() {
        const wishlist = this.getWishlist();
        if (wishlist.length === 0) {
            this.showNotification('İstek listesi boş!', 'warning');
            return;
        }

        const dataStr = JSON.stringify(wishlist, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `domain-wishlist-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showNotification('İstek listesi indirildi!', 'success');
    }

    showNotification(message, type = 'info') {
        // Mevcut notification'ları temizle
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(n => n.remove());

        const notification = document.createElement('div');
        
        const bgColor = type === 'success' ? 'bg-green-500' : 
                       type === 'error' ? 'bg-red-500' : 
                       type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';
        
        notification.className = `notification fixed top-4 right-4 ${bgColor} text-white px-6 py-4 rounded-xl shadow-lg z-50 transform translate-x-full transition-transform duration-300 flex items-center space-x-3`;
        
        const icon = type === 'success' ? 'fa-check-circle' : 
                    type === 'error' ? 'fa-times-circle' : 
                    type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
        
        notification.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
            <button class="ml-4 hover:bg-white/20 rounded p-1 transition-colors" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(notification);

        // Animasyon için kısa bir gecikme
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
            notification.classList.add('translate-x-0');
        }, 100);

        // 5 saniye sonra otomatik kapat
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('translate-x-full');
                notification.classList.remove('translate-x-0');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
    }

    // Utility methods
    static formatDate(dateString) {
        if (!dateString || dateString === 'None' || dateString === '-') {
            return 'Bilinmiyor';
        }
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('tr-TR');
        } catch (e) {
            return dateString;
        }
    }

    // AI Toggle Methods
    setupAIToggle() {
        // AI toggle durumunu kontrol et ve UI'yi güncelle
        this.updateAIToggleUI();
    }

    toggleAI() {
        this.aiConfig.enabled = !this.aiConfig.enabled;
        localStorage.setItem('ai_enabled', this.aiConfig.enabled.toString());
        this.updateAIToggleUI();
        
        // Bildirim göster
        if (this.aiConfig.enabled) {
            this.showNotification('AI önerileri aktif edildi! 🤖', 'success');
        } else {
            this.showNotification('AI önerileri devre dışı bırakıldı', 'info');
        }
    }

    updateAIToggleUI() {
        const toggleBtn = document.getElementById('ai-toggle-btn');
        const toggleSwitch = document.getElementById('ai-toggle-switch');
        const statusText = document.getElementById('ai-status-text');
        const quickSettings = document.getElementById('ai-quick-settings');
        const apiKeyStatus = document.getElementById('api-key-status');
        const modelStatus = document.getElementById('model-status');

        if (this.aiConfig.enabled) {
            // Aktif durum
            toggleBtn.classList.remove('bg-gray-200');
            toggleBtn.classList.add('bg-purple-600');
            toggleSwitch.classList.remove('translate-x-1');
            toggleSwitch.classList.add('translate-x-6');
            statusText.textContent = 'Açık';
            statusText.classList.remove('text-gray-600');
            statusText.classList.add('text-purple-600', 'font-semibold');
            quickSettings.classList.remove('hidden');
            
            // API Key ve Model durumunu güncelle
            apiKeyStatus.textContent = this.aiConfig.apiKey ? 
                `API Key: ${'*'.repeat(8)}...` : 'API Key: Girilmedi';
            modelStatus.textContent = this.aiConfig.model ? 
                `Model: ${this.getModelDisplayName(this.aiConfig.model)}` : 'Model: Seçilmedi';
        } else {
            // Pasif durum
            toggleBtn.classList.remove('bg-purple-600');
            toggleBtn.classList.add('bg-gray-200');
            toggleSwitch.classList.remove('translate-x-6');
            toggleSwitch.classList.add('translate-x-1');
            statusText.textContent = 'Kapalı';
            statusText.classList.remove('text-purple-600', 'font-semibold');
            statusText.classList.add('text-gray-600');
            quickSettings.classList.add('hidden');
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

    openSettings() {
        const settingsModal = document.getElementById('settings-modal');
        settingsModal.classList.remove('hidden');
        settingsModal.classList.add('flex');
    }

    // Settings Modal Methods
    setupSettingsModal() {
        const settingsBtn = document.getElementById('settings-btn');
        const settingsModal = document.getElementById('settings-modal');
        const closeSettings = document.getElementById('close-settings');
        const saveSettings = document.getElementById('save-settings');
        const testConnection = document.getElementById('test-ai-connection');
        const toggleKeyVisibility = document.getElementById('toggle-key-visibility');

        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
            settingsModal.classList.add('flex');
        });

        closeSettings.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
            settingsModal.classList.remove('flex');
        });

        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.add('hidden');
                settingsModal.classList.remove('flex');
            }
        });

        saveSettings.addEventListener('click', () => this.saveAISettings());
        testConnection.addEventListener('click', () => this.testAIConnection());
        toggleKeyVisibility.addEventListener('click', () => this.toggleAPIKeyVisibility());
    }

    loadAISettings() {
        document.getElementById('api-key').value = this.aiConfig.apiKey;
        document.getElementById('ai-model').value = this.aiConfig.model;
    }

    saveAISettings() {
        const apiKey = document.getElementById('api-key').value.trim();
        const model = document.getElementById('ai-model').value;

        if (!apiKey) {
            this.showNotification('API Key boş olamaz!', 'error');
            return;
        }

        if (!model) {
            this.showNotification('Model seçilmeli!', 'error');
            return;
        }

        this.aiConfig.apiKey = apiKey;
        this.aiConfig.model = model;

        localStorage.setItem('openrouter_api_key', apiKey);
        localStorage.setItem('openrouter_model', model);

        const settingsModal = document.getElementById('settings-modal');
        settingsModal.classList.add('hidden');
        settingsModal.classList.remove('flex');
        
        // Toggle UI'sını güncelle
        this.updateAIToggleUI();
        
        this.showNotification('AI ayarları kaydedildi!', 'success');
    }

    async testAIConnection() {
        const apiKey = document.getElementById('api-key').value.trim();
        const model = document.getElementById('ai-model').value;

        if (!apiKey || !model) {
            this.showNotification('API Key ve Model seçilmeli!', 'error');
            return;
        }

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
                this.showNotification('Bağlantı başarılı!', 'success');
            } else {
                const error = await response.json();
                this.showNotification(`Bağlantı hatası: ${error.error?.message || 'Bilinmeyen hata'}`, 'error');
            }
        } catch (error) {
            this.showNotification('Ağ hatası oluştu!', 'error');
        }
    }

    toggleAPIKeyVisibility() {
        const apiKeyInput = document.getElementById('api-key');
        const toggleBtn = document.getElementById('toggle-key-visibility');
        const icon = toggleBtn.querySelector('i');

        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            apiKeyInput.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }

    // AI Suggestions Methods
    async getAISuggestions(baseName, isMore = false) {
        // AI devre dışıysa çık
        if (!this.aiConfig.enabled) {
            return;
        }
        
        const aiSuggestions = document.getElementById('ai-suggestions');
        const aiResults = document.getElementById('ai-results');
        const moreButton = document.getElementById('more-ai-suggestions');
        
        // AI loading göster
        aiSuggestions.classList.remove('hidden');
        
        if (!isMore) {
            aiResults.innerHTML = '<div class="bg-purple-100 border border-purple-200 rounded-xl p-6 text-center animate-pulse"><i class="fas fa-robot text-2xl text-purple-600 mb-2"></i><p class="text-purple-700 font-medium">AI domain önerileri hazırlanıyor...</p></div>';
            moreButton.classList.add('hidden');
        } else {
            // Devam et butonu için loading ekle
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'bg-purple-100 border border-purple-200 rounded-xl p-6 text-center animate-pulse mt-4';
            loadingDiv.innerHTML = '<i class="fas fa-robot text-2xl text-purple-600 mb-2"></i><p class="text-purple-700 font-medium">Daha fazla öneri hazırlanıyor...</p>';
            aiResults.appendChild(loadingDiv);
            moreButton.disabled = true;
            moreButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yükleniyor...';
        }

        try {
            const suggestions = await this.callOpenRouterAPI(baseName, isMore);
            
            if (suggestions && suggestions.length > 0) {
                // Eğer devam et ise loading'i kaldır
                if (isMore) {
                    const loadingElement = aiResults.querySelector('.animate-pulse:last-child');
                    if (loadingElement) {
                        loadingElement.remove();
                    }
                }
                
                // Her öneriyi kontrol et
                await this.checkAISuggestions(suggestions, isMore);
                
                // Devam et butonunu göster
                moreButton.classList.remove('hidden');
                moreButton.disabled = false;
                moreButton.innerHTML = '<i class="fas fa-plus"></i> Devam Et (5 Tane Daha)';
            } else {
                if (isMore) {
                    const loadingElement = aiResults.querySelector('.ai-loading:last-child');
                    if (loadingElement) {
                        loadingElement.innerHTML = '<p style="text-align: center; color: #666;">Daha fazla öneri oluşturulamadı.</p>';
                    }
                } else {
                    aiResults.innerHTML = '<p style="text-align: center; color: #666;">AI önerisi oluşturulamadı.</p>';
                }
            }
        } catch (error) {
            console.error('AI Öneri Hatası:', error);
            if (isMore) {
                const loadingElement = aiResults.querySelector('.ai-loading:last-child');
                if (loadingElement) {
                    loadingElement.innerHTML = '<p style="text-align: center; color: #dc3545;">Daha fazla öneri alınırken hata oluştu.</p>';
                }
                moreButton.disabled = false;
                moreButton.innerHTML = '<i class="fas fa-plus"></i> Devam Et (5 Tane Daha)';
            } else {
                aiResults.innerHTML = '<p style="text-align: center; color: #dc3545;">AI önerileri alınırken hata oluştu.</p>';
            }
        }
    }

    async getMoreAISuggestions() {
        if (this.currentBaseName) {
            await this.getAISuggestions(this.currentBaseName, true);
        }
    }

    async callOpenRouterAPI(baseName, isMore = false) {
        let prompt;
        
        if (isMore && this.usedSuggestions.size > 0) {
            const usedList = Array.from(this.usedSuggestions).join(', ');
            prompt = `"${baseName}" isimli domain için benzer 5 alternatif domain adı öner. Sadece domain adını ver (uzantı olmadan). Her öneri yeni satırda olsun. Yaratıcı, akılda kalıcı ve brandable öneriler ver.

ÖNEMLI: Şu önerileri daha önce verdin, bunları tekrar VERME: ${usedList}

Tamamen farklı ve yeni öneriler ver.`;
        } else {
            prompt = `"${baseName}" isimli domain için benzer 5 alternatif domain adı öner. Sadece domain adını ver (uzantı olmadan). Her öneri yeni satırda olsun. Yaratıcı, akılda kalıcı ve brandable öneriler ver.`;
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.aiConfig.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Domain Query App'
            },
            body: JSON.stringify({
                model: this.aiConfig.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 200,
                temperature: 0.8 // Daha fazla yaratıcılık için
            })
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API hatası: ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || '';
        
        // AI yanıtını parse et
        const suggestions = content
            .split('\n')
            .map(line => line.replace(/^\d+\.\s*/, '').trim()) // Numaraları kaldır
            .filter(line => line && !line.includes('.')) // Boş ve uzantılı olanları filtrele
            .filter(line => !this.usedSuggestions.has(line.toLowerCase())) // Daha önce kullanılanları filtrele
            .slice(0, 5); // İlk 5'ini al

        // Yeni önerileri kullanılan listesine ekle
        suggestions.forEach(suggestion => {
            this.usedSuggestions.add(suggestion.toLowerCase());
        });

        return suggestions;
    }

    async checkAISuggestions(suggestions, isMore = false) {
        const aiResults = document.getElementById('ai-results');
        
        if (!isMore) {
            aiResults.innerHTML = '';
        }

        // Seçili uzantıları al
        const selectedExtensions = Array.from(document.querySelectorAll('.extension-label input:checked'))
            .map(input => input.value);

        if (selectedExtensions.length === 0) {
            // Eğer hiç uzantı seçili değilse sadece .com kullan
            selectedExtensions.push('com');
        }

        // Her öneri için tüm seçili uzantıları kontrol et
        for (const suggestion of suggestions) {
            // Öneri grubu oluştur
            const suggestionGroup = document.createElement('div');
            suggestionGroup.className = 'ai-suggestion-group';
            suggestionGroup.innerHTML = `
                <div class="ai-suggestion-title">
                    <h4><i class="fas fa-lightbulb"></i> ${suggestion}</h4>
                </div>
                <div class="ai-suggestion-domains"></div>
            `;
            aiResults.appendChild(suggestionGroup);

            const domainsContainer = suggestionGroup.querySelector('.ai-suggestion-domains');

            // Her uzantı için domain kontrolü yap
            for (const extension of selectedExtensions) {
                const domain = `${suggestion}.${extension}`;
                
                const resultDiv = document.createElement('div');
                resultDiv.className = 'ai-domain-result';
                resultDiv.innerHTML = `
                    <div class="ai-domain-name">${domain}</div>
                    <div class="ai-domain-actions">
                        <span class="ai-status-badge unknown">Kontrol ediliyor...</span>
                    </div>
                `;
                domainsContainer.appendChild(resultDiv);

                // Domain kontrolü yap
                try {
                    const response = await fetch('/api/check-domain', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ domain })
                    });

                    const result = await response.json();
                    this.updateAIResult(resultDiv, domain, result);
                } catch (error) {
                    this.updateAIResult(resultDiv, domain, { available: null, error: 'Kontrol hatası' });
                }
            }
        }
    }

    updateAIResult(resultDiv, domain, result) {
        const statusBadge = resultDiv.querySelector('.ai-status-badge');
        const actionsDiv = resultDiv.querySelector('.ai-domain-actions');
        
        if (result.available === true) {
            resultDiv.classList.add('available');
            statusBadge.className = 'ai-status-badge available';
            statusBadge.textContent = 'MÜSAİT';
            
            actionsDiv.innerHTML = `
                <span class="ai-status-badge available">MÜSAİT</span>
                <button class="btn btn-wishlist" onclick="app.addToWishlistFromResult('${domain}', this)">
                    <i class="fas fa-heart"></i>
                </button>
                <button class="btn btn-secondary btn-sm" onclick="copyToClipboard('${domain}')">
                    <i class="fas fa-copy"></i>
                </button>
            `;
        } else if (result.available === false) {
            resultDiv.classList.add('taken');
            statusBadge.className = 'ai-status-badge taken';
            statusBadge.textContent = 'KAYITLI';
            
            actionsDiv.innerHTML = `
                <span class="ai-status-badge taken">KAYITLI</span>
                <button class="btn btn-secondary btn-sm" onclick="copyToClipboard('${domain}')">
                    <i class="fas fa-copy"></i>
                </button>
            `;
        } else {
            resultDiv.classList.add('unknown');
            statusBadge.className = 'ai-status-badge unknown';
            statusBadge.textContent = 'BİLİNMEYEN';
            
            actionsDiv.innerHTML = `
                <span class="ai-status-badge unknown">BİLİNMEYEN</span>
                <button class="btn btn-wishlist" onclick="app.addToWishlistFromResult('${domain}', this)">
                    <i class="fas fa-heart"></i>
                </button>
                <button class="btn btn-secondary btn-sm" onclick="copyToClipboard('${domain}')">
                    <i class="fas fa-copy"></i>
                </button>
            `;
        }
    }
}

// Global değişken ve uygulama başlatma
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new DomainSearchApp();
});

// Ek yardımcı fonksiyonlar
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Başarılı kopyalama feedback'i göster
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = 'Panoya kopyalandı!';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 10000;
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 2000);
    });
}

// Klavye kısayolları
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter: Aktif formu gönder
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab) {
            const form = activeTab.querySelector('form');
            if (form) {
                form.dispatchEvent(new Event('submit', { cancelable: true }));
            }
        }
    }
}); 