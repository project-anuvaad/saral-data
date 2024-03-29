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
import com.hwrecognisation.ocrapp.GJPATScannerActivity34;
import com.hwrecognisation.ocrapp.GJSATScannerActivity;
import com.hwrecognisation.ocrapp.MarkSheetScannerActivity;
import com.hwrecognisation.ocrapp.SCANNER_TYPE;

import org.json.JSONArray;
import org.json.JSONException;
import static com.facebook.react.views.textinput.ReactTextInputManager.TAG;

public class RNOpenCvCameraModel extends ReactContextBaseJavaModule implements ActivityEventListener {
    private static Boolean isOn = false;



    Promise mPromise;


    public RNOpenCvCameraModel(ReactApplicationContext reactContext) {
        super(reactContext);
        reactContext.addActivityEventListener(this);
    }


    @ReactMethod
    void getCameraData(Promise promise) {

        mPromise = promise;
        final Activity activity = getCurrentActivity();
        Intent intent = new Intent(activity, OpenCvCameraActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getReactApplicationContext().startActivity(intent);
    }

    @ReactMethod
    void openScanCamera(String rollNumberList, int scannerType, Promise promise) throws JSONException {
        JSONArray rollArray = new JSONArray(rollNumberList);
        Log.d(TAG, "NumberPool-OpenCamera  :: "+rollArray);
        mPromise = promise;
        final Activity activity = getCurrentActivity();
        Intent intent = new Intent();
        if(scannerType == SCANNER_TYPE.SCANNER_SAT) {
            intent = new Intent(activity, GJSATScannerActivity.class);
        }
        else if(scannerType == SCANNER_TYPE.SCANNER_PAT) {
            intent = new Intent(activity, MarkSheetScannerActivity.class);
        }
        else if (scannerType==SCANNER_TYPE.SCANNER_PAT34){
            intent = new Intent(activity, GJPATScannerActivity34.class);
        }
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
            Log.d(TAG, "DatagetDataString"+data.getDataString());
            //example for handling success response
            this.mPromise.resolve(data.getStringExtra("fileName")); // you can further process this data in react native component.

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