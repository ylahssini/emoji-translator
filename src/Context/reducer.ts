export const initState = {
    text: '',
};

export default function (state, action) {
    switch (action.type) {
        case 'CHANGE_TEXT':
            return {
                ...state,
                text: action.payload,
            };

        case 'CLEAR_TEXT':
            return {
                ...state,
                text: '',
            };

        default:
            return state;
    }
};
