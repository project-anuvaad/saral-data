package com.hwrecognisation.saralsdk;

import android.app.Activity;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;

public class GJScannerAndROIs {
    private static final String  TAG                    = "SrlSDK::ROIs";

    public static final int SCANNER_SAT           = 1;
    public static final int SCANNER_PAT           = 2;
    public static final int SCANNER_PAT34         = 3;

    public static String loadJSONFromAsset(Activity activity, int ScannerType) {
        String json     = null;
        String filename = null;

        if (ScannerType == SCANNER_PAT) {
            filename    = "GJPAT_5QROIs.json";
        } else {
            Log.d(TAG, "No ROIs defined corresponding to given scanner type: " + ScannerType);
            return new String();
        }

        try {
            InputStream is  = activity.getAssets().open(filename);
            int size        = is.available();
            byte[] buffer   = new byte[size];
            is.read(buffer);
            is.close();
            json            = new String(buffer, "UTF-8");
        } catch (IOException ex) {
            ex.printStackTrace();
            return null;
        }
        return json;
    }

    /**
     * converts Saral Spec to older representation.
     * @param layoutConfigsResult
     * @return
     */
    public static JSONObject formatScanResultAsGJPAT_5QROIs(JSONObject layoutConfigsResult) {

        JSONObject resp             = new JSONObject();
        JSONArray respTable         = new JSONArray();
        JSONArray respTrainigDataSet = new JSONArray();
        JSONArray marksTrainigData = new JSONArray();
        JSONArray respTrainigDataSet1,respTrainigDataSet2,respTrainigDataSet3,respTrainigDataSet4,respTrainigDataSet5;

        try {
            JSONObject layoutROI        = layoutConfigsResult.getJSONObject("roi");
            JSONObject layoutObject     = layoutROI.getJSONObject("layout");
            JSONArray  cells            = layoutObject.getJSONArray("cells");

            respTrainigDataSet = cells.getJSONObject(0).getJSONArray("trainingDataSet");

            respTrainigDataSet1 = cells.getJSONObject(1).getJSONArray("trainingDataSet");
            respTrainigDataSet2 = cells.getJSONObject(2).getJSONArray("trainingDataSet");
            respTrainigDataSet3 = cells.getJSONObject(3).getJSONArray("trainingDataSet");
            respTrainigDataSet4 = cells.getJSONObject(4).getJSONArray("trainingDataSet");
            respTrainigDataSet5 = cells.getJSONObject(5).getJSONArray("trainingDataSet");

            try {
                for (int i = 0; i < respTrainigDataSet1.length(); i++) {
                    String jsonObject = respTrainigDataSet1.getString(i);
                    marksTrainigData.put(jsonObject);
                }
                for (int i = 0; i < respTrainigDataSet2.length(); i++) {
                    String jsonObject = respTrainigDataSet2.getString(i);
                    marksTrainigData.put(jsonObject);
                }
                for (int i = 0; i < respTrainigDataSet3.length(); i++) {
                    String jsonObject = respTrainigDataSet3.getString(i);
                    marksTrainigData.put(jsonObject);
                }
                for (int i = 0; i < respTrainigDataSet4.length(); i++) {
                    String  jsonObject = respTrainigDataSet4.getString(i);
                    marksTrainigData.put(jsonObject);
                }
                for (int i = 0; i < respTrainigDataSet5.length(); i++) {
                    String jsonObject = respTrainigDataSet5.getString(i);
                    marksTrainigData.put(jsonObject);
                }
            }catch(JSONException e) {
                    e.printStackTrace();
                }

            for (int i = 0; i < cells.length(); i++) {
                StringBuffer sb         = new StringBuffer();
                JSONArray cellROIs      = cells.getJSONObject(i).getJSONArray("rois");
                JSONObject cellformat   = cells.getJSONObject(i).getJSONObject("format");

                for (int j = 0; j < cellROIs.length(); j++) {
                    JSONObject result   = cellROIs.getJSONObject(j).getJSONObject("result");
                    int prediction      = result.getInt("prediction");
                    double confidence   = result.getDouble("confidence");

                    if (confidence <= 0.98) {
                        sb.append("0");
                    } else {
                        sb.append(new Integer(prediction).toString());
                    }
                }

                String formatValue      = cellformat.getString("value");
                if (formatValue.equals("0")) {
                    // This is rollnumber row
                    JSONObject res = new JSONObject();
                    res.put(formatValue, sb.toString());
                    respTable.put(res);
                } else {
                    // All other are multichoice OMRs
                    int indexOfOne  = sb.toString().indexOf("1");
                    Log.d(TAG, "Index of 1: " + indexOfOne + " in given string: " + sb.toString() + " for value " + formatValue);

                    if (indexOfOne != -1) {
                        JSONObject res = new JSONObject();
                        res.put(formatValue, new Integer(indexOfOne).toString());
                        respTable.put(res);
                    } else {
                        JSONObject res = new JSONObject();
                        res.put(formatValue, "0");
                        respTable.put(res);
                    }
                }
            }
            /**
             * putting dummy data.
             */
            JSONObject res6 = new JSONObject();
            res6.put("6", "0");
            respTable.put(res6);

            JSONObject res7 = new JSONObject();
            res7.put("7", "0");
            respTable.put(res7);

            JSONObject res8 = new JSONObject();
            res8.put("8", "0");
            respTable.put(res8);

            JSONObject res9 = new JSONObject();
            res9.put("9", "0");
            respTable.put(res9);

            JSONObject res10 = new JSONObject();
            res10.put("10", "0");
            respTable.put(res10);

            JSONObject res11 = new JSONObject();
            res11.put("11", "0");
            respTable.put(res11);

            JSONObject res12 = new JSONObject();
            res12.put("12", "0");
            respTable.put(res12);

            JSONObject res13 = new JSONObject();
            res13.put("13", respTrainigDataSet);
            respTable.put(res13);

            JSONObject res14 = new JSONObject();
            res14.put("14", marksTrainigData);
            respTable.put(res14);

            resp.put("table", respTable);
        } catch (JSONException e) {
            Log.e(TAG, "Unable to parse Saral specs, failed to create response");
        }
        return resp;
    }
}

