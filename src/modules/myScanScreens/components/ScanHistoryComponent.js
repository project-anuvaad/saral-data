import React, { Component } from 'react';
import { View, ScrollView, Text, Alert} from 'react-native';
import Strings from '../../../utils/Strings';
import AppTheme from '../../../utils/AppTheme';
import ScanHistoryCard from './ScanHistoryCard';
import { getScanData, getLoginData, getStudentsExamData } from '../../../utils/StorageUtils'
import _ from 'lodash'
import { apkVersionId, apkVersion } from '../../../configs/config'

class ScanHistoryComponent extends Component {
    constructor(props) {
        super(props);

        this.state = {
            onGoingData: [],
            completedData: []
        }
    }

    onNewClick = () => {
        this.props.onClickNew()
    }

    renderCompletedScans = () => {
        return (
            <View style={{ marginTop: '5%' }}>

                {this.props.completedData.map((data, index) =>{
                    if(data.testId) {
                        return(
                            <ScanHistoryCard
                                key={index}
                                onPressContinue={ () => this.onIncompletedCardClick(data)}    
                                onPressStatus={ () => this.onPressScanStatus(data)}
                                onPressSave={ () => this.onCompletedCardClick(data)}
                                customContainerStyle={{ backgroundColor: AppTheme.GREEN, marginTop: '2%' }}
                                className={data.className}
                                section={data.section}
                                testId={data.testId}
                                testDate={data.testDate}
                                scanStatus={data.scanStatus}
                                saveStatus={data.saveStatus}
                                scanStatusShow={true}
                                showButtons={true}
                                showContinueBtn={true}
                            />
                        )
                    }
                })}

            </View>
        );
    }

    onCompletedCardClick = async(data) => {
        // const { studentsExamData } = this.props
        if(data.scanStatus == data.saveStatus) {
            return Alert.alert(Strings.message_text, Strings.all_scanned_data_updated)
        }
        let scanData = await getScanData()
        let loginData = await getLoginData()
        let studentsExamData = await getStudentsExamData()
        if(scanData && loginData && studentsExamData && studentsExamData.length > 0) {
            let groupScanByExams = _.groupBy(scanData, 'exam_code')
            let completedArr = JSON.parse(JSON.stringify(groupScanByExams[data.testId]))
            let exams = []
            
            let groupStudentsMetaDataByClass = _.groupBy(studentsExamData, 'class')
            let studentExamMetaData = []
            let examsObj = {}
            if(groupStudentsMetaDataByClass[data.className]) {
                studentExamMetaData.push(groupStudentsMetaDataByClass[data.className])
                // exams = JSON.parse(JSON.stringify(groupStudentsMetaDataByClass[data.className][0].data.examInfo))
                _.forEach(groupStudentsMetaDataByClass[data.className], function(studentsData){
                    _.forEach(studentsData.data.examInfo, function(o){                        
                        if(o.examCode.trim() == data.testId.trim()) {
                            examsObj = {...o}
                        }
                    })
                })
            }
            // let examsObj = {}

            // _.forEach(exams, function(o) {
            //     if(o.examCode == data.testId) {
            //         examsObj = {...o}
            //     }
            //  })
             
             studentExamMetaData.push(examsObj, apkVersionId, apkVersion)
             let createdTime = new Date()
             let scanDataPayload = {
                "examCode": data.testId.trim(),
                "examId": examsObj.examId,
                "createdOn": createdTime,
                "exams": JSON.stringify(exams),
                "studentExamMetaData": JSON.stringify(studentExamMetaData)
             }                                                
             let studentsArr = []
             let telemetryArr = []
            completedArr.forEach(element => {    
                if(element.class_code == data.className && element.section.trim().toUpperCase() == data.section.trim().toUpperCase() && element.save_status == 'No') {
                    let obj = {
                        studentAdharNumber: element.student.aadhaarUID,
                        schoolCode: element.student.schoolId,
                        studyingClass: element.student.studyingClass,
                        section: element.student.section.trim().toUpperCase(),
                        marksInfo: JSON.parse(JSON.stringify(element.student.questions))
                    }
                    if(element.student.examTakenAt) {
                        obj.examTakenAt = element.student.examTakenAt
                    }
                    studentsArr.push(obj)
                    let teleImgArr = []
                    if(element.class_code == data.className && element.section.trim().toUpperCase() == data.section.trim().toUpperCase() && element.telemetry_saved == 'No') {                        
                        _.forEach(element.telemetryData, (element, index) => {
                            let obj = {
                                index : index,
                                base64: element
                            }
                            teleImgArr.push(obj)
                        })
                        let teleObj = {
                            studentAdharNumber: element.student.aadhaarUID,
                            images:  JSON.parse(JSON.stringify(teleImgArr))
                        }
                        telemetryArr.push(teleObj)
                    }                     
                }
            });
            
            if(studentsArr.length > 0) {                
                scanDataPayload.studentInfoWithMarks = studentsArr                                 
                this.props.completedCardClick(scanDataPayload, data.className, data.section, telemetryArr)
            }
            else if(studentsArr.length == 0) {
                Alert.alert(Strings.message_text, Strings.all_scanned_data_updated)
            }

        }
    }

    onPressScanStatus = (data) => {
        this.props.navigation.navigate('scanStatus', { scanStatusData: data })
    }

    renderIncompletedScans = () => {
        return (
            <View style={{ marginTop: '5%', marginBottom: '5%' }}>
            {this.props.onGoingData.map((data, index) =>{
                let scanCountArr = data.scanStatus.split(' of ')
                if(data.testId) {                
                    return(
                        <ScanHistoryCard
                            key={index}
                            onPressStatus={ () => this.onPressScanStatus(data)}
                            onPressContinue={ () => this.onIncompletedCardClick(data)}
                            onPressSave={ () => this.onCompletedCardClick(data)}
                            customContainerStyle={{ marginTop: '2%' }} 
                            className={data.className}
                            section={data.section}
                            testId={data.testId}
                            testDate={data.testDate}
                            scanStatus={data.scanStatus}
                            saveStatus={data.saveStatus}
                            showButtons={scanCountArr[0] != '0'}
                            scanStatusShow={scanCountArr[0] != '0'}
                            showContinueBtn={true}
                        />
                    )
                }
            })}
            </View>
        );
    }

    onIncompletedCardClick = (data) => {        
        let obj = {
            className: data.className,
            section: data.section,
            examCode: data.testId.trim(),
            testDate: data.testDate,
            sessionId: data.sessionId,
            scanStatus: data.scanStatus
        }
        this.props.ongoingCardClick(obj)
    }

    render() {
        // const { onGoingData, completedData } = this.state
        const { onGoingData, completedData, loginDataRes } = this.props
        return (

            <View style={{ flex: 1 }}>
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
                <ScrollView
                    contentContainerStyle={{ backgroundColor: AppTheme.BACKGROUND_COLOR, paddingTop: '2%', paddingBottom: '35%' }}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    keyboardShouldPersistTaps={'handled'}
                >
                    {completedData && completedData.length > 0 &&
                    <View style={styles.container1}>
                        <Text style={styles.header1TextStyle}>
                            {Strings.completed_scan}
                        </Text>
                        {this.renderCompletedScans()}
                    </View>}
                    {onGoingData && onGoingData.length > 0 &&
                    <View style={styles.container1}>
                        <Text style={styles.header1TextStyle}>
                            {Strings.ongoing_scan}
                        </Text>
                        {this.renderIncompletedScans()}
                    </View>}
                    {onGoingData.length == 0 && completedData.length == 0 &&
                    <View style={styles.container1}>
                        <Text style={styles.header1TextStyle}>
                            {Strings.no_scan_data_available}
                        </Text>
                    </View>}
                   
                </ScrollView>

                {/* <View style={styles.bottomTabStyle}>
                    <TouchableOpacity
                        style={[styles.subTabContainerStyle, { marginRight: '1%' }]}
                        onPress={this.onNewClick}
                    >
                        <Image
                            source={require('../../../assets/images/plus.png')}
                            style={styles.tabIconStyle}
                            resizeMode={'contain'}
                        />
                    </TouchableOpacity>
                </View> */}

               

            </View>
        );
    }
}

const styles = {
    container1: {
        flex: 1,
        marginHorizontal: '4%',
        alignItems: 'center',
        paddingVertical: '5%'
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

export default ScanHistoryComponent;