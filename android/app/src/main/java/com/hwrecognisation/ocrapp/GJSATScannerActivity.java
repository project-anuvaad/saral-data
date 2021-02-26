package com.hwrecognisation.ocrapp;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.graphics.Bitmap;
import android.media.MediaActionSound;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.Base64;
import android.util.Log;
import android.view.SurfaceView;
import android.view.Window;
import android.view.WindowManager;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.ReactContext;
import com.hwrecognisation.R;
import com.hwrecognisation.hwmodel.DigitModel;
import com.hwrecognisation.hwmodel.HWClassifier;
import com.hwrecognisation.hwmodel.PredictionListener;
import com.hwrecognisation.opencv.DetectShaded;
import com.hwrecognisation.opencv.ExtractROIs;
import com.hwrecognisation.opencv.ExtractRollRow;
import com.hwrecognisation.opencv.TableCornerCirclesDetection;
import com.hwrecognisation.prediction.PredictionFilter;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.opencv.android.BaseLoaderCallback;
import org.opencv.android.CameraBridgeViewBase;
import org.opencv.android.LoaderCallbackInterface;
import org.opencv.android.OpenCVLoader;
import org.opencv.android.Utils;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.Point;
import org.opencv.core.Scalar;
import org.opencv.imgproc.Imgproc;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;

public class GJSATScannerActivity extends ReactActivity implements CameraBridgeViewBase.CvCameraViewListener2 {
    private static final String  TAG                    = "OCRApp::GJSAT";
    private static long mframeCount                     = 0;
    private static long mIgnoreFrameCount               = 0;
    private static final int START_PROCESSING_COUNT     = 20;

    private int mScannerType                            = SCANNER_TYPE.SCANNER_SAT;
    private boolean isHWClassiferAvailable              = true;
    private boolean isRelevantFrameAvailable            = false;
    private boolean mIsScanningComplete                 = false;
    private boolean mScanningResultShared               = false;

    private Mat                             mRgba;
    private CameraBridgeViewBase            mOpenCvCameraView;
    private TableCornerCirclesDetection     mTableCornerDetection;
    private ExtractROIs                     mROIs;
    private DetectShaded                    mDetectShaded;
    private long                            mStartTime;
    private long                            mStartPredictTime;

    private int     mTotalClassifiedCount               = 0;
    private boolean mIsClassifierRequestSubmitted       = false;
    private HashMap<String, String> mPredictedDigits    = new HashMap<>();
    private HashMap<String, DigitModel> mPredictedDigitModel    = new HashMap<>();
    private HashMap<String, String> mPredictedOMRs      = new HashMap<>();
    private HashMap<String, String> mPredictedClass     = new HashMap<>();

    private String[] rollNumberPool;

    private HWClassifier hwClassifier;
    private PredictionFilter predictionFilter;

    private BaseLoaderCallback mLoaderCallback = new BaseLoaderCallback(this) {
        @Override
        public void onManagerConnected(int status) {
            switch (status) {
                case LoaderCallbackInterface.SUCCESS:
                {
                    Log.i(TAG, "OpenCV loaded successfully");
                    mOpenCvCameraView.enableView();
                } break;
                default:
                {
                    super.onManagerConnected(status);
                } break;
            }
        }
    };

    public GJSATScannerActivity() {
        Log.i(TAG, "Instantiated new " + this.getClass());
        predictionFilter = new PredictionFilter();
    }

    /** Called when the activity is first created. */
    @SuppressLint("SourceLockedOrientationActivity")
    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.i(TAG, "called onCreate");
        super.onCreate(savedInstanceState);
//        Bundle b = getIntent().getExtras();
        if(getIntent().hasExtra("scanner")) {
            mScannerType = getIntent().getIntExtra("scanner", 1);
            Log.d(TAG, "Scanner type: " + mScannerType);
        }

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(R.layout.activity_gj_sat_scanner);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);

        mOpenCvCameraView = (CameraBridgeViewBase) findViewById(R.id.up_pat_scanner_activity_surface_view);
        mOpenCvCameraView.setVisibility(SurfaceView.VISIBLE);
        mOpenCvCameraView.setCvCameraViewListener(this);
        mOpenCvCameraView.enableFpsMeter();

        if (getIntent().hasExtra("NUMBER_POOL")) {
            try {
                Log.i(TAG, "NumberPool-String:" + getIntent().hasExtra("NUMBER_POOL"));
                JSONArray jsonArray = new JSONArray(getIntent().getStringExtra("NUMBER_POOL"));
                rollNumberPool = new String[jsonArray.length()];
                for (int i = 0; i < jsonArray.length(); i++) {
                    rollNumberPool[i] = jsonArray.optString(i);
                }
            } catch (JSONException e) {
                e.printStackTrace();
            }
        } else {
            Log.i(TAG, "Intent extra number pool is not found");
        }
    }

    @Override
    public void onPause()
    {
        super.onPause();
        if (mOpenCvCameraView != null)
            mOpenCvCameraView.disableView();
    }

    @Override
    public void onResume()
    {
        super.onResume();
        if (!OpenCVLoader.initDebug()) {
            Log.d(TAG, "Internal OpenCV library not found. Using OpenCV Manager for initialization");
            OpenCVLoader.initAsync(OpenCVLoader.OPENCV_VERSION, this, mLoaderCallback);
        } else {
            Log.d(TAG, "OpenCV library found inside package. Using it!");
            mLoaderCallback.onManagerConnected(LoaderCallbackInterface.SUCCESS);

            /**
             * Now load the classifier
             */
            try {
                hwClassifier    = new HWClassifier(GJSATScannerActivity.this, mScannerType, new PredictionListener() {
                    @Override
                    public void OnPredictionSuccess(int digit, float confidence, String id) {
                    }

                    @Override
                    public void OnPredictionMapSuccess(DigitModel digitMap, String id) {
                        mTotalClassifiedCount++;
                        handleDigitsPredictions(digitMap, id);
                        if (mIsClassifierRequestSubmitted && mTotalClassifiedCount >= mPredictedDigits.size()) {
                            mIsScanningComplete     = true;
                        }

                        if (mIsScanningComplete) {
                            Log.d(TAG, "Scaning completed, classification count " + mTotalClassifiedCount);
                            processScanningCompleted();
                        }
                    }

                    @Override
                    public void OnPredictionFailed(String error) {
                        Log.e(TAG, "Model prediction failed");
                        isHWClassiferAvailable  = false;
                    }

                    @Override
                    public void OnModelLoadStatus(String message) {
                        Log.d(TAG, "Model load status: " + message);
                        isHWClassiferAvailable  = true;
                    }
                });

                hwClassifier.initialize();

            } catch (IOException e) {
                Log.e(TAG, "Failed to load HWClassifier", e);
            }
        }
    }


    public void onDestroy() {
        super.onDestroy();
        if (mOpenCvCameraView != null)
            mOpenCvCameraView.disableView();
    }

    @Override
    public List<? extends CameraBridgeViewBase> getCameraViewList() {
        return null;
    }

    public void onCameraViewStarted(int width, int height) {
        mRgba                           = new Mat(height, width, CvType.CV_8UC4);
        mTableCornerDetection           = new TableCornerCirclesDetection(false);
        mROIs                           = new ExtractROIs(false);
        mDetectShaded                   = new DetectShaded(false);
        mTotalClassifiedCount           = 0;
        mIsScanningComplete             = false;
        mScanningResultShared           = false;
        isHWClassiferAvailable          = true;
        isRelevantFrameAvailable        = false;
        mIsClassifierRequestSubmitted   = false;
        mframeCount                     = 0;
        mIgnoreFrameCount               = 0;
    }

    public void onCameraViewStopped() {
        mRgba.release();
    }

    public Mat onCameraFrame(CameraBridgeViewBase.CvCameraViewFrame inputFrame) {
        mRgba               = inputFrame.rgba();
        if (!isRelevantFrameAvailable) {
            processCameraFrame(mRgba, mframeCount);
            mframeCount ++;
        } else {
            showProcessingInformation(mRgba);
        }
        return mRgba;
    }

    private void processCameraFrame(Mat image, long frameCount) {
        double DARKNESS_THRESHOLD   = 80.0;
        Mat tableMat                = mTableCornerDetection.processMat(image);
        mStartTime                  = SystemClock.uptimeMillis();
//        return;

        if (tableMat != null && isHWClassiferAvailable) {
            if (mIgnoreFrameCount < START_PROCESSING_COUNT) {
                mIgnoreFrameCount ++;
                return;
            }
            isRelevantFrameAvailable        = true;
            mIsScanningComplete             = false;
            mIsClassifierRequestSubmitted   = false;

            JSONArray rois              = getROIs();
            Log.d(TAG, "Received Table image, extracting: " + rois.length() + " ROIs:");

            mStartPredictTime       = SystemClock.uptimeMillis();
            MediaActionSound sound  = new MediaActionSound();
            sound.play(MediaActionSound.FOCUS_COMPLETE);

            try {
                for (int i = 0; i < rois.length(); i++) {
                    JSONObject roi  = rois.getJSONObject(i);

                    if (roi.getString("method").equals("omr")) {
                        StringBuilder sb    = new StringBuilder().append(roi.getInt("row")).append("_").append(roi.getInt("col")).append("_").append(roi.getInt("index"));
                        double percent      = mDetectShaded.getShadedPercentage(tableMat, roi.getInt("top"), roi.getInt("left"), roi.getInt("bottom"), roi.getInt("right"));
                        Integer answer      = 0;
                        if (percent > DARKNESS_THRESHOLD) {
                            answer = 1;
                        }
                        mPredictedOMRs.put(sb.toString(), answer.toString());
                        Log.d(TAG, "key: " + sb.toString() + " answer: " + answer.toString());
                    }

                    if (roi.getString("method").equals("classify")) {
                        StringBuilder sb    = new StringBuilder().append(roi.getInt("row")).append("_").append(roi.getInt("col")).append("_").append(roi.getInt("index"));
                        mPredictedDigits.put(sb.toString(), "0");

                        Mat digitROI        = mDetectShaded.getROIMat(tableMat, roi.getInt("top"), roi.getInt("left"), roi.getInt("bottom"), roi.getInt("right"));
                        if(hwClassifier != null) {
                            Log.d(TAG, "Requesting prediction for: " + sb.toString());
                            hwClassifier.classifyMat(digitROI, sb.toString());
                        }
                    }
                }
                mIsClassifierRequestSubmitted = true;
                Log.d(TAG, "Detected OMR count: " + mPredictedOMRs.size() + " classifier count: " + mPredictedDigits.size());

            } catch (JSONException e) {
                Log.e(TAG, "got JSON exception");
            }
        }
    }

    private JSONArray getROIs() {
        if (mScannerType == SCANNER_TYPE.SCANNER_SAT) {
            return mROIs.getGJSAT_ROIs();
        }
        return null;
    }

    private void handleDigitsPredictions(DigitModel digit, String id) {
        if (digit.getConfidence() < 0.9) {
            // LOW CONFIDENCE SCORE
            mPredictedDigits.put(id, new Integer(0).toString());
        } else {
            mPredictedDigits.put(id, String.valueOf(new Integer(digit.getDigit())));
        }

        //Only Roll Number to store in mPredictedDigitModel for PredictionFilter
        Character firstChar = new Character(id.charAt(0));
        Character matchingChar = new Character('-');
        if(firstChar.equals(matchingChar)) {
            for (int index = 0; index < 7; index++) {
                String key = -1 + "_" + -1 + "_" + index;
                if(key.equals(id)) {
                    mPredictedDigitModel.put(String.valueOf(index), digit);
                    break;
                }
            }
        }
    }

    private void processScanningCompleted() {
        if (mScanningResultShared){
            return;
        }
        mScanningResultShared   = true;

        MediaActionSound sound  = new MediaActionSound();
        sound.play(MediaActionSound.SHUTTER_CLICK);

        JSONObject  response        = getScanResult();
        Log.d(TAG, "Scanning completed OMR count: " + mPredictedOMRs.size() + " classifier count: " + mPredictedDigits.size());

        ReactInstanceManager mReactInstanceManager  = getReactNativeHost().getReactInstanceManager();
        ReactContext reactContext                   = mReactInstanceManager.getCurrentReactContext();
        Intent sendData                             = new Intent(reactContext, GJSATScannerActivity.class);

        sendData.putExtra("fileName", response.toString());
        mReactInstanceManager.onActivityResult(null, 1, 2, sendData);
        finish();
    }

    private JSONObject getScanResult() {
        JSONObject result       = new JSONObject();
        try {
            Log.d(TAG, "mPredictedDigits: " + new JSONObject(mPredictedDigits).toString());
            Log.d(TAG, "mPredictedOMRs: " + new JSONObject(mPredictedOMRs).toString());

            result.put("scanner", mScannerType);
            JSONArray students  = getStudentAndMarks();

            result.put("students", students);
            result.put("predict", new Double((SystemClock.uptimeMillis() - mStartPredictTime)/1000.0));
            result.put("total", new Double((SystemClock.uptimeMillis() - mStartTime)/1000.0));

        } catch (JSONException e) {
            return result;
        }

        return result;
    }

    private JSONArray getStudentAndMarks() {
        JSONArray students  = new JSONArray();
        JSONArray rolls     = getStudentRoll();
        JSONArray allMarks  = getStudentsMarks();

        try {
            if (rolls.length() > 0 && allMarks.length() > 0) {
                for (int i = 0; i < rolls.length(); i++) {
                    JSONObject roll     = rolls.getJSONObject(i);
                    JSONObject student  = new JSONObject();
                    JSONArray marks     = new JSONArray();

                    student.put("roll", roll.getString("roll"));

                    for (int j = 0; j < allMarks.length(); j++) {
                        JSONObject mark = allMarks.getJSONObject(j);
                        JSONObject studentMark  = new JSONObject();
                        studentMark.put("question", mark.getInt("question"));
                        studentMark.put("mark", mark.getString("mark"));
                        marks.put(studentMark);
                    }
                    student.put("marks", marks);
                    students.put(student);
                }
            }
        } catch (JSONException e) {
            return students;
        }
        return students;
    }

    private JSONArray getStudentRoll() {
        int rows = 1;
        int cols = 1;

        JSONArray students  = new JSONArray();
        try {
            StringBuffer sb = new StringBuffer();
            for (int index = 0; index < 7; index++) {
                String key = -1 + "_" + -1 + "_" + index;
                String result  = mPredictedDigits.get(key);
                if (result != null) {
                    sb.append(result);
                }
            }
            JSONObject student  = new JSONObject();
            student.put("roll", sb.toString());

            //Prediction Filter
            List<String> predResult = PredictionFilter.applyApproach1(mPredictedDigitModel, rollNumberPool);
            Log.i(TAG, "Approach1========>" + predResult);
            //If we have approach1 result then updating the predicted roll number
            if (predResult.size() > 0)
                student.put("roll", predResult.get(0));

            students.put(student);
        } catch (JSONException e) {
            Log.e(TAG, "Unable to collect students roll");
            return students;
        }
        return students;
    }

    private JSONArray getStudentsMarks() {
        int rows    = 6;
        int cols    = 2;

        JSONArray marks  = new JSONArray();
        JSONArray rois   = getROIs();
        try {
            for (int row = 0; row < rows; row++) {
                for (int col = 0; col < cols; col++) {
                    String key1     = row + "_" + col  + "_" + 0;
                    String result1  = mPredictedDigits.get(key1);
                    String key2     = row + "_" + col  + "_" + 1;
                    String result2  = mPredictedDigits.get(key2);

                    if (result1 != null && result2 != null) {
                        JSONObject mark  = new JSONObject();
                        mark.put("row", row);

                        for (int i = 0; i < rois.length(); i++) {
                            JSONObject roi = rois.getJSONObject(i);
                            if (roi.getInt("row") == row && roi.getInt("col") == col) {
                                mark.put("question", roi.getInt("question"));
                                break;
                            }
                        }

                        mark.put("mark", result1 + result2);
                        marks.put(mark);
                    }
                }
            }
        } catch (JSONException e) {
            Log.e(TAG, "Unable to collect students marks");
            return marks;
        }
        return marks;
    }

    private void showProcessingInformation(Mat image) {
        String text     = "Please wait .. in progress ..";
        Point position  = new Point(image.width()/5, image.height() / 2);
        Scalar color    = new Scalar(0, 0, 255);
        int font        = Imgproc.COLOR_BGR2GRAY;
        int scale       = 1;
        int thickness   = 3;
        Imgproc.putText(image, text, position, font, scale, color, thickness);
    }

}
