import pytest
import pandas as pd
import numpy as np

def test_data_dimensions():
    # Mock some data as if we loaded it from CSV
    data = {
        'destination_name': ['Sigiriya', 'Ella', 'Yala'],
        'ecoScore': [90, 85, 95],
        'category': ['Heritage', 'Nature', 'Wildlife']
    }
    df = pd.DataFrame(data)
    
    assert len(df) == 3
    assert 'ecoScore' in df.columns
    assert df['ecoScore'].mean() == 90.0

def test_chronological_split():
    # Simulate demand forecasting dataset splitting
    dates = pd.date_range(start='1/1/2025', periods=10)
    df = pd.DataFrame({'date': dates, 'value': range(10)})
    
    train_size = int(len(df) * 0.8)
    train, test = df.iloc[:train_size], df.iloc[train_size:]
    
    # Verify no shuffling happened (chronological order maintained)
    assert train['date'].max() < test['date'].min()
    assert len(train) == 8
    assert len(test) == 2
