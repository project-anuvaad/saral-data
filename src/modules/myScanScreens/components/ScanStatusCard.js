import React from 'react'
import { View, Text } from 'react-native';
import AppTheme from '../../../utils/AppTheme';
import Strings from '../../../utils/Strings';

const ScanStatusCard = ({
    customContainerStyle,
    studentName,
    studentAadhaarUid,
    saveStatus,
}) => {
    return (
        <View
            style={[styles.container, customContainerStyle]}
            disabled
        >   
            <View style={{ width: '85%', alignItems: 'center', alignSelf: 'center', paddingTop: '3%', paddingLeft: '1%', paddingRight: '1%', paddingBottom: '4%'}}>
                {/* <View style={[styles.scanLabelStyle, styles.scanTitleStyle]}>
                    <Text style={styles.scanTitleTxtStyle}>{Strings.scan_status}</Text>
                </View> */}
                <View style={[styles.scanLabelStyle, styles.scanLabelValueStyle]}>
                    <Text style={{ textAlign: 'center' }}>{studentName}</Text>
                </View>
                <View style={[styles.scanLabelStyle, styles.scanLabelValueStyle]}>
                    <Text style={{ textAlign: 'center' }}>{studentAadhaarUid}</Text>
                </View>
                <View style={[styles.scanLabelStyle, styles.scanLabelValueStyle, { borderBottomWidth: 1 }]}>
                    <Text style={{ textAlign: 'center' }}>{saveStatus}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = {
    container: {
        backgroundColor: AppTheme.GREEN,
        width: '100%',
        borderRadius: 8
    },
    scanCardStyle: {
        flexDirection: 'row',
        paddingHorizontal: '2%',
    },
    scanLabelStyle: {
        padding: '3%',
        width: '100%',
        alignItems: 'center',
        borderColor: AppTheme.BLACK
    },
    scanTitleTxtStyle: {
        textAlign: 'center',
        fontWeight: 'bold'
    },
    scanLabelValueStyle: {
        borderTopWidth: 1,
        backgroundColor: AppTheme.WHITE,
        borderLeftWidth: 1,
        borderRightWidth: 1,
    }
}

export default ScanStatusCard;