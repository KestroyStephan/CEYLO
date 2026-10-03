"""
Trains the concierge intent classifier and exports every CEYLO model to JSON so the
Node backend (Render) can run inference without Python, TensorFlow or any external AI API.

    cd ai_models/training
    venv/Scripts/python export_models.py      (Windows)
    venv/bin/python export_models.py          (macOS / Linux)

Writes to backend/models/ and backend/data/:
    chatbot.json      TF-IDF + logistic regression intent classifier (trained here)
    content_recommender.json  content-based recommender (train_content_recommender.py),
                      also copied to mobile/assets/data for offline itineraries
    demand_lstm.json  LSTM weights from demand_lstm_model.keras + scaler + recent history
    eco_scorer.json   random forest trees from eco_scorer_model.pkl
    metrics.json      evaluation metrics shown in the admin AI Model Monitor
    backend/data/destinations.json  dataset + eco model batch scores + monthly crowd index
    mobile/assets/data/crowd_forecast.json  per-destination LSTM crowd forecast (offline ranking)
Every model file carries a few reference predictions ("checks") that the backend tests
compare against, so the JavaScript inference is proven to match Python.
"""
import csv
import datetime
import json
import os
import pickle

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
DATASETS = os.path.join(ROOT, 'ai_datasets')
MODELS = os.path.join(ROOT, 'ai_models')
OUT_MODELS = os.path.join(ROOT, 'backend', 'models')
OUT_DATA = os.path.join(ROOT, 'backend', 'data')
TODAY = datetime.date.today().isoformat()


def r(a, digits=6):
    """Round a numpy array (or scalar) and convert to plain lists for JSON."""
    return np.round(np.asarray(a, dtype=np.float64), digits).tolist()


def write_json(path, obj):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
    print(f'  wrote {os.path.relpath(path, ROOT)} ({os.path.getsize(path) // 1024} KB)')


# ---------------------------------------------------------------- chatbot
TOKEN_PATTERN = r'[a-z0-9]+'


def train_chatbot():
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import StratifiedKFold, cross_val_score
    from sklearn.pipeline import make_pipeline, make_union

    print('Training concierge intent classifier...')
    with open(os.path.join(DATASETS, 'chatbot_intents.json'), encoding='utf-8') as f:
        spec = json.load(f)
    with open(os.path.join(DATASETS, 'chatbot_qa.csv'), encoding='utf-8') as f:
        faq = list(csv.DictReader(f))

    texts, labels, responses, categories = [], [], {}, {}
    for intent in spec['intents']:
        for p in intent['patterns']:
            texts.append(p)
            labels.append(intent['tag'])
        responses[intent['tag']] = intent['responses']
    for i, row in enumerate(faq, start=1):
        tag = f'faq_{i:02d}'
        for p in [row['question']] + spec['faq_paraphrases'].get(row['question'], []):
            texts.append(p)
            labels.append(tag)
        responses[tag] = [row['answer']]
        categories[tag] = row['category']

    def build():
        return make_pipeline(
            make_union(
                TfidfVectorizer(lowercase=True, token_pattern=TOKEN_PATTERN, ngram_range=(1, 2), sublinear_tf=True),
                TfidfVectorizer(lowercase=True, analyzer='char_wb', ngram_range=(3, 5), sublinear_tf=True),
            ),
            LogisticRegression(C=50, max_iter=5000),
        )

    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
    scores = cross_val_score(build(), texts, labels, cv=cv)
    print(f'  3-fold cross-validated accuracy: {scores.mean():.3f}')

    model = build().fit(texts, labels)
    union, clf = model.steps[0][1], model.steps[1][1]
    word_vec, char_vec = union.transformer_list[0][1], union.transformer_list[1][1]

    checks = ['how do i get to kandy from colombo', 'hello there', 'plan a 5 day trip', 'is the tap water safe',
              "What's the tuk-tuk fare?", 'Any festivals in August?']
    probs = model.predict_proba(checks)
    write_json(os.path.join(OUT_MODELS, 'chatbot.json'), {
        'name': 'CEYLO concierge intent classifier',
        'algorithm': 'TF-IDF (word 1-2 grams + char_wb 3-5 grams, sublinear tf) + multinomial logistic regression',
        'trained': TODAY,
        'tokenPattern': TOKEN_PATTERN,
        # Feature columns: word features first, then char features (each block L2-normalised)
        'word': {'vocabulary': {t: int(i) for t, i in word_vec.vocabulary_.items()}, 'idf': r(word_vec.idf_)},
        'char': {'vocabulary': {t: int(i) for t, i in char_vec.vocabulary_.items()}, 'idf': r(char_vec.idf_), 'min': 3, 'max': 5},
        'classes': clf.classes_.tolist(),
        'coef': r(clf.coef_),
        'intercept': r(clf.intercept_),
        'responses': responses,
        'faqCategories': categories,
        'checks': [{'text': t, 'intent': clf.classes_[p.argmax()], 'confidence': round(float(p.max()), 6)}
                   for t, p in zip(checks, probs)],
    })
    return {
        'name': 'Concierge intent classifier',
        'algorithm': 'TF-IDF (words + characters) + logistic regression',
        'trainingExamples': len(texts),
        'intents': len(clf.classes_),
        'accuracy': round(float(scores.mean()), 4),
        'metric': '3-fold cross-validated accuracy',
        'trained': TODAY,
    }


# ---------------------------------------------------------------- demand LSTM
LOOK_BACK = 30


def export_demand():
    import keras
    print('Exporting demand forecast LSTM...')
    model = keras.saving.load_model(os.path.join(MODELS, 'demand_lstm_model.keras'))
    df = pd.read_csv(os.path.join(DATASETS, 'time_series_demand.csv'))
    df['date'] = pd.to_datetime(df['date'])
    daily = df.groupby('date')['bookings_count'].sum().sort_index()
    values = daily.values.astype(np.float64)
    lo, hi = float(values.min()), float(values.max())
    scaled = (values - lo) / (hi - lo)

    lstm_layers = []
    for layer in model.layers:
        if layer.__class__.__name__ == 'LSTM':
            k, rk, b = layer.get_weights()
            lstm_layers.append({'units': int(layer.units), 'kernel': r(k), 'recurrentKernel': r(rk), 'bias': r(b)})
    dense = [l for l in model.layers if l.__class__.__name__ == 'Dense']
    dense_w = [{'w': r(l.get_weights()[0]), 'b': r(l.get_weights()[1])} for l in dense]

    # Reference: 7-day recursive forecast from the last 30 days
    window = list(scaled[-LOOK_BACK:])
    forecast = []
    for _ in range(7):
        p = float(model.predict(np.array(window[-LOOK_BACK:]).reshape(1, LOOK_BACK, 1), verbose=0)[0, 0])
        forecast.append(p * (hi - lo) + lo)
        window.append(p)

    # Hold-out evaluation (last 20% of windows, as in training)
    X = np.array([scaled[i:i + LOOK_BACK] for i in range(len(scaled) - LOOK_BACK - 1)])
    y = np.array([scaled[i + LOOK_BACK] for i in range(len(scaled) - LOOK_BACK - 1)])
    split = int(len(X) * 0.8)
    pred = model.predict(X[split:].reshape(-1, LOOK_BACK, 1), verbose=0).flatten() * (hi - lo) + lo
    actual = y[split:] * (hi - lo) + lo
    mae = float(np.mean(np.abs(pred - actual)))
    rmse = float(np.sqrt(np.mean((pred - actual) ** 2)))
    mape = float(np.mean(np.abs(pred - actual) / np.maximum(actual, 1)) * 100)
    print(f'  hold-out MAE {mae:.1f}, RMSE {rmse:.1f}, MAPE {mape:.1f}%')

    history = daily.iloc[-120:]
    write_json(os.path.join(OUT_MODELS, 'demand_lstm.json'), {
        'name': 'CEYLO island-wide booking demand LSTM',
        'trained': TODAY,
        'lookBack': LOOK_BACK,
        'scaler': {'min': lo, 'max': hi},
        'lstm': lstm_layers,
        'dense': dense_w,
        'history': [{'date': d.strftime('%Y-%m-%d'), 'bookings': int(v)} for d, v in history.items()],
        'checks': {'forecast7': r(forecast, 3)},
    })
    return {
        'name': 'Booking demand forecast',
        'algorithm': '2-layer LSTM, 30-day look-back (Keras)',
        'trainingExamples': split,
        'mae': round(mae, 2),
        'rmse': round(rmse, 2),
        'mape': round(mape, 2),
        'metric': 'hold-out (last 20% of days), bookings per day',
        'trained': TODAY,
    }


# ---------------------------------------------------------------- eco scorer
ECO_FEATURES = ['carbon_footprint_index', 'wildlife_disturbance_risk', 'plastic_pollution_risk',
                'community_benefit_score', 'carrying_capacity_adherence']


def export_eco():
    from sklearn.model_selection import train_test_split
    print('Exporting eco scorer (random forest)...')
    with open(os.path.join(MODELS, 'eco_scorer_model.pkl'), 'rb') as f:
        rf = pickle.load(f)
    trees = []
    for est in rf.estimators_:
        t = est.tree_
        trees.append({
            'left': t.children_left.tolist(),
            'right': t.children_right.tolist(),
            'feature': t.feature.tolist(),
            'threshold': r(t.threshold, 6),
            'value': r(t.value[:, 0, 0], 4),
        })

    df = pd.read_csv(os.path.join(DATASETS, 'destinations.csv'))
    df['carrying_capacity_adherence'] = df['carrying_capacity_adherence'].astype(int)
    X, y = df[ECO_FEATURES], df['eco_score']
    _, X_test, _, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    pred = rf.predict(X_test)
    mae = float(np.mean(np.abs(pred - y_test)))
    ss_res = float(np.sum((y_test - pred) ** 2))
    ss_tot = float(np.sum((y_test - y_test.mean()) ** 2))
    r2 = 1 - ss_res / ss_tot
    print(f'  hold-out MAE {mae:.2f}, R2 {r2:.3f}')

    sample = X.iloc[:5]
    write_json(os.path.join(OUT_MODELS, 'eco_scorer.json'), {
        'name': 'CEYLO eco score random forest',
        'trained': TODAY,
        'features': ECO_FEATURES,
        'importances': r(rf.feature_importances_, 4),
        'trees': trees,
        'checks': [{'input': row.tolist(), 'score': round(float(p), 4)}
                   for (_, row), p in zip(sample.iterrows(), rf.predict(sample))],
    })
    return {
        'name': 'Eco score model',
        'algorithm': f'Random forest regressor ({rf.n_estimators} trees, scikit-learn)',
        'trainingExamples': int(len(X) - len(X_test)),
        'mae': round(mae, 3),
        'r2': round(r2, 4),
        'metric': 'hold-out (20%, random_state 42)',
        'featureImportance': {f: round(float(v), 4) for f, v in zip(ECO_FEATURES, rf.feature_importances_)},
        'version': eco_version(),
        'trained': TODAY,
    }, rf


def eco_version():
    # The forest was trained when the .pkl was written
    stamp = datetime.date.fromtimestamp(os.path.getmtime(os.path.join(MODELS, 'eco_scorer_model.pkl')))
    return f'eco-rf-{stamp.isoformat()}'


# ---------------------------------------------------------------- datasets the backend serves
def copy_datasets(rf, crowd):
    print('Copying datasets for the backend (with eco model scores and crowd forecast)...')
    src = os.path.join(ROOT, 'mobile', 'assets', 'data')
    with open(os.path.join(src, 'ai_destinations.json'), encoding='utf-8') as f:
        dests = json.load(f)
    keep = ['destination_id', 'name', 'category', 'province', 'lat', 'lon', 'hidden_gem', 'avg_rating',
            'popularity_rank', 'seasonal_availability', 'eco_score', 'image'] + ECO_FEATURES

    # Batch-score every destination with the eco model and record which model did it
    X = pd.DataFrame([{f: (1 if str(d[f]) == 'True' else 0) if f == 'carrying_capacity_adherence' else float(d[f])
                       for f in ECO_FEATURES} for d in dests])
    eco_scores = rf.predict(X[ECO_FEATURES])
    version = eco_version()
    rows = []
    for d, score in zip(dests, eco_scores):
        row = {k: d.get(k) for k in keep}
        row['eco_model_score'] = round(float(score), 2)
        row['eco_model_version'] = version
        row['crowd_forecast'] = crowd.get(d['destination_id'], {})
        rows.append(row)
    write_json(os.path.join(OUT_DATA, 'destinations.json'), rows)
    write_json(os.path.join(src, 'crowd_forecast.json'), crowd)
    with open(os.path.join(src, 'ai_events.json'), encoding='utf-8') as f:
        write_json(os.path.join(OUT_DATA, 'events.json'), json.load(f))


if __name__ == '__main__':
    os.makedirs(OUT_MODELS, exist_ok=True)
    os.makedirs(OUT_DATA, exist_ok=True)
    from train_content_recommender import train_content_recommender
    from train_crowd_forecast import train_crowd_forecast
    eco_metrics, rf = export_eco()
    crowd_metrics, crowd = train_crowd_forecast()
    metrics = {'generated': TODAY, 'models': {
        'chatbot': train_chatbot(),
        'recommender': train_content_recommender([OUT_MODELS, os.path.join(ROOT, 'mobile', 'assets', 'data')]),
        'demand': export_demand(),
        'eco': eco_metrics,
        'crowd': crowd_metrics,
    }}
    write_json(os.path.join(OUT_MODELS, 'metrics.json'), metrics)
    copy_datasets(rf, crowd)
    print('Done.')
