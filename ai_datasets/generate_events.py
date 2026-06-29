import csv
import random

# Core real-world recurring events in Sri Lanka
EVENTS_DATA = [
    {"name": "Kandy Esala Perahera", "location": "Kandy, Central Province", "category": "Cultural & Religious", "month": "August", "impact_on_demand": "High", "eco_impact_score": 60},
    {"name": "Galle Literary Festival", "location": "Galle, Southern Province", "category": "Arts & Literature", "month": "January", "impact_on_demand": "Medium", "eco_impact_score": 85},
    {"name": "Sinhala & Tamil New Year", "location": "Islandwide", "category": "Cultural", "month": "April", "impact_on_demand": "Very High", "eco_impact_score": 70},
    {"name": "Vesak Festival", "location": "Colombo, Western Province", "category": "Religious", "month": "May", "impact_on_demand": "High", "eco_impact_score": 65},
    {"name": "Nallur Festival", "location": "Jaffna, Northern Province", "category": "Religious", "month": "August", "impact_on_demand": "Medium", "eco_impact_score": 75},
    {"name": "Navam Perahera", "location": "Colombo, Western Province", "category": "Cultural", "month": "February", "impact_on_demand": "Medium", "eco_impact_score": 65},
    {"name": "Kataragama Esala Festival", "location": "Kataragama, Uva Province", "category": "Religious", "month": "July", "impact_on_demand": "High", "eco_impact_score": 50},
    {"name": "Poson Poya", "location": "Anuradhapura, North Central Province", "category": "Religious", "month": "June", "impact_on_demand": "High", "eco_impact_score": 55},
    {"name": "Hikkaduwa Beach Fest", "location": "Hikkaduwa, Southern Province", "category": "Entertainment", "month": "July", "impact_on_demand": "Medium", "eco_impact_score": 40},
    {"name": "Deepavali", "location": "Islandwide (esp. Northern & Eastern)", "category": "Cultural & Religious", "month": "November", "impact_on_demand": "Medium", "eco_impact_score": 70},
    {"name": "Christmas", "location": "Negombo & Colombo, Western Province", "category": "Cultural & Religious", "month": "December", "impact_on_demand": "High", "eco_impact_score": 65},
    {"name": "Thai Pongal", "location": "Northern & Eastern Province", "category": "Cultural", "month": "January", "impact_on_demand": "Medium", "eco_impact_score": 80},
    {"name": "Arugam Bay Surfing Championship", "location": "Arugam Bay, Eastern Province", "category": "Sports", "month": "September", "impact_on_demand": "High", "eco_impact_score": 75},
    {"name": "Colombo Fashion Week", "location": "Colombo, Western Province", "category": "Arts", "month": "March", "impact_on_demand": "Low", "eco_impact_score": 80},
    {"name": "Madhu Church Festival", "location": "Mannar, Northern Province", "category": "Religious", "month": "August", "impact_on_demand": "High", "eco_impact_score": 60}
]

def generate_events_dataset():
    events = []
    
    for i, base_event in enumerate(EVENTS_DATA):
        event = {
            'event_id': f"EVT_{str(i+1).zfill(3)}",
            'name': base_event['name'],
            'location': base_event['location'],
            'category': base_event['category'],
            'occurrence_month': base_event['month'],
            'impact_on_demand': base_event['impact_on_demand'],
            'eco_impact_score': base_event['eco_impact_score'],
            # Adding synthetic features for AI modeling
            'expected_attendance': random.randint(5000, 100000) if base_event['impact_on_demand'] in ['High', 'Very High'] else random.randint(1000, 15000),
            'recommended_for_tourists': random.choice([True, True, False])
        }
        events.append(event)
        
    print(f"Generated {len(events)} major Sri Lankan events/festivals.")
    
    with open('events.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=events[0].keys())
        writer.writeheader()
        writer.writerows(events)
        
    print("Saved events.csv")

if __name__ == "__main__":
    generate_events_dataset()
