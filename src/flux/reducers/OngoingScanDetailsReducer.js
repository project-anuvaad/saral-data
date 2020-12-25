import C from '../actions/constants';

export default function (state={ response: []}, action) {
    switch(action.type) {
        case C.ONGOING_SCAN_DETAILS:
            return {...state, response: action.payload};
        default:
            return state;
    }
}
