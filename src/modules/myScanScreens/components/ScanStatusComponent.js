import React, { Component } from 'react';
import { View, ScrollView, Text } from 'react-native';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import Strings from '../../../utils/Strings';
import AppTheme from '../../../utils/AppTheme';
import ScanStatusCard from './ScanStatusCard';
import { getScanData, getLoginData, getStudentsExamData, getFetchedScanData } from '../../../utils/StorageUtils'
import _ from 'lodash'
import HeaderComponent from '../../common/components/HeaderComponent';
import { apkVersion } from '../../../configs/config'

const subjectCodes = [
    { 
        code: '01',
        subject: 'Gujarati'
    },
    { 
        code: '02',
        subject: 'Maths'
    },
    { 
        code: '03',
        subject: 'EVS'
    },
    { 
        code: '04',
        subject: 'Hindi'
    },
    { 
        code: '05',
        subject: 'English'
    },
    { 
        code: '06',
        subject: 'Sanskrit'
    },
    { 
        code: '07',
        subject: 'Science'
    },
    { 
        code: '08',
        subject: 'Social Science'
    },

]

class ScanStatusComponent extends Component {
    constructor(props) {
        super(props);

        this.state = {
            titleLabel: '',
            scanStatusData: [],
            scanStatusArr: []
        }
    }

    componentDidMount() {
        const { navigation } = this.props
        const { params } = navigation.state
        navigation.addListener('willFocus', async payload => {
            if(params && params.scanStatusData) {
                let data = params.scanStatusData

                let subjectCode = data.testId.substring(5,7)                
                let subject = ''
                _.forEach(subjectCodes, (element) => {
                    if(element.code == subjectCode) {
                        subject = element.subject
                    }
                })

                this.setState({
                    titleLabel: data.className + '-' + data.section + '-' + subject + '-' + data.testDate,
                    scanStatusData: params.scanStatusData
                }, () => {
                    this.createCardData()
                })
            }
            
        })
    }

    createCardData = async () => {
        let scanData = await getScanData()
        let loginData = await getLoginData()
        let studentsExamData = await getStudentsExamData()
        let fetchedScanStatus = await getFetchedScanData()
        const { scanStatusData } = this.state
        if (loginData && studentsExamData) {      
            let scanStatusArr = []
            let response = scanStatusData
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

            let fetchedSectionElementStudents = []

            //Fetch Students List from API
            if (fetchedScanStatus && fetchedScanStatus.length > 0) {
                let groupFetchedScanByExams = _.groupBy(fetchedScanStatus, 'examCode')
                if (groupFetchedScanByExams[response.testId]) {
                    let groupFetchedSectionByExam = _.groupBy(groupFetchedScanByExams[response.testId], 'Section')
                    if (groupFetchedSectionByExam[response.section.trim().toUpperCase()]) {                        
                        let fetchedSectionElement = JSON.parse(JSON.stringify(groupFetchedSectionByExam[response.section.trim().toUpperCase()]))
                        fetchedSectionElementStudents = fetchedSectionElement[0].EntryCompletedStudents.length > 0  ? JSON.parse(JSON.stringify(fetchedSectionElement[0].EntryCompletedStudents)) : []                        
                    }
                }
            }

            // If local scan data available
            if (scanData) {
                let groupScanByExams = _.groupBy(scanData, 'exam_code')
                let selectedExam = groupScanByExams[response.testId] ? JSON.parse(JSON.stringify(groupScanByExams[response.testId])) : []
                let groupClassByExam = []
                let selectedClass = []
                let groupSectionByExam = []
                let selectedSection = []

                if (selectedExam.length > 0) {

                    // extract local data of selected section 
                    groupClassByExam = _.groupBy(selectedExam, 'class_code')                    
                    selectedClass = JSON.parse(JSON.stringify(groupClassByExam[response.className]))
                    groupSectionByExam = _.groupBy(selectedClass, 'section')
                    selectedSection = groupSectionByExam[response.section.trim().toUpperCase()] ? JSON.parse(JSON.stringify(groupSectionByExam[response.section.trim().toUpperCase()])) : []
                    
                    // create scan status data from local available data
                    if (selectedSection.length > 0) {
                        _.forEach(selectedSection, (data) => {
                            _.forEach(studentList, (element) => {                                
                                if(data && data.student.aadhaarUID == element.aadhaarUID) {
                                    let obj = {
                                        name: data.student.studentName,
                                        aadhaarUid: data.student.aadhaarUID,
                                        saveStatus: data.save_status == 'Yes' ? Strings.saved_text : Strings.not_saved_text
                                    }
                                    scanStatusArr.push(obj)
                                }                                
                            })
                        })

                        // remove students from api student list if available in local
                        if(fetchedSectionElementStudents.length > 0) {
                            _.forEach(selectedSection, (data) => {
                                for (let i = 0; i < fetchedSectionElementStudents.length; i++) {
                                    if (data.student.aadhaarUID == fetchedSectionElementStudents[i].AadhaarUID) {
                                        fetchedSectionElementStudents.splice(i, 1)
                                        i--
                                        break;
                                    }
                                }
                            })
                        }
                    }
                }
            }
            
            // // create scan status data from api students list
            if(fetchedSectionElementStudents.length > 0) {
                _.forEach(fetchedSectionElementStudents, (o) => {
                    _.forEach(studentList, (s) => {
                        if(o.AadhaarUID == s.aadhaarUID) {
                            let obj = {
                                name: s.studentName,
                                aadhaarUid: s.aadhaarUID,
                                saveStatus: Strings.saved_text
                            }
                            scanStatusArr.push(obj)
                        }                        
                    })
                })
            }            
            this.setState({
                scanStatusArr: scanStatusArr,
            })
        }
    }

    renderScanStatusData = () => {
        return (
            <View style={{ marginBottom: '5%', width: '95%' }}>
                {this.state.scanStatusArr.map((data, index) => {
                    return (
                        <ScanStatusCard
                            key={index}
                            studentName={data.name}
                            studentAadhaarUid={data.aadhaarUid}
                            saveStatus={data.saveStatus}
                            customContainerStyle={{ marginTop: '2%', backgroundColor: data.saveStatus == 'Saved' ? AppTheme.GREEN : '#e3a322', }} 
                        />
                    )
                })}
            </View>
        );
    }

    render() {
        const { scanStatusArr, titleLabel } = this.state
        const { loginDataRes } = this.props
        
        return (

            <View style={{ flex: 1, backgroundColor: AppTheme.BACKGROUND_COLOR }}>
                <HeaderComponent
                    title={Strings.saralData_text}
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
                        style={{ fontSize: AppTheme.FONT_SIZE_REGULAR-3, color: AppTheme.BLACK, fontWeight: 'bold', paddingHorizontal: '5%', marginBottom: '4%' }}
                    >
                        {Strings.dise_code+' : '}
                        <Text style={{ fontWeight: 'normal'}}>
                            {loginDataRes.data.schoolInfo.schoolCode}
                        </Text>
                    </Text>}
                    <View style={{ alignSelf: 'center', width: '85%' }}>
                        <Text style={styles.header1TextStyle}>
                            {titleLabel}
                        </Text>
                    </View>

                    <View style={{ marginTop: '4%', marginBottom: '1.5%' }}>
                            <Text style={styles.scanTitleTxtStyle}>{Strings.scan_status}</Text>
                    </View>
                <ScrollView
                    contentContainerStyle={{ backgroundColor: AppTheme.BACKGROUND_COLOR, paddingBottom: '35%' }}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    keyboardShouldPersistTaps={'handled'}
                >

                    {scanStatusArr && scanStatusArr.length > 0 &&
                        <View style={styles.container1}>
                            {this.renderScanStatusData()}
                        </View>}
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
        letterSpacing: 1
    },
    scanTitleTxtStyle: {
        textAlign: 'center',
        fontWeight: 'bold',
    }
}

const mapStateToProps = (state) => {
    return {
        loginDataRes: state.loginData,
    }
}

const mapDispatchToProps = (dispatch) => {
    return bindActionCreators({
    }, dispatch)
}

export default (connect(mapStateToProps, mapDispatchToProps)(ScanStatusComponent));
