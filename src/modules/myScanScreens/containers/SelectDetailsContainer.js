import React, { Component } from 'react';
import { View, BackHandler, Alert } from 'react-native';
import SelectDetailsComponent from '../components/SelectDetailsComponent';
import Spinner from '../../common/components/loadingIndicator';
import HeaderComponent from '../../common/components/HeaderComponent';
import AppTheme from '../../../utils/AppTheme';
import Strings from '../../../utils/Strings';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { OcrProcessLocal } from '../../../flux/actions/apis/ocrProcessLocalAction';
import { OngoingScanDetailsAction } from '../../../flux/actions/apis/ongoingScanDetailsActions';
import { getLoginData } from '../../../utils/StorageUtils'
import _ from 'lodash'
import APITransport from '../../../flux/actions/transport/apitransport';
import { FilteredDataAction } from '../../../flux/actions/apis/filteredDataActions';
import AsyncStorage from '@react-native-community/async-storage';

class SelectDetailsContainer extends Component {
    constructor(props) {
        super(props);

        this.state = {
            isLoading: false,
            loaderText: '',
            iconShow: false,
            classList: [],
            classesArr: [],
            loginData: null,
        }

        this.onBack = this.onBack.bind(this)
    }

    componentDidMount() {
        const { navigation } = this.props

        navigation.addListener('didFocus', async payload => {
            BackHandler.addEventListener('hardwareBackPress', this.onBack)
            if(!this.state.loginData) {
                this.loadLoginDetails()
            }
        })

        this.willBlur = navigation.addListener('willBlur', payload =>
            BackHandler.removeEventListener('hardwareBackPress', this.onBack)
        );
    }

    componentWillUnmount() {
        // fix Warning: Can't perform a React state update on an unmounted component
        this.setState = (state,callback)=>{
            return;
        };
    }

    loadLoginDetails = async () => {
        let loginDetails = await getLoginData() 

        if(loginDetails) {                
            let classesArr = [...loginDetails.classInfo]
            let classes = []
            _.forEach(classesArr, (data, index) => {
                classes.push(data.className)
            })  
            
             this.setState({
                 classList: classes,
                 classesArr: classesArr,
                 loginData: loginDetails
             })
        }
    }

    onBack = () => {
        const { navigation } = this.props
        const { params } = navigation.state
        if(params && params.from_screen && params.from_screen == 'cameraActivity') {
            // this.props.navigation.navigate('scanHistory', { from_screen: 'cameraActivity'})
            BackHandler.exitApp()
            return true
        }
    }

    loader = (flag) => {
        this.setState({
            isLoading: flag
        })
    }

    onNext = (data) => {
       this.props.FilteredDataAction(data)
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

    setLoginDataLocally = (data) => {
        this.setState({
            loginData: data
        })
    }
    
    render() {
        const { isLoading, iconShow, loaderText, classList, classesArr, loginData } = this.state;

        if(!loginData) {
            this.loadLoginDetails();
        }

        return (
            <View style={styles.container}>
                    {/* <HeaderComponent
                        title={Strings.saralData_text}
                        versionText={apkVersion}
                    /> */}
                    <HeaderComponent
                        title={Strings.saralData_text}
                        logoutHeaderText={Strings.logout_text}
                        customLogoutTextStyle={{ color: AppTheme.PRIMARY_ORANGE }}
                        onLogoutClick={this.onLogoutClick}
                    />
                    <SelectDetailsComponent
                        classList={classList}
                        classesArr={classesArr}
                        onNext={this.onNext}
                        loginDetails={loginData}
                        setLoginDataLocally={this.setLoginDataLocally}
                        loader={this.loader}
                        {...this.props}
                    />
                {isLoading && 
                    <Spinner 
                        animating={isLoading} 
                        iconShow={iconShow}
                        loadingText={loaderText}
                        // customContainer={{opacity: 0.9, elevation: 15}}
                    />}
            </View>
        );
    }
}

const styles = {
    container: {
        flex: 1,
        backgroundColor: AppTheme.BACKGROUND_COLOR
    }
}

const mapStateToProps = (state) => {
    return {
        apiStatus: state.apiStatus,
        ocrProcessLocal: state.ocrProcessLocal,
        loginData: state.loginData,
        studentsAndExamData: state.studentsAndExamData,
        getScanStatusData: state.getScanStatusData,
        filteredData: state.filteredData

    }
}

const mapDispatchToProps = (dispatch) => {
    return bindActionCreators({
        OcrProcessLocal: OcrProcessLocal,
        OngoingScanDetailsAction: OngoingScanDetailsAction,
        FilteredDataAction: FilteredDataAction,
        APITransport: APITransport
        
    }, dispatch)
}

export default (connect(mapStateToProps, mapDispatchToProps)(SelectDetailsContainer));
