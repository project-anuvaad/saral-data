package com.hwrecognisation;

import android.app.Activity;
import android.content.Intent;

import android.util.Log;
import android.widget.Toast;

import com.facebook.react.bridge.ActivityEventListener;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import com.hwrecognisation.saralsdk.GJScannerAndROIs;
import com.hwrecognisation.saralsdk.SaralSDKOpenCVScannerActivity;
import com.hwrecognisation.saralsdk.hwmodel.HWClassifier;
import com.hwrecognisation.saralsdk.hwmodel.HWClassifierStatusListener;

import org.json.JSONArray;
import org.json.JSONException;
import org.opencv.android.BaseLoaderCallback;
import org.opencv.android.LoaderCallbackInterface;
import org.opencv.android.OpenCVLoader;

public class RNOpenCvCameraModel extends ReactContextBaseJavaModule implements ActivityEventListener {
    private static Boolean isOn                 = false;
    Promise mPromise;
    private static final String TAG             = "SrlSDK::Module";

    private BaseLoaderCallback mLoaderCallback = new BaseLoaderCallback(getReactApplicationContext()) {
        @Override
        public void onManagerConnected(int status) {
            switch (status) {
                case LoaderCallbackInterface.SUCCESS:
                {
                    Log.i(TAG, "OpenCV loaded successfully");
                } break;
                default:
                {
                    super.onManagerConnected(status);
                } break;
            }
        }
    };

    public RNOpenCvCameraModel(ReactApplicationContext reactContext) {
        super(reactContext);
        reactContext.addActivityEventListener(this);

        Log.d(TAG, "SaralSDKModule loaded, trying to load OpenCV libs & Models");
        if (!OpenCVLoader.initDebug()) {
            Log.d(TAG, "Internal OpenCV library not found. Using OpenCV Manager for initialization");
            OpenCVLoader.initAsync(OpenCVLoader.OPENCV_VERSION, getReactApplicationContext(), mLoaderCallback);
        } else {
            Log.d(TAG, "OpenCV library found inside package. Using it!");
            mLoaderCallback.onManagerConnected(LoaderCallbackInterface.SUCCESS);
        }
        HWClassifier.getInstance();
        Log.d(TAG, "Loading HWClassifer models");
        HWClassifier.getInstance().initialize(new HWClassifierStatusListener() {
            @Override
            public void OnModelLoadSuccess(String message) {
                Log.d(TAG, "HWClassifer model loaded : " + message);
            }

            @Override
            public void OnModelLoadError(String message) {
                Log.d(TAG, "HWClassifer model cannot be loaded :" + message);
            }
        });
    }


//    @ReactMethod
//    void getCameraData(Promise promise) {
//
//        mPromise = promise;
//        final Activity activity = getCurrentActivity();
//        Intent intent = new Intent(activity, OpenCvCameraActivity.class);
//        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
//        getReactApplicationContext().startActivity(intent);
//    }

    @ReactMethod
    void openScanCamera(String rollNumberList, int scannerType, Promise promise) throws JSONException {
        JSONArray rollArray = new JSONArray(rollNumberList);
        Log.d(TAG, "NumberPool-OpenCamera  :: "+rollArray);
        mPromise = promise;
        final Activity activity = getCurrentActivity();

        Intent intent   = new Intent();
        intent          = new Intent(activity, SaralSDKOpenCVScannerActivity.class);
        intent.putExtra("scanner", scannerType);
        intent.putExtra("NUMBER_POOL",rollArray.toString());

        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getReactApplicationContext().startActivity(intent);
    }

    @ReactMethod
    void cancelActivity(Promise promise) {
        final Activity activity = getCurrentActivity();
        activity.finish();
        String cancel = "true";
        promise.resolve(cancel);
    }


//    @ReactMethod
//    void openCameraX() {
//        Activity activity = getCurrentActivity();
//        Intent intent = new Intent(activity, CameraXActivity.class);
//        getReactApplicationContext().startActivity(intent);
//
//    }
    @Override
    public String getName() {
        return "RNOpenCvCameraModel";
    }

    private void showToast(String message) {
        Toast.makeText(getReactApplicationContext(), message, Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
        if (requestCode == 1) {
            Log.d(TAG, "Response: " + data.getStringExtra("layoutConfigsResult"));
            this.mPromise.resolve(data.getStringExtra("layoutConfigsResult"));
        }

        else if(requestCode == 0) {
            showToast(data.getStringExtra("message"));
//            this.mPromise.reject("distance", data.getStringExtra("message"));
        }
        else{
            //example for handling error response
            this.mPromise.reject("unknown", "Error fetching");
        }
    }

    @Override
    public void onNewIntent(Intent intent) {

    }

}