/**
 * File Upload API
 */
import API from './api';
import C from '../constants';

export class AppUpdateAction extends API {
    constructor(payload, timeout = 30000) {
        super('GET', timeout, false);
        this.payload = payload;
        this.type = C.APP_UPDATE_CHECK;
    }

    toString() {
        return `${super.toString()} payload: ${this.payload} type: ${this.type}`
    }

    processResponse(res) {
        super.processResponse(res)
        if (res) {            
            this.response=res;
        }
    }

    apiEndPoint() {
        return `${super.apiEndPoint()}/UsersAPI/ValidateAppInfo?version=${this.payload.versionId}`;
    }

    getHeaders() {
        return
    }

    getPayload() {
        return this.response
    }

}