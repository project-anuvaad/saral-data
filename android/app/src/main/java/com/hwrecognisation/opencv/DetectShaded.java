package com.hwrecognisation.opencv;

import android.util.Log;

import com.hwrecognisation.commons.CVOperations;

import org.opencv.core.Core;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.Rect;
import org.opencv.core.Size;
import org.opencv.imgproc.Imgproc;

import java.util.HashMap;

public class DetectShaded {
    private static final String  TAG                = "OCRApp::DetectShaded";
    private boolean DEBUG                           = false;
    private HashMap<String, Mat> mMats      = new HashMap<>();
    public DetectShaded(boolean debug){
        DEBUG = debug;
    }

    public HashMap<String, Mat> getmMats() {
        return mMats;
    }

    public double getShadedPercentage(Mat image, int top, int left, int bottom, int right) {
        Mat gray                            = new Mat();
        Imgproc.cvtColor(image, gray, Imgproc.COLOR_BGR2GRAY);
        Mat blurred = new Mat();
        Imgproc.GaussianBlur(gray, blurred, new Size(3, 3), 0);

        Mat canny   = new Mat();
        Imgproc.Canny(blurred, canny, 80, 100);

        Mat bw_img = new Mat();
        Imgproc.adaptiveThreshold(blurred, bw_img, 255, Imgproc.ADAPTIVE_THRESH_MEAN_C, Imgproc.THRESH_BINARY, 51, 0);
        Core.bitwise_not(bw_img, bw_img);


        Rect rect           = new Rect(left, top, right - left, bottom - top);
        Mat croppedImage    = new Mat(bw_img.clone(), rect);
        int total           = Core.countNonZero(croppedImage);
        double pixel        = total / croppedImage.width()*croppedImage.height();

        if (DEBUG) {
            Log.d(TAG, "input image width: " + image.width() + " height: " + image.height());
            Log.d(TAG, "rows: " + croppedImage.rows() + " cols: " + croppedImage.cols());
            CVOperations.saveImage(croppedImage, "rows-", 3, false);
        }
        return pixel;
    }

    public Mat getROIMat(Mat image, int top, int left, int bottom, int right, String id) {
        Rect rect           = new Rect(left, top, right - left, bottom - top);
        Mat croppedImage    = new Mat(image.clone(), rect);
        mMats.put(id, resizeImage(croppedImage));
        return resizeImage(croppedImage);
    }
    /**
     * Resize the rect to 28x28 size.
     */
    private final Mat resizeImage(Mat image) {
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
}
