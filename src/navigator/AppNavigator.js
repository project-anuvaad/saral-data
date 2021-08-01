import {
    createAppContainer,
    createSwitchNavigator,
} from "react-navigation";

import { createStackNavigator } from 'react-navigation-stack'
import WelcomeScreenContainer from '../modules/welcomeScreen/containers/WelcomeScreenContainer';
import DashboardComponent from '../modules/myScanScreens/components/DashboardComponent'
import MyScanContainer from '../modules/myScanScreens/containers/MyScanContainer';
import ScanDetailsContainer from '../modules/scanDetails/containers/ScanDetailsContainer';
import LoginContainer from '../modules/loginScreens/containers/LoginContainer';
import ScanHistoryContainer from "../modules/myScanScreens/containers/ScanHistoryContainer";
import SelectDetailsContainer from "../modules/myScanScreens/containers/SelectDetailsContainer";
import ScanStatusComponent from "../modules/myScanScreens/components/ScanStatusComponent";
import AbsentUi from "../modules/AbsentUi/AbsentUi";

const welcomeScreensStack = createStackNavigator(
    {
        welcomeScreen: {
            screen: WelcomeScreenContainer
        },
        login: {
            screen: LoginContainer
        }
    },
    {
        initialRouteName: "welcomeScreen",
        headerMode: "none"
    }
)

const MainStack = createStackNavigator(
    {
        dashboard: {
            screen: DashboardComponent
        },
        selectDetails: {
            screen: SelectDetailsContainer
        },
        scanHistory: {
            screen: ScanHistoryContainer
        },
        scanStatus: {
            screen: ScanStatusComponent
        },
        myScan: {
            screen: MyScanContainer
        },
        scanDetails: {
            screen: ScanDetailsContainer
        },
        AbsentUi: {
            screen: AbsentUi
        },
    },
    {
        initialRouteName: 'dashboard',
        headerMode: 'none'
    }
)

const AppNavigation = createSwitchNavigator(
    {
        welcome: welcomeScreensStack,
        mainMenu: MainStack,
    },
    {
        initialRouteName: 'welcome',
    }
);

export default (AppContainer = createAppContainer(AppNavigation));
