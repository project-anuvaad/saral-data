package com.hwrecognisation.opencv;

import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;

public class ExtractROIs {
    private static final String  TAG                = "OCRApp::ROIs";
    private boolean DEBUG                           = false;
    public ExtractROIs(boolean debug){
        DEBUG = debug;
    }

    public JSONArray getGJSAT_ROIs() {
        String str = "[{\"method\":\"classify\",\"question\":1,\"bottom\":184,\"right\":211,\"top\":153,\"left\":177,\"col\":0,\"name\":\"1\",\"index\":0,\"row\":0},{\"method\":\"classify\",\"question\":1,\"bottom\":184,\"right\":267,\"top\":153,\"left\":233,\"col\":0,\"name\":\"1\",\"index\":1,\"row\":0},{\"method\":\"classify\",\"question\":7,\"bottom\":184,\"right\":503,\"top\":153,\"left\":469,\"col\":1,\"name\":\"1\",\"index\":0,\"row\":0},{\"method\":\"classify\",\"question\":7,\"bottom\":184,\"right\":559,\"top\":153,\"left\":525,\"col\":1,\"name\":\"1\",\"index\":1,\"row\":0},{\"method\":\"classify\",\"question\":2,\"bottom\":237,\"right\":211,\"top\":206,\"left\":177,\"col\":0,\"name\":\"2\",\"index\":0,\"row\":1},{\"method\":\"classify\",\"question\":2,\"bottom\":237,\"right\":267,\"top\":206,\"left\":233,\"col\":0,\"name\":\"2\",\"index\":1,\"row\":1},{\"method\":\"classify\",\"question\":8,\"bottom\":237,\"right\":503,\"top\":206,\"left\":469,\"col\":1,\"name\":\"2\",\"index\":0,\"row\":1},{\"method\":\"classify\",\"question\":8,\"bottom\":237,\"right\":559,\"top\":206,\"left\":525,\"col\":1,\"name\":\"2\",\"index\":1,\"row\":1},{\"method\":\"classify\",\"question\":3,\"bottom\":290,\"right\":211,\"top\":259,\"left\":177,\"col\":0,\"name\":\"3\",\"index\":0,\"row\":2},{\"method\":\"classify\",\"question\":3,\"bottom\":290,\"right\":267,\"top\":259,\"left\":233,\"col\":0,\"name\":\"3\",\"index\":1,\"row\":2},{\"method\":\"classify\",\"question\":9,\"bottom\":290,\"right\":503,\"top\":259,\"left\":469,\"col\":1,\"name\":\"3\",\"index\":0,\"row\":2},{\"method\":\"classify\",\"question\":9,\"bottom\":290,\"right\":559,\"top\":259,\"left\":525,\"col\":1,\"name\":\"3\",\"index\":1,\"row\":2},{\"method\":\"classify\",\"question\":4,\"bottom\":343,\"right\":211,\"top\":312,\"left\":177,\"col\":0,\"name\":\"4\",\"index\":0,\"row\":3},{\"method\":\"classify\",\"question\":4,\"bottom\":343,\"right\":267,\"top\":312,\"left\":233,\"col\":0,\"name\":\"4\",\"index\":1,\"row\":3},{\"method\":\"classify\",\"question\":10,\"bottom\":343,\"right\":503,\"top\":312,\"left\":469,\"col\":1,\"name\":\"4\",\"index\":0,\"row\":3},{\"method\":\"classify\",\"question\":10,\"bottom\":343,\"right\":559,\"top\":312,\"left\":525,\"col\":1,\"name\":\"4\",\"index\":1,\"row\":3},{\"method\":\"classify\",\"question\":5,\"bottom\":396,\"right\":211,\"top\":363,\"left\":177,\"col\":0,\"name\":\"5\",\"index\":0,\"row\":4},{\"method\":\"classify\",\"question\":5,\"bottom\":396,\"right\":267,\"top\":363,\"left\":233,\"col\":0,\"name\":\"5\",\"index\":1,\"row\":4},{\"method\":\"classify\",\"question\":11,\"bottom\":396,\"right\":503,\"top\":365,\"left\":469,\"col\":1,\"name\":\"5\",\"index\":0,\"row\":4},{\"method\":\"classify\",\"question\":11,\"bottom\":396,\"right\":559,\"top\":365,\"left\":525,\"col\":1,\"name\":\"5\",\"index\":1,\"row\":4},{\"method\":\"classify\",\"question\":6,\"bottom\":449,\"right\":211,\"top\":416,\"left\":177,\"col\":0,\"name\":\"6\",\"index\":0,\"row\":5},{\"method\":\"classify\",\"question\":6,\"bottom\":449,\"right\":267,\"top\":416,\"left\":233,\"col\":0,\"name\":\"6\",\"index\":1,\"row\":5},{\"method\":\"classify\",\"question\":12,\"bottom\":449,\"right\":503,\"top\":418,\"left\":469,\"col\":1,\"name\":\"6\",\"index\":0,\"row\":5},{\"method\":\"classify\",\"question\":12,\"bottom\":449,\"right\":559,\"top\":418,\"left\":525,\"col\":1,\"name\":\"6\",\"index\":1,\"row\":5},{\"method\":\"classify\",\"left\":187,\"right\":217,\"top\":42,\"bottom\":72,\"col\":-1,\"name\":\"1\",\"index\":0,\"row\":-1},{\"method\":\"classify\",\"left\":228,\"right\":258,\"top\":42,\"bottom\":72,\"col\":-1,\"name\":\"1\",\"index\":1,\"row\":-1},{\"method\":\"classify\",\"left\":269,\"right\":299,\"top\":42,\"bottom\":72,\"col\":-1,\"name\":\"1\",\"index\":2,\"row\":-1},{\"method\":\"classify\",\"left\":310,\"right\":340,\"top\":42,\"bottom\":72,\"col\":-1,\"name\":\"1\",\"index\":3,\"row\":-1},{\"method\":\"classify\",\"left\":351,\"right\":381,\"top\":42,\"bottom\":72,\"col\":-1,\"name\":\"1\",\"index\":4,\"row\":-1},{\"method\":\"classify\",\"left\":392,\"right\":422,\"top\":42,\"bottom\":72,\"col\":-1,\"name\":\"1\",\"index\":5,\"row\":-1},{\"method\":\"classify\",\"left\":433,\"right\":463,\"top\":42,\"bottom\":72,\"col\":-1,\"name\":\"1\",\"index\":6,\"row\":-1}]";
        try {
            JSONArray array = new JSONArray(str);
            if (DEBUG) {
                Log.d(TAG, "ROIs: " + array.toString(4));
            }
            return array;
        } catch (JSONException e) {
            Log.e(TAG, "unable to parse getGJSAT_ROIs object");
            return null;
        }
    }
}
