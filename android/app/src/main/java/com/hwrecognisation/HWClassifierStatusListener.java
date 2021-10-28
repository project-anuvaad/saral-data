package com.hwrecognisation;


public interface HWClassifierStatusListener {
    public void OnModelLoadSuccess(String message);
    public void OnModelLoadError(String message);
}
