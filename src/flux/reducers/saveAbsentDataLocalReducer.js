import C from '../actions/constants';

export default function (state={ response: []}, action) {
    console.log("reducer",action);
    switch(action.type) {
        case C.SAVE_ABSENT_DATA_LOCAL:
            return {...state, response: action.payload};
        default:
            return state;
    }
}
