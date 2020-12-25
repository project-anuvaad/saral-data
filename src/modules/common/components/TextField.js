import React from 'react';
import { View, Text, TextInput } from 'react-native';
import AppTheme from '../../../utils/AppTheme';

const TextField = React.forwardRef(({
    labelText,
    errorField,
    errorText,
    onChangeText,
    value,
    editable,
    customInputStyle,
    keyboardType,
    onEndEditing,
    customContainerStyle
}, ref) => {

    return(
        <View style={[styles.container, customContainerStyle]}>
            <View style={styles.labelContainerStyle}>
                <View style={styles.headerLabelViewStyle}>
                    <Text style={styles.labelTextStyle}>{labelText}</Text>
                </View>
                {errorField &&
                <View style={styles.errorViewStyle}>
                    <Text style={styles.errorTextStyle}>{errorText}</Text>
                </View>}
            </View>
            <TextInput
                ref={ref}
                style={[styles.inputStyle, customInputStyle]}
                onChangeText={onChangeText}
                value={value}
                editable={editable}
                keyboardType={keyboardType}
                onEndEditing={onEndEditing}
            />
        </View>
    );
});

const styles = {
    container: {
        paddingVertical: '2.5%',
        marginHorizontal: '5%'
    },
    labelContainerStyle: {
        flexDirection: 'row',
    },
    headerLabelViewStyle: {
        justifyContent: 'flex-start',
        width: '30%'
    },
    labelTextStyle: {
        fontSize: AppTheme.FONT_SIZE_MEDIUM_LAST,
        color: AppTheme.BLACK,
        fontWeight: '700',
        letterSpacing: 1,
        lineHeight: 35
    },
    errorViewStyle: {
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        width: '70%'
    },
    errorTextStyle: {
        fontSize: AppTheme.FONT_SIZE_TINY+1,
        color: AppTheme.ERROR_RED,
        fontWeight: '600',
        letterSpacing: .7,
        lineHeight: 35
    },
    inputStyle: {
        borderWidth: 1,
        borderRadius: 4,
        borderColor: AppTheme.LIGHT_GREY,
        paddingVertical: '3%',
        paddingHorizontal: '3%',
        padding: 0,
        fontSize: AppTheme.FONT_SIZE_REGULAR,
        color: AppTheme.BLACK,
    },
};

export default TextField;