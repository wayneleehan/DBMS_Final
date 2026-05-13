import requests
from bs4 import BeautifulSoup
import whois
from datetime import datetime

def simple_scrape_content(url: str):
    try:
        response = requests.get(url, timeout=5, headers={"User-Agent": "TPET-Bot/1.0"})
        soup = BeautifulSoup(response.text, 'html.parser')
 
        title = soup.title.string if soup.title else ""
        headers = " ".join([h.get_text() for h in soup.find_all(['h1', 'h2'])])
        
        return f"{title} {headers}".strip()
    except Exception as e:
        print(f"Scraping failed for {url}: {e}")
        return ""
    
def get_domain_age_days(url: str):
    try:
        domain_name = url.split("//")[-1].split("/")[0]
        w = whois.whois(domain_name)

        creation_date = w.creation_date
        if isinstance(creation_date, list):
            creation_date = creation_date[0]
            
        if creation_date:
            age_days = (datetime.now() - creation_date).days
            return age_days
        return None
    except:
        return None