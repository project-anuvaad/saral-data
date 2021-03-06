import apiStatus from './apiStatus/apiStatus';
import saveOcrDataReducer from './saveOcrDataReducer'
import loginReducer from './loginReducer';
import ocrProcessLocalReducer from './ocrProcessLocalReducer';
import OngoingScanDetailsReducer from './OngoingScanDetailsReducer';
import getStudentsAndExamDataReducer from './getStudentsAndExamDataReducer';
import saveTelemetryReducer from './saveTelemetryReducer';
import getScanStatusReducer from './getScanStatusReducer';
import filteredDataReducer from './filteredDataReducer';
import appUpdateReducer from './appUpdateReducer';

export default {
    apiStatus: apiStatus,
    saveTelemetry : saveTelemetryReducer,
    saveOcrData : saveOcrDataReducer,
    loginData: loginReducer,
    ocrProcessLocal: ocrProcessLocalReducer,
    ongoingScanDetails: OngoingScanDetailsReducer,
    studentsAndExamData: getStudentsAndExamDataReducer,
    getScanStatusData: getScanStatusReducer,
    filteredData: filteredDataReducer,
    appUpdateData: appUpdateReducer
}