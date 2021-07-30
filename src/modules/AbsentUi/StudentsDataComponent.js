import React, { memo, useState } from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import AppTheme from '../../utils/AppTheme';

import { styles } from './AbsentUiStyle';

const StudentsDataComponent = ({ item, onBtnClick }) => {

    return (
        <View style={[styles.cardCon, { backgroundColor: item.isAbsent ? AppTheme.YELLOW : AppTheme.GREEN }]}>
            <View style={[styles.cardChildCon, { backgroundColor: item.isAbsent ? "#ffffffED" : "#FAFAFA" }]}>

                <Text style={styles.aadhar}>{item.aadhaarUID}</Text>
                <View style={styles.line} />
                <Text style={styles.aadhar}>{item.studentName}</Text>
                <View style={styles.line} />

                <TouchableOpacity
                    style={[styles.btnCon, { backgroundColor: item.isAbsent ? AppTheme.YELLOW : AppTheme.GREEN }]}
                    activeOpacity={0.7}
                    onPress={() => onBtnClick(item)}
                >
                    {
                        item.isAbsent
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