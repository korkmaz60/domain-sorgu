from flask import Flask, render_template, request, jsonify
import socket
import whois
from datetime import datetime
import threading
import time

app = Flask(__name__)

class DomainChecker:
    """Domain kontrol işlemlerini yöneten sınıf - SOLID prensiplerine uygun"""
    
    def __init__(self):
        self.results = []
    
    def check_single_domain(self, domain):
        """Tek domain kontrolü"""
        try:
            domain_info = whois.whois(domain)
            
            if domain_info.domain_name:
                return {
                    'domain': domain,
                    'available': False,
                    'status': 'Kayıtlı',
                    'creation_date': str(domain_info.creation_date) if domain_info.creation_date else 'Bilinmiyor',
                    'expiration_date': str(domain_info.expiration_date) if domain_info.expiration_date else 'Bilinmiyor',
                    'registrar': domain_info.registrar or 'Bilinmiyor'
                }
            else:
                return {
                    'domain': domain,
                    'available': True,
                    'status': 'Müsait',
                    'creation_date': '-',
                    'expiration_date': '-',
                    'registrar': '-'
                }
                
        except Exception as e:
            return {
                'domain': domain,
                'available': None,
                'status': 'Kontrol Edilemedi',
                'creation_date': '-',
                'expiration_date': '-',
                'registrar': '-',
                'error': str(e)
            }
    
    def check_multiple_domains(self, domains):
        """Birden fazla domain kontrolü"""
        results = []
        for domain in domains:
            result = self.check_single_domain(domain)
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

@app.route('/api/check-domain', methods=['POST'])
def check_domain():
    """Tek domain kontrolü API"""
    data = request.get_json()
    domain = data.get('domain', '').strip()
    
    if not domain:
        return jsonify({'error': 'Domain adı gerekli'}), 400
    
    result = domain_checker.check_single_domain(domain)
    return jsonify(result)

@app.route('/api/check-multiple', methods=['POST'])
def check_multiple():
    """Çoklu domain kontrolü API"""
    data = request.get_json()
    domains = data.get('domains', [])
    
    if not domains:
        return jsonify({'error': 'En az bir domain gerekli'}), 400
    
    # Boş domainleri filtrele
    domains = [d.strip() for d in domains if d.strip()]
    
    results = domain_checker.check_multiple_domains(domains)
    return jsonify({'results': results})

@app.route('/api/check-variations', methods=['POST'])
def check_variations():
    """Domain varyasyonları kontrolü API"""
    data = request.get_json()
    base_name = data.get('baseName', '').strip()
    extensions = data.get('extensions', [])
    
    if not base_name or not extensions:
        return jsonify({'error': 'Domain adı ve uzantılar gerekli'}), 400
    
    domains = domain_checker.generate_domain_variations(base_name, extensions)
    results = domain_checker.check_multiple_domains(domains)
    return jsonify({'results': results})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 