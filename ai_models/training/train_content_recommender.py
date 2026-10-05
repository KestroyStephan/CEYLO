"""
Content-based destination recommender (Sprint 1).

The two-tower NCF model learns an embedding per *training* user ID, so it cannot score a
real CEYLO user it has never seen (cold start). This model scores a (traveller profile,
destination, month) triple from features instead, so it works for every new user and is
small enough to run on the phone offline.

    venv/Scripts/python train_content_recommender.py     (also called by export_models.py)

Writes backend/models/content_recommender.json and mobile/assets/data/content_recommender.json
(weights for the JavaScript fallback), ai_models/content_recommender_model.keras and
mobile/assets/models/content_recommender.tflite (TensorFlow Lite, run on the phone with
react-native-fast-tflite), and returns evaluation metrics (precision@5, NDCG@5, hit rate@5)
against three baselines.
"""
import datetime
import json
import os
import random

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
DATASETS = os.path.join(ROOT, 'ai_datasets')
MODELS = os.path.join(ROOT, 'ai_models')
TODAY = datetime.date.today().isoformat()
SEED = 42
K = 5
NEGATIVES_PER_POSITIVE = 4

MOODS = ['Adventure', 'Relaxation', 'Culture', 'Nature', 'Nightlife', 'Wildlife']
BUDGETS = ['Budget', 'Mid-Range', 'Luxury']
CATEGORIES = ['Heritage & Culture', 'Wildlife', 'Nature & Viewpoint', 'Waterfall', 'Beach']
ECO_FEATURES = ['carbon_footprint_index', 'wildlife_disturbance_risk', 'plastic_pollution_risk', 'community_benefit_score']


def in_season(availability, month):
    """month is 1-12. Mirrors inSeason() in the app and backend."""
    if availability == 'Nov-April':
        return 1.0 if month >= 11 or month <= 4 else 0.0
    if availability == 'May-Oct':
        return 1.0 if 5 <= month <= 10 else 0.0
    return 1.0


def user_features(moods, eco_preference, budget, trip_days, month):
    """Traveller profile + month. Same order as userFeatures() in recommenderModel.js."""
    f = [1.0 if m in moods else 0.0 for m in MOODS]
    f.append(1.0 if eco_preference else 0.0)
    f += [1.0 if budget == b else 0.0 for b in BUDGETS]
    f.append(min(max(trip_days, 1), 21) / 21.0)
    f.append(np.sin(2 * np.pi * (month - 1) / 12))
    f.append(np.cos(2 * np.pi * (month - 1) / 12))
    return f


# Places without a Google rating get the median rating as a model input (median imputation);
# set from the dataset in main() and exported as ratingImpute so the app and backend match
RATING_IMPUTE = 4.5


def destination_features(d, month, n_dest):
    """Same order as destinationFeatures() in recommenderModel.js."""
    f = [1.0 if d['category'] == c else 0.0 for c in CATEGORIES]
    f.append(float(d['eco_score']) / 100)
    f += [float(d[x]) / 100 for x in ECO_FEATURES]
    f.append(1.0 if str(d['carrying_capacity_adherence']) in ('True', 'true', '1') else 0.0)
    f.append(1 - (int(d['popularity_rank']) - 1) / (n_dest - 1))
    rating = d['avg_rating']
    f.append((RATING_IMPUTE if pd.isnull(rating) or rating == '' else float(rating)) / 5)
    f.append(1.0 if str(d['hidden_gem']) in ('True', 'true', '1') else 0.0)
    f.append(in_season(d['seasonal_availability'], month))
    return f


def engagement(row):
    if row['event_type'] == 'booked':
        return 5.0
    if row['event_type'] == 'reviewed':
        return float(row['rating']) if pd.notnull(row['rating']) else 4.0
    if row['event_type'] == 'bookmarked':
        return 3.0
    return 1.0


def ndcg_at_k(ranked, gains, k=K):
    dcg = sum(gains.get(d, 0) / np.log2(i + 2) for i, d in enumerate(ranked[:k]))
    ideal = sorted(gains.values(), reverse=True)[:k]
    idcg = sum(g / np.log2(i + 2) for i, g in enumerate(ideal))
    return dcg / idcg if idcg > 0 else 0.0


def evaluate(score_fn, test_cases, all_dest_ids):
    """score_fn(case) -> {dest_id: score}. Candidates exclude destinations seen in training."""
    p, n, h = [], [], []
    for case in test_cases:
        scores = score_fn(case)
        candidates = [d for d in all_dest_ids if d not in case['seen']]
        ranked = sorted(candidates, key=lambda d: scores[d], reverse=True)
        top = ranked[:K]
        hits = [d for d in top if d in case['gains']]
        p.append(len(hits) / K)
        h.append(1.0 if hits else 0.0)
        n.append(ndcg_at_k(ranked, case['gains']))
    return {'precisionAt5': round(float(np.mean(p)), 4), 'ndcgAt5': round(float(np.mean(n)), 4),
            'hitRateAt5': round(float(np.mean(h)), 4)}


def r(a, digits=6):
    return np.round(np.asarray(a, dtype=np.float64), digits).tolist()


def train_content_recommender(out_dirs=None):
    import tensorflow as tf
    import keras

    random.seed(SEED)
    np.random.seed(SEED)
    tf.random.set_seed(SEED)
    out_dirs = out_dirs or [os.path.join(ROOT, 'backend', 'models'), os.path.join(ROOT, 'mobile', 'assets', 'data')]

    print('Training content-based recommender...')
    global RATING_IMPUTE
    dest_df = pd.read_csv(os.path.join(DATASETS, 'destinations.csv'))
    RATING_IMPUTE = round(float(dest_df['avg_rating'].median()), 2)
    dests = dest_df.to_dict('records')
    dest_by_id = {d['destination_id']: d for d in dests}
    dest_ids = [d['destination_id'] for d in dests]
    n_dest = len(dests)
    users = pd.read_csv(os.path.join(DATASETS, 'users.csv'))
    profiles = {
        u.user_id: {
            'moods': str(u.mood_profile).split('|'),
            'eco': str(u.eco_preference) == 'True',
            'budget': u.budget_range,
            'days': int(u.avg_trip_duration_days),
        } for u in users.itertuples()
    }

    inter = pd.read_csv(os.path.join(DATASETS, 'interactions.csv'))
    inter['score'] = inter.apply(engagement, axis=1)
    inter['month'] = pd.to_datetime(inter['timestamp']).dt.month
    inter = inter.sort_values('timestamp').reset_index(drop=True)
    split = int(len(inter) * 0.8)
    train, test = inter.iloc[:split], inter.iloc[split:]

    def features(uid, did, month):
        p = profiles[uid]
        return user_features(p['moods'], p['eco'], p['budget'], p['days'], month) + \
            destination_features(dest_by_id[did], month, n_dest)

    # Positives with graded labels, plus sampled destinations the user never touched as negatives
    seen_train = train.groupby('user_id')['destination_id'].apply(set).to_dict()
    X, y = [], []
    for row in train.itertuples():
        X.append(features(row.user_id, row.destination_id, row.month))
        y.append(row.score / 5)
        seen = seen_train[row.user_id]
        for _ in range(NEGATIVES_PER_POSITIVE):
            neg = random.choice(dest_ids)
            while neg in seen:
                neg = random.choice(dest_ids)
            X.append(features(row.user_id, neg, row.month))
            y.append(0.0)
    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.float32)
    print(f'  {len(X)} training rows ({split} interactions + negatives), {X.shape[1]} features')

    model = keras.Sequential([
        keras.layers.Input(shape=(X.shape[1],)),
        keras.layers.Dense(64, activation='relu'),
        keras.layers.Dropout(0.2),
        keras.layers.Dense(32, activation='relu'),
        keras.layers.Dense(1, activation='sigmoid'),
    ])
    model.compile(optimizer=keras.optimizers.Adam(1e-3), loss='binary_crossentropy')
    idx = np.random.permutation(len(X))
    X, y = X[idx], y[idx]
    history = model.fit(X, y, validation_split=0.1, epochs=30, batch_size=256, verbose=0,
                        callbacks=[keras.callbacks.EarlyStopping(patience=3, restore_best_weights=True)])
    epochs = len(history.history['loss'])
    print(f'  trained {epochs} epochs, val loss {min(history.history["val_loss"]):.4f}')

    # ---- evaluation on the later 20% of interactions
    gains = test.groupby(['user_id', 'destination_id'])['score'].max().reset_index()
    cases = []
    for uid, g in gains.groupby('user_id'):
        seen = seen_train.get(uid, set())
        case_gains = {row.destination_id: row.score for row in g.itertuples() if row.destination_id not in seen}
        if not case_gains:
            continue
        month = int(test[test.user_id == uid]['month'].iloc[0])
        cases.append({'user': uid, 'month': month, 'seen': seen, 'gains': case_gains})
    print(f'  evaluating on {len(cases)} users')

    def content_scores(case):
        feats = np.array([features(case['user'], d, case['month']) for d in dest_ids], dtype=np.float32)
        return dict(zip(dest_ids, model.predict(feats, verbose=0, batch_size=512).flatten()))

    def popularity_scores(case):
        return {d: -int(dest_by_id[d]['popularity_rank']) for d in dest_ids}

    def rule_scores(case):
        # The ranking CEYLO used before any learned model: eco score plus popularity
        return {d: 0.7 * float(dest_by_id[d]['eco_score']) + 30 * (1 - (int(dest_by_id[d]['popularity_rank']) - 1) / (n_dest - 1))
                for d in dest_ids}

    ncf = keras.saving.load_model(os.path.join(MODELS, 'recommender_model.keras'))
    ncf_users = sorted(inter['user_id'].unique())
    ncf_user_index = {u: i for i, u in enumerate(ncf_users)}
    ncf_dests = sorted(inter['destination_id'].unique())

    def ncf_scores(case):
        u = np.full(len(ncf_dests), ncf_user_index[case['user']])
        preds = ncf.predict([u, np.arange(len(ncf_dests))], verbose=0, batch_size=512).flatten()
        return dict(zip(ncf_dests, preds))

    results = {
        'content': evaluate(content_scores, cases, dest_ids),
        'ncf': evaluate(ncf_scores, cases, dest_ids),
        'rule': evaluate(rule_scores, cases, dest_ids),
        'popularity': evaluate(popularity_scores, cases, dest_ids),
    }
    for name, m in results.items():
        print(f'  {name:11s} precision@5 {m["precisionAt5"]:.3f}  NDCG@5 {m["ndcgAt5"]:.3f}  hit@5 {m["hitRateAt5"]:.3f}')

    # ---- export
    dense = [l for l in model.layers if l.__class__.__name__ == 'Dense']
    sample_profile = {'moods': ['Culture', 'Nature'], 'eco': True, 'budget': 'Mid-Range', 'days': 7}
    checks = []
    for did, month in [(dest_ids[0], 8), (dest_ids[100], 1), (dest_ids[200], 6)]:
        f = user_features(sample_profile['moods'], sample_profile['eco'], sample_profile['budget'], sample_profile['days'], month) + \
            destination_features(dest_by_id[did], month, n_dest)
        checks.append({'profile': sample_profile, 'destinationId': did, 'month': month,
                       'score': round(float(model.predict(np.array([f], dtype=np.float32), verbose=0)[0, 0]), 6)})
    # TensorFlow Lite for the phone: fixed batch of one row per destination (unused rows are zero)
    model.save(os.path.join(MODELS, 'content_recommender_model.keras'))
    n_features = X.shape[1]

    # Converting the trained model directly yields NaNs (Dropout in a fixed-shape graph), so the
    # Dense layers are copied into an identical inference-only network with a fixed batch
    trained_dense = [l for l in model.layers if isinstance(l, keras.layers.Dense)]
    fixed = keras.Sequential([keras.layers.Input(shape=(n_features,), batch_size=n_dest)] +
                             [keras.layers.Dense(l.units, activation=l.get_config()['activation']) for l in trained_dense])
    for src, dst in zip(trained_dense, fixed.layers):
        dst.set_weights(src.get_weights())
    converter = tf.lite.TFLiteConverter.from_keras_model(fixed)
    tflite_bytes = converter.convert()
    tflite_dir = os.path.join(ROOT, 'mobile', 'assets', 'models')
    os.makedirs(tflite_dir, exist_ok=True)
    tflite_path = os.path.join(tflite_dir, 'content_recommender.tflite')
    with open(tflite_path, 'wb') as f:
        f.write(tflite_bytes)

    # The TFLite model must give the same scores as Keras
    interp = tf.lite.Interpreter(model_content=tflite_bytes)
    interp.allocate_tensors()
    batch = np.zeros((n_dest, n_features), dtype=np.float32)
    batch[:len(dests)] = [features(cases[0]['user'], d, cases[0]['month']) for d in dest_ids]
    interp.set_tensor(interp.get_input_details()[0]['index'], batch)
    interp.invoke()
    lite = interp.get_tensor(interp.get_output_details()[0]['index']).flatten()
    keras_out = model.predict(batch, verbose=0).flatten()
    gap = float(np.max(np.abs(lite - keras_out)))
    # XNNPACK float kernels round differently from TensorFlow; anything this small cannot change a ranking
    assert gap < 1e-4, f'TFLite output differs from Keras by {gap}'
    print(f'  wrote {os.path.relpath(tflite_path, ROOT)} ({len(tflite_bytes) // 1024} KB), max gap to Keras {gap:.2e}')

    payload = {
        'name': 'CEYLO content-based recommender',
        'version': f'content-{TODAY}',
        'trained': TODAY,
        'moods': MOODS, 'budgets': BUDGETS, 'categories': CATEGORIES, 'ecoFeatures': ECO_FEATURES,
        'destinationCount': n_dest,
        'ratingImpute': RATING_IMPUTE,
        'tflite': {'file': 'assets/models/content_recommender.tflite', 'batch': n_dest, 'features': int(n_features)},
        'layers': [{'w': r(l.get_weights()[0]), 'b': r(l.get_weights()[1]), 'activation': l.get_config()['activation']} for l in dense],
        'checks': checks,
    }
    for out in out_dirs:
        os.makedirs(out, exist_ok=True)
        path = os.path.join(out, 'content_recommender.json')
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(payload, f, separators=(',', ':'))
        print(f'  wrote {os.path.relpath(path, ROOT)} ({os.path.getsize(path) // 1024} KB)')

    return {
        'name': 'Destination recommender',
        'algorithm': 'Content-based neural network (Keras MLP on traveller + destination + month features)',
        'version': payload['version'],
        'trainingExamples': int(len(X)),
        'precisionAt5': results['content']['precisionAt5'],
        'ndcgAt5': results['content']['ndcgAt5'],
        'hitRateAt5': results['content']['hitRateAt5'],
        'baselines': {k: v for k, v in results.items() if k != 'content'},
        'metric': f'hold-out: last 20% of interactions, {len(cases)} users, unseen destinations only',
        'trained': TODAY,
    }


if __name__ == '__main__':
    print(json.dumps(train_content_recommender(), indent=2))
