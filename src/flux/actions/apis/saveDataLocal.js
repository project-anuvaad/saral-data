import C from '../constants';


export const SaveAbsentDataLocal = (data) => {
    return {
        type: C.SAVE_ABSENT_DATA_LOCAL,
        payload: data
    };
};