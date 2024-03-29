import C from '../actions/constants';

export default function (state={ response: []}, action) {
    switch(action.type) {
        case C.APP_UPDATE_CHECK:
            return {...state, response: action.payload};
        default:
            return state;
    }
}
