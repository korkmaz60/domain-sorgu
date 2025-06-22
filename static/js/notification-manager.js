// Bildirim Yöneticisi - Toast bildirimleri ve kullanıcı geri bildirimleri

class NotificationManager {
    constructor() {}

    showNotification(message, type = 'info') {
        // Mevcut notification'ları temizle
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(n => n.remove());

        const notification = document.createElement('div');
        
        const bgColor = type === 'success' ? 'bg-green-500' : 
                       type === 'error' ? 'bg-red-500' : 
                       type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';
        
        notification.className = `notification fixed top-4 right-4 ${bgColor} text-white px-6 py-4 rounded-xl shadow-lg z-50 transform translate-x-full transition-transform duration-300 ease-in-out`;
        
        notification.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="flex-shrink-0">
                    ${this.getIcon(type)}
                </div>
                <div class="flex-1">
                    <p class="font-medium">${message}</p>
                </div>
                <button class="ml-4 text-white hover:text-gray-200 transition-colors" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animasyon ile göster
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // 5 saniye sonra otomatik kaldır
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.add('translate-x-full');
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
    }

    getIcon(type) {
        switch (type) {
            case 'success':
                return '<i class="fas fa-check-circle text-xl"></i>';
            case 'error':
                return '<i class="fas fa-exclamation-circle text-xl"></i>';
            case 'warning':
                return '<i class="fas fa-exclamation-triangle text-xl"></i>';
            default:
                return '<i class="fas fa-info-circle text-xl"></i>';
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }
} 