<script>
    import { translator } from './store';
    import JSON_EMOJI from './emoji.json';

    function handleClear() {
        translator.clear();
    }

    function handleTranslate() {
        translator.updateError(null);
        const { text, last } = $translator;

        if (text === '') {
            translator.updateError('Please enter your text!');
            return false;
        } else if (text === last) {
            translator.updateError('You haven\'t changed your text!');
            return false;
        }

        let translated = text;
        const collectEmojis = [];

        for (let i = 0; i < JSON_EMOJI.length; i += 1) {
            const emoji = JSON_EMOJI[i];

            for (let j = 0; j < emoji.keywords.length; j += 1) {
                const keyword = emoji.keywords[j];
                const regexReplaceByEmoji = new RegExp(`\\b((\\s)*${keyword}(\\s)*)\\b`, 'gi');
                const regexRemoveSpace = new RegExp(`${emoji.emoji}([a-z]+)`, 'gi');

                if (collectEmojis.find((ce) => ce.keyword === keyword)) {
                    break;
                }
                
                if (regexReplaceByEmoji.test(translated)) {
                    translated = translated
                        .replace(regexReplaceByEmoji, ` ${emoji.emoji}`)
                        .replace(regexRemoveSpace, `${emoji.emoji} $1`);

                    collectEmojis.push({ keyword, emoji: emoji.emoji }); 
                }
            }
        }

        for (let m = 0; m < collectEmojis.length; m += 1) {
            const emoji = collectEmojis[m];
            const regexEmoji = new RegExp(`(${collectEmojis[m].emoji})`);
            const regexBreakLines = new RegExp('\\n', 'g');

            translated = translated
                .replace(regexEmoji, `<span title="${emoji.keyword}">$1</span>`)
                .replace(regexBreakLines, '<br />');
        }

        translator.updateLast(text);
        translator.updatedTranslated(translated);
    }
</script>

<div>
    {#if $translator.error}
        <strong>{$translator.error}</strong>
    {/if}

    <aside>
        <button type="button" on:click="{handleClear}">Clear</button>
        <button type="button" on:click="{handleTranslate}">Translate</button>
    </aside>
</div>

<style>
    div {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        border: 1px dotted #ddd;
        border-width: 1px 0;
        padding: .5rem;
    }

    strong {
        font-weight: 400;
        color: crimson;
        font-size: .9rem;
        padding-right: 1rem;
    }

    aside {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    button {
        transition: all .35s ease-out;
        border-radius: 4px;
        border: 0;
        cursor: pointer;
        margin: 0;
        padding: .5rem 1rem;
    }

    button:first-of-type {
        border-radius: 4px 0 0 4px;
        background-color: #eaeaea;
        color: #333;
    }

    button:first-of-type:hover {
        background-color: #dadada;
        color: #222;
    }

    button:last-of-type {
        border-radius: 0 4px 4px 0;
        background-color: gold;
        color: #222;
    }

    button:last-of-type:hover {
        background-color: goldenrod;
    }
</style>