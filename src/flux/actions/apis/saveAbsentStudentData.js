/**
 * File Upload API
 */
 import API from '../apis/api';
 import C from '../constants';
 
 export class SaveAbsentStudentData extends API {
     constructor(absentStudent, token, timeout = 30000) {
         super('POST', timeout, false);
         this.absentStudent = absentStudent;
         this.token = token;
         this.type = C.SAVE_ABSENT_STUDENT_DATA;
     }
 
     toString() {
         return `${super.toString()} absentStudent: ${this.absentStudent} type: ${this.type}`
     }
 
     processResponse(res) {
         super.processResponse(res)
         if (res) {
             this.absentStudent=res;
         }
     }
 
     apiEndPoint() {
         return `${super.apiEndPoint()}/StudentsAPI/SaveAbsentees`;
     }
 
     getHeaders() {
         return {
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${this.token}`
         }
     }
 
     getBody() {
         return this.absentStudent
     }
 
     getPayload() {
         return {
             absentStudent : this.absentStudent
         }
     }
 
 }