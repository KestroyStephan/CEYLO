import pandas as pd
import numpy as np
import os

try:
    import tensorflow as tf
    from tensorflow.keras.layers import Input, Embedding, Flatten, Dense, Concatenate
    from tensorflow.keras.models import Model
    from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import LabelEncoder
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False

def train_recommender():
    if not TF_AVAILABLE:
        print("TensorFlow is not installed in this environment.")
        print("Please run this script in Google Colab, Vertex AI, or an environment with TensorFlow installed.")
        print("Command: pip install tensorflow pandas scikit-learn numpy")
        return

    # Determine base path for Colab vs Local
    IN_COLAB = os.path.exists('/content/drive')
    BASE = '/content/drive/MyDrive/CEYLO' if IN_COLAB else '../..'

    print("Loading user interaction data...")
    try:
        interactions = pd.read_csv(f'{BASE}/ai_datasets/interactions.csv')
    except Exception as e:
        print(f"Error loading dataset: {e}")
        return

    # Preprocessing
    # Encode user_id and destination_id to integers for embedding layers
    user_encoder = LabelEncoder()
    dest_encoder = LabelEncoder()
    
    interactions['user_encoded'] = user_encoder.fit_transform(interactions['user_id'])
    interactions['dest_encoded'] = dest_encoder.fit_transform(interactions['destination_id'])
    
    # We will predict an engagement score. Booked = 5, Reviewed = rating, Bookmarked = 3, Viewed = 1
    def calc_score(row):
        if row['event_type'] == 'booked': return 5.0
        elif row['event_type'] == 'reviewed': return float(row['rating']) if pd.notnull(row['rating']) else 4.0
        elif row['event_type'] == 'bookmarked': return 3.0
        else: return 1.0 # viewed
        
    interactions['engagement_score'] = interactions.apply(calc_score, axis=1)
    
    X = interactions[['user_encoded', 'dest_encoded']].values
    y = interactions['engagement_score'].values
    
    # Chronological Split (Hold out most recent interactions)
    if 'timestamp' in interactions.columns:
        interactions = interactions.sort_values('timestamp')
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)
    
    num_users = len(user_encoder.classes_)
    num_dests = len(dest_encoder.classes_)
    embedding_size = 32
    
    print(f"Building Two-Tower NCF Model for {num_users} users and {num_dests} destinations...")
    
    # User Tower
    user_input = Input(shape=(1,), name='user_input')
    user_emb = Embedding(input_dim=num_users, output_dim=embedding_size, name='user_embedding')(user_input)
    user_vec = Flatten(name='user_flatten')(user_emb)
    
    # Destination Tower
    dest_input = Input(shape=(1,), name='dest_input')
    dest_emb = Embedding(input_dim=num_dests, output_dim=embedding_size, name='dest_embedding')(dest_input)
    dest_vec = Flatten(name='dest_flatten')(dest_emb)
    
    # Concatenate and MLP
    concat = Concatenate()([user_vec, dest_vec])
    dense_1 = Dense(64, activation='relu')(concat)
    dense_2 = Dense(32, activation='relu')(dense_1)
    output = Dense(1, activation='linear', name='prediction')(dense_2)
    
    model = Model(inputs=[user_input, dest_input], outputs=output)
    model.compile(optimizer='adam', loss='mean_squared_error', metrics=['mae'])
    
    # Checkpoint and Early Stopping
    checkpoint_dir = f'{BASE}/ai_models/checkpoints' if IN_COLAB else '../checkpoints'
    os.makedirs(checkpoint_dir, exist_ok=True)
    
    checkpoint = ModelCheckpoint(
        f'{checkpoint_dir}/recommender_epoch{{epoch:02d}}.keras',
        save_best_only=True,
        monitor='val_loss'
    )
    early_stop = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)
    
    print("Training Model (5 Epochs)...")
    # Training
    model.fit(
        [X_train[:, 0], X_train[:, 1]], y_train,
        validation_data=([X_test[:, 0], X_test[:, 1]], y_test),
        epochs=15, # Increased max epochs since we have early stopping
        batch_size=64,
        callbacks=[checkpoint, early_stop],
        verbose=1
    )
    
    # Evaluation (Precision/Recall Proxy)
    print("Evaluating Model on Holdout Set...")
    preds = model.predict([X_test[:, 0], X_test[:, 1]])
    
    # Simple Precision@K metric calculation
    # Define a relevant item as actual score >= 4.0
    k = 10
    actual_relevant = (y_test >= 4.0)
    pred_relevant_indices = np.argsort(preds.flatten())[-k:]
    hits = np.sum(actual_relevant[pred_relevant_indices])
    precision_at_k = hits / k
    print(f"Validation Precision@{k} Proxy: {precision_at_k:.2f}")

    # Export Model with Versioning
    import datetime
    version = datetime.datetime.now().strftime('%Y%m%d')
    models_dir = f'{BASE}/ai_models' if IN_COLAB else '..'
    
    versioned_path = f'{models_dir}/recommender_model_{version}.keras'
    latest_path = f'{models_dir}/recommender_model.keras'
    
    model.save(versioned_path)
    model.save(latest_path)
    print(f"Recommender Model exported successfully to {latest_path} and {versioned_path}")

if __name__ == "__main__":
    train_recommender()
