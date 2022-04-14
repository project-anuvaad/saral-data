import React, {Component} from 'react';
import { View, Alert, BackHandler, Platform, Linking, AppState } from 'react-native';
import WelcomeScreenComponent from '../components/WelcomeScreenComponent';
import { getLoginCred, setLoginData } from '../../../utils/StorageUtils'
import Spinner from '../../common/components/loadingIndicator';
import APITransport from '../../../flux/actions/transport/apitransport';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { LoginAction } from '../../../flux/actions/apis/loginAction';
import Strings from '../../../utils/Strings';
import { cryptoText } from '../../../utils/CommonUtils'
import { apkVersionId, apkURL } from '../../../configs/config'
import VersionCheck from 'react-native-version-check';
import { AppUpdateAction } from '../../../flux/actions/apis/appUpdateAction';
import CustomPopup from '../../common/components/CustomPopup';
import AppTheme from '../../../utils/AppTheme';

class WelcomeScreenContainer extends Component {
    constructor(props) {
        super(props);

        this.state = {
            isLoading: true,
            calledLogin: false,
            calledUpdate: false,
            popupVisible: false,
            updateMessage: '',
            optional: false,
            isError: false,
            appState: AppState.currentState
        }
    }

    async componentDidMount() {
        this.props.navigation.addListener('willFocus', async payload => {
            AppState.addEventListener('change', this.handleAppStateChange);
            this.componentMountCall()
        })
    }

    componentWillUnmount() {
        AppState.removeEventListener('change', this.handleAppStateChange);
    }

    handleAppStateChange = (nextAppState) => {
        if (this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
            this.componentMountCall()  
        }
        this.setState({appState: nextAppState});
      }

    componentMountCall = async() => {
        // let updateNeeded = await VersionCheck.needUpdate();
        // if (updateNeeded && updateNeeded.isNeeded) {
        //     this.onAppUpdateCheck()
        // } else {
            this.loginUser()
        // }
    }

    loginUser = async () => {
        let loginCred = await getLoginCred()
        if(loginCred) {
            this.setState({
                isLoading: true,
                username: loginCred.username,
                password: loginCred.password
            }, () => {
                
                this.callLogin()

            })
        }
        else{
           this.setState({
               isLoading: false
           })
        }
    }

    onAppUpdateCheck = async() => {
        this.setState({
            isLoading: true,
            calledUpdate: true
        }, async() => {
            let platform = Platform.OS === 'ios' ? 'ios' : 'android'
            let payload = {
                platform: platform,
                versionId: apkVersionId
            }    
            
            let apiObj = new AppUpdateAction(payload);
            this.props.APITransport(apiObj);
        })    
    }

    callLogin = () => {
        this.setState({
            isLoading: true,
            calledLogin: true
        }, () => {
            let encPass = cryptoText(this.state.password)
            let apiObj = new LoginAction(this.state.username, encPass);
            this.props.APITransport(apiObj);
        })
    }

    onCancel = () => {
        BackHandler.exitApp()
    }

    onUpdateClick = () => {
        const { isError } = this.state
        if (isError) {
            this.setState({
                isLoading: true,
                popupVisible: false,
                isError: false,
            })
            this.onAppUpdateCheck();
        }
        else {
            let updateUrl = apkURL
            Linking.canOpenURL(updateUrl).then(supported => {
                if (supported) {
                    Linking.openURL(updateUrl)
                }
            })
        }
    }

    componentDidUpdate(prevProps) {
        if (prevProps != this.props) {
            const { apiStatus, loginData, appUpdateData, navigation } = this.props
            const { calledLogin, calledUpdate } = this.state
            if (apiStatus && prevProps.apiStatus != apiStatus && apiStatus.error) {
                if(calledLogin) {
                    this.setState({ isLoading: false, calledLogin: false })
                    if(apiStatus && apiStatus.message) {
                        Alert.alert(Strings.message_text, apiStatus.message, [
                            { 'text': Strings.cancel_text, style: Strings.cancel_text, onPress: () => this.onCancel() },
                            { 'text': Strings.retry_text, onPress: () => this.callLogin() }
            
                        ])
                    } else {
                        Alert.alert(Strings.message_text, Strings.process_failed_try_again, [
                            { 'text': Strings.cancel_text, style: Strings.cancel_text, onPress: () => this.onCancel() },
                            { 'text': Strings.retry_text, onPress: () => this.callLogin() }
            
                        ])  
                    }
                }
            }
            if(calledLogin) {
                if (loginData && prevProps.loginData != loginData) {
                    this.setState({
                        isLoading: false,
                        calledLogin: false
                    }, async() => {
                        if(loginData.status && loginData.status == 200) {
                                let loginSaved = await setLoginData(loginData.data)
                                if(loginSaved) {
                                    navigation.navigate('mainMenu')
                                }
                                else {
                                    Alert.alert(Strings.message_text, Strings.process_failed_try_again, [
                                        { 'text': Strings.cancel_text, style: Strings.cancel_text, onPress: () => this.onCancel() },
                                        { 'text': Strings.retry_text, onPress: () => this.callLogin() }
                        
                                    ])
                                }
                        }
                        else {
                            Alert.alert(Strings.message_text, Strings.process_failed_try_again, [
                                { 'text': Strings.cancel_text, style: Strings.cancel_text, onPress: () => this.onCancel() },
                                { 'text': Strings.retry_text, onPress: () => this.callLogin() }
                
                            ])
                        }
                    })
                }
            }

            if(calledUpdate) {                
                if (appUpdateData && prevProps.appUpdateData != appUpdateData) {
                    this.setState({
                        isLoading: false,
                        calledUpdate: false
                    }, async() => {
                        if(appUpdateData.status && appUpdateData.status == 200) {
                            if (appUpdateData.data.updateType.toUpperCase() == 'OPTIONAL') {
                                Alert.alert(Strings.message_text, Strings.optional_update_available, [
                                    { 'text': Strings.no_btn_text, style: 'cancel', onPress: () => this.loginUser() },
                                    { 'text': Strings.yes_btn_text, onPress: () => this.onUpdateClick() }
                    
                                ])
                            }
                            else if (appUpdateData.data.updateType.toUpperCase() == 'FORCE') {
                                // Alert.alert(Strings.message_text, Strings.force_update_available, [
                                //     { 'text': Strings.no_btn_text, style: 'cancel', onPress: () => this.onCancel() },
                                //     { 'text': Strings.yes_btn_text, onPress: () => this.onUpdateClick() }
                                // ])
                            }
                        }
                        else {
                            Alert.alert(Strings.message_text, Strings.process_failed_try_again, [
                                { 'text': Strings.cancel_text, style: 'cancel', onPress: () => this.onCancel() },
                                { 'text': Strings.retry_text, onPress: () => this.onAppUpdateCheck() }
                
                            ])
                        }
                    })
                }
            }
        }
    }

    onNoClick = () => {
        const { optional } = this.state
        this.setState({
            popupVisible: false
        }, () => {
            if(optional) {
                this.loginUser()
            } else if(!optional) {
                this.onCancel()
            }
        })
    }

    render() {
        const { isLoading, popupVisible, updateMessage, isError, optional } = this.state
        return(
            <View style={styles.container}>
                <WelcomeScreenComponent 
                    {...this.props}
                />
                <CustomPopup
                    visible={popupVisible}
                    title={Strings.message_text}
                    customMessageTxtStyle={{ color: AppTheme.BLACK, paddingTop: '3%', fontSize: AppTheme.FONT_SIZE_REGULAR }}
                    message={updateMessage}
                    onCancelPress={this.onNoClick}
                    onOkPress={this.onUpdateClick}
                    cancel_button={Strings.no_btn_text}
                    ok_button={isError ? Strings.retry_text : Strings.yes_btn_text}
                    customStyle={{ height: '100%', marginTop: 0 }}
                />
                {isLoading && <Spinner animating={isLoading} />}
            </View>
        );
    }
}

const styles = {
    container: {
        flex: 1
    }
}

const mapStateToProps = (state) => {
    return {
        apiStatus: state.apiStatus,
        loginData: state.loginData,
        appUpdateData: state.appUpdateData.response
    }
}

const mapDispatchToProps = (dispatch) => {
    return bindActionCreators({
        APITransport: APITransport
    }, dispatch)
}

export default (connect(mapStateToProps, mapDispatchToProps)(WelcomeScreenContainer));