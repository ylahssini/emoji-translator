<script>
	import Layout from './components/layout.svelte';
	import Translator from './components/translator/translator.svelte';
</script>

<Layout>
	<Translator />
</Layout>

<style>
	:global(body) {
		background: #f0de3e url('./images/bg.webp') no-repeat center center / cover;
	}
</style>
