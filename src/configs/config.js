import { Platform } from 'react-native'
const configs = {
    BASE_URL: 'https://www.saralgujarat.in/api',
    // BASE_URL: 'https://www.schoolattendancegujarat.org/api',
    // BASE_URL: 'https://attendance-ss.gujarat.gov.in/api',
}

export default configs;

export const apkVersion = "3.0.1"
export const apkVersionId = Platform.OS === "ios" ? "0" : "16"
export const apkURL = Platform.OS == 'ios' ? 'itms-apps://itunes.apple.com/lookup?bundleId=com.hwrecognisation' : 'http://play.google.com/store/apps/details?id=com.hwrecognisation'