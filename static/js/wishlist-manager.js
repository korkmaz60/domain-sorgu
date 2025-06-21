// İstek Listesi Yöneticisi - Wishlist işlemleri

class WishlistManager {
    constructor() {}

    getWishlist() {
        const wishlist = localStorage.getItem('domain_wishlist');
        return wishlist ? JSON.parse(wishlist) : [];
    }

    saveWishlist(wishlist) {
        localStorage.setItem('domain_wishlist', JSON.stringify(wishlist));
    }

    isInWishlist(domain) {
        const wishlist = this.getWishlist();
        return wishlist.some(item => item.domain === domain);
    }

    addToWishlist(domain) {
        if (this.isInWishlist(domain)) {
            window.notificationManager.showNotification('Bu domain zaten istek listenizde!', 'warning');
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
        window.notificationManager.showNotification(`${domain} istek listesine eklendi!`, 'success');
    }

    addToWishlistFromResult(domain, buttonElement, status = 'unchecked') {
        if (this.isInWishlist(domain)) {
            window.notificationManager.showNotification('Bu domain zaten istek listenizde!', 'warning');
            return;
        }

        const wishlist = this.getWishlist();
        const newItem = {
            domain: domain,
            addedDate: new Date().toISOString(),
            status: status,
            lastChecked: (status !== 'unchecked' && status !== null) ? new Date().toISOString() : null
        };

        wishlist.push(newItem);
        this.saveWishlist(wishlist);
        
        // Butonu güncelle
        buttonElement.innerHTML = '<i class="fas fa-heart"></i> Listede';
        buttonElement.className = 'px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium flex items-center space-x-2 transition-colors';
        buttonElement.disabled = true;
        buttonElement.onclick = null;
        
        // Başarı animasyonu
        buttonElement.style.transform = 'scale(1.1)';
        setTimeout(() => {
            buttonElement.style.transform = 'scale(1)';
        }, 200);
        
        window.notificationManager.showNotification(`${domain} istek listesine eklendi! 💝`, 'success');
    }

    removeFromWishlist(domain) {
        const wishlist = this.getWishlist();
        const updatedWishlist = wishlist.filter(item => item.domain !== domain);
        this.saveWishlist(updatedWishlist);
        window.notificationManager.showNotification(`${domain} istek listesinden kaldırıldı!`, 'info');
    }
} 