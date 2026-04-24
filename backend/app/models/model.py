import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import joblib
import os
from app.data.fetcher import fetch_btc_data

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(MODEL_DIR, "random_forest_btc.joblib")

def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Creates features for the model using historical data.
    """
    # Create moving averages
    df['SMA_7'] = df['close'].rolling(window=7).mean()
    df['SMA_30'] = df['close'].rolling(window=30).mean()
    
    # Calculate price momentum (returns)
    df['return_1d'] = df['close'].pct_change(1)
    
    # Target: Predict next day's close price
    df['target'] = df['close'].shift(-1)
    
    # Drop rows with NaN values created by rolling windows/shifts
    df.dropna(inplace=True)
    return df

def train_model() -> dict:
    """
    Fetches data, prepares features, and trains the model.
    """
    df = fetch_btc_data()
    if df is None or df.empty:
        raise ValueError("Failed to fetch data for training.")
        
    df = prepare_features(df)
    
    features = ['open', 'high', 'low', 'close', 'volume', 'SMA_7', 'SMA_30', 'return_1d']
    X = df[features]
    y = df['target']
    
    # Temporal split: do not shuffle time series data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)
    
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    
    # Save model
    joblib.dump(model, MODEL_PATH)
    
    return {
        "status": "success",
        "mae": float(mae),
        "test_samples": len(X_test),
        "latest_close": float(df['close'].iloc[-1])
    }

def predict_next_day() -> dict:
    """
    Loads the trained model and predicts the next day's price based on the latest available data.
    """
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("Model not found. Please train the model first.")
        
    model = joblib.load(MODEL_PATH)
    
    # Re-fetch just to get the pristine last few rows to calculate features
    latest_df = fetch_btc_data(limit=100)
    if latest_df is None or latest_df.empty:
        raise ValueError("Failed to fetch recent data for prediction.")
        
    latest_df['SMA_7'] = latest_df['close'].rolling(window=7).mean()
    latest_df['SMA_30'] = latest_df['close'].rolling(window=30).mean()
    latest_df['return_1d'] = latest_df['close'].pct_change(1)
    
    # Get the last row for the most recent day
    last_row = latest_df.iloc[-1:] 
    
    # Check if we have enough data (values shouldn't be NaN in the last row)
    if last_row.isna().values.any():
        raise ValueError("Not enough data to calculate features for prediction.")
    
    features = ['open', 'high', 'low', 'close', 'volume', 'SMA_7', 'SMA_30', 'return_1d']
    X_latest = last_row[features]
    
    prediction = model.predict(X_latest)[0]
    
    return {
        "current_price": float(last_row['close'].iloc[0]),
        "predicted_price": float(prediction),
        "last_update": str(last_row.index[0].date())
    }

def get_chart_data() -> dict:
    """
    Returns historical data for the chart and the predicted next day's price.
    """
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("Model not found. Please train the model first.")
        
    model = joblib.load(MODEL_PATH)
    latest_df = fetch_btc_data(limit=100)
    if latest_df is None or latest_df.empty:
        raise ValueError("Failed to fetch recent data for prediction.")
        
    latest_df['SMA_7'] = latest_df['close'].rolling(window=7).mean()
    latest_df['SMA_30'] = latest_df['close'].rolling(window=30).mean()
    latest_df['return_1d'] = latest_df['close'].pct_change(1)
    
    last_row = latest_df.iloc[-1:] 
    if last_row.isna().values.any():
        raise ValueError("Not enough data to calculate features for prediction.")
    
    features = ['open', 'high', 'low', 'close', 'volume', 'SMA_7', 'SMA_30', 'return_1d']
    X_latest = last_row[features]
    prediction = model.predict(X_latest)[0]
    
    # Get last 30 days for chart
    chart_df = latest_df.tail(30)
    dates = [str(d.date()) for d in chart_df.index]
    prices = chart_df['close'].tolist()
    
    # Add predicted day
    import datetime
    next_day = chart_df.index[-1] + datetime.timedelta(days=1)
    
    return {
        "dates": dates,
        "historical_prices": prices,
        "predicted_date": str(next_day.date()),
        "predicted_price": float(prediction)
    }
