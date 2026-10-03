"""
Trains the concierge intent classifier and exports every CEYLO model to JSON so the
Node backend (Render) can run inference without Python, TensorFlow or any external AI API.

    cd ai_models/training
    venv/Scripts/python export_models.py      (Windows)
    venv/bin/python export_models.py          (macOS / Linux)

Writes to backend/models/ and backend/data/:
    chatbot.json      TF-IDF + logistic regression intent classifier (trained here)
    recommender.json  two-tower NCF weights from recommender_model.keras
    demand_lstm.json  LSTM weights from demand_lstm_model.keras + scaler + recent history
    eco_scorer.json   random forest trees from eco_scorer_model.pkl
    metrics.json      evaluation metrics shown in the admin AI Model Monitor
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


# ---------------------------------------------------------------- recommender
# Onboarding moods in the app -> mood profiles in users.csv
MOOD_COHORTS = {
    'eco': ['Nature', 'Wildlife'],
    'adventurer': ['Adventure'],
    'culture': ['Culture'],
    'spiritual': ['Culture', 'Relaxation'],
    'family': ['Relaxation', 'Wildlife'],
    'relaxed': ['Relaxation'],
    'romantic': ['Relaxation'],
    'wildlife': ['Wildlife'],
    'nightlife': ['Nightlife'],
}


def dense_layers(model, names):
    return [{'w': r(model.get_layer(n).get_weights()[0]), 'b': r(model.get_layer(n).get_weights()[1])} for n in names]


def export_recommender():
    import keras
    print('Exporting recommender (two-tower NCF)...')
    model = keras.saving.load_model(os.path.join(MODELS, 'recommender_model.keras'))
    interactions = pd.read_csv(os.path.join(DATASETS, 'interactions.csv'))
    users = pd.read_csv(os.path.join(DATASETS, 'users.csv'))

    # LabelEncoder order used in training = sorted unique ids
    user_ids = sorted(interactions['user_id'].unique())
    dest_ids = sorted(interactions['destination_id'].unique())
    user_emb = model.get_layer('user_embedding').get_weights()[0]
    dest_emb = model.get_layer('dest_embedding').get_weights()[0]
    assert user_emb.shape[0] == len(user_ids) and dest_emb.shape[0] == len(dest_ids)
    user_index = {u: i for i, u in enumerate(user_ids)}

    # A new app user is placed at the centre of the training users who share their mood
    cohorts = {}
    for mood, profiles in MOOD_COHORTS.items():
        members = users[users['mood_profile'].apply(lambda p: any(x in str(p).split('|') for x in profiles))]
        idx = [user_index[u] for u in members['user_id'] if u in user_index]
        cohorts[mood] = r(user_emb[idx].mean(axis=0))
    cohorts['all'] = r(user_emb.mean(axis=0))

    # Reference predictions: cohort vector for "culture" against the first three destinations
    u = np.asarray(cohorts['culture'], dtype=np.float32)
    batch_u = np.repeat(u[None, :], 3, axis=0)
    x = np.concatenate([batch_u, dest_emb[:3]], axis=1)
    h1 = np.maximum(0, x @ model.get_layer('dense').get_weights()[0] + model.get_layer('dense').get_weights()[1])
    h2 = np.maximum(0, h1 @ model.get_layer('dense_1').get_weights()[0] + model.get_layer('dense_1').get_weights()[1])
    out = h2 @ model.get_layer('prediction').get_weights()[0] + model.get_layer('prediction').get_weights()[1]
    # Same numbers through Keras itself (checks the manual maths above)
    keras_out = model.predict([np.array([user_index[user_ids[0]]]), np.array([0])], verbose=0)
    manual_first_user = np.concatenate([user_emb[0], dest_emb[0]])[None, :]
    m1 = np.maximum(0, manual_first_user @ model.get_layer('dense').get_weights()[0] + model.get_layer('dense').get_weights()[1])
    m2 = np.maximum(0, m1 @ model.get_layer('dense_1').get_weights()[0] + model.get_layer('dense_1').get_weights()[1])
    m3 = m2 @ model.get_layer('prediction').get_weights()[0] + model.get_layer('prediction').get_weights()[1]
    assert abs(float(keras_out[0, 0]) - float(m3[0, 0])) < 1e-4, 'manual forward pass does not match Keras'

    write_json(os.path.join(OUT_MODELS, 'recommender.json'), {
        'name': 'CEYLO two-tower neural collaborative filtering recommender',
        'trained': TODAY,
        'destinationIds': dest_ids,
        'destinationEmbedding': r(dest_emb),
        'cohorts': cohorts,
        'moodCohorts': MOOD_COHORTS,
        'layers': dense_layers(model, ['dense', 'dense_1', 'prediction']),
        'checks': [{'cohort': 'culture', 'destinationId': dest_ids[i], 'score': round(float(out[i, 0]), 5)} for i in range(3)],
    })

    # Hold-out evaluation (same chronological 80/20 split as training)
    def score(row):
        if row['event_type'] == 'booked':
            return 5.0
        if row['event_type'] == 'reviewed':
            return float(row['rating']) if pd.notnull(row['rating']) else 4.0
        if row['event_type'] == 'bookmarked':
            return 3.0
        return 1.0
    data = interactions.sort_values('timestamp')
    y = data.apply(score, axis=1).values
    uu = data['user_id'].map(user_index).values
    dd = data['destination_id'].map({d: i for i, d in enumerate(dest_ids)}).values
    split = int(len(data) * 0.8)
    pred = model.predict([uu[split:], dd[split:]], verbose=0, batch_size=1024).flatten()
    mae = float(np.mean(np.abs(pred - y[split:])))
    rmse = float(np.sqrt(np.mean((pred - y[split:]) ** 2)))
    k = 10
    top = np.argsort(pred)[-k:]
    precision = float(np.mean(y[split:][top] >= 4.0))
    print(f'  hold-out MAE {mae:.3f}, RMSE {rmse:.3f}, precision@{k} {precision:.2f}')
    return {
        'name': 'Destination recommender',
        'algorithm': 'Two-tower neural collaborative filtering (Keras)',
        'trainingExamples': split,
        'mae': round(mae, 4),
        'rmse': round(rmse, 4),
        'precisionAt10': round(precision, 4),
        'metric': 'hold-out (last 20% of interactions)',
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
        'trained': TODAY,
    }


# ---------------------------------------------------------------- datasets the backend serves
def copy_datasets():
    print('Copying destination and event datasets for the backend...')
    src = os.path.join(ROOT, 'mobile', 'assets', 'data')
    with open(os.path.join(src, 'ai_destinations.json'), encoding='utf-8') as f:
        dests = json.load(f)
    keep = ['destination_id', 'name', 'category', 'province', 'lat', 'lon', 'hidden_gem', 'avg_rating',
            'popularity_rank', 'seasonal_availability', 'eco_score', 'image'] + ECO_FEATURES
    write_json(os.path.join(OUT_DATA, 'destinations.json'), [{k: d.get(k) for k in keep} for d in dests])
    with open(os.path.join(src, 'ai_events.json'), encoding='utf-8') as f:
        write_json(os.path.join(OUT_DATA, 'events.json'), json.load(f))


if __name__ == '__main__':
    os.makedirs(OUT_MODELS, exist_ok=True)
    os.makedirs(OUT_DATA, exist_ok=True)
    metrics = {'generated': TODAY, 'models': {
        'chatbot': train_chatbot(),
        'recommender': export_recommender(),
        'demand': export_demand(),
        'eco': export_eco(),
    }}
    write_json(os.path.join(OUT_MODELS, 'metrics.json'), metrics)
    copy_datasets()
    print('Done.')
