from flask import Flask, render_template, request, jsonify
import socket
import whois
import requests
from datetime import datetime
import threading
import time
import urllib3

# SSL warning'lerini kapat
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = Flask(__name__)

class DomainChecker:
    """Domain kontrol işlemlerini yöneten sınıf - SOLID prensiplerine uygun"""
    
    def __init__(self):
        self.results = []
    
    def check_single_domain(self, domain, provider='whois', porkbun_api_key=None, porkbun_secret_key=None):
        """Tek domain kontrolü - WHOIS veya Porkbun API ile"""
        if provider == 'porkbun' and porkbun_api_key and porkbun_secret_key:
            return self._check_domain_porkbun(domain, porkbun_api_key, porkbun_secret_key)
        else:
            return self._check_domain_whois(domain)
    
    def _check_domain_whois(self, domain):
        """WHOIS ile domain kontrolü"""
        try:
            domain_info = whois.whois(domain)
            
            if domain_info.domain_name:
                return {
                    'domain': domain,
                    'available': False,
                    'status': 'Kayıtlı',
                    'creation_date': str(domain_info.creation_date) if domain_info.creation_date else 'Bilinmiyor',
                    'expiration_date': str(domain_info.expiration_date) if domain_info.expiration_date else 'Bilinmiyor',
                    'registrar': domain_info.registrar or 'Bilinmiyor',
                    'provider': 'WHOIS'
                }
            else:
                return {
                    'domain': domain,
                    'available': True,
                    'status': 'Müsait',
                    'creation_date': '-',
                    'expiration_date': '-',
                    'registrar': '-',
                    'provider': 'WHOIS'
                }
                
        except Exception as e:
            # WHOIS koruması veya diğer sebeplerle kontrol edilemeyen durumlar
            error_msg = str(e).lower()
            if 'no match' in error_msg or 'not found' in error_msg:
                status = 'Muhtemelen Müsait'
            elif 'privacy' in error_msg or 'protected' in error_msg or 'redacted' in error_msg:
                status = 'WHOIS Korumalı (Kayıtlı)'
            else:
                status = 'Kontrol Edilemedi'
                
            return {
                'domain': domain,
                'available': None,
                'status': status,
                'creation_date': '-',
                'expiration_date': '-',
                'registrar': '-',
                'provider': 'WHOIS',
                'error': str(e)
            }
    
    def _check_domain_porkbun(self, domain, api_key, secret_key):
        """Porkbun API ile domain kontrolü"""
        try:
            # Porkbun domain check API'si - doğru endpoint
            url = f'https://api.porkbun.com/api/json/v3/domain/checkDomain/{domain}'
            print(f"🌐 Porkbun API URL: {url}")
            payload = {
                'apikey': api_key,
                'secretapikey': secret_key
            }
            
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'Domain-Checker/1.0'
            }
            
            response = requests.post(url, json=payload, headers=headers, timeout=10, verify=False)
            
            print(f"📡 HTTP Status: {response.status_code}")
            print(f"📋 Response Headers: {dict(response.headers)}")
            print(f"📄 Raw Response: {response.text[:500]}...")
            
            # HTTP status kontrolü
            if response.status_code != 200:
                return {
                    'domain': domain,
                    'available': None,
                    'status': 'Kontrol Edilemedi',
                    'creation_date': '-',
                    'expiration_date': '-',
                    'registrar': '-',
                    'provider': 'Porkbun',
                    'error': f'HTTP Hatası: {response.status_code}'
                }
            
            # JSON parse etmeye çalış
            try:
                data = response.json()
            except ValueError:
                return {
                    'domain': domain,
                    'available': None,
                    'status': 'Kontrol Edilemedi',
                    'creation_date': '-',
                    'expiration_date': '-',
                    'registrar': '-',
                    'provider': 'Porkbun',
                    'error': 'Geçersiz JSON yanıtı'
                }
            
            # Rate limit kontrolü ÖNCE yapılmalı (SUCCESS/ERROR fark etmez)
            limits = data.get('limits', {})
            if limits and limits.get('used', 0) >= limits.get('limit', 1):
                wait_seconds = limits.get('TTL', 12)
                natural_message = limits.get('naturalLanguage', f'{wait_seconds} saniye bekleyin')
                
                print(f"🚫 RATE LIMIT DETECTED for {domain} - {natural_message}")
                
                return {
                    'domain': domain,
                    'available': None,
                    'status': 'Rate Limit',
                    'creation_date': '-',
                    'expiration_date': '-',
                    'registrar': '-',
                    'provider': 'Porkbun',
                    'error': f'Rate limit: {natural_message}',
                    'rate_limit': True,
                    'wait_seconds': wait_seconds,
                    'retry_after': wait_seconds,
                    'limits_info': limits
                }
            
            if data.get('status') == 'SUCCESS':
                response_data = data.get('response', {})
                
                # Debug için response'u logla
                print(f"🔍 PORKBUN SUCCESS - Domain: {domain}")
                print(f"🎯 Response Data: {response_data}")
                
                # Availability kontrolü
                avail_status = response_data.get('avail', 'unknown')
                price = response_data.get('price')
                
                print(f"🏷️ Availability: {avail_status}, Price: {price}")
                
                # Sonuç belirleme
                if avail_status == 'yes':
                    is_available = True
                    status = 'Müsait'
                elif avail_status == 'no':
                    is_available = False
                    status = 'Kayıtlı'
                elif price:  # Fiyat varsa müsait
                    is_available = True
                    status = 'Müsait (Fiyatlı)'
                else:
                    is_available = None
                    status = f'Bilinmeyen'
                
                print(f"✅ Final Result: available={is_available}, status={status}")
                
                return {
                    'domain': domain,
                    'available': is_available,
                    'status': status,
                    'creation_date': '-',
                    'expiration_date': '-',
                    'registrar': 'Porkbun' if not is_available else '-',
                    'provider': 'Porkbun',
                    'price': price or '-',
                    'renewal_price': response_data.get('additional', {}).get('renewal', {}).get('price', '-')
                }
            else:
                # API başarısız yanıt verdi
                error_message = data.get('message', 'Bilinmeyen hata')
                
                # Rate limiting kontrolü
                if 'checks within' in error_message and 'seconds used' in error_message:
                    # Rate limit mesajından saniye bilgisini çıkar
                    # Örnek: "1 out of 1 checks within 10 seconds used."
                    import re
                    seconds_match = re.search(r'within (\d+) seconds', error_message)
                    wait_seconds = int(seconds_match.group(1)) if seconds_match else 12
                    
                    print(f"🚫 RATE LIMIT DETECTED for {domain} - Wait {wait_seconds} seconds")
                    
                    return {
                        'domain': domain,
                        'available': None,
                        'status': 'Rate Limit - Bekleniyor',
                        'creation_date': '-',
                        'expiration_date': '-',
                        'registrar': '-',
                        'provider': 'Porkbun',
                        'error': f'Rate limit - {wait_seconds} saniye bekleyin',
                        'rate_limit': True,
                        'wait_seconds': wait_seconds,
                        'retry_after': wait_seconds,
                        'full_response': data
                    }
                elif 'Invalid API key' in error_message:
                    status = 'Geçersiz API Key'
                else:
                    status = f'Porkbun Hatası: {error_message}'
                
                return {
                    'domain': domain,
                    'available': None,
                    'status': status,
                    'creation_date': '-',
                    'expiration_date': '-',
                    'registrar': '-',
                    'provider': 'Porkbun',
                    'error': error_message,
                    'full_response': data  # Debug için tam yanıt
                }
                
        except requests.exceptions.Timeout:
            return {
                'domain': domain,
                'available': None,
                'status': 'Kontrol Edilemedi',
                'creation_date': '-',
                'expiration_date': '-',
                'registrar': '-',
                'provider': 'Porkbun',
                'error': 'Bağlantı zaman aşımı'
            }
        except requests.exceptions.ConnectionError:
            return {
                'domain': domain,
                'available': None,
                'status': 'Kontrol Edilemedi',
                'creation_date': '-',
                'expiration_date': '-',
                'registrar': '-',
                'provider': 'Porkbun',
                'error': 'İnternet bağlantısı hatası'
            }
        except Exception as e:
            return {
                'domain': domain,
                'available': None,
                'status': 'Kontrol Edilemedi',
                'creation_date': '-',
                'expiration_date': '-',
                'registrar': '-',
                'provider': 'Porkbun',
                'error': str(e)
            }
    
    def check_multiple_domains(self, domains, provider='whois', porkbun_api_key=None, porkbun_secret_key=None):
        """Birden fazla domain kontrolü"""
        results = []
        for domain in domains:
            result = self.check_single_domain(domain, provider, porkbun_api_key, porkbun_secret_key)
            results.append(result)
            time.sleep(0.1)  # Rate limiting
        return results
    
    def generate_domain_variations(self, base_name, extensions):
        """Domain varyasyonları oluştur"""
        domains = []
        for ext in extensions:
            domains.append(f"{base_name}.{ext}")
        return domains

# Global domain checker instance
domain_checker = DomainChecker()

@app.route('/')
def index():
    """Ana sayfa"""
    return render_template('index.html')

@app.route('/wishlist')
def wishlist():
    """İstek listesi sayfası"""
    return render_template('wishlist.html')

@app.route('/api/check-domain', methods=['POST'])
def check_domain():
    """Tek domain kontrolü API"""
    data = request.get_json()
    domain = data.get('domain', '').strip()
    provider = data.get('provider', 'whois')
    porkbun_api_key = data.get('porkbunApiKey')
    porkbun_secret_key = data.get('porkbunSecretKey')
    
    if not domain:
        return jsonify({'error': 'Domain adı gerekli'}), 400
    
    result = domain_checker.check_single_domain(domain, provider, porkbun_api_key, porkbun_secret_key)
    return jsonify(result)

@app.route('/api/check-multiple', methods=['POST'])
def check_multiple():
    """Çoklu domain kontrolü API"""
    data = request.get_json()
    domains = data.get('domains', [])
    provider = data.get('provider', 'whois')
    porkbun_api_key = data.get('porkbunApiKey')
    porkbun_secret_key = data.get('porkbunSecretKey')
    
    if not domains:
        return jsonify({'error': 'En az bir domain gerekli'}), 400
    
    # Boş domainleri filtrele
    domains = [d.strip() for d in domains if d.strip()]
    
    results = domain_checker.check_multiple_domains(domains, provider, porkbun_api_key, porkbun_secret_key)
    return jsonify({'results': results})

@app.route('/api/check-variations', methods=['POST'])
def check_variations():
    """Domain varyasyonları kontrolü API"""
    data = request.get_json()
    base_name = data.get('baseName', '').strip()
    extensions = data.get('extensions', [])
    provider = data.get('provider', 'whois')
    porkbun_api_key = data.get('porkbunApiKey')
    porkbun_secret_key = data.get('porkbunSecretKey')
    
    if not base_name or not extensions:
        return jsonify({'error': 'Domain adı ve uzantılar gerekli'}), 400
    
    domains = domain_checker.generate_domain_variations(base_name, extensions)
    results = domain_checker.check_multiple_domains(domains, provider, porkbun_api_key, porkbun_secret_key)
    return jsonify({'results': results})

@app.route('/api/test-porkbun', methods=['POST'])
def test_porkbun():
    """Porkbun API bağlantı testi"""
    data = request.get_json()
    api_key = data.get('apiKey')
    secret_key = data.get('secretKey')
    
    if not api_key or not secret_key:
        return jsonify({'error': 'API Key ve Secret Key gerekli'}), 400
    
    try:
        # Headers ekleyelim ve daha detaylı hata yakalama yapalım
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Domain-Checker/1.0'
        }
        
        response = requests.post('https://api.porkbun.com/api/json/v3/ping', 
                               json={
                                   'apikey': api_key,
                                   'secretapikey': secret_key
                               }, 
                               headers=headers,
                               timeout=10)
        
        # HTTP status kontrolü
        if response.status_code != 200:
            return jsonify({
                'success': False, 
                'message': f'HTTP Hatası: {response.status_code} - {response.reason}'
            })
        
        # Content-Type kontrolü
        content_type = response.headers.get('Content-Type', '')
        if 'application/json' not in content_type:
            return jsonify({
                'success': False, 
                'message': f'Geçersiz yanıt formatı. Beklenen: JSON, Gelen: {content_type}'
            })
        
        # JSON parse etmeye çalış
        try:
            data = response.json()
        except ValueError as json_error:
            return jsonify({
                'success': False, 
                'message': f'JSON parse hatası: {str(json_error)}. Yanıt: {response.text[:200]}'
            })
        
        if data.get('status') == 'SUCCESS':
            return jsonify({'success': True, 'message': 'Porkbun bağlantısı başarılı!'})
        else:
            return jsonify({'success': False, 'message': data.get('message', 'Bilinmeyen hata')})
            
    except requests.exceptions.Timeout:
        return jsonify({'success': False, 'message': 'Bağlantı zaman aşımına uğradı'})
    except requests.exceptions.ConnectionError:
        return jsonify({'success': False, 'message': 'İnternet bağlantısı hatası'})
    except requests.exceptions.RequestException as e:
        return jsonify({'success': False, 'message': f'İstek hatası: {str(e)}'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Beklenmeyen hata: {str(e)}'})

@app.route('/api/debug-porkbun', methods=['POST'])
def debug_porkbun():
    """Porkbun API debug endpoint"""
    data = request.get_json()
    domain = data.get('domain', 'example.com')
    api_key = data.get('apiKey')
    secret_key = data.get('secretKey')
    
    if not api_key or not secret_key:
        return jsonify({'error': 'API Key ve Secret Key gerekli'}), 400
    
    try:
        url = f'https://api.porkbun.com/api/json/v3/domain/checkDomain/{domain}'
        payload = {
            'apikey': api_key,
            'secretapikey': secret_key
        }
        
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Domain-Checker/1.0'
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        return jsonify({
            'url': url,
            'payload': {'apikey': '***', 'secretapikey': '***'},
            'status_code': response.status_code,
            'headers': dict(response.headers),
            'response': response.json() if response.headers.get('Content-Type', '').startswith('application/json') else response.text
        })
        
    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 