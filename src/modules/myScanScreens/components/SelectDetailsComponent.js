import React, { Component } from 'react';
import { View, ScrollView, Text, Alert } from 'react-native';
import _ from 'lodash'
import Strings from '../../../utils/Strings';
import AppTheme from '../../../utils/AppTheme';
import DropDownMenu from '../../common/components/DropDownComponent';
import ButtonComponent from '../../common/components/ButtonComponent';
import TextField from '../../common/components/TextField';
import { GetStudentsAndExamData } from '../../../flux/actions/apis/getStudentsAndExamData';
import { setStudentsExamData, getStudentsExamData, getLoginCred, setLoginData } from '../../../utils/StorageUtils'
import { cryptoText, validateToken } from '../../../utils/CommonUtils'
import { LoginAction } from '../../../flux/actions/apis/loginAction';
import { GetScanStatusAction } from '../../../flux/actions/apis/getScanStatus';
import { apkVersion } from '../../../configs/config';
import { SCAN_TYPES } from '../../../utils/CommonUtils';

const sectionArrList = [
    "All", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P",
    "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "NA"
]
var uuid = require('react-native-uuid');
const clearState = {
    defaultSelected: Strings.select_text,
    classList: [],
    classListIndex: -1,
    selectedClass: '',
    sectionList: sectionArrList,
    sectionListIndex: -1,
    selectedSection: '',
    selectedDate: '',
    examsListArr: [],
    examsDate: [],
    examDateIndex: -1,
    selectedExam: '',
    errClass: '',
    errDate: '',
    errTestId: '',
    errSection: '',
    selectedClassId: '',
    calledApi: false,
    sectionValid: false,
    dataPayload: null,
    calledLogin: false,
    callApi: '',
    scanStatusPayload: null,
    calledScanStaus: false,
}

class SelectDetailsComponent extends Component {
    constructor(props) {
        super(props);

        this.state = {
            defaultSelected: Strings.select_text,
            classList: [],
            classListIndex: -1,
            selectedClass: '',
            sectionList: sectionArrList,
            sectionListIndex: -1,
            selectedSection: '',
            selectedDate: '',
            examsListArr: [],
            examsDate: [],
            examDateIndex: -1,
            selectedExam: '',
            errClass: '',
            errDate: '',
            errTestId: '',
            errSection: '',
            selectedClassId: '',
            calledApi: false,
            sectionValid: false,
            username: '',
            password: '',
            dataPayload: null,
            calledLogin: false,
            selectedDateWoSub: '',
            callApi: '',
            scanStatusPayload: null,
            calledScanStaus: false,
        }
    }
    

    componentDidMount() {
        const { navigation } = this.props
        navigation.addListener('willFocus', payload => {
            this.setState(clearState)
        })
    }

    validateFields = () => {
        const { classListIndex, examDateIndex, sectionListIndex, sectionValid } = this.state
        if(classListIndex == -1) {
            this.setState({
                errClass: 'Please select Class',
                errSection: '',
                errDate: ''
            })
            return false
        }
        else if(sectionListIndex == -1) {
            this.setState({
                errClass: '',
                errSection: 'Please select Section',
                errDate: ''
            })
            return false
        }
        else if(!sectionValid) {
            this.setState({
                errClass: '',
                errSection: 'Please select valid Section',
                errDate: ''
            })
            return false
        }
        else if(examDateIndex == -1) {
            this.setState({
                errClass: '',
                errSection: '',
                errDate: 'Please select Date'
            })
            return false
        }
        return true

    }

    onNextClick = () => {
        const { selectedClass, selectedClassId, selectedExam, selectedDateWoSub, selectedSection } = this.state
        this.setState({
            errClass: '',
            errDate: '',
            errSection: ''
        }, () => {
            let valid = this.validateFields()
            if(valid) {
                let obj = {
                    className: selectedClass,
                    class: selectedClassId,
                    examCode: selectedExam,
                    testDate: selectedDateWoSub,
                    section: selectedSection,
                    sessionId: selectedExam+'_'+ uuid.v4()
                }
                this.props.onNext(obj)
                this.validateScanStatusApi()
            }
        })
    }

    onDropDownSelect = (index, value, type) => {
        const { classesArr, loginDetails, loader } = this.props
        const { sectionList, selectedSection } = this.state
        if(type == 'class') {
            if(value != this.state.selectedClass) {
                this.setState({
                    sectionListIndex: 0,
                    selectedSection: sectionList[0],
                    examDateIndex: -1,
                    selectedExam: '',
                    selectedDate: ''
                }, () => {
                    
                    if(loginDetails) {
                        let payload = {
                            classId: classesArr[index].classId,
                            section: sectionList[0],
                            schoolId: loginDetails.schoolInfo.schoolCode
                        }
                        if(sectionList[0] == 'All') {
                            payload.section = 0
                        }
                        loader(true)
                        this.setState({
                            dataPayload: payload
                        }, () => {
                            let isTokenValid = validateToken(loginDetails.expiresOn)                                 
                            if(isTokenValid) {
                                this.callStudentsData(loginDetails.jwtToken)
                            }
                            else if(!isTokenValid) {
                                this.setState({
                                    callApi: 'callStudentsData'
                                }, () => this.loginAgain())
                            }
                        })
                    }
                })
            }
            this.setState({
                errClass: '',
                classListIndex: Number(index),
                selectedClass: value,
                selectedClassId: classesArr[index].classId
            })
        }
        else if(type == 'section') {
            if(value != selectedSection) {
                this.setState({
                    examDateIndex: -1,
                    selectedExam: '',
                    selectedDate: '',
                    sectionValid: false
                })
            }
            this.setState({
                sectionListIndex: Number(index),
                selectedSection: value,
            }, () => {
                if(loginDetails) {
                    let payload = {
                        classId: this.state.selectedClassId,
                        section: value,
                        schoolId: loginDetails.schoolInfo.schoolCode
                    }
                    if(value == 'All') {
                        payload.section = 0
                    }
                    loader(true)
                    this.setState({
                        dataPayload: payload
                    }, () => {
                        let isTokenValid = validateToken(loginDetails.expiresOn)     
                        if(isTokenValid) {
                            this.callStudentsData(loginDetails.jwtToken)
                        }
                        else if(!isTokenValid) {
                            this.setState({
                                callApi: 'callStudentsData'
                            }, () =>  this.loginAgain())
                        }
                    })
                }
            })
        }
        else if(type == 'date') {
            let exam = ''
            let date = ''
            _.find(this.state.examsListArr, function(o) {
                if(o.exam_date_sub == value) {
                    exam = o.exam_code
                    date = o.exam_date
                }
             });
             this.setState({
                errDate: '', 
                examDateIndex: Number(index),
                selectedDate: value,
                selectedDateWoSub: date,
                selectedExam: exam
             })
        }
    }

    validateScanStatusApi = () => {
        const { selectedClassId, selectedExam, selectedSection } = this.state
        const { loginDetails } = this.props
        let schoolId = loginDetails.schoolInfo.schoolCode
        let payload = {
            schoolId: schoolId,
            standardId: selectedClassId,
            section: selectedSection == 'All' ? 0 : selectedSection,
            examCode: selectedExam
        }
        
        this.setState({
            scanStatusPayload: payload
        }, () => {
            let isTokenValid = validateToken(loginDetails.expiresOn)
            
            if (isTokenValid) {
                this.callScanStatus(payload, loginDetails.jwtToken)
            }
            else if (!isTokenValid) {
                this.setState({
                    callApi: 'callScanStatus'
                })
                this.loginAgain()
            }
        })
    }

    callScanStatus = (payload, token) => {
        this.setState({
            isLoading: true,
            calledScanStaus: true
        }, () => {
            let apiObj = new GetScanStatusAction(payload, token);
            this.props.APITransport(apiObj)
        })
    }

    callStudentsData = (token) => {        
        const { dataPayload } = this.state
        this.setState({
            calledApi: true,
        }, () => {
            let apiObj = new GetStudentsAndExamData(dataPayload, token);
            this.props.APITransport(apiObj)
    
        })
    }

    loginAgain = async() => {
        let loginCred = await getLoginCred()        
        if(loginCred) {
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
                { 'text': Strings.ok_text, onPress: () => this.loginAgain()}
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

   async componentDidUpdate(prevProps) {
        if(prevProps != this.props) {
            const { apiStatus, studentsAndExamData, loader, loginData, setLoginDataLocally, getScanStatusData, scanType } = this.props
            const { calledApi, selectedClass, selectedSection, calledLogin, selectedClassId, callApi, scanStatusPayload, calledScanStaus } = this.state
            if (apiStatus && prevProps.apiStatus != apiStatus && apiStatus.error) {
                if(calledApi || calledLogin || calledScanStaus) {                    
                    loader(false)
                    this.setState({ 
                        calledApi: false, 
                        calledScanStaus: false,
                        sectionValid: false, 
                        examDateIndex: -1,
                        selectedExam: '',
                        selectedDate: ''
                    }, () => {
                        if(apiStatus && apiStatus.message) {
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

            if(calledLogin) {                
                if (loginData && prevProps.loginData != loginData) {
                    this.setState({
                        isLoading: false,
                        calledLogin: false
                    }, async() => {
                        if(loginData.status && loginData.status == 200) {
                                let loginSaved = await setLoginData(loginData.data)
                                setLoginDataLocally(loginData.data)                                
                                if(loginSaved) {                                    
                                    if (callApi == 'callScanStatus') {
                                        this.callScanStatus(scanStatusPayload, loginData.data.jwtToken)
                                    }
                                    else if (callApi == 'callStudentsData') {
                                        this.callStudentsData(loginData.data.jwtToken)
                                    }
                                }
                                else {
                                    Alert.alert(Strings.message_text, Strings.process_failed_try_again, [
                                        { 'text': Strings.cancel_text, style: Strings.cancel_text, onPress: () => loader(false) },
                                        { 'text': Strings.retry_text, onPress: () => this.callLogin() }
                        
                                    ])
                                }
                        }
                        else {
                            Alert.alert(Strings.message_text, Strings.process_failed_try_again, [
                                { 'text': Strings.cancel_text, style: Strings.cancel_text, onPress: () => loader(false) },
                                { 'text': Strings.retry_text, onPress: () => this.callLogin() }
                
                            ])
                        }
                    })
                }
            }

            if(calledApi) {
                if(studentsAndExamData && prevProps.studentsAndExamData != studentsAndExamData) {
                    loader(false)
                    this.setState({
                        calledApi: false, callApi: ''
                    }, async () => {
                        if(studentsAndExamData.status && studentsAndExamData.status == 200) {
                            if(studentsAndExamData.data.studentsInfo && studentsAndExamData.data.studentsInfo.length > 0) {
                                let obj = {
                                    class: selectedClass,
                                    classId: selectedClassId,
                                    section: selectedSection,
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
                                if(studentsExamDataSaved) {
                                    let examsArr = []
                                    let examsDate = []
                                    let self = this
                                    _.filter(studentsAndExamData.data.examInfo, function(o) {
                                        
                                        if (scanType == SCAN_TYPES.PAT_TYPE && o.examType.trim() == 'Periodic Assessment') {
                                            let obj = self.getExamCodeObj(o)
                                            examsDate.push(obj.exam_date_sub)
                                            examsArr.push(obj)
                                        } 
                                        else if (scanType == SCAN_TYPES.SAT_TYPE && o.examType.trim() == 'Semester Assessment') {
                                            let obj = self.getExamCodeObj(o)
                                            examsDate.push(obj.exam_date_sub)
                                            examsArr.push(obj)
                                        }                                    
                                    })
                                    if(examsDate.length == 0) {
                                        this.setState({
                                            errClass: Strings.no_exam_for_selected_class,
                                            errSection: '',
                                            sectionValid: false,
                                            examsListArr: examsArr,
                                            examsDate: examsDate,
                                        })
                                    } else {
                                        this.setState({
                                            errClass: '',
                                            errSection: '',
                                            sectionValid: true,
                                            examsListArr: examsArr,
                                            examsDate: examsDate,
                                        })
                                    }
                                }
                            }
                            else {
                                this.setState({
                                    errSection: 'Please select valid Section',
                                    sectionValid: false,
                                    examDateIndex: -1,
                                    selectedExam: '',
                                    selectedDate: ''
                                })
                            }
                            
                        }
                        else {
                            this.setState({
                                errSection: Strings.process_failed_try_again,
                                sectionValid: false,
                                examDateIndex: -1,
                                selectedExam: '',
                                selectedDate: ''
                            })
                        }
                    })
                }
            }

            if (calledScanStaus) {
                if (getScanStatusData && prevProps.getScanStatusData != getScanStatusData) {
                    this.setState({ calledScanStaus: false, callApi: '' })
                    if (getScanStatusData.status && getScanStatusData.status == 200) {
                        this.props.navigation.navigate('scanHistory')
                    }
                    else {
                        this.setState({
                            isLoading: false
                        }, () => {
                            Alert.alert(Strings.message_text, Strings.please_try_again, [{
                                text: Strings.ok_text, onPress: () => {
                                    this.validateScanStatusApi()
                                }
                            }])    
                        })
                    }
                }
            }
        }
    }

    getExamCodeObj = (o) => {        
        let examDateArr = []
        if(o.examDate.includes('T')) {
            examDateArr = o.examDate.split('T')
        }
        else {
            examDateArr.push(o.examDate)
        }
        let examDateArrFormatted = examDateArr[0].split('-')
        let formattedExamDate = `${examDateArrFormatted[2]}-${examDateArrFormatted[1]}-${examDateArrFormatted[0]}`
        let obj = {
            exam_code: o.examCode,
            exam_date: formattedExamDate,
            exam_date_sub: o.subject +' - '+ formattedExamDate
        }
        return obj
    }

    render() {
        const { defaultSelected, classListIndex, selectedClass, sectionList, sectionListIndex, selectedSection, selectedDate, examsDate, examDateIndex, selectedExam, errClass, errDate, errTestId, errSection, sectionValid } = this.state
        const { classList, loginData } = this.props
        return (

            <View style={{ flex: 1 }}>
                {(loginData && loginData.data) && 
                    <Text 
                        style={{ fontSize: AppTheme.FONT_SIZE_REGULAR, color: AppTheme.BLACK, fontWeight: 'bold',  paddingHorizontal: '5%', paddingVertical: '2%' }}
                    >
                        {Strings.school_name+' : '}
                        <Text style={{ fontWeight: 'normal'}}>
                            {loginData.data.schoolInfo.school}
                        </Text>
                    </Text>}
                {(loginData && loginData.data) && 
                    <Text 
                        style={{ fontSize: AppTheme.FONT_SIZE_REGULAR-3, color: AppTheme.BLACK, fontWeight: 'bold', paddingHorizontal: '5%', marginBottom: '2%' }}
                    >
                        {Strings.dise_code+' : '}
                        <Text style={{ fontWeight: 'normal'}}>
                            {loginData.data.schoolInfo.schoolCode}
                        </Text>
                    </Text>}
                    <Text 
                        style={{ fontSize: AppTheme.FONT_SIZE_REGULAR-3, color: AppTheme.BLACK, fontWeight: 'bold', paddingHorizontal: '5%', marginBottom: '4%' }}
                    >
                        {Strings.version_text+' : '}
                        <Text style={{ fontWeight: 'normal'}}>
                            {apkVersion}
                        </Text>
                    </Text>
                <ScrollView
                    contentContainerStyle={{ backgroundColor: AppTheme.BACKGROUND_COLOR, paddingTop: '5%', paddingBottom: '35%' }}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    keyboardShouldPersistTaps={'handled'}
                >

                    <View style={styles.container1}>
                        <Text style={styles.header1TextStyle}>
                            {"Please select below details"}
                        </Text>
                        <View style={{ backgroundColor: 'white', paddingHorizontal: '5%', minWidth: '100%', paddingVertical: '10%', borderRadius: 4 }}>
                            <View style={[styles.fieldContainerStyle, { paddingBottom: classListIndex != -1 && errClass == '' ? 0 : '10%'}]}>
                                <View style={{ flexDirection: 'row' }}>
                                    <Text style={[styles.labelTextStyle]}>{Strings.class_text}</Text>
                                    {errClass != '' && <Text style={[styles.labelTextStyle, { color: AppTheme.ERROR_RED, fontSize: AppTheme.FONT_SIZE_TINY + 1, width: '60%', textAlign: 'right', fontWeight: 'normal' }]}>{errClass}</Text>}
                                </View>
                                <DropDownMenu
                                    options={classList}
                                    onSelect={(idx, value) => this.onDropDownSelect(idx, value, 'class')}
                                    defaultData={defaultSelected}
                                    defaultIndex={classListIndex}
                                    selectedData={selectedClass}
                                    icon={require('../../../assets/images/Arrow_Right.png')}
                                />
                            </View>
                            {classListIndex != -1 && errClass == '' &&
                            <View style={[styles.fieldContainerStyle, { paddingBottom: sectionListIndex != -1 && sectionValid ? 0 : '10%'}]}>
                                <View style={{ flexDirection: 'row' }}>
                                    <Text style={[styles.labelTextStyle]}>{Strings.section}</Text>
                                    {errSection != '' && <Text style={[styles.labelTextStyle, { color: AppTheme.ERROR_RED, fontSize: AppTheme.FONT_SIZE_TINY + 1, width: '60%', textAlign: 'right', fontWeight: 'normal' }]}>{errSection}</Text>}
                                </View>
                                <DropDownMenu
                                    options={sectionList && sectionList}
                                    onSelect={(idx, value) => this.onDropDownSelect(idx, value, 'section')}
                                    defaultData={defaultSelected}
                                    defaultIndex={sectionListIndex}
                                    selectedData={selectedSection}
                                    icon={require('../../../assets/images/Arrow_Right.png')}
                                />
                            </View>}
                            {sectionListIndex != -1 && sectionValid &&
                            <View style={[styles.fieldContainerStyle, { paddingBottom: examDateIndex != -1 ? 0 : '10%'}]}>
                                <View style={{ flexDirection: 'row' }}>
                                    <Text style={[[styles.labelTextStyle, { width: '50%' }]]}>{Strings.test_sub_date}</Text>
                                    {errDate != '' && <Text style={[styles.labelTextStyle, { color: AppTheme.ERROR_RED, fontSize: AppTheme.FONT_SIZE_TINY + 1, width: '50%', textAlign: 'right', fontWeight: 'normal' }]}>{errDate}</Text>}
                                </View>
                                <DropDownMenu
                                    options={examsDate && examsDate}
                                    onSelect={(idx, value) => this.onDropDownSelect(idx, value, 'date')}
                                    defaultData={defaultSelected}
                                    defaultIndex={examDateIndex}
                                    selectedData={selectedDate}
                                    icon={require('../../../assets/images/Arrow_Right.png')}
                                />
                            </View>}
                            {examDateIndex != -1 &&
                            <TextField
                                customContainerStyle={{marginHorizontal: 0, paddingBottom: '10%'}}
                                labelText={Strings.test_id}
                                errorField={errTestId != ''}
                                errorText={errTestId}
                                value={selectedExam}
                                editable={false}
                            />}
                            {/* <View style={[styles.fieldContainerStyle, { paddingBottom: dateListIndex != -1 ? 0 : '10%'}]}>
                                <View style={{ flexDirection: 'row' }}>
                                    <Text style={[styles.labelTextStyle]}>{Strings.test_date}</Text>
                                    {errDate != '' && <Text style={[styles.labelTextStyle, { color: AppTheme.ERROR_RED, fontSize: AppTheme.FONT_SIZE_TINY + 1, width: '60%', textAlign: 'right', fontWeight: 'normal' }]}>{errDate}</Text>}
                                </View>
                                <DropDownMenu

                                    options={dateList}
                                    onSelect={(idx, value) => this.onDropDownSelect(idx, value, 'date')}
                                    defaultData={defaultSelected}
                                    defaultIndex={dateListIndex}
                                    selectedData={selectedDate}
                                    icon={require('../../../assets/images/Arrow_Right.png')}
                                />
                            </View> */}
                            
                            <ButtonComponent
                                customBtnStyle={styles.nxtBtnStyle}
                                btnText={Strings.next_text.toUpperCase()}
                                onPress={this.onNextClick}
                            />
                        </View>
                    </View>

                </ScrollView>
            </View>
        );
    }
}

const styles = {
    container1: {
        flex: 1,
        marginHorizontal: '6%',
        alignItems: 'center'
    },
    header1TextStyle: {
        backgroundColor: AppTheme.LIGHT_YELLOW,
        lineHeight: 40,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: AppTheme.LIGHT_GREY,
        width: '100%',
        textAlign: 'center',
        fontSize: AppTheme.FONT_SIZE_SMALL,
        color: AppTheme.BLACK,
        letterSpacing: 1,
        marginBottom: '5%'
    },
    fieldContainerStyle: {
        paddingVertical: '2.5%',
        // minWidth: '100%',
        
    },
    labelTextStyle: {
        width: '40%',
        fontSize: AppTheme.FONT_SIZE_MEDIUM,
        color: AppTheme.BLACK,
        fontWeight: 'bold',
        letterSpacing: 1,
        lineHeight: 35
    },
    nxtBtnStyle: {
        marginHorizontal: '10%',
    },
    labelStyle: {
        paddingHorizontal: '2%',
        color: AppTheme.WHITE,
        fontWeight: 'bold'
    },
    bottomTabStyle: {
        position: 'absolute',
        flexDirection: 'row',
        bottom: 10,
        height: 90,
        right: 10,
        elevation: 10,
        paddingLeft: '5%',
        paddingRight: '5%',
        justifyContent: 'flex-end'
    },
    subTabContainerStyle: {
        height: 70,
        width: 70,
        borderRadius: 35,
        backgroundColor: AppTheme.GREEN,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabIconStyle: {
        width: 70,
        height: 70
    }
}

export default SelectDetailsComponent;