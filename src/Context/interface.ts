interface EmojiStateInterface {
    text: string;
    lastText: string;
    translated: string;
}

export interface EmojiContextInterface {
    state: EmojiStateInterface;
    dispatch: (payload: any) => void;
}
