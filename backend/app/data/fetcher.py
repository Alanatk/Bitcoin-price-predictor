import requests
import pandas as pd
from typing import Optional

BINANCE_API_URL = "https://api.binance.com/api/v3/klines"

def fetch_btc_data(symbol: str = "BTCUSDT", interval: str = "1d", limit: int = 1000) -> Optional[pd.DataFrame]:
    """
    Fetches historical OHLCV data for a given symbol from Binance.
    """
    params = {
        "symbol": symbol,
        "interval": interval,
        "limit": limit
    }
    
    try:
        response = requests.get(BINANCE_API_URL, params=params)
        response.raise_for_status()
        data = response.json()
        
        # Binance klines format: 
        # [Open Time, Open, High, Low, Close, Volume, Close Time, Quote Asset Volume, Number of Trades, Taker Buy Base Asset Volume, Taker Buy Quote Asset Volume, Ignore]
        
        columns = ["open_time", "open", "high", "low", "close", "volume", 
                   "close_time", "quote_asset_volume", "number_of_trades", 
                   "taker_buy_base_asset_volume", "taker_buy_quote_asset_volume", "ignore"]
        
        df = pd.DataFrame(data, columns=columns)
        
        # Convert numeric columns
        numeric_cols = ["open", "high", "low", "close", "volume"]
        df[numeric_cols] = df[numeric_cols].apply(pd.to_numeric, axis=1)
        
        # Convert timestamps
        df["open_time"] = pd.to_datetime(df["open_time"], unit='ms')
        df["close_time"] = pd.to_datetime(df["close_time"], unit='ms')
        
        # Select relevant columns
        df = df[["open_time", "open", "high", "low", "close", "volume"]]
        df.set_index("open_time", inplace=True)
        
        return df
        
    except Exception as e:
        print(f"Error fetching data: {e}")
        return None
