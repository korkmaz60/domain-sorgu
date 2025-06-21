// Sonuç Gösterimi Sınıfı - Domain sonuçlarının HTML formatında gösterilmesi

class ResultRenderer {
    constructor() {}

    createResultHTML(result) {
        const status = result.available;
        
        // Rate limit kontrolü
        const isRateLimit = result.status && result.status.includes('Rate Limit');
        
        const palette = status === true ? {
            border: 'border-green-500',
            bg: 'bg-green-50',
            iconBg: 'bg-green-100',
            text: 'text-green-800',
            icon: 'fa-check',
            label: 'MÜSAİT'
        } : status === false ? {
            border: 'border-red-500',
            bg: 'bg-red-50',
            iconBg: 'bg-red-100',
            text: 'text-red-800',
            icon: 'fa-times',
            label: 'KAYITLI'
        } : isRateLimit ? {
            border: 'border-orange-500',
            bg: 'bg-orange-50',
            iconBg: 'bg-orange-100',
            text: 'text-orange-800',
            icon: 'fa-clock',
            label: 'RATE LIMIT'
        } : {
            border: 'border-yellow-500',
            bg: 'bg-yellow-50',
            iconBg: 'bg-yellow-100',
            text: 'text-yellow-800',
            icon: 'fa-question',
            label: 'BİLİNMEYEN'
        };

        const isInWishlist = window.wishlistManager.isInWishlist(result.domain);
        const wishlistButton = isInWishlist ? 
            `<button class="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium flex items-center space-x-2 transition-colors" disabled>
                <i class="fas fa-heart"></i>
                <span>Listede</span>
            </button>` :
            `<button class="px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors flex items-center space-x-2" 
                onclick="window.wishlistManager.addToWishlistFromResult('${result.domain}', this, ${status})">
                <i class="fas fa-heart"></i>
                <span>Listeye Ekle</span>
            </button>`;

        const apiProvider = result.provider || 'whois';
        const apiLabel = apiProvider === 'porkbun' ? 'Porkbun API' : 'WHOIS';
        
        // Porkbun API için ek bilgileri göster
        let additionalInfo = '';
        if (result.provider === 'porkbun') {
            let porkbunDetails = '';
            
            if (result.price && result.price !== '-' && result.price !== 'Bilinmiyor') {
                porkbunDetails += `<div class="text-sm text-green-600 font-medium">💰 Fiyat: $${result.price}</div>`;
            }
            
            if (result.renewal_price && result.renewal_price !== '-') {
                porkbunDetails += `<div class="text-sm text-blue-600">🔄 Yenileme: $${result.renewal_price}</div>`;
            }
            
            if (result.raw_avail) {
                porkbunDetails += `<div class="text-xs text-gray-500">🔍 Raw Status: ${result.raw_avail}</div>`;
            }
            
            if (porkbunDetails) {
                additionalInfo = `<div class="mt-3 pt-3 border-t border-gray-200">${porkbunDetails}</div>`;
            }
        }

        return `
            <div class="bg-white rounded-2xl shadow-xl p-6 mb-4 card-hover border-l-4 ${palette.border} animate-fade-in">
                <div class="flex items-start mb-4">
                    <div class="flex items-center justify-center w-12 h-12 ${palette.iconBg} rounded-xl mr-4 shrink-0">
                        <i class="fas ${palette.icon} text-xl ${palette.text}"></i>
                    </div>
                    <div class="flex-1">
                        <h4 class="text-xl font-bold text-gray-800 mb-1">${result.domain}</h4>
                        <p class="text-sm text-gray-500">API: ${apiLabel}</p>
                        ${result.status ? `<p class="text-sm text-gray-600">Status: ${result.status}</p>` : ''}
                    </div>
                    <span class="px-3 py-1 rounded-full text-xs font-semibold ${palette.bg} ${palette.text}">${palette.label}</span>
                </div>
                
                ${additionalInfo}

                <div class="flex flex-wrap items-center justify-between gap-3 mt-4">
                    <div class="flex items-center space-x-2 text-sm text-gray-500">
                        <i class="fas fa-clock"></i>
                        <span>${new Date().toLocaleString('tr-TR')}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        ${wishlistButton}
                        <button class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center space-x-2" onclick="copyToClipboard('${result.domain}')">
                            <i class="fas fa-copy"></i>
                            <span>Kopyala</span>
                        </button>
                    </div>
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
} 