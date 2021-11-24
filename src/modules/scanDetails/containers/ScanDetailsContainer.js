import React, { Component } from 'react';
import { View, Text, Alert, BackHandler } from 'react-native';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import _ from 'lodash'
import { StackActions, NavigationActions } from 'react-navigation';
import SystemSetting from 'react-native-system-setting'
import Strings from '../../../utils/Strings';
import AppTheme from '../../../utils/AppTheme';
import Spinner from '../../common/components/loadingIndicator';
import HeaderComponent from '../../common/components/HeaderComponent';
import ScanDetailsComponent from '../components/ScanDetailsComponent';
import APITransport from '../../../flux/actions/transport/apitransport';
import { getLoginData, getStudentsExamData, numberOfAbsentStudent } from '../../../utils/StorageUtils'
import { setScanData, getScanData } from '../../../utils/StorageUtils'
import PopupDialog from '../components/PopupDialog';
import { apkVersion } from '../../../configs/config'
import { SCAN_TYPES } from '../../../utils/CommonUtils';
import {pat_questions} from './pat_questions';



class ScanDetailsContainer extends Component {
    constructor(props) {
        super(props);

        this.state = {
            tabIndex: 1,
            nextBtnClick: false,
            isLoading: false,
            edit: true,
            studentId: '',
            testId: '',
            testDate: '',
            finalArray1: [],
            date: '',
            student_name: '',
            stdErr: '',
            examErr: '',
            testDateErr: '',
            testIds: [],
            summary: false,
            // schoolCode: '',
            errTestId: '',
            saveDataObj: {},
            totalMarks: '',
            securedMarks: '',
            // teacherCode: '',
            loginData: null,
            studentIdValid: false,
            finalOCR: null,
            popupVisible: false,
            defaultSelectedStuName: Strings.select_student_name,
            stuNameIndex: -1,
            selectedStuName: '',
            studentAadhaarArr: [],
            studentObj: null,
            studentObjArr: [],
            telemetryData: [],
            errExamTakenAt: '',
            examTakenAtIndex: -1,
            examTakenAt: "",
            examTakenAtArr: ['SCHOOL', 'HOME'],
            predictedRoll: '',
            predictedMarksArr: [],
            wrongPredictedTelemetryRoll: [],
            wrongPredictedTelemetryMarks: [],
            marksTelemetryData: []
        }
        this.onBack = this.onBack.bind(this)
    }

//    async fetchData(){
//         const value = await numberOfAbsentStudent();
//         let res = await JSON.parse(value)
//         this.setState({
//             absentStudentlist : ["hello"]
//         })
//     }

    async componentDidMount() {
        const { navigation, ocrProcessLocal, ongoingScanDetails } = this.props
        navigation.addListener('willFocus', async payload => {
            BackHandler.addEventListener('hardwareBackPress', this.onBack)
            const { params } = navigation.state
            if (params && params.oldBrightness) {
                SystemSetting.setBrightnessForce(params.oldBrightness).then((success) => {
                    if (success) {
                        SystemSetting.saveBrightness();
                    }
                })
            }

                
            //    this.fetchData()

            if(params && params.base64Data && params.base64Data.length > 0) {
                
                this.setState({
                    telemetryData: params.base64Data,
                    wrongPredictedTelemetryRoll: [],
                    wrongPredictedTelemetryMarks: []
                })
            }
            if (params && params.marksBase64Data && params.marksBase64Data.length > 0) {
                this.setState({
                    marksTelemetryData: params.marksBase64Data
                })
            }


            let loginData = await getLoginData()
            if (loginData) {
                let examCodeArr = []
                examCodeArr.push(ongoingScanDetails.response.examCode)
                this.setState({
                    loginData: loginData,
                    testDate: ongoingScanDetails.response.testDate,
                    testIds: examCodeArr,
                    testId: examCodeArr[0]
                })
                if (ocrProcessLocal && ocrProcessLocal.response) {

                    const data = ocrProcessLocal.response;
                    let tempTable = data[0]
                    this.setState({
                        predictedRoll: tempTable.roll,
                        predictedMarksArr: tempTable.marks.sort(function(a, b){return a.question - b.question})
                    }, () => {
                        this.validateStudentId(tempTable.roll)
                        this.onStudentDetailsChange(tempTable.roll, 'studentId', false)
                    })
                }
            }
        });

        this.willBlur = this.props.navigation.addListener('willBlur', payload =>
            BackHandler.removeEventListener('hardwareBackPress', this.onBack)
        );


    }

    componentWillUnmount() {
        // fix Warning: Can't perform a React state update on an unmounted component
        this.setState = (state,callback)=>{
            return;
        };
    }


    lastSevenDigit = (data) => {
        let digit = data.toString().substring(data.toString().length - 7)
        return digit;
    }

    validateStudentId = async(studentId) => {
        const { ongoingScanDetails } = this.props
        
        let studentsExamData = await getStudentsExamData()
        
        const value = await numberOfAbsentStudent();
        let absentStudentlist = await JSON.parse(value)
       
        let selectedClassStudentsExamData = []
        if(studentsExamData) {
            // _.forEach(studentsExamData, (data, index) => {                
            //     if(data.class == ongoingScanDetails.response.className && data.section.trim().toUpperCase() == ongoingScanDetails.response.section.trim().toUpperCase()) {
            //         selectedClassStudentsExamData.push(data.data)
            //     }
            // })
            
            let response = ongoingScanDetails.response
            let studentList = []

            //extract students list from meta data for selected section
            let groupStudentsMetaByClass = _.groupBy(studentsExamData, 'class')
            _.forEach(groupStudentsMetaByClass[response.className], (item) => {
                if (item.section.trim().toUpperCase() == response.section.trim().toUpperCase()) {
                    studentList = JSON.parse(JSON.stringify(item.data.studentsInfo))
                }
            })

            if(studentList.length == 0) {
                let divideAllSectiontoSection = []
                let groupStudentDataBySection = _.groupBy(groupStudentsMetaByClass[response.className], 'section')                        
                if(groupStudentDataBySection['All']) {
                    let studentsArrList = JSON.parse(JSON.stringify(groupStudentDataBySection['All'][0].data.studentsInfo))
                    _.forEach(studentsArrList, (data) => {                                            
                        data.section = data.section.trim().toUpperCase()
                    })
                    divideAllSectiontoSection = _.groupBy(studentsArrList, 'section')
                    if(divideAllSectiontoSection[response.section.trim().toUpperCase()]) {
                        studentList = JSON.parse(JSON.stringify(divideAllSectiontoSection[response.section.trim().toUpperCase()]))                        
                    }
                }  
            }
            
            // let students = JSON.parse(JSON.stringify(selectedClassStudentsExamData[0].studentsInfo))
            let studentIdCount = []
            var self = this;

            studentList.forEach(element => {
                let last7Digit = self.lastSevenDigit(element.aadhaarUID)
                
                if(last7Digit == studentId.trim()) {
                    let obj = {
                        // studentIdValid: true,
                        studentName: element.studentName,
                        studentObj: element,
                        studentAadhaar: element.aadhaarUID
                    }
                    studentIdCount.push(obj);
                    this.setState({
                        studentIdValid : true
                    })
                   
                }
            })

            if(studentIdCount.length == 1) {

                   studentIdCount.map((element) => {
                       if (absentStudentlist.length>0) {
                           let temp =  absentStudentlist.filter(o => {
                                           
                                if (o.aadhaarUID == element.studentAadhaar) {
                                    return true;
                                }
                            })

                            if (temp.length>0) {
                                this.setState({
                                    studentIdValid: false,
                                    stdErr: Strings.please_correct_student_id,
                                    tabIndex: 1,
                                    nextBtnClick: false
                                })
                            }else{
                                    this.setState({
                                        studentIdValid: true,
                                        stdErr: '',
                                        student_name: studentIdCount[0].studentName,
                                        studentObj: studentIdCount[0].studentObj
                                    })
                                }
                       }
                       else{
                        this.setState({
                            studentIdValid: true,
                            stdErr: '',
                            student_name: studentIdCount[0].studentName,
                            studentObj: studentIdCount[0].studentObj
                        })
                       }
                       

                    });
                    
                    // return true
                // }
            }
            else if(studentIdCount.length > 1 && !this.state.popupVisible) {
                let studentAadhaarList = []
                let studentObjList = []
                studentIdCount.forEach(element => {                
                    studentAadhaarList.push(element.studentAadhaar)
                    studentObjList.push(element.studentObj)
                });
                
                setTimeout(() => {
                    this.setState({
                        studentObjArr: studentObjList,
                        studentAadhaarArr: studentAadhaarList,
                        stuNameIndex: -1,
                        selectedStuName: '',
                        popupVisible: true,
                    }) 
                }, 50);
                // return true
            }
            else if(studentIdCount.length == 0) {
                this.setState({
                    studentIdValid: false,
                    stdErr: Strings.please_correct_student_id,
                    tabIndex: 1,
                    nextBtnClick: false
                })
                // return false
            }
        }
    }

    createMarksTableData = (table) => {
        let rows = table[0].questions
            let arrayObj = {}
            let dataArray = []
            rows.forEach((element, index) => {
                arrayObj = {
                    srNo: (index+1).toString(),
                    subjectCode: element.indicatorTitle.toString(),
                    maximum: element.questionMarks.toString(),
                    earned: element.obtainedMarks && parseInt(element.obtainedMarks) <= parseInt(element.questionMarks) ? [element.obtainedMarks, AppTheme.TAB_BORDER] : [element.obtainedMarks, AppTheme.ERROR_RED],
                    // pass: element.obtainedMarks && parseInt(element.obtainedMarks) <= parseInt(element.questionMarks) ? 'Passed' : 'Failed'
                }
                dataArray.push(arrayObj)
            });

            this.setState({
                finalArray1: dataArray,
            }, () => {
                if (dataArray.length > 0 && this.state.nextBtnClick) {
                    this.setState({ tabIndex: 2, nextBtnClick: false })
                }
            })


    }


    onEdit = (value) => {
        this.setState({
            edit: value
        })
    }

    onSave = () => {
        this.setState({
            edit: false
        })
    }

    setTestId = (value) => {
        this.setState({ testId: value, errTestId: '' }, () => {
        })
    }

    setExamTakenAt = (index, value) => {
        this.setState({
            examTakenAtIndex: index,
            examTakenAt: value,
            errExamTakenAt: ''
        }, () => {})
    }

    onNext = () => {
        const { filteredData, loginDataRes } = this.props
        let scanType = filteredData.response.scanType
        if(loginDataRes && loginDataRes.data && loginDataRes.data.storeExamTakenAtInfo && scanType == SCAN_TYPES.SAT_TYPE && this.state.examTakenAtIndex == -1) {
            this.setState({ isLoading: false, stdErr: '', examErr: '', errExamTakenAt: Strings.please_select_exam_taken_at, nextBtnClick: false, testDateErr: '' })
            return 
        }
        if(!this.state.studentIdValid) {
            this.validateStudentId(this.state.studentId)
        }
        if (this.state.studentIdValid) {
            this.setState({ isLoading: false, stdErr: '', examErr: '', errExamTakenAt: '', nextBtnClick: true, testDateErr: '' })

            // var updateData = Object.assign(this.props.ocrProcessLocal)
            var updateData = JSON.parse(JSON.stringify(this.props.ocrProcessLocal.response))            
            updateData[0].roll = this.state.studentId.toUpperCase()
            // updateData[0].table[1][1] = this.state.testDate.toUpperCase() 
            
            let obj = {
                "exam_code": this.state.testId.toUpperCase(),
                "ocr_data": updateData
            }
            this.createMarksData(obj.ocr_data, obj.exam_code)
  

        }
    }

    createMarksData = async(ocrData, examCode) => {
        const { ongoingScanDetails } = this.props
        let studentsExamData = await getStudentsExamData()

        if(studentsExamData) {

            let finalOcrData = JSON.parse(JSON.stringify(ocrData))
            let response = ongoingScanDetails.response
            let resOcr = []

            //extract students list from meta data for selected section
            let groupStudentsMetaByClass = _.groupBy(studentsExamData, 'class')
            _.forEach(groupStudentsMetaByClass[response.className], (item) => {
                if (item.section.trim().toUpperCase() == response.section.trim().toUpperCase()) {
                    resOcr = JSON.parse(JSON.stringify(item.data.questionInfo))
                }
            })

            if(resOcr.length == 0) {
                let groupStudentDataBySection = _.groupBy(groupStudentsMetaByClass[response.className], 'section')                        
                if(groupStudentDataBySection['All']) {
                    resOcr = JSON.parse(JSON.stringify(groupStudentDataBySection['All'][0].data.questionInfo))
                }  
            }

            let filterOcrByExam = _.filter(resOcr, function (o) {

                if (o.examCode.trim() == examCode.trim()) { 
                    return o
                }
            })
            // filterOcrByExam[0].questions=pat_questions;
            let sortedMarksArr = JSON.parse(JSON.stringify(finalOcrData[0].marks))            
            sortedMarksArr.sort(function(a, b){return a.question - b.question});

            for(let i = 0; i<filterOcrByExam[0].questions.length; i++) {

                    filterOcrByExam[0].questions[i].obtainedMarks = sortedMarksArr[i].mark
            }
            
            this.setState({
                finalOCR: filterOcrByExam
            })
            this.createMarksTableData(filterOcrByExam)
        }

    }

    saveChangeMarksTelemetry = (text, index) => {
        const { loginDataRes, filteredData } = this.props
        const { predictedMarksArr, telemetryData, wrongPredictedTelemetryMarks } = this.state
        if(loginDataRes.data && loginDataRes.data.storeTrainingData) {
            let scanType = filteredData.response.scanType   
            let changeDigitBase64 = JSON.parse(JSON.stringify(wrongPredictedTelemetryMarks))
            let classId=filteredData.response.class
            
            if(scanType == SCAN_TYPES.SAT_TYPE ||  (scanType==SCAN_TYPES.PAT_TYPE && classId>=9)) {     
                let rows = scanType == SCAN_TYPES.SAT_TYPE ? 6 : (scanType == SCAN_TYPES.PAT_TYPE && classId >= 9) && 12           
                
                for (let markCol = 0; markCol < 2; markCol++) {
                    if(text.charAt(markCol) !== predictedMarksArr[index].mark.charAt(markCol)) {
                        changeDigitBase64.forEach((element, dataIndex) => {
                            if(element.index == (index+1)+'_'+markCol) {
                                changeDigitBase64.splice(dataIndex, 1)
                            }
                        });
                        let row = index
                        let col = (index >= rows && index< (2*rows)) ? 1 : (index >= (2*rows)) ? 2 : 0
                        if(index >= rows) {
                            row = index-rows
                        }
                        let key = row + "_" + col + "_" + markCol;
                        let obj = {
                            examType: scanType.toUpperCase(),
                            fieldType: 'mark',
                            index: (index+1)+'_'+markCol,
                            predictedDigit: predictedMarksArr[index].mark.charAt(markCol)
                        }
                        for(let j=0; j<telemetryData.length; j++) {
                            let objectKey = Object.keys(telemetryData[j])[0]  
                                         
                            if(objectKey == key) {
                                obj.base64 = telemetryData[j][key]
                                break
                            }
                        }
                        changeDigitBase64.push(obj)
                    }else {
                        changeDigitBase64.forEach((element, dataIndex) => {
                            if(element.index == (index+1)+'_'+markCol) {
                                changeDigitBase64.splice(dataIndex, 1)
                            }
                        });
                    }
                }
            }            
            this.setState({
                wrongPredictedTelemetryMarks: changeDigitBase64
            })
    }
}

    onStudentDetailsChange = (text, type, validate) => {
        const { loginDataRes, filteredData } = this.props
        const { predictedRoll, telemetryData } = this.state
        if(loginDataRes.data && loginDataRes.data.storeTrainingData) {
            let scanType = filteredData.response.scanType   
            let changeDigitBase64 = []        
            let classId=filteredData.response.class
            
             if((scanType == SCAN_TYPES.PAT_TYPE && classId>=9) ||  scanType==SCAN_TYPES.SAT_TYPE) {                
                for (let i = 0; i < 7; i++) {                    
                    if(text.charAt(i) !== predictedRoll.charAt(i)) {
                        let key = -1 + "_" + -1 + "_" + i;
                        let obj = {
                            examType: scanType.toUpperCase(),
                            fieldType: 'roll',
                            index: i.toString(),
                            predictedDigit: predictedRoll.charAt(i)
                        }
                        for(let j=0; j<telemetryData.length; j++) {
                            let objectKey = Object.keys(telemetryData[j])[0]                            
                            if(objectKey == key) {
                                obj.base64 = telemetryData[j][key]
                                break
                            }
                        }
                        changeDigitBase64.push(obj)
                    }
                }
            }    
           else if(scanType == SCAN_TYPES.PAT_TYPE) {
                for(let i=0; i<text.length; i++) {
                    if(text.charAt(i) !== predictedRoll.charAt(i)) {
                        changeDigitBase64.push({
                            examType: scanType.toUpperCase(),
                            fieldType: 'roll',
                            index: i.toString(),
                            predictedDigit: text.charAt(i),
                            base64: telemetryData[0][i]
                        })
                    }
                }
            }
           
            
            this.setState({
                wrongPredictedTelemetryRoll: changeDigitBase64
            })
        }

        this.setState({ 
            [type]: text,
            studentIdValid: false
        }, () => {
            if(text.length == 7 && validate) {
                this.validateStudentId(text)
            }
        })
    }

    tabClicked = (value) => {
        this.setState({ tabIndex: value, nextBtnClick: false })
    }
    onSummaryClick = (marksArray) => {
        const { studentObj, finalOCR, examTakenAtIndex, marksTelemetryData } = this.state
        let valid = true
        for (let i = 0; i < marksArray.length; i++) {
            if (marksArray[i].earned[0] == '' || isNaN(marksArray[i].earned[0]) || parseFloat(marksArray[i].earned[0]) > parseFloat(marksArray[i].maximum)) {
                valid = false
            }
        }
        if (valid) {
            let totalMarks = 0
            let securedMarks = 0
            for (let i = 0; i < marksArray.length; i++) {
                totalMarks += parseFloat(marksArray[i].maximum)
                securedMarks += parseFloat(marksArray[i].earned[0])
            }

            let data = JSON.parse(JSON.stringify(finalOCR))
            let finalTelemetryData = []
            this.state.wrongPredictedTelemetryRoll.forEach(element => {
                finalTelemetryData.push(element)
            });
            

            marksTelemetryData.forEach((el,i)=>{                
                el.forEach((value,j)=>{
                    let obj = {
                        "examType": "PAT",
                        "fieldType": "marks",
                        "index": j+1,
                        "predictedDigit": "0",
                        "base64": ""
                    }
                    obj.base64 = value
                    finalTelemetryData.push(obj)
                })
            })


            this.state.wrongPredictedTelemetryMarks.forEach(element => {
                finalTelemetryData.push(element)
            });

            let obj = {
                "session_id": this.props.ongoingScanDetails.response.sessionId,
                "exam_date": this.state.testDate,
                "exam_code": this.state.testId,
                "section": studentObj.section.trim().toUpperCase(),
                "class_code": this.props.ongoingScanDetails.response.className,
                "teacher_code": this.state.loginData.TeacherCode,
                "student": studentObj,
                "save_status": "No",
                "telemetryData": finalTelemetryData,
                "telemetry_saved": "No"
            }
            let questionsArr =  []
            data[0].questions.forEach((element, index) => {
                let obj = {
                    questionId: element.questionId,
                    obtainedMarks: marksArray[index].earned[0]
                }
                questionsArr.push(obj)
            });    
            
            obj.student.questions = questionsArr
            obj.student.examTakenAt = examTakenAtIndex != -1 ? examTakenAtIndex+1 : null
            this.setState({
                saveDataObj: obj,
                totalMarks: totalMarks.toFixed(2),
                securedMarks: securedMarks.toFixed(2),
                summary: true
            })
        }
        else {
            Alert.alert(Strings.message_text, Strings.please_correct_marks_data)
        }
    }

    onSubmit = async () => {
        const { saveDataObj } = this.state
        let scanData = await getScanData()
        let finalScanData = []
        if (scanData != null) {
            scanData.forEach(element => {
                finalScanData.push(element)
            });
        }
        finalScanData.forEach((data, index) => {
            if (data.student.aadhaarUID == saveDataObj.student.aadhaarUID && data.exam_code == saveDataObj.exam_code) {
                finalScanData.splice(index, 1)
            }
        })
        finalScanData.push(this.state.saveDataObj)
        let savedScan = await setScanData(finalScanData)
        if (savedScan) {
            const resetAction = StackActions.reset({
                index: 0,
                actions: [NavigationActions.navigate({ routeName: 'myScan', params: { from_screen: 'cameraActivity' } })],
            });
            this.props.navigation.dispatch(resetAction);
            return true
        }
        else {
            Alert.alert(Strings.message_text, Strings.please_try_again, [{
                text: Strings.ok_text
            }])
        }
    }

    onSummaryCancel = () => {
        this.setState({ summary: false })
    }

    onBack = async () => {
        const resetAction = StackActions.reset({
            index: 0,
            actions: [NavigationActions.navigate({ routeName: 'myScan', params: { from_screen: 'scanDetails' } })],
        });
        this.props.navigation.dispatch(resetAction);
        return true
    }

    onDropDownSelect = (type, index, value) => {
        if(type == 'studentName') {
            this.setState({
                stuNameIndex: index,
                selectedStuName: value,
                studentId: this.lastSevenDigit(value)
            })
        }
    }

    onDropDownSubmitClick = () => {
        const { stuNameIndex, studentObjArr } = this.state
        if(stuNameIndex != -1) {
            this.setState({
                studentObj: studentObjArr[stuNameIndex],
                popupVisible: false,
                student_name: studentObjArr[stuNameIndex].studentName,
                studentIdValid: true,
                stdErr: '',
            })
        }
        // else {
        //     this.setState({
        //         popupVisible: false,
        //         studentIdValid: false,
        //         stdErr: Strings.please_correct_student_id,
        //         tabIndex: 1,
        //         nextBtnClick: false
        //     })
        // }
    }

    render() {
        const { 
            isLoading, edit, studentId, testDate, tabIndex, finalArray1, student_name, testIds, testId, summary, testDateErr, errTestId, totalMarks, securedMarks,
            popupVisible, defaultSelectedStuName, stuNameIndex, selectedStuName,  studentAadhaarArr, errExamTakenAt, examTakenAtIndex, examTakenAt, examTakenAtArr
        } = this.state;
        const { loginDataRes, filteredData } = this.props
        let scanType = filteredData.response.scanType        
        // let headerTitle = summary ? Strings.summary_scanned_data : edit ? Strings.edit_scanned_data : Strings.verify_scanned_data
        let headerTitle = summary ? Strings.summary_scanned_data : Strings.verify_scanned_data
        return (
            <View style={styles.container}>
                <HeaderComponent
                    title={headerTitle}
                    versionText={apkVersion}
                />
                {(loginDataRes && loginDataRes.data) && 
                    <Text 
                        style={{ fontSize: AppTheme.FONT_SIZE_REGULAR, color: AppTheme.BLACK, fontWeight: 'bold',  paddingHorizontal: '5%', paddingVertical: '2%' }}
                    >
                        {Strings.school_name+' : '}
                        <Text style={{ fontWeight: 'normal'}}>
                            {loginDataRes.data.schoolInfo.school}
                        </Text>
                    </Text>}
                {(loginDataRes && loginDataRes.data) && 
                    <Text 
                        style={{ fontSize: AppTheme.FONT_SIZE_REGULAR-3, color: AppTheme.BLACK, fontWeight: 'bold', paddingHorizontal: '5%', marginBottom: '2%' }}
                    >
                        {Strings.dise_code+' : '}
                        <Text style={{ fontWeight: 'normal'}}>
                            {loginDataRes.data.schoolInfo.schoolCode}
                        </Text>
                    </Text>}
                <ScanDetailsComponent
                    tabIndex={tabIndex}
                    tabClicked={this.tabClicked}
                    onStudentDetailsChange={this.onStudentDetailsChange}
                    // onEdit={this.onEdit}
                    onNext={this.onNext}
                    onSubmit={this.onSubmit}
                    edit={edit}
                    setTestId={this.setTestId}
                    testId={testId}
                    testIds={testIds}
                    scanType={scanType}
                    setExamTakenAt={this.setExamTakenAt}
                    examTakenAtIndex={examTakenAtIndex}
                    examTakenAtArr={examTakenAtArr}
                    examTakenAt={examTakenAt}
                    studentId={studentId.trim()}
                    testDate={testDate.trim()}
                    finalArray1={finalArray1}
                    studentName={student_name}
                    errExamTakenAt={errExamTakenAt}
                    stdErr={this.state.stdErr}
                    examErr={this.state.examErr}
                    testDateErr={testDateErr}
                    errTestId={errTestId}
                    onSummaryClick={this.onSummaryClick}
                    totalMarks={totalMarks}
                    securedMarks={securedMarks}
                    summary={summary}
                    onSummaryCancel={this.onSummaryCancel}
                    onCancelFirstTab={this.onBack}
                    saveChangeMarksTelemetry={this.saveChangeMarksTelemetry}
                    {...this.props}
                />
                <PopupDialog 
                    visible={popupVisible} 
                    studentAadhaarArr={studentAadhaarArr} 
                    defaultSelectedStuName={defaultSelectedStuName} 
                    stuNameIndex={stuNameIndex} 
                    selectedStuName={selectedStuName} 
                    onDropDownSelect={this.onDropDownSelect} 
                    onSubmitClick={this.onDropDownSubmitClick}
                />
                {isLoading && <Spinner animating={isLoading} />}
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
        ocrProcessLocal: state.ocrProcessLocal,
        ongoingScanDetails: state.ongoingScanDetails,
        studentsAndExamData: state.studentsAndExamData,
        loginDataRes: state.loginData,
        filteredData: state.filteredData
    }
}

const mapDispatchToProps = (dispatch) => {
    return bindActionCreators({
        APITransport: APITransport
    }, dispatch)
}

export default (connect(mapStateToProps, mapDispatchToProps)(ScanDetailsContainer));