<script>
    import { translator } from './store';
    import Buttons from './buttons.svelte';

    function handleChange(event) {
        translator.updateText(event.target.value);
    }
</script>

<div class="translator">
    <textarea
        placeholder="Enter your text in english, for example: I want to go to Japan to visit the Tokyo tower"
        on:input={handleChange}
        value={$translator.text}
    />
    <footer>
        <Buttons />
        <output>
            {@html $translator.translated}
        </output>
    </footer>
</div>

<style>
    .translator {
        background-color: rgba(255, 255, 255, 0.95);
        border-radius: 4px;
        height: 70vh;
        width: 60%;
        margin: 0 auto;
    }

    textarea {
        background-color: transparent;
        border: 0;
        border-radius: 4px 4px 0 0;
        height: 45%;
        resize: none;
        outline: 0;
        padding: 1rem;
        width: 100%;
    }

    output {
        padding: 2rem 1rem 1rem;
        display: block;
        height: 55%;
        width: 100%;
    }
</style>