<main>
    <header>
        <h1>Em😆ji translator</h1>
        <small>Created by <a href="https://ylahssini.vercel.app" target="_blank" rel="noreferrer">Youssef Lahssini</a></small>
    </header>

    <slot></slot>

    <a href="https://github.com/ylahssini/emoji-translator" target="_blank" rel="noreferrer" class="github">
        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 250 250" fill="#11121c">
            <path d="M0 0l115 115h15l12 27 108 108V0z" fill="#fff"/>
            <path d="M128 109c-15-9-9-19-9-19 3-7 2-11 2-11-1-7 3-2 3-2 4 5 2 11 2 11-3 10 5 15 9 16" />
            <path d="M115 115s4 2 5 0l14-14c3-2 6-3 8-3-8-11-15-24 2-41 5-5 10-7 16-7 1-2 3-7 12-11 0 0 5 3 7 16 4 2 8 5 12 9s7 8 9 12c14 3 17 7 17 7-4 8-9 11-11 11 0 6-2 11-7 16-16 16-30 10-41 2 0 3-1 7-5 11l-12 11c-1 1 1 5 1 5z"/>
        </svg>
    </a>
</main>

<style>
    main {
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
    }

    header {
        text-align: center;
        color: #111;
        padding: 1rem;
        margin: 0 0 2rem;
    }

    h1 {
        font-size: clamp(2rem, 5vw, 50px);
        font-weight: 400;
        margin: 0;
        line-height: 1;
    }

    small {
        display: block;
        text-align: right;
        font-size: clamp(.75rem, 2vw, 12px);
        font-weight: 300;
    }

    @keyframes hello {
        0% { transform: rotateZ(0); }
        25% { transform: rotateZ(10deg); }
        50% { transform: rotateZ(0); }
        75% { transform: rotateZ(-15deg); }
        100% { transform: rotateZ(0); }
    }

    a.github {
        position: fixed;
        top: 0;
        right: 0;
    }

    a.github > svg > path:nth-of-type(2) {
        transform-origin: 130px 106px;
    }

    a.github:hover > svg > path:nth-last-of-type(2) {
        animation: hello .75s linear 0s infinite forwards;
    }
</style>
