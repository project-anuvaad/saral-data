import React, { Component } from 'react';
import { View, ScrollView, Text, TextInput, ImageBackground, Keyboard } from 'react-native';
import ButtonComponent from '../../common/components/ButtonComponent'
import Strings from '../../../utils/Strings';
import AppTheme from '../../../utils/AppTheme';

class LoginComponent extends Component {
    constructor(props) {
        super(props);

        this.state = {
            userName: '',
            password: ''
        }
    }

    onCancelClick = () => {
        this.props.navigation.navigate('welcomeScreen')
    }

    onLoginDetailsChange = (text, type) => {
        this.setState({ [type]: text })
    }

    onSubmitClick = () => {
        const { userName, password } = this.state
        Keyboard.dismiss()
        this.props.onSubmit(userName.trim().toLowerCase(), password.trim())
    }

    

    render() {
        const { userName, password } = this.state
        const { errUsername, errPassword, errCommon } = this.props
        return (
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
                bounces={false}
                keyboardShouldPersistTaps={'handled'}
            >
                <ImageBackground 
                    style={{ flex: 1, paddingTop: '7%', paddingBottom: '15%'}}
                    source={require('../../../assets/images/rectangle.png')}
                    resizeMode={'cover'}
                >
                <View style={styles.container1}>
                    <Text style={styles.header1TextStyle}>
                        {Strings.login_text.toUpperCase()}
                    </Text>
                    <ButtonComponent
                        btnText={Strings.cancel_text_caps}
                        customBtnStyle={styles.cancelBtnStyle}
                        customBtnTextStyle={styles.cancelBtnTextStyle}
                        onPress={this.onCancelClick}
                    />
                </View>

                <View style={styles.container2}>
                    <View style={{ flexDirection: 'row'}}>
                        {errCommon != '' && <Text style={[styles.labelTextStyle, {color: AppTheme.ERROR_RED, fontSize: AppTheme.FONT_SIZE_TINY+2, width: '100%',  fontWeight: 'normal', textAlign: 'center'}]}>{errCommon}</Text>}
                    </View>
                    <View style={styles.fieldContainerStyle}>
                        <View style={{ flexDirection: 'row'}}>
                            <Text style={[styles.labelTextStyle, {width: errUsername != '' ? '55%' : '100%'}]}>{Strings.enter_username}</Text>
                            {errUsername != '' && <Text style={[styles.labelTextStyle, {color: AppTheme.ERROR_RED, fontSize: AppTheme.FONT_SIZE_TINY+1, width: '45%', textAlign: 'right', fontWeight: 'normal',}]}>{errUsername}</Text>}
                        </View>
                        <TextInput
                            ref="username"
                            style={styles.inputStyle}
                            onChangeText={(text) => this.onLoginDetailsChange(text, 'userName')}
                            value={userName}
                            placeholder={Strings.username_text}
                            placeholderTextColor={AppTheme.BLACK_OPACITY_30}
                            autoCapitalize = {'none'}
                        />
                    </View>
                    <View style={styles.fieldContainerStyle}>
                        <View style={{ flexDirection: 'row'}}>
                            <Text style={[styles.labelTextStyle, {width: errPassword != '' ? '50%': '100%'}]}>{Strings.enter_password}</Text>
                            {errPassword != '' && <Text style={[styles.labelTextStyle, {color: AppTheme.ERROR_RED, fontSize: AppTheme.FONT_SIZE_TINY+1, width: '50%', textAlign: 'right', fontWeight: 'normal'}]}>{errPassword}</Text>}
                        </View>
                        <TextInput
                            ref="password"
                            style={styles.inputStyle}
                            onChangeText={(text) => this.onLoginDetailsChange(text, 'password')}
                            value={password}
                            placeholder={Strings.password_text}
                            placeholderTextColor={AppTheme.BLACK_OPACITY_30}
                            secureTextEntry
                        />
                    </View>
                    
                </View>

                <View style={styles.container3}>
                    <ButtonComponent
                        btnText={Strings.login_text.toUpperCase()}
                        onPress={this.onSubmitClick}
                    />
                </View>
                </ImageBackground>
            </ScrollView>
        );
    }
}

const styles = {
    container1: {
        flex: 1,
        flexDirection: 'row',
        marginHorizontal: '6%',
        justifyContent: 'space-between',
        alignItems: 'center',
        // backgroundColor: 'yellow'
    },
    header1TextStyle: {
        textAlign: 'center',
        fontSize: AppTheme.HEADER_FONT_SIZE_REGULAR,
        color: AppTheme.WHITE,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    cancelBtnStyle: {
        padding: 0,
        backgroundColor: 'transparent',
        height: 'auto'
    },
    cancelBtnTextStyle: {
        textAlign: 'center',
        fontSize: AppTheme.FONT_SIZE_LARGE,
        fontWeight: '600',
        color: AppTheme.WHITE_OPACITY,
        letterSpacing: 1,
    },
    container2: {
        flex: 1,
        marginTop: '15%',
        marginBottom: '8%',
        marginHorizontal: '6%',
        backgroundColor: AppTheme.WHITE,
        borderRadius: 8,
        padding: '4%',
        // paddingBottom: '5%'
    },
    fieldContainerStyle: {
        paddingVertical: '2.5%',
    },
    labelTextStyle: {
        width: '40%',
        fontSize: AppTheme.FONT_SIZE_MEDIUM,
        color: AppTheme.BLACK,
        fontWeight: 'bold',
        letterSpacing: 1,
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
    container3: {
        flex: 2,
        paddingHorizontal: '6%'
    }
}

export default LoginComponent;