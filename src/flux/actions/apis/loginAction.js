/**
 * Login API
 */
import API from '../apis/api';
import C from '../constants';

export class LoginAction extends API {
    constructor(username, password, timeout = 30000) {
        super('POST', timeout, false);
        this.username = username;
        this.password = password;
        this.type = C.LOGIN_PROCESS;
    }

    toString() {
        return `${super.toString()} username: ${this.username} password: ${this.password} type: ${this.type}`
    }

    processResponse(res) {
        super.processResponse(res)
        if (res) {
            this.loginDetails=res;
        }
    }

    apiEndPoint() {
        // return `${super.apiEndPoint()}/app/v1/login`;
        // return `${super.apiEndPoint()}/user/login?teacher=true&school=true&students=true&exams=true&examsMetadata=true`
        return `${super.apiEndPoint()}/UsersAPI/ValidateUser`
    }

    getHeaders() {
        return {
            // headers: {
                // 'Content-Type': 'application/json',
                // 'Content-Type': 'multipart/form-data',
                'Content-Type': 'application/x-www-form-urlencoded',
            // }
        }
    }

    getBody() {
        let params = {
            userName: this.username,
            password: this.password,
            classes: true
        }
        // let data = new FormData()
        // data.append('username', this.username)
        // data.append('password', this.password)
       const data = Object.keys(params).map(key =>
            encodeURIComponent(key) + '=' + encodeURIComponent(params[key]))
            .join('&');
      
        return data
        // return {
        //     'username': this.username,
        //     'password': this.password
        // }
    }

    getPayload() {
        return this.loginDetails
        
    }

}