// İstek Listesi Sayfası JavaScript Kodu

class WishlistApp {
    constructor() {
        this.searchConfig = {
            provider: localStorage.getItem('search_provider') || 'whois',
            porkbunApiKey: localStorage.getItem('porkbun_api_key') || '',
            porkbunSecretKey: localStorage.getItem('porkbun_secret_key') || ''
        };
        this.currentFilter = 'all';
        this.currentSort = 'date-desc';
        this.stats = {
            total: 0,
            available: 0,
            taken: 0,
            unknown: 0,
            unchecked: 0
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadWishlist();
        this.updateStats();
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('wishlist-add-form').addEventListener('submit', (e) => this.handleAddToWishlist(e));
        
        // Action buttons
        document.getElementById('check-all-wishlist').addEventListener('click', () => this.checkAllWishlist());
        document.getElementById('refresh-all-wishlist').addEventListener('click', () => this.refreshAllWishlist());
        document.getElementById('clear-wishlist').addEventListener('click', () => this.clearWishlist());
        document.getElementById('export-wishlist').addEventListener('click', () => this.exportWishlist());
        
        // Filter and sort
        document.getElementById('filter-wishlist').addEventListener('click', () => this.toggleFilterPanel());
        document.getElementById('sort-wishlist').addEventListener('click', () => this.toggleFilterPanel());
        document.getElementById('status-filter').addEventListener('change', (e) => this.applyFilter(e.target.value));
        document.getElementById('sort-option').addEventListener('change', (e) => this.applySorting(e.target.value));
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

    showNotification(message, type = 'info') {
        // Notification container oluştur (yoksa)
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'fixed top-4 right-4 z-50 space-y-2';
            document.body.appendChild(container);
        }

        // Notification element
        const notification = document.createElement('div');
        const bgColor = {
            'success': 'bg-green-500',
            'error': 'bg-red-500',
            'warning': 'bg-yellow-500',
            'info': 'bg-blue-500'
        }[type] || 'bg-blue-500';

        const icon = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        }[type] || 'fa-info-circle';

        notification.className = `${bgColor} text-white px-6 py-4 rounded-xl shadow-lg transform translate-x-full transition-transform duration-300 flex items-center space-x-3 max-w-sm`;
        notification.innerHTML = `
            <i class="fas ${icon}"></i>
            <span class="font-medium">${message}</span>
            <button class="ml-auto text-white/80 hover:text-white" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(notification);

        // Animasyon
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);

        // Otomatik kaldırma
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }, 5000);
    }

    getWishlist() {
        return JSON.parse(localStorage.getItem('domain_wishlist') || '[]');
    }

    saveWishlist(wishlist) {
        localStorage.setItem('domain_wishlist', JSON.stringify(wishlist));
    }

    isInWishlist(domain) {
        const wishlist = this.getWishlist();
        return wishlist.some(item => item.domain.toLowerCase() === domain.toLowerCase());
    }

    addToWishlist(domain) {
        if (this.isInWishlist(domain)) {
            this.showNotification('Bu domain zaten listenizde mevcut', 'warning');
            return false;
        }

        const wishlist = this.getWishlist();
        const newItem = {
            domain: domain.toLowerCase(),
            addedDate: new Date().toISOString(),
            status: null,
            lastChecked: null,
            result: null
        };

        wishlist.push(newItem);
        this.saveWishlist(wishlist);
        this.showNotification('Domain istek listesine eklendi', 'success');
        return true;
    }

    removeFromWishlist(domain) {
        const wishlist = this.getWishlist();
        const filteredWishlist = wishlist.filter(item => item.domain.toLowerCase() !== domain.toLowerCase());
        this.saveWishlist(filteredWishlist);
        this.showNotification('Domain istek listesinden kaldırıldı', 'info');
    }

    async handleAddToWishlist(e) {
        e.preventDefault();
        const domainInput = document.getElementById('wishlist-domain');
        const domain = domainInput.value.trim().toLowerCase();

        if (!domain) {
            this.showNotification('Lütfen domain adı girin', 'error');
            return;
        }

        // Domain formatı kontrolü
        if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
            this.showNotification('Geçerli bir domain formatı girin (örn: example.com)', 'error');
            return;
        }

        if (this.addToWishlist(domain)) {
            domainInput.value = '';
            this.loadWishlist();
            this.updateStats();
        }
    }

    loadWishlist() {
        const wishlist = this.getWishlist();
        const emptyDiv = document.getElementById('wishlist-empty');
        const itemsDiv = document.getElementById('wishlist-items');

        if (wishlist.length === 0) {
            emptyDiv.classList.remove('hidden');
            itemsDiv.classList.add('hidden');
        } else {
            emptyDiv.classList.add('hidden');
            itemsDiv.classList.remove('hidden');
            this.renderWishlistItems(wishlist);
        }
    }

    renderWishlistItems(wishlist) {
        const container = document.getElementById('wishlist-items');
        
        // Filtreleme ve sıralama uygula
        let filteredWishlist = this.filterWishlist(wishlist, this.currentFilter);
        filteredWishlist = this.sortWishlist(filteredWishlist, this.currentSort);

        if (filteredWishlist.length === 0 && this.currentFilter !== 'all') {
            container.innerHTML = `
                <div class="bg-white rounded-2xl shadow-lg p-8 text-center">
                    <i class="fas fa-filter text-4xl text-gray-300 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-600 mb-2">Filtre sonucu bulunamadı</h3>
                    <p class="text-gray-500">Seçilen kriterlere uygun domain bulunamadı.</p>
                    <button onclick="document.getElementById('status-filter').value='all'; wishlistApp.applyFilter('all')" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                        Tüm Domainleri Göster
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredWishlist.map(item => this.createWishlistItemHTML(item)).join('');
    }

    createWishlistItemHTML(item) {
        const statusBadge = this.getStatusBadge(item.status);
        const actionButtons = this.getActionButtons(item);
        const domainDetails = this.getDomainDetails(item);

        return `
            <div class="wishlist-item bg-white rounded-2xl shadow-lg p-6 border-l-4 ${this.getBorderColor(item.status)} card-hover" data-domain="${item.domain}">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center space-x-4">
                        <div class="flex items-center justify-center w-12 h-12 ${this.getIconBgColor(item.status)} rounded-xl">
                            <i class="fas ${this.getStatusIcon(item.status)} text-xl ${this.getIconColor(item.status)}"></i>
                        </div>
                        <div>
                            <h3 class="text-xl font-bold text-gray-800 flex items-center space-x-2">
                                <span>${item.domain}</span>
                                ${statusBadge}
                            </h3>
                            <p class="text-gray-600 text-sm">
                                Eklenme: ${this.formatDate(item.addedDate)}
                                ${item.lastChecked ? `• Son kontrol: ${this.formatDate(item.lastChecked)}` : ''}
                            </p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        ${actionButtons}
                    </div>
                </div>
                
                ${domainDetails}
            </div>
        `;
    }

    getStatusBadge(status) {
        const badges = {
            true: '<span class="status-badge px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Müsait</span>',
            false: '<span class="status-badge px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">Kayıtlı</span>',
            null: '<span class="status-badge px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">Kontrol Edilmedi</span>',
            'unknown': '<span class="status-badge px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">Bilinmeyen</span>'
        };
        return badges[status] || badges[null];
    }

    getActionButtons(item) {
        const checkButton = `
            <button onclick="wishlistApp.checkSingleDomain('${item.domain}')" 
                    class="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors flex items-center space-x-2 text-sm font-medium">
                <i class="fas fa-search"></i>
                <span>Kontrol Et</span>
            </button>
        `;

        const removeButton = `
            <button onclick="wishlistApp.removeDomain('${item.domain}')" 
                    class="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors flex items-center space-x-2 text-sm font-medium">
                <i class="fas fa-trash"></i>
                <span>Kaldır</span>
            </button>
        `;

        return checkButton + removeButton;
    }

    getDomainDetails(item) {
        if (!item.result) return '';

        const result = item.result;
        let details = '';

        if (result.registrar) {
            details += `<p><strong>Registrar:</strong> ${result.registrar}</p>`;
        }
        if (result.creation_date) {
            details += `<p><strong>Kayıt Tarihi:</strong> ${this.formatDate(result.creation_date)}</p>`;
        }
        if (result.expiration_date) {
            details += `<p><strong>Son Geçerlilik:</strong> ${this.formatDate(result.expiration_date)}</p>`;
        }

        if (details) {
            return `
                <div class="mt-4 pt-4 border-t border-gray-200">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        ${details}
                    </div>
                </div>
            `;
        }

        return '';
    }

    getBorderColor(status) {
        const colors = {
            true: 'border-green-500',
            false: 'border-red-500',
            null: 'border-gray-300',
            'unknown': 'border-yellow-500'
        };
        return colors[status] || colors[null];
    }

    getIconBgColor(status) {
        const colors = {
            true: 'bg-green-100',
            false: 'bg-red-100',
            null: 'bg-gray-100',
            'unknown': 'bg-yellow-100'
        };
        return colors[status] || colors[null];
    }

    getIconColor(status) {
        const colors = {
            true: 'text-green-600',
            false: 'text-red-600',
            null: 'text-gray-600',
            'unknown': 'text-yellow-600'
        };
        return colors[status] || colors[null];
    }

    getStatusIcon(status) {
        const icons = {
            true: 'fa-check-circle',
            false: 'fa-times-circle',
            null: 'fa-question-circle',
            'unknown': 'fa-exclamation-circle'
        };
        return icons[status] || icons[null];
    }

    async checkSingleDomain(domain) {
        this.showLoading(true);
        
        try {
            const requestBody = { 
                domain,
                provider: this.searchConfig.provider
            };

            if (this.searchConfig.provider === 'porkbun') {
                requestBody.porkbunApiKey = this.searchConfig.porkbunApiKey;
                requestBody.porkbunSecretKey = this.searchConfig.porkbunSecretKey;
            }

            const response = await fetch('/api/check-domain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            
            if (data.error) {
                this.showNotification(`Hata: ${data.error}`, 'error');
            } else {
                this.updateWishlistItem(domain, data.available, data);
                this.loadWishlist();
                this.updateStats();
                
                const statusText = data.available === true ? 'müsait' : 
                                 data.available === false ? 'kayıtlı' : 'bilinmeyen';
                this.showNotification(`${domain} durumu: ${statusText}`, 'info');
            }
        } catch (error) {
            this.showNotification('Bağlantı hatası oluştu', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    updateWishlistItem(domain, status, result = null) {
        const wishlist = this.getWishlist();
        const itemIndex = wishlist.findIndex(item => item.domain.toLowerCase() === domain.toLowerCase());
        
        if (itemIndex !== -1) {
            wishlist[itemIndex].status = status;
            wishlist[itemIndex].lastChecked = new Date().toISOString();
            wishlist[itemIndex].result = result;
            this.saveWishlist(wishlist);
        }
    }

    async checkAllWishlist() {
        const wishlist = this.getWishlist();
        if (wishlist.length === 0) {
            this.showNotification('İstek listeniz boş', 'warning');
            return;
        }

        this.showLoading(true);
        let checkedCount = 0;
        let totalCount = wishlist.length;

        this.showNotification(`${totalCount} domain kontrol ediliyor...`, 'info');

        for (const item of wishlist) {
            try {
                const requestBody = { 
                    domain: item.domain,
                    provider: this.searchConfig.provider
                };

                if (this.searchConfig.provider === 'porkbun') {
                    requestBody.porkbunApiKey = this.searchConfig.porkbunApiKey;
                    requestBody.porkbunSecretKey = this.searchConfig.porkbunSecretKey;
                }

                const response = await fetch('/api/check-domain', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                });

                const data = await response.json();
                
                if (!data.error) {
                    this.updateWishlistItem(item.domain, data.available, data);
                }
                
                checkedCount++;
                
                // Progress update
                if (checkedCount % 5 === 0 || checkedCount === totalCount) {
                    this.showNotification(`${checkedCount}/${totalCount} domain kontrol edildi`, 'info');
                }

                // Rate limiting - kısa bekleme
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error(`Error checking ${item.domain}:`, error);
            }
        }

        this.showLoading(false);
        this.loadWishlist();
        this.updateStats();
        this.showNotification(`Tüm domainler kontrol edildi (${checkedCount}/${totalCount})`, 'success');
    }

    async refreshAllWishlist() {
        const wishlist = this.getWishlist();
        const checkedItems = wishlist.filter(item => item.status !== null);
        
        if (checkedItems.length === 0) {
            this.showNotification('Yenilenecek kontrol edilmiş domain bulunamadı', 'warning');
            return;
        }

        this.showLoading(true);
        let refreshedCount = 0;

        for (const item of checkedItems) {
            try {
                const requestBody = { 
                    domain: item.domain,
                    provider: this.searchConfig.provider
                };

                if (this.searchConfig.provider === 'porkbun') {
                    requestBody.porkbunApiKey = this.searchConfig.porkbunApiKey;
                    requestBody.porkbunSecretKey = this.searchConfig.porkbunSecretKey;
                }

                const response = await fetch('/api/check-domain', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                });

                const data = await response.json();
                
                if (!data.error) {
                    this.updateWishlistItem(item.domain, data.available, data);
                    refreshedCount++;
                }

                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error(`Error refreshing ${item.domain}:`, error);
            }
        }

        this.showLoading(false);
        this.loadWishlist();
        this.updateStats();
        this.showNotification(`${refreshedCount} domain yenilendi`, 'success');
    }

    removeDomain(domain) {
        if (confirm(`${domain} adresini istek listesinden kaldırmak istediğinizden emin misiniz?`)) {
            this.removeFromWishlist(domain);
            this.loadWishlist();
            this.updateStats();
        }
    }

    clearWishlist() {
        if (confirm('Tüm istek listesini temizlemek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
            localStorage.removeItem('domain_wishlist');
            this.loadWishlist();
            this.updateStats();
            this.showNotification('İstek listesi temizlendi', 'info');
        }
    }

    exportWishlist() {
        const wishlist = this.getWishlist();
        if (wishlist.length === 0) {
            this.showNotification('İstek listeniz boş', 'warning');
            return;
        }

        const csvContent = this.generateCSV(wishlist);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `domain-wishlist-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification('İstek listesi dışa aktarıldı', 'success');
    }

    generateCSV(wishlist) {
        const headers = ['Domain', 'Durum', 'Eklenme Tarihi', 'Son Kontrol', 'Registrar', 'Kayıt Tarihi', 'Son Geçerlilik'];
        const rows = wishlist.map(item => [
            item.domain,
            item.status === true ? 'Müsait' : item.status === false ? 'Kayıtlı' : item.status === 'unknown' ? 'Bilinmeyen' : 'Kontrol Edilmedi',
            this.formatDate(item.addedDate),
            item.lastChecked ? this.formatDate(item.lastChecked) : '',
            item.result?.registrar || '',
            item.result?.creation_date ? this.formatDate(item.result.creation_date) : '',
            item.result?.expiration_date ? this.formatDate(item.result.expiration_date) : ''
        ]);

        return [headers, ...rows].map(row => 
            row.map(field => `"${field}"`).join(',')
        ).join('\n');
    }

    toggleFilterPanel() {
        const panel = document.getElementById('filter-sort-panel');
        panel.classList.toggle('hidden');
    }

    applyFilter(filter) {
        this.currentFilter = filter;
        this.loadWishlist();
    }

    applySorting(sort) {
        this.currentSort = sort;
        this.loadWishlist();
    }

    filterWishlist(wishlist, filter) {
        if (filter === 'all') return wishlist;
        
        return wishlist.filter(item => {
            switch (filter) {
                case 'available':
                    return item.status === true;
                case 'taken':
                    return item.status === false;
                case 'unknown':
                    return item.status === 'unknown';
                case 'unchecked':
                    return item.status === null;
                default:
                    return true;
            }
        });
    }

    sortWishlist(wishlist, sort) {
        return [...wishlist].sort((a, b) => {
            switch (sort) {
                case 'date-desc':
                    return new Date(b.addedDate) - new Date(a.addedDate);
                case 'date-asc':
                    return new Date(a.addedDate) - new Date(b.addedDate);
                case 'name-asc':
                    return a.domain.localeCompare(b.domain);
                case 'name-desc':
                    return b.domain.localeCompare(a.domain);
                case 'status':
                    const statusOrder = { true: 0, false: 1, 'unknown': 2, null: 3 };
                    return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
                default:
                    return 0;
            }
        });
    }

    updateStats() {
        const wishlist = this.getWishlist();
        this.stats = {
            total: wishlist.length,
            available: wishlist.filter(item => item.status === true).length,
            taken: wishlist.filter(item => item.status === false).length,
            unknown: wishlist.filter(item => item.status === 'unknown').length,
            unchecked: wishlist.filter(item => item.status === null).length
        };

        // UI'ı güncelle
        document.getElementById('total-count').textContent = this.stats.total;
        document.getElementById('available-count').textContent = this.stats.available;
        document.getElementById('taken-count').textContent = this.stats.taken;
        document.getElementById('unknown-count').textContent = this.stats.unknown;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    }
}

// Global instance
var wishlistApp;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    wishlistApp = new WishlistApp();
}); 