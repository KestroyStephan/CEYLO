import csv
import random
import datetime

# Helper to load generated destinations
def load_destinations():
    try:
        with open('destinations.csv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            return list(reader)
    except FileNotFoundError:
        print("Please run generate_destinations.py first.")
        return []

def generate_users(num_users=1000):
    users = []
    languages = ['English'] * 60 + ['Sinhala'] * 15 + ['Tamil'] * 5 + ['German'] * 5 + ['Chinese'] * 5 + ['French'] * 5 + ['Japanese'] * 5
    moods = ['Adventure', 'Relaxation', 'Culture', 'Nature', 'Nightlife', 'Wildlife']
    
    for i in range(num_users):
        user_id = f"USR_{str(i+1).zfill(5)}"
        lang = random.choice(languages)
        mood_profile = random.sample(moods, k=random.randint(1, 3))
        eco_pref = random.random() > 0.6 # 40% of users are eco-conscious
        avg_trip_duration = random.randint(3, 21) # 3 to 21 days
        budget_range = random.choice(['Budget', 'Mid-Range', 'Luxury', 'Mid-Range', 'Mid-Range'])
        
        users.append({
            'user_id': user_id,
            'language': lang,
            'mood_profile': "|".join(mood_profile),
            'eco_preference': eco_pref,
            'avg_trip_duration_days': avg_trip_duration,
            'budget_range': budget_range
        })
        
    print(f"Generated {len(users)} users.")
    with open('users.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=users[0].keys())
        writer.writeheader()
        writer.writerows(users)
    return users

def generate_interactions(users, destinations, num_interactions=10000):
    if not users or not destinations:
        return
        
    interactions = []
    event_types = ['viewed', 'viewed', 'viewed', 'bookmarked', 'bookmarked', 'booked']
    
    # Pre-calculate popular and eco destinations to bias the data
    high_eco_dests = [d for d in destinations if float(d['eco_score']) > 75]
    popular_dests = [d for d in destinations if int(d['popularity_rank']) < 50]
    
    for _ in range(num_interactions):
        user = random.choice(users)
        
        # Logic to bias interactions based on user preference
        if user['eco_preference'] and high_eco_dests and random.random() > 0.3:
            dest = random.choice(high_eco_dests)
        elif random.random() > 0.4 and popular_dests:
            dest = random.choice(popular_dests)
        else:
            dest = random.choice(destinations)
            
        event_type = random.choice(event_types)
        
        # Generate a random timestamp within the last year
        days_ago = random.randint(0, 365)
        timestamp = (datetime.datetime.now() - datetime.timedelta(days=days_ago)).strftime('%Y-%m-%dT%H:%M:%SZ')
        
        rating = ""
        if event_type == 'booked' and random.random() > 0.5:
            event_type = 'reviewed'
            # Give rating based on destination average rating roughly
            base_rating = float(dest['avg_rating'])
            rating = min(5, max(1, int(random.gauss(base_rating, 0.5))))
            
        interactions.append({
            'interaction_id': f"INT_{str(len(interactions)+1).zfill(6)}",
            'user_id': user['user_id'],
            'destination_id': dest['destination_id'],
            'event_type': event_type,
            'rating': rating,
            'timestamp': timestamp
        })

    print(f"Generated {len(interactions)} interactions.")
    with open('interactions.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=interactions[0].keys())
        writer.writeheader()
        writer.writerows(interactions)

def generate_time_series_bookings(destinations):
    if not destinations:
        return
        
    bookings = []
    start_date = datetime.date(2023, 1, 1)
    end_date = datetime.date(2025, 12, 31)
    delta = datetime.timedelta(days=1)
    
    print("Generating time series booking data...")
    
    for dest in destinations:
        current_date = start_date
        base_demand = 50 if int(dest['popularity_rank']) < 50 else random.randint(5, 20)
        
        while current_date <= end_date:
            month = current_date.month
            # Apply seasonality
            multiplier = 1.0
            if dest['province'] == 'Southern Province' and month in [12, 1, 2, 3]:
                multiplier = 2.5
            elif dest['province'] == 'Eastern Province' and month in [6, 7, 8]:
                multiplier = 2.0
            elif dest['category'] == 'Cultural' and month == 8: # Kandy Perahera season
                multiplier = 1.8
                
            daily_bookings = int(random.gauss(base_demand * multiplier, base_demand * 0.2))
            daily_bookings = max(0, daily_bookings)
            
            bookings.append({
                'destination_id': dest['destination_id'],
                'date': current_date.strftime('%Y-%m-%d'),
                'bookings_count': daily_bookings
            })
            
            current_date += delta
            
    print(f"Generated {len(bookings)} daily booking records.")
    with open('time_series_demand.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['destination_id', 'date', 'bookings_count'])
        writer.writeheader()
        writer.writerows(bookings)

if __name__ == "__main__":
    dests = load_destinations()
    if dests:
        users = generate_users(1000)
        generate_interactions(users, dests, 25000)
        generate_time_series_bookings(dests)
