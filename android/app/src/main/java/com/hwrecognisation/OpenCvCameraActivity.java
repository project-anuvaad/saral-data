package com.hwrecognisation;


import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Matrix;
import android.media.MediaActionSound;
import android.os.Bundle;
import android.os.Environment;
import android.os.SystemClock;
import android.util.Log;
import android.view.SurfaceView;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.TextView;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.modules.core.DeviceEventManagerModule;


import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.opencv.android.*;
import org.opencv.calib3d.Calib3d;
import org.opencv.core.Core;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.MatOfPoint;
import org.opencv.core.MatOfPoint2f;
import org.opencv.core.Point;
import org.opencv.core.Rect;
import org.opencv.core.Scalar;
import org.opencv.core.Size;
import org.opencv.imgproc.Imgproc;
import org.opencv.videoio.VideoWriter;
import org.opencv.videoio.Videoio;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

public class OpenCvCameraActivity extends ReactActivity implements CameraBridgeViewBase.CvCameraViewListener2 {
    private static String TAG   =   "opencv";

    private CameraBridgeViewBase mCvCamView;
    Mat mRgba;
    Float cameraDistance;
    private FrameLayout container;
    private double AREA_THRESHOLD_LOWER = 180000.00;
    private double AREA_THRESHOLD_START = 80000.00;                  //285000.00;
    private double AREA_THRESHOLD_END   = 150000.00;                 //290000.00;
    private double AREA_THRESHOLD_UPPER = 240000.00;
    private static final long TIMEOUT   = 1L;

    private int     MAX_WIDTH           = 640;
    private int     MAX_HEIGHT          = 480;
    private int     detectedContours    = 0;
    private int     MAX_FRAMES_COUNT    = 7;
    private int     MAX_STUID_FRAMES_COUNT    = 10;
    private int     MAX_SKIP_FRAME_COUNT    = 50;

    TextView                            textViewArea;
    Mat                                 imgCloned;
    VideoWriter                         videoWriter;

    private HWClassifier                hwClassifier;
    private HashMap<String, Integer>    digitPredsMap;
    private List<List<Mat>>             digitMats;
    private int                         frameCount;
    private int                         stuIDframeCount;
    private int                         maxSkipFrameCount;
    private PredictionListener          predictionListener;

    long startTime;

    private BaseLoaderCallback mLoaderCallback = new BaseLoaderCallback(this) {
        @Override
        public void onManagerConnected(int status) {
            switch (status) {
                case LoaderCallbackInterface.SUCCESS:
                    mCvCamView.enableView();
                    break;
                default:
                    super.onManagerConnected(status);
                    break;
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(R.layout.activity_main);

        container = findViewById(R.id.frameLayout);
        textViewArea = findViewById(R.id.textViewArea);
        mCvCamView = (JavaCameraView) findViewById(R.id.cam_view);
        mCvCamView.setVisibility(SurfaceView.VISIBLE);
        mCvCamView.setCvCameraViewListener(this);
        mCvCamView.setMaxFrameSize(MAX_WIDTH, MAX_HEIGHT);
        mCvCamView.enableFpsMeter();
        cameraDistance = mCvCamView.getCameraDistance();
        Log.d(TAG, "cameraDistancecameraDistance :: "+ cameraDistance);
        mCvCamView.setCameraIndex(0); // front-camera(1),  back-camera(0)
        mLoaderCallback.onManagerConnected(LoaderCallbackInterface.SUCCESS);

        predictionListener  = new PredictionListener() {
            @Override
            public void OnPredictionSuccess(int digit, String id) {
                digitPredsMap.put(id, new Integer(digit));
                Log.d(TAG, "Prediction :: id :: " + id + " Digit ::" + digit + " Total contours :: " + detectedContours + "Received prediction :: " + digitPredsMap.size() );
                if (detectedContours == digitPredsMap.size()) {
                    detectedContours    = 0;
                    String response     = getPredictionResponse(digitPredsMap);

                    /**
                     * This should be removed. This is just for testing
                     */
//                    String originalImageFilename    = saveImage(imgCloned, "original");
//                    Mat sharped                     = imgCloned.clone();
//                    Imgproc.cvtColor(sharped, sharped, Imgproc.COLOR_BGR2GRAY);
//                    Imgproc.adaptiveThreshold(sharped, sharped, 255, Imgproc.ADAPTIVE_THRESH_MEAN_C, Imgproc.THRESH_BINARY, 5, 4);

                    ReactInstanceManager mReactInstanceManager  = getReactNativeHost().getReactInstanceManager();
                    ReactContext reactContext                   = mReactInstanceManager.getCurrentReactContext();
                    Intent sendData                             = new Intent(reactContext, OpenCvCameraActivity.class);
//                    String sharpedImage                         = saveImage(sharped, "sharped");

                    sendData.putExtra("fileName", response);
                    mReactInstanceManager.onActivityResult(null, 1, 2, sendData);
                    long endTime = SystemClock.uptimeMillis();
                    System.out.println("Timecost to predict: " + (endTime - startTime) + " Start time : "+startTime+ " endTime : "+endTime);
                    digitPredsMap   = null;
                    digitMats       = null;
                    frameCount      = 0;
                    stuIDframeCount = 0;
                    maxSkipFrameCount=0;
                }
            }

            @Override
            public void OnPredictionFailed(String error) {

            }
        };
        digitPredsMap   = new HashMap<String, Integer>();
        digitMats       = new ArrayList<List<Mat>>();
        frameCount      = 0;
        stuIDframeCount = 0;
        maxSkipFrameCount=0;
//        deleteImageFromGallery("");
    }

    private String getPredictionResponse(HashMap<String, Integer> predict) {
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

        JSONObject jsonRsp  = new JSONObject();
        JSONArray jsonArray = new JSONArray();
        try {
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

    @Override
    public void onPause() {
        super.onPause();
        if (mCvCamView != null)
            mCvCamView.disableView();
    }

    @Override
    public void onResume() {
        super.onResume();
        if (!OpenCVLoader.initDebug()) {
            Log.d(TAG, "onResume :: Internal OpenCV library not found.");
            OpenCVLoader.initAsync(OpenCVLoader.OPENCV_VERSION_3_4_0, this, mLoaderCallback);
        } else {
            Log.d(TAG, "onResume :: OpenCV library found inside package. Using it!");
            mLoaderCallback.onManagerConnected(LoaderCallbackInterface.SUCCESS);
        }

        try {
            hwClassifier    = new HWClassifier(OpenCvCameraActivity.this, predictionListener);
            hwClassifier.initialize();
            Log.d(TAG, "Loading HWClassifier successfully");
        } catch (IOException e) {
            Log.e(TAG, "Failed to load HWClassifier", e);
        }
    }

    public void onDestroy() {
        super.onDestroy();
        if (mCvCamView != null)
            mCvCamView.disableView();
    }

    @Override
    public List<? extends CameraBridgeViewBase> getCameraViewList() {
        return null;
    }

    public void onCameraViewStarted(int width, int height) {
        mRgba = new Mat(height, width, CvType.CV_8UC4);
        running = true;
        worker.start();
    }

    public void onCameraViewStopped() {
        mRgba.release();
    }


    boolean running = true;

    private BlockingQueue<Mat> processingFrames = new LinkedBlockingQueue<>();

    final Thread worker = new Thread(new Runnable() {

        @Override
        public void run() {
            while (running) {
                Mat inputFrame = null;
                try {
                    inputFrame = processingFrames.poll(TIMEOUT, TimeUnit.MILLISECONDS);
                    if (inputFrame == null) {
                        // timeout. Also, with a try {} catch block poll can be interrupted via Thread.interrupt() so not to wait for the timeout.
                        continue;
                    } else {
                        running = processMatData(inputFrame);
                    }
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        }
    });

    private final Mat homographicTransformation(Mat imgCloned, Point topLeftOriginal, Point bottomLeftOriginal, Point topRightOriginal, Point bottomRightOriginal) {

        ArrayList pointSource = new ArrayList();
        pointSource.add(new Point(topLeftOriginal.x, topLeftOriginal.y));
        pointSource.add(new Point(topRightOriginal.x, topRightOriginal.y));
        pointSource.add(new Point(bottomRightOriginal.x, bottomRightOriginal.y));
        pointSource.add(new Point(bottomLeftOriginal.x, bottomLeftOriginal.y));
        Size size = new Size(480, 640);

        Mat destinationMat = new Mat(size, CvType.CV_8UC3);

        ArrayList pointDestination = new ArrayList();
        pointDestination.add(new Point(0.0D, 0.0D));
        pointDestination.add(new Point(size.width - (double)1, 0.0D));
        pointDestination.add(new Point(size.width - (double)1, size.height - (double)1));
        pointDestination.add(new Point(0.0D, size.height - (double)1));
        MatOfPoint2f sourcePoint2f = new MatOfPoint2f();
        sourcePoint2f.fromList(pointSource);
        MatOfPoint2f destinationPoint2f = new MatOfPoint2f();
        destinationPoint2f.fromList(pointDestination);
        Mat he = Calib3d.findHomography(sourcePoint2f, destinationPoint2f);
        Imgproc.warpPerspective(imgCloned, destinationMat, he, size);
        return destinationMat;
    }

    public boolean processMatData(Mat mRgba) {
        boolean shallContinueProcessing     = true;
        imgCloned                           = mRgba.clone();

        if(imgCloned.empty()){
            return true;
        }
        Mat gray        = new Mat();
        Imgproc.cvtColor(imgCloned, gray, Imgproc.COLOR_BGR2GRAY);
        Imgproc.medianBlur(gray, gray, 5);
        Mat circles     = new Mat();
        Imgproc.HoughCircles(gray, circles, Imgproc.CV_HOUGH_GRADIENT,1.5,100.0, 100.0, 30.0, 15, 20);
        /**
         * Draw the detected circles.
         */
        if (circles.cols() > 0) {
            for (int x=0; x < Math.min(circles.cols(), 5); x++ ) {
                double circleVec[] = circles.get(0, x);
                if (circleVec == null) {
                    break;
                }

                Point center = new Point((int) circleVec[0], (int) circleVec[1]);
                int radius = (int) circleVec[2];
                Imgproc.circle(imgCloned, center, radius, new Scalar(40.0, 224.0, 125.0), 1);
            }
        }

        if (circles.cols() == 4) {
            List<Point> points = new ArrayList<Point>();
            for (int x = 0; x < circles.cols(); x++) {
                double[] c      = circles.get(0, x);
                Point center    = new Point(Math.round(c[0]), Math.round(c[1]));
                points.add(center);
                int radius      = (int) Math.round(c[2]);
                Imgproc.circle(imgCloned, center, radius, new Scalar(40.0, 224.0, 125.0), 2);
            }
            Collections.sort(points, (o1, o2) -> {
                if (o1.x > o2.x) {
                    return 1;
                } else if (o1.x < o2.x) {
                    return -1;
                } else {
                    return 0;
                }});

            List leftPoints = new ArrayList<Point>();
            List rightPoints = new ArrayList<Point>();

            leftPoints.add(0, points.get(0));
            leftPoints.add(1, points.get(1));

            rightPoints.add(0, points.get(2));
            rightPoints.add(1, points.get(3));

            Collections.sort(leftPoints, (Comparator<Point>) (o1, o2) -> {
                if (o1.y > o2.y) {
                    return 1;
                } else if (o1.y < o2.y) {
                    return -1;
                } else {
                    return 0;
                }
            });

            Collections.sort(rightPoints, (Comparator<Point>) (o1, o2) -> {
                if (o1.y > o2.y) {
                    return 1;
                } else if (o1.y < o2.y) {
                    return -1;
                } else {
                    return 0;
                } });

            Point topLeftOriginal       = (Point) leftPoints.get(0);
            Point topRightOriginal      = (Point) rightPoints.get(0);
            Point bottomLeftOriginal    = (Point) leftPoints.get(1);
            Point bottomRightOriginal   = (Point) rightPoints.get(1);

            Imgproc.line(imgCloned, topLeftOriginal, bottomLeftOriginal, new Scalar(40.0D, 224.0D, 125.0D), 3);
            Imgproc.line(imgCloned, bottomLeftOriginal, bottomRightOriginal, new Scalar(40.0D, 224.0D, 125.0D), 3);
            Imgproc.line(imgCloned, topLeftOriginal, topRightOriginal, new Scalar(40.0D, 224.0D, 125.0D), 3);
            Imgproc.line(imgCloned, topRightOriginal, bottomRightOriginal, new Scalar(40.0D, 224.0D, 125.0D), 3);

            double area = Math.abs((bottomRightOriginal.x - topLeftOriginal.x) * (bottomLeftOriginal.y - topRightOriginal.y));

            if (area < AREA_THRESHOLD_START && digitMats.size() == 0) {
                runOnUiThread(new Runnable() {
                    public void run() {
                        textViewArea.setText("Please bring your phone near to the paper. Area: " + area);
                        textViewArea.setVisibility(View.VISIBLE);
                    }
                });
            }
            if (area > AREA_THRESHOLD_END && digitMats.size() == 0) {
                runOnUiThread(new Runnable() {
                    public void run() {
                        textViewArea.setText("Please move your phone away from the paper. Area: " + area);
                        textViewArea.setVisibility(View.VISIBLE);
                    }
                });
            }

            if (area >= AREA_THRESHOLD_START && area <= AREA_THRESHOLD_END) {
                if (digitMats.size() == 0) {
                    runOnUiThread(new Runnable() {
                        public void run() {
                            textViewArea.setText("Trying to take optimal image, please hold on. Area: " + area);
                            textViewArea.setVisibility(View.VISIBLE);
                        }
                    });
                }

                int minY        = Math.min((int)topLeftOriginal.y, (int)topRightOriginal.y);
                int maxY        = Math.max((int)bottomLeftOriginal.y, (int)bottomRightOriginal.y);
                int maxHeight   = maxY-minY;

                int minX        = Math.min((int)topLeftOriginal.x, (int)bottomLeftOriginal.x);
                int maxX        = Math.max((int)topRightOriginal.x, (int)bottomRightOriginal.x);
                int maxWidth    = maxX-minX;

                Rect rectCrop = new Rect((int)((int)topLeftOriginal.x+(int)bottomLeftOriginal.x)/2, (int)topLeftOriginal.y-5, maxWidth, maxHeight+10);
                if (0 <= rectCrop.x
                        && 0 <= rectCrop.width
                        && rectCrop.x + rectCrop.width <= imgCloned.cols()
                        && 0 <= rectCrop.y
                        && 0 <= rectCrop.height
                        && rectCrop.y + rectCrop.height <= imgCloned.rows()) {

                    Mat capturedImage       = mRgba.clone();
                    Mat homographicImage    = homographicTransformation(capturedImage, topLeftOriginal, bottomLeftOriginal, topRightOriginal, bottomRightOriginal);

                    /**
                     * uncomment following line to see the original captured image and homographic image.
                     */
//                    saveImageToGallery(capturedImage, "original_");
//                    saveImageToGallery(homographicImage, "cropped_");

                    maxSkipFrameCount++;
                    if ( maxSkipFrameCount > MAX_SKIP_FRAME_COUNT && processImageRowsAndColumns(capturedImage.clone(), homographicImage, area) ) {
                        shallContinueProcessing   = false;
                    }
                }
            }
        }
        circles.release();
        return shallContinueProcessing;
    }

    public String saveImage(Mat data, String name) {
        ReactInstanceManager mReactInstanceManager = getReactNativeHost().getReactInstanceManager();
        ReactContext reactContext   = mReactInstanceManager.getCurrentReactContext();
        Bitmap resultBitmap         = Bitmap.createBitmap(data.cols(), data.rows(), Bitmap.Config.ARGB_8888);
        Utils.matToBitmap(data, resultBitmap);
        Matrix matrix               = new Matrix();
        matrix.setRotate(90F);
        Bitmap bmRotated = Bitmap.createBitmap(resultBitmap, 0, 0, resultBitmap.getWidth(), resultBitmap.getHeight(), matrix, true);

        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        bmRotated.compress(Bitmap.CompressFormat.JPEG, 100, byteArrayOutputStream);
        byte[] byteArray = byteArrayOutputStream.toByteArray();

        SimpleDateFormat sdf        = new SimpleDateFormat("yyyy-MM-dd_HH-mm-ss");
        String cacheDir             = reactContext.getCacheDir().getPath();
        String currentDateandTime   = sdf.format(new Date());
        String fileName = cacheDir +
                "/"+name+"_" + currentDateandTime + ".jpg";
//                        String fileName = Environment.getExternalStorageDirectory().getPath() +
//                                "/"+name+"_" + currentDateandTime + ".jpg";

        try {
            FileOutputStream fos = new FileOutputStream(fileName);

            fos.write(byteArray);
            fos.close();

        } catch (java.io.IOException e) {
            Log.d(TAG, "Exception in photoCallback", e);
        }
        return fileName;
    };

    public Mat onCameraFrame(CameraBridgeViewBase.CvCameraViewFrame inputFrame) {

        mRgba = inputFrame.rgba();
        try {
          processingFrames.put(mRgba);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        System.gc();
        return imgCloned; // This function must return
    }

    /**
     * Save image for debug purpose
     * @param data
     * @param fileName
     * @return
     */
    public String saveImageLocally(Mat data, String fileName) {
        Bitmap resultBitmap = Bitmap.createBitmap(data.cols(), data.rows(), Bitmap.Config.ARGB_8888);
        Utils.matToBitmap(data, resultBitmap);

        Matrix matrix = new Matrix();
        matrix.setRotate(90F);

        Bitmap bmRotated = Bitmap.createBitmap(resultBitmap, 0, 0, resultBitmap.getWidth(), resultBitmap.getHeight(), matrix, true);

        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        bmRotated.compress(Bitmap.CompressFormat.JPEG, 100, byteArrayOutputStream);
        byte[] byteArray = byteArrayOutputStream.toByteArray();

        try {
            FileOutputStream fos = new FileOutputStream(fileName);

            fos.write(byteArray);
            fos.close();

        } catch (java.io.IOException e) {
            Log.d(TAG, "Exception in photoCallback", e);
        }
        return fileName;
    };

    public String saveImageLocallyWithoutFlipping(Mat data, String fileName) {
        Bitmap resultBitmap = Bitmap.createBitmap(data.cols(), data.rows(), Bitmap.Config.ARGB_8888);
        Utils.matToBitmap(data, resultBitmap);

        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        resultBitmap.compress(Bitmap.CompressFormat.JPEG, 100, byteArrayOutputStream);
        byte[] byteArray = byteArrayOutputStream.toByteArray();

        try {
            FileOutputStream fos = new FileOutputStream(fileName);

            fos.write(byteArray);
            fos.close();

        } catch (java.io.IOException e) {
            Log.d(TAG, "Exception in photoCallback", e);
        }
        return fileName;
    };

    private void saveImageToGallery(Mat image, String name, boolean flip) {
        SimpleDateFormat sdf        = new SimpleDateFormat("yyyy-MM-dd_HH-mm-ss");
        String currentDateandTime   = sdf.format(new Date());
        String filepath = Environment.getExternalStorageDirectory().getPath() + "/"+name+"_" + currentDateandTime + ".jpg";
        if (flip) {
            saveImageLocally(image, filepath);
        } else {
            saveImageLocallyWithoutFlipping(image, filepath);
        }
    }

    private void deleteImageFromGallery(String name) {
        File dir = Environment.getExternalStorageDirectory();
        if (dir.isDirectory()) {
            String[] children = dir.list();
            for (int i = 0; i < children.length; i++) {
                String filename = children[i];
                if (filename.endsWith(".jpeg") || filename.endsWith(".jpg"))
                    new File(dir, filename).delete();
            }
        }
    }

    private String getVideoFilePath(String name, String ext) {
        String filepath = Environment.getExternalStorageDirectory().getPath() + "/" + name + "_" + getAlphaNumericString(5) + "." + ext;
        return filepath;
    }

    /**
     * subsequent functions will try to extract boxes between line2 and line3
     */
    private boolean processImageRowsAndColumns(Mat imageCaptured, Mat image, double area) {
        int NUM_OF_POINTS           = 24;
        int NUM_OF_CONTOURS_BOX0    = 7;

        Mat intersection            = getTableLinesIntersection(image);
        List<Rect> rects            = getTableCoordinates(intersection, NUM_OF_POINTS);
        List<Rect> rectCol1         = new ArrayList<>();
        List<Rect> rectCol2         = new ArrayList<>();
        List<Rect> rectCol3         = new ArrayList<>();

        Log.d(TAG, "Table intersections: " + rects.size());
//        for (int i = 0; i < rects.size(); i++) {
//            Rect r = rects.get(i);
//            Imgproc.rectangle(image, new Point(r.x, r.y), new Point(r.x + r.width, r.y + r.height), new Scalar(255, 255, 0, 255), 2);
//        }

        if (rects.size() != NUM_OF_POINTS) {
            return false;
        }

        if (digitMats.size() > 0) {
            runOnUiThread(new Runnable() {
                public void run() {
                    textViewArea.setText("Detected outer table and roll code. Area :" + area);
                    textViewArea.setVisibility(View.VISIBLE);
                }
            });
        }

        for (int i = 0; i < rects.size(); i++) {
            if (i < NUM_OF_POINTS/3) {
                rectCol1.add(rects.get(i));
            }
            if (i >= NUM_OF_POINTS/3 && i < (2*NUM_OF_POINTS)/3) {
                rectCol2.add(rects.get(i));
            }
            if (i >= (2*NUM_OF_POINTS)/3) {
                rectCol3.add(rects.get(i));
            }
        }

        List<Rect> sorted_rects1            = sortRects(rectCol1);
        List<Rect> sorted_rects2            = sortRects(rectCol2);
//        List<Rect> sorted_rects3     = sortRects(rectCol3);

        boolean isBox0ContourDetected       = false;
        List <Mat>          box0Mats        = null;
        HashMap<Integer, String> marks      = new HashMap<Integer, String>();
        boolean isBox2ContourDetected       = false;
        String  box2Circle                  = null;
        boolean isBox3ContourDetected       = false;
        String  box3Circle                  = null;
        boolean isBox4ContourDetected       = false;
        String  box4Circle                  = null;
        boolean isBox5ContourDetected       = false;
        String  box5Circle                  = null;
        boolean isBox6ContourDetected       = false;
        String  box6Circle                  = null;
        List<BoxRect> boxes                 = getBoxRects(sorted_rects1, sorted_rects2);
        Log.d(TAG, "Numbers of column boxes: " + boxes.size());

        /**
         * Let's draw ROI boxes
         */
//        for (int i = 0; i < boxes.size(); i++) {
//            Rect r = boxes.get(i).getCropRect();
//            if (0 <= r.x
//                    && 0 <= r.width
//                    && r.x + r.width <= image.cols()
//                    && 0 <= r.y
//                    && 0 <= r.height
//                    && r.y + r.height <= image.rows()) {
//                Imgproc.rectangle(image, new Point(r.x, r.y), new Point(r.x + r.width, r.y + r.height), new Scalar(255, 0, 0, 255), 2);
//            }
//        }

        for (int i = 0; i < boxes.size(); i++) {
            Rect r = boxes.get(i).getCropRect();
            if (0 <= r.x
                    && 0 <= r.width
                    && r.x + r.width <= image.cols()
                    && 0 <= r.y
                    && 0 <= r.height
                    && r.y + r.height <= image.rows()) {

                Mat boxMat = new Mat(image, r);
                if (i == 0) {
                    if (digitMats.size() > 0) {
                        frameCount ++;
                        isBox0ContourDetected = true;
                        Log.d(TAG, "CONTOURS :: success at box: " + i + " found : " +  digitMats.get(0).size() + " area: " + area);
                    } else {
                        List<Rect> boxRects = new ArrayList<>();
                        if(stuIDframeCount <= MAX_STUID_FRAMES_COUNT) {
                            boxRects = extractCharacters(boxMat, 1, 6);
                        } else if(stuIDframeCount > MAX_STUID_FRAMES_COUNT) {
                            boxRects = extractCharactersV2(boxMat, 1, 6);
                        }

                        Log.d(TAG, "CONTOURS :: At box: " + i + " contours detected : " + boxRects.size());
                        if (boxRects.size() > 0 && boxRects.size() == NUM_OF_CONTOURS_BOX0) {
                            isBox0ContourDetected = true;
                            box0Mats              = new ArrayList<Mat>(getDigitContoursMat(boxMat, boxRects));
                            Log.d(TAG, "CONTOURS :: success at box: " + i + " found : " + boxRects.size() + " area:" + area);
                            digitMats.add(box0Mats);

                            // Start counting frames. We will process next MAX_FRAMES_COUNT to detect
                            // OMR circle.
                            frameCount ++;
                        } else {
                            stuIDframeCount++;
                            isBox0ContourDetected   = false;
                            Log.d(TAG, "CONTOURS :: failed at box: " + i + " found : " + boxRects.size() + " area:" + area);
                        }
                    }
                }

                if (i == 2) {
                    if (digitPredsMap.containsKey("1.0")) {
                        isBox2ContourDetected = true;
                        Log.d(TAG, "CONTOURS :: success at box: " + i + " found : " + digitPredsMap.get("1.0") + " area:" + area);
                    } else {
                        box2Circle   = getShadedCircleV1(boxMat);
                        if (box2Circle != null) {
                            digitPredsMap.put("1.0", Integer.parseInt(box2Circle));
                            isBox2ContourDetected = true;
                            Log.d(TAG, "CONTOURS :: success at box: " + i + " found : " + box2Circle + " area:" + area);
                        } else {
                            isBox2ContourDetected = false;
                            Log.d(TAG, "CONTOURS :: failed at box: " + i + " area:" + area);
                        }
                    }
                }
                if (i == 3) {
                    if (digitPredsMap.containsKey("2.0")) {
                        isBox3ContourDetected = true;
                        Log.d(TAG, "CONTOURS :: success at box: " + i + " found : " + digitPredsMap.get("2.0") + " area:" + area);
                    } else {
                        box3Circle = getShadedCircleV1(boxMat);
                        if (box3Circle != null) {
                            digitPredsMap.put("2.0", Integer.parseInt(box3Circle));
                            isBox3ContourDetected = true;
                            Log.d(TAG, "CONTOURS :: success at box: " + i + " found : " + box3Circle + " area:" + area);
                        } else {
                            isBox3ContourDetected = false;
                            Log.d(TAG, "CONTOURS :: failed at box: " + i + " area:" + area);
                        }
                    }
                }
                if (i == 4) {
                    if (digitPredsMap.containsKey("3.0")) {
                        isBox4ContourDetected = true;
                        Log.d(TAG, "CONTOURS :: success at box: " + i + " found : " + digitPredsMap.get("3.0") + " area:" + area);
                    } else {
                        box4Circle   = getShadedCircleV1(boxMat);
                        if (box4Circle != null) {
                            digitPredsMap.put("3.0", Integer.parseInt(box4Circle));
                            isBox4ContourDetected = true;
                            Log.d(TAG, "CONTOURS :: success at box: " + i + " found : " + box4Circle + " area:" + area);
                        } else {
                            isBox4ContourDetected = false;
                            Log.d(TAG, "CONTOURS :: failed at box: " + i + " area:" + area);
                        }
                    }
                }
                if (i == 5) {
                    if (digitPredsMap.containsKey("4.0")) {
                        isBox5ContourDetected = true;
                        Log.d(TAG, "CONTOURS :: success at box: " + i + " found : " + digitPredsMap.get("4.0") + " area:" + area);
                    } else {
                        box5Circle   = getShadedCircleV1(boxMat);
                        if (box5Circle != null) {
                            digitPredsMap.put("4.0", Integer.parseInt(box5Circle));
                            isBox5ContourDetected = true;
                            Log.d(TAG, "CONTOURS :: success at box: " + i + " found : " + box5Circle + " area:" + area);
                        } else {
                            isBox5ContourDetected = false;
                            Log.d(TAG, "CONTOURS :: failed at box: " + i + " area:" + area);
                        }
                    }
                }
                if (i == 6) {
                    if (digitPredsMap.containsKey("5.0")) {
                        isBox6ContourDetected = true;
                        Log.d(TAG, "CONTOURS :: success at box: " + i + " found : " + digitPredsMap.get("5.0") + " area:" + area);
                    } else {
                        box6Circle   = getShadedCircleV1(boxMat);
                        if (box6Circle != null) {
                            digitPredsMap.put("5.0", Integer.parseInt(box6Circle));
                            isBox6ContourDetected = true;
                            Log.d(TAG, "CONTOURS :: success at box: " + i + " found : " + box6Circle + " area:" + area);
                        } else {
                            isBox6ContourDetected = false;
                            Log.d(TAG, "CONTOURS :: failed at box: " + i + " area:" + area);
                        }
                    }
                }
            }
        }

        /**
         * If frameCount increase than the MAX_FRAMES_COUNT, we kick-in exit condition by
         * setting up OMR circle results as 0
         */
        if (frameCount >= MAX_FRAMES_COUNT) {
            if (!digitPredsMap.containsKey("1.0")) {
                digitPredsMap.put("1.0", Integer.parseInt("0"));
                isBox2ContourDetected = true;
            }
            if (!digitPredsMap.containsKey("2.0")) {
                digitPredsMap.put("2.0", Integer.parseInt("0"));
                isBox3ContourDetected = true;
            }
            if (!digitPredsMap.containsKey("3.0")) {
                digitPredsMap.put("3.0", Integer.parseInt("0"));
                isBox4ContourDetected = true;
            }
            if (!digitPredsMap.containsKey("4.0")) {
                digitPredsMap.put("4.0", Integer.parseInt("0"));
                isBox5ContourDetected = true;
            }
            if (!digitPredsMap.containsKey("5.0")) {
                digitPredsMap.put("5.0", Integer.parseInt("0"));
                isBox6ContourDetected = true;
            }
        }

        Log.d(TAG, "SCAN RESULT :: CONTOURS :: box1:: " + isBox0ContourDetected + " box2:: " + isBox2ContourDetected + " box3:: " + isBox3ContourDetected + " box4:: " + isBox4ContourDetected +
                " box5:: " + isBox5ContourDetected + " box6:: " + isBox6ContourDetected + " frameCount ::" + frameCount);

        if (isBox0ContourDetected && isBox2ContourDetected && isBox3ContourDetected && isBox4ContourDetected && isBox5ContourDetected && isBox6ContourDetected) {
            Log.d(TAG, "SCAN RESULT :: CONTOURS :: success at box: overall area:" + area + "frameCount :: " + frameCount);

            /**
             * send capture event and close activity to show prediction loader
             */
            startTime = SystemClock.uptimeMillis();
            sendEvent("true");
            MediaActionSound sound = new MediaActionSound();
            sound.play(MediaActionSound.SHUTTER_CLICK);
            finish();


            /**
             * digitMats contains resized 28x28 Mat. We will predict and store String
             * object accordingly.
             */
            detectedContours    = 5;
            for (int i = 0; i < digitMats.size(); i++) {
                List <Mat> boxDigitMats = digitMats.get(i);
                detectedContours           += boxDigitMats.size();

                for (int j = 0; j < boxDigitMats.size(); j++) {
                    predictDigit(boxDigitMats.get(j), i + "." + j);
                    /**
                     * Uncomment the following link to save individual
                     * characters that goes for prediction.
                     */
//                    saveImageToGallery(boxDigitMats.get(j), i + "." + j);
                }
            }
            Log.d(TAG, "Total contours received :: " + detectedContours);
            return true;
        }

        videoWrite(image);
        return false;
    }

    class BoxRect {
        public int x;
        public int y;
        public int width;
        public int height;

        BoxRect(int x, int y, int width, int height) {
            this.x      = x;
            this.y      = y;
            this.width  = width;
            this.height = height;
        }

        public Rect getCropRect() {
            Rect r = new Rect(this.x, this.y, this.width, this.height);
            return r;
        }
    }

    public void videoWrite(Mat frame) {
//        if(videoWriter.isOpened()==false){
//            videoWriter.release();
//            throw new IllegalArgumentException("Video Writer Exception: VideoWriter not opened,"
//                    + "check parameters.");
//        }
//        videoWriter.write(frame);
//        saveImageToGallery(frame, "missed_", true);
    }

    private final List<Mat> getDigitContoursMat(Mat boxMat, List<Rect> rects) {
        int IMAGE_BUFFER    = 4;
        boxMat              = rotateMat(boxMat);
        List <Mat> mats   = new ArrayList<Mat>();
        for (int j = 0; j < rects.size(); j++) {
            Rect rect   = rects.get(j);
            /**
             * crop box image as per the received contours rectangle. Also added 4 extra pixels of padding.
             */
            if (0 <= rect.x - IMAGE_BUFFER
                    && 0 <= rect.width
                    && rect.x - IMAGE_BUFFER + rect.width + 2 * IMAGE_BUFFER <= boxMat.cols()
                    && 0 <= rect.y - IMAGE_BUFFER
                    && 0 <= rect.height
                    && rect.y - IMAGE_BUFFER + rect.height + 2 * IMAGE_BUFFER <= boxMat.rows()) {
                Mat ROI = boxMat.submat(rect.y - IMAGE_BUFFER, rect.y - IMAGE_BUFFER + rect.height + 2 * IMAGE_BUFFER,
                        rect.x - IMAGE_BUFFER,
                        rect.x - IMAGE_BUFFER + rect.width + 2 * IMAGE_BUFFER);

                Mat resized = resizeImage(ROI, rect);
                mats.add(resized);
            }
        }
        return mats;
    }

    private final List<BoxRect> getBoxRects(List<Rect> col1, List<Rect>col2) {
        List<BoxRect> boxes = new ArrayList<>();
        for (int i = 0; i < col1.size()-1; i++) {
            BoxRect box = new BoxRect(col1.get(i).x,
                    col1.get(i).y,
                    (col2.get(i+1).x + col2.get(i+1).width) - col1.get(i).x,
                    (col2.get(i+1).y + col2.get(i+1).height) - col1.get(i).y);
            boxes.add(box);
        }
        return boxes;
    }

    private final Mat isolateLines(Mat image, Mat element) {
        Imgproc.erode(image, image, element);
        Imgproc.dilate(image, image, element);
        return image;
    }

    private final Mat getTableLinesIntersection(Mat image) {
        int MAX_THRESHOLD_VALUE     = 255;
        int BLOCK_SIZE              = 15;
        int THRESHOLD_CONSTANT      = 0;
        int SCALE                   = 7;

        Mat gray_img                = new Mat();
        Imgproc.cvtColor(image, gray_img, Imgproc.COLOR_BGR2GRAY);

        Mat bw_img                  = new Mat();
        Core.bitwise_not(gray_img, gray_img);
        Imgproc.adaptiveThreshold(gray_img, bw_img, MAX_THRESHOLD_VALUE, Imgproc.ADAPTIVE_THRESH_MEAN_C, Imgproc.THRESH_BINARY, BLOCK_SIZE, THRESHOLD_CONSTANT);

        Mat hori_img                = new Mat();
        bw_img.copyTo(hori_img);
        int hori_size               = (int)(hori_img.cols() / SCALE);
        Mat hori_structure          = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, new Size(hori_size, 1));
        hori_img                    = isolateLines(hori_img, hori_structure);

        Mat vert_img                = new Mat();
        bw_img.copyTo(vert_img);
        int vert_size               = (int)(vert_img.rows() / SCALE);
        Mat vert_structure          = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, new Size(1, vert_size));
        vert_img                    = isolateLines(vert_img, vert_structure);

        Mat mask                    = new Mat();
        Core.add(hori_img, vert_img, mask);

        Mat hierarchy               = new Mat();
        List<MatOfPoint> contours   = new ArrayList<>();
        Imgproc.findContours(mask, contours, hierarchy, Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_SIMPLE);
        Log.d(TAG, "found contours in table mask image: " + contours.size());

        Mat intersections           = new Mat();
        Core.bitwise_and(hori_img, vert_img, intersections);

        return intersections;
    }

    private final List<Rect> getTableCoordinates(Mat image, int numOfPoints) {
        List<Rect> rects            = new ArrayList<>();
        Mat hierarchy               = new Mat();
        List<MatOfPoint> contours   = new ArrayList<>();
        Imgproc.findContours(image, contours, hierarchy, Imgproc.RETR_CCOMP, Imgproc.CHAIN_APPROX_SIMPLE);
        Log.d(TAG, "found contours in entire image " + contours.size());
        if (contours.size() < numOfPoints) {
            return rects;
        }

        contours    = sortContours(contours, "topToBottom");
        for (int i = 0; i < contours.size(); i++) {
            Rect rect = Imgproc.boundingRect(contours.get(i));
            rects.add(rect);
        }

        return rects;
    }

    private final Mat getInsideTableLinesIntersection(Mat image) {
        int MAX_THRESHOLD_VALUE     = 255;
        int BLOCK_SIZE              = 5;
        int THRESHOLD_CONSTANT      = 0;
        int SCALE                   = 5;

        Mat gray_img                = new Mat();
        Imgproc.cvtColor(image, gray_img, Imgproc.COLOR_BGR2GRAY);

        Mat bw_img                  = new Mat();
        Core.bitwise_not(gray_img, gray_img);
        Imgproc.adaptiveThreshold(gray_img, bw_img, MAX_THRESHOLD_VALUE, Imgproc.ADAPTIVE_THRESH_MEAN_C, Imgproc.THRESH_BINARY, BLOCK_SIZE, THRESHOLD_CONSTANT);

        Mat hori_img                = new Mat();
        bw_img.copyTo(hori_img);
        int hori_size               = (int)(hori_img.cols() / SCALE);
        Mat hori_structure          = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, new Size(hori_size, 1));
        hori_img                    = isolateLines(hori_img, hori_structure);

        Mat vert_img                = new Mat();
        bw_img.copyTo(vert_img);
        int vert_size               = (int)(vert_img.rows() / SCALE);
        Mat vert_structure          = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, new Size(1, vert_size));
        vert_img                    = isolateLines(vert_img, vert_structure);

        Mat mask                    = new Mat();
        Core.add(hori_img, vert_img, mask);

        Mat hierarchy               = new Mat();
        List<MatOfPoint> contours   = new ArrayList<>();
        Imgproc.findContours(mask, contours, hierarchy, Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_SIMPLE);
        Log.d(TAG, "BOX1 :: found contours in table mask image: " + contours.size());

        Mat intersections           = new Mat();
        Core.bitwise_and(hori_img, vert_img, intersections);

        return intersections;
    }

    private final List<Rect> getInsideTableCoordinates(Mat image, int numOfPoints) {
        List<Rect> rects            = new ArrayList<>();
        Mat hierarchy               = new Mat();
        List<MatOfPoint> contours   = new ArrayList<>();
        Imgproc.findContours(image, contours, hierarchy, Imgproc.RETR_CCOMP, Imgproc.CHAIN_APPROX_SIMPLE);
        Log.d(TAG, "BOX1 :: found contours in entire image " + contours.size());
        if (contours.size() < numOfPoints) {
            return rects;
        }

        contours    = sortContours(contours, "topToBottom");
        for (int i = 0; i < contours.size(); i++) {
            Rect rect = Imgproc.boundingRect(contours.get(i));
            if (rect.x < 5 || rect.y < 5 || (Math.abs(rect.x - image.width()) < 5))
                continue;
            rects.add(rect);
        }
        Log.d(TAG, "BOX1 :: filtered rects " + rects.size());

        return rects;
    }

    private List<MatOfPoint> sortContours (List<MatOfPoint> contourList, String type) {
        if(type.equals("topToBottom")) {
            Collections.sort(contourList, (o1, o2) -> {
                Rect rect1 = Imgproc.boundingRect(o1);
                Rect rect2 = Imgproc.boundingRect(o2);
                if (rect1.y > rect2.y) {
                    return 1;
                } else if (rect1.y < rect2.y) {
                    return -1;
                } else {
                    return 0;
                }
            });
        }
        else if(type.equals("leftToRight")) {
            Collections.sort(contourList, (o1, o2) -> {
                Rect rect1 = Imgproc.boundingRect(o1);
                Rect rect2 = Imgproc.boundingRect(o2);
                if (rect1.x > rect2.x) {
                    return 1;
                } else if (rect1.x < rect2.x) {
                    return -1;
                } else {
                    return 0;
                }
            });
        }
        return contourList;
    }

    private List<Rect> sortRects(List<Rect> rects) {
        Collections.sort(rects, (r1, r2) -> {
            if (r1.x >= r2.x) {
                return 1;
            }
            return -1;
        });
        return rects;
    }

    private List<Rect> sortRectsX(List<Rect> rects) {
        Collections.sort(rects, (r1, r2) -> {
            if (r1.x >= r2.x) {
                return 1;
            }
            return -1;
        });
        return rects;
    }

    private List<Rect> sortRectsY(List<Rect> rects) {
        Collections.sort(rects, (r1, r2) -> {
            if (r1.y >= r2.y) {
                return 1;
            }
            return -1;
        });
        return rects;
    }

    /**
     * Functions to find shaded circle index
     */
    private String getShadedCircleV2(Mat image1) {
        if (image1.empty()) {
            return null;
        }
        Mat image = rotateMat(image1);
        Mat gray = new Mat();
        Imgproc.cvtColor(image, gray, Imgproc.COLOR_BGR2GRAY);

        Imgproc.medianBlur(gray, gray, 5);
        Mat circles     = new Mat();
        Imgproc.HoughCircles(gray, circles, Imgproc.CV_HOUGH_GRADIENT,1.5,100.0, 100.0, 30.0, 5, 10);
        Log.d(TAG, "getShadedCircle:: V2 found contours: " + circles.cols());

        /**
         * Draw the detected circles.
         */

        return null;
    }


    private String getShadedCircleV1(Mat image1) {
        if (image1.empty()) {
            return null;
        }
        Mat image = rotateMat(image1);
        Mat gray = new Mat();
        Imgproc.cvtColor(image, gray, Imgproc.COLOR_BGR2GRAY);
        Mat blurred = new Mat();
        Imgproc.GaussianBlur(gray, blurred, new Size(3, 3), 0);
        Mat bw_img = new Mat();
        Imgproc.adaptiveThreshold(blurred, bw_img, 255, Imgproc.ADAPTIVE_THRESH_MEAN_C, Imgproc.THRESH_BINARY, 55, 0);
//        Imgproc.adaptiveThreshold(blurred, bw_img, 255, Imgproc.ADAPTIVE_THRESH_MEAN_C, Imgproc.THRESH_BINARY, 91, 0);
        Core.bitwise_not(bw_img, bw_img);

        Mat hierarchy               = new Mat();
        List<MatOfPoint> contours   = new ArrayList<>();
        Imgproc.findContours(bw_img, contours, hierarchy, Imgproc.RETR_TREE, Imgproc.CHAIN_APPROX_SIMPLE);
        List<MatOfPoint> ques_contours      = new ArrayList<>();
        contours                            = sortContours(contours, "leftToRight");
        Log.d(TAG, "getShadedCircle:: found contours: " + contours.size());

        for(int i = 0; i < contours.size(); i++) {
            Rect prevRect = new Rect();
            if(i > 0) {
                prevRect  = Imgproc.boundingRect(contours.get(i-1));
            }

            Rect rect   = Imgproc.boundingRect(contours.get(i));
            float ar    = (float)rect.width / (float)rect.height;
            Boolean isValidContour = prevRect.width > 50 ?  true : (rect.x-prevRect.x) > 10;
            Log.d(TAG, "getShadedCircle:: found rect: " + rect.toString() + " ar ::" + ar + "prevRect" + prevRect.toString() + "prevRect.width " + prevRect.width + "prevRect.height " + prevRect.height);
            if (rect.width > 20 && rect.height > 20 && ar >= 0.80000 && ar <= 1.1000 && isValidContour) {  //&& (rect.x-prevRect.x) > 10
                ques_contours.add(contours.get(i));
            }
        }
        Log.d(TAG, "getShadedCircle:: filtered circles ::" + ques_contours.size());

        if (ques_contours.size() > 0) {
            for (int i = 0; i < ques_contours.size(); i++) {
                Rect r = Imgproc.boundingRect(ques_contours.get(i));
                Log.e(TAG, "getShadedCircle :: DRAWING " + r.toString());
                Imgproc.rectangle(image, new Point(r.x, r.y), new Point(r.x + r.width, r.y + r.height), new Scalar(255, 0, 0, 255), 2);
            }
//            saveImageToGallery(image, "circle_" + getAlphaNumericString(4), false);
        }
        int CIRCLE_NUMBERS  = 6;

        if (ques_contours.size() != CIRCLE_NUMBERS) {
            return null;
        }

        int array[]         = new int[CIRCLE_NUMBERS];
        for (int j = 0; j < ques_contours.size(); j++) {
            Rect rectCrop   = Imgproc.boundingRect(ques_contours.get(j));
            Mat imageROI    = bw_img.submat(rectCrop);
            int total       = Core.countNonZero(imageROI);
            array[j]        = total;

            double pixel    = total / Imgproc.contourArea(ques_contours.get(j))*100;
            Log.d(TAG, "getShadedCircle:: pixel ::" + pixel + " total ::" + total + " j:" + j);
        }
        int index           = getIndexOfLargest(array);
        Log.d(TAG, "getShadedCircle:: shaded index: " + index);
        return new Integer(index).toString();
    }

    private String getShadedCircle(Mat image1) {
        Mat image       = rotateMat(image1);
        Mat gray        = new Mat();
        Imgproc.cvtColor(image, gray, Imgproc.COLOR_BGR2GRAY);
        Mat blurred     = new Mat();
        Imgproc.GaussianBlur(gray, blurred, new Size(3, 3), 0);
        Mat thresh      = new Mat();
        Imgproc.threshold(blurred, thresh,0,255, Imgproc.THRESH_BINARY_INV | Imgproc.THRESH_OTSU);

        Mat hierarchy               = new Mat();
        List<MatOfPoint> contours   = new ArrayList<>();
        Imgproc.findContours(thresh, contours, hierarchy, Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_NONE);

        List<MatOfPoint> ques_contours      = new ArrayList<>();
        contours                            = sortContours(contours, "leftToRight");
        Log.d(TAG, "getShadedCircle:: found contours: " + contours.size());

        for(int i = 0; i < contours.size(); i++) {
            Rect rect   = Imgproc.boundingRect(contours.get(i));
            float ar    = (float)rect.width / (float)rect.height;
            Log.d(TAG, "getShadedCircle:: found rect: " + rect.toString() + " ar ::" + ar);
            if (rect.width > 20 && rect.height > 20 && ar >= 0.8 && ar <= 0.9) {
                ques_contours.add(contours.get(i));
            }
        }
        Log.d(TAG, "getShadedCircle:: filtered circles ::" + ques_contours.size());

//        for (int i = 0; i < ques_contours.size(); i++) {
//            Rect r = Imgproc.boundingRect(ques_contours.get(i));
//            Log.e(TAG, "getShadedCircle :: DRAWING " + r.toString());
//            Imgproc.rectangle(image, new Point(r.x, r.y), new Point(r.x + r.width, r.y + r.height), new Scalar(255, 0, 0, 255), 2);
//        }
//        saveImageToGallery(image, "circle", false);

        if (ques_contours.size() != 5) {
            return null;
        }

        int array[]         = new int[5];
        for (int j = 0; j < ques_contours.size(); j++) {
            Rect rectCrop   = Imgproc.boundingRect(ques_contours.get(j));
            Mat imageROI    = thresh.submat(rectCrop);
            int total       = Core.countNonZero(imageROI);
            array[j]        = total;

            double pixel    = total / Imgproc.contourArea(ques_contours.get(j))*100;
            Log.d(TAG, "getShadedCircle:: pixel ::" + pixel + " total ::" + total + " j:" + j);
        }
        int index           = getIndexOfLargest(array);
        return new Integer(index).toString();
    }

    private int getIndexOfLargest(int[] array) {
        if ( array == null || array.length == 0 ) return -1; // null or empty
        int largest = 0;
        for ( int i = 1; i < array.length; i++ ) {
            if (array[i] > array[largest] ) largest = i;
        }
        return largest;
    }

    /**
     * Functions to find contours and extract individual digits present in the box.
     */
    private Mat rotateMat(Mat image) {
        Bitmap resultBitmap = Bitmap.createBitmap(image.cols(), image.rows(), Bitmap.Config.ARGB_8888);
        Utils.matToBitmap(image, resultBitmap);

        Matrix matrix = new Matrix();
        matrix.setRotate(90F);
        Bitmap bmRotated    = Bitmap.createBitmap(resultBitmap, 0, 0, resultBitmap.getWidth(), resultBitmap.getHeight(), matrix, true);
        Mat rotated         = new Mat();
        Utils.bitmapToMat(bmRotated, rotated);

        return rotated;
    }

    private List<Rect> extractCharacters(Mat image1, int max_width, int max_height) {
        List<Rect> rects = new ArrayList<>();

        if (image1.empty()) {
            return null;
        }
        Mat image   = rotateMat(image1);
        Mat gray    = new Mat();
        Imgproc.cvtColor(image, gray, Imgproc.COLOR_BGR2GRAY);

        Mat blurred = new Mat();
        Imgproc.GaussianBlur(gray, blurred, new Size(3, 3), 0);
//        Imgproc.medianBlur(gray, blurred, 3);

        Mat bw_img = new Mat();
        Imgproc.adaptiveThreshold(blurred, bw_img, 255, Imgproc.ADAPTIVE_THRESH_MEAN_C, Imgproc.THRESH_BINARY, 51, 9);
        Core.bitwise_not(bw_img, bw_img);

        Mat hierarchy = new Mat();
        List<MatOfPoint> contours = new ArrayList<>();
        Imgproc.findContours(bw_img, contours, hierarchy, Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_TC89_KCOS);

        Log.e(TAG, "extractCharacters :: contours detected " + contours.size());
        for (int idx = 0; idx < contours.size(); idx++) {
            Rect rect   = Imgproc.boundingRect(contours.get(idx));
            float ar    = (float)rect.width / (float)rect.height;
            Log.d(TAG, "extractCharacters :: rect: " + rect.toString() + " image width:: " + image.cols() + " image height ::" + image.rows() + " ar: " +  ar);

//            if ( (Math.abs(image.cols() - rect.width) < 15 ) || ((Math.abs(image.rows() - rect.height) < 5)) )
//                continue;
//
            if (rect.x < 5) {
                continue;
            }

            if (rect.width > max_width && rect.height > max_height && ar >= 0.1 && ar <= 1.3 && rect.x < 280 ) {
                Log.d(TAG, "extractCharacters :: adding width " + rect.width + " height " + rect.height);
                rects.add(rect);
            }
        }
        Log.e(TAG, "extractCharacters :: contours " + contours.size() + " filtered rects: " + rects.size());

//        if (rects.size() > 0) {
//            for (int i = 0; i < rects.size(); i++) {
//                Rect r   = rects.get(i); //Imgproc.boundingRect(contours.get(i));
//                Log.e(TAG, "extractCharacters :: DRAWING " + r.toString());
//                Imgproc.rectangle(image, new Point(r.x, r.y), new Point(r.x + r.width, r.y + r.height), new Scalar(255, 0, 0, 255), 2);
//            }
//            saveImageToGallery(image, "box", false);
//        }

       return sortRects(rects);
    }

    private List<Rect> extractCharactersV2(Mat image1, int max_width, int max_height) {
        List<Rect> rects = new ArrayList<>();
        List<Rect> filteredRects = new ArrayList<>();

        if (image1.empty()) {
            return null;
        }
        Mat image   = rotateMat(image1);
        Mat gray    = new Mat();
        Imgproc.cvtColor(image, gray, Imgproc.COLOR_BGR2GRAY);

        Mat blurred = new Mat();
        Imgproc.GaussianBlur(gray, blurred, new Size(3, 3), 0);
//        Imgproc.medianBlur(gray, blurred, 3);

        Mat bw_img = new Mat();
        Imgproc.adaptiveThreshold(blurred, bw_img, 255, Imgproc.ADAPTIVE_THRESH_MEAN_C, Imgproc.THRESH_BINARY, 51, 9);
        Core.bitwise_not(bw_img, bw_img);

        Mat hierarchy = new Mat();
        List<MatOfPoint> contours = new ArrayList<>();
        Imgproc.findContours(bw_img, contours, hierarchy, Imgproc.RETR_CCOMP, Imgproc.CHAIN_APPROX_NONE);

        Log.e(TAG, "extractCharactersV2 :: contours detected " + contours.size());
        for (int idx = 0; idx < contours.size(); idx++) {
            Rect rect   = Imgproc.boundingRect(contours.get(idx));
            float ar    = (float)rect.width / (float)rect.height;
            Log.d(TAG, "extractCharactersV2 :: rect: " + rect.toString() + " image width:: " + image.cols() + " image height ::" + image.rows() + " ar: " +  ar);

            if (rect.x < 5) {
                continue;
            }

            if (rect.width > max_width && rect.height > max_height && ar >= 0.1 && ar <= 1.3 && rect.x < 280 ) {
                Log.d(TAG, "extractCharactersV2 :: adding width " + rect.width + " height " + rect.height);
                rects.add(rect);
            }
        }
        Log.e(TAG, "extractCharactersV2 :: contours " + contours.size() + " filtered rects: " + rects.size());

        List<Rect> contoursSorted = sortRects(rects);
        for(int i = 0; i<contoursSorted.size(); i++) {
            Rect prevRect = new Rect();
            if(i > 0) {
                prevRect  = contoursSorted.get(i-1);
            }
            Boolean isValidContourRect = contoursSorted.get(i).x-prevRect.x > 10;
            if(isValidContourRect) {
                filteredRects.add(contoursSorted.get(i));
            }

        }
        return filteredRects;
    }

    private List<Rect> extractCharactersV1(Mat image1, int max_width, int max_height) {
        List<Rect> rects    = new ArrayList<>();
        int NUM_OF_POINTS   = 16;

        if (image1.empty()) {
            return null;
        }
        Mat image = rotateMat(image1);

        Mat intersection            = getInsideTableLinesIntersection(image);
        List<Rect> rects1           = getInsideTableCoordinates(intersection, NUM_OF_POINTS);
        Log.e(TAG, "BOX1 :: extractCharacters :: DRAWING :: SIZE1 " + rects1.size());
        if (rects1.size() != NUM_OF_POINTS) {
            return rects;
        }
        List<Rect> row1 = new ArrayList<Rect>();
        List<Rect> row2 = new ArrayList<>();
        for (int i = 0; i < rects1.size(); i++) {
            if (i < NUM_OF_POINTS/2) {
                row1.add(rects1.get(i));
            }
            if (i >= NUM_OF_POINTS/2 && i < (2*NUM_OF_POINTS)/2) {
                row2.add(rects1.get(i));
            }
        }

        List<Rect> sorted_rects1            = sortRectsX(row1);
        List<Rect> sorted_rects2            = sortRectsX(row2);
        List<BoxRect> boxes                 = getBoxRects(sorted_rects1, sorted_rects2);
        Log.d(TAG, "BOX1 :: Numbers of boxes: " + boxes.size());

        for (int i = 0; i < boxes.size(); i++) {
            Rect r      = boxes.get(i).getCropRect();
            rects.add(r);
        }

//        if (rects.size() > 0) {
//            for (int i = 0; i < rects.size(); i++) {
//                Rect r   = rects.get(i);
//                String name = getAlphaNumericString(4);
//                Mat boxMat = new Mat(image, r);
//                saveImageToGallery(boxMat, "box_" + i + "_" + name, false);
//            }
//        }

        return rects;
    }

    /**
     * Resize the rect to 28x28 size.
     */
    private final Mat resizeImage(Mat image, Rect r) {
        int MODEL_IMAGE_WIDTH   = 28;
        int MODEL_IMAGE_HEIGHT  = 28;
        int width               = 0;
        int height              = 0;

        if ((image.height() > MODEL_IMAGE_HEIGHT)) {
            height = image.height();
        } else {
            height = MODEL_IMAGE_HEIGHT;
        }

        if ((image.width() > MODEL_IMAGE_WIDTH)) {
            width = image.width();
        } else {
            width = MODEL_IMAGE_WIDTH;
        }

        if (width > height) {
            height  = width;
        } else {
            width   = height;
        }
        Log.d(TAG, "received image :: width: " + image.width() + " height: " + image.height());
        Log.d(TAG, "resized image  :: width: " + width + " height: " + height);

        /**
         * 1. create a Mat with dimension width x height
         * 2. copy actual image
         * 3. Resize to 28x28
         */
        Mat m   = new Mat();
        Mat m1  = new Mat(new Size(width, height), CvType.CV_8UC3);
        image.copyTo(m1);
        Imgproc.resize(m1, m, new Size(MODEL_IMAGE_WIDTH, MODEL_IMAGE_HEIGHT));
        return m;
    }

    private void predictDigit(Mat m, String id) {
        if(hwClassifier != null) {
            hwClassifier.classifyMat(m, id);
        }
    }

    private static String getAlphaNumericString(int n) {
        String AlphaNumericString = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                + "0123456789"
                + "abcdefghijklmnopqrstuvxyz";
        StringBuilder sb = new StringBuilder(n);
        for (int i = 0; i < n; i++) {
            int index = (int)(AlphaNumericString.length() * Math.random());
            sb.append(AlphaNumericString.charAt(index));
        }
        return sb.toString();
    }

    public void sendEvent(String value) {
        ReactInstanceManager mReactInstanceManager = getReactNativeHost().getReactInstanceManager();
        ReactApplicationContext reactContext = (ReactApplicationContext) mReactInstanceManager.getCurrentReactContext();
        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("imageFound", value);
    }
}