import React, { Component } from 'react';
import { View, ScrollView, Text, Image, TouchableOpacity, } from 'react-native';
import Strings from '../../../utils/Strings';
import AppTheme from '../../../utils/AppTheme';
import ScanCard from './ScanCard';
import AsyncStorage from '@react-native-community/async-storage';
import ScanHistoryCard from './ScanHistoryCard';
import { getScanData, getLoginData, getStudentsExamData, getFetchedScanData } from '../../../utils/StorageUtils'
import _ from 'lodash'
import { StackActions, NavigationActions } from 'react-navigation';
import ButtonComponent from '../../common/components/ButtonComponent';

class MyScanComponent extends Component {
    constructor(props) {
        super(props);

        this.state = {
            showFooter: true,
            onGoingData: []
        }
    }

    componentDidMount() {
        const { navigation } = this.props
        navigation.addListener('willFocus', async payload => {
            this.createCardData()
        })
    }
    
    createCardData = async () => {
        let scanData = await getScanData()
        let loginData = await getLoginData()
        let studentsExamData = await getStudentsExamData()
        let fetchedScanStatus = await getFetchedScanData()
        const { ongoingScanDetails } = this.props
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
            
            let ongoingScan = []
            let response = ongoingScanDetails.response

            let studentStrength = 0
            let fetchedCount = 0
            let fetchedSectionElement = []
            let selectedSection = []
            let selectedClass = []
            let saveCount = 0
            let scanCount = 0
            
            if (fetchedScanStatus && fetchedScanStatus.length > 0) {
                let groupFetchedScanByExams = _.groupBy(fetchedScanStatus, 'examCode')
                if (groupFetchedScanByExams[response.examCode]) {
                    let groupFetchedSectionByExam = _.groupBy(groupFetchedScanByExams[response.examCode], 'Section')
                    let groupFetchedClassByExam = _.groupBy(groupFetchedScanByExams[response.examCode], 'studyingClass')
                    if(response.section.trim().toUpperCase() == 'ALL') {
                        let classSplitArr = response.className.split('-')
                        let classId = classSplitArr[1]
                        if(groupFetchedClassByExam[classId]) {
                            let fetchedData = []
                            _.forEach(groupFetchedClassByExam[classId], (o) => {
                                fetchedData.push(o)
                                fetchedCount += o.EntryCompletedStudents.length;
                            })
                            fetchedSectionElement = _.flatten(fetchedData)
                        }
                    }   
                    else if (groupFetchedSectionByExam[response.section.trim().toUpperCase()]) {
                        fetchedSectionElement = groupFetchedSectionByExam[response.section.trim().toUpperCase()]
                        fetchedCount = fetchedSectionElement[0].EntryCompletedStudents.length
                    }
                }
            }
            if (scanData) {
                let groupScanByExams = _.groupBy(scanData, 'exam_code')
                let selectedExam = groupScanByExams[response.examCode] ? JSON.parse(JSON.stringify(groupScanByExams[response.examCode])) : []
                let groupClassByExam = []
                let groupSectionByExam = []

                if (selectedExam.length > 0) {
                    groupClassByExam = _.groupBy(selectedExam, 'class_code')
                    selectedClass = JSON.parse(JSON.stringify(groupClassByExam[response.className]))
                    if(response.section.trim().toUpperCase() != 'ALL') {
                        groupSectionByExam = _.groupBy(selectedClass, 'section')
                        selectedSection = groupSectionByExam[response.section.trim().toUpperCase()] ? JSON.parse(JSON.stringify(groupSectionByExam[response.section.trim().toUpperCase()])) : []                        
                        if (selectedSection.length > 0) {
                            // _.forEach(selectedSection, (data) => {
                            //     if (data && data.save_status == 'Yes') {
                            //         saveCount++
                            //     }
                            // })
                            if (fetchedSectionElement.length > 0) {
                                if (fetchedSectionElement[0].examCode.trim() == response.examCode.trim() && fetchedSectionElement[0].Section.trim().toUpperCase() == response.section.trim().toUpperCase()) {
                                    _.forEach(selectedSection, (data) => {
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
                    } else {
                        // _.forEach(selectedClass, (data) => {                            
                        //     if (data && data.save_status == 'Yes') {
                        //         saveCount++
                        //     }
                        // })
                        if (fetchedSectionElement.length > 0) {                                                        
                            _.forEach(fetchedSectionElement, (element) => {
                                for(let i = 0; i< selectedClass.length; i++) {
                                    for(let j=0; j< element.EntryCompletedStudents.length; j++) {
                                        if(selectedClass[i].student.aadhaarUID == element.EntryCompletedStudents[j].AadhaarUID) {
                                            fetchedCount--;
                                            break;
                                        }  
                                    }

                                }
                            })
                        }
                    }
                }
            }

            let selectedArr = response.section.trim().toUpperCase() != 'ALL' ? JSON.parse(JSON.stringify(selectedSection)) : JSON.parse(JSON.stringify(selectedClass))
            _.forEach(groupStudentsByClass[response.className], (item) => {
                if (item.section.trim().toUpperCase() == response.section.trim().toUpperCase()) {
                    studentStrength = item.data.studentsInfo.length
                    _.forEach(item.data.studentsInfo, (data) => {
                        _.forEach(selectedArr, (element) => {
                            if(element.student.aadhaarUID == data.aadhaarUID) {
                                scanCount++;
                                if (element && element.save_status == 'Yes') {
                                    saveCount++
                                }
                            }
                        })
                    })
                }
            })

            if(studentStrength == 0) {
                let divideAllSectiontoSection = []
                let groupStudentDataBySection = _.groupBy(groupStudentsByClass[response.className], 'section')                        
                if(groupStudentDataBySection['All']) {
                    let studentsArrList = JSON.parse(JSON.stringify(groupStudentDataBySection['All'][0].data.studentsInfo))
                    _.forEach(studentsArrList, (data) => {                                            
                        data.section = data.section.trim().toUpperCase()
                    })
                    divideAllSectiontoSection = _.groupBy(studentsArrList, 'section')
                    if(divideAllSectiontoSection[response.section.trim().toUpperCase()]) {
                        studentStrength = divideAllSectiontoSection[response.section.trim().toUpperCase()].length
                        _.forEach(selectedArr, (element) => {
                            _.forEach(divideAllSectiontoSection[selectedArr[0].section.trim().toUpperCase()], (data) => {                                                
                                if(element.student.aadhaarUID == data.aadhaarUID) {
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
            
            let studentScanLength = response.section.trim().toUpperCase() == 'ALL' ? selectedClass.length : selectedSection.length
            let status = scanCount + fetchedCount == studentStrength ? 'Completed' : scanCount + fetchedCount + ' of ' + studentStrength
            let saveCountStatus = saveCount + fetchedCount == studentStrength ? 'Completed' : saveCount + fetchedCount + ' of ' + studentStrength
            let obj = {
                className: response.className,
                section: response.section,
                testId: response.examCode.trim(),
                testDate: response.testDate,
                sessionId: response.sessionId,
                scanStatus: status,
                saveStatus: saveCountStatus
            }
            ongoingScan.push(obj)
            this.setState({
                onGoingData: ongoingScan,
            })
        }
    }

    onMyScansClick = () => {
        const resetAction = StackActions.reset({
            index: 0,
            actions: [NavigationActions.navigate({ routeName: 'selectDetails', params: { from_screen: 'cameraActivity' } })],
        });
        this.props.navigation.dispatch(resetAction);
    }


    onScanClick = async () => {
        this.props.onScanClick()
    }

    onProfileClick = async () => {
        await AsyncStorage.clear();
        this.props.navigation.navigate('welcome')
    }

    onCardClick = () => {

    }

    renderScans = () => {
        return (
            <View>
                <ScanCard
                    onCardClick={this.onCardClick}
                    // sourceImage={require('../../../assets/images/sample.png')}
                    studentName={'Aloha Narayan'}
                    studentClass={'X'}
                    studentRollNo={'25'}
                    studentId={'BR03CA1234567'}
                    studentBookletId={'KA51MA7096'}
                    studentTestId={'BLPAK4895R'}
                    studentTestDate={'7/01/2020'}
                    subject={'Mathematics'}
                    addedDate={'12:01 PM'}
                />

            </View>
        );
    }

    renderIncompletedScans = () => {
        return (
            <View style={{ marginTop: '5%', marginBottom: '5%' }}>
                {this.state.onGoingData.map((data, index) => {
                    return (
                        <ScanHistoryCard
                            key={index}
                            customContainerStyle={{ marginTop: '2%' }}
                            className={data.className}
                            section={data.section}
                            testId={data.testId}
                            testDate={data.testDate}
                            scanStatus={data.scanStatus}
                            saveStatus={data.saveStatus}
                            showButtons={false}
                        />
                    )
                })}
            </View>
        );
    }

    render() {
        const { onGoingData } = this.state
        return (

            <View style={{ flex: 1 }}>

                <ScrollView
                    contentContainerStyle={{ backgroundColor: AppTheme.BACKGROUND_COLOR, paddingTop: '5%', paddingBottom: '35%' }}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    keyboardShouldPersistTaps={'handled'}
                >

                    {/* <View style={styles.container1}>
                        <Text style={styles.header1TextStyle}>
                            {Strings.note_only_last_15_scans_available}
                        </Text>
                        {this.renderScans()}
                    </View> */}
                    {onGoingData && onGoingData.length > 0 &&
                        <View style={styles.container1}>
                            <Text style={styles.header1TextStyle}>
                                {Strings.current_scan}
                            </Text>
                            {this.renderIncompletedScans()}
                            <View style={{ marginTop: '8%' }}>
                                <ButtonComponent
                                    customBtnStyle={styles.nxtBtnStyle}
                                    btnText={Strings.go_to_dashboard}
                                    onPress={this.onMyScansClick}
                                />
                            </View>
                        </View>}    
                </ScrollView>
                <View style={styles.bottomTabStyle}>
                    
                    {/* <TouchableOpacity
                        style={[styles.subTabContainerStyle, { marginLeft: '0%' }]}
                        onPress={this.onMyScansClick}
                    >
                        <Image
                            source={require('../../../assets/images/menuIcon.png')}
                            style={styles.tabIconStyle}
                            resizeMode={'contain'}
                        />
                        <Text style={styles.tabLabelStyle}>
                            {Strings.my_scans}
                        </Text>
                    </TouchableOpacity> */}


                    {/* <TouchableOpacity
                        style={[styles.subTabContainerStyle, { marginRight: '1%' }]}
                        onPress={this.onProfileClick}
                    >
                        <Image
                            source={require('../../../assets/images/menuIcon.png')}
                            style={styles.tabIconStyle}
                            resizeMode={'contain'}
                        />
                        <Text style={styles.tabLabelStyle}>
                            {Strings.logout_text}
                        </Text>
                    </TouchableOpacity> */}
                </View>

                <View style={[styles.bottomTabStyle, { height: 135, width: '50%', marginHorizontal: '25%', backgroundColor: 'transparent', justifyContent: 'center' }]}>
                    <TouchableOpacity style={[styles.subTabContainerStyle]}
                        onPress={this.onScanClick}
                    >
                        <TouchableOpacity style={[styles.scanTabContainerStyle,]}

                        >
                            <TouchableOpacity
                                style={styles.scanSubTabContainerStyle}

                            >
                                <Image
                                    source={require('../../../assets/images/scanIcon.png')}
                                    style={styles.tabIconStyle}
                                    resizeMode={'contain'}
                                />
                            </TouchableOpacity>
                        </TouchableOpacity>
                        <Text style={[styles.tabLabelStyle, { paddingTop: '71%' }]}>
                            {Strings.scan_the_marksheet}
                        </Text>
                    </TouchableOpacity>
                </View>

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
    bottomTabStyle: {
        position: 'absolute',
        flexDirection: 'row',
        bottom: 0,
        height: 90,
        left: 0,
        right: 0,
        backgroundColor: AppTheme.WHITE,
        elevation: 10,
        paddingLeft: '5%',
        paddingRight: '5%',
        // paddingHorizontal: '%',
        justifyContent: 'space-between'
    },
    subTabContainerStyle: {
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabIconStyle: {
        width: 25,
        height: 25
    },
    tabLabelStyle: {
        lineHeight: 40,
        textAlign: 'center',
        fontSize: AppTheme.FONT_SIZE_SMALL,
        color: AppTheme.BLACK,
        letterSpacing: 1
    },
    scanTabContainerStyle: {
        width: 85,
        height: 85,
        backgroundColor: AppTheme.WHITE,
        position: 'absolute',
        // top: -42.5,
        borderRadius: 45,
        justifyContent: 'center',
        alignItems: 'center'
    },
    scanSubTabContainerStyle: {
        width: '90%',
        height: '90%',
        backgroundColor: AppTheme.GREEN,
        borderRadius: 45,
        justifyContent: 'center',
        alignItems: 'center'
    },
    nxtBtnStyle: {
        padding: 10
    },
}

export default MyScanComponent;