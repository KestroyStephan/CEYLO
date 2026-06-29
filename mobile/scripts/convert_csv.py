import csv
import json
import random

# Beautiful Unsplash nature/Sri Lanka images for UI Mockups
IMAGE_URLS = [
    'https://images.unsplash.com/photo-1589923188900-85dae523342b', # Sigiriya
    'https://images.unsplash.com/photo-1544735716-392fe2489ffa', # Tea Country
    'https://images.unsplash.com/photo-1563290231-155097486e9b', # Waterfall
    'https://images.unsplash.com/photo-1580193813605-a5c78b4ee01a', # Pidurangala
    'https://images.unsplash.com/photo-1577717903315-1691ae25ab3f', # Beach
    'https://images.unsplash.com/photo-1546522304-469b81e8eb95', # Elephants
    'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a', # Train Nine Arch
    'https://images.unsplash.com/photo-1574510007802-9a3d46328bc6', # Galle Fort
    'https://images.unsplash.com/photo-1596700049405-0210f97be9b2', # Temple
]

def convert_destinations():
    destinations = []
    with open('../../ai_datasets/destinations.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Assign random beautiful image
            row['image'] = random.choice(IMAGE_URLS)
            
            # Type casting
            row['eco_score'] = float(row['eco_score']) if row['eco_score'] else 50.0
            row['hidden_gem'] = row['hidden_gem'] == 'True'
            destinations.append(row)
            
    with open('../assets/data/ai_destinations.json', 'w', encoding='utf-8') as f:
        json.dump(destinations, f, indent=2)
    print(f"Exported {len(destinations)} destinations to ai_destinations.json")

def convert_events():
    events = []
    with open('../../ai_datasets/events.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            events.append(row)
            
    with open('../assets/data/ai_events.json', 'w', encoding='utf-8') as f:
        json.dump(events, f, indent=2)
    print(f"Exported {len(events)} events to ai_events.json")

if __name__ == "__main__":
    convert_destinations()
    convert_events()
