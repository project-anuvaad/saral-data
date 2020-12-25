import C from '../actions/constants';

export default function (state={}, action) {
    switch(action.type) {
        case C.SAVE_TELEMETRY:
            return action.payload;
        default:
            return state;
    }
}
