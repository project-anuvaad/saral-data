import { StyleSheet } from "react-native";
import AppTheme from "../../utils/AppTheme";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white'
    },
    schoolName: {
        fontSize: AppTheme.FONT_SIZE_REGULAR,
        color: AppTheme.BLACK,
        fontWeight: 'bold',
        paddingHorizontal: '5%',
        paddingVertical: '2%'
    },
    schoolId: {
        fontSize: AppTheme.FONT_SIZE_REGULAR - 3,
        color: AppTheme.BLACK,
        fontWeight: 'bold',
        paddingHorizontal: '5%',
        marginBottom: '2%'
    },
    flatlistCon: {
        padding: 40,
        paddingBottom: 0,
        paddingTop: 15
    },
    cardCon: {
        marginBottom: 15,
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderRadius: 10
    },
    cardChildCon: {
        alignItems: 'center',
        borderWidth: 1.2
    },
    line: {
        height: 1.2,
        width: '100%',
        backgroundColor: 'black',
    },
    aadhar: {
        padding: 10,
        textAlign: 'center'
    },
    markasAbsent: {
        color: '#ffffff',
    },
    btnCon: {
        paddingHorizontal: 25,
        paddingVertical: 6,
        borderRadius: 20,
        margin: 10
    },
    nxtBtnStyle: {
        margin: 10,
        marginHorizontal: 34
    }
});