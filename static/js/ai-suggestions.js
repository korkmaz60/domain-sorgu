// AI Önerileri Sınıfı - OpenRouter API ile domain önerileri

class AISuggestions {
    constructor() {
        this.currentBaseName = '';
        this.usedSuggestions = new Set();
    }

    async getAISuggestions(baseName, isMore = false) {
        // AI devre dışıysa çık
        if (!window.domainSearch.aiConfig.enabled) {
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
                this.handleNoSuggestions(isMore, aiResults);
            }
        } catch (error) {
            this.handleSuggestionError(error, isMore, aiResults, moreButton);
        }
    }

    handleNoSuggestions(isMore, aiResults) {
        if (isMore) {
            const loadingElement = aiResults.querySelector('.animate-pulse:last-child');
            if (loadingElement) {
                loadingElement.innerHTML = '<p style="text-align: center; color: #666;">Daha fazla öneri oluşturulamadı.</p>';
            }
        } else {
            aiResults.innerHTML = '<p style="text-align: center; color: #666;">AI önerisi oluşturulamadı.</p>';
        }
    }

    handleSuggestionError(error, isMore, aiResults, moreButton) {
        console.error('AI Öneri Hatası:', error);
        if (isMore) {
            const loadingElement = aiResults.querySelector('.animate-pulse:last-child');
            if (loadingElement) {
                loadingElement.innerHTML = '<p style="text-align: center; color: #dc3545;">Daha fazla öneri alınırken hata oluştu.</p>';
            }
            moreButton.disabled = false;
            moreButton.innerHTML = '<i class="fas fa-plus"></i> Devam Et (5 Tane Daha)';
        } else {
            aiResults.innerHTML = '<p style="text-align: center; color: #dc3545;">AI önerileri alınırken hata oluştu.</p>';
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
                'Authorization': `Bearer ${window.domainSearch.aiConfig.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Domain Query App'
            },
            body: JSON.stringify({
                model: window.domainSearch.aiConfig.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 200,
                temperature: 0.8
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
            .map(line => line.replace(/^\d+\.\s*/, '').trim())
            .filter(line => line && !line.includes('.'))
            .filter(line => !this.usedSuggestions.has(line.toLowerCase()))
            .slice(0, 5);

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
            selectedExtensions.push('com');
        }

        // Her öneri için tüm seçili uzantıları kontrol et
        for (const suggestion of suggestions) {
            await this.processSuggestion(suggestion, selectedExtensions, aiResults);
        }
    }

    async processSuggestion(suggestion, selectedExtensions, aiResults) {
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
            await this.checkSingleAIDomain(domain, domainsContainer);
        }
    }

    async checkSingleAIDomain(domain, container) {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'ai-domain-result';
        resultDiv.innerHTML = `
            <div class="ai-domain-name">${domain}</div>
            <div class="ai-domain-actions">
                <span class="ai-status-badge unknown">Kontrol ediliyor...</span>
            </div>
        `;
        container.appendChild(resultDiv);

        try {
            const requestBody = { 
                domain,
                provider: window.domainSearch.searchConfig.provider
            };

            if (window.domainSearch.searchConfig.provider === 'porkbun') {
                requestBody.porkbunApiKey = window.domainSearch.searchConfig.porkbunApiKey;
                requestBody.porkbunSecretKey = window.domainSearch.searchConfig.porkbunSecretKey;
            }

            const response = await fetch('/api/check-domain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();
            this.updateAIResult(resultDiv, domain, result);
        } catch (error) {
            this.updateAIResult(resultDiv, domain, { available: null, error: 'Kontrol hatası' });
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
                <button class="btn btn-wishlist" onclick="window.wishlistManager.addToWishlistFromResult('${domain}', this, ${result.available})">
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
                <button class="btn btn-wishlist" onclick="window.wishlistManager.addToWishlistFromResult('${domain}', this, ${result.available})">
                    <i class="fas fa-heart"></i>
                </button>
                <button class="btn btn-secondary btn-sm" onclick="copyToClipboard('${domain}')">
                    <i class="fas fa-copy"></i>
                </button>
            `;
        }
    }
} 