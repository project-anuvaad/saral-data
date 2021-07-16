import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { apkVersion } from '../../configs/config';


//storage
import { getStudentsExamData } from '../../utils/StorageUtils';

import Strings from '../../utils/Strings';

//components
import ButtonComponent from '../common/components/ButtonComponent';
import HeaderComponent from '../common/components/HeaderComponent';
import StudentsDataComponent from './StudentsDataComponent';

//styles
import { styles } from './AbsentUiStyle';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';


const AbsentUi = ({
    filteredData,
    loginDataRes
}) => {

    //states
    const [studentsData, setStudentsData] = useState([]);
    const [absentStudentsData, setAbsentStudentsData] = useState([]);

    //function
    const studentData = async () => {
        let studentsExamData = await getStudentsExamData();
        const filteredStudents = studentsExamData.filter(e => {
            if (e.class == filteredData.response.className && e.section == filteredData.response.section) {
                return true;
            }
        }
        )
        setStudentsData(filteredStudents[0].data.studentsInfo);
    }

    const onNextClick = () => {
    }

    console.log("loginDataRes", loginDataRes);

    useEffect(() => {
        studentData();
    }, []);


    const renderStudentData = ({ item }) => (
        <StudentsDataComponent
            studentAadhaarUID={item.aadhaarUID}
            studentName={item.studentName}
            setAbsentStudentsData={setAbsentStudentsData}
            absentStudentsData={absentStudentsData}
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
                onPress={onNextClick}
            />
        </View>
    );
}
const mapStateToProps = (state) => {
    return {
        filteredData: state.filteredData,
        loginDataRes: state.loginData
    }
}

const mapDispatchToProps = (dispatch) => {
    return bindActionCreators({
    }, dispatch)
}
export default connect(mapStateToProps, mapDispatchToProps)(AbsentUi);
