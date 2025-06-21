# Domain müsaitlik kontrolü için Python kodu

import socket
import whois
from datetime import datetime

def check_domain_availability(domain):
    """
    Domain müsaitliğini kontrol eder
    """
    try:
        # WHOIS sorgusu
        domain_info = whois.whois(domain)
        
        if domain_info.domain_name:
            print(f"❌ {domain} - KAYITLI")
            print(f"   Kayıt tarihi: {domain_info.creation_date}")
            print(f"   Son kullanma: {domain_info.expiration_date}")
            print(f"   Kayıt şirketi: {domain_info.registrar}")
            return False
        else:
            print(f"✅ {domain} - MÜSAİT")
            return True
            
    except Exception as e:
        print(f"⚠️  {domain} - MÜSAİT OLABİLİR (Kontrol edilemedi)")
        return None

def check_multiple_domains(base_name, extensions):
    """
    Birden fazla uzantıyı kontrol eder
    """
    results = {}
    
    print(f"\n🔍 '{base_name}' için domain kontrol sonuçları:\n")
    print("-" * 50)
    
    for ext in extensions:
        domain = f"{base_name}.{ext}"
        results[domain] = check_domain_availability(domain)
        print()
    
    return results

def bulk_domain_check(domain_list):
    """
    Domain listesini toplu kontrol eder
    """
    available = []
    taken = []
    
    print("🔍 Toplu domain kontrolü başlıyor...\n")
    
    for domain in domain_list:
        result = check_domain_availability(domain)
        if result is True:
            available.append(domain)
        elif result is False:
            taken.append(domain)
    
    print("\n📊 ÖZET:")
    print(f"✅ Müsait: {len(available)} domain")
    print(f"❌ Kayıtlı: {len(taken)} domain")
    
    if available:
        print("\n🟢 MÜSAİT DOMAINLER:")
        for domain in available:
            print(f"   • {domain}")
    
    return available, taken

# Kullanım örnekleri:

if __name__ == "__main__":
    # Gerekli kütüphane kurulumu:
    # pip install python-whois
    
    # Tek domain kontrolü
    print("=== TEK DOMAIN KONTROLÜ ===")
    check_domain_availability("noteforget.com")
    
    # Birden fazla uzantı kontrolü
    print("\n=== ÇOKLU UZANTI KONTROLÜ ===")
    extensions = ["com", "net", "org", "io", "app", "co"]
    check_multiple_domains("noteforget", extensions)
    
    # Birden fazla isim kontrolü
    print("\n=== ÇOKLU İSİM KONTROLÜ ===")
    domain_names = [
        "noteforget.com",
        "noteflow.com", 
        "notesync.com",
        "notekeeper.com",
        "quicknote.com"
    ]
    
    available, taken = bulk_domain_check(domain_names)