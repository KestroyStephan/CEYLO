import pandas as pd
import numpy as np
import os

try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping
    from sklearn.preprocessing import MinMaxScaler
    from sklearn.metrics import mean_squared_error, mean_absolute_error
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False

def train_demand_forecast():
    if not TF_AVAILABLE:
        print("TensorFlow is not installed in this environment.")
        print("Please run this script in Google Colab, Vertex AI, or an environment with TensorFlow installed.")
        return

    # Determine base path for Colab vs Local
    IN_COLAB = os.path.exists('/content/drive')
    BASE = '/content/drive/MyDrive/CEYLO' if IN_COLAB else '../..'

    print("Loading time-series demand data...")
    try:
        df = pd.read_csv(f'{BASE}/ai_datasets/time_series_demand.csv')
    except Exception as e:
        print(f"Error loading dataset: {e}")
        return

    # Aggregate island-wide daily bookings for a macro demand forecast
    df['date'] = pd.to_datetime(df['date'])
    daily_demand = df.groupby('date')['bookings_count'].sum().reset_index()
    daily_demand = daily_demand.sort_values('date')
    
    data = daily_demand['bookings_count'].values.reshape(-1, 1)
    
    # Scale data
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(data)
    
    # Create sequences (30 days lookback)
    look_back = 30
    X, y = [], []
    for i in range(len(scaled_data) - look_back - 1):
        X.append(scaled_data[i:(i + look_back), 0])
        y.append(scaled_data[i + look_back, 0])
        
    X = np.array(X)
    y = np.array(y)
    
    # Reshape for LSTM [samples, time steps, features]
    X = np.reshape(X, (X.shape[0], X.shape[1], 1))
    
    # Split train/test (80/20)
    train_size = int(len(X) * 0.8)
    X_train, X_test = X[0:train_size], X[train_size:len(X)]
    y_train, y_test = y[0:train_size], y[train_size:len(y)]
    
    print(f"Building LSTM Model for Sequence Prediction...")
    model = Sequential()
    model.add(LSTM(50, return_sequences=True, input_shape=(look_back, 1)))
    model.add(Dropout(0.2))
    model.add(LSTM(50, return_sequences=False))
    model.add(Dropout(0.2))
    model.add(Dense(25))
    model.add(Dense(1))
    
    model.compile(optimizer='adam', loss='mean_squared_error')
    
    # Checkpoint and Early Stopping
    checkpoint_dir = f'{BASE}/ai_models/checkpoints' if IN_COLAB else '../checkpoints'
    os.makedirs(checkpoint_dir, exist_ok=True)
    
    checkpoint = ModelCheckpoint(
        f'{checkpoint_dir}/demand_epoch{{epoch:02d}}.keras',
        save_best_only=True,
        monitor='val_loss'
    )
    early_stop = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)
    
    print("Training Model (10 Epochs)...")
    model.fit(X_train, y_train, batch_size=32, epochs=10, 
              validation_data=(X_test, y_test), 
              callbacks=[checkpoint, early_stop],
              verbose=1)
              
    # Evaluation
    predictions = model.predict(X_test)
    pred_unscaled = scaler.inverse_transform(predictions)
    y_test_unscaled = scaler.inverse_transform(y_test.reshape(-1, 1))
    
    rmse = np.sqrt(mean_squared_error(y_test_unscaled, pred_unscaled))
    mae = mean_absolute_error(y_test_unscaled, pred_unscaled)
    print(f"Validation Metrics - RMSE: {rmse:.2f} | MAE: {mae:.2f}")
    
    # Export Model with Versioning
    import datetime
    version = datetime.datetime.now().strftime('%Y%m%d')
    models_dir = f'{BASE}/ai_models' if IN_COLAB else '..'
    
    versioned_path = f'{models_dir}/demand_lstm_model_{version}.keras'
    latest_path = f'{models_dir}/demand_lstm_model.keras'
    
    model.save(versioned_path)
    model.save(latest_path)
    print(f"Demand Forecast LSTM Model exported successfully to {latest_path} and {versioned_path}")

if __name__ == "__main__":
    train_demand_forecast()
