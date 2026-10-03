"""
Per-destination crowd forecast (Sprint 1).

The island-wide demand LSTM (train_demand_forecast.py) only predicts total bookings. This model
is one LSTM shared by all destinations: from a destination's last 12 months of demand (scaled by
that destination's own peak) plus the calendar month, it predicts next month's demand. Run
recursively it forecasts every destination 24 months ahead, which powers the "fewer crowds"
option in the app.

    venv/Scripts/python train_crowd_forecast.py     (also called by export_models.py)

Writes ai_models/crowd_forecast_lstm.keras and returns (metrics, forecast) where forecast is
{destination_id: {"YYYY-MM": crowd 0-1}}; 1 = the busiest destination-month in the forecast.
"""
import datetime
import os

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
DATASETS = os.path.join(ROOT, 'ai_datasets')
MODELS = os.path.join(ROOT, 'ai_models')
TODAY = datetime.date.today().isoformat()
LOOK_BACK = 12
HOLDOUT_MONTHS = 6
HORIZON = 24
SEED = 42


def month_features(month):
    return [np.sin(2 * np.pi * (month - 1) / 12), np.cos(2 * np.pi * (month - 1) / 12)]


def windows(series, months, start, end):
    """Training windows whose target index t is in [start, end)."""
    X, y = [], []
    for t in range(max(LOOK_BACK, start), end):
        X.append([[series[i]] + month_features(months[t]) for i in range(t - LOOK_BACK, t)])
        y.append(series[t])
    return X, y


def build_model():
    import keras
    model = keras.Sequential([
        keras.layers.Input(shape=(LOOK_BACK, 3)),
        keras.layers.LSTM(32),
        keras.layers.Dense(16, activation='relu'),
        keras.layers.Dense(1),
    ])
    model.compile(optimizer=keras.optimizers.Adam(3e-3), loss='mse')
    return model


def train_crowd_forecast():
    import tensorflow as tf
    import keras
    np.random.seed(SEED)
    tf.random.set_seed(SEED)

    print('Training per-destination crowd forecast LSTM...')
    df = pd.read_csv(os.path.join(DATASETS, 'time_series_demand.csv'))
    df['period'] = pd.to_datetime(df['date']).dt.to_period('M')
    monthly = df.groupby(['destination_id', 'period'])['bookings_count'].mean().unstack().sort_index(axis=1)
    periods = list(monthly.columns)
    months = [p.month for p in periods]
    n = len(periods)
    dest_ids = list(monthly.index)
    peaks = monthly.max(axis=1).replace(0, 1)
    scaled = monthly.div(peaks, axis=0).values  # each destination 0-1 by its own peak

    # Hold out the last 6 months (one-step-ahead) for evaluation
    split = n - HOLDOUT_MONTHS
    Xtr, ytr, Xte, yte = [], [], [], []
    for row in scaled:
        a, b = windows(row, months, 0, split)
        Xtr += a; ytr += b
        a, b = windows(row, months, split, n)
        Xte += a; yte += b
    Xtr, ytr = np.array(Xtr, dtype=np.float32), np.array(ytr, dtype=np.float32)
    Xte, yte = np.array(Xte, dtype=np.float32), np.array(yte, dtype=np.float32)

    model = build_model()
    hist = model.fit(Xtr, ytr, validation_split=0.1, epochs=60, batch_size=64, verbose=0,
                     callbacks=[keras.callbacks.EarlyStopping(patience=6, restore_best_weights=True)])
    best_epochs = int(np.argmin(hist.history['val_loss'])) + 1

    # Evaluate in bookings/day, against the seasonal-naive baseline (same month last year)
    peak_rep = np.repeat(peaks.values, HOLDOUT_MONTHS)
    pred = model.predict(Xte, verbose=0).flatten() * peak_rep
    actual = yte * peak_rep
    naive = np.array([row[t - 12] for row in scaled for t in range(split, n)]) * peak_rep
    mape = lambda p: float(np.mean(np.abs(p - actual) / np.maximum(actual, 1)) * 100)
    mae = lambda p: float(np.mean(np.abs(p - actual)))
    print(f'  hold-out MAPE {mape(pred):.1f}% (seasonal naive {mape(naive):.1f}%), MAE {mae(pred):.2f} bookings/day')

    # Refit on all months with the chosen epoch count, then forecast 24 months ahead
    Xall, yall = [], []
    for row in scaled:
        a, b = windows(row, months, 0, n)
        Xall += a; yall += b
    tf.random.set_seed(SEED)
    final = build_model()
    final.fit(np.array(Xall, dtype=np.float32), np.array(yall, dtype=np.float32),
              epochs=best_epochs, batch_size=64, verbose=0)
    final.save(os.path.join(MODELS, 'crowd_forecast_lstm.keras'))

    history = [list(row) for row in scaled]
    future = [periods[-1] + k for k in range(1, HORIZON + 1)]
    preds = np.zeros((len(dest_ids), HORIZON))
    for k, period in enumerate(future):
        all_months = months + [p.month for p in future[:k]]
        L = len(history[0])
        X = np.array([[[h[i]] + month_features(all_months[i]) for i in range(L - LOOK_BACK, L)] for h in history],
                     dtype=np.float32)
        step = np.clip(final.predict(X, verbose=0).flatten(), 0, None)
        for h, v in zip(history, step):
            h.append(float(v))
        preds[:, k] = step * peaks.values

    top = preds.max()
    forecast = {d: {str(p): round(float(preds[i, k] / top), 4) for k, p in enumerate(future)}
                for i, d in enumerate(dest_ids)}
    print(f'  forecast {future[0]} to {future[-1]} for {len(dest_ids)} destinations')

    metrics = {
        'name': 'Crowd forecast (per destination)',
        'algorithm': 'Shared LSTM over each destination\'s monthly demand + calendar month (Keras)',
        'trainingExamples': int(len(Xall)),
        'mape': round(mape(pred), 2),
        'mae': round(mae(pred), 3),
        'baselineMape': round(mape(naive), 2),
        'metric': f'hold-out: last {HOLDOUT_MONTHS} months, one step ahead; baseline = same month last year',
        'horizon': f'{future[0]} to {future[-1]}',
        'trained': TODAY,
    }
    return metrics, forecast


if __name__ == '__main__':
    m, f = train_crowd_forecast()
    print(m)
