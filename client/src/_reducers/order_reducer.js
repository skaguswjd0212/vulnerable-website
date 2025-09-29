import { GET_ORDERS } from '../_actions/types';

export default function(state = {}, action) {
    switch (action.type) {
        case GET_ORDERS:
            return { ...state, list: action.payload.orders }
        default:
            return state;
    }
}