import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Alert, FlatList } from 'react-native';
import { apkVersion } from '../../configs/config';


//storage
import { getStudentsExamData, getLoginCred, setAbsentStudentDataIntoAsync, setTotalStudent } from '../../utils/StorageUtils';

import Strings from '../../utils/Strings';

//components
import ButtonComponent from '../common/components/ButtonComponent';
import HeaderComponent from '../common/components/HeaderComponent';
import StudentsDataComponent from './StudentsDataComponent';

//styles
import { styles } from './AbsentUiStyle';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import APITransport from '../../flux/actions/transport/apitransport';
import _ from 'lodash'
import { SaveAbsentDataAction } from '../../flux/actions/apis/saveAbsentDataAction';
import { validateToken, cryptoText } from '../../utils/CommonUtils';
import { LoginAction } from '../../flux/actions/apis/loginAction';
import Spinner from '../common/components/loadingIndicator';

const AbsentUi = ({
    filteredData,
    loginDataRes,
    APITransport,
    navigation,
    absentStudentDataResponse,
    saveAbsentStudent,
    getScanStatusData
}) => {

    console.log("getScanStatusData", JSON.parse(getScanStatusData.data));
    function usePrevious(value) {
        const ref = useRef();
        useEffect(() => {
            ref.current = value;
        });
        return ref.current;
    }

    //states
    const [studentsData, setStudentsData] = useState([]);
    const [absentStudentsData, setAbsentStudentsData] = useState([]);
    const [fetchedAbsentList, setFetchedAbsentList] = useState([])
    const [examDataObj, setExamDatabj] = useState({});
    const [isLoading, setIsLoading] = useState(false)
    const prevloginResponse = usePrevious(loginDataRes);
    const prevSaveRes = usePrevious(saveAbsentStudent)
    const [apiCallStart, setApiCallStart] = useState(false)

    //function
    const studentData = async () => {
        const { examCode } = filteredData.response
        let studentsExamData = await getStudentsExamData();
        const filteredStudents = studentsExamData.filter(e => {
            if (e.class == filteredData.response.className && e.section == filteredData.response.section) {
                return true;
            }
        })
        setTotalStudent(filteredStudents[0].data.studentsInfo)

        let examId = ''

        _.forEach(filteredStudents[0].data.examInfo, (o) => {
            if (o.examCode == examCode) {
                examId = o.examId
            }
        })

        setExamDatabj({
            examCode,
            examId: examId
        })
        let studentsList = JSON.parse(JSON.stringify(filteredStudents[0].data.studentsInfo))
        let absentStudentlist = absentStudentDataResponse && absentStudentDataResponse.data.length > 0 ? JSON.parse(absentStudentDataResponse.data[0])[0].AbsentStudents : [];
        studentsList.forEach((element) => {
            element.isAbsent = false
            absentStudentlist.forEach(o => {
                if (o.AadhaarUID == element.aadhaarUID) {
                    element.isAbsent = true;
                }
            })
        });

        setFetchedAbsentList(absentStudentlist)
        setStudentsData(studentsList);
        setIsLoading(false);
    }

    const onNextClick = (token) => {
        if (absentStudentsData.length > 0) {
            let isTokenValid = validateToken(token)
            if (isTokenValid) {
                let absentList = _.filter(studentsData, (o) => o.isAbsent);
                saveAbsentDetails(token);
                setAbsentStudentDataIntoAsync(absentList);
            }
            else if (!isTokenValid) {
                loginAgain()
            }
        } else {
            let absentList = _.filter(studentsData, (o) => o.isAbsent);
            setAbsentStudentDataIntoAsync(absentList);
            navigation.navigate('scanHistory');
        }
    }

    const loginAgain = async () => {
        let loginCred = await getLoginCred()
        if (loginCred) {
            setIsLoading(true)
            let encPass = cryptoText(loginCred.password)
            let apiObj = new LoginAction(loginCred.username, encPass);
            APITransport(apiObj);
        }
        else {
            Alert.alert(Strings.message_text, Strings.please_try_again, [
                { 'text': Strings.ok_text, onPress: () => loginAgain() }
            ])
        }
    }

    const saveAbsentDetails = (token) => {
        setIsLoading(true)
        console.log("absentStudentDataResponse",absentStudentsData);
        let apiObj = new SaveAbsentDataAction(absentStudentsData, token)
        APITransport(apiObj);
    }

    useEffect(() => {
        studentData();
    }, [])

    useEffect(() => {
        if (prevloginResponse && loginDataRes && prevloginResponse != loginDataRes) {
            setIsLoading(false);
            if (loginDataRes && loginDataRes.data && loginDataRes.status == 200) {
                onNextClick(loginDataRes.data.jwtToken)
            } else if (loginDataRes && loginDataRes.data && loginDataRes.status != 200) {
                Alert.alert(Strings.message_text, Strings.process_failed_try_again, [
                    { 'text': Strings.cancel_text, style: Strings.cancel_text },
                    { 'text': Strings.retry_text, onPress: () => loginAgain() }
                ])
            }
        }

        if (prevSaveRes && saveAbsentStudent && prevSaveRes != saveAbsentStudent) {
            setIsLoading(false)
            if (saveAbsentStudent && saveAbsentStudent.data && saveAbsentStudent.status == 200) {
                navigation.navigate('scanHistory')
            } else if (saveAbsentStudent && saveAbsentStudent.data && saveAbsentStudent.status != 200) {
                Alert.alert(Strings.message_text, Strings.process_failed_try_again, [
                    { 'text': Strings.ok_text, style: Strings.cancel_text }
                ])
            }
        }
    }, [saveAbsentStudent, loginDataRes])


    const onMarkPresentAbsent = (data) => {
        let createdTime = new Date()
        let obj = {
            examId: examDataObj.examId,
            examCode: examDataObj.examCode,
            schoolId: data.schoolId,
            aadhaarUID: data.aadhaarUID,
            studyingClass: data.studyingClass,
            section: data.section.trim().toUpperCase(),
            createdOn: createdTime,
        }
        let isAlreadyMarkedAbsent = _.find(fetchedAbsentList, (o) => o.AadhaarUID == data.aadhaarUID)

        let scanedData = JSON.parse(getScanStatusData.data);
        if (data.isAbsent) {
            data.isAbsent = false
            if (isAlreadyMarkedAbsent) {
                obj.isAbsent = 0
                let absentStudentsDataArr = JSON.parse(JSON.stringify(absentStudentsData))
                absentStudentsDataArr.push(obj)
                setAbsentStudentsData(absentStudentsDataArr)
            } else {
                const modified = _.filter(absentStudentsData, (o) => o.aadhaarUID != data.aadhaarUID)
                setAbsentStudentsData((modified))
            }
        } else if (!data.isAbsent) {
            const checkIsScanned = scanedData[0].EntryCompletedStudents.filter((o) => o.AadhaarUID === data.aadhaarUID);
            if (checkIsScanned.length > 0) {
                Alert.alert("student can't be mark as absent once scanned !")
            }
            else {
                data.isAbsent = true
                if (isAlreadyMarkedAbsent) {
                    const modified = _.filter(absentStudentsData, (o) => o.aadhaarUID != data.aadhaarUID)
                    setAbsentStudentsData((modified))

                } else {
                    obj.isAbsent = 1
                    let absentStudentsDataArr = JSON.parse(JSON.stringify(absentStudentsData))
                    absentStudentsDataArr.push(obj)
                    setAbsentStudentsData(absentStudentsDataArr)
                }
            }
        }
    }

    const renderStudentData = ({ item }) => (
        <StudentsDataComponent
            item={item}
            onBtnClick={onMarkPresentAbsent}
        />
    );

    return (
        <View style={styles.container}>

            <HeaderComponent
                title={Strings.saralData_text}
                versionText={apkVersion}
            />

            {
                (loginDataRes && loginDataRes.data)
                &&
                <Text style={styles.schoolName}>
                    {Strings.school_name + ' : '}
                    <Text style={{ fontWeight: 'normal' }}>
                        {loginDataRes.data.schoolInfo.school}
                    </Text>
                </Text>
            }

            {
                (loginDataRes && loginDataRes.data)
                &&
                <Text style={styles.schoolId}>
                    {Strings.dise_code + ' : '}
                    <Text style={{ fontWeight: 'normal' }}>
                        {loginDataRes.data.schoolInfo.schoolCode}
                    </Text>
                </Text>
            }
            <FlatList
                data={studentsData}
                renderItem={renderStudentData}
                keyExtractor={(item) => item.studentId.toString()}
                contentContainerStyle={styles.flatlistCon}
                showsVerticalScrollIndicator={false}
            />
            <ButtonComponent
                customBtnStyle={styles.nxtBtnStyle}
                btnText={Strings.next_text.toUpperCase()}
                activeOpacity={0.8}
                onPress={() => onNextClick(loginDataRes.data.jwtToken)}
            />
            {
                isLoading &&
                <Spinner
                    animating={isLoading}
                    customContainer={{ opacity: 0.4, elevation: 15 }}
                />
            }
        </View>
    );
}
const mapStateToProps = (state) => {
    return {
        filteredData: state.filteredData,
        loginDataRes: state.loginData,
        saveAbsentStudent: state.saveAbsentStudent,
        absentStudentDataResponse: state.absentStudentDataResponse,
        saveDataLocal: state.saveDataLocal,
        getScanStatusData: state.getScanStatusData
    }
}

const mapDispatchToProps = (dispatch) => {
    return bindActionCreators({
        APITransport: APITransport,
    }, dispatch)
}
export default connect(mapStateToProps, mapDispatchToProps)(AbsentUi);
