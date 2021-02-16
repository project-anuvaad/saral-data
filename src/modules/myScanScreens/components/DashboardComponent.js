import React, { Component } from 'react';
import { View, Text, Alert, BackHandler } from 'react-native';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import AsyncStorage from '@react-native-community/async-storage';
import _ from 'lodash'
import Strings from '../../../utils/Strings';
import AppTheme from '../../../utils/AppTheme';
import { apkVersion } from '../../../configs/config';
import HeaderComponent from '../../common/components/HeaderComponent';
import { HighlightButton } from '../../common/components/HighlightButton';
import { SCAN_TYPES } from '../../../utils/CommonUtils';

class DashboardComponent extends Component {
    constructor(props) {
        super(props);

        this.onBack = this.onBack.bind(this)
    }

    componentDidMount() {
        const { navigation } = this.props

        navigation.addListener('didFocus', async payload => {
            BackHandler.addEventListener('hardwareBackPress', this.onBack)
        })

        this.willBlur = navigation.addListener('willBlur', payload =>
            BackHandler.removeEventListener('hardwareBackPress', this.onBack)
        );
    }

    onLogoutClick = async () => {
        Alert.alert(Strings.message_text, Strings.you_will_loose_all_your_data, [
            { 'text': Strings.no_text, style: 'cancel' },
            {
                'text': Strings.yes_text, onPress: async () => {
                    await AsyncStorage.clear();
                    this.props.navigation.navigate('welcome')
                }
            }
        ])
    }

    onNextClick = (type) => {
        this.props.navigation.navigate('selectDetails', { scanType: type })
    }

    onBack = () => {
        BackHandler.exitApp()
        return true
    }

    render() {
        const { loginData } = this.props
        return (

            <View style={{ flex: 1, backgroundColor: AppTheme.BACKGROUND_COLOR }}>
                <HeaderComponent
                    title={Strings.saralData_text}
                    logoutHeaderText={Strings.logout_text}
                    customLogoutTextStyle={{ color: AppTheme.PRIMARY_ORANGE }}
                    onLogoutClick={this.onLogoutClick}
                />
                {(loginData && loginData.data) && 
                    <Text 
                        style={{ fontSize: AppTheme.FONT_SIZE_REGULAR, color: AppTheme.BLACK, fontWeight: 'bold',  paddingHorizontal: '5%', paddingVertical: '2%' }}
                    >
                        {Strings.school_name+' : '}
                        <Text style={{ fontWeight: 'normal'}}>
                            {loginData.data.schoolInfo.school}
                        </Text>
                    </Text>}
                {(loginData && loginData.data) && 
                    <Text 
                        style={{ fontSize: AppTheme.FONT_SIZE_REGULAR-3, color: AppTheme.BLACK, fontWeight: 'bold', paddingHorizontal: '5%', marginBottom: '2%' }}
                    >
                        {Strings.dise_code+' : '}
                        <Text style={{ fontWeight: 'normal'}}>
                            {loginData.data.schoolInfo.schoolCode}
                        </Text>
                    </Text>}
                    <Text 
                        style={{ fontSize: AppTheme.FONT_SIZE_REGULAR-3, color: AppTheme.BLACK, fontWeight: 'bold', paddingHorizontal: '5%', marginBottom: '4%' }}
                    >
                        {Strings.version_text+' : '}
                        <Text style={{ fontWeight: 'normal'}}>
                            {apkVersion}
                        </Text>
                    </Text>
                    <View style={styles.container1}>
                        <View style={{ backgroundColor: AppTheme.WHITE, width: '100%', alignItems: 'center', paddingVertical: '15%', borderRadius: 8  }}>
                        <HighlightButton 
                            btnText={Strings.sat_string}
                            onBtnPress={() => this.onNextClick(SCAN_TYPES.SAT_TYPE)}
                        />
                        <HighlightButton 
                            btnText={Strings.pat_string}
                            onBtnPress={() => this.onNextClick(SCAN_TYPES.PAT_TYPE)}
                        />
                        </View>
                    </View>

            </View>
        );
    }
}

const styles = {
    container1: {
        flex: .8,
        marginHorizontal: '6%',
        alignItems: 'center',
        justifyContent: 'center'
    }
}

const mapStateToProps = (state) => {
    return {
        loginData: state.loginData,
    }
}

const mapDispatchToProps = (dispatch) => {
    return bindActionCreators({
        
    }, dispatch)
}

export default (connect(mapStateToProps, mapDispatchToProps)(DashboardComponent));
