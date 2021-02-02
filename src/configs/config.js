import { Platform } from 'react-native'
const configs = {
    // BASE_URL: 'https://www.schoolattendancegujarat.org/api',
    BASE_URL: 'https://attendance-ss.gujarat.gov.in/api',
}

export default configs;

export const apkVersion =  "2.1.3"
export const apkVersionId = Platform.OS === "ios" ? "0" : "14"
export const apkURL = Platform.OS == 'ios' ? 'itms-apps://itunes.apple.com/lookup?bundleId=com.hwrecognisation' : 'http://play.google.com/store/apps/details?id=com.hwrecognisation'