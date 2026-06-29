import csv
import random
import math

# Real Sri Lankan regions and bases
REGIONS = {
    "Western Province": {"cities": ["Colombo", "Negombo", "Kalutara", "Mount Lavinia"], "lat_range": (6.5, 7.3), "lon_range": (79.8, 80.2)},
    "Central Province": {"cities": ["Kandy", "Nuwara Eliya", "Matale", "Hatton", "Ella"], "lat_range": (6.8, 7.5), "lon_range": (80.5, 80.9)},
    "Southern Province": {"cities": ["Galle", "Mirissa", "Matara", "Hikkaduwa", "Unawatuna", "Tangalle"], "lat_range": (5.9, 6.4), "lon_range": (80.0, 81.0)},
    "Northern Province": {"cities": ["Jaffna", "Mannar", "Vavuniya", "Mullaitivu"], "lat_range": (8.6, 9.8), "lon_range": (79.8, 80.6)},
    "Eastern Province": {"cities": ["Trincomalee", "Batticaloa", "Arugam Bay", "Nilaveli"], "lat_range": (6.9, 8.8), "lon_range": (81.1, 81.8)},
    "North Central Province": {"cities": ["Anuradhapura", "Polonnaruwa", "Habarana", "Sigiriya"], "lat_range": (7.8, 8.5), "lon_range": (80.0, 81.0)},
    "North Western Province": {"cities": ["Kurunegala", "Puttalam", "Kalpitiya"], "lat_range": (7.4, 8.1), "lon_range": (79.7, 80.4)},
    "Uva Province": {"cities": ["Badulla", "Monaragala", "Haputale", "Bandarawela"], "lat_range": (6.7, 7.1), "lon_range": (80.9, 81.5)},
    "Sabaragamuwa Province": {"cities": ["Ratnapura", "Kegalle", "Kitulgala"], "lat_range": (6.3, 7.1), "lon_range": (80.2, 80.6)},
}

ATTRACTION_TYPES = [
    ("Beach", ["Beach", "Cove", "Bay", "Sands"]),
    ("Waterfall", ["Falls", "Ella", "Cascade"]),
    ("Heritage & Culture", ["Temple", "Ruins", "Stupa", "Fortress", "Kovil", "Viharaya"]),
    ("Nature & Viewpoint", ["Rock", "Peak", "Viewpoint", "Gap", "Estate", "Sanctuary"]),
    ("Wildlife", ["National Park", "Safari", "Reserve", "Bird Sanctuary"])
]

def generate_destinations():
    print("Generating 250+ real-world inspired Sri Lankan destinations...")
    destinations = []
    
    # 20 iconic real-world places to ensure the dataset has the heavy hitters
    hardcoded = [
        ("Sigiriya Rock Fortress", "Heritage & Culture", "North Central Province", 7.9570, 80.7603, False, 1),
        ("Temple of the Sacred Tooth Relic", "Heritage & Culture", "Central Province", 7.2936, 80.6413, False, 2),
        ("Yala National Park", "Wildlife", "Southern Province", 6.3683, 81.5186, False, 3),
        ("Ella Rock", "Nature & Viewpoint", "Uva Province", 6.8600, 81.0470, False, 4),
        ("Nine Arches Bridge", "Heritage & Culture", "Uva Province", 6.8767, 81.0609, False, 5),
        ("Galle Fort", "Heritage & Culture", "Southern Province", 6.0286, 80.2168, False, 6),
        ("Mirissa Beach", "Beach", "Southern Province", 5.9483, 80.4578, False, 7),
        ("Pinnawala Elephant Orphanage", "Wildlife", "Sabaragamuwa Province", 7.2995, 80.3861, False, 8),
        ("Horton Plains National Park", "Nature & Viewpoint", "Central Province", 6.8028, 80.8066, False, 9),
        ("Arugam Bay", "Beach", "Eastern Province", 6.8436, 81.8267, False, 10),
        ("Dambulla Cave Temple", "Heritage & Culture", "North Central Province", 7.8566, 80.6485, False, 11),
        ("Udawalawe National Park", "Wildlife", "Sabaragamuwa Province", 6.4764, 80.8988, False, 12),
        ("Adam's Peak (Sri Pada)", "Nature & Viewpoint", "Sabaragamuwa Province", 6.8096, 80.4994, False, 13),
        ("Ruwanwelisaya", "Heritage & Culture", "North Central Province", 8.3503, 80.3965, False, 14),
        ("Bambarakanda Falls", "Waterfall", "Uva Province", 6.7724, 80.8291, False, 15),
        ("Trincomalee Koneswaram Temple", "Heritage & Culture", "Eastern Province", 8.5816, 81.2407, False, 16),
        ("Unawatuna Beach", "Beach", "Southern Province", 6.0116, 80.2458, False, 17),
        ("Minneriya National Park", "Wildlife", "North Central Province", 8.0336, 80.8354, False, 18),
        ("Pigeon Island National Park", "Nature & Viewpoint", "Eastern Province", 8.7183, 81.2001, False, 19),
        ("Jaffna Fort", "Heritage & Culture", "Northern Province", 9.6615, 80.0074, False, 20)
    ]
    
    dest_id_counter = 1
    
    for hc in hardcoded:
        destinations.append(create_destination_record(dest_id_counter, hc[0], hc[1], hc[2], hc[3], hc[4], hc[5], hc[6]))
        dest_id_counter += 1
        
    # Generate the rest
    while len(destinations) < 275:
        province, p_data = random.choice(list(REGIONS.items()))
        city = random.choice(p_data["cities"])
        cat, suffixes = random.choice(ATTRACTION_TYPES)
        
        # Build a realistic name
        if cat == "Beach":
            name = f"{city} {random.choice(suffixes)}"
        elif cat == "Waterfall":
            name = f"{city} {random.choice(suffixes)}"
        else:
            name = f"{city} {random.choice(['Grand', 'Secret', 'Royal', 'Ancient', 'Hidden', 'Central'])} {random.choice(suffixes)}"
            
        lat = random.uniform(*p_data["lat_range"])
        lon = random.uniform(*p_data["lon_range"])
        
        hidden = random.random() > 0.7 # 30% hidden gems
        pop_rank = random.randint(21, 300)
        
        # Don't add duplicates by name
        if any(d['name'] == name for d in destinations):
            continue
            
        destinations.append(create_destination_record(dest_id_counter, name, cat, province, lat, lon, hidden, pop_rank))
        dest_id_counter += 1

    print(f"Collected {len(destinations)} destinations with ML features.")

    with open('destinations.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=destinations[0].keys())
        writer.writeheader()
        writer.writerows(destinations)
    
    print("Saved destinations.csv")

def create_destination_record(did, name, category, province, lat, lon, hidden_gem, pop_rank):
    avg_rating = round(random.uniform(3.8, 4.9), 1)
    if pop_rank < 20:
        avg_rating = round(random.uniform(4.5, 5.0), 1)
        
    seasonal = "Year-Round"
    if category == "Beach" and province == "Southern Province":
        seasonal = "Nov-April"
    elif category == "Beach" and province == "Eastern Province":
        seasonal = "May-Oct"
        
    # ML Features for Eco Score
    carbon = random.randint(5, 60)
    wildlife = random.randint(0, 40) if category == "Wildlife" else random.randint(0, 20)
    plastic = random.randint(10, 80)
    community = random.randint(30, 90)
    carrying = random.choice([True, True, True, False])
    
    eco_score = (
        (100 - carbon) * 0.25 + 
        (100 - wildlife) * 0.20 + 
        (100 - plastic) * 0.15 + 
        (community) * 0.20 +
        (100 if carrying else 0) * 0.10 + 
        10
    )
    eco_score = min(100, max(0, round(eco_score, 1)))

    return {
        'destination_id': f"DEST_{str(did).zfill(4)}",
        'name': name,
        'category': category,
        'province': province,
        'lat': round(lat, 6),
        'lon': round(lon, 6),
        'hidden_gem': hidden_gem,
        'avg_rating': avg_rating,
        'popularity_rank': pop_rank,
        'seasonal_availability': seasonal,
        'carbon_footprint_index': carbon,
        'wildlife_disturbance_risk': wildlife,
        'plastic_pollution_risk': plastic,
        'community_benefit_score': community,
        'carrying_capacity_adherence': carrying,
        'eco_score': eco_score
    }

if __name__ == "__main__":
    generate_destinations()
