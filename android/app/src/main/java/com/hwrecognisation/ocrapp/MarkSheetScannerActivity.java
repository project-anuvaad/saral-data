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
import com.google.common.collect.Lists;
import com.hwrecognisation.R;
import com.hwrecognisation.commons.*;
import com.hwrecognisation.hwmodel.*;
import com.hwrecognisation.opencv.*;
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

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;

public class MarkSheetScannerActivity extends ReactActivity implements CameraBridgeViewBase.CvCameraViewListener2 {
    private static final String  TAG                    = "OCRApp::MarkSheet";
    private static long mframeCount                     = 0;
    private static long mIgnoreFrameCount               = 0;
    private static final int START_PROCESSING_COUNT     = 20;
    private static final int MAX_FRAME_FOR_DIGITS       = 20;
    private static final int MAX_FRAME_FOR_OMRS         = 20;
    private static final int MAX_FRAMES_TO_PROCESS      = 100;
    private long    mStartTime;
    private long    mTableDetectionTimeFirst            = 0;
    private boolean mInformedResult                     = false;

    private Mat mRgba;

    private CameraBridgeViewBase mOpenCvCameraView;
    private TableCornerCirclesDetection     mTableCornerDetection;
    private ExtractTableRows                mExtractTableROIs;
    private ExtractRollRow                  mExtractRollRow;
    private DetectCircles                   mCircleDetect;
    private BlurDetection                   blurDetection;

    private HWClassifier hwClassifier;
    private int mScannerType                            = SCANNER_TYPE.SCANNER_PAT;
    private boolean isHWClassiferAvailable = true;

    private HashMap<String, Integer> mPredictedDigits    = new HashMap<>();
    private HashMap<String, DigitModel> mPredictedDigitModel    = new HashMap<>();
    private HashMap<String, String> mPredictedOMRs      = new HashMap<>();
    private String[] rollNumberPool;

    /**
     * In order to avoid multiple predictions, we need to stop process of frame
     * when it is no longer needed. Subsequent variables are meant to do this household chores
     */
    private boolean     ROLL_CODE_COMPLETED     = false;
    private boolean     OMR_BOX_0_COMPLETED     = false;
    private boolean     OMR_BOX_1_COMPLETED     = false;
    private boolean     OMR_BOX_2_COMPLETED     = false;
    private boolean     OMR_BOX_3_COMPLETED     = false;
    private boolean     OMR_BOX_4_COMPLETED     = false;


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
    public MarkSheetScannerActivity() {
        Log.i(TAG, "Instantiated new " + this.getClass());
    }

    /** Called when the activity is first created. */
    @SuppressLint("SourceLockedOrientationActivity")
    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.i(TAG, "called onCreate");
        super.onCreate(savedInstanceState);
        if(getIntent().hasExtra("scanner")) {
            mScannerType = getIntent().getIntExtra("scanner", 1);
            Log.d(TAG, "Scanner type: " + mScannerType);
        }
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
        setContentView(R.layout.activity_marksheet_scanner);

        mOpenCvCameraView = (CameraBridgeViewBase) findViewById(R.id.color_blob_detection_activity_surface_view);
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
                Log.i(TAG, "NumberPool:" + Arrays.toString(rollNumberPool));
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
                hwClassifier    = new HWClassifier(MarkSheetScannerActivity.this, mScannerType, new PredictionListener() {
                    @Override
                    public void OnPredictionSuccess(int digit, float confidence,  String id) {
                        Log.d(TAG, "predicted digit:" + digit + " unique id:" + id);
//                        handleDigitsPredictions(digit, id);
                        if (confidence <= 0.98) {
                            handleDigitsPredictions(0, id);
                        } else {
                            handleDigitsPredictions(digit, id);
                        }
                        if (mPredictedDigits.size() == ExtractRollRow.getMaxRollRowSize()) {
                            isHWClassiferAvailable = true;
                            mPredictedOMRs.put("predict", new Double( ((double)SystemClock.uptimeMillis() - (double)mStartTime)/1000).toString());
                            Log.d(TAG, "Time taken to predict: " + (SystemClock.uptimeMillis() - mStartTime));
                        }
                    }

                    @Override
                    public void OnPredictionMapSuccess(DigitModel digitMap, String id) {
                        //Log.d(TAG, "predicted digit:" + digitMap.getDigit() + " unique id:" + id);
                        handleDigitsPredictions(digitMap, id);
                        if (mPredictedDigits.size() == ExtractRollRow.getMaxRollRowSize()) {
                            isHWClassiferAvailable = true;
                            mPredictedOMRs.put("predict", new Double(((double) SystemClock.uptimeMillis() - (double) mStartTime) / 1000).toString());
                            Log.d(TAG, "Time taken to predict: " + (SystemClock.uptimeMillis() - mStartTime));
                        }
                    }

                    @Override
                    public void OnPredictionFailed(String error) {
                        Log.e(TAG, "Model prediction failed");
                    }

                    @Override
                    public void OnModelLoadStatus(String message) {
                        Log.d(TAG, "Model load status: " + message);
                    }
                });

                hwClassifier.initialize();

            } catch (IOException e) {
                Log.e(TAG, "Failed to load HWClassifier", e);
            }
        }
    }

//    @Override
//    public List<? extends CameraBridgeViewBase> getCameraViewList() {
//        return Collections.singletonList(mOpenCvCameraView);
//    }

    public void onDestroy() {
        super.onDestroy();
        if (mOpenCvCameraView != null)
            mOpenCvCameraView.disableView();
    }
    private final static double LEARNING_RATE = 0.01;

    @Override
    public List<? extends CameraBridgeViewBase> getCameraViewList() {
        return null;
    }

    public void onCameraViewStarted(int width, int height) {
        mRgba                   = new Mat(height, width, CvType.CV_8UC4);
        mTableCornerDetection   = new TableCornerCirclesDetection(false);
        mExtractTableROIs       = new ExtractTableRows(false);
        mExtractRollRow         = new ExtractRollRow(true);
        mCircleDetect           = new DetectCircles(true);
        blurDetection                   = new BlurDetection(false);
        isHWClassiferAvailable  = true;
        mInformedResult         = false;
        mIgnoreFrameCount       = 0;
        mframeCount             = 0;
        OMR_BOX_0_COMPLETED     = false;
        OMR_BOX_1_COMPLETED     = false;
        OMR_BOX_2_COMPLETED     = false;
        OMR_BOX_3_COMPLETED     = false;
        OMR_BOX_4_COMPLETED     = false;
        ROLL_CODE_COMPLETED     = false;
    }

    public void onCameraViewStopped() {
        mRgba.release();
    }

    public Mat onCameraFrame(CameraBridgeViewBase.CvCameraViewFrame inputFrame) {
        mRgba               = inputFrame.rgba();
        processCameraFrame(mRgba, mframeCount);
        mframeCount ++;
//        if (!mInformedResult) {
//            processOCRResponse();
//        }
        return mRgba;
    }

    private void processCameraFrame(Mat image, long frameCount) {
        Mat tableMat        = mTableCornerDetection.processMat(image,25,30);

        if (tableMat != null) {
            if (mTableDetectionTimeFirst == 0) {
                mTableDetectionTimeFirst = SystemClock.uptimeMillis();
            }

           if (mIgnoreFrameCount < START_PROCESSING_COUNT) {
               mIgnoreFrameCount ++;
               return;
           }
            Log.d(TAG, "processCameraFrame: blurDetection before:: "+blurDetection.detectBlur(tableMat));
            if(blurDetection.detectBlur(tableMat)) {
                Log.d(TAG, "processCameraFrame: blurDetection after:: "+blurDetection.detectBlur(tableMat));
                return;
            }
            Log.d(TAG, "Received Table image, detecting respective columns ROIs");
            
            List<BoxRect> tableBoxes    = mExtractTableROIs.processMat(image, tableMat,
                    mTableCornerDetection.getmROI(),
                    mTableCornerDetection.getmTopLeft(),
                    mTableCornerDetection.getmTopRight(),
                    mTableCornerDetection.getmBottomLeft(),
                    mTableCornerDetection.getmBottomRight());
            Log.d(TAG, "Detected " + tableBoxes.size() + " rows in the table");

            if (tableBoxes.size() == ExtractRollRow.getMaxRollRowSize()) {

                if (isHWClassiferAvailable && !ROLL_CODE_COMPLETED) {
                    if (tableBoxes.get(0).width < 200 || tableBoxes.get(0).height < 50)
                        return;
                    if (mExtractRollRow.processMat(image,
                            mExtractTableROIs.getPOIMat(tableMat, tableBoxes.get(0)),
                            new Point(mTableCornerDetection.getmTopLeft().x, mTableCornerDetection.getmTopLeft().y),
                            new Point(tableBoxes.get(0).getCropRect().x, tableBoxes.get(0).getCropRect().y)
                    )) {
                        MediaActionSound sound = new MediaActionSound();
                        sound.play(MediaActionSound.FOCUS_COMPLETE);

                        List <Mat> mats = mExtractRollRow.getmMats();
                        for (int i = 0; i < mats.size(); i++) {
                            if(hwClassifier != null) {
                                hwClassifier.classifyMat(mats.get(i),  0 +"."+ new Integer(i).toString());
                            }
                        }
                        mStartTime              = SystemClock.uptimeMillis();
                        isHWClassiferAvailable = false;
                    } else {
                        return;
                    }
                }

                for (int i = 2; i < tableBoxes.size(); i++) {

                    if ((i == 2) && !OMR_BOX_0_COMPLETED) {
                        if (mCircleDetect.processMat(image,
                                mExtractTableROIs.getPOIMat(tableMat, tableBoxes.get(i)),
                                new Point(mTableCornerDetection.getmTopLeft().x, mTableCornerDetection.getmTopLeft().y),
                                new Point(tableBoxes.get(i).getCropRect().x, tableBoxes.get(i).getCropRect().y)
                        )) {
                            Log.d(TAG, "Table Box" + (i - 1) + " Result:" + mCircleDetect.getmShadedIndex());
                            mPredictedOMRs.put("box_" + new Integer(i - 1).toString(), mCircleDetect.getmShadedIndex());
                            OMR_BOX_0_COMPLETED = true;
                        } else {
                            return;
                        }
                    }

                    if ((i == 3) && !OMR_BOX_1_COMPLETED) {
                        if (mCircleDetect.processMat(image,
                                mExtractTableROIs.getPOIMat(tableMat, tableBoxes.get(i)),
                                new Point(mTableCornerDetection.getmTopLeft().x, mTableCornerDetection.getmTopLeft().y),
                                new Point(tableBoxes.get(i).getCropRect().x, tableBoxes.get(i).getCropRect().y)
                        )) {
                            Log.d(TAG, "Table Box" + (i - 1) + " Result:" + mCircleDetect.getmShadedIndex());
                            mPredictedOMRs.put("box_" + new Integer(i - 1).toString(), mCircleDetect.getmShadedIndex());
                            OMR_BOX_1_COMPLETED = true;
                        } else {
                            return;
                        }
                    }

                    if ((i == 4) && !OMR_BOX_2_COMPLETED) {
                        if (mCircleDetect.processMat(image,
                                mExtractTableROIs.getPOIMat(tableMat, tableBoxes.get(i)),
                                new Point(mTableCornerDetection.getmTopLeft().x, mTableCornerDetection.getmTopLeft().y),
                                new Point(tableBoxes.get(i).getCropRect().x, tableBoxes.get(i).getCropRect().y)
                        )) {
                            Log.d(TAG, "Table Box" + (i - 1) + " Result:" + mCircleDetect.getmShadedIndex());
                            mPredictedOMRs.put("box_" + new Integer(i - 1).toString(), mCircleDetect.getmShadedIndex());
                            OMR_BOX_2_COMPLETED = true;
                        } else {
                            return;
                        }
                    }

                    if ((i == 5) && !OMR_BOX_3_COMPLETED) {
                        if (mCircleDetect.processMat(image,
                                mExtractTableROIs.getPOIMat(tableMat, tableBoxes.get(i)),
                                new Point(mTableCornerDetection.getmTopLeft().x, mTableCornerDetection.getmTopLeft().y),
                                new Point(tableBoxes.get(i).getCropRect().x, tableBoxes.get(i).getCropRect().y)
                        )) {
                            Log.d(TAG, "Table Box" + (i - 1) + " Result:" + mCircleDetect.getmShadedIndex());
                            mPredictedOMRs.put("box_" + new Integer(i - 1).toString(), mCircleDetect.getmShadedIndex());
                            OMR_BOX_3_COMPLETED = true;
                        } else {
                            return;
                        }
                    }

                    if ((i == 6) && !OMR_BOX_4_COMPLETED) {
                        if (mCircleDetect.processMat(image,
                                mExtractTableROIs.getPOIMat(tableMat, tableBoxes.get(i)),
                                new Point(mTableCornerDetection.getmTopLeft().x, mTableCornerDetection.getmTopLeft().y),
                                new Point(tableBoxes.get(i).getCropRect().x, tableBoxes.get(i).getCropRect().y)
                        )) {
                            Log.d(TAG, "Table Box" + (i - 1) + " Result:" + mCircleDetect.getmShadedIndex());
                            mPredictedOMRs.put("box_" + new Integer(i - 1).toString(), mCircleDetect.getmShadedIndex());
                            OMR_BOX_4_COMPLETED = true;
                        } else {
                            return;
                        }
                    }
                }
            }
            if (!mInformedResult) {
                processOCRResponse();
            }
        }
    }

    private void handleDigitsPredictions(int digit, String id) {
        mPredictedDigits.put(id, new Integer(digit));

        if (mPredictedDigits.size() == ExtractRollRow.getMaxRollRowSize()) {
            ROLL_CODE_COMPLETED     = true;
        }
    }

    private void handleDigitsPredictions(DigitModel digit, String id) {
        mPredictedDigits.put(id, new Integer(digit.getDigit()));
        String[] idResult = id.split("[.]");
        mPredictedDigitModel.put(idResult[1], digit);

        if (mPredictedDigits.size() == ExtractRollRow.getMaxRollRowSize()) {
            ROLL_CODE_COMPLETED = true;
        }
    }

    private void processOCRResponse() {
        Log.d(TAG, "frame count: " + mframeCount +
                " OMR 01: " + OMR_BOX_0_COMPLETED +
                " OMR 02: " + OMR_BOX_1_COMPLETED +
                " OMR 03: " + OMR_BOX_2_COMPLETED +
                " OMR 04: " + OMR_BOX_3_COMPLETED +
                " OMR 05: " + OMR_BOX_4_COMPLETED +
                " ROLL: "   + ROLL_CODE_COMPLETED);
        if (OMR_BOX_0_COMPLETED && OMR_BOX_1_COMPLETED && OMR_BOX_2_COMPLETED && OMR_BOX_3_COMPLETED && OMR_BOX_4_COMPLETED && ROLL_CODE_COMPLETED) {
            MediaActionSound sound = new MediaActionSound();
            sound.play(MediaActionSound.SHUTTER_CLICK);

//            mPredictedOMRs.put("total", new Double( ((double)SystemClock.uptimeMillis() - (double)mTableDetectionTimeFirst)/1000).toString());
//
//            List<String> keys           = new ArrayList<String>(mPredictedDigits.keySet());
//            StringBuffer sb             = new StringBuffer();
//            for (int i = 0; i < keys.size(); i++) {
//                sb.append(mPredictedDigits.get("digit_" + i));
//            }

            String response = "";
//            JSONObject  response        = new JSONObject();
            try {
//                response.put("roll", sb.toString());
                if (mPredictedOMRs.containsKey("box_1")) {
//                    response.put("box_1", mPredictedOMRs.get("box_1"));
                    mPredictedDigits.put("1.0", Integer.parseInt(mPredictedOMRs.get("box_1")));
                }
                if (mPredictedOMRs.containsKey("box_2")) {
//                    response.put("box_2", mPredictedOMRs.get("box_2"));
                    mPredictedDigits.put("2.0", Integer.parseInt(mPredictedOMRs.get("box_2")));
                }
                if (mPredictedOMRs.containsKey("box_3")) {
//                    response.put("box_3", mPredictedOMRs.get("box_3"));
                    mPredictedDigits.put("3.0", Integer.parseInt(mPredictedOMRs.get("box_3")));
                }
                if (mPredictedOMRs.containsKey("box_4")) {
//                    response.put("box_4", mPredictedOMRs.get("box_4"));
                    mPredictedDigits.put("4.0", Integer.parseInt(mPredictedOMRs.get("box_4")));
                }
                if (mPredictedOMRs.containsKey("box_5")) {
//                    response.put("box_5", mPredictedOMRs.get("box_5"));
                    mPredictedDigits.put("5.0", Integer.parseInt(mPredictedOMRs.get("box_5")));
                }
                response  = getPredictionResponse(mPredictedDigits,mPredictedDigitModel);
//
//                if (mPredictedOMRs.containsKey("predict")) { response.put("predict", mPredictedOMRs.get("predict")); }
//                if (mPredictedOMRs.containsKey("total")) { response.put("total", mPredictedOMRs.get("total")); }

            } catch (Exception e) {
                e.printStackTrace();
                Log.e(TAG, "Error creating JSON object");
                return;
            }
            Log.d(TAG, "FRAME COUNT: "+ mframeCount + " FINAL RESPONSE: " + response);
            Log.d(TAG, "-- NO MORE PROCESSING REQUIRED -- ");

            mInformedResult = true;
//            Intent intent = new Intent(this, MarkSheetResultActivity.class);
//            intent.putExtra("marksheet_ocr", response);

            ReactInstanceManager mReactInstanceManager  = getReactNativeHost().getReactInstanceManager();
            ReactContext reactContext                   = mReactInstanceManager.getCurrentReactContext();
            Intent sendData                             = new Intent(reactContext, MarkSheetScannerActivity.class);

            sendData.putExtra("fileName", response);
            mReactInstanceManager.onActivityResult(null, 1, 2, sendData);
//            startActivity(intent);
            finish();
        }
    }


    private String getPredictionResponse(HashMap<String, Integer> predict, HashMap<String, DigitModel> mPredictedDigitModel) {
        int MAX_CHAR_LENGTH_IN_BOX  = 10;
        List<String> keys           = new ArrayList<String>(predict.keySet());
        HashMap<Integer, String> rsp = new HashMap<Integer, String>();

        for (int i = 0; i < keys.size(); i++) {
            StringBuffer sb = new StringBuffer();
                for (int j = 0; j < MAX_CHAR_LENGTH_IN_BOX; j++) {
                    String key  = i + "." + j;
                    if (!predict.containsKey(key))
                        break;
                    sb.append(predict.get(key));
                }

            if (i > 0) {
                rsp.put(new Integer(i+1), sb.toString());
            } else {
                rsp.put(new Integer(i), sb.toString());
            }
        }
        rsp.put(new Integer(1), "DD/MM/YYYY");

        List <Mat> mats = mExtractRollRow.getmMats();
        for (int i = 0; i < mats.size(); i++) {
            Mat image           = mats.get(i);
            Bitmap resultBitmap = Bitmap.createBitmap(image.cols(), image.rows(), Bitmap.Config.ARGB_8888);
            Utils.matToBitmap(image, resultBitmap);

            ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
            resultBitmap.compress(Bitmap.CompressFormat.JPEG, 100, byteArrayOutputStream);
            byte[] byteArray    = byteArrayOutputStream.toByteArray();
            String base64       = Base64.encodeToString(byteArray, Base64.DEFAULT);
            rsp.put(Integer.valueOf(7+i), base64);
        }
        JSONObject jsonRsp  = new JSONObject();
        JSONArray jsonArray = new JSONArray();
        try {
            try {
                if (rollNumberPool != null && rollNumberPool.length > 1) {
                    List<String> predResult = PredictionFilter.applyApproach1(mPredictedDigitModel, rollNumberPool);
                    Log.i(TAG, "Approach1========>" + predResult);
                    //If we have approach1 result then updating the predicted roll number
                    if (predResult.size() > 0)
                        rsp.put(0, predResult.get(0));
                } else {
                    Log.i(TAG, "Approach1========> Roll number pool is empty");
                }
            }catch (Exception ex){
                ex.printStackTrace();
            }

            for (int i = 0; i < rsp.size(); i++) {
                JSONObject box = new JSONObject();
                box.put((new Integer(i)).toString(), rsp.get(new Integer(i)));
                jsonArray.put(box);
            }
            jsonRsp.put("table", jsonArray);
        } catch (JSONException e) {
            Log.d(TAG, "failed to create JSON response");
            return null;
        }
        /**
         * This can be returned and sent to the activity
         */
        Log.d(TAG, "formatted prediction: " + jsonRsp.toString());
        return jsonRsp.toString();
    }

}
