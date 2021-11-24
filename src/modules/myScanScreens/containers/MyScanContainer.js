import React, { Component } from 'react';
import { View, PermissionsAndroid, Platform, Alert, BackHandler, DeviceEventEmitter } from 'react-native';
import SystemSetting from 'react-native-system-setting';
import { connect } from 'react-redux';
import _ from 'lodash'
import AppTheme from '../../../utils/AppTheme';
import Strings from '../../../utils/Strings';
import Spinner from '../../common/components/loadingIndicator';
import MyScanComponent from '../components/MyScanComponent';
import HeaderComponent from '../../common/components/HeaderComponent';
import RNOpenCvCameraModel from '../../../utils/RNOpenCvCamera';
import { bindActionCreators } from 'redux';
import { OcrProcessLocal } from '../../../flux/actions/apis/ocrProcessLocalAction';
import { StackActions, NavigationActions } from 'react-navigation';
import { getLoginData, getStudentsExamData } from '../../../utils/StorageUtils'
import { apkVersion } from '../../../configs/config'
import { getQuestionsPAT_34, SCAN_TYPES } from '../../../utils/CommonUtils'

class MyScanContainer extends Component {
    constructor(props) {
        super(props);

        this.state = {
            showFooter: true,
            oldBrightness: null,
            isLoading: false,
            loaderText: '',
            iconShow: false,
            activityOpen: false
        }

        this.onBack = this.onBack.bind(this)
        this.onImageFound = this.onImageFound.bind(this)
    }

    componentDidMount() {
        const { navigation } = this.props
        const { params } = navigation.state
        navigation.addListener('willFocus', payload => {
            DeviceEventEmitter.addListener('imageFound', this.onImageFound);
            BackHandler.addEventListener('hardwareBackPress', this.onBack)
            if (params && params.from_screen && params.from_screen == 'scanDetails') {
                this.setState({
                    showFooter: false
                })
                this.onScanClick()
            }
            else {
                this.setState({
                    showFooter: true
                })
            }
        })
        this.willBlur = navigation.addListener('willBlur', payload =>
            BackHandler.removeEventListener('hardwareBackPress', this.onBack)
        );
    }

    onImageFound = () => {
        this.setState({ isLoading: true, loaderText: Strings.please_wait_while_we_scan_pic })
    }

    onBack = () => {
        if (this.state.activityOpen) {
            this.setState({
                showFooter: true,
                activityOpen: false
            })
            SystemSetting.setBrightnessForce(this.state.oldBrightness).then((success) => {
                if (success) {
                    SystemSetting.saveBrightness();
                }
            })
            RNOpenCvCameraModel.cancelActivity().then(data => {
                if (data) {
                    const resetAction = StackActions.reset({
                        index: 0,
                        actions: [NavigationActions.navigate({ routeName: 'myScan', params: { from_screen: 'cameraActivity' } })],
                    });
                    this.props.navigation.dispatch(resetAction);
                    return true
                }
            })
            return true
        }
        else {
            const { ongoingScanDetails, navigation } = this.props
            const { params } = navigation.state
            if (params && params.from_screen && params.from_screen == 'cameraActivity') {
                let routeName = ongoingScanDetails.response && ongoingScanDetails.response.scanStatus ? 'scanHistory' : 'selectDetails'
                this.props.navigation.navigate(routeName, { from_screen: 'cameraActivity' })
                return true
            }
        }
    }

    onScanClick = async () => {
        SystemSetting.getBrightness().then((brightness) => {
            this.setState({ oldBrightness: brightness })
        });

        if (Platform.OS !== 'ios') {
            const grantedRead = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE)
            const grantedWrite = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE)
            const grantedCamera = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA)

            if (grantedRead && grantedWrite && grantedCamera) {
                this.openCameraActivity()
            }
            else {
                PermissionsAndroid.requestMultiple(
                    [
                        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
                        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                        PermissionsAndroid.PERMISSIONS.CAMERA
                    ],
                    {
                        title: Strings.permission_text,
                        message: Strings.app_needs_permission
                    }
                ).then((permRes) => {
                    if (
                        permRes['android.permission.READ_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED &&
                        permRes['android.permission.WRITE_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED &&
                        permRes['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED
                    ) {
                        this.openCameraActivity()
                    } else if (permRes['android.permission.READ_EXTERNAL_STORAGE'] == 'never_ask_again' ||
                        permRes['android.permission.WRITE_EXTERNAL_STORAGE'] == 'never_ask_again' ||
                        permRes['android.permission.CAMERA'] == 'never_ask_again') {
                        Alert.alert(Strings.message_text, Strings.give_permission_from_settings, [
                            { 'text': Strings.ok_text, style: 'cancel' }
                        ]);
                    } else {
                        Alert.alert(Strings.message_text, Strings.please_give_permission_to_use_app, [
                            { 'text': Strings.cancel_text, style: 'cancel' },
                            { 'text': Strings.ok_text, onPress: () => this.onScanClick() }

                        ]);
                    }
                });
            }
        }
    }

    lastSevenDigit = (data) => {
        let digit = data.toString().substring(data.toString().length - 7)
        return digit;
    }

    openCameraActivity = () => {
        const { ongoingScanDetails, filteredData } = this.props

        SystemSetting.setBrightnessForce(1).then(async (success) => {
            if (success) {
                SystemSetting.saveBrightness();
                this.setState({
                    activityOpen: true
                })

                let loginData = await getLoginData()
                let studentsExamData = await getStudentsExamData()
                if (loginData && studentsExamData) {
                    let response = ongoingScanDetails.response
                    let studentList = []

                    //extract students list from meta data for selected class and section
                    let groupStudentsMetaByClass = _.groupBy(studentsExamData, 'class')
                    _.forEach(groupStudentsMetaByClass[response.className], (item) => {
                        if (item.section.trim().toUpperCase() == response.section.trim().toUpperCase()) {
                            studentList = JSON.parse(JSON.stringify(item.data.studentsInfo))
                        }
                    })

                    if (studentList.length == 0) {
                        let divideAllSectiontoSection = []
                        let groupStudentDataBySection = _.groupBy(groupStudentsMetaByClass[response.className], 'section')
                        if (groupStudentDataBySection['All']) {
                            let studentsArrList = JSON.parse(JSON.stringify(groupStudentDataBySection['All'][0].data.studentsInfo))
                            _.forEach(studentsArrList, (data) => {
                                data.section = data.section.trim().toUpperCase()
                            })
                            divideAllSectiontoSection = _.groupBy(studentsArrList, 'section')
                            if (divideAllSectiontoSection[response.section.trim().toUpperCase()]) {
                                studentList = JSON.parse(JSON.stringify(divideAllSectiontoSection[response.section.trim().toUpperCase()]))
                            }
                        }
                    }
                    var self = this;
                    let students7DigitRollList = []
                    studentList.forEach(element => {
                        let last7Digit = self.lastSevenDigit(element.aadhaarUID)
                        students7DigitRollList.push(last7Digit)
                    })
                    let uniqStudentsList = _.uniq(students7DigitRollList);

                    let scanType = filteredData.response.scanType

                    let classId = filteredData.response.class;
                    // let classId = 9;

                    let scanTypeInt = scanType == SCAN_TYPES.SAT_TYPE && classId <= 8 ? 1 : scanType == SCAN_TYPES.PAT_TYPE && classId <= 8 ? 2 : 3;
                    // let scanTypeInt = 3;
                    let subject = filteredData.response.subject;
                    RNOpenCvCameraModel.openScanCamera(JSON.stringify(uniqStudentsList), scanTypeInt)
                        .then(data => {
                            console.log(data);
                            
                            let base64Data = []
                            let marksBase64Data = []

                            if (scanTypeInt == 2) {

                                let imgArr = data.split(',');
                                let tableData = []
                                let response = ""
                                for (let i = 0; i < 14; i++) {
                                    if (i == 13) {
                                        response += imgArr[i]
                                    }
                                    else {
                                        response += imgArr[i] + ","
                                    }
                                }
                                tableData.push(JSON.parse(data))


                                let tempTable = tableData[0].table
                                let marksArr = []
                                let studentObj = {}
                                for (let i = 0; i < tempTable.length; i++) {
                                    if (i == 0) {
                                        studentObj.roll = tempTable[i][i]
                                    }
                                    else if (i > 0 && i <= 5) {
                                        let marksObj = {
                                            question: i,
                                            mark: tempTable[i][i]
                                        }
                                        marksArr.push(marksObj)
                                    }
                                    else if (i > 12 && i <= 13) {
                                        if (loginData.storeTrainingData) {
                                            base64Data.push(tempTable[i][i])
                                        }
                                    }
                                    else if (i>13 && i<=14 && loginData.storeTrainingData) {
                                        marksBase64Data.push(tempTable[i][i])
                                    }
                                }
                                studentObj.marks = marksArr
                                let table = []
                                table.push(studentObj)

                                this.props.OcrProcessLocal(table);
                            }
                            else if ( scanTypeInt == 3) {
                                let questionNumber=getQuestionsPAT_34(classId,subject);
                                let arrFormat=JSON.parse(data);
                                let sortedArray=arrFormat.students[0].marks.sort(function(a,b){
                                    return a.question - b.question
                                });
                                let portion_Array=sortedArray.slice(0,questionNumber);
                                arrFormat.students[0].marks=portion_Array;
                                this.props.OcrProcessLocal(arrFormat.students);
                                if (loginData.storeTrainingData) {
                                    JSON.parse(data).base64Data.forEach((element, index) => {
                                        base64Data.push(element)
                                    });
                                }
                            }
                            else if (scanTypeInt ==1) {
                                this.props.OcrProcessLocal(JSON.parse(data).students)

                                if (loginData.storeTrainingData) {
                                    JSON.parse(data).base64Data.forEach((element, index) => {
                                        base64Data.push(element)
                                    });
                                }
                            }
                            


                            this.setState({ isLoading: false, iconShow: false, loaderText: '' })
                            this.props.navigation.navigate('scanDetails', { oldBrightness: this.state.oldBrightness, base64Data: base64Data,marksBase64Data : marksBase64Data })

                        })
                        .catch((code, errorMessage) => {
                            this.setState({ isLoading: false, iconShow: false, loaderText: '' })
                            Alert.alert(Strings.message_text, Strings.table_image_is_not_proper)
                        });
                }
            }
            else if (!success) {
                Alert.alert(Strings.permission_deny, Strings.you_have_no_permission_to_change_settings, [
                    { 'text': Strings.ok_text, style: Strings.cancel_text },
                    { 'text': Strings.open_settings, onPress: () => SystemSetting.grantWriteSettingPremission() }
                ])
            }
        });
    }

    render() {
        const { isLoading, showFooter, iconShow, loaderText } = this.state;
        return (
            <View style={styles.container}>
                {showFooter &&
                    <HeaderComponent
                        // title={Strings.my_scans}
                        title={Strings.saralData_text}
                        versionText={apkVersion}
                    />}
                {showFooter &&
                    <MyScanComponent
                        onScanClick={this.onScanClick}
                        // showFooter={showFooter}
                        {...this.props}
                    />}
                {isLoading &&
                    <Spinner
                        animating={isLoading}
                        iconShow={iconShow}
                        loadingText={loaderText}
                        customContainer={{ opacity: 0.9, elevation: 15 }}
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
        ocrProcessLocal: state.ocrProcessLocal,
        ongoingScanDetails: state.ongoingScanDetails,
        loginDataRes: state.loginData,
        filteredData: state.filteredData
    }
}

const mapDispatchToProps = (dispatch) => {
    return bindActionCreators({
        OcrProcessLocal: OcrProcessLocal

    }, dispatch)
}

export default (connect(mapStateToProps, mapDispatchToProps)(MyScanContainer));
