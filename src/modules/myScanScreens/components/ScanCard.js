import React from 'react';
import { View, TouchableOpacity, Image, Text } from 'react-native';
import AppTheme from '../../../utils/AppTheme';
import Strings from '../../../utils/Strings';

const ScanCard = ({
    onCardClick,
    sourceImage,
    studentName,
    studentClass,
    studentRollNo,
    studentId,
    studentBookletId,
    studentTestId,
    studentTestDate,
    subject,
    addedDate
}) => {
    return(
        <TouchableOpacity 
            style={styles.container}
            activeOpacity={.8}
            onPress={onCardClick}
        >
            <View style={styles.subContainer}>
                <View style={styles.imageViewContainer}>
                    <View style={styles.imageContainerStyle}>
                        <Image 
                            source={sourceImage}
                            style={styles.imageStyle}
                            resizeMode={'contain'}
                        />
                    </View>
                </View>
                <View style={styles.deatilsViewContainer}>
                    <View style={styles.detailsSubContainerStyle}>
                        <Text style={[styles.nameTextStyle, { fontWeight: 'bold', color: AppTheme.BLACK, fontSize: AppTheme.FONT_SIZE_LARGE}]}>{studentName}</Text>
                        <Text style={styles.nameTextStyle}>{Strings.class_text+': '+studentClass}</Text>
                        <Text style={styles.nameTextStyle}>{Strings.roll_no+': '+studentRollNo}</Text>
                    </View>

                    <View style={styles.detailsSubContainerStyle}>
                        <Text style={styles.nameTextStyle}>{Strings.student_id+': '+studentId}</Text>
                        <Text style={styles.nameTextStyle}>{Strings.booklet_id+': '+studentBookletId}</Text>
                    </View>

                    <View style={styles.detailsSubContainerStyle}>
                        <Text style={styles.nameTextStyle}>{Strings.test_id+': '+studentTestId}</Text>
                        <Text style={styles.nameTextStyle}>{Strings.test_date+': '+studentTestDate}</Text>
                    </View>
                    <View style={[styles.detailsSubContainerStyle, { borderBottomWidth: 0 }]}>
                        <Text style={styles.nameTextStyle}>{Strings.subject_text+': '+subject}</Text>
                    </View>
                </View>
            </View>
            <View style={styles.addedTimeContainer}>
                <Text style={styles.nameTextStyle}>{Strings.added_text+': '+addedDate}</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = {
    container: {
        width: '100%',
        // height: 300,
        backgroundColor: AppTheme.WHITE,
        elevation: 4,
        borderRadius: 4,
        marginHorizontal: '5%',
        marginTop: '5%'
    },
    subContainer: {
        width: '100%',
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: AppTheme.LIGHT_GREY
    },
    imageViewContainer: {
        width: '30%',
        height: '100%',
        paddingHorizontal: '4%',
        paddingTop: '8%'
    },
    imageContainerStyle: {
        height: 90,
        width: 90
    },
    imageStyle: {
        height: '90%',
        width: '95%',
        borderRadius: 45
    },
    deatilsViewContainer: {
        width: '70%',
        height: '100%',
        paddingTop: '7%'
    },
    detailsSubContainerStyle: {
        justifyContent: 'space-evenly',
        borderBottomWidth: 1,
        borderBottomColor: AppTheme.LIGHT_GREY,
        paddingVertical: '3%'
    },
    nameTextStyle: {
        lineHeight: 25,
        fontSize: AppTheme.FONT_SIZE_SMALL,
        fontWeight: '500',
        color: AppTheme.GREY_TEXT,
        letterSpacing: 1
    },
    addedTimeContainer: {
        backgroundColor: AppTheme.GREY_WHITE,
        borderRadius: 4,
        paddingHorizontal: '7%',
        paddingVertical: '2%',
        justifyContent: 'center'
    }
};

export default ScanCard;