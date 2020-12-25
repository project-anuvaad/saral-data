/**
 * File Upload API
 */
import API from './api';
import C from '../constants';

export class SaveTelemetryAction extends API {
    constructor(telemetryData, token, timeout = 30000) {
        super('POST', timeout, false);
        this.telemetryData = telemetryData;
        this.token = token;
        this.type = C.SAVE_TELEMETRY;
    }

    toString() {
        return `${super.toString()} telemetryData: ${this.telemetryData} type: ${this.type}`
    }

    processResponse(res) {
        super.processResponse(res)
        if (res) {
            this.telemetryData=res;
        }
    }

    apiEndPoint() {
        return `${super.apiEndPoint()}/StudentsAPI/SaveTrainingData`;
    }

    getHeaders() {
        return {
            // headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            // }
        }
    }

    getBody() {
        return this.telemetryData
        
    }

    getPayload() {
        return {
            telemetryData : this.telemetryData
        }
    }

}