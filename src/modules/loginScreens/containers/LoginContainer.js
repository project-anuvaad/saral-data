import React, { Component } from 'react';
import { View } from 'react-native';
import LoginComponent from '../components/LoginComponent';
import Spinner from '../../common/components/loadingIndicator';
import APITransport from '../../../flux/actions/transport/apitransport';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { LoginAction } from '../../../flux/actions/apis/loginAction';
import AsyncStorage from '@react-native-community/async-storage';
import Strings from '../../../utils/Strings';
import { setLoginData, setLoginCred } from '../../../utils/StorageUtils'
import { cryptoText } from '../../../utils/CommonUtils'

class LoginContainer extends Component {
    constructor(props) {
        super(props);

        this.state = {
            isLoading: false,
            errUsername: '',
            errPassword: '',
            errCommon: '',
            userName: '',
            password: '',
            calledLogin: false
        }
    }

    componentDidMount() {

    }

    validatePassword = (password) => {
        var matchRegx = new RegExp(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{8,}$/);
        let passwordValid = matchRegx.test(password);
        return passwordValid;
    }

    onSubmit = (userName, password) => {
        if (userName === '' || userName === null) {
            this.setState({
                errUsername: Strings.please_enter_username,
                errPassword: ''
            })
            return;
        }
        // else if (userName !== '') {
        //     let validateEmail = emailValidation.test(userName);
        //     if (!validateEmail) {
        //         this.setState({
        //             errUsername: Strings.please_enter_valid_username,
        //             errPassword: ''
        //         })
        //         return;
        //     }
        // }
        if (password === '' || password === null) {
            this.setState({
                errUsername: '',
                errPassword: Strings.please_enter_password
            })
            return;
        }
        // else if (password != '' && password.length <6) {
        //     // let valid = this.validatePassword(password);
        //         this.setState({
        //             errUsername: '',
        //             errPassword: Strings.please_enter_valid_password
        //         })
        //         return;
        // }
        else {
            this.setState({
                isLoading: true,
                errUsername: '',
                errPassword: '',
                userName: userName,
                password: password,
                calledLogin: true
            }, () => {
                let encPass = cryptoText(password)
                let apiObj = new LoginAction(userName, encPass);
                this.props.APITransport(apiObj);
            })
        }
        
    }


    componentDidUpdate(prevProps) {
        if (prevProps != this.props) {
            const { apiStatus, loginData, navigation } = this.props
            const { userName, password, calledLogin } = this.state
            if (apiStatus && prevProps.apiStatus != apiStatus && apiStatus.error) {
                if(calledLogin) {
                    this.setState({ isLoading: false, calledLogin: false })
                    if(apiStatus && apiStatus.message) {
                        this.setState({
                            errUsername: '',
                            errPassword: '',
                            errCommon: apiStatus.message
                        })
                    } 
                    else {
                        this.setState({
                            errUsername: '',
                            errPassword: '',
                            errCommon: Strings.process_failed_try_again
                        })
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
                                let loginCredObj = {
                                    username: userName,
                                    password: password
                                }
                                let loginCred = await setLoginCred(loginCredObj)
                                let loginSaved = await setLoginData(loginData.data)
                                if(loginCred && loginSaved) {
                                    navigation.navigate('mainMenu')
                                }
                                else {
                                    this.setState({
                                        errUsername: '',
                                        errPassword: '',
                                        errCommon: Strings.process_failed_try_again
                                    })
                                }
                                // let apiObj = new GetStudentListAction(loginData.data.school.school_code);
                                // this.props.APITransport(apiObj);
                        }
                        else if(loginData.status && loginData.status == 422) {
                            this.setState({
                                errUsername: '',
                                errPassword: '',
                                errCommon: Strings.username_or_password_doesnot_match
                            })
                        }
                        else {
                            this.setState({
                                errUsername: '',
                                errPassword: '',
                                errCommon: Strings.process_failed_try_again
                            })
                        }
                    })
                }
            }
        }
    }

    render() {
        const { isLoading, errUsername, errPassword, errCommon } = this.state;
        return (
            <View style={styles.container}>
                <LoginComponent
                    onSubmit={this.onSubmit}
                    errUsername={errUsername}
                    errPassword={errPassword}
                    errCommon={errCommon}
                    {...this.props}
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
        loginData: state.loginData
    }
}

const mapDispatchToProps = (dispatch) => {
    return bindActionCreators({
        APITransport: APITransport
    }, dispatch)
}

export default (connect(mapStateToProps, mapDispatchToProps)(LoginContainer));