import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
import pickle
import os

def train_eco_scorer():
    print("Loading destinations data...")
    try:
        df = pd.read_csv('../../ai_datasets/destinations.csv')
    except Exception as e:
        print(f"Error loading dataset: {e}")
        return

    # Features and Target
    features = [
        'carbon_footprint_index', 
        'wildlife_disturbance_risk', 
        'plastic_pollution_risk', 
        'community_benefit_score', 
        'carrying_capacity_adherence'
    ]
    
    # Ensure boolean is int
    df['carrying_capacity_adherence'] = df['carrying_capacity_adherence'].astype(int)
    
    X = df[features]
    y = df['eco_score']

    # Train Test Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("Training Random Forest Regressor...")
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # Predictions
    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print(f"Model Evaluation - MSE: {mse:.2f}, R2 Score: {r2:.2f}")

    # Export Model
    model_path = '../eco_scorer_model.pkl'
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
        
    print(f"Eco Score Model exported successfully to {model_path}")

if __name__ == "__main__":
    train_eco_scorer()
