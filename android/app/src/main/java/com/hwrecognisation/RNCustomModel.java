package com.hwrecognisation;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.os.Environment;
import android.os.SystemClock;

import android.util.Log;
import android.widget.Toast;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;

import com.facebook.react.bridge.WritableNativeArray;
import com.google.firebase.ml.common.FirebaseMLException;
//import com.google.firebase.ml.common.modeldownload.FirebaseLocalModel;
import com.google.firebase.ml.common.modeldownload.FirebaseModelDownloadConditions;
import com.google.firebase.ml.common.modeldownload.FirebaseModelManager;
// import com.google.firebase.ml.common.modeldownload.FirebaseRemoteModel;
import com.google.firebase.ml.custom.FirebaseModelDataType;
import com.google.firebase.ml.custom.FirebaseModelInputOutputOptions;
import com.google.firebase.ml.custom.FirebaseModelInputs;
import com.google.firebase.ml.custom.FirebaseModelInterpreter;
import com.google.firebase.ml.custom.FirebaseModelInterpreterOptions;
import com.google.firebase.ml.custom.FirebaseCustomLocalModel;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import org.opencv.android.Utils;
import org.opencv.core.Core;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.MatOfDouble;
import org.opencv.core.MatOfPoint;
import org.opencv.core.Point;
import org.opencv.core.Rect;
import org.opencv.core.Size;
import org.opencv.imgproc.Imgproc;

import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.text.SimpleDateFormat;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.Iterator;
import java.util.List;


import static com.facebook.react.views.textinput.ReactTextInputManager.TAG;

public class RNCustomModel extends ReactContextBaseJavaModule {

    /**
     * Name of the model file hosted with Firebase.
     */
    private static final String HOSTED_MODEL_NAME = null;
    private static final String LOCAL_MODEL_ASSET = "digit_trained_model_resnet.tflite";

    /**
     * Dimensions of inputs.
     */
    private static final int DIM_BATCH_SIZE = 1;
    private static final int DIM_PIXEL_SIZE = 1;
    //    private static final int DIM_IMG_SIZE_X = 224; //368;
//    private static final int DIM_IMG_SIZE_Y = 224;//368;
    private static final int DIM_IMG_SIZE_X = 28; //368;
    private static final int DIM_IMG_SIZE_Y = 28;//368;

    Point top_left_p;
    Point bottom_right_p;
    Promise mPromise;

    Promise resultPromise;

    String finalPredictedStudentIdorDate = "";
    /**
     * An instance of the driver class to run model inference with Firebase.
     */
    private FirebaseModelInterpreter mInterpreter;
    /**
     * Data configuration of input & output data of model.
     */
    private FirebaseModelInputOutputOptions mDataOptions;


    public RNCustomModel(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @ReactMethod
    public void initModel() {

        System.out.println("RNCustomModel is turn ON");

        int[] inputDims = {DIM_BATCH_SIZE, DIM_IMG_SIZE_X, DIM_IMG_SIZE_Y, DIM_PIXEL_SIZE};
        int[] outputDims = {DIM_BATCH_SIZE, 10};

        try {
            int firebaseModelDataType = FirebaseModelDataType.FLOAT32;
            mDataOptions =
                    new FirebaseModelInputOutputOptions.Builder()
                            .setInputFormat(0, firebaseModelDataType, inputDims)
                            .setOutputFormat(0, firebaseModelDataType, outputDims)
                            .build();

            //for remote model
//            if(HOSTED_MODEL_NAME != null){
//                FirebaseModelDownloadConditions conditions = new FirebaseModelDownloadConditions
//                    .Builder()
//                    .requireWifi()
//                    .build();
            // FirebaseRemoteModel cloudSource = new FirebaseRemoteModel.Builder
            //         (HOSTED_MODEL_NAME)
            //         .enableModelUpdates(true)
            //         .setInitialDownloadConditions(conditions)
            //         .setUpdatesDownloadConditions(conditions)  // You could also specify
            //         // different conditions
            //         // for updates
            //         .build();
//             }

            FirebaseCustomLocalModel localSource = new FirebaseCustomLocalModel.Builder()
                    .setAssetFilePath(LOCAL_MODEL_ASSET)
                    .build();

            FirebaseModelInterpreterOptions options =
                    new FirebaseModelInterpreterOptions.Builder(localSource).build();
            mInterpreter = FirebaseModelInterpreter.getInstance(options);
//            showToast("Model loaded");
        } catch (FirebaseMLException e) {
            showToast("Error while setting up the model");
            e.printStackTrace();
        }
    }

    public String saveImage(Mat data, String fileName) {
        Bitmap resultBitmap = Bitmap.createBitmap(data.cols(), data.rows(), Bitmap.Config.ARGB_8888);
        Utils.matToBitmap(data, resultBitmap);

        Matrix matrix = new Matrix();
        matrix.setRotate(0F);

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

    public Mat get_gray(Mat matImg) {

        Mat gray_img = new Mat();

        Imgproc.cvtColor(matImg, gray_img, Imgproc.COLOR_BGR2GRAY);
//        Imgproc.medianBlur(gray_img, gray_img, 5);
        Core.bitwise_not(gray_img, gray_img);

        return gray_img;
    };

    public Mat get_bw_image(Mat matImg) {

        Mat bw_img = new Mat();
//        Mat cannyEdges = new Mat();
//        Imgproc.cvtColor(matImg, bw_img, Imgproc.COLOR_RGBA2BGR);
//        Imgproc.pyrMeanShiftFiltering(bw_img, bw_img, 3.0, 5.0);
        Imgproc.cvtColor(matImg, bw_img, Imgproc.COLOR_BGR2GRAY);
//        Imgproc.Canny(bw_img, cannyEdges, 5.0, 10.0);

        Core.bitwise_not(bw_img, bw_img);

        Mat kernel = Mat.ones(3, 3, CvType.CV_8UC1);
        Imgproc.dilate(bw_img, bw_img, kernel);

        Imgproc.adaptiveThreshold(bw_img, bw_img, 255, Imgproc.ADAPTIVE_THRESH_MEAN_C, Imgproc.THRESH_BINARY, 15, -2);

        return bw_img;
    };

    class CreateboundRectObj{
        int x;
        int y;
        int width;
        int height;

        public int getX() {
            return x;
        }

        public void setX(int x) {
            this.x = x;
        }

        public int getY() {
            return y;
        }

        public void setY(int y) {
            this.y = y;
        }

        public int getWidth() {
            return width;
        }

        public void setWidth(int width) {
            this.width = width;
        }

        public int getHeight() {
            return height;
        }

        public void setHeight(int height) {
            this.height = height;
        }
    }



    public Mat smoothen_out_image(Mat image) {
        // Step 1
        Mat edges = new Mat();
        Imgproc.adaptiveThreshold(image, edges, 255, Imgproc.ADAPTIVE_THRESH_MEAN_C, Imgproc.THRESH_BINARY, 3, -2);

        // Step 2
        Mat kernel = Mat.ones(3, 3, CvType.CV_8UC1);
        Imgproc.dilate(edges, edges, kernel);

        // Step 3
        Mat smooth = new Mat();
        image.copyTo(smooth);

        // Step 4
        Imgproc.blur(smooth, smooth, new Size(2, 2));
        // Step 5
        smooth.copyTo(image, edges);
        return image;
    };


    public List<MatOfPoint> sort_contours (List<MatOfPoint> contourList, String type) {

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

    public ArrayList<List> extract_horizontal_lines(Mat horizontal) {
        Rect boundingRect;
        Mat hori_hierarchy = new Mat();
        List<MatOfPoint> hori_contours = new ArrayList<>();
        Imgproc.findContours(horizontal, hori_contours, hori_hierarchy, Imgproc.RETR_LIST,
                Imgproc.CHAIN_APPROX_SIMPLE);

        hori_contours = sort_contours(hori_contours, "topToBottom");

        double hori_length = 430;
        List<MatOfPoint> hori_filtered_contours = new ArrayList<>();
        List<Object> hori_filtered_lines = new ArrayList<>();

        Iterator<MatOfPoint> hori_iterator = hori_contours.iterator();
        while (hori_iterator.hasNext()){
            MatOfPoint contour = hori_iterator.next();
            boundingRect = Imgproc.boundingRect(contour);
            if(boundingRect.width > hori_length){
//                System.out.println("horizontal :: "+boundingRect.x+ "  :: "+boundingRect.y+  " width: "+boundingRect.width+  " height: "+boundingRect.height);
                CreateboundRectObj obj = new CreateboundRectObj();
                hori_filtered_contours.add(contour);
                obj.setX(boundingRect.x);
                obj.setY(boundingRect.y);
                obj.setWidth(boundingRect.width);
                obj.setHeight(boundingRect.height);
                hori_filtered_lines.add(obj);
            }
        }
        System.out.println("hori_filtered_lines :: "+hori_filtered_lines.size());
        ArrayList<List> lineList = new ArrayList<>();
        lineList.add(hori_filtered_contours);
        lineList.add(hori_filtered_lines);
        return lineList;
    }

    public ArrayList<List> extract_vertical_lines(Mat vertical) {
        Rect boundingRect;
        Mat vert_hierarchy = new Mat();
        List<MatOfPoint> vert_contours = new ArrayList<>();
        Imgproc.findContours(vertical, vert_contours, vert_hierarchy, Imgproc.RETR_LIST,
                Imgproc.CHAIN_APPROX_SIMPLE);

        vert_contours = sort_contours(vert_contours, "leftToRight");

        double vert_length = 490;
        List<MatOfPoint> vert_filtered_contours = new ArrayList<>();
        List<Object> vert_filtered_lines = new ArrayList<>();

        Iterator<MatOfPoint> vert_iterator = vert_contours.iterator();
        while (vert_iterator.hasNext()){
            MatOfPoint contour = vert_iterator.next();
            boundingRect = Imgproc.boundingRect(contour);
            if(boundingRect.height > vert_length){
                CreateboundRectObj obj = new CreateboundRectObj();
//                System.out.println("vertical"+boundingRect.x+ "  :: "+boundingRect.y+  " height: "+boundingRect.height+   " width: "+boundingRect.width );
                vert_filtered_contours.add(contour);
                obj.setX(boundingRect.x);
                obj.setY(boundingRect.y);
                obj.setWidth(boundingRect.width);
                obj.setHeight(boundingRect.height);
                vert_filtered_lines.add(obj);
            }
        }
        System.out.println("vert_filtered_lines :: "+vert_filtered_lines.size());

        ArrayList<List> lineList = new ArrayList<>();
        lineList.add(vert_filtered_contours);
        lineList.add(vert_filtered_lines);
        return lineList;
    }

    public boolean getIntersectionPoint(Point a1, Point a2, Point b1, Point b2, String intPnt) {
        Point p = a1;
        Point q = b1;
        Point r = new Point(a2.x - a1.x, a2.y - a1.y);
        Point s = new Point(b2.x - b1.x, b2.y - b1.y);

        if(cross(r,s) == 0) {
            return false;
        }
        else {
            Point l = new Point(q.x - p.x, q.y - p.y);
            double t = cross(l, s)/cross(r,s);
            Point multiple = new Point(t * r.x, t * r.y);

            Point addpoints = new Point(p.x + multiple.x, p.y + multiple.y);
            if(intPnt.equals("top")) {
                top_left_p = new Point();
                top_left_p = addpoints;
            }
            else if( intPnt.equals("bottom")) {
                bottom_right_p = new Point();
                bottom_right_p = addpoints;
            }
            return true;
        }
    }

    public double cross(Point v1, Point v2) {
        double result = v1.x*v2.y -v1.y*v2.x;
        return result;
    }

    public JsonObject get_summary_table_data() {

        JsonObject table = new JsonObject();
        // Header Object
        JsonObject header = new JsonObject();
        header.addProperty("title", "Student summary");
        header.addProperty("row", 2);
        header.addProperty("col", 2);

        table.add("header", header);

        // Data array
        JsonArray data = new JsonArray();

        JsonObject studentCode = new JsonObject();
        studentCode.addProperty("row", 0);
        studentCode.addProperty("col", 0);
        studentCode.addProperty("text", "વિદ્યાર્થી યુનિક આઈડી");

        JsonObject examDate = new JsonObject();
        examDate.addProperty("row", 1);
        examDate.addProperty("col", 0);
        examDate.addProperty("text", "વપરીક્ષણ તારીખ");

        data.add(studentCode);
        data.add(examDate);

        table.add("data", data);

        return table;
    }

    public JsonObject get_marks_table_data() {

        JsonObject table = new JsonObject();
        // Header Object
        JsonObject header = new JsonObject();
        header.addProperty("title", "Marks received");
        header.addProperty("row", 11);
        header.addProperty("col", 2);

        table.add("header", header);

        // Data array
        JsonArray data = new JsonArray();

        JsonObject questionHeader = new JsonObject();
        questionHeader.addProperty("row", 0);
        questionHeader.addProperty("col", 0);
        questionHeader.addProperty("text", "પ્રશ્નક્રમ");

        JsonObject marksHeader = new JsonObject();
        marksHeader.addProperty("row", 0);
        marksHeader.addProperty("col", 1);
        marksHeader.addProperty("text", "અધ્યયન નિષ્પતિ ક્રમ");

        data.add(questionHeader);
        data.add(marksHeader);


        for(int row = 1 ; row < 11; row++){
            JsonObject obj = new JsonObject();
            obj.addProperty("row", row);
            obj.addProperty("col", 0);
            obj.addProperty("text", row);
            data.add(obj);
        }
        table.add("data", data);
        return table;
    }

    @ReactMethod
    private void processImage(String uri, final Promise promise) throws FileNotFoundException {
        resultPromise = promise;
        InputStream inputStream = new FileInputStream(uri.replace("file://", ""));
        Bitmap bitmap = BitmapFactory.decodeStream(inputStream);
        Mat imgMat = new Mat();
        Utils.bitmapToMat(bitmap, imgMat);

        Mat gray = new Mat();

        Imgproc.cvtColor(imgMat, gray, Imgproc.COLOR_BGR2GRAY);

        Mat bw = new Mat();
        Core.bitwise_not(gray, gray);
        Imgproc.adaptiveThreshold(gray, bw, 255, Imgproc.ADAPTIVE_THRESH_MEAN_C, Imgproc.THRESH_BINARY, 15, -2);

        Mat horizontal = bw.clone();
        Mat vertical = bw.clone();

        int horizontal_size = horizontal.cols() / 30;
        Mat horizontalStructure = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, new Size(horizontal_size,1));
        Imgproc.erode(horizontal, horizontal, horizontalStructure);
        Imgproc.dilate(horizontal, horizontal, horizontalStructure);

        int vertical_size = vertical.rows() / 30;
        Mat verticalStructure = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, new Size( 1,vertical_size));
        Imgproc.erode(vertical, vertical, verticalStructure);
        Imgproc.dilate(vertical, vertical, verticalStructure);

        vertical = smoothen_out_image(vertical);
        horizontal   = smoothen_out_image(horizontal);

        System.out.println("horizontal : "+horizontal.channels()+" rows: "+horizontal.rows()+" cols: "+horizontal.cols());
        System.out.println("vertical : "+vertical.channels()+" rows: "+vertical.rows()+" cols: "+vertical.cols());

        // Find horizontal and vertical lines
        ArrayList<List> horizontal_lines_data  = extract_horizontal_lines(horizontal);
        List hori_filtered_lines = horizontal_lines_data.get(1);
        ArrayList<List> vertical_lines_data  = extract_vertical_lines(vertical);
        List vert_filtered_lines = vertical_lines_data.get(1);

        // Process table
        WritableArray result = Arguments.createArray();
        if(hori_filtered_lines.size() == 15 && vert_filtered_lines.size() == 3){
            processTable(imgMat, vert_filtered_lines, hori_filtered_lines);
        }
        else {
            result.pushString("Image is not Proper. Please scan again.");
            promise.resolve(result);
        }
    }

    public void processTable(Mat originalImage, List vert_filtered_lines, List hori_filtered_lines) {
        CreateboundRectObj obj = (CreateboundRectObj) vert_filtered_lines.get(1);
        CreateboundRectObj obj1 = (CreateboundRectObj) vert_filtered_lines.get(2);

        Rect VL_2 = new Rect(obj.getX(), obj.getY(), obj.getWidth(), obj.getHeight());
        Rect VL_3 = new Rect(obj1.getX(), obj1.getY(), obj1.getWidth(), obj1.getHeight());

        JsonObject summaryTable = get_summary_table_data();
        JsonObject marksTable = get_marks_table_data();

        List<List> contoursList = new ArrayList<>();
        List<Mat> matList = new ArrayList<>();
            for (int row = 0; row < (hori_filtered_lines.size() - 1); row++) {
                CreateboundRectObj obj2 = (CreateboundRectObj) hori_filtered_lines.get(row);
                CreateboundRectObj obj3 = (CreateboundRectObj) hori_filtered_lines.get(row + 1);

                Rect HL_CURRENT = new Rect(obj2.getX(), obj2.getY(), obj2.getWidth(), obj2.getHeight());
                Rect HL_NEXT = new Rect(obj3.getX(), obj3.getY(), obj3.getWidth(), obj3.getHeight());

                boolean current = getIntersectionPoint(
                        new Point(VL_2.x, VL_2.y),
                        new Point(VL_2.x, VL_2.y + VL_2.height),
                        new Point(HL_CURRENT.x, HL_CURRENT.y),
                        new Point(HL_CURRENT.x + HL_CURRENT.width, HL_CURRENT.y),
                        "top");

                boolean next = getIntersectionPoint(
                        new Point(VL_3.x, VL_3.y),
                        new Point(VL_3.x, VL_3.y + VL_3.height),
                        new Point(HL_NEXT.x, HL_NEXT.y),
                        new Point(HL_NEXT.x + HL_NEXT.width, HL_NEXT.y),
                        "bottom");

                if (current && next) {

                    Mat croppedMat;
                    Rect rectCrop = new Rect(top_left_p, bottom_right_p);
                    croppedMat = new Mat(originalImage, rectCrop);

                    //Save Box image
                    //  String name = "box"+row;
                    //  SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd_HH-mm-ss");
                    //  String currentDateandTime = sdf.format(new Date());
                    //  String croppedImg = Environment.getExternalStorageDirectory().getPath() +
                    //          "/"+name+"_" + currentDateandTime + ".jpg";
                    //  saveImage(croppedMat, croppedImg);

                    List<MatOfPoint> filteredContours = extractBoxLetters(croppedMat, row);
                    contoursList.add(filteredContours);
                    matList.add(croppedMat);
                }
            }
            for(int i = 0; i< contoursList.size(); i++) {
                for(int j = 0; j < contoursList.get(i).size(); j++) {
                    String name = "marks" + i + j;
                    Mat croppedMat = matList.get(i);
                    List<MatOfPoint> contourListTemp;
                    contourListTemp = contoursList.get(i);
                    saveCroppedImage(croppedMat, contourListTemp.get(j), name, i, j, summaryTable, marksTable, contourListTemp.size() );
                }
            }
    }

    public List extractBoxLetters(Mat imgMat, int row) {
        Mat bw_img = get_bw_image(imgMat);
        
        Mat heirarchy = new Mat();
        List<MatOfPoint> contours = new ArrayList<>();
        Imgproc.findContours(bw_img, contours, heirarchy, Imgproc.RETR_EXTERNAL,
                Imgproc.CHAIN_APPROX_SIMPLE);

        contours = sort_contours(contours, "leftToRight");

        Rect boundingRect;
        int cont_ind = 0;
        int count = 0;

        List<MatOfPoint> filteredContours = new ArrayList<>();

        Iterator<MatOfPoint> iterator = contours.iterator();
        while (iterator.hasNext()){
            MatOfPoint contour = iterator.next();
            boundingRect = Imgproc.boundingRect(contour);
            System.out.println("x :"+boundingRect.x+" y : "+boundingRect.y+" width : "+boundingRect.width+" height : "+boundingRect.height+ " imgMat.height() "+imgMat.height() + " imgMat.height() "+imgMat.width() );
//            if(imgMat.height() - boundingRect.height < 15 || imgMat.width() - boundingRect.width < 15){
//                System.out.println("continue");
//                continue;
//            }
//
//            if(row != 2 || row != 3) {
//                if(boundingRect.height>5 && boundingRect.width > 1 && boundingRect.height < imgMat.height()) {
//                    System.out.println("filtered   x :"+boundingRect.x+" y : "+boundingRect.y+" width : "+boundingRect.width+" height : "+boundingRect.height+ " imgMat.height() "+imgMat.height() + " imgMat.height() "+imgMat.width() );
//                    filteredContours.add(contour);
//                    cont_ind = cont_ind + 1;
//                    count    = count + 1;
//                }
//            }
            if(row == 1) {
                System.out.println("x :"+boundingRect.x+" y : "+boundingRect.y+" width : "+boundingRect.width+" height : "+boundingRect.height);
                if(boundingRect.height>8 && boundingRect.width >= 6  && boundingRect.width< 60) {
//                    System.out.println("x :"+boundingRect.x+" y : "+boundingRect.y+" width : "+boundingRect.width+" height : "+boundingRect.height);
                    filteredContours.add(contour);
                    cont_ind = cont_ind + 1;
                    count    = count + 1;
                    if(count > 10){
                        filteredContours.remove(0);
                        break;
                    }
                }
            }
            else if(row == 2 || row == 3) {
                break;
            }
            else {
                System.out.println("x :"+boundingRect.x+" y : "+boundingRect.y+" width : "+boundingRect.width+" height : "+boundingRect.height);

                if(boundingRect.width >= 6 && boundingRect.width < 60 && boundingRect.height >= 10) {

                    filteredContours.add(contour);
                    cont_ind = cont_ind + 1;
                    count    = count + 1;
                    if(row>3) {
                        break;
                    }
                }
            }
        }
        System.out.println("found "+count+ " letters");
        return filteredContours;
    }

    public void saveCroppedImage(Mat imgMat, MatOfPoint contour, String name, int i, int j, JsonObject summaryTable, JsonObject markstable, int countourSize) {
        Mat gray_img = get_gray(imgMat);

        String fileName = "";
        String grayFile = "";
        String croppedImg = "";

        Mat croppedMat;

        Rect rectCrop = Imgproc.boundingRect(contour);
        croppedMat = new Mat(gray_img, rectCrop);
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd_HH-mm-ss");
        String currentDateandTime = sdf.format(new Date());
        croppedImg = Environment.getExternalStorageDirectory().getPath() +
                "/"+"cropped_"+name+"_"+rectCrop.width+"*"+rectCrop.height+" "+ currentDateandTime + ".jpg";

        saveImage(croppedMat, croppedImg);
        Mat marksMat = Mat.zeros(28, 28, CvType.CV_8UC1);

        int typeCrop = croppedMat.channels();
        int typeMarks = marksMat.channels();
        System.out.println("typeCrop : "+typeCrop+" rows: "+croppedMat.rows()+" cols: "+croppedMat.cols());
        System.out.println("typeMarks : "+typeMarks+" rows: "+marksMat.rows()+" cols: "+marksMat.cols());
        int cols = croppedMat.cols() <= 28 ? croppedMat.cols() : 28;
        int rows = croppedMat.rows() <=28 ? croppedMat.rows() : 28;
        System.out.println(cols+"*"+rows);
        int x = (28 - cols)/2;
        int y = (28 - rows)/2;


        croppedMat.copyTo(marksMat.submat(new Rect(x, y, cols, rows)));

        grayFile = Environment.getExternalStorageDirectory().getPath() +
                "/"+name+"_fast" + currentDateandTime + ".jpg";
        saveImage(marksMat, grayFile);
        System.out.println("marksMat "+marksMat.toString());

        //mean and std deviation
        MatOfDouble mu = new MatOfDouble();
        MatOfDouble sigma = new MatOfDouble();
        Core.meanStdDev(marksMat, mu, sigma);
        double mean = mu.get(0,0)[0];
        double std = sigma.get(0,0)[0];
        System.out.println("i: "+i+"j: "+j+"mean: "+mean+" std:  "+std);
        Mat marksMat1 =  new Mat();
        Core.subtract(marksMat, mu, marksMat1);
        Mat marksMatFinal = new Mat();
        Core.divide(marksMat1, sigma, marksMatFinal);


        //save
        ReactContext reactContext = getReactApplicationContext();
        String cacheDir = reactContext.getCacheDir().getPath();

        fileName = Environment.getExternalStorageDirectory().getPath() +
                "/"+name+"_" + currentDateandTime + ".jpg";

        saveImage(marksMatFinal, fileName);
        runModel(marksMatFinal, i, j, summaryTable, markstable, countourSize);
    }

    public int getMarksValue(float[] arr) {
        int i;
        int index = 0;
        double max = arr[0];

        for (i = 1; i < arr.length; i++){
            Log.d(TAG, "value : "+arr[i]+" max: "+max);
            if (arr[i] > max) {
                Log.d(TAG, "index : " + i);
                max = arr[i];
                index = i;
            }
        }
        return index;
    }

    public void predictedData(int predictionResult, int i, int j, int contourSize, JsonObject summaryTable, JsonObject marksTable) {
        if(j != contourSize-1){
            if(i == 1 && (j == 2 || j == 5)){
                finalPredictedStudentIdorDate = finalPredictedStudentIdorDate.concat("/");
            }
            else{
                finalPredictedStudentIdorDate = finalPredictedStudentIdorDate.concat(Integer.toString(predictionResult));
            }

        }
        else if(j == contourSize-1) {
            finalPredictedStudentIdorDate = finalPredictedStudentIdorDate.concat(Integer.toString(predictionResult));
            JsonObject data = new JsonObject();
            if (i == 0) {

                data.addProperty("row", i);
                data.addProperty("col", 1);
                data.addProperty("text", finalPredictedStudentIdorDate);

                JsonArray dataArray;
                dataArray = (JsonArray) summaryTable.get("data");
                dataArray.add(data);
                summaryTable.add("data", dataArray);
            } else if (i == 1) {
                data.addProperty("row", i);
                data.addProperty("col", 1);
                data.addProperty("text", finalPredictedStudentIdorDate);

                JsonArray dataArray;
                dataArray = (JsonArray) summaryTable.get("data");
                dataArray.add(data);
                summaryTable.add("data", dataArray);
            } else if (i > 3) {

                data.addProperty("row", i - 3);
                data.addProperty("col", 1);
                data.addProperty("text", Integer.toString(predictionResult));

                JsonArray dataArray;
                dataArray = (JsonArray) marksTable.get("data");
                dataArray.add(data);
                marksTable.add("data", dataArray);
            }
            if(i == 13){
                WritableArray result1 = new WritableNativeArray();
                result1.pushString(summaryTable.toString());
                result1.pushString(marksTable.toString());
                System.out.println("result1::  "+result1.toString());
                resultPromise.resolve(result1);
            }
            finalPredictedStudentIdorDate = "";
        }

        System.out.println("i: "+i+ " finalPredictedStudentIdorDate: "+finalPredictedStudentIdorDate+ " predictionResult: "+predictionResult);
    }

    public void runModel(Mat normalizedMat, int i, int j, JsonObject summaryTable, JsonObject marksTable, int countourSize) {

        if (mInterpreter == null) {
            Log.e(TAG, "Image classifier has not been initialized; Skipped.");
            return;
        }
        Log.d(TAG, "Image classifier has not been initialized; Skipped. " + normalizedMat.toString() + " ");
        // Create input data.

        ByteBuffer imgData = convertMatToByteBuffer(normalizedMat);
        try {
            FirebaseModelInputs inputs = new FirebaseModelInputs.Builder().add(imgData).build();
            mInterpreter
                    .run(inputs, mDataOptions)
                    .addOnSuccessListener(
                            result -> {
                                float[][] output = result.getOutput(0);
                                float[] probabilities = output[0];
                                int predictedNumber = getMarksValue(probabilities);
                                Log.d(TAG, "TestDataResult" + Arrays.toString(probabilities)+ " number: "+predictedNumber);
                                Log.d(TAG, "finalPredictedValue " + predictedNumber+ " finalPredictedStudentIdorDate: "+finalPredictedStudentIdorDate+ " j value: " + j+ " countourSize: "+countourSize);
                                predictedData(predictedNumber, i, j, countourSize, summaryTable, marksTable);

                            })
                    .addOnFailureListener(e -> {
                        e.printStackTrace();
                        showToast("Error running model inference");
//                        promise.reject("Error running model inference");
                        resultPromise.reject("Error running model inference");
                    });

        } catch (FirebaseMLException e) {
            e.printStackTrace();
            showToast("Error running model inference");
//            promise.reject("Error running model inference");
            resultPromise.reject("Error running model inference");
        }
    }
    /**
     * Writes Image data into a {@code ByteBuffer}.
     */
    private synchronized ByteBuffer convertMatToByteBuffer(Mat normalizedMat) {

        int bytesPerChannel = 4;

        ByteBuffer imgData =
                ByteBuffer.allocateDirect(bytesPerChannel * DIM_BATCH_SIZE * DIM_IMG_SIZE_X * DIM_IMG_SIZE_Y * DIM_PIXEL_SIZE);
        imgData.order(ByteOrder.nativeOrder());

        imgData.rewind();

        long startTime = SystemClock.uptimeMillis();

        for (int i = 0; i < DIM_IMG_SIZE_Y; ++i) {
            for (int j = 0; j < DIM_IMG_SIZE_X; ++j) {
                imgData.putFloat((float)normalizedMat.get(i,j)[0]);
            }
        }
        long endTime = SystemClock.uptimeMillis();
        Log.d(TAG, "Timecost to put values into ByteBuffer: " + (endTime - startTime));
        return imgData;
    }

    @ReactMethod
    public void runCustomModel(String uri, Promise promise) throws FileNotFoundException {
        if (mInterpreter == null) {
            Log.e(TAG, "Image classifier has not been initialized; Skipped.");
            return;
        }
        Log.d(TAG, "Image classifier has not been initialized; Skipped. " + uri + " ");
        // Create input data.
        
       ByteBuffer imgData = convertBitmapToByteBuffer(uri);
     
        try {
            FirebaseModelInputs inputs = new FirebaseModelInputs.Builder().add(imgData).build();
            mInterpreter
                    .run(inputs, mDataOptions)
                    .addOnSuccessListener(
                            result -> {
                                WritableArray topLabels = Arguments.createArray();
                                float[][] output = result.getOutput(0);
                                float[] probabilities = output[0];
                                int number = getMarksValue(probabilities);
                                Log.d(TAG, "TestDataResult" + Arrays.toString(probabilities)+ " number: "+number+ " uri"+uri);
                                topLabels.pushInt(number);
                                promise.resolve(topLabels);
//                                return; topLabels;
                            })
                    .addOnFailureListener(e -> {
                        e.printStackTrace();
                        showToast("Error running model inference");
                            promise.reject("Error running model inference");

                    });

        } catch (FirebaseMLException e) {
            e.printStackTrace();
            showToast("Error running model inference");
            promise.reject("Error running model inference");
        }
    }

    /**
     * Writes Image data into a {@code ByteBuffer}.
     */
    private synchronized ByteBuffer convertBitmapToByteBuffer(String path) throws FileNotFoundException {

        int bytesPerChannel = 4;
        InputStream inputStream = new FileInputStream(path.replace("file://", ""));
        Bitmap bitmap = BitmapFactory.decodeStream(inputStream);

        ByteBuffer imgData =
                ByteBuffer.allocateDirect(bytesPerChannel * DIM_BATCH_SIZE * DIM_IMG_SIZE_X * DIM_IMG_SIZE_Y * DIM_PIXEL_SIZE);
        imgData.order(ByteOrder.nativeOrder());

        imgData.rewind();

        long startTime = SystemClock.uptimeMillis();

        Mat imgMat = new Mat();
        Utils.bitmapToMat(bitmap, imgMat);

        for (int i = 0; i < DIM_IMG_SIZE_Y; ++i) {
            for (int j = 0; j < DIM_IMG_SIZE_X; ++j) {
                imgData.putFloat((float)imgMat.get(i,j)[0]);
            }
        }
        long endTime = SystemClock.uptimeMillis();
        Log.d(TAG, "Timecost to put values into ByteBuffer: " + (endTime - startTime));
        return imgData;
    }

    @Override
    public String getName() {
        return "RNCustomModel";
    }

    private void showToast(String message) {
        Toast.makeText(getReactApplicationContext(), message, Toast.LENGTH_SHORT).show();
    }


//    @Override
//    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
//        if (requestCode == 1) {
//            Log.d(TAG, "DatagetDataString "+data.getDataString());
//            //example for handling success response
//            this.mPromise.resolve(data.getStringExtra("fileName")); // you can further process this data in react native component.
//
//        }
//        else{
//            //example for handling error response
//            this.mPromise.reject("Error fetching");
//        }
//    }

//    @Override
//    public void onNewIntent(Intent intent) {
//
//    }
}