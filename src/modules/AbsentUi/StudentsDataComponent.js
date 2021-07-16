import React, { memo, useState } from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import AppTheme from '../../utils/AppTheme';

import { styles } from './AbsentUiStyle';


const StudentsDataComponent = ({ studentAadhaarUID, studentName, setAbsentStudentsData, absentStudentsData }) => {

    const [isAbsent, setIsAbsent] = useState(false);

    return (
        <View style={[styles.cardCon, { backgroundColor: isAbsent ? AppTheme.YELLOW : AppTheme.GREEN }]}>
            <View style={[styles.cardChildCon, { backgroundColor: isAbsent ? "#ffffffED" : "#FAFAFA" }]}>

                <Text style={styles.aadhar}>{studentAadhaarUID}</Text>
                <View style={styles.line} />
                <Text style={styles.aadhar}>{studentName}</Text>
                <View style={styles.line} />

                <TouchableOpacity
                    style={[styles.btnCon, { backgroundColor: isAbsent ? AppTheme.YELLOW : AppTheme.GREEN }]}
                    activeOpacity={0.7}
                    onPress={() => {
                        if (isAbsent) {
                            const modified = absentStudentsData.filter(e => e.aadhaarUID !== studentAadhaarUID);
                            setAbsentStudentsData(modified);

                        } else {

                            setAbsentStudentsData([
                                ...absentStudentsData,
                                {
                                    studentName: studentName,
                                    aadhaarUID: studentAadhaarUID
                                }
                            ])
                        }
                        setIsAbsent(!isAbsent);
                    }}
                >
                    {
                        isAbsent
                            ?
                            <Text style={styles.markasAbsent}>Mark as Present</Text>
                            :
                            <Text style={styles.markasAbsent}>Mark as Absent</Text>
                    }
                </TouchableOpacity>

            </View>
        </View>
    );
}
export default memo(StudentsDataComponent);