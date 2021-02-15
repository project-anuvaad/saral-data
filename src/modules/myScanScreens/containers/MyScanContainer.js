import React, { Component } from 'react';
import { View, PermissionsAndroid, Platform, Alert, BackHandler, DeviceEventEmitter } from 'react-native';
import MyScanComponent from '../components/MyScanComponent';
import Spinner from '../../common/components/loadingIndicator';
import HeaderComponent from '../../common/components/HeaderComponent';
import AppTheme from '../../../utils/AppTheme';
import Strings from '../../../utils/Strings';
import SystemSetting from 'react-native-system-setting'
import RNOpenCvCameraModel from '../../../utils/RNOpenCvCamera';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { OcrProcessLocal } from '../../../flux/actions/apis/ocrProcessLocalAction';
import { StackActions, NavigationActions } from 'react-navigation';
import { getLoginData, getStudentsExamData } from '../../../utils/StorageUtils'
import _ from 'lodash'
import { apkVersion } from '../../../configs/config'

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
                    } else if(permRes['android.permission.READ_EXTERNAL_STORAGE'] == 'never_ask_again' ||
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
        const { ongoingScanDetails } = this.props
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
                                        
                    RNOpenCvCameraModel.openScanCamera(JSON.stringify(uniqStudentsList))
                        .then(data => {
                            let imgArr = data.split(',');
                            console.log("imgArrSuccess", imgArr);
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
                            tableData.push(JSON.parse(response))

                            let studentObj = {
                                data: [{ 'row': 0, 'col': 0, "text": "વિદ્યાર્થી યુનિક આઈડી" }, { 'row': 1, 'col': 0, "text": "વપરીક્ષણ તારીખ" }],
                                "header": { 'col': 2, 'row': 2, "title": "Student summary" }
                            }

                            let marksObj = {
                                data: [{ 'row': 0, 'col': 0, "text": "પ્રશ્નક્રમ" }, { 'row': 0, 'col': 1, "text": "અધ્યયન નિષ્પતિ ક્રમ" }],
                                "header": { 'col': 2, 'row': 11, "title": "Marks received" }
                            }

                            for (let i = 1; i < 6; i++) {
                                let obj = { 'row': i, 'col': 0, "text": i }
                                marksObj.data.push(obj)
                            }

                            let tempTable = tableData[0].table
                            let base64Data = []
                            for (let i = 0; i < tempTable.length; i++) {

                                if (i < 2) {
                                    let obj = { 'row': i, 'col': 1, 'text': tempTable[i][i] }
                                    studentObj.data.push(obj)
                                }
                                else if (i >= 2 && i <= 6) {
                                    let obj = { 'row': i - 1, 'col': 1, 'text': tempTable[i][i] }
                                    marksObj.data.push(obj)
                                }
                                else if (i > 6 && i <= 13) {
                                    if(loginData.storeTrainingData) {
                                        base64Data.push(tempTable[i][i])
                                    }
                                }
                            }
                            
                            let table = []
                            table.push(studentObj, marksObj)
                            this.props.OcrProcessLocal(tableData);
                            //  this.setState({ iconShow: true, loaderText: Strings.scanning_complete })
                            // setTimeout(() => {
                            this.setState({ isLoading: false, iconShow: false, loaderText: '' })
                            this.props.navigation.navigate('scanDetails', { oldBrightness: this.state.oldBrightness, base64Data: base64Data })
                            // }, 1000);

                        })
                        .catch((code, errorMessage) => {
                            this.setState({ isLoading: false, iconShow: false, loaderText: '' })
                            Alert.alert(Strings.message_text, Strings.table_image_is_not_proper)
                            console.log("dataFailure", code, "Message", errorMessage);
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
    }
}

const mapDispatchToProps = (dispatch) => {
    return bindActionCreators({
        OcrProcessLocal: OcrProcessLocal

    }, dispatch)
}

export default (connect(mapStateToProps, mapDispatchToProps)(MyScanContainer));
