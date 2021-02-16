package com.hwrecognisation.hwmodel;

public interface PredictionListener {
    public void OnPredictionSuccess(int digit, float confidence, String id);
    void OnPredictionMapSuccess(DigitModel digitModel, String id);
    public void OnPredictionFailed(String error);
    public void OnModelLoadStatus(String message);
}
