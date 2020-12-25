import C from '../constants';


export const OngoingScanDetailsAction = (data) => {
    return {
        type: C.ONGOING_SCAN_DETAILS,
        payload: data
    };
};