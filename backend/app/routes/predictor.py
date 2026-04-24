from fastapi import APIRouter, HTTPException
from app.models.model import train_model, predict_next_day, get_chart_data

router = APIRouter()

@router.get("/predict")
async def get_prediction():
    """
    Returns the predicted BTC price for the next day.
    """
    try:
        result = predict_next_day()
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chart")
async def get_chart():
    """
    Returns historical data and predicted data for charting.
    """
    try:
        return get_chart_data()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/train")
async def trigger_training():
    """
    Triggers model training and returns evaluation metrics.
    """
    try:
        metrics = train_model()
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
