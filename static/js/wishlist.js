// İstek Listesi Sayfası JavaScript Kodu

class WishlistApp {
    constructor() {
        this.wishlist = [];
        this.searchConfig = {
            provider: localStorage.getItem('domain_search_provider') || 'whois',
            godaddyApiKey: localStorage.getItem('godaddy_api_key') || '',
            godaddySecretKey: localStorage.getItem('godaddy_secret_key') || ''
        };
        
        this.loadWishlist();
        this.setupEventListeners();
        this.renderWishlist();
        
        console.log('💝 Wishlist App başlatıldı');
    }

    loadWishlist() {
        try {
            const stored = localStorage.getItem('domain_wishlist');
            this.wishlist = stored ? JSON.parse(stored) : [];
            console.log('📂 Wishlist yüklendi:', this.wishlist.length);
        } catch (error) {
            console.error('❌ Wishlist yükleme hatası:', error);
            this.wishlist = [];
        }
    }

    saveWishlist() {
        try {
            localStorage.setItem('domain_wishlist', JSON.stringify(this.wishlist));
            console.log('💾 Wishlist kaydedildi');
        } catch (error) {
            console.error('❌ Wishlist kaydetme hatası:', error);
        }
    }

    setupEventListeners() {
        // Add domain form
        const addForm = document.getElementById('add-domain-form');
        if (addForm) {
            addForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addDomainFromForm();
            });
        }

        // Import/Export butonları
        const importBtn = document.getElementById('import-btn');
        const exportBtn = document.getElementById('export-btn');
        const importInput = document.getElementById('import-input');

        if (importBtn) {
            importBtn.addEventListener('click', () => importInput?.click());
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportWishlist());
        }

        if (importInput) {
            importInput.addEventListener('change', (e) => this.importWishlist(e));
        }

        // Check all buton
        const checkAllBtn = document.getElementById('check-all-btn');
        if (checkAllBtn) {
            checkAllBtn.addEventListener('click', () => this.checkAllDomains());
        }

        // Clear all buton
        const clearAllBtn = document.getElementById('clear-all-btn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.clearAllDomains());
        }
    }

    addDomainFromForm() {
        const input = document.getElementById('domain-input');
        const domain = input?.value.trim();

        if (!domain) {
            this.showNotification('Domain adı giriniz!', 'error');
            return;
        }

        this.addDomain(domain);
        input.value = '';
    }

    addDomain(domain) {
        // Domain formatını düzenle
        domain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');

        if (this.isDomainInWishlist(domain)) {
            this.showNotification('Bu domain zaten listede!', 'warning');
            return;
        }

        const newItem = {
            domain: domain,
            addedAt: new Date().toISOString(),
            lastChecked: null,
            status: 'Kontrol Edilmedi',
            available: null
        };

        this.wishlist.push(newItem);
        this.saveWishlist();
        this.renderWishlist();
        this.showNotification(`${domain} listenize eklendi!`, 'success');
    }

    removeDomain(domain) {
        const index = this.wishlist.findIndex(item => item.domain === domain);
        if (index !== -1) {
            this.wishlist.splice(index, 1);
            this.saveWishlist();
            this.renderWishlist();
            this.showNotification(`${domain} listeden çıkarıldı!`, 'info');
        }
    }

    isDomainInWishlist(domain) {
        return this.wishlist.some(item => item.domain === domain);
    }

    async checkSingleDomain(domain) {
        try {
            const requestBody = { 
                domain: domain,
                provider: this.searchConfig.provider
            };

            if (this.searchConfig.provider === 'godaddy') {
                requestBody.godaddy_api_key = this.searchConfig.godaddyApiKey;
                requestBody.godaddy_secret_key = this.searchConfig.godaddySecretKey;
            }

            const response = await fetch('/api/check-domain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            
            // Wishlist item'ını güncelle
            const item = this.wishlist.find(item => item.domain === domain);
            if (item) {
                item.lastChecked = new Date().toISOString();
                item.status = result.status;
                item.available = result.available;
                item.error = result.error;
            }

            return result;

        } catch (error) {
            console.error(`❌ ${domain} kontrol hatası:`, error);
            
            const item = this.wishlist.find(item => item.domain === domain);
            if (item) {
                item.lastChecked = new Date().toISOString();
                item.status = 'Kontrol Hatası';
                item.available = null;
                item.error = error.message;
            }

            return {
                domain: domain,
                available: null,
                status: 'Kontrol Hatası',
                error: error.message
            };
        }
    }

    async checkAllDomains() {
        if (this.wishlist.length === 0) {
            this.showNotification('Liste boş!', 'warning');
            return;
        }

        const checkBtn = document.getElementById('check-all-btn');
        const originalText = checkBtn?.innerHTML;
        
        if (checkBtn) {
            checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Kontrol Ediliyor...';
            checkBtn.disabled = true;
        }

        this.showNotification('Tüm domainler kontrol ediliyor...', 'info');

        try {
            const promises = this.wishlist.map(item => this.checkSingleDomain(item.domain));
            await Promise.all(promises);
            
            this.saveWishlist();
            this.renderWishlist();
            this.showNotification('Tüm domainler kontrol edildi!', 'success');

        } catch (error) {
            console.error('❌ Toplu kontrol hatası:', error);
            this.showNotification('Toplu kontrol sırasında hata oluştu!', 'error');
        } finally {
            if (checkBtn) {
                checkBtn.innerHTML = originalText;
                checkBtn.disabled = false;
            }
        }
    }

    async checkDomainsByProvider(domains, provider) {
            try {
                const requestBody = { 
                domains: domains,
                provider: provider
            };

            if (provider === 'godaddy') {
                requestBody.godaddy_api_key = this.searchConfig.godaddyApiKey;
                requestBody.godaddy_secret_key = this.searchConfig.godaddySecretKey;
            }

            const response = await fetch('/api/check-multiple', {
                    method: 'POST',
                    headers: {
                    'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();

            } catch (error) {
            console.error(`❌ ${provider} toplu kontrol hatası:`, error);
            throw error;
        }
    }

    async checkVariationsByProvider(baseName, extensions, provider) {
            try {
                const requestBody = { 
                base_name: baseName,
                extensions: extensions,
                provider: provider
            };

            if (provider === 'godaddy') {
                requestBody.godaddy_api_key = this.searchConfig.godaddyApiKey;
                requestBody.godaddy_secret_key = this.searchConfig.godaddySecretKey;
            }

            const response = await fetch('/api/check-variations', {
                    method: 'POST',
                    headers: {
                    'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();

            } catch (error) {
            console.error(`❌ ${provider} varyasyon kontrol hatası:`, error);
            throw error;
        }
    }

    clearAllDomains() {
        if (this.wishlist.length === 0) {
            this.showNotification('Liste zaten boş!', 'warning');
            return;
        }

        if (confirm('Tüm domainleri silmek istediğinizden emin misiniz?')) {
            this.wishlist = [];
            this.saveWishlist();
            this.renderWishlist();
            this.showNotification('Tüm domainler silindi!', 'info');
        }
    }

    exportWishlist() {
        if (this.wishlist.length === 0) {
            this.showNotification('Liste boş!', 'warning');
            return;
        }

        const data = {
            exported_at: new Date().toISOString(),
            domains: this.wishlist
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `domain-wishlist-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Wishlist dışa aktarıldı!', 'success');
    }

    importWishlist(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const domains = data.domains || data;

                if (!Array.isArray(domains)) {
                    throw new Error('Geçersiz dosya formatı');
                }

                let addedCount = 0;
                domains.forEach(item => {
                    const domain = typeof item === 'string' ? item : item.domain;
                    if (domain && !this.isDomainInWishlist(domain)) {
                        this.wishlist.push({
                            domain: domain,
                            addedAt: new Date().toISOString(),
                            lastChecked: item.lastChecked || null,
                            status: item.status || 'Kontrol Edilmedi',
                            available: item.available || null
                        });
                        addedCount++;
                    }
                });

                this.saveWishlist();
                this.renderWishlist();
                this.showNotification(`${addedCount} domain başarıyla içe aktarıldı!`, 'success');

            } catch (error) {
                console.error('❌ Import hatası:', error);
                this.showNotification('Dosya içe aktarılırken hata oluştu!', 'error');
            }
        };
        reader.readAsText(file);
    }

    renderWishlist() {
        const container = document.getElementById('wishlist-container');
        if (!container) return;

        if (this.wishlist.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-heart text-4xl text-gray-300 mb-4"></i>
                    <p class="text-xl text-gray-500 mb-4">İstek listeniz boş</p>
                    <p class="text-gray-400">Domain arama sırasında beğendiğiniz domainleri buraya ekleyebilirsiniz</p>
                </div>
            `;
            return;
        }

        // Stat'ları hesapla
        const available = this.wishlist.filter(item => item.available === true).length;
        const unavailable = this.wishlist.filter(item => item.available === false).length;
        const unchecked = this.wishlist.filter(item => item.available === null).length;

        let html = `
            <!-- İstatistikler -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div class="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm opacity-90">Toplam Domain</p>
                            <p class="text-2xl font-bold">${this.wishlist.length}</p>
                        </div>
                        <i class="fas fa-list text-2xl opacity-80"></i>
                    </div>
                </div>
                <div class="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm opacity-90">Müsait</p>
                            <p class="text-2xl font-bold">${available}</p>
                        </div>
                        <i class="fas fa-check-circle text-2xl opacity-80"></i>
                    </div>
                </div>
                <div class="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-4 text-white">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm opacity-90">Kayıtlı</p>
                            <p class="text-2xl font-bold">${unavailable}</p>
                        </div>
                        <i class="fas fa-times-circle text-2xl opacity-80"></i>
                    </div>
                </div>
                <div class="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl p-4 text-white">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm opacity-90">Kontrol Edilmedi</p>
                            <p class="text-2xl font-bold">${unchecked}</p>
                        </div>
                        <i class="fas fa-question-circle text-2xl opacity-80"></i>
                    </div>
                </div>
            </div>

            <!-- Domain Listesi -->
            <div class="space-y-4">
        `;

        this.wishlist.forEach(item => {
            const statusIcon = item.available === true ? 'fa-check-circle text-green-500' :
                             item.available === false ? 'fa-times-circle text-red-500' :
                             'fa-question-circle text-gray-400';
            
            const statusColor = item.available === true ? 'bg-green-50 border-green-200' :
                               item.available === false ? 'bg-red-50 border-red-200' :
                               'bg-gray-50 border-gray-200';

            html += `
                <div class="wishlist-item ${statusColor} border-2 rounded-xl p-4 hover:shadow-lg transition-all duration-300">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <i class="fas ${statusIcon} text-xl"></i>
                            <div>
                                <h4 class="font-bold text-lg text-gray-800">${item.domain}</h4>
                                <p class="text-sm text-gray-600">${item.status}</p>
                                ${item.lastChecked ? `
                                    <p class="text-xs text-gray-500">
                                        Son kontrol: ${new Date(item.lastChecked).toLocaleString('tr-TR')}
                                    </p>
                                ` : ''}
                                ${item.error ? `
                                    <p class="text-xs text-red-500 mt-1">
                                        <i class="fas fa-exclamation-triangle mr-1"></i>
                                        ${item.error}
                                    </p>
                                ` : ''}
                            </div>
                        </div>
                        <div class="flex space-x-2">
                            <button class="check-single-btn px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors" data-domain="${item.domain}">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                            <button class="remove-btn px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors" data-domain="${item.domain}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        // Event listener'ları ekle
        this.attachItemEventListeners();
    }

    attachItemEventListeners() {
        // Tek domain kontrol butonları
        document.querySelectorAll('.check-single-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const domain = e.currentTarget.dataset.domain;
                const originalText = e.currentTarget.innerHTML;
                
                e.currentTarget.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                e.currentTarget.disabled = true;

                await this.checkSingleDomain(domain);
                this.saveWishlist();
                this.renderWishlist();

                e.currentTarget.innerHTML = originalText;
                e.currentTarget.disabled = false;
            });
        });

        // Remove butonları
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const domain = e.currentTarget.dataset.domain;
                if (confirm(`${domain} adresini listeden çıkarmak istediğinizden emin misiniz?`)) {
                    this.removeDomain(domain);
                }
            });
        });
    }

    showNotification(message, type = 'info') {
        // Basit notification sistemi
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg text-white font-medium transform transition-all duration-300 translate-x-full`;
        
        const bgColor = type === 'success' ? 'bg-green-500' :
                        type === 'error' ? 'bg-red-500' :
                        type === 'warning' ? 'bg-yellow-500' :
                        'bg-blue-500';
        
        notification.classList.add(bgColor);
        notification.textContent = message;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.wishlistApp = new WishlistApp();
}); 