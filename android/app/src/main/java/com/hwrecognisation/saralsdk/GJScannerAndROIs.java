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
        try {
            JSONObject layoutROI        = layoutConfigsResult.getJSONObject("roi");
            JSONObject layoutObject     = layoutROI.getJSONObject("layout");
            JSONArray  cells            = layoutObject.getJSONArray("cells");

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
            resp.put("table", respTable);
        } catch (JSONException e) {
            Log.e(TAG, "Unable to parse Saral specs, failed to create response");
        }
        return resp;
    }
}

