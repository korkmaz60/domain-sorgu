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
    
    def check_single_domain(self, domain, provider='whois', godaddy_api_key=None, godaddy_secret_key=None):
        """Tek domain kontrolü - WHOIS veya GoDaddy API ile"""
        if provider == 'godaddy' and godaddy_api_key and godaddy_secret_key:
            return self._check_domain_godaddy(domain, godaddy_api_key, godaddy_secret_key)
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
    
    def _check_domain_godaddy(self, domain, api_key, secret_key):
        """GoDaddy API ile domain kontrolü"""
        try:
            # GoDaddy OTE domain availability API'si (Test ortamı)
            url = f'https://api.ote-godaddy.com/v1/domains/available'
            print(f"🌐 GoDaddy API URL: {url}")
            
            # Header'da authentication
            headers = {
                'Authorization': f'sso-key {api_key}:{secret_key}',
                'Content-Type': 'application/json',
                'User-Agent': 'Domain-Checker/1.0',
                'Accept': 'application/json'
            }
            
            # Query parameter olarak domain
            params = {
                'domain': domain,
                'checkType': 'FAST',
                'forTransfer': False
            }
            
            print(f"📊 Request Headers: {headers}")
            print(f"🔍 Query Params: {params}")
            print(f"🔑 API Key Preview: {api_key[:10]}...{api_key[-4:]}")
            print(f"🔐 Secret Key Preview: {secret_key[:10]}...{secret_key[-4:]}")
            
            response = requests.get(url, headers=headers, params=params, timeout=15, verify=False)
            
            print(f"📡 HTTP Status: {response.status_code}")
            print(f"📋 Response Headers: {dict(response.headers)}")
            print(f"📄 Raw Response: {response.text[:500]}...")
            
            # HTTP status kontrolü
            if response.status_code == 401:
                return {
                    'domain': domain,
                    'available': None,
                    'status': 'Kontrol Edilemedi',
                    'creation_date': '-',
                    'expiration_date': '-',
                    'registrar': '-',
                    'provider': 'GoDaddy',
                    'error': 'API anahtarı geçersiz - 401 Unauthorized'
                }
            elif response.status_code == 429:
                return {
                    'domain': domain,
                    'available': None,
                    'status': 'Rate Limit',
                    'creation_date': '-',
                    'expiration_date': '-',
                    'registrar': '-',
                    'provider': 'GoDaddy',
                    'error': 'Rate limit aşıldı - 60 istek/dakika limiti',
                    'rate_limit': True,
                    'wait_seconds': 60,
                    'retry_after': 60
                }
            elif response.status_code == 400:
                # 400 Bad Request - Authentication sorunu veya invalid domain
                error_msg = f'HTTP 400: Geçersiz istek - API anahtarı veya domain formatı hatalı'
                try:
                    error_data = response.json()
                    if 'code' in error_data:
                        error_msg = f'HTTP 400: {error_data.get("code", "")} - {error_data.get("message", "")}'
                except:
                    pass
                
                return {
                    'domain': domain,
                    'available': None,
                    'status': 'Kontrol Edilemedi',
                    'creation_date': '-',
                    'expiration_date': '-',
                    'registrar': '-',
                    'provider': 'GoDaddy',
                    'error': error_msg
                }
            elif response.status_code != 200:
                return {
                    'domain': domain,
                    'available': None,
                    'status': 'Kontrol Edilemedi',
                    'creation_date': '-',
                    'expiration_date': '-',
                    'registrar': '-',
                    'provider': 'GoDaddy',
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
                    'provider': 'GoDaddy',
                    'error': 'Geçersiz JSON yanıtı'
                }
            
            print(f"🔍 GODADDY SUCCESS - Domain: {domain}")
            print(f"🎯 Response Data: {data}")
            
            # GoDaddy API'den gelen response yapısı
            is_available = data.get('available', False)
            price = data.get('price')  # Fiyat bilgisi varsa
            currency = data.get('currency', 'USD')
            period = data.get('period', 1)
            
            print(f"🏷️ Available: {is_available}, Price: {price} {currency}")
            
            if is_available:
                status = 'Müsait'
                if price:
                    status = f'Müsait ({price} {currency}/{period} yıl)'
            else:
                status = 'Kayıtlı'
            
            print(f"✅ Final Result: available={is_available}, status={status}")
            
            return {
                'domain': domain,
                'available': is_available,
                'status': status,
                'creation_date': '-',
                'expiration_date': '-',
                'registrar': 'GoDaddy' if not is_available else '-',
                'provider': 'GoDaddy',
                'price': f'{price} {currency}' if price else '-',
                'period': f'{period} yıl' if period else '-'
            }
                
        except requests.exceptions.Timeout:
            return {
                'domain': domain,
                'available': None,
                'status': 'Kontrol Edilemedi',
                'creation_date': '-',
                'expiration_date': '-',
                'registrar': '-',
                'provider': 'GoDaddy',
                'error': 'Zaman aşımı - API yanıt vermedi'
            }
        except requests.exceptions.ConnectionError:
            return {
                'domain': domain,
                'available': None,
                'status': 'Kontrol Edilemedi',
                'creation_date': '-',
                'expiration_date': '-',
                'registrar': '-',
                'provider': 'GoDaddy',
                'error': 'Bağlantı hatası'
            }
        except Exception as e:
            print(f"❌ GODADDY ERROR for {domain}: {str(e)}")
            return {
                'domain': domain,
                'available': None,
                'status': 'Kontrol Edilemedi',
                'creation_date': '-',
                'expiration_date': '-',
                'registrar': '-',
                'provider': 'GoDaddy',
                'error': str(e)
            }
    
    def check_multiple_domains(self, domains, provider='whois', godaddy_api_key=None, godaddy_secret_key=None):
        """Çoklu domain kontrolü - Thread pool ile paralel işlem"""
        results = []
        threads = []
        
        def check_single(domain):
            result = self.check_single_domain(domain, provider, godaddy_api_key, godaddy_secret_key)
            results.append(result)
        
        for domain in domains:
            thread = threading.Thread(target=check_single, args=(domain,))
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        return results
    
    def generate_domain_variations(self, base_name, extensions):
        """Domain varyasyonları oluştur"""
        variations = []
        for ext in extensions:
            domain = f"{base_name}.{ext.replace('.', '')}"
            variations.append(domain)
        return variations

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/wishlist')
def wishlist():
    return render_template('wishlist.html')

@app.route('/api/check-domain', methods=['POST'])
def check_domain():
    data = request.json
    domain = data.get('domain')
    provider = data.get('provider', 'whois')
    godaddy_api_key = data.get('godaddy_api_key')
    godaddy_secret_key = data.get('godaddy_secret_key')
    
    if not domain:
        return jsonify({'error': 'Domain adı gerekli'}), 400
    
    checker = DomainChecker()
    result = checker.check_single_domain(domain, provider, godaddy_api_key, godaddy_secret_key)
    
    return jsonify(result)

@app.route('/api/check-multiple', methods=['POST'])
def check_multiple():
    data = request.json
    domains = data.get('domains', [])
    provider = data.get('provider', 'whois')
    godaddy_api_key = data.get('godaddy_api_key')
    godaddy_secret_key = data.get('godaddy_secret_key')
    
    if not domains:
        return jsonify({'error': 'Domain listesi gerekli'}), 400
    
    checker = DomainChecker()
    results = checker.check_multiple_domains(domains, provider, godaddy_api_key, godaddy_secret_key)
    
    return jsonify(results)

@app.route('/api/check-variations', methods=['POST'])
def check_variations():
    data = request.json
    base_name = data.get('base_name')
    extensions = data.get('extensions', [])
    provider = data.get('provider', 'whois')
    godaddy_api_key = data.get('godaddy_api_key')
    godaddy_secret_key = data.get('godaddy_secret_key')
    
    if not base_name or not extensions:
        return jsonify({'error': 'Base name ve extension listesi gerekli'}), 400
    
    checker = DomainChecker()
    domains = checker.generate_domain_variations(base_name, extensions)
    results = checker.check_multiple_domains(domains, provider, godaddy_api_key, godaddy_secret_key)
    
    return jsonify(results)

@app.route('/api/test-godaddy', methods=['POST'])
def test_godaddy():
    """GoDaddy API bağlantısını test et"""
    data = request.json
    api_key = data.get('api_key')
    secret_key = data.get('secret_key')
    
    if not api_key or not secret_key:
        return jsonify({
            'success': False,
            'error': 'API Key ve Secret Key gerekli'
        }), 400
    
    try:
        # Test domain ile bağlantıyı kontrol et
        test_domain = 'test-example-domain-12345.com'
        
        url = f'https://api.ote-godaddy.com/v1/domains/available'
        headers = {
            'Authorization': f'sso-key {api_key}:{secret_key}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        params = {
            'domain': test_domain,
            'checkType': 'FAST'
        }
        
        print(f"🧪 TEST - API Key: {api_key[:10]}...{api_key[-4:]}")
        print(f"🧪 TEST - Secret Key: {secret_key[:10]}...{secret_key[-4:]}")
        print(f"🧪 TEST - URL: {url}")
        print(f"🧪 TEST - Headers: {headers}")
        
        response = requests.get(url, headers=headers, params=params, timeout=10)
        
        print(f"🧪 TEST - Response Status: {response.status_code}")
        print(f"🧪 TEST - Response: {response.text[:200]}")
        
        if response.status_code == 200:
            return jsonify({
                'success': True,
                'message': 'GoDaddy API bağlantısı başarılı!',
                'status_code': response.status_code
            })
        elif response.status_code == 401:
            return jsonify({
                'success': False,
                'error': 'API anahtarları geçersiz (401 Unauthorized)',
                'status_code': response.status_code
            })
        elif response.status_code == 429:
            return jsonify({
                'success': False,
                'error': 'Rate limit aşıldı (429 Too Many Requests)',
                'status_code': response.status_code
            })
        else:
            return jsonify({
                'success': False,
                'error': f'API hatası: HTTP {response.status_code}',
                'status_code': response.status_code,
                'response': response.text[:200]
            })
            
    except requests.exceptions.Timeout:
        return jsonify({
            'success': False,
            'error': 'Zaman aşımı - API yanıt vermedi'
        })
    except requests.exceptions.ConnectionError:
        return jsonify({
            'success': False,
            'error': 'Bağlantı hatası'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Beklenmeyen hata: {str(e)}'
        })

@app.route('/api/debug-godaddy', methods=['POST'])
def debug_godaddy():
    """GoDaddy API debug bilgileri"""
    data = request.json
    domain = data.get('domain', 'test.com')
    api_key = data.get('api_key')
    secret_key = data.get('secret_key')
    
    if not api_key or not secret_key:
        return jsonify({
            'error': 'API Key ve Secret Key gerekli'
        }), 400
    
    debug_info = {
        'domain': domain,
        'api_key_length': len(api_key) if api_key else 0,
        'secret_key_length': len(secret_key) if secret_key else 0,
        'api_key_preview': f"{api_key[:8]}..." if api_key and len(api_key) > 8 else api_key,
        'timestamp': datetime.now().isoformat()
    }
    
    try:
        # GoDaddy API call
        url = f'https://api.ote-godaddy.com/v1/domains/available'
        headers = {
            'Authorization': f'sso-key {api_key}:{secret_key}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Domain-Checker-Debug/1.0'
        }
        params = {
            'domain': domain,
            'checkType': 'FAST',
            'forTransfer': False
        }
        
        print(f"🐛 DEBUG - Making request to: {url}")
        print(f"🐛 DEBUG - Headers: {headers}")
        print(f"🐛 DEBUG - Params: {params}")
        
        response = requests.get(url, headers=headers, params=params, timeout=15)
        
        debug_info.update({
            'request_url': url,
            'request_headers': {k: v for k, v in headers.items() if k != 'Authorization'},
            'request_params': params,
            'response_status': response.status_code,
            'response_headers': dict(response.headers),
            'response_text': response.text[:1000],  # İlk 1000 karakter
            'response_success': response.status_code == 200
        })
        
        if response.status_code == 200:
            try:
                json_data = response.json()
                debug_info['response_json'] = json_data
            except ValueError:
                debug_info['json_parse_error'] = 'JSON parse edilemedi'
        
        print(f"🐛 DEBUG - Response Status: {response.status_code}")
        print(f"🐛 DEBUG - Response: {response.text[:500]}")
        
        return jsonify(debug_info)
        
    except Exception as e:
        debug_info.update({
            'error': str(e),
            'error_type': type(e).__name__
        })
        print(f"🐛 DEBUG - Exception: {e}")
        return jsonify(debug_info)

if __name__ == '__main__':
    app.run(debug=True, port=5000) 