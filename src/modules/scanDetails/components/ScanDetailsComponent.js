import React, { Component } from 'react';
import { View, ScrollView, Text, Image } from 'react-native';
import ButtonComponent from '../../common/components/ButtonComponent'
import Strings from '../../../utils/Strings';
import AppTheme from '../../../utils/AppTheme';
import TextField from '../../common/components/TextField';
import TabHeader from '../../common/components/TabHeader';
import ButtonWithIcon from '../../common/components/ButtonWithIcon';
import MarksHeaderTable from './MarksHeaderTable';
import DropDownMenu from '../../common/components/DropDownComponent';
import constantStrings from '../../../utils/constantStrings';
import { SCAN_TYPES } from '../../../utils/CommonUtils'

const marksData = [
    {
        maximum: '100',
        minimum: '40',
        earned: '65',
        pass: 'Passed'
    },
    {
        maximum: '100',
        minimum: '40',
        earned: '35',
        pass: 'Failed'
    },
    {
        maximum: '100',
        minimum: '40',
        earned: '38',
        pass: 'failed'
    },
    {
        maximum: '100',
        minimum: '40',
        earned: '78',
        pass: 'Passed'
    },
    {
        maximum: '100',
        minimum: '40',
        earned: '85',
        pass: 'Passed'
    }
]
class ScanDetailsComponent extends Component {
    constructor(props) {
        super(props);

        this.state = {
            marksdetails: marksData,
            defaultSelected: Strings.select_text,
            testIdIndex: -1,
        }
        this.inputRef = React.createRef();
    }

    componentDidUpdate(prevProps) {
        if (prevProps != this.props) {
            const { finalArray1 } = this.props;
            if (finalArray1 && prevProps.finalArray1 != finalArray1) {                
                this.setState({
                    marksdetails: finalArray1
                })
            }
        }
    }

    onEditClick = (value) => {
        this.props.onEdit(value)
    }

    onNextClick = () => {

        if(this.inputRef.current.isFocused()) {
            this.inputRef.current.blur();
        }
        this.props.onNext()
    }

    onSubmitClick = () => {
        this.props.onSubmit()
    }

    onTabClick = (value) => {
        // if (!this.props.edit) {
        this.props.tabClicked(value)
        // }
    }

    onDetailsChange(text, type) {
        this.props.onStudentDetailsChange(text, type, true)
    }

    handleTextChange = (text, index, array) => {
        this.props.saveChangeMarksTelemetry(text, index)
        let newArray = JSON.parse(JSON.stringify(array))
        newArray[index].earned[0] = text
        newArray[index].earned[1] = text.length != 0 && !isNaN(parseInt(text)) && parseFloat(text) <= parseFloat(newArray[index].maximum) ? AppTheme.TAB_BORDER : AppTheme.ERROR_RED
        // newArray[index].pass = text.length != 0 && !isNaN(parseInt(text)) && parseFloat(text) <= parseFloat(newArray[index].maximum) ? 'Passed' : 'Failed'

        this.setState({ marksdetails: newArray })
    }

    onDropDownSelect(idx, value, type) {
        if(type == 'testId') {
            this.setState({
                testIdIndex: Number(idx),
            }, () => {
                this.props.setTestId(value)
            })
        }
        else if(type == 'examTakenAt') {
            this.props.setExamTakenAt(Number(idx), value)
        }
    }

    onSummaryClick = () => {
        this.props.onSummaryClick(this.state.marksdetails)
    }

    renderTabFirst = () => {
        const { testIdIndex, defaultSelected } = this.state
        const { edit, studentId, testDate, stdErr, testIds, testId, testDateErr, errTestId, errExamTakenAt, examTakenAtIndex, examTakenAtArr, examTakenAt, scanType, loginDataRes } = this.props
        return (
            <View>
                {scanType == SCAN_TYPES.SAT_TYPE && loginDataRes && loginDataRes.data && loginDataRes.data.storeExamTakenAtInfo &&
                <View style={styles.fieldContainerStyle}>
                    <View style={{ flexDirection: 'row' }}>
                        <Text style={[styles.labelTextStyle]}>{Strings.exam_taken_at}</Text>
                        {errExamTakenAt != '' && <Text style={[styles.labelTextStyle, { color: AppTheme.ERROR_RED, fontSize: AppTheme.FONT_SIZE_TINY + 1, width: '60%', textAlign: 'right', fontWeight: 'normal' }]}>{errExamTakenAt}</Text>}
                    </View>
                    <DropDownMenu
                        disabled={examTakenAtArr.length <= 1}
                        options={examTakenAtArr && examTakenAtArr}
                        onSelect={(idx, value) => this.onDropDownSelect(idx, value, 'examTakenAt')}
                        defaultData={defaultSelected}
                        defaultIndex={examTakenAtIndex}
                        selectedData={examTakenAt}
                        icon={examTakenAtArr.length == 1 ? null : require('../../../assets/images/Arrow_Right.png')}
                    />
                </View>}
                <TextField
                    labelText={Strings.student_id}
                    errorField={stdErr != '' || isNaN(studentId)}
                    errorText={stdErr != '' ? stdErr : Strings.please_correct_student_id}
                    onChangeText={(text) => this.onDetailsChange(text.trim(), 'studentId')}
                    value={studentId}
                    editable={edit}
                    keyboardType={'numeric'}
                />
                <View style={styles.fieldContainerStyle}>
                    <View style={{ flexDirection: 'row' }}>
                        <Text style={[styles.labelTextStyle]}>{Strings.test_id}</Text>
                        {errTestId != '' && <Text style={[styles.labelTextStyle, { color: AppTheme.ERROR_RED, fontSize: AppTheme.FONT_SIZE_TINY + 1, width: '60%', textAlign: 'right', fontWeight: 'normal' }]}>{errTestId}</Text>}
                    </View>
                    <DropDownMenu
                        disabled={testIds.length <= 1}
                        options={testIds && testIds}
                        onSelect={(idx, value) => this.onDropDownSelect(idx, value, 'testId')}
                        defaultData={testIds.length >= 1 ? testIds[0] : defaultSelected}
                        defaultIndex={testIdIndex}
                        selectedData={testId}
                        icon={testIds.length == 1 ? null : require('../../../assets/images/Arrow_Right.png')}
                    />
                </View>
                <TextField
                    labelText={Strings.test_date}
                    errorField={testDateErr != ''}
                    errorText={testDateErr}
                    ref={this.inputRef}
                    // onChangeText={(text) => this.onDetailsChange(text.trim(), 'testDate')}
                    value={testDate}
                    editable={false}
                // onEndEditing={() => this.props.getExamID(testDate)}
                />
                
                <View style={[styles.container3,{paddingBottom:'5%',}]}>
                    <ButtonComponent
                        customBtnStyle={[styles.cancelBtnStyle, { width: '35%' }]}
                        customBtnTextStyle={styles.editBtnTextStyle}
                        btnText={Strings.cancel_text_caps}
                        onPress={() => this.props.onCancelFirstTab()}
                    />
                    <ButtonComponent
                        customBtnStyle={styles.nxtBtnStyle}
                        customBtnTextStyle={styles.nxtBtnTextStyle}
                        btnText={Strings.next_text.toUpperCase()}
                        onPress={this.onNextClick}
                    />
                </View>

            </View>
        )
    }

    renderTabSecond = () => {
        const { marksdetails } = this.state
        const { edit, studentName, studentId, testId } = this.props
        return (

            <ScrollView contentContainerStyle={{ backgroundColor: AppTheme.WHITE, paddingBottom: '15%' }} keyboardShouldPersistTaps={'handled'}>
                <Text style={styles.studentDetailsTxtStyle}>{Strings.student_details}</Text>
                <View style={styles.studentContainer}>
                    <View style={styles.imageViewContainer}>
                        <View style={styles.imageContainerStyle}>
                            {/* <Image
                                source={require('../../../assets/images/sample.png')}
                                style={styles.imageStyle}
                                resizeMode={'contain'}
                            /> */}
                            <Text style={{ textAlign: 'center', fontSize: AppTheme.HEADER_FONT_SIZE_LARGE }}>{studentName.charAt(0)}</Text>
                        </View>
                    </View>
                    <View style={styles.deatilsViewContainer}>
                        <View style={styles.detailsSubContainerStyle}>
                            <Text style={[styles.nameTextStyle, { fontWeight: 'bold', color: AppTheme.BLACK, fontSize: AppTheme.FONT_SIZE_LARGE }]}>{studentName}</Text>
                            {/* <Text style={styles.nameTextStyle}>{Strings.class_text + ': ' + 'X'}</Text>
                            <Text style={styles.nameTextStyle}>{Strings.roll_no + ': ' + '25'}</Text> */}
                            <Text style={styles.nameTextStyle}>{Strings.student_id + ': ' + studentId}</Text>
                            <Text style={styles.nameTextStyle}>{Strings.test_id + ': ' + testId}</Text>
                        </View> 
                    </View>
                </View>
                <Text style={styles.studentDetailsTxtStyle}>{Strings.marks_text}</Text>

                <View style={{ flexDirection: 'row', }}>
                    {constantStrings.rowHeader.map((data, index) => {
                        return (
                            <MarksHeaderTable
                                customRowStyle={{ width: index == 0 ? '19.99%' : '26.67%', backgroundColor: AppTheme.TABLE_HEADER }}
                                key={index}
                                rowTitle={data}
                                rowBorderColor={AppTheme.TAB_BORDER}
                                editable={false}
                            />
                        )
                    })}
                </View>

                {marksdetails.map((data, indexNumber) => {
                    return (
                        <View
                            style={{ flexDirection: 'row' }}
                            key={indexNumber}
                        >
                            {Object.keys(data).map((key, index) => {
                                if (key == 'earned') {
                                    return (
                                        <MarksHeaderTable
                                            customRowStyle={{ width: '26.67%', }}
                                            key={index}
                                            icon={key == 'pass'}
                                            rowTitle={data[key][0]}
                                            rowBorderColor={data[key][[1]]}
                                            editable={key == 'earned' ? edit : false}
                                            keyboardType={'number-pad'}
                                            onChangeText={(text) => {
                                                this.handleTextChange(text.trim(), indexNumber, marksdetails)
                                            }}
                                        />
                                    )
                                }
                                else {
                                    return (
                                        <MarksHeaderTable
                                            customRowStyle={{ width: key == 'srNo' ? '19.99%' : '26.67%' }}
                                            key={index}
                                            icon={key == 'pass'}
                                            rowTitle={data[key]}
                                            rowBorderColor={AppTheme.TAB_BORDER}
                                            editable={false}
                                        // onChangeText={(text) => {
                                        //     this.handleTextChange(text, indexNumber, marksdetails)
                                        // }}   
                                        />
                                    )
                                }
                            })}
                        </View>
                    )
                })}
                <View style={[styles.container3, { paddingTop: '7%' }]}>
                    <ButtonComponent
                        customBtnStyle={[styles.cancelBtnStyle, { width: '35%' }]}
                        customBtnTextStyle={styles.editBtnTextStyle}
                        btnText={Strings.cancel_text_caps}
                        onPress={() => this.onTabClick(1)}
                    />
                    <ButtonComponent
                        customBtnStyle={styles.nxtBtnStyle}
                        customBtnTextStyle={styles.nxtBtnTextStyle}
                        btnText={Strings.summary_text.toUpperCase()}
                        onPress={this.onSummaryClick}
                    />
                </View>
            </ScrollView>
        );
    }

    render() {
        const { tabIndex, edit, studentName, studentId, testId, summary, totalMarks, securedMarks } = this.props
        return (

            <ScrollView
                contentContainerStyle={{ backgroundColor: AppTheme.BACKGROUND_COLOR, paddingBottom: '15%' }}
                showsVerticalScrollIndicator={false}
                bounces={false}
                keyboardShouldPersistTaps={'handled'}
            >
                {!summary && <View>
                    <View style={styles.container1}>
                        <Text style={styles.header1TextStyle}>
                            {Strings.complete_these_steps_submit_marks}
                        </Text>
                    </View>
                    <View style={styles.container2}>
                        <TabHeader
                            tabIndex={tabIndex}
                            onPressTab1={() => this.onTabClick(1)}
                            tabLabel1={Strings.verify_subject_details}
                            tabLabel2={Strings.verify_marks_subject}
                        />
                        {tabIndex == 1 ? this.renderTabFirst() : this.renderTabSecond()}
                    </View>
                </View>
                }
                {summary &&
                <View style={{ backgroundColor: AppTheme.WHITE, paddingBottom: '10%' }}>
                    <Text style={styles.studentDetailsTxtStyle}>{Strings.student_details}</Text>
                    <View style={styles.studentContainer}>
                        <View style={styles.imageViewContainer}>
                            <View style={styles.imageContainerStyle}>                                
                                <Text style={{ textAlign: 'center', fontSize: AppTheme.HEADER_FONT_SIZE_LARGE }}>{studentName.charAt(0)}</Text>
                            </View>
                        </View>
                        <View style={styles.deatilsViewContainer}>
                            <View style={styles.detailsSubContainerStyle}>
                                <Text style={[styles.nameTextStyle, { fontWeight: 'bold', color: AppTheme.BLACK, fontSize: AppTheme.FONT_SIZE_LARGE }]}>{studentName}</Text>                                
                                <Text style={styles.nameTextStyle}>{Strings.student_id + ': ' + studentId}</Text>
                                <Text style={styles.nameTextStyle}>{Strings.test_id + ': ' + testId}</Text>
                            </View>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', paddingLeft: '5%' }}>
                        <Text style={[styles.studentDetailsTxtStyle, { paddingTop: '4%', paddingBottom: 0 }]}>{Strings.total_marks + ':'}</Text>
                        <Text style={[styles.studentDetailsTxtStyle, { paddingTop: '4%', color: AppTheme.BLACK, paddingHorizontal: 0 }]}>{totalMarks}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', paddingLeft: '5%' }}>
                        <Text style={[styles.studentDetailsTxtStyle, { paddingTop: 0 }]}>{Strings.total_marks_secured + ':'}</Text>
                        <Text style={[styles.studentDetailsTxtStyle, { paddingTop: 0, color: AppTheme.BLACK, paddingHorizontal: 0 }]}>{securedMarks}</Text>
                    </View>

                    <View style={[styles.container3, { paddingTop: '7%' }]}>
                        <ButtonWithIcon
                            customBtnStyle={styles.editBtnStyle}
                            customBtnTextStyle={styles.editBtnTextStyle}
                            bgColor={AppTheme.TAB_BORDER}
                            btnIcon={require('../../../assets/images/editIcon.png')}
                            btnText={Strings.edit_text.toUpperCase()}
                            onPress={() => this.props.onSummaryCancel()}

                        />
                        <ButtonComponent
                            customBtnStyle={styles.submitBtnStyle}
                            btnText={Strings.submit_text.toUpperCase()}
                            onPress={this.onSubmitClick}
                        />
                    </View>
                    </View>
            }
            </ScrollView>
        );
    }
}

const styles = {
    container1: {
        flex: 1,
        flexDirection: 'row',
        marginHorizontal: '5%',
        justifyContent: 'center',
        alignItems: 'center',
        // backgroundColor: 'yellow'
    },
    header1TextStyle: {
        padding: '5%',
        textAlign: 'center',
        fontSize: AppTheme.FONT_SIZE_MEDIUM_SMALL,
        color: AppTheme.BLACK,
        letterSpacing: 1,
    },
    container2: {
        flex: 1,
        borderRadius: 4,
        elevation: 4,
        marginHorizontal: '5%',
        // paddingBottom: '5%',
        backgroundColor: AppTheme.WHITE,
    },
    cancelBtnStyle: {
        backgroundColor: 'transparent',
        width: '40%',
        borderWidth: 1,
        borderColor: AppTheme.BTN_BORDER_GREY
    },
    cancelBtnTextStyle: {
        color: AppTheme.BLACK
    },
    container3: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: '4%',
        paddingTop: '15%',
        backgroundColor: AppTheme.WHITE
    },
    editBtnStyle: {
        width: '35%',
        justifyContent: 'space-evenly'
    },
    editBtnTextStyle: {
        color: AppTheme.BLACK
    },
    nxtBtnStyle: {
        backgroundColor: 'transparent',
        width: '60%',
        borderWidth: 1,
        borderColor: AppTheme.PRIMARY_ORANGE
    },
    nxtBtnTextStyle: {
        color: AppTheme.PRIMARY_ORANGE
    },
    studentDetailsTxtStyle: {
        color: AppTheme.GREY_TITLE,
        fontSize: AppTheme.FONT_SIZE_MEDIUM,
        paddingHorizontal: '5%',
        paddingTop: '8%',
        paddingBottom: '8%',
        fontWeight: 'bold',
        letterSpacing: 1
    },
    studentContainer: {
        // flex: 1,
        flexDirection: 'row',
        alignSelf: 'center',
        width: '90%',
        borderBottomWidth: 1,
        borderBottomColor: AppTheme.LIGHT_GREY,
    },
    imageViewContainer: {
        width: '30%',
        height: '100%',
        // paddingTop: '4%',
        marginRight: '1%'
    },
    imageContainerStyle: {
        height: 90,
        width: 90,
        borderRadius: 45,
        borderWidth: 1,
        borderColor: AppTheme.TAB_BORDER,
        justifyContent: 'center',
        backgroundColor: AppTheme.TAB_BORDER
    },
    imageStyle: {
        height: '90%',
        width: '90%',

        // borderRadius: 45
    },
    deatilsViewContainer: {
        width: '70%',
        height: '100%',
        paddingLeft: '1%',
    },
    detailsSubContainerStyle: {
        justifyContent: 'space-evenly',
        paddingVertical: '3%'
    },
    nameTextStyle: {
        lineHeight: 25,
        fontSize: AppTheme.FONT_SIZE_SMALL,
        fontWeight: '500',
        color: AppTheme.GREY_TEXT,
        letterSpacing: 1
    },
    submitBtnStyle: {
        width: '60%',
    },
    fieldContainerStyle: {
        paddingVertical: '2.5%',
        marginHorizontal: '5%'
    },
    labelTextStyle: {
        width: '40%',
        fontSize: AppTheme.FONT_SIZE_MEDIUM,
        color: AppTheme.BLACK,
        fontWeight: 'bold',
        letterSpacing: 1,
        lineHeight: 35
    },
}

export default ScanDetailsComponent;