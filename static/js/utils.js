// Yardımcı Fonksiyonlar - Genel amaçlı utility fonksiyonları

// Panoya kopyalama fonksiyonu
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

// Tarih formatı yardımcı fonksiyonu
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Domain adı validasyonu
function isValidDomain(domain) {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    return domainRegex.test(domain);
}

// Metin temizleme fonksiyonu
function sanitizeText(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Debounce fonksiyonu
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// URL'den domain çıkarma
function extractDomain(url) {
    try {
        const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`);
        return urlObj.hostname;
    } catch (e) {
        return url;
    }
} 