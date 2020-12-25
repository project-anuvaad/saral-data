import React, { Component } from 'react';
import { ScrollView, View, Modal, Dimensions, Text } from 'react-native';
import AppTheme from '../../../utils/AppTheme';
import DropDownMenu from '../../common/components/DropDownComponent';
import Strings from '../../../utils/Strings';
import ButtonComponent from '../../common/components/ButtonComponent';
const { height, width } = Dimensions.get('window')

export default class PopupDialog extends Component {

    constructor(props) {
        super(props);
        this.state = {

        };
    }

    render() {
        const { visible, customPopStyle, studentAadhaarArr, defaultSelectedStuName, stuNameIndex, selectedStuName, onDropDownSelect, studentIdArr, defaultSelectedStuId, stuIdIndex, selectedStuId, onSubmitClick } = this.props;
        return (
            <Modal
                visible={visible}
                transparent={true}
                style={{ backgroundColor: 'rgba(0,0,0, 0.2)' }}
                animationType="fade">
                <View style={{
                    height: height,  
                    shadowColor: "black",
                    shadowOpacity: .2,
                    backgroundColor: "#0000",
                    shadowOffset:{height:3,width:3},
                    shadowRadius: 10,

                }}>
                    <ScrollView
                        keyboardShouldPersistTaps={'handled'}
                        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0, 0.4)' }}>
                        <View
                            style={[{
                                elevation: 10,
                                width: width * .85,
                                backgroundColor: AppTheme.WHITE,
                                marginHorizontal: width * .075,
                                paddingLeft: width * .06,
                                paddingRight: width * 0.06,
                                paddingTop: height * .03,
                                borderRadius: 8,                                
                            }, customPopStyle]}>
                            <View style={{ alignItems: 'center', paddingBottom: '10%' }}>
                            <Text
                                style={{ fontSize: AppTheme.FONT_SIZE_REGULAR, }}
                            >
                                {Strings.multiple_students_found_for_given_student_id}
                            </Text>
                            <Text
                                style={{ fontSize: AppTheme.FONT_SIZE_REGULAR, }}
                            >
                                {Strings.please_select_one_for_which_you_are_scanning}
                            </Text>
                            </View>
                            <DropDownMenu
                                customDropContainer={{ marginBottom: '10%' }}
                                customDropDownStyle={{ width: '70%' }}
                                options={studentAadhaarArr}
                                onSelect={(idx, value) => onDropDownSelect('studentName', idx, value)}
                                defaultData={defaultSelectedStuName}
                                defaultIndex={parseInt(stuNameIndex)}
                                selectedData={selectedStuName}
                                icon={require('../../../assets/images/Arrow_Right.png')}
                            />
                            {/* <DropDownMenu
                                // disabled={}
                                options={studentIdArr}
                                onSelect={(idx, value) => onDropDownSelect('studentId', idx, value)}
                                defaultData={defaultSelectedStuId}
                                defaultIndex={stuIdIndex}
                                selectedData={selectedStuId}
                                icon={require('../../../assets/images/Arrow_Right.png')}
                            /> */}
                            <View style={styles.container3}>
                                <ButtonComponent
                                    customBtnStyle={{ height: 30, minWidth: '40%', maxWidth: '50%', alignSelf: 'center'}}
                                    btnText={Strings.submit_text}
                                    onPress={onSubmitClick}
                                />
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        );
    }
}

const styles = {
    container3: {
        flex: 2,
        paddingBottom: '5%',
        paddingHorizontal: '4%'
    }

};