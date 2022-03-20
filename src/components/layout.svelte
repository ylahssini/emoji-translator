<main>
    <header>
        <h1>Em😆ji translator</h1>
        <small>Created by <a href="https://ylahssini.vercel.app" target="_blank" rel="noreferrer">Youssef Lahssini</a></small>
    </header>

    <slot></slot>
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
        font-size: 3.5rem;
        font-weight: 400;
        margin: 0;
        line-height: 1;
    }

    small {
        display: block;
        text-align: right;
        font-size: .9rem;
        font-weight: 300;
    }
</style>
