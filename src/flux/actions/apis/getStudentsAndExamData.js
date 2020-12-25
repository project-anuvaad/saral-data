/**
 * Students List and Exam Meta Data
 */
import API from '../apis/api';
import C from '../constants';

export class GetStudentsAndExamData extends API {
    constructor(requestBody, token, timeout = 30000) {
        super('POST', timeout, false);
        this.requestBody = requestBody;
        this.token = token;
        this.type = C.GET_STUDENTS_LIST;
    }

    toString() {
        return `${super.toString()} requestBody: ${this.requestBody} type: ${this.type}`
    }

    processResponse(res) {
        super.processResponse(res)
        if (res) {
            this.responseData=res;
        }
    }

    apiEndPoint() {
        // return `${super.apiEndPoint()}/app/v1/save-ocr-data`;
        return `${super.apiEndPoint()}/StudentsAPI/GetStudentsBySchoolIdClassId`;
    }

    getHeaders() {
        return {
            // headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${this.token}`
            // }
        }
    }

    getBody() {
        // return {
        //     "ocr": this.ocrData
        // }
        const data = Object.keys(this.requestBody).map(key =>
            encodeURIComponent(key) + '=' + encodeURIComponent(this.requestBody[key]))
            .join('&');
      
        return data
    }

    getPayload() {
        // return {
        //     response : this.responseData
        // }
        return this.responseData
    }

}