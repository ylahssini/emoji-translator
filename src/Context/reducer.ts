export const initState = {
    text: '',
    translated: '',
};

export default function (state, action) {
    switch (action.type) {
        case 'CHANGE_TEXT':
            return {
                ...state,
                text: action.payload,
            };

        case 'TRANSLATE_TEXT':
            return {
                ...state,
                translated: action.payload,
            };

        case 'CLEAR_TEXT':
            return {
                ...state,
                text: '',
                translated: '',
            };

        default:
            return state;
    }
};
