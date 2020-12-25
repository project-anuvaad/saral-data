package com.hwrecognisation;

public interface PredictionListener {
    public void OnPredictionSuccess(int digit, String id);
    public void OnPredictionFailed(String error);
}
