"""
Builds destinations.csv and time_series_demand.csv from real sources, replacing the generated ones.

  Places      Wikidata: every Sri Lankan item with coordinates, a Commons photo and an English
              Wikipedia article, filtered to tourist-relevant types (temples, stupas, forts, ruins,
              museums, waterfalls, national parks, mountains, lakes, beaches, botanical gardens...)
              plus a short list of famous places Wikidata files as towns (Sigiriya, Mirissa...).
  Province    Wikidata administrative hierarchy (P131), nearest classified place as fallback.
  Photo       Wikidata P18 (Wikimedia Commons), as a 960 px thumbnail.
  Description Wikipedia page summary.
  Rating      Google Places (rating and number of reviews), with the app's Maps key.
  Popularity  Wikipedia page views over the last 12 months plus Google review count.
  Demand      Daily Wikipedia page views 2023-2025: a real, seasonal proxy for visitor interest,
              used to train the crowd forecast.
  Eco         The five eco indicators are estimated by fixed rules from the real attributes above
              (category, popularity, distance from Colombo, coast) - see eco_indicators(); the eco
              score formula is unchanged.

Every response is cached in real_sources/ so the build can be repeated offline.
Usage:  python build_real_destinations.py
"""
import csv
import datetime
import hashlib
import json
import math
import os
import re
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, 'real_sources')
ROOT = os.path.dirname(HERE)
UA = 'CEYLO/1.0 (university final-year project; stephankestroy@gmail.com)'
os.makedirs(CACHE, exist_ok=True)


def maps_key():
    with open(os.path.join(ROOT, 'mobile', '.env'), encoding='utf-8') as f:
        for line in f:
            if line.startswith('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY='):
                return line.split('=', 1)[1].strip().strip('"')
    return None


def fetch_json(url, cache_name, headers=None, retries=4):
    path = os.path.join(CACHE, cache_name)
    if os.path.exists(path):
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, **(headers or {})})
            with urllib.request.urlopen(req, timeout=120) as r:
                data = json.loads(r.read().decode('utf-8'))
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f)
            return data
        except urllib.error.HTTPError as e:
            if e.code == 404:
                with open(path, 'w', encoding='utf-8') as f:
                    json.dump(None, f)
                return None
            time.sleep(2 * (attempt + 1))
        except Exception:
            time.sleep(2 * (attempt + 1))
    return None


def sparql(query, name):
    url = 'https://query.wikidata.org/sparql?' + urllib.parse.urlencode({'query': query, 'format': 'json'})
    return fetch_json(url, name, {'Accept': 'application/sparql-results+json'})


# ------------------------------------------------------------------ 1. places from Wikidata
PLACES_QUERY = """
SELECT ?item ?itemLabel ?coord ?image ?article ?typeLabel WHERE {
  ?item wdt:P17 wd:Q854; wdt:P625 ?coord; wdt:P18 ?image; wdt:P31 ?type.
  ?article schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}"""

TYPE_CATEGORY = {
    'waterfall': 'Waterfall',
    'national park': 'Wildlife', 'protected area': 'Wildlife', 'zoo': 'Wildlife', 'orphanage': 'Wildlife',
    'biosphere reserve': 'Wildlife', 'nature reserve': 'Wildlife', 'wildlife sanctuary': 'Wildlife',
    'bird sanctuary': 'Wildlife', 'marine protected area': 'Wildlife', 'forest reserve': 'Wildlife',
    'mountain': 'Nature & Viewpoint', 'mountain range': 'Nature & Viewpoint',
    'non-geologically related mountain range': 'Nature & Viewpoint', 'botanical garden': 'Nature & Viewpoint',
    'park': 'Nature & Viewpoint', 'lake': 'Nature & Viewpoint', 'reservoir': 'Nature & Viewpoint',
    'lagoon': 'Nature & Viewpoint', 'cave': 'Nature & Viewpoint',
    'hill': 'Nature & Viewpoint', 'plateau': 'Nature & Viewpoint', 'rock formation': 'Nature & Viewpoint',
    'beach': 'Beach', 'bay': 'Beach', 'island': 'Beach',
    'Buddhist temple': 'Heritage & Culture', 'temple': 'Heritage & Culture', 'Hindu temple': 'Heritage & Culture',
    'stupa': 'Heritage & Culture', 'vihāra': 'Heritage & Culture', 'fort': 'Heritage & Culture',
    'citadel': 'Heritage & Culture', 'archaeological site': 'Heritage & Culture', 'museum': 'Heritage & Culture',
    'national museum': 'Heritage & Culture', 'art museum': 'Heritage & Culture', 'cathedral': 'Heritage & Culture',
    'mosque': 'Heritage & Culture', 'colossal statue': 'Heritage & Culture', 'rock relief': 'Heritage & Culture',
    'lighthouse': 'Heritage & Culture', 'remarkable tree': 'Heritage & Culture', 'palace': 'Heritage & Culture',
    'ruins': 'Heritage & Culture', 'monastery': 'Heritage & Culture', 'Buddhist monastery': 'Heritage & Culture',
    'railway bridge': 'Heritage & Culture', 'tower': 'Heritage & Culture', 'clock tower': 'Heritage & Culture',
    'World Heritage Site': 'Heritage & Culture', 'ancient city': 'Heritage & Culture', 'statue': 'Heritage & Culture',
    'kovil': 'Heritage & Culture', 'devalaya': 'Heritage & Culture', 'shrine': 'Heritage & Culture',
}
# Famous places Wikidata types as towns: (Wikidata label, category, display name)
ALLOWLIST = {
    'Sigiriya': ('Heritage & Culture', 'Sigiriya Rock Fortress'),
    'Polonnaruwa': ('Heritage & Culture', 'Ancient City of Polonnaruwa'),
    'Anuradhapura': ('Heritage & Culture', 'Sacred City of Anuradhapura'),
    'Ella': ('Nature & Viewpoint', 'Ella'),
    'Kitulgala': ('Nature & Viewpoint', 'Kitulgala'),
    'Haputale': ('Nature & Viewpoint', 'Haputale'),
    'Nuwara Eliya': ('Nature & Viewpoint', 'Nuwara Eliya'),
    'Mirissa': ('Beach', 'Mirissa Beach'), 'Unawatuna': ('Beach', 'Unawatuna Beach'),
    'Hikkaduwa': ('Beach', 'Hikkaduwa Beach'), 'Arugam': ('Beach', 'Arugam Bay'),
    'Bentota': ('Beach', 'Bentota Beach'), 'Pasikudah': ('Beach', 'Pasikudah Beach'),
    'Weligama': ('Beach', 'Weligama Bay'), 'Tangalle': ('Beach', 'Tangalle Beach'),
    'Nilaveli': ('Beach', 'Nilaveli Beach'), 'Koggala': ('Beach', 'Koggala Beach'),
    'Kalpitiya': ('Beach', 'Kalpitiya Beach'), 'Uppuveli': ('Beach', 'Uppuveli Beach'),
    'Beruwala': ('Beach', 'Beruwala Beach'), 'Kalkudah': ('Beach', 'Kalkudah Beach'),
    'Induruwa': ('Beach', 'Induruwa Beach'), 'Ahungalla': ('Beach', 'Ahungalla Beach'),
    'Dikwella': ('Beach', 'Dikwella Beach'), 'Ahangama': ('Beach', 'Ahangama Beach'),
    'Negombo': ('Beach', 'Negombo Beach'), 'Marawila': ('Beach', 'Marawila Beach'),
}
SKIP_NAME = re.compile(r'(?<![A-Za-z])(school|college|university|station|hospital|airport|stadium|cemetery|hotel|dam|'
                       r'power station|post office|diocese|battle|district|province|secretariat|bank|church of)(?![A-Za-z])', re.I)
# Types that mean 'not a destination' even when another type matches (towns, hotels, buildings)
SKIP_TYPES = {'hotel', 'human settlement', 'town', 'city', 'suburb', 'neighborhood', 'village', 'big city', 'prison',
              'residential building', 'skyscraper', 'office building'}


def commons_thumb(image_url, width=960):
    name = urllib.parse.unquote(image_url.rsplit('/', 1)[-1]).replace(' ', '_')
    md5 = hashlib.md5(name.encode('utf-8')).hexdigest()
    quoted = urllib.parse.quote(name)
    if name.lower().endswith(('.svg', '.tif', '.tiff')):
        return None
    return f'https://upload.wikimedia.org/wikipedia/commons/thumb/{md5[0]}/{md5[:2]}/{quoted}/{width}px-{quoted}'


def load_places():
    data = sparql(PLACES_QUERY, 'wikidata_places.json')
    items = {}
    for row in data['results']['bindings']:
        qid = row['item']['value'].rsplit('/', 1)[-1]
        it = items.setdefault(qid, {'qid': qid, 'label': row['itemLabel']['value'], 'types': set(),
                                    'coord': row['coord']['value'], 'image': row['image']['value'],
                                    'article': row['article']['value']})
        it['types'].add(row['typeLabel']['value'])
    places = []
    for it in items.values():
        label = it['label']
        if re.fullmatch(r'Q\d+', label) or SKIP_NAME.search(label):
            continue
        category = None
        name = label
        if label in ALLOWLIST:
            category, name = ALLOWLIST[label]
        else:
            if it['types'] & SKIP_TYPES:
                continue
            cats = [TYPE_CATEGORY[t] for t in it['types'] if t in TYPE_CATEGORY]
            if not cats:
                continue
            # Prefer the most specific nature category over generic heritage typing
            for pref in ('Waterfall', 'Beach', 'Wildlife', 'Nature & Viewpoint', 'Heritage & Culture'):
                if pref in cats:
                    category = pref
                    break
        m = re.match(r'Point\(([-\d.]+) ([-\d.]+)\)', it['coord'])
        if not m:
            continue
        lon, lat = float(m.group(1)), float(m.group(2))
        if not (5.8 <= lat <= 9.9 and 79.5 <= lon <= 82.0):
            continue
        thumb = commons_thumb(it['image'])
        if not thumb:
            continue
        places.append({'qid': it['qid'], 'name': name, 'category': category, 'lat': lat, 'lon': lon,
                       'image': thumb, 'title': urllib.parse.unquote(it['article'].rsplit('/', 1)[-1])})
    # One entry per Wikipedia article
    seen, unique = set(), []
    for p in places:
        if p['title'] not in seen:
            seen.add(p['title'])
            unique.append(p)
    return unique


# ------------------------------------------------------------------ 2. province
PROVINCE_QUERY = """
SELECT ?item ?provLabel WHERE {
  VALUES ?item { %s }
  ?item wdt:P131+ ?prov. ?prov wdt:P31 wd:Q861559.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}"""


def add_provinces(places):
    values = ' '.join(f'wd:{p["qid"]}' for p in places)
    data = sparql(PROVINCE_QUERY % values, 'wikidata_provinces.json')
    prov = {}
    for row in (data or {}).get('results', {}).get('bindings', []):
        if row['provLabel']['value'] != 'North Eastern Province':   # merged province, split in 2006
            prov[row['item']['value'].rsplit('/', 1)[-1]] = row['provLabel']['value']
    for p in places:
        p['province'] = prov.get(p['qid'])
    known = [p for p in places if p['province']]
    for p in places:
        if not p['province']:
            nearest = min(known, key=lambda k: (k['lat'] - p['lat']) ** 2 + (k['lon'] - p['lon']) ** 2)
            p['province'] = nearest['province']
    for p in places:
        if not p['province'].endswith('Province'):
            p['province'] = p['province'] + ' Province'


# ------------------------------------------------------------------ 3. Wikipedia and Google
def pageviews(title, start, end, granularity):
    t = urllib.parse.quote(title.replace(' ', '_'), safe='')
    url = (f'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/'
           f'{t}/{granularity}/{start}/{end}')
    data = fetch_json(url, f'pv_{granularity}_{hashlib.md5(title.encode()).hexdigest()}.json')
    return (data or {}).get('items', [])


def summary(title):
    t = urllib.parse.quote(title.replace(' ', '_'), safe='')
    data = fetch_json(f'https://en.wikipedia.org/api/rest_v1/page/summary/{t}',
                      f'sum_{hashlib.md5(title.encode()).hexdigest()}.json')
    text = (data or {}).get('extract', '') or ''
    return re.sub(r'\s+', ' ', text).strip()


def google_rating(p, key):
    q = urllib.parse.urlencode({
        'input': f"{p['name']} Sri Lanka", 'inputtype': 'textquery',
        'fields': 'name,rating,user_ratings_total,geometry',
        'locationbias': f"circle:20000@{p['lat']},{p['lon']}", 'key': key,
    })
    data = fetch_json(f'https://maps.googleapis.com/maps/api/place/findplacefromtext/json?{q}',
                      f'gp_{p["qid"]}.json')
    cands = (data or {}).get('candidates') or []
    if not any(c.get('rating') for c in cands):
        # Second try with the Wikipedia title, which is often the name Google uses
        q2 = urllib.parse.urlencode({
            'input': p['title'].replace('_', ' '), 'inputtype': 'textquery',
            'fields': 'name,rating,user_ratings_total,geometry',
            'locationbias': f"circle:20000@{p['lat']},{p['lon']}", 'key': key,
        })
        data2 = fetch_json(f'https://maps.googleapis.com/maps/api/place/findplacefromtext/json?{q2}', f'gp2_{p["qid"]}.json')
        cands = (data2 or {}).get('candidates') or []
    for c in cands:
        loc = c.get('geometry', {}).get('location', {})
        # Only trust a match within ~15 km of the Wikidata coordinate
        if loc and haversine(p['lat'], p['lon'], loc['lat'], loc['lng']) <= 15 and c.get('rating'):
            return c['rating'], c.get('user_ratings_total', 0)
    return None, 0


def haversine(a_lat, a_lon, b_lat, b_lon):
    r = 6371
    d_lat, d_lon = math.radians(b_lat - a_lat), math.radians(b_lon - a_lon)
    h = math.sin(d_lat / 2) ** 2 + math.cos(math.radians(a_lat)) * math.cos(math.radians(b_lat)) * math.sin(d_lon / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


# ------------------------------------------------------------------ 4. eco indicators (rules)
COLOMBO = (6.9271, 79.8612)


def eco_indicators(p, pop_pct):
    """Transparent rules from real attributes; pop_pct is 0 (least visited) .. 1 (most visited)."""
    km = haversine(COLOMBO[0], COLOMBO[1], p['lat'], p['lon'])
    cat = p['category']
    carbon = round(5 + min(km, 400) / 400 * 45 + (5 if cat == 'Wildlife' else 0))                 # travel to reach it
    wildlife_base = {'Wildlife': 18, 'Waterfall': 10, 'Nature & Viewpoint': 8, 'Beach': 8, 'Heritage & Culture': 2}[cat]
    wildlife = round(wildlife_base + pop_pct * {'Wildlife': 22, 'Waterfall': 12, 'Nature & Viewpoint': 10,
                                                 'Beach': 10, 'Heritage & Culture': 6}[cat])        # visitor pressure
    plastic_base = {'Beach': 40, 'Waterfall': 25, 'Nature & Viewpoint': 18, 'Heritage & Culture': 15, 'Wildlife': 10}[cat]
    plastic = round(plastic_base + pop_pct * 40)                                                   # crowds leave litter
    community = round(85 - pop_pct * 45)                                                           # spend stays local at quieter places
    carrying = pop_pct < 0.9                                                                       # top 10% are over capacity
    eco = ((100 - carbon) * 0.25 + (100 - wildlife) * 0.20 + (100 - plastic) * 0.15 + community * 0.20
           + (100 if carrying else 0) * 0.10 + 10)
    return {
        'carbon_footprint_index': carbon, 'wildlife_disturbance_risk': wildlife, 'plastic_pollution_risk': plastic,
        'community_benefit_score': community, 'carrying_capacity_adherence': carrying,
        'eco_score': min(100, max(0, round(eco, 1))),
    }


def seasonal(p):
    if p['category'] != 'Beach':
        return 'Year-Round'
    if p['lon'] >= 81.0 and p['lat'] >= 6.5:
        return 'May-Oct'          # east coast: south-west monsoon is its dry season
    if p['lat'] >= 8.7:
        return 'Year-Round'       # far north
    return 'Nov-April'            # west and south coasts


# ------------------------------------------------------------------ build
def main():
    key = maps_key()
    places = load_places()
    print(f'{len(places)} tourist places from Wikidata')
    add_provinces(places)

    today = datetime.date.today()
    year_ago = today - datetime.timedelta(days=365)
    start12, end12 = year_ago.strftime('%Y%m01'), today.strftime('%Y%m01')

    def enrich(p):
        p['views12'] = sum(i['views'] for i in pageviews(p['title'], start12, end12, 'monthly'))
        p['description'] = summary(p['title'])
        p['rating'], p['reviews'] = google_rating(p, key) if key else (None, 0)
        return p

    with ThreadPoolExecutor(max_workers=6) as pool:
        places = list(pool.map(enrich, places))

    # Drop places nobody looks up: fewer than 600 Wikipedia views a year and no Google reviews
    places = [p for p in places if p['views12'] >= 600 or p['reviews'] >= 50]
    for p in places:
        p['popularity'] = math.log1p(p['views12']) + 1.2 * math.log1p(p['reviews'])
    places.sort(key=lambda p: -p['popularity'])
    n = len(places)
    print(f'{n} places kept after the popularity filter')

    rows, demand = [], []
    for rank, p in enumerate(places, start=1):
        pop_pct = 1 - (rank - 1) / max(1, n - 1)
        did = f'DEST_{rank:04d}'
        eco = eco_indicators(p, pop_pct)
        rows.append({
            'destination_id': did, 'name': p['name'], 'category': p['category'], 'province': p['province'],
            'lat': round(p['lat'], 6), 'lon': round(p['lon'], 6),
            'hidden_gem': rank > n * 0.65,                       # the least-visited third
            'avg_rating': p['rating'] if p['rating'] else '',
            'popularity_rank': rank, 'seasonal_availability': seasonal(p), **eco,
            'image': p['image'], 'description': p['description'][:600],
            'google_reviews': p['reviews'], 'wikipedia_views_12m': p['views12'], 'wikidata': p['qid'],
        })

    # Daily Wikipedia views 2023-2025 as the demand series for the crowd forecast
    def daily(row_place):
        row, p = row_place
        items = pageviews(p['title'], '20230101', '20251231', 'daily')
        by_day = {i['timestamp'][:8]: i['views'] for i in items}
        out = []
        d = datetime.date(2023, 1, 1)
        while d <= datetime.date(2025, 12, 31):
            out.append({'destination_id': row['destination_id'], 'date': d.isoformat(),
                        'bookings_count': by_day.get(d.strftime('%Y%m%d'), 0)})
            d += datetime.timedelta(days=1)
        return out

    with ThreadPoolExecutor(max_workers=6) as pool:
        for series in pool.map(daily, zip(rows, places)):
            demand.extend(series)

    fields = list(rows[0].keys())
    with open(os.path.join(HERE, 'destinations.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)
    with open(os.path.join(HERE, 'time_series_demand.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=['destination_id', 'date', 'bookings_count'])
        w.writeheader()
        w.writerows(demand)

    cats = {}
    for r in rows:
        cats[r['category']] = cats.get(r['category'], 0) + 1
    rated = sum(1 for r in rows if r['avg_rating'] != '')
    print(f'destinations.csv: {len(rows)} places {cats}; Google rating for {rated}; hidden gems {sum(r["hidden_gem"] for r in rows)}')
    print(f'time_series_demand.csv: {len(demand)} daily rows')


if __name__ == '__main__':
    main()
