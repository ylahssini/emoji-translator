import { writable } from 'svelte/store';

function createTranslator() {
    const state = { text: '', last: '', translated: '', error: null };
    const { subscribe, update, set } = writable(state);

    return {
        subscribe,
        updateText: (payload) => update(s => ({ ...s, text: payload })),
        updateLast: (payload) => update(s => ({ ...s, last: payload })),
        updatedTranslated: (payload) => update(s => ({ ...s, translated: payload })),
        updateError: (payload) => update(s => ({ ...s, error: payload })),
        clear: () => set(state),
    }
};

export const translator = createTranslator();
