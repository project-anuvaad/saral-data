/**
 * File Upload API
 */
import API from '../apis/api';
import C from '../constants';

export class SaveOcrDataAction extends API {
    constructor(ocrData, token, timeout = 30000) {
        super('POST', timeout, false);
        this.ocrData = ocrData;
        this.token = token;
        this.type = C.SAVE_OCR_DATA;
    }

    toString() {
        return `${super.toString()} ocrData: ${this.ocrData} type: ${this.type}`
    }

    processResponse(res) {
        super.processResponse(res)
        if (res) {
            this.ocrData=res;
        }
    }

    apiEndPoint() {
        // return `${super.apiEndPoint()}/app/v1/save-ocr-data`;
        return `${super.apiEndPoint()}/StudentsAPI/SaveStudentsMarksByExam`;
    }

    getHeaders() {
        return {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
        }
    }

    getBody() {
        // return {
        //     "ocr": this.ocrData
        // }
        return this.ocrData
    }

    getPayload() {
        return {
            ocrData : this.ocrData
        }
    }

}