import React, { Component } from 'react';
import { View, Alert, BackHandler } from 'react-native';
import ScanHistoryComponent from '../components/ScanHistoryComponent';
import Spinner from '../../common/components/loadingIndicator';
import HeaderComponent from '../../common/components/HeaderComponent';
import AppTheme from '../../../utils/AppTheme';
import Strings from '../../../utils/Strings';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { OngoingScanDetailsAction } from '../../../flux/actions/apis/ongoingScanDetailsActions';
import { SaveOcrDataAction } from '../../../flux/actions/apis/saveOcrDataAction';
import APITransport from '../../../flux/actions/transport/apitransport';
import AsyncStorage from '@react-native-community/async-storage';
import { getScanData, getLoginData, setScanData, getStudentsExamData, getLoginCred, setLoginData, setStudentsExamData, setFetchedScanData, numberOfAbsentStudent } from '../../../utils/StorageUtils'
import { cryptoText, validateToken } from '../../../utils/CommonUtils'
import { LoginAction } from '../../../flux/actions/apis/loginAction';
import { SaveTelemetryAction } from '../../../flux/actions/apis/saveTelemetryAction';
import { GetScanStatusAction } from '../../../flux/actions/apis/getScanStatus';
import _ from 'lodash'
import { GetStudentsAndExamData } from '../../../flux/actions/apis/getStudentsAndExamData';
import { apkVersion } from '../../../configs/config'

var uuid = require('react-native-uuid');
class ScanHistoryContainer extends Component {
    constructor(props) {
        super(props);

        this.state = {
            isLoading: true,
            loaderText: '',
            iconShow: false,
            submittedExamCode: '',
            submittedClass: '',
            submittedSection: '',
            scanData: null,
            loginData: null,
            studentsExamData: null,
            calledApi: false,
            username: '',
            password: '',
            dataPayload: null,
            telemetryData: null,
            savedTelemetryLength: 0,
            currentSavingTelemetry: null,
            calledLogin: false,
            fetchedScanStatus: [],
            calledScanStaus: false,
            callApi: '',
            studentsDataPayload: null,
            calledStudentsApi: '',
            studentsApiPayloadCount: 0,
            onGoingData: [],
            completedData: [],
            numberofAbsent:null
        }

        this.onBack = this.onBack.bind(this)
    }

    componentDidMount() {
        const { navigation, getScanStatusData } = this.props
        navigation.addListener('didFocus', async payload => {
            let scanData = await getScanData()
            let loginData = await getLoginData()
            let studentsExamData = await getStudentsExamData()
            let absentStudent=await numberOfAbsentStudent();

            let res=await JSON.parse(absentStudent)
            this.setState({
                numberofAbsent:res.length
            }) 
            
            if (scanData) {
                this.setState({
                    scanData
                })
            }
            if (studentsExamData) {
                this.setState({
                    studentsExamData,
                    studentsApiPayloadCount: 0
                })
            }
            if (loginData) {
                this.setState({
                    loginData
                }, () => {
                    // this.validateScanStatusApi()
                    if (getScanStatusData && getScanStatusData.status && getScanStatusData.status == 200) {
                        // this.setState({ isLoading: true })
                        this.refactorData()
                    }
                })
            }
            BackHandler.addEventListener('hardwareBackPress', this.onBack)
        })
        this.willBlur = navigation.addListener('willBlur', payload =>
            BackHandler.removeEventListener('hardwareBackPress', this.onBack)
        );
    }

    refactorData = async () => {
        const { getScanStatusData } = this.props
        let respString = ''
        let resArr = []
        _.forEach(getScanStatusData.data, (data) => {
            respString += data
        })
        if (respString.length > 0) {
            resArr = JSON.parse(respString)
        }
        let fetchedScanData = JSON.parse(JSON.stringify(resArr))
        _.forEach(fetchedScanData, (data) => {
            data.Section = data.Section.trim().toUpperCase()
        })
        let fetchedScanSaved = await setFetchedScanData(fetchedScanData)
        if (fetchedScanSaved) {
            this.setState({
                fetchedScanStatus: fetchedScanData,
            }, () => {
                if (fetchedScanData.length > 0) {
                    this.checkStudentsDataExistsForScanData(fetchedScanData)
                } else {
                    this.setState({ isLoading: false }, () => {
                        this.createCardData()
                    })
                }
            })
        }
    }

    onBack = () => {
        const { navigation, filteredData } = this.props
        const { params } = navigation.state
        if (params && params.from_screen && params.from_screen == 'cameraActivity') {
        }
        let scanType = filteredData.response.scanType
        this.props.navigation.navigate('selectDetails', { from_screen: 'cameraActivity', scanType: scanType })
        return true
    }

    filterScanData = (scanData) => {
        const { filteredData } = this.props
        let response = filteredData.response
        let scanFilteredExamData = []
        _.forEach(scanData, (item) => {
            if(item.exam_code.trim() == response.examCode.trim()) {
                scanFilteredExamData.push(item)
            }
        })
        let scanFilterData = []
        if(response.section.trim().toUpperCase() == 'ALL') {
            _.forEach(scanFilteredExamData, (item) => {
                if(item.class_code == response.className) {
                    scanFilterData.push(item)
                }
            })
        } else {
            _.forEach(scanFilteredExamData, (item) => {
                if(item.class_code == response.className && item.section.trim().toUpperCase() == response.section.trim().toUpperCase()) {
                    scanFilterData.push(item)
                }
            })
        }

        return scanFilterData
    }

    createCardData = async () => {
        const { scanData, loginData, studentsExamData, fetchedScanStatus,numberofAbsent } = this.state
        
        const { filteredData } = this.props
        let filteredDataRsp = filteredData.response
        if (loginData && studentsExamData) {
            let classes = [...loginData.classInfo]
            let students = _.filter(studentsExamData, function (o) {
                if (o.class) {
                    for (let i = 0; i < classes.length; i++) {
                        if (o.class == classes[i].className) {
                            return o;
                        }
                    }
                }
            });
            let groupStudentsByClass = _.groupBy(students, 'class')

            let completedScan = []
            let ongoingScan = []
            

            if (fetchedScanStatus.length > 0) {
                if (scanData) {
                    let scanFilterData = this.filterScanData(scanData)
                    let groupScanByExams = _.groupBy(scanFilterData, 'exam_code')
                        _.forEach(groupScanByExams, (scanElement) => {
                        let groupClassByExam = _.groupBy(scanElement, 'class_code')
                        let fetchedCount = 0
                        _.forEach(groupClassByExam, (classElement) => {
                            let groupSectionByExam = _.groupBy(classElement, 'section')
                            _.forEach(groupSectionByExam, (sectionElement) => {

                                let groupFetchedScanByExams = _.groupBy(fetchedScanStatus, 'examCode')
                                if (groupFetchedScanByExams[sectionElement[0].exam_code]) {
                                    let groupFetchedSectionByExam = _.groupBy(groupFetchedScanByExams[sectionElement[0].exam_code], 'Section')                                    
                                    let groupFetchedClassByExam = _.groupBy(groupFetchedScanByExams[sectionElement[0].exam_code], 'studyingClass')
                                    if (sectionElement[0].section.trim().toUpperCase() == 'ALL') {
                                        let classId = classElement[0].student.studyingClass
                                        if (groupFetchedClassByExam[classId]) {
                                            _.forEach(groupFetchedClassByExam[classId], (o) => {
                                                fetchedCount += o.EntryCompletedStudents.length;
                                                _.forEach(sectionElement, (data) => {
                                                    for (let i = 0; i < o.EntryCompletedStudents.length; i++) {
                                                        if (data.student.aadhaarUID == o.EntryCompletedStudents[i].AadhaarUID) {
                                                            fetchedCount--;
                                                            break;
                                                        }
                                                    }
                                                })
                                            })
                                        }
                                    }
                                    else if (groupFetchedSectionByExam[sectionElement[0].section.trim().toUpperCase()]) {
                                        let fetchedSectionElement = groupFetchedSectionByExam[sectionElement[0].section.trim().toUpperCase()]
                                        fetchedCount = fetchedSectionElement[0].EntryCompletedStudents.length

                                        if (fetchedSectionElement[0].examCode.trim() == sectionElement[0].exam_code.trim() && fetchedSectionElement[0].Section.trim().toLowerCase() == sectionElement[0].section.trim().toLowerCase()) {
                                            _.forEach(sectionElement, (data) => {
                                                for (let i = 0; i < fetchedSectionElement[0].EntryCompletedStudents.length; i++) {
                                                    if (data.student.aadhaarUID == fetchedSectionElement[0].EntryCompletedStudents[i].AadhaarUID) {
                                                        fetchedCount--;
                                                        break;
                                                    }
                                                }
                                            })
                                        }
                                    }
                                }

                                let studentStrength = 0
                                let scanCount = 0
                                let saveCount = 0
                                _.forEach(groupStudentsByClass[sectionElement[0].class_code], (item) => {
                                    if (item.section.trim().toUpperCase() == sectionElement[0].section.trim().toUpperCase()) {
                                        studentStrength = item.data.studentsInfo.length
                                        _.forEach(sectionElement, (element) => {
                                            _.forEach(item.data.studentsInfo, (data) => {
                                                if (element.student.aadhaarUID == data.aadhaarUID) {
                                                    scanCount++;
                                                    if (element && element.save_status == 'Yes') {
                                                        saveCount++
                                                    }
                                                }
                                            })
                                        })
                                    }
                                })

                                if (studentStrength == 0) {
                                    let divideAllSectiontoSection = []
                                    let groupStudentDataBySection = _.groupBy(groupStudentsByClass[sectionElement[0].class_code], 'section')
                                    if (groupStudentDataBySection['All']) {
                                        let studentsArrList = JSON.parse(JSON.stringify(groupStudentDataBySection['All'][0].data.studentsInfo))
                                        _.forEach(studentsArrList, (data) => {
                                            data.section = data.section.trim().toUpperCase()
                                        })
                                        divideAllSectiontoSection = _.groupBy(studentsArrList, 'section')
                                        if (divideAllSectiontoSection[sectionElement[0].section.trim().toUpperCase()]) {
                                            studentStrength = divideAllSectiontoSection[sectionElement[0].section.trim().toUpperCase()].length
                                            _.forEach(sectionElement, (element) => {
                                                _.forEach(divideAllSectiontoSection[sectionElement[0].section.trim().toUpperCase()], (data) => {
                                                    if (element.student.aadhaarUID == data.aadhaarUID) {
                                                        scanCount++;
                                                        if (element && element.save_status == 'Yes') {
                                                            saveCount++
                                                        }
                                                    }
                                                })
                                            })
                                        }
                                    }
                                }

                                let status = scanCount + fetchedCount == studentStrength ? 'Completed' : scanCount + fetchedCount + ' of ' + studentStrength
                                // let status = sectionElement[0].class_code == "Class-11" && sectionElement[0].section == 'All' ? 'Completed' :  sectionElement.length+' of '+studentStrength
                                let saveCountStatus = saveCount + fetchedCount == studentStrength ? 'Completed' : saveCount + fetchedCount + ' of ' + studentStrength
                                
                                let checkIsComplete = saveCount + fetchedCount + numberofAbsent == studentStrength
                                
                                let obj = {
                                    className: sectionElement[0].class_code,
                                    section: sectionElement[0].section.trim(),
                                    testId: sectionElement[0].exam_code,
                                    testDate: sectionElement[0].exam_date,
                                    sessionId: sectionElement[0].session_id,
                                    scanStatus: status,
                                    saveStatus: saveCountStatus,
                                    absentStatus: numberofAbsent
                                }

                                if ((status == 'Completed' && saveCountStatus == 'Completed') || checkIsComplete) {
                                    completedScan.push(obj)
                                }
                                else {
                                    ongoingScan.push(obj)
                                }
                            })
                        })
                        })
                    this.setState({
                        onGoingData: ongoingScan,
                        completedData: completedScan
                    })
                }

                let groupScanByExams = _.groupBy(fetchedScanStatus, 'examCode')
                _.forEach(groupScanByExams, (element) => {
                    let groupClassByExam = _.groupBy(element, 'studyingClass')
                    _.forEach(groupClassByExam, (classElement) => {
                        let groupSectionByExam = _.groupBy(classElement, 'Section')
                        _.forEach(groupSectionByExam, (sectionElement) => {
                            let studentStrength = 0
                            let scanCount= 0
                            let examDate = filteredDataRsp.testDate
                            _.forEach(groupStudentsByClass["Class-" + sectionElement[0].studyingClass], (item) => {
                                if (item.section.trim().toLowerCase() == sectionElement[0].Section.trim().toLowerCase()) {
                                    studentStrength = item.data.studentsInfo.length
                                }
                            })

                            _.forEach(groupStudentsByClass[sectionElement[0].class_code], (item) => {
                                    if (item.section.trim().toUpperCase() == sectionElement[0].section.trim().toUpperCase()) {
                                        _.forEach(sectionElement, (element) => {
                                            _.forEach(item.data.studentsInfo, (data) => {
                                                if (element.student.aadhaarUID == data.aadhaarUID) {
                                                    scanCount++;
                                                }
                                            })
                                        })
                                    }
                                })

                            let saveCount = sectionElement[0].EntryCompletedStudents.length

                            let status = saveCount == studentStrength ? 'Completed' : saveCount + ' of ' + studentStrength
                            let saveCountStatus = saveCount == studentStrength ? 'Completed' : saveCount + ' of ' + studentStrength
                            let checkIsComplete = saveCount + numberofAbsent == studentStrength

                            let groupOngoingScanByExamId = ongoingScan.length > 0 ? _.groupBy(ongoingScan, 'testId') : []
                            let groupCompletedScanByExamId = completedScan.length > 0 ? _.groupBy(completedScan, 'testId') : []
                            if (groupOngoingScanByExamId[sectionElement[0].examCode] && groupOngoingScanByExamId[sectionElement[0].examCode][0].section.toUpperCase() == sectionElement[0].Section.toUpperCase()) {
                                _.forEach(groupOngoingScanByExamId[sectionElement[0].examCode], (o) => {
                                    if (o.section.trim().toUpperCase() != 'ALL') {
                                        let groupOngoingScanBySection = _.groupBy(groupOngoingScanByExamId[sectionElement[0].examCode], 'section')
                                        if (!groupOngoingScanBySection[sectionElement[0].Section]) {
                                            this.setScanArrData(ongoingScan, completedScan, sectionElement, examDate, status, saveCountStatus,numberofAbsent,checkIsComplete)
                                        }
                                    }
                                })
                            } else if (groupCompletedScanByExamId[sectionElement[0].examCode] && groupCompletedScanByExamId[sectionElement[0].examCode][0].section.toUpperCase() == sectionElement[0].Section.toUpperCase()) {
                                _.forEach(groupCompletedScanByExamId[sectionElement[0].examCode], (o) => {
                                    if (o.section.trim().toUpperCase() != 'ALL') {
                                        let groupCompletedScanBySection = _.groupBy(groupCompletedScanByExamId[sectionElement[0].examCode], 'section')
                                        if (!groupCompletedScanBySection[sectionElement[0].Section]) {
                                            this.setScanArrData(ongoingScan, completedScan, sectionElement, examDate, status, saveCountStatus,numberofAbsent,checkIsComplete)
                                        }
                                    }
                                })
                            } else {
                                this.setScanArrData(ongoingScan, completedScan, sectionElement, examDate, status, saveCountStatus,numberofAbsent,checkIsComplete)
                            }
                        })
                    })
                })
            }
            else if (fetchedScanStatus.length == 0) {
                this.createScanData(groupStudentsByClass, scanData,numberofAbsent)
            }
        }
    }

    setScanArrData = (ongoingScan, completedScan, sectionElement, examDate, status, saveCountStatus,numberofAbsent,checkIsComplete) => {
        let obj = {
            className: "Class-" + sectionElement[0].studyingClass,
            section: sectionElement[0].Section.trim(),
            testId: sectionElement[0].examCode.trim(),
            testDate: examDate,
            sessionId: sectionElement[0].examCode.trim() + '_' + uuid.v4(),
            scanStatus: status,
            saveStatus: saveCountStatus,
            absentStatus: numberofAbsent
        }
        if ((status == 'Completed' && saveCountStatus == 'Completed') || checkIsComplete) {
            completedScan.push(obj)
        }
        else {
            ongoingScan.push(obj)
        }

        this.setState({
            onGoingData: ongoingScan,
            completedData: completedScan
        })
    }

    createScanData = (groupStudentsByClass, scanData, numberofAbsent) => {
        const { filteredData } = this.props
        let response = filteredData.response
        let completedScan = []
        let ongoingScan = []
        let scanFilterData = this.filterScanData(scanData)        
        if(scanFilterData.length > 0) {
            let groupScanByExams = _.groupBy(scanFilterData, 'exam_code')
            _.forEach(groupScanByExams, (element) => {

                let groupClassByExam = _.groupBy(element, 'class_code')

                _.forEach(groupClassByExam, (classElement) => {
                    let groupSectionByExam = _.groupBy(classElement, 'section')
                    _.forEach(groupSectionByExam, (sectionElement) => {
                        let studentStrength = 0
                        let scanCount = 0
                        let saveCount = 0
                        _.forEach(groupStudentsByClass[sectionElement[0].class_code], (item) => {
                            if (item.section.trim().toUpperCase() == sectionElement[0].section.trim().toUpperCase()) {
                                studentStrength = item.data.studentsInfo.length
                                _.forEach(sectionElement, (element) => {
                                    _.forEach(item.data.studentsInfo, (data) => {
                                        if (element.student.aadhaarUID == data.aadhaarUID) {
                                            scanCount++;
                                            if (element && element.save_status == 'Yes') {
                                                saveCount++
                                            }
                                        }
                                    })
                                })
                            }
                        })
                        if (studentStrength == 0) {
                            let divideAllSectiontoSection = []
                            let groupStudentDataBySection = _.groupBy(groupStudentsByClass[sectionElement[0].class_code], 'section')
                            if (groupStudentDataBySection['All']) {
                                let studentsArrList = JSON.parse(JSON.stringify(groupStudentDataBySection['All'][0].data.studentsInfo))
                                _.forEach(studentsArrList, (data) => {
                                    data.section = data.section.trim().toUpperCase()
                                })
                                divideAllSectiontoSection = _.groupBy(studentsArrList, 'section')
                                if (divideAllSectiontoSection[sectionElement[0].section.trim().toUpperCase()]) {
                                    studentStrength = divideAllSectiontoSection[sectionElement[0].section.trim().toUpperCase()].length
                                    _.forEach(sectionElement, (element) => {
                                        _.forEach(divideAllSectiontoSection[sectionElement[0].section.trim().toUpperCase()], (data) => {
                                            if (element.student.aadhaarUID == data.aadhaarUID) {
                                                scanCount++;
                                                if (element && element.save_status == 'Yes') {
                                                    saveCount++
                                                }
                                            }
                                        })
                                    })
                                }
                            }
                        }

                        let status = scanCount == studentStrength ? 'Completed' : scanCount + ' of ' + studentStrength
                        let saveCountStatus = saveCount == studentStrength ? 'Completed' : saveCount + ' of ' + studentStrength
                        let checkIsComplete = saveCount  + numberofAbsent == studentStrength

                        let obj = {
                            className: sectionElement[0].class_code,
                            section: sectionElement[0].section.trim(),
                            testId: sectionElement[0].exam_code,
                            testDate: sectionElement[0].exam_date,
                            sessionId: sectionElement[0].session_id,
                            scanStatus: status,
                            saveStatus: saveCountStatus,
                            absentStatus: numberofAbsent

                        }

                        if ((status == 'Completed' && saveCountStatus == 'Completed') || checkIsComplete) {
                            completedScan.push(obj)
                        }
                        else {
                            ongoingScan.push(obj)
                        }
                    })
                })
            }) 
        } else if(scanFilterData.length == 0) {
            let studentStrength = 0
            let scanCount = 0
            let saveCount = 0
            _.forEach(groupStudentsByClass[response.className], (item) => {
                if (item.section.trim().toUpperCase() == response.section.trim().toUpperCase()) {
                    studentStrength = item.data.studentsInfo.length
                }
            })
            if (studentStrength == 0) {
                let divideAllSectiontoSection = []
                let groupStudentDataBySection = _.groupBy(groupStudentsByClass[response.className], 'section')
                if (groupStudentDataBySection['All']) {
                    let studentsArrList = JSON.parse(JSON.stringify(groupStudentDataBySection['All'][0].data.studentsInfo))
                    _.forEach(studentsArrList, (data) => {
                        data.section = data.section.trim().toUpperCase()
                    })
                    divideAllSectiontoSection = _.groupBy(studentsArrList, 'section')
                    if (divideAllSectiontoSection[response.section.trim().toUpperCase()]) {
                        studentStrength = divideAllSectiontoSection[sectionElement[0].section.trim().toUpperCase()].length
                    }
                }
            }

            let status = scanCount == studentStrength ? 'Completed' : scanCount + ' of ' + studentStrength
            let saveCountStatus = saveCount == studentStrength ? 'Completed' : saveCount + ' of ' + studentStrength
            let checkIsComplete = saveCount + numberofAbsent == studentStrength

            let obj = {
                className: response.className,
                section: response.section.trim(),
                testId: response.examCode.trim(),
                testDate: response.testDate,
                sessionId: response.sessionId,
                scanStatus: status,
                saveStatus: saveCountStatus,
                absentStatus: numberofAbsent
            }

            if ((status == 'Completed' && saveCountStatus == 'Completed') || checkIsComplete) {
                completedScan.push(obj)
            }
            else {
                ongoingScan.push(obj)
            }            
        }
        this.setState({
            onGoingData: ongoingScan,
            completedData: completedScan
        })
    }

    ongoingCardClick = (data) => {
        this.props.OngoingScanDetailsAction(data)
        // this.props.navigation.navigate('myScan')
    }

    completedCardClick = (data, className, section, telemetryArr) => {
        const { loginData } = this.state
        Alert.alert(
            Strings.message_text, 'Are you sure you want to save data?',
            [
                {
                    text: Strings.cancel_text,
                    style: 'destructive'
                },
                {
                    text: Strings.ok_text, onPress: async () => {

                        if (loginData) {
                            this.setState({
                                isLoading: true,
                                submittedExamCode: data.examCode.trim(),
                                submittedClass: className,
                                submittedSection: section,
                                dataPayload: data,
                                telemetryData: telemetryArr,
                                savedTelemetryLength: 0
                            }, () => {
                                let isTokenValid = validateToken(loginData.expiresOn)
                                if (isTokenValid) {
                                    this.callSaveApi(loginData.jwtToken, loginData.storeTrainingData)
                                }
                                else if (!isTokenValid) {
                                    this.setState({
                                        callApi: 'callSaveApi'
                                    })
                                    this.loginAgain()
                                }
                            })
                        }
                    }
                }
            ],
            { cancelable: false }
        )
    }

    validateScanStatusApi = () => {
        const { loginData } = this.state
        let schoolId = loginData.schoolInfo.schoolCode
        let isTokenValid = validateToken(loginData.expiresOn)
        if (isTokenValid) {
            this.callScanStatus(schoolId, loginData.jwtToken)
        }
        else if (!isTokenValid) {
            this.setState({
                callApi: 'callScanStatus'
            })
            this.loginAgain()
        }
    }

    callScanStatus = (schoolId, token) => {
        this.setState({
            isLoading: true,
            calledScanStaus: true
        }, () => {
            let apiObj = new GetScanStatusAction(schoolId, token);
            this.props.APITransport(apiObj)
        })
    }

    callSaveApi = (token, saveTrainingData) => {
        const { dataPayload, telemetryData, savedTelemetryLength } = this.state
        this.setState({
            calledApi: true,
        }, () => {
            if (saveTrainingData && telemetryData && telemetryData.length > 0) {
                let telemetryArr = []
                this.setState({
                    savedTelemetryLength: savedTelemetryLength
                }, () => {
                    telemetryArr = telemetryData.slice(savedTelemetryLength, savedTelemetryLength + 10);
                    this.setState({
                        savedTelemetryLength: savedTelemetryLength + 10,
                        currentSavingTelemetry: telemetryArr
                    })
                    console.log("telemetryArrr",telemetryArr);
                    let apiObj = new SaveTelemetryAction(telemetryArr, token);
                    this.props.APITransport(apiObj)
                })
            }
            else {
                let apiObj = new SaveOcrDataAction(dataPayload, token);
                this.props.APITransport(apiObj)
            }
        })
    }

    loginAgain = async () => {
        let loginCred = await getLoginCred()
        if (loginCred) {
            this.setState({
                isLoading: true,
                username: loginCred.username,
                password: loginCred.password
            }, () => {
                this.callLogin()
            })
        }
        else {
            Alert.alert(Strings.message_text, Strings.please_try_again, [
                { 'text': Strings.ok_text, onPress: () => this.loginAgain() }
            ])
        }
    }

    callLogin = () => {
        this.setState({
            isLoading: true,
            calledLogin: true
        }, () => {
            let encPass = cryptoText(this.state.password)
            let apiObj = new LoginAction(this.state.username, encPass);
            this.props.APITransport(apiObj);
        })
    }

    loader = (flag) => {
        this.setState({
            isLoading: flag
        })
    }

    async componentDidUpdate(prevProps) {
        if (prevProps != this.props) {
            const { apiStatus, ongoingScanDetails, saveOcrData, loginDataRes, saveTelemetry, studentsAndExamData } = this.props
            const { scanData, calledApi, submittedExamCode, submittedClass, submittedSection, calledLogin, telemetryData, currentSavingTelemetry, savedTelemetryLength, calledScanStaus, callApi, calledStudentsApi, studentsApiPayloadCount, studentsDataPayload } = this.state
            if (apiStatus && prevProps.apiStatus != apiStatus && apiStatus.error) {
                if (calledApi || calledLogin || calledScanStaus || calledStudentsApi) {
                    this.setState({ isLoading: false, calledApi: false, calledScanStaus: false, calledStudentsApi: false }, () => {
                        if (apiStatus && apiStatus.message) {
                            Alert.alert(Strings.message_text, apiStatus.message, [{
                                text: Strings.ok_text
                            }])
                        } else {
                            Alert.alert(Strings.message_text, Strings.please_try_again, [{
                                text: Strings.ok_text
                            }])
                        }
                    })
                }
            }

            if (calledLogin) {
                if (loginDataRes && prevProps.loginDataRes != loginDataRes) {
                    this.setState({
                        isLoading: false,
                        calledLogin: false
                    }, async () => {
                        if (loginDataRes.status && loginDataRes.status == 200) {
                            let loginSaved = await setLoginData(loginDataRes.data)
                            if (loginSaved) {
                                this.setState({
                                    loginData: loginDataRes.data
                                })
                                if (callApi == 'callScanStatus') {
                                    let schoolId = loginDataRes.data.schoolInfo.schoolCode
                                    this.callScanStatus(schoolId, loginDataRes.data.jwtToken)
                                } else if (callApi == 'callSaveApi') {
                                    this.callSaveApi(loginDataRes.data.jwtToken, loginDataRes.data.storeTrainingData)
                                }
                                else if (callApi == 'callStudentsData') {
                                    this.callStudentsData(loginDataRes.data.jwtToken)
                                }
                            }
                            else {
                                Alert.alert(Strings.message_text, Strings.process_failed_try_again, [
                                    { 'text': Strings.cancel_text, style: Strings.cancel_text, onPress: () => this.loader(false) },
                                    { 'text': Strings.retry_text, onPress: () => this.callLogin() }

                                ])
                            }
                        }
                        else {
                            Alert.alert(Strings.message_text, Strings.process_failed_try_again, [
                                { 'text': Strings.cancel_text, style: Strings.cancel_text, onPress: () => this.loader(false) },
                                { 'text': Strings.retry_text, onPress: () => this.callLogin() }

                            ])
                        }
                    })
                }
            }


            if (ongoingScanDetails && prevProps.ongoingScanDetails != ongoingScanDetails) {
                this.props.navigation.navigate('myScan')
            }

            if (saveOcrData && prevProps.saveOcrData !== saveOcrData) {
                this.setState({ isLoading: false, calledApi: false, callApi: '' })
                if (saveOcrData.ocrData.status && saveOcrData.ocrData.status == 200) {
                    if (scanData) {
                        let scanDataCopy = JSON.parse(JSON.stringify(scanData))
                        for (let i = 0; i < scanDataCopy.length; i++) {
                            if (submittedExamCode == scanDataCopy[i].exam_code && submittedClass == scanDataCopy[i].class_code && submittedSection == scanDataCopy[i].section.trim().toUpperCase()) {
                                scanDataCopy[i].save_status = 'Yes'
                                // i--;
                            }
                        }
                        let savedScan = await setScanData(scanDataCopy)
                        if (savedScan) {
                            this.setState({
                                scanData: scanDataCopy
                            }, () => {
                                Alert.alert(Strings.message_text, Strings.saved_successfully, [{
                                    text: Strings.ok_text, onPress: () => { this.createCardData() }
                                }])
                            })
                        }
                        else {
                            Alert.alert(Strings.message_text, Strings.please_try_again, [{
                                text: Strings.ok_text
                            }])
                        }
                    }
                } else {
                    Alert.alert(Strings.message_text, Strings.please_try_again, [{
                        text: Strings.ok_text
                    }])
                }
            }

            if (saveTelemetry && prevProps.saveTelemetry != saveTelemetry) {
                // this.setState({ isLoading: false, calledApi: false })
                if (saveTelemetry.telemetryData.status && saveTelemetry.telemetryData.status == 200) {
                    if (scanData) {
                        let scanDataCopy = JSON.parse(JSON.stringify(scanData))
                        let count = 0
                        for (let i = 0; i < scanDataCopy.length; i++) {
                            if (submittedExamCode == scanDataCopy[i].exam_code && submittedClass == scanDataCopy[i].class_code && submittedSection == scanDataCopy[i].section.trim().toUpperCase() && scanDataCopy[i].telemetry_saved == 'No') {
                                if (count < 10) {
                                    scanDataCopy[i].telemetry_saved = 'Yes'
                                    count++
                                }
                            }
                        }
                        let savedScan = await setScanData(scanDataCopy)
                        if (savedScan) {
                            this.setState({
                                scanData: scanDataCopy
                            }, () => {
                                if (savedTelemetryLength < telemetryData.length) {
                                    this.callSaveApi(loginDataRes.data.jwtToken, true)
                                }
                                else if (savedTelemetryLength >= telemetryData.length) {
                                    this.callSaveApi(loginDataRes.data.jwtToken, false)
                                }
                            })
                        }
                    } else {
                        this.callSaveApi(loginDataRes.data.jwtToken, false)
                    }
                }
            }


            if (calledStudentsApi) {
                if (studentsAndExamData && prevProps.studentsAndExamData != studentsAndExamData) {
                    this.setState({
                        calledStudentsApi: false, callApi: ''
                    }, async () => {
                        if (studentsAndExamData.status && studentsAndExamData.status == 200) {
                            if (studentsAndExamData.data.studentsInfo && studentsAndExamData.data.studentsInfo.length > 0) {
                                let obj = {
                                    class: "Class-" + studentsDataPayload[studentsApiPayloadCount].classId,
                                    classId: parseInt(studentsDataPayload[studentsApiPayloadCount].classId),
                                    section: studentsDataPayload[studentsApiPayloadCount].section,
                                    data: studentsAndExamData.data
                                }

                                let studentsAndExamArr = await getStudentsExamData()
                                let finalStudentsAndExamArr = []
                                if (studentsAndExamArr != null) {
                                    studentsAndExamArr.forEach(element => {
                                        finalStudentsAndExamArr.push(element)
                                    });
                                }
                                finalStudentsAndExamArr.forEach((data, index) => {
                                    if(data && data.class == obj.class && studentsAndExamData.data) {
                                        data.data = studentsAndExamData.data
                                    }
                                    if (data.class == obj.class && data.section == obj.section) {
                                        finalStudentsAndExamArr.splice(index, 1)
                                    }
                                })
                                finalStudentsAndExamArr.push(obj)

                                let studentsExamDataSaved = await setStudentsExamData(finalStudentsAndExamArr)
                                if (studentsExamDataSaved) {
                                    if (studentsApiPayloadCount == studentsDataPayload.length - 1) {
                                        this.setState({
                                            studentsExamData: finalStudentsAndExamArr,
                                            isLoading: false
                                        }, () => {
                                            this.createCardData()
                                        })
                                    } else if (studentsApiPayloadCount < studentsDataPayload.length) {
                                        this.setState({
                                            studentsApiPayloadCount: studentsApiPayloadCount + 1
                                        }, () => {
                                            this.validateStudentsDataApi()
                                        })
                                    }
                                }
                            }
                        }
                        else {
                            this.setState({
                                isLoading: false,
                            }, () => {
                                Alert.alert(Strings.message_text, Strings.process_failed_try_again, [{
                                    text: Strings.ok_text, onPress: () => {
                                        this.validateStudentsDataApi()
                                    }
                                }])
                            })
                        }
                    })
                }
            }
        }
    }

    checkStudentsDataExistsForScanData = (fetchedScanStatusArr) => {
        const { studentsExamData, loginData } = this.state
        let groupFetchedScanByClass = _.groupBy(fetchedScanStatusArr, 'studyingClass')
        let fetchStudentsPayload = []
        _.forEach(groupFetchedScanByClass, (element, classIndex) => {

            let groupClassBySection = _.groupBy(element, 'Section')
            _.forEach(groupClassBySection, (data, sectionIndex) => {
                let payload = {
                    class: 'Class-' + classIndex,
                    classId: classIndex,
                    section: sectionIndex,
                    schoolId: loginData.schoolInfo.schoolCode
                }
                if (payload.section.trim().toUpperCase() == 'ALL') {
                    payload.section = 0
                }
                fetchStudentsPayload.push(payload)

            })
        })

        if (studentsExamData != null) {
            _.forEach(studentsExamData, (element) => {
                for (let i = 0; i < fetchStudentsPayload.length; i++) {
                    if (fetchStudentsPayload[i].classId == element.classId && fetchStudentsPayload[i].section.trim().toLowerCase() == element.section.trim().toLowerCase()) {
                        fetchStudentsPayload.splice(i, 1)
                        i--;
                    }
                }
            })
        }
        this.setState({
            studentsDataPayload: fetchStudentsPayload
        }, () => {
            if (fetchStudentsPayload.length > 0) {
                this.validateStudentsDataApi()
            } else {
                this.setState({ isLoading: false }, () => {
                    this.createCardData()
                })
            }
        })
    }

    validateStudentsDataApi = () => {
        const { loginData } = this.state
        let isTokenValid = validateToken(loginData.expiresOn)
        if (isTokenValid) {
            this.callStudentsData(loginData.jwtToken)
        }
        else if (!isTokenValid) {
            this.setState({
                callApi: 'callStudentsData'
            })
            this.loginAgain()
        }
    }
    callStudentsData = (token) => {
        const { studentsDataPayload, studentsApiPayloadCount } = this.state
        this.setState({
            isLoading: true,
            calledStudentsApi: true,
        }, () => {
            let apiObj = new GetStudentsAndExamData(studentsDataPayload[studentsApiPayloadCount], token);
            this.props.APITransport(apiObj)

        })
    }

    onLogoutClick = async () => {
        Alert.alert(Strings.message_text, Strings.you_will_loose_all_your_data, [
            { 'text': Strings.no_text, style: 'cancel' },
            {
                'text': Strings.yes_text, onPress: async () => {
                    await AsyncStorage.clear();
                    this.props.navigation.navigate('welcome')
                }
            }
        ])
    }

    onClickNew = () => {
        this.props.navigation.navigate('selectDetails')
    }

    render() {
        const { isLoading, iconShow, loaderText, scanData, loginData, studentsExamData, onGoingData, completedData,saveDataLocal } = this.state;
        return (
            <View style={styles.container}>
                <HeaderComponent
                        title={Strings.saralData_text}
                        versionText={apkVersion}
                    />
                <ScanHistoryComponent
                    completedCardClick={this.completedCardClick}
                    ongoingCardClick={this.ongoingCardClick}
                    scanData={scanData}
                    loginData={loginData}
                    studentsExamData={studentsExamData}
                    onClickNew={this.onClickNew}
                    onGoingData={onGoingData}
                    completedData={completedData}
                    {...this.props}
                />
                {isLoading &&
                    <Spinner
                        animating={isLoading}
                        iconShow={iconShow}
                        loadingText={loaderText}
                        customContainer={{ opacity: 0.4, elevation: 15 }}
                    />}
            </View>
        );
    }
}

const styles = {
    container: {
        flex: 1,
        backgroundColor: AppTheme.BACKGROUND_COLOR
    }
}

const mapStateToProps = (state) => {
    return {
        apiStatus: state.apiStatus,
        ongoingScanDetails: state.ongoingScanDetails,
        filteredData: state.filteredData,
        saveOcrData: state.saveOcrData,
        studentsAndExamData: state.studentsAndExamData,
        loginDataRes: state.loginData,
        saveTelemetry: state.saveTelemetry,
        getScanStatusData: state.getScanStatusData,
        saveDataLocal:state.saveDataLocal

    }
}

const mapDispatchToProps = (dispatch) => {
    return bindActionCreators({
        OngoingScanDetailsAction: OngoingScanDetailsAction,
        APITransport: APITransport
    }, dispatch)
}

export default (connect(mapStateToProps, mapDispatchToProps)(ScanHistoryContainer));
