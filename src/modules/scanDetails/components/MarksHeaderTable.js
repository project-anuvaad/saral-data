import React from 'react';
import { View, TextInput, Image } from 'react-native';
import AppTheme from '../../../utils/AppTheme';

const MarksHeaderTable = ({
    customRowStyle,
    rowTitle,
    icon,
    editable,
    onChangeText,
    rowBorderColor,
    keyboardType
}) => {
    return (
        <View style={[styles.container, customRowStyle, {borderColor: rowBorderColor}]}>
            {icon ?
                <Image
                    style={{ height: 20, width: 20 }}
                    source={rowTitle == 'Passed' ? require('../../../assets/images/pass.png') : require('../../../assets/images/fail.png')}
                    resizeMode={'contain'}
                />
                :
                <TextInput
                    style={styles.titleTextStyle}
                    value={rowTitle}
                    multiline={true}
                    editable={editable}
                    onChangeText={onChangeText}
                    keyboardType={keyboardType}
                />
            }
        </View>
    );
}

const styles = {
    container: {
        // borderTopWidth: 1,
        // borderLeftWidth: 1,
        // borderBottomWidth: 1,
        height: 60,
        borderWidth: 1,
        borderColor: AppTheme.TAB_BORDER,
        backgroundColor: AppTheme.WHITE,
        alignItems: 'center',
        justifyContent: 'center',
        // paddingVertical: '2%',
    },
    titleTextStyle: {
        width: '100%',
        color: AppTheme.BLACK,
        fontWeight: 'bold',
        letterSpacing: 1,
        // paddingVertical: '20%',
        fontSize: AppTheme.FONT_SIZE_SMALL,
        textAlign: 'center'
    }
}

export default MarksHeaderTable;