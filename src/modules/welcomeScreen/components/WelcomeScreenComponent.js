import React, {Component} from 'react';
import { View, ScrollView, Text, Image, Dimensions, ImageBackground } from 'react-native';
import ButtonComponent from '../../common/components/ButtonComponent'
import Strings from '../../../utils/Strings';
import AppTheme from '../../../utils/AppTheme';
const { height, width } = Dimensions.get('window')

class WelcomeScreenComponent extends Component {
    constructor(props) {
        super(props);

        this.state = {
           
        }
    }

    onProceedClick = () => {
        this.props.navigation.navigate('login')
    }

    render() {
        return(
            <ScrollView 
                contentContainerStyle={{ flexGrow: 1,}}
                keyboardShouldPersistTaps={'handled'}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >   
                {/* <View style={styles.container}> */}
                    
                    <View style={styles.container1}>
                        <Text style={styles.header2TextStyle}>
                            {Strings.welcome_to + ' '}
                            <Text style={styles.header2TextStyle}>
                                {Strings.saralData_text}
                            </Text>
                        </Text>
                        

                        <Text style={styles.subHeaderTextStyle}>
                            {' - '+Strings.gujarat_text+' - '}
                        </Text>
                    </View>

                    <View style={styles.container2}>
                        <Image
                            style={styles.logoStyle}
                            source={require('../../../assets/images/splash_new.png')}
                            resizeMode='contain'
                        />
                    </View>

                    <ImageBackground 
                        source={require('../../../assets/images/rectangle.png')}
                        style={styles.container3}
                        resizeMode={'cover'}
                    >
                        <Text style={styles.bottomTextStyle}>
                            {Strings.provide_details_to_start_scanning_marksheets}
                        </Text>
                        <ButtonComponent 
                            btnText={Strings.proceed}
                            onPress={this.onProceedClick}
                        />

                    </ImageBackground>  
                {/* </View> */}
                
             </ScrollView>
        );
    }
}

const styles = {
    container: {
        height: '100%'
    },
    container1: {
        // height: '30%',
        flex: 1,
        paddingTop: '20%',
        marginHorizontal: '4%',
        justifyContent: 'center',
        alignItems: 'center',
        // backgroundColor: 'yellow'
    },
    header1TextStyle: {
        textAlign: 'center',
        fontSize: AppTheme.HEADER_FONT_SIZE_REGULAR,
        color: AppTheme.PRIMARY_BLUE
    },
    header2TextStyle: {
        textAlign: 'center',
        fontSize: AppTheme.HEADER_FONT_SIZE_REGULAR_LARGE,
        fontWeight: 'bold',
        color: AppTheme.PRIMARY_BLUE,
    },
    subHeaderTextStyle: {
        paddingTop: '8%',
        textAlign: 'center',
        fontSize: AppTheme.HEADER_FONT_SIZE_REGULAR,
        fontWeight: 'bold',
        color: AppTheme.BLACK
    },
    container2: {
        // height: '40%',
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        // backgroundColor: 'red',
    },
    logoStyle: {
        // marginTop: '10%',
        width: '90%',
        height: 150
    },
    logoTextStyle: {
        paddingTop: '3%',
        textAlign: 'center',
        fontSize: AppTheme.HEADER_FONT_SIZE_LARGE,
        fontWeight: 'bold',
        color: AppTheme.PRIMARY_BLUE
    },
    container3: {
        // height: '30%',
        flex: 2,
        marginTop: '20%',
        paddingHorizontal: '4%',
        paddingTop: '10%',
        paddingBottom: '15%'
    },
    bottomTextStyle: {
        // paddingBottom: '10%',
        paddingHorizontal: '3%',
        textAlign: 'center',
        fontSize: AppTheme.FONT_SIZE_LARGE,
        color: AppTheme.WHITE,
        height: 70,
    }
}

export default WelcomeScreenComponent;