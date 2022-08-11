
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
this["emoji-translator"] = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.49.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/components/layout.svelte generated by Svelte v3.49.0 */

    const file$2 = "src/components/layout.svelte";

    function create_fragment$3(ctx) {
    	let main;
    	let header;
    	let h1;
    	let t1;
    	let small;
    	let t2;
    	let a0;
    	let t4;
    	let t5;
    	let a1;
    	let svg;
    	let path0;
    	let path1;
    	let path2;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	const block = {
    		c: function create() {
    			main = element("main");
    			header = element("header");
    			h1 = element("h1");
    			h1.textContent = "Em😆ji translator";
    			t1 = space();
    			small = element("small");
    			t2 = text("Created by ");
    			a0 = element("a");
    			a0.textContent = "Youssef Lahssini";
    			t4 = space();
    			if (default_slot) default_slot.c();
    			t5 = space();
    			a1 = element("a");
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			attr_dev(h1, "class", "svelte-10wyglv");
    			add_location(h1, file$2, 2, 8, 28);
    			attr_dev(a0, "href", "https://ylahssini.vercel.app");
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "rel", "noreferrer");
    			add_location(a0, file$2, 3, 26, 81);
    			attr_dev(small, "class", "svelte-10wyglv");
    			add_location(small, file$2, 3, 8, 63);
    			attr_dev(header, "class", "svelte-10wyglv");
    			add_location(header, file$2, 1, 4, 11);
    			attr_dev(path0, "d", "M0 0l115 115h15l12 27 108 108V0z");
    			attr_dev(path0, "fill", "#fff");
    			attr_dev(path0, "class", "svelte-10wyglv");
    			add_location(path0, file$2, 10, 12, 446);
    			attr_dev(path1, "d", "M128 109c-15-9-9-19-9-19 3-7 2-11 2-11-1-7 3-2 3-2 4 5 2 11 2 11-3 10 5 15 9 16");
    			attr_dev(path1, "class", "svelte-10wyglv");
    			add_location(path1, file$2, 11, 12, 515);
    			attr_dev(path2, "d", "M115 115s4 2 5 0l14-14c3-2 6-3 8-3-8-11-15-24 2-41 5-5 10-7 16-7 1-2 3-7 12-11 0 0 5 3 7 16 4 2 8 5 12 9s7 8 9 12c14 3 17 7 17 7-4 8-9 11-11 11 0 6-2 11-7 16-16 16-30 10-41 2 0 3-1 7-5 11l-12 11c-1 1 1 5 1 5z");
    			attr_dev(path2, "class", "svelte-10wyglv");
    			add_location(path2, file$2, 12, 12, 620);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "width", "80");
    			attr_dev(svg, "height", "80");
    			attr_dev(svg, "viewBox", "0 0 250 250");
    			attr_dev(svg, "fill", "#11121c");
    			attr_dev(svg, "class", "svelte-10wyglv");
    			add_location(svg, file$2, 9, 8, 333);
    			attr_dev(a1, "href", "https://github.com/ylahssini/emoji-translator");
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "rel", "noreferrer");
    			attr_dev(a1, "class", "github svelte-10wyglv");
    			add_location(a1, file$2, 8, 4, 220);
    			attr_dev(main, "class", "svelte-10wyglv");
    			add_location(main, file$2, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, header);
    			append_dev(header, h1);
    			append_dev(header, t1);
    			append_dev(header, small);
    			append_dev(small, t2);
    			append_dev(small, a0);
    			append_dev(main, t4);

    			if (default_slot) {
    				default_slot.m(main, null);
    			}

    			append_dev(main, t5);
    			append_dev(main, a1);
    			append_dev(a1, svg);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    			append_dev(svg, path2);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[0],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Layout', slots, ['default']);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Layout> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Layout extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Layout",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

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
    }
    const translator = createTranslator();

    var JSON_EMOJI = [
    	{
    		unicode: "1F600",
    		emoji: "😀",
    		description: "grinning face",
    		keywords: [
    			"haha",
    			"laugh",
    			"laughed"
    		]
    	},
    	{
    		unicode: "1F603",
    		emoji: "😃",
    		description: "grinning face with big eyes",
    		keywords: [
    			"haha",
    			"laugh",
    			"laughed"
    		]
    	},
    	{
    		unicode: "1F604",
    		emoji: "😄",
    		description: "grinning face with smiling eyes",
    		keywords: [
    			"haha",
    			"laugh",
    			"laughed"
    		]
    	},
    	{
    		unicode: "1F601",
    		emoji: "😁",
    		description: "beaming face with smiling eyes",
    		keywords: [
    			"kidding",
    			"hihihi"
    		]
    	},
    	{
    		unicode: "1F606",
    		emoji: "😆",
    		description: "grinning squinting face",
    		keywords: [
    			"funny",
    			"hilarious"
    		]
    	},
    	{
    		unicode: "1F605",
    		emoji: "😅",
    		description: "grinning face with sweat",
    		keywords: [
    			"hhha"
    		]
    	},
    	{
    		unicode: "1F923",
    		emoji: "🤣",
    		description: "rolling on the floor laughing",
    		keywords: [
    			"hhhhhh",
    			"hilarious"
    		]
    	},
    	{
    		unicode: "1F602",
    		emoji: "😂",
    		description: "face with tears of joy",
    		keywords: [
    			"hhh"
    		]
    	},
    	{
    		unicode: "1F642",
    		emoji: "🙂",
    		description: "slightly smiling face",
    		keywords: [
    			"smile",
    			"smiling"
    		]
    	},
    	{
    		unicode: "1F643",
    		emoji: "🙃",
    		description: "upside-down face",
    		keywords: [
    			"sarcasm"
    		]
    	},
    	{
    		unicode: "1F609",
    		emoji: "😉",
    		description: "winking face",
    		keywords: [
    			"wink",
    			"winking"
    		]
    	},
    	{
    		unicode: "1F60A",
    		emoji: "😊",
    		description: "smiling face with smiling eyes",
    		keywords: [
    			"happy",
    			"in good spirits"
    		]
    	},
    	{
    		unicode: "1F607",
    		emoji: "😇",
    		description: "smiling face with halo",
    		keywords: [
    			"saint"
    		]
    	},
    	{
    		unicode: "1F970",
    		emoji: "🥰",
    		description: "smiling face with hearts",
    		keywords: [
    			"love",
    			"in love",
    			"lovely"
    		]
    	},
    	{
    		unicode: "1F60D",
    		emoji: "😍",
    		description: "smiling face with heart-eyes",
    		keywords: [
    			"attractive",
    			"seductive",
    			"charming",
    			"lovely",
    			"beautiful"
    		]
    	},
    	{
    		unicode: "1F929",
    		emoji: "🤩",
    		description: "star-struck",
    		keywords: [
    			"happy",
    			"wow",
    			"amazing",
    			"magnificent"
    		]
    	},
    	{
    		unicode: "1F618",
    		emoji: "😘",
    		description: "face blowing a kiss",
    		keywords: [
    			"want to kiss you",
    			"kissing",
    			"kiss"
    		]
    	},
    	{
    		unicode: "1F617",
    		emoji: "😗",
    		description: "kissing face",
    		keywords: [
    			"want to kiss you",
    			"kissing",
    			"kiss"
    		]
    	},
    	{
    		unicode: "1F61A",
    		emoji: "😚",
    		description: "kissing face with closed eyes",
    		keywords: [
    			"kissing",
    			"kiss"
    		]
    	},
    	{
    		unicode: "1F619",
    		emoji: "😙",
    		description: "kissing face with smiling eyes",
    		keywords: [
    			"want to kiss you",
    			"kissing",
    			"kiss"
    		]
    	},
    	{
    		unicode: "1F60B",
    		emoji: "😋",
    		description: "face savoring food",
    		keywords: [
    			"yam yam",
    			"good taste",
    			"fruity",
    			"savoring"
    		]
    	},
    	{
    		unicode: "1F61B",
    		emoji: "😛",
    		description: "face with tongue",
    		keywords: [
    			"sorry"
    		]
    	},
    	{
    		unicode: "1F61C",
    		emoji: "😜",
    		description: "winking face with tongue",
    		keywords: [
    			"sorry"
    		]
    	},
    	{
    		unicode: "1F92A",
    		emoji: "🤪",
    		description: "zany face",
    		keywords: [
    			"crazy",
    			"crazed",
    			"insane"
    		]
    	},
    	{
    		unicode: "1F61D",
    		emoji: "😝",
    		description: "squinting face with tongue",
    		keywords: [
    			"squinting"
    		]
    	},
    	{
    		unicode: "1F911",
    		emoji: "🤑",
    		description: "money-mouth face",
    		keywords: [
    			"love money",
    			"show me the money",
    			"want money",
    			"give me money"
    		]
    	},
    	{
    		unicode: "1F917",
    		emoji: "🤗",
    		description: "hugging face",
    		keywords: [
    			"hug",
    			"hugging",
    			"embrace",
    			"embracing"
    		]
    	},
    	{
    		unicode: "1F92D",
    		emoji: "🤭",
    		description: "face with hand over mouth",
    		keywords: [
    			"hihi"
    		]
    	},
    	{
    		unicode: "1F92B",
    		emoji: "🤫",
    		description: "shushing face",
    		keywords: [
    			"shushing",
    			"shush",
    			"shuu"
    		]
    	},
    	{
    		unicode: "1F914",
    		emoji: "🤔",
    		description: "thinking face",
    		keywords: [
    			"mmmm",
    			"think",
    			"thinking"
    		]
    	},
    	{
    		unicode: "1F910",
    		emoji: "🤐",
    		description: "zipper-mouth face",
    		keywords: [
    			"quite",
    			"zip",
    			"no comment"
    		]
    	},
    	{
    		unicode: "1F928",
    		emoji: "🤨",
    		description: "face with raised eyebrow",
    		keywords: [
    			"what?",
    			"dont't understand",
    			"dont't understood"
    		]
    	},
    	{
    		unicode: "1F610",
    		emoji: "😐",
    		description: "neutral face",
    		keywords: [
    			"neutral",
    			"no comment"
    		]
    	},
    	{
    		unicode: "1F611",
    		emoji: "😑",
    		description: "expressionless face",
    		keywords: [
    			"expressionless"
    		]
    	},
    	{
    		unicode: "1F636",
    		emoji: "😶",
    		description: "face without mouth",
    		keywords: [
    			"silent",
    			"no comments"
    		]
    	},
    	{
    		unicode: "1F60F",
    		emoji: "😏",
    		description: "smirking face",
    		keywords: [
    			"hhmm",
    			"smirk",
    			"smirking"
    		]
    	},
    	{
    		unicode: "1F612",
    		emoji: "😒",
    		description: "unamused face",
    		keywords: [
    			"boring",
    			"bored",
    			"unamused"
    		]
    	},
    	{
    		unicode: "1F644",
    		emoji: "🙄",
    		description: "face with rolling eyes",
    		keywords: [
    			"not concerned"
    		]
    	},
    	{
    		unicode: "1F62C",
    		emoji: "😬",
    		description: "grimacing face",
    		keywords: [
    			"confused"
    		]
    	},
    	{
    		unicode: "1F925",
    		emoji: "🤥",
    		description: "lying face",
    		keywords: [
    			"lie",
    			"lying"
    		]
    	},
    	{
    		unicode: "1F60C",
    		emoji: "😌",
    		description: "relieved face",
    		keywords: [
    			"relieved",
    			"thankful",
    			"pleased"
    		]
    	},
    	{
    		unicode: "1F614",
    		emoji: "😔",
    		description: "pensive face",
    		keywords: [
    			"pensive",
    			"worried",
    			"worry"
    		]
    	},
    	{
    		unicode: "1F62A",
    		emoji: "😪",
    		description: "sleepy face",
    		keywords: [
    			"sleep",
    			"sleepy"
    		]
    	},
    	{
    		unicode: "1F924",
    		emoji: "🤤",
    		description: "drooling face",
    		keywords: [
    			"drooling",
    			"drool",
    			"salivate"
    		]
    	},
    	{
    		unicode: "1F634",
    		emoji: "😴",
    		description: "sleeping face",
    		keywords: [
    			"sleeping"
    		]
    	},
    	{
    		unicode: "1F637",
    		emoji: "😷",
    		description: "face with medical mask",
    		keywords: [
    			"sick"
    		]
    	},
    	{
    		unicode: "1F912",
    		emoji: "🤒",
    		description: "face with thermometer",
    		keywords: [
    			"using thermometer",
    			"sick"
    		]
    	},
    	{
    		unicode: "1F915",
    		emoji: "🤕",
    		description: "face with head-bandage",
    		keywords: [
    			"head-bandage"
    		]
    	},
    	{
    		unicode: "1F922",
    		emoji: "🤢",
    		description: "nauseated face",
    		keywords: [
    			"nauseated",
    			"sickening",
    			"nauseous"
    		]
    	},
    	{
    		unicode: "1F92E",
    		emoji: "🤮",
    		description: "face vomiting",
    		keywords: [
    			"vomiting",
    			"vomit",
    			"throw up"
    		]
    	},
    	{
    		unicode: "1F927",
    		emoji: "🤧",
    		description: "sneezing face",
    		keywords: [
    			"sneezing",
    			"sneez"
    		]
    	},
    	{
    		unicode: "1F975",
    		emoji: "🥵",
    		description: "hot face",
    		keywords: [
    			"hot",
    			"very warm",
    			"blazing hot",
    			"boiling"
    		]
    	},
    	{
    		unicode: "1F976",
    		emoji: "🥶",
    		description: "cold face",
    		keywords: [
    			"cold",
    			"freeze",
    			"freezing",
    			"frozen"
    		]
    	},
    	{
    		unicode: "1F974",
    		emoji: "🥴",
    		description: "woozy face",
    		keywords: [
    			"woozy",
    			"confused",
    			"idiot",
    			"not with it"
    		]
    	},
    	{
    		unicode: "1F635",
    		emoji: "😵",
    		description: "dizzy face",
    		keywords: [
    			"dizzy",
    			"shaky",
    			"disoriented",
    			"befuddled"
    		]
    	},
    	{
    		unicode: "1F92F",
    		emoji: "🤯",
    		description: "exploding head",
    		keywords: [
    			"exploding",
    			"blow up",
    			"blowing up",
    			"go off",
    			"going off",
    			"fly apart"
    		]
    	},
    	{
    		unicode: "1F920",
    		emoji: "🤠",
    		description: "cowboy hat face",
    		keywords: [
    			"cowboy",
    			"sherif"
    		]
    	},
    	{
    		unicode: "1F973",
    		emoji: "🥳",
    		description: "partying face",
    		keywords: [
    			"partying",
    			"in party",
    			"enjoy",
    			"enjoying"
    		]
    	},
    	{
    		unicode: "1F60E",
    		emoji: "😎",
    		description: "smiling face with sunglasses",
    		keywords: [
    			"smiling face with sunglasses"
    		]
    	},
    	{
    		unicode: "1F913",
    		emoji: "🤓",
    		description: "nerd face",
    		keywords: [
    			"nerd",
    			"geek"
    		]
    	},
    	{
    		unicode: "1F9D0",
    		emoji: "🧐",
    		description: "face with monocle",
    		keywords: [
    			"face with monocle",
    			"ah! i see"
    		]
    	},
    	{
    		unicode: "1F615",
    		emoji: "😕",
    		description: "confused face",
    		keywords: [
    			"confused"
    		]
    	},
    	{
    		unicode: "1F61F",
    		emoji: "😟",
    		description: "worried face",
    		keywords: [
    			"worried",
    			"sad"
    		]
    	},
    	{
    		unicode: "1F641",
    		emoji: "🙁",
    		description: "slightly frowning face",
    		keywords: [
    			"worried",
    			"sad"
    		]
    	},
    	{
    		unicode: "1F62E",
    		emoji: "😮",
    		description: "face with open mouth",
    		keywords: [
    			"oh",
    			"aw"
    		]
    	},
    	{
    		unicode: "1F62F",
    		emoji: "😯",
    		description: "hushed face",
    		keywords: [
    			"oooh",
    			"hushed"
    		]
    	},
    	{
    		unicode: "1F632",
    		emoji: "😲",
    		description: "astonished face",
    		keywords: [
    			"astonished",
    			"oh!"
    		]
    	},
    	{
    		unicode: "1F633",
    		emoji: "😳",
    		description: "flushed face",
    		keywords: [
    			"frenzied"
    		]
    	},
    	{
    		unicode: "1F97A",
    		emoji: "🥺",
    		description: "pleading face",
    		keywords: [
    			"pleading",
    			"plead"
    		]
    	},
    	{
    		unicode: "1F626",
    		emoji: "😦",
    		description: "frowning face with open mouth",
    		keywords: [
    			"aahh"
    		]
    	},
    	{
    		unicode: "1F627",
    		emoji: "😧",
    		description: "anguished face",
    		keywords: [
    			"anguished",
    			"anguish"
    		]
    	},
    	{
    		unicode: "1F628",
    		emoji: "😨",
    		description: "fearful face",
    		keywords: [
    			"fearful",
    			"fear"
    		]
    	},
    	{
    		unicode: "1F630",
    		emoji: "😰",
    		description: "anxious face with sweat",
    		keywords: [
    			"anxious",
    			"unquiet"
    		]
    	},
    	{
    		unicode: "1F625",
    		emoji: "😥",
    		description: "sad but relieved face",
    		keywords: [
    			"sad"
    		]
    	},
    	{
    		unicode: "1F622",
    		emoji: "😢",
    		description: "crying face",
    		keywords: [
    			"cry",
    			"crying"
    		]
    	},
    	{
    		unicode: "1F62D",
    		emoji: "😭",
    		description: "loudly crying face",
    		keywords: [
    			"crying a lot",
    			"loudly crying"
    		]
    	},
    	{
    		unicode: "1F631",
    		emoji: "😱",
    		description: "face screaming in fear",
    		keywords: [
    			"screaming"
    		]
    	},
    	{
    		unicode: "1F616",
    		emoji: "😖",
    		description: "confounded face",
    		keywords: [
    			"confounded",
    			"discredit "
    		]
    	},
    	{
    		unicode: "1F623",
    		emoji: "😣",
    		description: "persevering face",
    		keywords: [
    			"persevering"
    		]
    	},
    	{
    		unicode: "1F61E",
    		emoji: "😞",
    		description: "disappointed face",
    		keywords: [
    			"disappointed",
    			"upset",
    			"let down"
    		]
    	},
    	{
    		unicode: "1F613",
    		emoji: "😓",
    		description: "downcast face with sweat",
    		keywords: [
    			"disappointed"
    		]
    	},
    	{
    		unicode: "1F629",
    		emoji: "😩",
    		description: "weary face",
    		keywords: [
    			"weary"
    		]
    	},
    	{
    		unicode: "1F62B",
    		emoji: "😫",
    		description: "tired face",
    		keywords: [
    			"tired"
    		]
    	},
    	{
    		unicode: "1F971",
    		emoji: "🥱",
    		description: "yawning face",
    		keywords: [
    			"yawning"
    		]
    	},
    	{
    		unicode: "1F624",
    		emoji: "😤",
    		description: "face with steam from nose",
    		keywords: [
    			"angry",
    			"ooof"
    		]
    	},
    	{
    		unicode: "1F621",
    		emoji: "😡",
    		description: "pouting face",
    		keywords: [
    			"very angry"
    		]
    	},
    	{
    		unicode: "1F620",
    		emoji: "😠",
    		description: "angry face",
    		keywords: [
    			"angry"
    		]
    	},
    	{
    		unicode: "1F92C",
    		emoji: "🤬",
    		description: "face with symbols on mouth",
    		keywords: [
    			"fuck you"
    		]
    	},
    	{
    		unicode: "1F608",
    		emoji: "😈",
    		description: "smiling face with horns",
    		keywords: [
    			"evil",
    			"horns"
    		]
    	},
    	{
    		unicode: "1F47F",
    		emoji: "👿",
    		description: "angry face with horns",
    		keywords: [
    			"revenge"
    		]
    	},
    	{
    		unicode: "1F480",
    		emoji: "💀",
    		description: "skull",
    		keywords: [
    			"death",
    			"dead",
    			"skull"
    		]
    	},
    	{
    		unicode: "1F4A9",
    		emoji: "💩",
    		description: "pile of poo",
    		keywords: [
    			"pile of poo"
    		]
    	},
    	{
    		unicode: "1F921",
    		emoji: "🤡",
    		description: "clown face",
    		keywords: [
    			"clown"
    		]
    	},
    	{
    		unicode: "1F479",
    		emoji: "👹",
    		description: "ogre",
    		keywords: [
    			"orge",
    			"monster"
    		]
    	},
    	{
    		unicode: "1F47A",
    		emoji: "👺",
    		description: "goblin",
    		keywords: [
    			"goblin"
    		]
    	},
    	{
    		unicode: "1F47B",
    		emoji: "👻",
    		description: "ghost",
    		keywords: [
    			"ghost"
    		]
    	},
    	{
    		unicode: "1F47D",
    		emoji: "👽",
    		description: "alien",
    		keywords: [
    			"alien"
    		]
    	},
    	{
    		unicode: "1F47E",
    		emoji: "👾",
    		description: "alien monster",
    		keywords: [
    			"alien"
    		]
    	},
    	{
    		unicode: "1F916",
    		emoji: "🤖",
    		description: "robot",
    		keywords: [
    			"robot"
    		]
    	},
    	{
    		unicode: "1F63A",
    		emoji: "😺",
    		description: "grinning cat",
    		keywords: [
    			"cat"
    		]
    	},
    	{
    		unicode: "1F638",
    		emoji: "😸",
    		description: "grinning cat with smiling eyes",
    		keywords: [
    			"smiling cat"
    		]
    	},
    	{
    		unicode: "1F639",
    		emoji: "😹",
    		description: "cat with tears of joy",
    		keywords: [
    			"cat with tears of joy"
    		]
    	},
    	{
    		unicode: "1F63B",
    		emoji: "😻",
    		description: "smiling cat with heart-eyes",
    		keywords: [
    			"smiling cat with heart-eyes"
    		]
    	},
    	{
    		unicode: "1F63C",
    		emoji: "😼",
    		description: "cat with wry smile",
    		keywords: [
    			"cat with wry smile"
    		]
    	},
    	{
    		unicode: "1F63D",
    		emoji: "😽",
    		description: "kissing cat",
    		keywords: [
    			"kissing cat"
    		]
    	},
    	{
    		unicode: "1F640",
    		emoji: "🙀",
    		description: "weary cat",
    		keywords: [
    			"weary cat"
    		]
    	},
    	{
    		unicode: "1F63F",
    		emoji: "😿",
    		description: "crying cat",
    		keywords: [
    			"crying cat"
    		]
    	},
    	{
    		unicode: "1F63E",
    		emoji: "😾",
    		description: "pouting cat",
    		keywords: [
    			"pouting cat"
    		]
    	},
    	{
    		unicode: "1F648",
    		emoji: "🙈",
    		description: "see-no-evil monkey",
    		keywords: [
    			"see-no-evil"
    		]
    	},
    	{
    		unicode: "1F649",
    		emoji: "🙉",
    		description: "hear-no-evil monkey",
    		keywords: [
    			"hear-no-evil"
    		]
    	},
    	{
    		unicode: "1F64A",
    		emoji: "🙊",
    		description: "speak-no-evil monkey",
    		keywords: [
    			"speak-no-evil"
    		]
    	},
    	{
    		unicode: "1F48B",
    		emoji: "💋",
    		description: "kiss mark",
    		keywords: [
    			"kiss"
    		]
    	},
    	{
    		unicode: "1F48C",
    		emoji: "💌",
    		description: "love letter",
    		keywords: [
    			"love letter"
    		]
    	},
    	{
    		unicode: "1F498",
    		emoji: "💘",
    		description: "heart with arrow",
    		keywords: [
    			"heart with arrow"
    		]
    	},
    	{
    		unicode: "1F49D",
    		emoji: "💝",
    		description: "heart with ribbon",
    		keywords: [
    			"heart with ribbon"
    		]
    	},
    	{
    		unicode: "1F496",
    		emoji: "💖",
    		description: "sparkling heart",
    		keywords: [
    			"sparkling heart"
    		]
    	},
    	{
    		unicode: "1F497",
    		emoji: "💗",
    		description: "growing heart",
    		keywords: [
    			"growing heart"
    		]
    	},
    	{
    		unicode: "1F493",
    		emoji: "💓",
    		description: "beating heart",
    		keywords: [
    			"beating heart"
    		]
    	},
    	{
    		unicode: "1F49E",
    		emoji: "💞",
    		description: "revolving hearts",
    		keywords: [
    			"revolving hearts"
    		]
    	},
    	{
    		unicode: "1F495",
    		emoji: "💕",
    		description: "two hearts",
    		keywords: [
    			"two hearts"
    		]
    	},
    	{
    		unicode: "1F49F",
    		emoji: "💟",
    		description: "heart decoration",
    		keywords: [
    			"heart decoration"
    		]
    	},
    	{
    		unicode: "1F494",
    		emoji: "💔",
    		description: "broken heart",
    		keywords: [
    			"broken heart"
    		]
    	},
    	{
    		unicode: "1F9E1",
    		emoji: "🧡",
    		description: "orange heart",
    		keywords: [
    			"orange heart"
    		]
    	},
    	{
    		unicode: "1F49B",
    		emoji: "💛",
    		description: "yellow heart",
    		keywords: [
    			"yellow heart"
    		]
    	},
    	{
    		unicode: "1F49A",
    		emoji: "💚",
    		description: "green heart",
    		keywords: [
    			"green heart"
    		]
    	},
    	{
    		unicode: "1F499",
    		emoji: "💙",
    		description: "blue heart",
    		keywords: [
    			"blue heart"
    		]
    	},
    	{
    		unicode: "1F49C",
    		emoji: "💜",
    		description: "purple heart",
    		keywords: [
    			"purple heart"
    		]
    	},
    	{
    		unicode: "1F90E",
    		emoji: "🤎",
    		description: "brown heart",
    		keywords: [
    			"brown heart"
    		]
    	},
    	{
    		unicode: "1F5A4",
    		emoji: "🖤",
    		description: "black heart",
    		keywords: [
    			"black heart"
    		]
    	},
    	{
    		unicode: "1F90D",
    		emoji: "🤍",
    		description: "white heart",
    		keywords: [
    			"white heart"
    		]
    	},
    	{
    		unicode: "1F4AF",
    		emoji: "💯",
    		description: "hundred points",
    		keywords: [
    			"100 points"
    		]
    	},
    	{
    		unicode: "1F4A2",
    		emoji: "💢",
    		description: "anger symbol",
    		keywords: [
    			"nani!"
    		]
    	},
    	{
    		unicode: "1F4A5",
    		emoji: "💥",
    		description: "collision",
    		keywords: [
    			"explosion"
    		]
    	},
    	{
    		unicode: "1F4AB",
    		emoji: "💫",
    		description: "dizzy",
    		keywords: [
    			"dizzy"
    		]
    	},
    	{
    		unicode: "1F4A6",
    		emoji: "💦",
    		description: "sweat droplets",
    		keywords: [
    			"sweat droplets"
    		]
    	},
    	{
    		unicode: "1F4A8",
    		emoji: "💨",
    		description: "dashing away",
    		keywords: [
    			"dashing away"
    		]
    	},
    	{
    		unicode: "1F573",
    		emoji: "🕳",
    		description: "hole",
    		keywords: [
    			"hole"
    		]
    	},
    	{
    		unicode: "1F4A3",
    		emoji: "💣",
    		description: "bomb",
    		keywords: [
    			"bomb"
    		]
    	},
    	{
    		unicode: "1F4AC",
    		emoji: "💬",
    		description: "speech balloon",
    		keywords: [
    			"speech balloon"
    		]
    	},
    	{
    		unicode: "1F5E8",
    		emoji: "🗨",
    		description: "left speech bubble",
    		keywords: [
    			"left speech bubble"
    		]
    	},
    	{
    		unicode: "1F4A4",
    		emoji: "💤",
    		description: "zzz",
    		keywords: [
    			"zzz"
    		]
    	},
    	{
    		unicode: "1F44B",
    		emoji: "👋",
    		description: "waving hand",
    		keywords: [
    			"hi",
    			"hello",
    			"salutations"
    		],
    		color: "yellow"
    	},
    	{
    		unicode: "1F44B 1F3FB",
    		emoji: "👋🏻",
    		description: "waving hand: light skin tone",
    		keywords: [
    			"hi",
    			"hello",
    			"salutations"
    		],
    		color: "light"
    	},
    	{
    		unicode: "1F44B 1F3FC",
    		emoji: "👋🏼",
    		description: "waving hand: medium-light skin tone",
    		keywords: [
    			"hi",
    			"hello",
    			"salutations"
    		],
    		color: "medium-light"
    	},
    	{
    		unicode: "1F44B 1F3FD",
    		emoji: "👋🏽",
    		description: "waving hand: medium skin tone",
    		keywords: [
    			"hi",
    			"hello",
    			"salutations"
    		],
    		color: "medium"
    	},
    	{
    		unicode: "1F44B 1F3FE",
    		emoji: "👋🏾",
    		description: "waving hand: medium-dark skin tone",
    		keywords: [
    			"hi",
    			"hello",
    			"salutations"
    		],
    		color: "medium-dark"
    	},
    	{
    		unicode: "1F44B 1F3FF",
    		emoji: "👋🏿",
    		description: "waving hand: dark skin tone",
    		keywords: [
    			"hi",
    			"hello",
    			"salutations"
    		],
    		color: "dark"
    	},
    	{
    		unicode: "1F91A",
    		emoji: "🤚",
    		description: "raised back of hand",
    		keywords: [
    			"hand"
    		]
    	},
    	{
    		unicode: "1F91A 1F3FB",
    		emoji: "🤚🏻",
    		description: "raised back of hand: light skin tone",
    		keywords: [
    			"hand"
    		]
    	},
    	{
    		unicode: "1F91A 1F3FC",
    		emoji: "🤚🏼",
    		description: "raised back of hand: medium-light skin tone",
    		keywords: [
    			"hand"
    		]
    	},
    	{
    		unicode: "1F91A 1F3FD",
    		emoji: "🤚🏽",
    		description: "raised back of hand: medium skin tone",
    		keywords: [
    			"hand"
    		]
    	},
    	{
    		unicode: "1F91A 1F3FE",
    		emoji: "🤚🏾",
    		description: "raised back of hand: medium-dark skin tone",
    		keywords: [
    			"hand"
    		]
    	},
    	{
    		unicode: "1F91A 1F3FF",
    		emoji: "🤚🏿",
    		description: "raised back of hand: dark skin tone",
    		keywords: [
    			"hand"
    		]
    	},
    	{
    		unicode: "1F590",
    		emoji: "🖐",
    		description: "hand with fingers splayed",
    		keywords: [
    			"hand"
    		]
    	},
    	{
    		unicode: "1F590 1F3FB",
    		emoji: "🖐🏻",
    		description: "hand with fingers splayed: light skin tone",
    		keywords: [
    			"hand"
    		]
    	},
    	{
    		unicode: "1F590 1F3FC",
    		emoji: "🖐🏼",
    		description: "hand with fingers splayed: medium-light skin tone",
    		keywords: [
    			"hand"
    		]
    	},
    	{
    		unicode: "1F590 1F3FD",
    		emoji: "🖐🏽",
    		description: "hand with fingers splayed: medium skin tone",
    		keywords: [
    			"hand"
    		]
    	},
    	{
    		unicode: "1F590 1F3FE",
    		emoji: "🖐🏾",
    		description: "hand with fingers splayed: medium-dark skin tone",
    		keywords: [
    			"hand"
    		]
    	},
    	{
    		unicode: "1F590 1F3FF",
    		emoji: "🖐🏿",
    		description: "hand with fingers splayed: dark skin tone",
    		keywords: [
    			"hand"
    		]
    	},
    	{
    		unicode: "270B",
    		emoji: "✋",
    		description: "raised hand",
    		keywords: [
    			"hand"
    		]
    	},
    	{
    		unicode: "270B 1F3FB",
    		emoji: "✋🏻",
    		description: "raised hand: light skin tone",
    		keywords: [
    			"hand"
    		]
    	},
    	{
    		unicode: "270B 1F3FC",
    		emoji: "✋🏼",
    		description: "raised hand: medium-light skin tone",
    		keywords: [
    			"hand"
    		]
    	},
    	{
    		unicode: "270B 1F3FD",
    		emoji: "✋🏽",
    		description: "raised hand: medium skin tone",
    		keywords: [
    			"hand"
    		]
    	},
    	{
    		unicode: "270B 1F3FE",
    		emoji: "✋🏾",
    		description: "raised hand: medium-dark skin tone",
    		keywords: [
    			"hand"
    		]
    	},
    	{
    		unicode: "270B 1F3FF",
    		emoji: "✋🏿",
    		description: "raised hand: dark skin tone",
    		keywords: [
    			"hand"
    		]
    	},
    	{
    		unicode: "1F596",
    		emoji: "🖖",
    		description: "vulcan salute",
    		keywords: [
    			"vulcan salute"
    		]
    	},
    	{
    		unicode: "1F596 1F3FB",
    		emoji: "🖖🏻",
    		description: "vulcan salute: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F596 1F3FC",
    		emoji: "🖖🏼",
    		description: "vulcan salute: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F596 1F3FD",
    		emoji: "🖖🏽",
    		description: "vulcan salute: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F596 1F3FE",
    		emoji: "🖖🏾",
    		description: "vulcan salute: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F596 1F3FF",
    		emoji: "🖖🏿",
    		description: "vulcan salute: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F44C",
    		emoji: "👌",
    		description: "OK hand",
    		keywords: [
    			"ok"
    		]
    	},
    	{
    		unicode: "1F44C 1F3FB",
    		emoji: "👌🏻",
    		description: "OK hand: light skin tone",
    		keywords: [
    			"ok"
    		]
    	},
    	{
    		unicode: "1F44C 1F3FC",
    		emoji: "👌🏼",
    		description: "OK hand: medium-light skin tone",
    		keywords: [
    			"ok"
    		]
    	},
    	{
    		unicode: "1F44C 1F3FD",
    		emoji: "👌🏽",
    		description: "OK hand: medium skin tone",
    		keywords: [
    			"ok"
    		]
    	},
    	{
    		unicode: "1F44C 1F3FE",
    		emoji: "👌🏾",
    		description: "OK hand: medium-dark skin tone",
    		keywords: [
    			"ok"
    		]
    	},
    	{
    		unicode: "1F44C 1F3FF",
    		emoji: "👌🏿",
    		description: "OK hand: dark skin tone",
    		keywords: [
    			"ok"
    		]
    	},
    	{
    		unicode: "1F90F",
    		emoji: "🤏",
    		description: "pinching hand",
    		keywords: [
    			"pick",
    			"picking"
    		]
    	},
    	{
    		unicode: "1F90F 1F3FB",
    		emoji: "🤏🏻",
    		description: "pinching hand: light skin tone",
    		keywords: [
    			"pick",
    			"picking"
    		]
    	},
    	{
    		unicode: "1F90F 1F3FC",
    		emoji: "🤏🏼",
    		description: "pinching hand: medium-light skin tone",
    		keywords: [
    			"pick",
    			"picking"
    		]
    	},
    	{
    		unicode: "1F90F 1F3FD",
    		emoji: "🤏🏽",
    		description: "pinching hand: medium skin tone",
    		keywords: [
    			"pick",
    			"picking"
    		]
    	},
    	{
    		unicode: "1F90F 1F3FE",
    		emoji: "🤏🏾",
    		description: "pinching hand: medium-dark skin tone",
    		keywords: [
    			"pick",
    			"picking"
    		]
    	},
    	{
    		unicode: "1F90F 1F3FF",
    		emoji: "🤏🏿",
    		description: "pinching hand: dark skin tone",
    		keywords: [
    			"pick",
    			"picking"
    		]
    	},
    	{
    		unicode: "270C FE0F",
    		emoji: "✌️",
    		description: "victory hand",
    		keywords: [
    			"victory hand"
    		]
    	},
    	{
    		unicode: "270C 1F3FB",
    		emoji: "✌🏻",
    		description: "victory hand: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "270C 1F3FC",
    		emoji: "✌🏼",
    		description: "victory hand: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "270C 1F3FD",
    		emoji: "✌🏽",
    		description: "victory hand: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "270C 1F3FE",
    		emoji: "✌🏾",
    		description: "victory hand: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "270C 1F3FF",
    		emoji: "✌🏿",
    		description: "victory hand: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F91E",
    		emoji: "🤞",
    		description: "crossed fingers",
    		keywords: [
    			"crossed fingers"
    		]
    	},
    	{
    		unicode: "1F91E 1F3FB",
    		emoji: "🤞🏻",
    		description: "crossed fingers: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F91E 1F3FC",
    		emoji: "🤞🏼",
    		description: "crossed fingers: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F91E 1F3FD",
    		emoji: "🤞🏽",
    		description: "crossed fingers: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F91E 1F3FE",
    		emoji: "🤞🏾",
    		description: "crossed fingers: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F91E 1F3FF",
    		emoji: "🤞🏿",
    		description: "crossed fingers: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F91F",
    		emoji: "🤟",
    		description: "love-you gesture",
    		keywords: [
    			"love-you gesture"
    		]
    	},
    	{
    		unicode: "1F91F 1F3FB",
    		emoji: "🤟🏻",
    		description: "love-you gesture: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F91F 1F3FC",
    		emoji: "🤟🏼",
    		description: "love-you gesture: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F91F 1F3FD",
    		emoji: "🤟🏽",
    		description: "love-you gesture: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F91F 1F3FE",
    		emoji: "🤟🏾",
    		description: "love-you gesture: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F91F 1F3FF",
    		emoji: "🤟🏿",
    		description: "love-you gesture: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F918",
    		emoji: "🤘",
    		description: "sign of the horns",
    		keywords: [
    			"sign of the horns"
    		]
    	},
    	{
    		unicode: "1F918 1F3FB",
    		emoji: "🤘🏻",
    		description: "sign of the horns: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F918 1F3FC",
    		emoji: "🤘🏼",
    		description: "sign of the horns: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F918 1F3FD",
    		emoji: "🤘🏽",
    		description: "sign of the horns: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F918 1F3FE",
    		emoji: "🤘🏾",
    		description: "sign of the horns: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F918 1F3FF",
    		emoji: "🤘🏿",
    		description: "sign of the horns: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F919",
    		emoji: "🤙",
    		description: "call me hand",
    		keywords: [
    			"call me hand"
    		]
    	},
    	{
    		unicode: "1F919 1F3FB",
    		emoji: "🤙🏻",
    		description: "call me hand: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F919 1F3FC",
    		emoji: "🤙🏼",
    		description: "call me hand: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F919 1F3FD",
    		emoji: "🤙🏽",
    		description: "call me hand: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F919 1F3FE",
    		emoji: "🤙🏾",
    		description: "call me hand: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F919 1F3FF",
    		emoji: "🤙🏿",
    		description: "call me hand: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F448",
    		emoji: "👈",
    		description: "backhand index pointing left",
    		keywords: [
    			"backhand index pointing left"
    		]
    	},
    	{
    		unicode: "1F448 1F3FB",
    		emoji: "👈🏻",
    		description: "backhand index pointing left: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F448 1F3FC",
    		emoji: "👈🏼",
    		description: "backhand index pointing left: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F448 1F3FD",
    		emoji: "👈🏽",
    		description: "backhand index pointing left: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F448 1F3FE",
    		emoji: "👈🏾",
    		description: "backhand index pointing left: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F448 1F3FF",
    		emoji: "👈🏿",
    		description: "backhand index pointing left: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F449",
    		emoji: "👉",
    		description: "backhand index pointing right",
    		keywords: [
    			"backhand index pointing right"
    		]
    	},
    	{
    		unicode: "1F449 1F3FB",
    		emoji: "👉🏻",
    		description: "backhand index pointing right: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F449 1F3FC",
    		emoji: "👉🏼",
    		description: "backhand index pointing right: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F449 1F3FD",
    		emoji: "👉🏽",
    		description: "backhand index pointing right: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F449 1F3FE",
    		emoji: "👉🏾",
    		description: "backhand index pointing right: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F449 1F3FF",
    		emoji: "👉🏿",
    		description: "backhand index pointing right: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F446",
    		emoji: "👆",
    		description: "backhand index pointing up",
    		keywords: [
    			"backhand index pointing up"
    		]
    	},
    	{
    		unicode: "1F446 1F3FB",
    		emoji: "👆🏻",
    		description: "backhand index pointing up: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F446 1F3FC",
    		emoji: "👆🏼",
    		description: "backhand index pointing up: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F446 1F3FD",
    		emoji: "👆🏽",
    		description: "backhand index pointing up: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F446 1F3FE",
    		emoji: "👆🏾",
    		description: "backhand index pointing up: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F446 1F3FF",
    		emoji: "👆🏿",
    		description: "backhand index pointing up: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F595",
    		emoji: "🖕",
    		description: "middle finger",
    		keywords: [
    			"middle finger"
    		]
    	},
    	{
    		unicode: "1F595 1F3FB",
    		emoji: "🖕🏻",
    		description: "middle finger: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F595 1F3FC",
    		emoji: "🖕🏼",
    		description: "middle finger: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F595 1F3FD",
    		emoji: "🖕🏽",
    		description: "middle finger: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F595 1F3FE",
    		emoji: "🖕🏾",
    		description: "middle finger: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F595 1F3FF",
    		emoji: "🖕🏿",
    		description: "middle finger: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F447",
    		emoji: "👇",
    		description: "backhand index pointing down",
    		keywords: [
    			"backhand index pointing down"
    		]
    	},
    	{
    		unicode: "1F447 1F3FB",
    		emoji: "👇🏻",
    		description: "backhand index pointing down: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F447 1F3FC",
    		emoji: "👇🏼",
    		description: "backhand index pointing down: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F447 1F3FD",
    		emoji: "👇🏽",
    		description: "backhand index pointing down: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F447 1F3FE",
    		emoji: "👇🏾",
    		description: "backhand index pointing down: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F447 1F3FF",
    		emoji: "👇🏿",
    		description: "backhand index pointing down: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "261D FE0F",
    		emoji: "☝️",
    		description: "index pointing up",
    		keywords: [
    			"index pointing up"
    		]
    	},
    	{
    		unicode: "261D 1F3FB",
    		emoji: "☝🏻",
    		description: "index pointing up: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "261D 1F3FC",
    		emoji: "☝🏼",
    		description: "index pointing up: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "261D 1F3FD",
    		emoji: "☝🏽",
    		description: "index pointing up: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "261D 1F3FE",
    		emoji: "☝🏾",
    		description: "index pointing up: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "261D 1F3FF",
    		emoji: "☝🏿",
    		description: "index pointing up: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F44D",
    		emoji: "👍",
    		description: "thumbs up",
    		keywords: [
    			"like it"
    		]
    	},
    	{
    		unicode: "1F44D 1F3FB",
    		emoji: "👍🏻",
    		description: "thumbs up: light skin tone",
    		keywords: [
    			"like it"
    		]
    	},
    	{
    		unicode: "1F44D 1F3FC",
    		emoji: "👍🏼",
    		description: "thumbs up: medium-light skin tone",
    		keywords: [
    			"like it"
    		]
    	},
    	{
    		unicode: "1F44D 1F3FD",
    		emoji: "👍🏽",
    		description: "thumbs up: medium skin tone",
    		keywords: [
    			"like it"
    		]
    	},
    	{
    		unicode: "1F44D 1F3FE",
    		emoji: "👍🏾",
    		description: "thumbs up: medium-dark skin tone",
    		keywords: [
    			"like it"
    		]
    	},
    	{
    		unicode: "1F44D 1F3FF",
    		emoji: "👍🏿",
    		description: "thumbs up: dark skin tone",
    		keywords: [
    			"like it"
    		]
    	},
    	{
    		unicode: "1F44E",
    		emoji: "👎",
    		description: "thumbs down",
    		keywords: [
    			"unlike it"
    		]
    	},
    	{
    		unicode: "1F44E 1F3FB",
    		emoji: "👎🏻",
    		description: "thumbs down: light skin tone",
    		keywords: [
    			"unlike it"
    		]
    	},
    	{
    		unicode: "1F44E 1F3FC",
    		emoji: "👎🏼",
    		description: "thumbs down: medium-light skin tone",
    		keywords: [
    			"unlike it"
    		]
    	},
    	{
    		unicode: "1F44E 1F3FD",
    		emoji: "👎🏽",
    		description: "thumbs down: medium skin tone",
    		keywords: [
    			"unlike it"
    		]
    	},
    	{
    		unicode: "1F44E 1F3FE",
    		emoji: "👎🏾",
    		description: "thumbs down: medium-dark skin tone",
    		keywords: [
    			"unlike it"
    		]
    	},
    	{
    		unicode: "1F44E 1F3FF",
    		emoji: "👎🏿",
    		description: "thumbs down: dark skin tone",
    		keywords: [
    			"unlike it"
    		]
    	},
    	{
    		unicode: "270A",
    		emoji: "✊",
    		description: "raised fist",
    		keywords: [
    			"raised fist"
    		]
    	},
    	{
    		unicode: "270A 1F3FB",
    		emoji: "✊🏻",
    		description: "raised fist: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "270A 1F3FC",
    		emoji: "✊🏼",
    		description: "raised fist: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "270A 1F3FD",
    		emoji: "✊🏽",
    		description: "raised fist: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "270A 1F3FE",
    		emoji: "✊🏾",
    		description: "raised fist: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "270A 1F3FF",
    		emoji: "✊🏿",
    		description: "raised fist: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F44A",
    		emoji: "👊",
    		description: "oncoming fist",
    		keywords: [
    			"oncoming fist"
    		]
    	},
    	{
    		unicode: "1F44A 1F3FB",
    		emoji: "👊🏻",
    		description: "oncoming fist: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F44A 1F3FC",
    		emoji: "👊🏼",
    		description: "oncoming fist: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F44A 1F3FD",
    		emoji: "👊🏽",
    		description: "oncoming fist: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F44A 1F3FE",
    		emoji: "👊🏾",
    		description: "oncoming fist: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F44A 1F3FF",
    		emoji: "👊🏿",
    		description: "oncoming fist: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F91B",
    		emoji: "🤛",
    		description: "left-facing fist",
    		keywords: [
    			"left-facing fist"
    		]
    	},
    	{
    		unicode: "1F91B 1F3FB",
    		emoji: "🤛🏻",
    		description: "left-facing fist: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F91B 1F3FC",
    		emoji: "🤛🏼",
    		description: "left-facing fist: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F91B 1F3FD",
    		emoji: "🤛🏽",
    		description: "left-facing fist: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F91B 1F3FE",
    		emoji: "🤛🏾",
    		description: "left-facing fist: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F91B 1F3FF",
    		emoji: "🤛🏿",
    		description: "left-facing fist: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F91C",
    		emoji: "🤜",
    		description: "right-facing fist",
    		keywords: [
    			"right-facing fist"
    		]
    	},
    	{
    		unicode: "1F91C 1F3FB",
    		emoji: "🤜🏻",
    		description: "right-facing fist: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F91C 1F3FC",
    		emoji: "🤜🏼",
    		description: "right-facing fist: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F91C 1F3FD",
    		emoji: "🤜🏽",
    		description: "right-facing fist: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F91C 1F3FE",
    		emoji: "🤜🏾",
    		description: "right-facing fist: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F91C 1F3FF",
    		emoji: "🤜🏿",
    		description: "right-facing fist: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F44F",
    		emoji: "👏",
    		description: "clapping hands",
    		keywords: [
    			"clapping hands"
    		]
    	},
    	{
    		unicode: "1F44F 1F3FB",
    		emoji: "👏🏻",
    		description: "clapping hands: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F44F 1F3FC",
    		emoji: "👏🏼",
    		description: "clapping hands: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F44F 1F3FD",
    		emoji: "👏🏽",
    		description: "clapping hands: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F44F 1F3FE",
    		emoji: "👏🏾",
    		description: "clapping hands: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F44F 1F3FF",
    		emoji: "👏🏿",
    		description: "clapping hands: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64C",
    		emoji: "🙌",
    		description: "raising hands",
    		keywords: [
    			"raising hands"
    		]
    	},
    	{
    		unicode: "1F64C 1F3FB",
    		emoji: "🙌🏻",
    		description: "raising hands: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64C 1F3FC",
    		emoji: "🙌🏼",
    		description: "raising hands: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64C 1F3FD",
    		emoji: "🙌🏽",
    		description: "raising hands: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64C 1F3FE",
    		emoji: "🙌🏾",
    		description: "raising hands: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64C 1F3FF",
    		emoji: "🙌🏿",
    		description: "raising hands: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F450",
    		emoji: "👐",
    		description: "open hands",
    		keywords: [
    			"open hands"
    		]
    	},
    	{
    		unicode: "1F450 1F3FB",
    		emoji: "👐🏻",
    		description: "open hands: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F450 1F3FC",
    		emoji: "👐🏼",
    		description: "open hands: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F450 1F3FD",
    		emoji: "👐🏽",
    		description: "open hands: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F450 1F3FE",
    		emoji: "👐🏾",
    		description: "open hands: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F450 1F3FF",
    		emoji: "👐🏿",
    		description: "open hands: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F932",
    		emoji: "🤲",
    		description: "palms up together",
    		keywords: [
    			"palms up together"
    		]
    	},
    	{
    		unicode: "1F932 1F3FB",
    		emoji: "🤲🏻",
    		description: "palms up together: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F932 1F3FC",
    		emoji: "🤲🏼",
    		description: "palms up together: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F932 1F3FD",
    		emoji: "🤲🏽",
    		description: "palms up together: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F932 1F3FE",
    		emoji: "🤲🏾",
    		description: "palms up together: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F932 1F3FF",
    		emoji: "🤲🏿",
    		description: "palms up together: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F91D",
    		emoji: "🤝",
    		description: "handshake",
    		keywords: [
    			"handshake"
    		]
    	},
    	{
    		unicode: "1F64F",
    		emoji: "🙏",
    		description: "folded hands",
    		keywords: [
    			"please",
    			"plz"
    		]
    	},
    	{
    		unicode: "1F64F 1F3FB",
    		emoji: "🙏🏻",
    		description: "folded hands: light skin tone",
    		keywords: [
    			"please",
    			"plz"
    		]
    	},
    	{
    		unicode: "1F64F 1F3FC",
    		emoji: "🙏🏼",
    		description: "folded hands: medium-light skin tone",
    		keywords: [
    			"please",
    			"plz"
    		]
    	},
    	{
    		unicode: "1F64F 1F3FD",
    		emoji: "🙏🏽",
    		description: "folded hands: medium skin tone",
    		keywords: [
    			"please",
    			"plz"
    		]
    	},
    	{
    		unicode: "1F64F 1F3FE",
    		emoji: "🙏🏾",
    		description: "folded hands: medium-dark skin tone",
    		keywords: [
    			"please",
    			"plz"
    		]
    	},
    	{
    		unicode: "1F64F 1F3FF",
    		emoji: "🙏🏿",
    		description: "folded hands: dark skin tone",
    		keywords: [
    			"please",
    			"plz"
    		]
    	},
    	{
    		unicode: "270D FE0F",
    		emoji: "✍️",
    		description: "writing hand",
    		keywords: [
    			"write",
    			"wrinting"
    		]
    	},
    	{
    		unicode: "270D 1F3FB",
    		emoji: "✍🏻",
    		description: "writing hand: light skin tone",
    		keywords: [
    			"write",
    			"wrinting"
    		]
    	},
    	{
    		unicode: "270D 1F3FC",
    		emoji: "✍🏼",
    		description: "writing hand: medium-light skin tone",
    		keywords: [
    			"write",
    			"wrinting"
    		]
    	},
    	{
    		unicode: "270D 1F3FD",
    		emoji: "✍🏽",
    		description: "writing hand: medium skin tone",
    		keywords: [
    			"write",
    			"wrinting"
    		]
    	},
    	{
    		unicode: "270D 1F3FE",
    		emoji: "✍🏾",
    		description: "writing hand: medium-dark skin tone",
    		keywords: [
    			"write",
    			"wrinting"
    		]
    	},
    	{
    		unicode: "270D 1F3FF",
    		emoji: "✍🏿",
    		description: "writing hand: dark skin tone",
    		keywords: [
    			"write",
    			"wrinting"
    		]
    	},
    	{
    		unicode: "1F485",
    		emoji: "💅",
    		description: "nail polish",
    		keywords: [
    			"nail polish"
    		]
    	},
    	{
    		unicode: "1F485 1F3FB",
    		emoji: "💅🏻",
    		description: "nail polish: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F485 1F3FC",
    		emoji: "💅🏼",
    		description: "nail polish: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F485 1F3FD",
    		emoji: "💅🏽",
    		description: "nail polish: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F485 1F3FE",
    		emoji: "💅🏾",
    		description: "nail polish: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F485 1F3FF",
    		emoji: "💅🏿",
    		description: "nail polish: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F933",
    		emoji: "🤳",
    		description: "selfie",
    		keywords: [
    			"selfie"
    		]
    	},
    	{
    		unicode: "1F933 1F3FB",
    		emoji: "🤳🏻",
    		description: "selfie: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F933 1F3FC",
    		emoji: "🤳🏼",
    		description: "selfie: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F933 1F3FD",
    		emoji: "🤳🏽",
    		description: "selfie: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F933 1F3FE",
    		emoji: "🤳🏾",
    		description: "selfie: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F933 1F3FF",
    		emoji: "🤳🏿",
    		description: "selfie: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F4AA",
    		emoji: "💪",
    		description: "flexed biceps",
    		keywords: [
    			"good job"
    		]
    	},
    	{
    		unicode: "1F4AA 1F3FB",
    		emoji: "💪🏻",
    		description: "flexed biceps: light skin tone",
    		keywords: [
    			"good job"
    		]
    	},
    	{
    		unicode: "1F4AA 1F3FC",
    		emoji: "💪🏼",
    		description: "flexed biceps: medium-light skin tone",
    		keywords: [
    			"good job"
    		]
    	},
    	{
    		unicode: "1F4AA 1F3FD",
    		emoji: "💪🏽",
    		description: "flexed biceps: medium skin tone",
    		keywords: [
    			"good job"
    		]
    	},
    	{
    		unicode: "1F4AA 1F3FE",
    		emoji: "💪🏾",
    		description: "flexed biceps: medium-dark skin tone",
    		keywords: [
    			"good job"
    		]
    	},
    	{
    		unicode: "1F4AA 1F3FF",
    		emoji: "💪🏿",
    		description: "flexed biceps: dark skin tone",
    		keywords: [
    			"good job"
    		]
    	},
    	{
    		unicode: "1F9BE",
    		emoji: "🦾",
    		description: "mechanical arm",
    		keywords: [
    			"good job"
    		]
    	},
    	{
    		unicode: "1F9BF",
    		emoji: "🦿",
    		description: "mechanical leg",
    		keywords: [
    			"mechanical leg"
    		]
    	},
    	{
    		unicode: "1F9B5",
    		emoji: "🦵",
    		description: "leg",
    		keywords: [
    			"leg"
    		]
    	},
    	{
    		unicode: "1F9B5 1F3FB",
    		emoji: "🦵🏻",
    		description: "leg: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B5 1F3FC",
    		emoji: "🦵🏼",
    		description: "leg: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B5 1F3FD",
    		emoji: "🦵🏽",
    		description: "leg: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B5 1F3FE",
    		emoji: "🦵🏾",
    		description: "leg: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B5 1F3FF",
    		emoji: "🦵🏿",
    		description: "leg: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B6",
    		emoji: "🦶",
    		description: "foot",
    		keywords: [
    			"foot"
    		]
    	},
    	{
    		unicode: "1F9B6 1F3FB",
    		emoji: "🦶🏻",
    		description: "foot: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B6 1F3FC",
    		emoji: "🦶🏼",
    		description: "foot: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B6 1F3FD",
    		emoji: "🦶🏽",
    		description: "foot: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B6 1F3FE",
    		emoji: "🦶🏾",
    		description: "foot: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B6 1F3FF",
    		emoji: "🦶🏿",
    		description: "foot: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F442",
    		emoji: "👂",
    		description: "ear",
    		keywords: [
    			"listening",
    			"ear"
    		]
    	},
    	{
    		unicode: "1F442 1F3FB",
    		emoji: "👂🏻",
    		description: "ear: light skin tone",
    		keywords: [
    			"listening",
    			"ear"
    		]
    	},
    	{
    		unicode: "1F442 1F3FC",
    		emoji: "👂🏼",
    		description: "ear: medium-light skin tone",
    		keywords: [
    			"listening",
    			"ear"
    		]
    	},
    	{
    		unicode: "1F442 1F3FD",
    		emoji: "👂🏽",
    		description: "ear: medium skin tone",
    		keywords: [
    			"listening",
    			"ear"
    		]
    	},
    	{
    		unicode: "1F442 1F3FE",
    		emoji: "👂🏾",
    		description: "ear: medium-dark skin tone",
    		keywords: [
    			"listening",
    			"ear"
    		]
    	},
    	{
    		unicode: "1F442 1F3FF",
    		emoji: "👂🏿",
    		description: "ear: dark skin tone",
    		keywords: [
    			"listening",
    			"ear"
    		]
    	},
    	{
    		unicode: "1F9BB",
    		emoji: "🦻",
    		description: "ear with hearing aid",
    		keywords: [
    			"hearing",
    			"ear"
    		]
    	},
    	{
    		unicode: "1F9BB 1F3FB",
    		emoji: "🦻🏻",
    		description: "ear with hearing aid: light skin tone",
    		keywords: [
    			"hearing",
    			"ear"
    		]
    	},
    	{
    		unicode: "1F9BB 1F3FC",
    		emoji: "🦻🏼",
    		description: "ear with hearing aid: medium-light skin tone",
    		keywords: [
    			"hearing",
    			"ear"
    		]
    	},
    	{
    		unicode: "1F9BB 1F3FD",
    		emoji: "🦻🏽",
    		description: "ear with hearing aid: medium skin tone",
    		keywords: [
    			"hearing",
    			"ear"
    		]
    	},
    	{
    		unicode: "1F9BB 1F3FE",
    		emoji: "🦻🏾",
    		description: "ear with hearing aid: medium-dark skin tone",
    		keywords: [
    			"hearing",
    			"ear"
    		]
    	},
    	{
    		unicode: "1F9BB 1F3FF",
    		emoji: "🦻🏿",
    		description: "ear with hearing aid: dark skin tone",
    		keywords: [
    			"hearing",
    			"ear"
    		]
    	},
    	{
    		unicode: "1F443",
    		emoji: "👃",
    		description: "nose",
    		keywords: [
    			"nose"
    		]
    	},
    	{
    		unicode: "1F443 1F3FB",
    		emoji: "👃🏻",
    		description: "nose: light skin tone",
    		keywords: [
    			"nose"
    		]
    	},
    	{
    		unicode: "1F443 1F3FC",
    		emoji: "👃🏼",
    		description: "nose: medium-light skin tone",
    		keywords: [
    			"nose"
    		]
    	},
    	{
    		unicode: "1F443 1F3FD",
    		emoji: "👃🏽",
    		description: "nose: medium skin tone",
    		keywords: [
    			"nose"
    		]
    	},
    	{
    		unicode: "1F443 1F3FE",
    		emoji: "👃🏾",
    		description: "nose: medium-dark skin tone",
    		keywords: [
    			"nose"
    		]
    	},
    	{
    		unicode: "1F443 1F3FF",
    		emoji: "👃🏿",
    		description: "nose: dark skin tone",
    		keywords: [
    			"nose"
    		]
    	},
    	{
    		unicode: "1F9E0",
    		emoji: "🧠",
    		description: "brain",
    		keywords: [
    			"brain"
    		]
    	},
    	{
    		unicode: "1FAC0",
    		emoji: "🫀",
    		description: "anatomical heart",
    		keywords: [
    			"anatomical heart"
    		]
    	},
    	{
    		unicode: "1FAC1",
    		emoji: "🫁",
    		description: "lungs",
    		keywords: [
    			"lungs"
    		]
    	},
    	{
    		unicode: "1F9B7",
    		emoji: "🦷",
    		description: "tooth",
    		keywords: [
    			"tooth"
    		]
    	},
    	{
    		unicode: "1F9B4",
    		emoji: "🦴",
    		description: "bone",
    		keywords: [
    			"bone",
    			"bones"
    		]
    	},
    	{
    		unicode: "1F440",
    		emoji: "👀",
    		description: "eyes",
    		keywords: [
    			"eyes",
    			"seeing"
    		]
    	},
    	{
    		unicode: "1F441 FE0F",
    		emoji: "👁️",
    		description: "eye",
    		keywords: [
    			"eye"
    		]
    	},
    	{
    		unicode: "1F441",
    		emoji: "👁",
    		description: "eye",
    		keywords: [
    			"eye"
    		]
    	},
    	{
    		unicode: "1F445",
    		emoji: "👅",
    		description: "tongue",
    		keywords: [
    			"tongue"
    		]
    	},
    	{
    		unicode: "1F444",
    		emoji: "👄",
    		description: "mouth",
    		keywords: [
    			"mouth"
    		]
    	},
    	{
    		unicode: "1F476",
    		emoji: "👶",
    		description: "baby",
    		keywords: [
    			"baby"
    		]
    	},
    	{
    		unicode: "1F476 1F3FB",
    		emoji: "👶🏻",
    		description: "baby: light skin tone",
    		keywords: [
    			"baby"
    		]
    	},
    	{
    		unicode: "1F476 1F3FC",
    		emoji: "👶🏼",
    		description: "baby: medium-light skin tone",
    		keywords: [
    			"baby"
    		]
    	},
    	{
    		unicode: "1F476 1F3FD",
    		emoji: "👶🏽",
    		description: "baby: medium skin tone",
    		keywords: [
    			"baby"
    		]
    	},
    	{
    		unicode: "1F476 1F3FE",
    		emoji: "👶🏾",
    		description: "baby: medium-dark skin tone",
    		keywords: [
    			"baby"
    		]
    	},
    	{
    		unicode: "1F476 1F3FF",
    		emoji: "👶🏿",
    		description: "baby: dark skin tone",
    		keywords: [
    			"baby"
    		]
    	},
    	{
    		unicode: "1F9D2",
    		emoji: "🧒",
    		description: "child",
    		keywords: [
    			"child"
    		]
    	},
    	{
    		unicode: "1F9D2 1F3FB",
    		emoji: "🧒🏻",
    		description: "child: light skin tone",
    		keywords: [
    			"child"
    		]
    	},
    	{
    		unicode: "1F9D2 1F3FC",
    		emoji: "🧒🏼",
    		description: "child: medium-light skin tone",
    		keywords: [
    			"child"
    		]
    	},
    	{
    		unicode: "1F9D2 1F3FD",
    		emoji: "🧒🏽",
    		description: "child: medium skin tone",
    		keywords: [
    			"child"
    		]
    	},
    	{
    		unicode: "1F9D2 1F3FE",
    		emoji: "🧒🏾",
    		description: "child: medium-dark skin tone",
    		keywords: [
    			"child"
    		]
    	},
    	{
    		unicode: "1F9D2 1F3FF",
    		emoji: "🧒🏿",
    		description: "child: dark skin tone",
    		keywords: [
    			"child"
    		]
    	},
    	{
    		unicode: "1F466",
    		emoji: "👦",
    		description: "boy",
    		keywords: [
    			"boy"
    		]
    	},
    	{
    		unicode: "1F466 1F3FB",
    		emoji: "👦🏻",
    		description: "boy: light skin tone",
    		keywords: [
    			"boy"
    		]
    	},
    	{
    		unicode: "1F466 1F3FC",
    		emoji: "👦🏼",
    		description: "boy: medium-light skin tone",
    		keywords: [
    			"boy"
    		]
    	},
    	{
    		unicode: "1F466 1F3FD",
    		emoji: "👦🏽",
    		description: "boy: medium skin tone",
    		keywords: [
    			"boy"
    		]
    	},
    	{
    		unicode: "1F466 1F3FE",
    		emoji: "👦🏾",
    		description: "boy: medium-dark skin tone",
    		keywords: [
    			"boy"
    		]
    	},
    	{
    		unicode: "1F466 1F3FF",
    		emoji: "👦🏿",
    		description: "boy: dark skin tone",
    		keywords: [
    			"boy"
    		]
    	},
    	{
    		unicode: "1F467",
    		emoji: "👧",
    		description: "girl",
    		keywords: [
    			"boy"
    		]
    	},
    	{
    		unicode: "1F467 1F3FB",
    		emoji: "👧🏻",
    		description: "girl: light skin tone",
    		keywords: [
    			"boy"
    		]
    	},
    	{
    		unicode: "1F467 1F3FC",
    		emoji: "👧🏼",
    		description: "girl: medium-light skin tone",
    		keywords: [
    			"girl"
    		]
    	},
    	{
    		unicode: "1F467 1F3FD",
    		emoji: "👧🏽",
    		description: "girl: medium skin tone",
    		keywords: [
    			"girl"
    		]
    	},
    	{
    		unicode: "1F467 1F3FE",
    		emoji: "👧🏾",
    		description: "girl: medium-dark skin tone",
    		keywords: [
    			"girl"
    		]
    	},
    	{
    		unicode: "1F467 1F3FF",
    		emoji: "👧🏿",
    		description: "girl: dark skin tone",
    		keywords: [
    			"girl"
    		]
    	},
    	{
    		unicode: "1F9D1",
    		emoji: "🧑",
    		description: "person",
    		keywords: [
    			"person"
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻",
    		description: "person: light skin tone",
    		keywords: [
    			"person"
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼",
    		description: "person: medium-light skin tone",
    		keywords: [
    			"person"
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽",
    		description: "person: medium skin tone",
    		keywords: [
    			"person"
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾",
    		description: "person: medium-dark skin tone",
    		keywords: [
    			"person"
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿",
    		description: "person: dark skin tone",
    		keywords: [
    			"person"
    		]
    	},
    	{
    		unicode: "1F471",
    		emoji: "👱",
    		description: "person: blond hair",
    		keywords: [
    			"person"
    		]
    	},
    	{
    		unicode: "1F471 1F3FB",
    		emoji: "👱🏻",
    		description: "person: light skin tone, blond hair",
    		keywords: [
    			"person"
    		]
    	},
    	{
    		unicode: "1F471 1F3FC",
    		emoji: "👱🏼",
    		description: "person: medium-light skin tone, blond hair",
    		keywords: [
    			"person"
    		]
    	},
    	{
    		unicode: "1F471 1F3FD",
    		emoji: "👱🏽",
    		description: "person: medium skin tone, blond hair",
    		keywords: [
    			"person"
    		]
    	},
    	{
    		unicode: "1F471 1F3FE",
    		emoji: "👱🏾",
    		description: "person: medium-dark skin tone, blond hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F471 1F3FF",
    		emoji: "👱🏿",
    		description: "person: dark skin tone, blond hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468",
    		emoji: "👨",
    		description: "man",
    		keywords: [
    			"man"
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻",
    		description: "man: light skin tone",
    		keywords: [
    			"man"
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼",
    		description: "man: medium-light skin tone",
    		keywords: [
    			"man"
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽",
    		description: "man: medium skin tone",
    		keywords: [
    			"man"
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾",
    		description: "man: medium-dark skin tone",
    		keywords: [
    			"man"
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿",
    		description: "man: dark skin tone",
    		keywords: [
    			"man"
    		]
    	},
    	{
    		unicode: "1F9D4",
    		emoji: "🧔",
    		description: "man: beard",
    		keywords: [
    			"man"
    		]
    	},
    	{
    		unicode: "1F9D4 1F3FB",
    		emoji: "🧔🏻",
    		description: "man: light skin tone, beard",
    		keywords: [
    			"man"
    		]
    	},
    	{
    		unicode: "1F9D4 1F3FC",
    		emoji: "🧔🏼",
    		description: "man: medium-light skin tone, beard",
    		keywords: [
    			"man"
    		]
    	},
    	{
    		unicode: "1F9D4 1F3FD",
    		emoji: "🧔🏽",
    		description: "man: medium skin tone, beard",
    		keywords: [
    			"man"
    		]
    	},
    	{
    		unicode: "1F9D4 1F3FE",
    		emoji: "🧔🏾",
    		description: "man: medium-dark skin tone, beard",
    		keywords: [
    			"man"
    		]
    	},
    	{
    		unicode: "1F9D4 1F3FF",
    		emoji: "🧔🏿",
    		description: "man: dark skin tone, beard",
    		keywords: [
    			"man"
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍🦰",
    		description: "man: light skin tone, red hair",
    		keywords: [
    			"man with red hair"
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍🦰",
    		description: "man: medium-light skin tone, red hair",
    		keywords: [
    			"man with red hair"
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍🦰",
    		description: "man: medium skin tone, red hair",
    		keywords: [
    			"man with red hair"
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍🦰",
    		description: "man: medium-dark skin tone, red hair",
    		keywords: [
    			"man with red hair"
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍🦰",
    		description: "man: dark skin tone, red hair",
    		keywords: [
    			"man with red hair"
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍🦱",
    		description: "man: light skin tone, curly hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍🦱",
    		description: "man: medium-light skin tone, curly hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍🦱",
    		description: "man: medium skin tone, curly hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍🦱",
    		description: "man: medium-dark skin tone, curly hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍🦱",
    		description: "man: dark skin tone, curly hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍🦳",
    		description: "man: light skin tone, white hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍🦳",
    		description: "man: medium-light skin tone, white hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍🦳",
    		description: "man: medium skin tone, white hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍🦳",
    		description: "man: medium-dark skin tone, white hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍🦳",
    		description: "man: dark skin tone, white hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍🦲",
    		description: "man: light skin tone, bald",
    		keywords: [
    			"bald man"
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍🦲",
    		description: "man: medium-light skin tone, bald",
    		keywords: [
    			"bald man"
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍🦲",
    		description: "man: medium skin tone, bald",
    		keywords: [
    			"bald man"
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍🦲",
    		description: "man: medium-dark skin tone, bald",
    		keywords: [
    			"bald man"
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍🦲",
    		description: "man: dark skin tone, bald",
    		keywords: [
    			"bald man"
    		]
    	},
    	{
    		unicode: "1F469",
    		emoji: "👩",
    		description: "woman",
    		keywords: [
    			"woman"
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻",
    		description: "woman: light skin tone",
    		keywords: [
    			"woman"
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼",
    		description: "woman: medium-light skin tone",
    		keywords: [
    			"woman"
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽",
    		description: "woman: medium skin tone",
    		keywords: [
    			"woman"
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾",
    		description: "woman: medium-dark skin tone",
    		keywords: [
    			"woman"
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿",
    		description: "woman: dark skin tone",
    		keywords: [
    			"woman"
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍🦰",
    		description: "woman: light skin tone, red hair",
    		keywords: [
    			"woman with red hair"
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍🦰",
    		description: "woman: medium-light skin tone, red hair",
    		keywords: [
    			"woman with red hair"
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍🦰",
    		description: "woman: medium skin tone, red hair",
    		keywords: [
    			"woman with red hair"
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍🦰",
    		description: "woman: medium-dark skin tone, red hair",
    		keywords: [
    			"woman with red hair"
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍🦰",
    		description: "woman: dark skin tone, red hair",
    		keywords: [
    			"woman with red hair"
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍🦰",
    		description: "person: light skin tone, red hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍🦰",
    		description: "person: medium-light skin tone, red hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍🦰",
    		description: "person: medium skin tone, red hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍🦰",
    		description: "person: medium-dark skin tone, red hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍🦰",
    		description: "person: dark skin tone, red hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍🦱",
    		description: "woman: light skin tone, curly hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍🦱",
    		description: "woman: medium-light skin tone, curly hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍🦱",
    		description: "woman: medium skin tone, curly hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍🦱",
    		description: "woman: medium-dark skin tone, curly hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍🦱",
    		description: "woman: dark skin tone, curly hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍🦱",
    		description: "person: light skin tone, curly hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍🦱",
    		description: "person: medium-light skin tone, curly hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍🦱",
    		description: "person: medium skin tone, curly hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍🦱",
    		description: "person: medium-dark skin tone, curly hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍🦱",
    		description: "person: dark skin tone, curly hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍🦳",
    		description: "woman: light skin tone, white hair",
    		keywords: [
    			"white hair woman",
    			"white hair"
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍🦳",
    		description: "woman: medium-light skin tone, white hair",
    		keywords: [
    			"white hair woman",
    			"white hair"
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍🦳",
    		description: "woman: medium skin tone, white hair",
    		keywords: [
    			"white hair woman",
    			"white hair"
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍🦳",
    		description: "woman: medium-dark skin tone, white hair",
    		keywords: [
    			"white hair woman",
    			"white hair"
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍🦳",
    		description: "woman: dark skin tone, white hair",
    		keywords: [
    			"white hair woman",
    			"white hair"
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍🦳",
    		description: "person: light skin tone, white hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍🦳",
    		description: "person: medium-light skin tone, white hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍🦳",
    		description: "person: medium skin tone, white hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍🦳",
    		description: "person: medium-dark skin tone, white hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍🦳",
    		description: "person: dark skin tone, white hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍🦲",
    		description: "woman: light skin tone, bald",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍🦲",
    		description: "woman: medium-light skin tone, bald",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍🦲",
    		description: "woman: medium skin tone, bald",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍🦲",
    		description: "woman: medium-dark skin tone, bald",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍🦲",
    		description: "woman: dark skin tone, bald",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍🦲",
    		description: "person: light skin tone, bald",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍🦲",
    		description: "person: medium-light skin tone, bald",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍🦲",
    		description: "person: medium skin tone, bald",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍🦲",
    		description: "person: medium-dark skin tone, bald",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍🦲",
    		description: "person: dark skin tone, bald",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F471 1F3FB",
    		emoji: "👱🏻‍♀️",
    		description: "woman: light skin tone, blond hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F471 1F3FB",
    		emoji: "👱🏻‍♀",
    		description: "woman: light skin tone, blond hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F471 1F3FC",
    		emoji: "👱🏼‍♀️",
    		description: "woman: medium-light skin tone, blond hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F471 1F3FC",
    		emoji: "👱🏼‍♀",
    		description: "woman: medium-light skin tone, blond hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F471 1F3FD",
    		emoji: "👱🏽‍♀️",
    		description: "woman: medium skin tone, blond hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F471 1F3FD",
    		emoji: "👱🏽‍♀",
    		description: "woman: medium skin tone, blond hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F471 1F3FE",
    		emoji: "👱🏾‍♀️",
    		description: "woman: medium-dark skin tone, blond hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F471 1F3FE",
    		emoji: "👱🏾‍♀",
    		description: "woman: medium-dark skin tone, blond hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F471 1F3FF",
    		emoji: "👱🏿‍♀️",
    		description: "woman: dark skin tone, blond hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F471 1F3FF",
    		emoji: "👱🏿‍♀",
    		description: "woman: dark skin tone, blond hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F471 1F3FB",
    		emoji: "👱🏻‍♂️",
    		description: "man: light skin tone, blond hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F471 1F3FB",
    		emoji: "👱🏻‍♂",
    		description: "man: light skin tone, blond hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F471 1F3FC",
    		emoji: "👱🏼‍♂️",
    		description: "man: medium-light skin tone, blond hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F471 1F3FC",
    		emoji: "👱🏼‍♂",
    		description: "man: medium-light skin tone, blond hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F471 1F3FD",
    		emoji: "👱🏽‍♂️",
    		description: "man: medium skin tone, blond hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F471 1F3FD",
    		emoji: "👱🏽‍♂",
    		description: "man: medium skin tone, blond hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F471 1F3FE",
    		emoji: "👱🏾‍♂️",
    		description: "man: medium-dark skin tone, blond hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F471 1F3FE",
    		emoji: "👱🏾‍♂",
    		description: "man: medium-dark skin tone, blond hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F471 1F3FF",
    		emoji: "👱🏿‍♂️",
    		description: "man: dark skin tone, blond hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F471 1F3FF",
    		emoji: "👱🏿‍♂",
    		description: "man: dark skin tone, blond hair",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D3",
    		emoji: "🧓",
    		description: "older person",
    		keywords: [
    			"older person"
    		]
    	},
    	{
    		unicode: "1F9D3 1F3FB",
    		emoji: "🧓🏻",
    		description: "older person: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D3 1F3FC",
    		emoji: "🧓🏼",
    		description: "older person: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D3 1F3FD",
    		emoji: "🧓🏽",
    		description: "older person: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D3 1F3FE",
    		emoji: "🧓🏾",
    		description: "older person: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D3 1F3FF",
    		emoji: "🧓🏿",
    		description: "older person: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F474",
    		emoji: "👴",
    		description: "old man",
    		keywords: [
    			"old man",
    			"grandpa",
    			"grand father"
    		]
    	},
    	{
    		unicode: "1F474 1F3FB",
    		emoji: "👴🏻",
    		description: "old man: light skin tone",
    		keywords: [
    			"old man",
    			"grandpa",
    			"grand father"
    		]
    	},
    	{
    		unicode: "1F474 1F3FC",
    		emoji: "👴🏼",
    		description: "old man: medium-light skin tone",
    		keywords: [
    			"old man",
    			"grandpa",
    			"grand father"
    		]
    	},
    	{
    		unicode: "1F474 1F3FD",
    		emoji: "👴🏽",
    		description: "old man: medium skin tone",
    		keywords: [
    			"old man",
    			"grandpa",
    			"grand father"
    		]
    	},
    	{
    		unicode: "1F474 1F3FE",
    		emoji: "👴🏾",
    		description: "old man: medium-dark skin tone",
    		keywords: [
    			"old man",
    			"grandpa",
    			"grand father"
    		]
    	},
    	{
    		unicode: "1F474 1F3FF",
    		emoji: "👴🏿",
    		description: "old man: dark skin tone",
    		keywords: [
    			"old man",
    			"grandpa",
    			"grand father"
    		]
    	},
    	{
    		unicode: "1F475",
    		emoji: "👵",
    		description: "old woman",
    		keywords: [
    			"old woman",
    			"grandma",
    			"grand mother"
    		]
    	},
    	{
    		unicode: "1F475 1F3FB",
    		emoji: "👵🏻",
    		description: "old woman: light skin tone",
    		keywords: [
    			"old woman",
    			"grandma",
    			"grand mother"
    		]
    	},
    	{
    		unicode: "1F475 1F3FC",
    		emoji: "👵🏼",
    		description: "old woman: medium-light skin tone",
    		keywords: [
    			"old woman",
    			"grandma",
    			"grand mother"
    		]
    	},
    	{
    		unicode: "1F475 1F3FD",
    		emoji: "👵🏽",
    		description: "old woman: medium skin tone",
    		keywords: [
    			"old woman",
    			"grandma",
    			"grand mother"
    		]
    	},
    	{
    		unicode: "1F475 1F3FE",
    		emoji: "👵🏾",
    		description: "old woman: medium-dark skin tone",
    		keywords: [
    			"old woman",
    			"grandma",
    			"grand mother"
    		]
    	},
    	{
    		unicode: "1F475 1F3FF",
    		emoji: "👵🏿",
    		description: "old woman: dark skin tone",
    		keywords: [
    			"old woman",
    			"grandma",
    			"grand mother"
    		]
    	},
    	{
    		unicode: "1F64D",
    		emoji: "🙍",
    		description: "person frowning",
    		keywords: [
    			"person frowning"
    		]
    	},
    	{
    		unicode: "1F64D 1F3FB",
    		emoji: "🙍🏻",
    		description: "person frowning: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64D 1F3FC",
    		emoji: "🙍🏼",
    		description: "person frowning: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64D 1F3FD",
    		emoji: "🙍🏽",
    		description: "person frowning: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64D 1F3FE",
    		emoji: "🙍🏾",
    		description: "person frowning: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64D 1F3FF",
    		emoji: "🙍🏿",
    		description: "person frowning: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64D 1F3FB",
    		emoji: "🙍🏻‍♂️",
    		description: "man frowning: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64D 1F3FB",
    		emoji: "🙍🏻‍♂",
    		description: "man frowning: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64D 1F3FC",
    		emoji: "🙍🏼‍♂️",
    		description: "man frowning: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64D 1F3FC",
    		emoji: "🙍🏼‍♂",
    		description: "man frowning: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64D 1F3FD",
    		emoji: "🙍🏽‍♂️",
    		description: "man frowning: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64D 1F3FD",
    		emoji: "🙍🏽‍♂",
    		description: "man frowning: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64D 1F3FE",
    		emoji: "🙍🏾‍♂️",
    		description: "man frowning: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64D 1F3FE",
    		emoji: "🙍🏾‍♂",
    		description: "man frowning: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64D 1F3FF",
    		emoji: "🙍🏿‍♂️",
    		description: "man frowning: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64D 1F3FF",
    		emoji: "🙍🏿‍♂",
    		description: "man frowning: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64D 1F3FB",
    		emoji: "🙍🏻‍♀️",
    		description: "woman frowning: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64D 1F3FB",
    		emoji: "🙍🏻‍♀",
    		description: "woman frowning: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64D 1F3FC",
    		emoji: "🙍🏼‍♀️",
    		description: "woman frowning: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64D 1F3FC",
    		emoji: "🙍🏼‍♀",
    		description: "woman frowning: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64D 1F3FD",
    		emoji: "🙍🏽‍♀️",
    		description: "woman frowning: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64D 1F3FD",
    		emoji: "🙍🏽‍♀",
    		description: "woman frowning: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64D 1F3FE",
    		emoji: "🙍🏾‍♀️",
    		description: "woman frowning: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64D 1F3FE",
    		emoji: "🙍🏾‍♀",
    		description: "woman frowning: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64D 1F3FF",
    		emoji: "🙍🏿‍♀️",
    		description: "woman frowning: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64D 1F3FF",
    		emoji: "🙍🏿‍♀",
    		description: "woman frowning: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64E",
    		emoji: "🙎",
    		description: "person pouting",
    		keywords: [
    			"person pouting"
    		]
    	},
    	{
    		unicode: "1F64E 1F3FB",
    		emoji: "🙎🏻",
    		description: "person pouting: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64E 1F3FC",
    		emoji: "🙎🏼",
    		description: "person pouting: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64E 1F3FD",
    		emoji: "🙎🏽",
    		description: "person pouting: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64E 1F3FE",
    		emoji: "🙎🏾",
    		description: "person pouting: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64E 1F3FF",
    		emoji: "🙎🏿",
    		description: "person pouting: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64E 1F3FB",
    		emoji: "🙎🏻‍♂️",
    		description: "man pouting: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64E 1F3FB",
    		emoji: "🙎🏻‍♂",
    		description: "man pouting: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64E 1F3FC",
    		emoji: "🙎🏼‍♂️",
    		description: "man pouting: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64E 1F3FC",
    		emoji: "🙎🏼‍♂",
    		description: "man pouting: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64E 1F3FD",
    		emoji: "🙎🏽‍♂️",
    		description: "man pouting: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64E 1F3FD",
    		emoji: "🙎🏽‍♂",
    		description: "man pouting: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64E 1F3FE",
    		emoji: "🙎🏾‍♂️",
    		description: "man pouting: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64E 1F3FE",
    		emoji: "🙎🏾‍♂",
    		description: "man pouting: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64E 1F3FF",
    		emoji: "🙎🏿‍♂️",
    		description: "man pouting: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64E 1F3FF",
    		emoji: "🙎🏿‍♂",
    		description: "man pouting: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64E 1F3FB",
    		emoji: "🙎🏻‍♀️",
    		description: "woman pouting: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64E 1F3FB",
    		emoji: "🙎🏻‍♀",
    		description: "woman pouting: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64E 1F3FC",
    		emoji: "🙎🏼‍♀️",
    		description: "woman pouting: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64E 1F3FC",
    		emoji: "🙎🏼‍♀",
    		description: "woman pouting: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64E 1F3FD",
    		emoji: "🙎🏽‍♀️",
    		description: "woman pouting: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64E 1F3FD",
    		emoji: "🙎🏽‍♀",
    		description: "woman pouting: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64E 1F3FE",
    		emoji: "🙎🏾‍♀️",
    		description: "woman pouting: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64E 1F3FE",
    		emoji: "🙎🏾‍♀",
    		description: "woman pouting: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64E 1F3FF",
    		emoji: "🙎🏿‍♀️",
    		description: "woman pouting: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64E 1F3FF",
    		emoji: "🙎🏿‍♀",
    		description: "woman pouting: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645",
    		emoji: "🙅",
    		description: "person gesturing NO",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645 1F3FB",
    		emoji: "🙅🏻",
    		description: "person gesturing NO: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645 1F3FC",
    		emoji: "🙅🏼",
    		description: "person gesturing NO: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645 1F3FD",
    		emoji: "🙅🏽",
    		description: "person gesturing NO: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645 1F3FE",
    		emoji: "🙅🏾",
    		description: "person gesturing NO: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645 1F3FF",
    		emoji: "🙅🏿",
    		description: "person gesturing NO: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645 1F3FB",
    		emoji: "🙅🏻‍♂️",
    		description: "man gesturing NO: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645 1F3FB",
    		emoji: "🙅🏻‍♂",
    		description: "man gesturing NO: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645 1F3FC",
    		emoji: "🙅🏼‍♂️",
    		description: "man gesturing NO: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645 1F3FC",
    		emoji: "🙅🏼‍♂",
    		description: "man gesturing NO: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645 1F3FD",
    		emoji: "🙅🏽‍♂️",
    		description: "man gesturing NO: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645 1F3FD",
    		emoji: "🙅🏽‍♂",
    		description: "man gesturing NO: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645 1F3FE",
    		emoji: "🙅🏾‍♂️",
    		description: "man gesturing NO: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645 1F3FE",
    		emoji: "🙅🏾‍♂",
    		description: "man gesturing NO: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645 1F3FF",
    		emoji: "🙅🏿‍♂️",
    		description: "man gesturing NO: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645 1F3FF",
    		emoji: "🙅🏿‍♂",
    		description: "man gesturing NO: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645 1F3FB",
    		emoji: "🙅🏻‍♀️",
    		description: "woman gesturing NO: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645 1F3FB",
    		emoji: "🙅🏻‍♀",
    		description: "woman gesturing NO: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645 1F3FC",
    		emoji: "🙅🏼‍♀️",
    		description: "woman gesturing NO: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645 1F3FC",
    		emoji: "🙅🏼‍♀",
    		description: "woman gesturing NO: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645 1F3FD",
    		emoji: "🙅🏽‍♀️",
    		description: "woman gesturing NO: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645 1F3FD",
    		emoji: "🙅🏽‍♀",
    		description: "woman gesturing NO: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645 1F3FE",
    		emoji: "🙅🏾‍♀️",
    		description: "woman gesturing NO: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645 1F3FE",
    		emoji: "🙅🏾‍♀",
    		description: "woman gesturing NO: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645 1F3FF",
    		emoji: "🙅🏿‍♀️",
    		description: "woman gesturing NO: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F645 1F3FF",
    		emoji: "🙅🏿‍♀",
    		description: "woman gesturing NO: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646",
    		emoji: "🙆",
    		description: "person gesturing OK",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646 1F3FB",
    		emoji: "🙆🏻",
    		description: "person gesturing OK: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646 1F3FC",
    		emoji: "🙆🏼",
    		description: "person gesturing OK: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646 1F3FD",
    		emoji: "🙆🏽",
    		description: "person gesturing OK: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646 1F3FE",
    		emoji: "🙆🏾",
    		description: "person gesturing OK: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646 1F3FF",
    		emoji: "🙆🏿",
    		description: "person gesturing OK: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646 1F3FB",
    		emoji: "🙆🏻‍♂️",
    		description: "man gesturing OK: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646 1F3FB",
    		emoji: "🙆🏻‍♂",
    		description: "man gesturing OK: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646 1F3FC",
    		emoji: "🙆🏼‍♂️",
    		description: "man gesturing OK: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646 1F3FC",
    		emoji: "🙆🏼‍♂",
    		description: "man gesturing OK: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646 1F3FD",
    		emoji: "🙆🏽‍♂️",
    		description: "man gesturing OK: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646 1F3FD",
    		emoji: "🙆🏽‍♂",
    		description: "man gesturing OK: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646 1F3FE",
    		emoji: "🙆🏾‍♂️",
    		description: "man gesturing OK: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646 1F3FE",
    		emoji: "🙆🏾‍♂",
    		description: "man gesturing OK: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646 1F3FF",
    		emoji: "🙆🏿‍♂️",
    		description: "man gesturing OK: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646 1F3FF",
    		emoji: "🙆🏿‍♂",
    		description: "man gesturing OK: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646 1F3FB",
    		emoji: "🙆🏻‍♀️",
    		description: "woman gesturing OK: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646 1F3FB",
    		emoji: "🙆🏻‍♀",
    		description: "woman gesturing OK: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646 1F3FC",
    		emoji: "🙆🏼‍♀️",
    		description: "woman gesturing OK: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646 1F3FC",
    		emoji: "🙆🏼‍♀",
    		description: "woman gesturing OK: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646 1F3FD",
    		emoji: "🙆🏽‍♀️",
    		description: "woman gesturing OK: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646 1F3FD",
    		emoji: "🙆🏽‍♀",
    		description: "woman gesturing OK: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646 1F3FE",
    		emoji: "🙆🏾‍♀️",
    		description: "woman gesturing OK: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646 1F3FE",
    		emoji: "🙆🏾‍♀",
    		description: "woman gesturing OK: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646 1F3FF",
    		emoji: "🙆🏿‍♀️",
    		description: "woman gesturing OK: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F646 1F3FF",
    		emoji: "🙆🏿‍♀",
    		description: "woman gesturing OK: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F481",
    		emoji: "💁",
    		description: "person tipping hand",
    		keywords: [
    			"person tipping hand"
    		]
    	},
    	{
    		unicode: "1F481 1F3FB",
    		emoji: "💁🏻",
    		description: "person tipping hand: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F481 1F3FC",
    		emoji: "💁🏼",
    		description: "person tipping hand: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F481 1F3FD",
    		emoji: "💁🏽",
    		description: "person tipping hand: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F481 1F3FE",
    		emoji: "💁🏾",
    		description: "person tipping hand: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F481 1F3FF",
    		emoji: "💁🏿",
    		description: "person tipping hand: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F481 1F3FB",
    		emoji: "💁🏻‍♂️",
    		description: "man tipping hand: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F481 1F3FB",
    		emoji: "💁🏻‍♂",
    		description: "man tipping hand: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F481 1F3FC",
    		emoji: "💁🏼‍♂️",
    		description: "man tipping hand: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F481 1F3FC",
    		emoji: "💁🏼‍♂",
    		description: "man tipping hand: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F481 1F3FD",
    		emoji: "💁🏽‍♂️",
    		description: "man tipping hand: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F481 1F3FD",
    		emoji: "💁🏽‍♂",
    		description: "man tipping hand: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F481 1F3FE",
    		emoji: "💁🏾‍♂️",
    		description: "man tipping hand: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F481 1F3FE",
    		emoji: "💁🏾‍♂",
    		description: "man tipping hand: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F481 1F3FF",
    		emoji: "💁🏿‍♂️",
    		description: "man tipping hand: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F481 1F3FF",
    		emoji: "💁🏿‍♂",
    		description: "man tipping hand: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F481 1F3FB",
    		emoji: "💁🏻‍♀️",
    		description: "woman tipping hand: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F481 1F3FB",
    		emoji: "💁🏻‍♀",
    		description: "woman tipping hand: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F481 1F3FC",
    		emoji: "💁🏼‍♀️",
    		description: "woman tipping hand: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F481 1F3FC",
    		emoji: "💁🏼‍♀",
    		description: "woman tipping hand: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F481 1F3FD",
    		emoji: "💁🏽‍♀️",
    		description: "woman tipping hand: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F481 1F3FD",
    		emoji: "💁🏽‍♀",
    		description: "woman tipping hand: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F481 1F3FE",
    		emoji: "💁🏾‍♀️",
    		description: "woman tipping hand: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F481 1F3FE",
    		emoji: "💁🏾‍♀",
    		description: "woman tipping hand: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F481 1F3FF",
    		emoji: "💁🏿‍♀️",
    		description: "woman tipping hand: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F481 1F3FF",
    		emoji: "💁🏿‍♀",
    		description: "woman tipping hand: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64B",
    		emoji: "🙋",
    		description: "person raising hand",
    		keywords: [
    			"person raising hand"
    		]
    	},
    	{
    		unicode: "1F64B 1F3FB",
    		emoji: "🙋🏻",
    		description: "person raising hand: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64B 1F3FC",
    		emoji: "🙋🏼",
    		description: "person raising hand: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64B 1F3FD",
    		emoji: "🙋🏽",
    		description: "person raising hand: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64B 1F3FE",
    		emoji: "🙋🏾",
    		description: "person raising hand: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64B 1F3FF",
    		emoji: "🙋🏿",
    		description: "person raising hand: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64B 1F3FB",
    		emoji: "🙋🏻‍♂️",
    		description: "man raising hand: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64B 1F3FB",
    		emoji: "🙋🏻‍♂",
    		description: "man raising hand: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64B 1F3FC",
    		emoji: "🙋🏼‍♂️",
    		description: "man raising hand: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64B 1F3FC",
    		emoji: "🙋🏼‍♂",
    		description: "man raising hand: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64B 1F3FD",
    		emoji: "🙋🏽‍♂️",
    		description: "man raising hand: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64B 1F3FD",
    		emoji: "🙋🏽‍♂",
    		description: "man raising hand: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64B 1F3FE",
    		emoji: "🙋🏾‍♂️",
    		description: "man raising hand: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64B 1F3FE",
    		emoji: "🙋🏾‍♂",
    		description: "man raising hand: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64B 1F3FF",
    		emoji: "🙋🏿‍♂️",
    		description: "man raising hand: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64B 1F3FF",
    		emoji: "🙋🏿‍♂",
    		description: "man raising hand: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64B 1F3FB",
    		emoji: "🙋🏻‍♀️",
    		description: "woman raising hand: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64B 1F3FB",
    		emoji: "🙋🏻‍♀",
    		description: "woman raising hand: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64B 1F3FC",
    		emoji: "🙋🏼‍♀️",
    		description: "woman raising hand: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64B 1F3FC",
    		emoji: "🙋🏼‍♀",
    		description: "woman raising hand: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64B 1F3FD",
    		emoji: "🙋🏽‍♀️",
    		description: "woman raising hand: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64B 1F3FD",
    		emoji: "🙋🏽‍♀",
    		description: "woman raising hand: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64B 1F3FE",
    		emoji: "🙋🏾‍♀️",
    		description: "woman raising hand: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64B 1F3FE",
    		emoji: "🙋🏾‍♀",
    		description: "woman raising hand: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64B 1F3FF",
    		emoji: "🙋🏿‍♀️",
    		description: "woman raising hand: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F64B 1F3FF",
    		emoji: "🙋🏿‍♀",
    		description: "woman raising hand: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CF",
    		emoji: "🧏",
    		description: "deaf person",
    		keywords: [
    			"deaf person"
    		]
    	},
    	{
    		unicode: "1F9CF 1F3FB",
    		emoji: "🧏🏻",
    		description: "deaf person: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CF 1F3FC",
    		emoji: "🧏🏼",
    		description: "deaf person: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CF 1F3FD",
    		emoji: "🧏🏽",
    		description: "deaf person: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CF 1F3FE",
    		emoji: "🧏🏾",
    		description: "deaf person: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CF 1F3FF",
    		emoji: "🧏🏿",
    		description: "deaf person: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CF 1F3FB",
    		emoji: "🧏🏻‍♂️",
    		description: "deaf man: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CF 1F3FB",
    		emoji: "🧏🏻‍♂",
    		description: "deaf man: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CF 1F3FC",
    		emoji: "🧏🏼‍♂️",
    		description: "deaf man: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CF 1F3FC",
    		emoji: "🧏🏼‍♂",
    		description: "deaf man: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CF 1F3FD",
    		emoji: "🧏🏽‍♂️",
    		description: "deaf man: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CF 1F3FD",
    		emoji: "🧏🏽‍♂",
    		description: "deaf man: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CF 1F3FE",
    		emoji: "🧏🏾‍♂️",
    		description: "deaf man: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CF 1F3FE",
    		emoji: "🧏🏾‍♂",
    		description: "deaf man: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CF 1F3FF",
    		emoji: "🧏🏿‍♂️",
    		description: "deaf man: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CF 1F3FF",
    		emoji: "🧏🏿‍♂",
    		description: "deaf man: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CF 1F3FB",
    		emoji: "🧏🏻‍♀️",
    		description: "deaf woman: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CF 1F3FB",
    		emoji: "🧏🏻‍♀",
    		description: "deaf woman: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CF 1F3FC",
    		emoji: "🧏🏼‍♀️",
    		description: "deaf woman: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CF 1F3FC",
    		emoji: "🧏🏼‍♀",
    		description: "deaf woman: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CF 1F3FD",
    		emoji: "🧏🏽‍♀️",
    		description: "deaf woman: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CF 1F3FD",
    		emoji: "🧏🏽‍♀",
    		description: "deaf woman: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CF 1F3FE",
    		emoji: "🧏🏾‍♀️",
    		description: "deaf woman: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CF 1F3FE",
    		emoji: "🧏🏾‍♀",
    		description: "deaf woman: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CF 1F3FF",
    		emoji: "🧏🏿‍♀️",
    		description: "deaf woman: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CF 1F3FF",
    		emoji: "🧏🏿‍♀",
    		description: "deaf woman: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F647",
    		emoji: "🙇",
    		description: "person bowing",
    		keywords: [
    			"person bowing"
    		]
    	},
    	{
    		unicode: "1F647 1F3FB",
    		emoji: "🙇🏻",
    		description: "person bowing: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F647 1F3FC",
    		emoji: "🙇🏼",
    		description: "person bowing: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F647 1F3FD",
    		emoji: "🙇🏽",
    		description: "person bowing: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F647 1F3FE",
    		emoji: "🙇🏾",
    		description: "person bowing: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F647 1F3FF",
    		emoji: "🙇🏿",
    		description: "person bowing: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F647 1F3FB",
    		emoji: "🙇🏻‍♂️",
    		description: "man bowing: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F647 1F3FB",
    		emoji: "🙇🏻‍♂",
    		description: "man bowing: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F647 1F3FC",
    		emoji: "🙇🏼‍♂️",
    		description: "man bowing: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F647 1F3FC",
    		emoji: "🙇🏼‍♂",
    		description: "man bowing: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F647 1F3FD",
    		emoji: "🙇🏽‍♂️",
    		description: "man bowing: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F647 1F3FD",
    		emoji: "🙇🏽‍♂",
    		description: "man bowing: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F647 1F3FE",
    		emoji: "🙇🏾‍♂️",
    		description: "man bowing: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F647 1F3FE",
    		emoji: "🙇🏾‍♂",
    		description: "man bowing: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F647 1F3FF",
    		emoji: "🙇🏿‍♂️",
    		description: "man bowing: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F647 1F3FF",
    		emoji: "🙇🏿‍♂",
    		description: "man bowing: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F647 1F3FB",
    		emoji: "🙇🏻‍♀️",
    		description: "woman bowing: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F647 1F3FB",
    		emoji: "🙇🏻‍♀",
    		description: "woman bowing: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F647 1F3FC",
    		emoji: "🙇🏼‍♀️",
    		description: "woman bowing: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F647 1F3FC",
    		emoji: "🙇🏼‍♀",
    		description: "woman bowing: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F647 1F3FD",
    		emoji: "🙇🏽‍♀️",
    		description: "woman bowing: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F647 1F3FD",
    		emoji: "🙇🏽‍♀",
    		description: "woman bowing: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F647 1F3FE",
    		emoji: "🙇🏾‍♀️",
    		description: "woman bowing: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F647 1F3FE",
    		emoji: "🙇🏾‍♀",
    		description: "woman bowing: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F647 1F3FF",
    		emoji: "🙇🏿‍♀️",
    		description: "woman bowing: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F647 1F3FF",
    		emoji: "🙇🏿‍♀",
    		description: "woman bowing: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F926",
    		emoji: "🤦",
    		description: "person facepalming",
    		keywords: [
    			"person facepalming"
    		]
    	},
    	{
    		unicode: "1F926 1F3FB",
    		emoji: "🤦🏻",
    		description: "person facepalming: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F926 1F3FC",
    		emoji: "🤦🏼",
    		description: "person facepalming: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F926 1F3FD",
    		emoji: "🤦🏽",
    		description: "person facepalming: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F926 1F3FE",
    		emoji: "🤦🏾",
    		description: "person facepalming: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F926 1F3FF",
    		emoji: "🤦🏿",
    		description: "person facepalming: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F926 1F3FB",
    		emoji: "🤦🏻‍♂️",
    		description: "man facepalming: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F926 1F3FB",
    		emoji: "🤦🏻‍♂",
    		description: "man facepalming: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F926 1F3FC",
    		emoji: "🤦🏼‍♂️",
    		description: "man facepalming: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F926 1F3FC",
    		emoji: "🤦🏼‍♂",
    		description: "man facepalming: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F926 1F3FD",
    		emoji: "🤦🏽‍♂️",
    		description: "man facepalming: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F926 1F3FD",
    		emoji: "🤦🏽‍♂",
    		description: "man facepalming: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F926 1F3FE",
    		emoji: "🤦🏾‍♂️",
    		description: "man facepalming: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F926 1F3FE",
    		emoji: "🤦🏾‍♂",
    		description: "man facepalming: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F926 1F3FF",
    		emoji: "🤦🏿‍♂️",
    		description: "man facepalming: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F926 1F3FF",
    		emoji: "🤦🏿‍♂",
    		description: "man facepalming: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F926 1F3FB",
    		emoji: "🤦🏻‍♀️",
    		description: "woman facepalming: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F926 1F3FB",
    		emoji: "🤦🏻‍♀",
    		description: "woman facepalming: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F926 1F3FC",
    		emoji: "🤦🏼‍♀️",
    		description: "woman facepalming: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F926 1F3FC",
    		emoji: "🤦🏼‍♀",
    		description: "woman facepalming: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F926 1F3FD",
    		emoji: "🤦🏽‍♀️",
    		description: "woman facepalming: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F926 1F3FD",
    		emoji: "🤦🏽‍♀",
    		description: "woman facepalming: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F926 1F3FE",
    		emoji: "🤦🏾‍♀️",
    		description: "woman facepalming: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F926 1F3FE",
    		emoji: "🤦🏾‍♀",
    		description: "woman facepalming: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F926 1F3FF",
    		emoji: "🤦🏿‍♀️",
    		description: "woman facepalming: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F926 1F3FF",
    		emoji: "🤦🏿‍♀",
    		description: "woman facepalming: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F937",
    		emoji: "🤷",
    		description: "person shrugging",
    		keywords: [
    			"person shrugging"
    		]
    	},
    	{
    		unicode: "1F937 1F3FB",
    		emoji: "🤷🏻",
    		description: "person shrugging: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F937 1F3FC",
    		emoji: "🤷🏼",
    		description: "person shrugging: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F937 1F3FD",
    		emoji: "🤷🏽",
    		description: "person shrugging: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F937 1F3FE",
    		emoji: "🤷🏾",
    		description: "person shrugging: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F937 1F3FF",
    		emoji: "🤷🏿",
    		description: "person shrugging: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F937 1F3FB",
    		emoji: "🤷🏻‍♂️",
    		description: "man shrugging: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F937 1F3FB",
    		emoji: "🤷🏻‍♂",
    		description: "man shrugging: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F937 1F3FC",
    		emoji: "🤷🏼‍♂️",
    		description: "man shrugging: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F937 1F3FC",
    		emoji: "🤷🏼‍♂",
    		description: "man shrugging: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F937 1F3FD",
    		emoji: "🤷🏽‍♂️",
    		description: "man shrugging: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F937 1F3FD",
    		emoji: "🤷🏽‍♂",
    		description: "man shrugging: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F937 1F3FE",
    		emoji: "🤷🏾‍♂️",
    		description: "man shrugging: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F937 1F3FE",
    		emoji: "🤷🏾‍♂",
    		description: "man shrugging: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F937 1F3FF",
    		emoji: "🤷🏿‍♂️",
    		description: "man shrugging: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F937 1F3FF",
    		emoji: "🤷🏿‍♂",
    		description: "man shrugging: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F937 1F3FB",
    		emoji: "🤷🏻‍♀️",
    		description: "woman shrugging: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F937 1F3FB",
    		emoji: "🤷🏻‍♀",
    		description: "woman shrugging: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F937 1F3FC",
    		emoji: "🤷🏼‍♀️",
    		description: "woman shrugging: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F937 1F3FC",
    		emoji: "🤷🏼‍♀",
    		description: "woman shrugging: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F937 1F3FD",
    		emoji: "🤷🏽‍♀️",
    		description: "woman shrugging: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F937 1F3FD",
    		emoji: "🤷🏽‍♀",
    		description: "woman shrugging: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F937 1F3FE",
    		emoji: "🤷🏾‍♀️",
    		description: "woman shrugging: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F937 1F3FE",
    		emoji: "🤷🏾‍♀",
    		description: "woman shrugging: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F937 1F3FF",
    		emoji: "🤷🏿‍♀️",
    		description: "woman shrugging: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F937 1F3FF",
    		emoji: "🤷🏿‍♀",
    		description: "woman shrugging: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍⚕️",
    		description: "health worker: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍⚕",
    		description: "health worker: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍⚕️",
    		description: "health worker: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍⚕",
    		description: "health worker: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍⚕️",
    		description: "health worker: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍⚕",
    		description: "health worker: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍⚕️",
    		description: "health worker: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍⚕",
    		description: "health worker: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍⚕️",
    		description: "health worker: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍⚕",
    		description: "health worker: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍⚕️",
    		description: "man health worker: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍⚕",
    		description: "man health worker: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍⚕️",
    		description: "man health worker: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍⚕",
    		description: "man health worker: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍⚕️",
    		description: "man health worker: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍⚕",
    		description: "man health worker: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍⚕️",
    		description: "man health worker: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍⚕",
    		description: "man health worker: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍⚕️",
    		description: "man health worker: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍⚕",
    		description: "man health worker: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍⚕️",
    		description: "woman health worker: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍⚕",
    		description: "woman health worker: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍⚕️",
    		description: "woman health worker: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍⚕",
    		description: "woman health worker: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍⚕️",
    		description: "woman health worker: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍⚕",
    		description: "woman health worker: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍⚕️",
    		description: "woman health worker: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍⚕",
    		description: "woman health worker: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍⚕️",
    		description: "woman health worker: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍⚕",
    		description: "woman health worker: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍🎓",
    		description: "student: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍🎓",
    		description: "student: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍🎓",
    		description: "student: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍🎓",
    		description: "student: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍🎓",
    		description: "student: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍🎓",
    		description: "man student: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍🎓",
    		description: "man student: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍🎓",
    		description: "man student: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍🎓",
    		description: "man student: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍🎓",
    		description: "man student: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍🎓",
    		description: "woman student: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍🎓",
    		description: "woman student: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍🎓",
    		description: "woman student: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍🎓",
    		description: "woman student: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍🎓",
    		description: "woman student: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍🏫",
    		description: "teacher: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍🏫",
    		description: "teacher: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍🏫",
    		description: "teacher: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍🏫",
    		description: "teacher: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍🏫",
    		description: "teacher: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍🏫",
    		description: "man teacher: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍🏫",
    		description: "man teacher: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍🏫",
    		description: "man teacher: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍🏫",
    		description: "man teacher: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍🏫",
    		description: "man teacher: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍🏫",
    		description: "woman teacher: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍🏫",
    		description: "woman teacher: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍🏫",
    		description: "woman teacher: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍🏫",
    		description: "woman teacher: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍🏫",
    		description: "woman teacher: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍⚖️",
    		description: "judge: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍⚖",
    		description: "judge: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍⚖️",
    		description: "judge: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍⚖",
    		description: "judge: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍⚖️",
    		description: "judge: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍⚖",
    		description: "judge: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍⚖️",
    		description: "judge: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍⚖",
    		description: "judge: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍⚖️",
    		description: "judge: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍⚖",
    		description: "judge: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍⚖️",
    		description: "man judge: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍⚖",
    		description: "man judge: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍⚖️",
    		description: "man judge: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍⚖",
    		description: "man judge: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍⚖️",
    		description: "man judge: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍⚖",
    		description: "man judge: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍⚖️",
    		description: "man judge: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍⚖",
    		description: "man judge: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍⚖️",
    		description: "man judge: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍⚖",
    		description: "man judge: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍⚖️",
    		description: "woman judge: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍⚖",
    		description: "woman judge: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍⚖️",
    		description: "woman judge: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍⚖",
    		description: "woman judge: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍⚖️",
    		description: "woman judge: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍⚖",
    		description: "woman judge: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍⚖️",
    		description: "woman judge: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍⚖",
    		description: "woman judge: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍⚖️",
    		description: "woman judge: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍⚖",
    		description: "woman judge: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍🌾",
    		description: "farmer: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍🌾",
    		description: "farmer: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍🌾",
    		description: "farmer: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍🌾",
    		description: "farmer: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍🌾",
    		description: "farmer: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍🌾",
    		description: "man farmer: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍🌾",
    		description: "man farmer: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍🌾",
    		description: "man farmer: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍🌾",
    		description: "man farmer: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍🌾",
    		description: "man farmer: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍🌾",
    		description: "woman farmer: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍🌾",
    		description: "woman farmer: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍🌾",
    		description: "woman farmer: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍🌾",
    		description: "woman farmer: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍🌾",
    		description: "woman farmer: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F47C",
    		emoji: "👼",
    		description: "baby angel",
    		keywords: [
    			"baby angel"
    		]
    	},
    	{
    		unicode: "1F47C 1F3FB",
    		emoji: "👼🏻",
    		description: "baby angel: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F47C 1F3FC",
    		emoji: "👼🏼",
    		description: "baby angel: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F47C 1F3FD",
    		emoji: "👼🏽",
    		description: "baby angel: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F47C 1F3FE",
    		emoji: "👼🏾",
    		description: "baby angel: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F47C 1F3FF",
    		emoji: "👼🏿",
    		description: "baby angel: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F385",
    		emoji: "🎅",
    		description: "Santa Claus",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F385 1F3FB",
    		emoji: "🎅🏻",
    		description: "Santa Claus: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F385 1F3FC",
    		emoji: "🎅🏼",
    		description: "Santa Claus: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F385 1F3FD",
    		emoji: "🎅🏽",
    		description: "Santa Claus: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F385 1F3FE",
    		emoji: "🎅🏾",
    		description: "Santa Claus: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F385 1F3FF",
    		emoji: "🎅🏿",
    		description: "Santa Claus: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F936",
    		emoji: "🤶",
    		description: "Mrs. Claus",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F936 1F3FB",
    		emoji: "🤶🏻",
    		description: "Mrs. Claus: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F936 1F3FC",
    		emoji: "🤶🏼",
    		description: "Mrs. Claus: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F936 1F3FD",
    		emoji: "🤶🏽",
    		description: "Mrs. Claus: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F936 1F3FE",
    		emoji: "🤶🏾",
    		description: "Mrs. Claus: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F936 1F3FF",
    		emoji: "🤶🏿",
    		description: "Mrs. Claus: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍🎄",
    		description: "mx claus: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍🎄",
    		description: "mx claus: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍🎄",
    		description: "mx claus: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍🎄",
    		description: "mx claus: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍🎄",
    		description: "mx claus: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8",
    		emoji: "🦸",
    		description: "superhero",
    		keywords: [
    			"superhero"
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FB",
    		emoji: "🦸🏻",
    		description: "superhero: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FC",
    		emoji: "🦸🏼",
    		description: "superhero: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FD",
    		emoji: "🦸🏽",
    		description: "superhero: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FE",
    		emoji: "🦸🏾",
    		description: "superhero: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FF",
    		emoji: "🦸🏿",
    		description: "superhero: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FB",
    		emoji: "🦸🏻‍♂️",
    		description: "man superhero: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FB",
    		emoji: "🦸🏻‍♂",
    		description: "man superhero: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FC",
    		emoji: "🦸🏼‍♂️",
    		description: "man superhero: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FC",
    		emoji: "🦸🏼‍♂",
    		description: "man superhero: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FD",
    		emoji: "🦸🏽‍♂️",
    		description: "man superhero: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FD",
    		emoji: "🦸🏽‍♂",
    		description: "man superhero: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FE",
    		emoji: "🦸🏾‍♂️",
    		description: "man superhero: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FE",
    		emoji: "🦸🏾‍♂",
    		description: "man superhero: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FF",
    		emoji: "🦸🏿‍♂️",
    		description: "man superhero: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FF",
    		emoji: "🦸🏿‍♂",
    		description: "man superhero: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FB",
    		emoji: "🦸🏻‍♀️",
    		description: "woman superhero: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FB",
    		emoji: "🦸🏻‍♀",
    		description: "woman superhero: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FC",
    		emoji: "🦸🏼‍♀️",
    		description: "woman superhero: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FC",
    		emoji: "🦸🏼‍♀",
    		description: "woman superhero: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FD",
    		emoji: "🦸🏽‍♀️",
    		description: "woman superhero: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FD",
    		emoji: "🦸🏽‍♀",
    		description: "woman superhero: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FE",
    		emoji: "🦸🏾‍♀️",
    		description: "woman superhero: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FE",
    		emoji: "🦸🏾‍♀",
    		description: "woman superhero: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FF",
    		emoji: "🦸🏿‍♀️",
    		description: "woman superhero: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FF",
    		emoji: "🦸🏿‍♀",
    		description: "woman superhero: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9",
    		emoji: "🦹",
    		description: "supervillain",
    		keywords: [
    			"supervillain"
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FB",
    		emoji: "🦹🏻",
    		description: "supervillain: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FC",
    		emoji: "🦹🏼",
    		description: "supervillain: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FD",
    		emoji: "🦹🏽",
    		description: "supervillain: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FE",
    		emoji: "🦹🏾",
    		description: "supervillain: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FF",
    		emoji: "🦹🏿",
    		description: "supervillain: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FB",
    		emoji: "🦹🏻‍♂️",
    		description: "man supervillain: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FB",
    		emoji: "🦹🏻‍♂",
    		description: "man supervillain: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FC",
    		emoji: "🦹🏼‍♂️",
    		description: "man supervillain: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FC",
    		emoji: "🦹🏼‍♂",
    		description: "man supervillain: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FD",
    		emoji: "🦹🏽‍♂️",
    		description: "man supervillain: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FD",
    		emoji: "🦹🏽‍♂",
    		description: "man supervillain: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FE",
    		emoji: "🦹🏾‍♂️",
    		description: "man supervillain: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FE",
    		emoji: "🦹🏾‍♂",
    		description: "man supervillain: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FF",
    		emoji: "🦹🏿‍♂️",
    		description: "man supervillain: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FF",
    		emoji: "🦹🏿‍♂",
    		description: "man supervillain: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FB",
    		emoji: "🦹🏻‍♀️",
    		description: "woman supervillain: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FB",
    		emoji: "🦹🏻‍♀",
    		description: "woman supervillain: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FC",
    		emoji: "🦹🏼‍♀️",
    		description: "woman supervillain: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FC",
    		emoji: "🦹🏼‍♀",
    		description: "woman supervillain: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FD",
    		emoji: "🦹🏽‍♀️",
    		description: "woman supervillain: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FD",
    		emoji: "🦹🏽‍♀",
    		description: "woman supervillain: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FE",
    		emoji: "🦹🏾‍♀️",
    		description: "woman supervillain: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FE",
    		emoji: "🦹🏾‍♀",
    		description: "woman supervillain: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FF",
    		emoji: "🦹🏿‍♀️",
    		description: "woman supervillain: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FF",
    		emoji: "🦹🏿‍♀",
    		description: "woman supervillain: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9",
    		emoji: "🧙",
    		description: "mage",
    		keywords: [
    			"mage"
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FB",
    		emoji: "🧙🏻",
    		description: "mage: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FC",
    		emoji: "🧙🏼",
    		description: "mage: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FD",
    		emoji: "🧙🏽",
    		description: "mage: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FE",
    		emoji: "🧙🏾",
    		description: "mage: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FF",
    		emoji: "🧙🏿",
    		description: "mage: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FB",
    		emoji: "🧙🏻‍♂️",
    		description: "man mage: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FB",
    		emoji: "🧙🏻‍♂",
    		description: "man mage: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FC",
    		emoji: "🧙🏼‍♂️",
    		description: "man mage: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FC",
    		emoji: "🧙🏼‍♂",
    		description: "man mage: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FD",
    		emoji: "🧙🏽‍♂️",
    		description: "man mage: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FD",
    		emoji: "🧙🏽‍♂",
    		description: "man mage: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FE",
    		emoji: "🧙🏾‍♂️",
    		description: "man mage: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FE",
    		emoji: "🧙🏾‍♂",
    		description: "man mage: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FF",
    		emoji: "🧙🏿‍♂️",
    		description: "man mage: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FF",
    		emoji: "🧙🏿‍♂",
    		description: "man mage: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FB",
    		emoji: "🧙🏻‍♀️",
    		description: "woman mage: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FB",
    		emoji: "🧙🏻‍♀",
    		description: "woman mage: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FC",
    		emoji: "🧙🏼‍♀️",
    		description: "woman mage: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FC",
    		emoji: "🧙🏼‍♀",
    		description: "woman mage: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FD",
    		emoji: "🧙🏽‍♀️",
    		description: "woman mage: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FD",
    		emoji: "🧙🏽‍♀",
    		description: "woman mage: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FE",
    		emoji: "🧙🏾‍♀️",
    		description: "woman mage: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FE",
    		emoji: "🧙🏾‍♀",
    		description: "woman mage: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FF",
    		emoji: "🧙🏿‍♀️",
    		description: "woman mage: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FF",
    		emoji: "🧙🏿‍♀",
    		description: "woman mage: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA",
    		emoji: "🧚",
    		description: "fairy",
    		keywords: [
    			"fairy"
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FB",
    		emoji: "🧚🏻",
    		description: "fairy: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FC",
    		emoji: "🧚🏼",
    		description: "fairy: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FD",
    		emoji: "🧚🏽",
    		description: "fairy: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FE",
    		emoji: "🧚🏾",
    		description: "fairy: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FF",
    		emoji: "🧚🏿",
    		description: "fairy: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FB",
    		emoji: "🧚🏻‍♂️",
    		description: "man fairy: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FB",
    		emoji: "🧚🏻‍♂",
    		description: "man fairy: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FC",
    		emoji: "🧚🏼‍♂️",
    		description: "man fairy: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FC",
    		emoji: "🧚🏼‍♂",
    		description: "man fairy: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FD",
    		emoji: "🧚🏽‍♂️",
    		description: "man fairy: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FD",
    		emoji: "🧚🏽‍♂",
    		description: "man fairy: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FE",
    		emoji: "🧚🏾‍♂️",
    		description: "man fairy: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FE",
    		emoji: "🧚🏾‍♂",
    		description: "man fairy: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FF",
    		emoji: "🧚🏿‍♂️",
    		description: "man fairy: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FF",
    		emoji: "🧚🏿‍♂",
    		description: "man fairy: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FB",
    		emoji: "🧚🏻‍♀️",
    		description: "woman fairy: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FB",
    		emoji: "🧚🏻‍♀",
    		description: "woman fairy: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FC",
    		emoji: "🧚🏼‍♀️",
    		description: "woman fairy: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FC",
    		emoji: "🧚🏼‍♀",
    		description: "woman fairy: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FD",
    		emoji: "🧚🏽‍♀️",
    		description: "woman fairy: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FD",
    		emoji: "🧚🏽‍♀",
    		description: "woman fairy: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FE",
    		emoji: "🧚🏾‍♀️",
    		description: "woman fairy: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FE",
    		emoji: "🧚🏾‍♀",
    		description: "woman fairy: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FF",
    		emoji: "🧚🏿‍♀️",
    		description: "woman fairy: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FF",
    		emoji: "🧚🏿‍♀",
    		description: "woman fairy: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB",
    		emoji: "🧛",
    		description: "vampire",
    		keywords: [
    			"vampire"
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FB",
    		emoji: "🧛🏻",
    		description: "vampire: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FC",
    		emoji: "🧛🏼",
    		description: "vampire: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FD",
    		emoji: "🧛🏽",
    		description: "vampire: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FE",
    		emoji: "🧛🏾",
    		description: "vampire: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FF",
    		emoji: "🧛🏿",
    		description: "vampire: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FB",
    		emoji: "🧛🏻‍♂️",
    		description: "man vampire: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FB",
    		emoji: "🧛🏻‍♂",
    		description: "man vampire: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FC",
    		emoji: "🧛🏼‍♂️",
    		description: "man vampire: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FC",
    		emoji: "🧛🏼‍♂",
    		description: "man vampire: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FD",
    		emoji: "🧛🏽‍♂️",
    		description: "man vampire: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FD",
    		emoji: "🧛🏽‍♂",
    		description: "man vampire: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FE",
    		emoji: "🧛🏾‍♂️",
    		description: "man vampire: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FE",
    		emoji: "🧛🏾‍♂",
    		description: "man vampire: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FF",
    		emoji: "🧛🏿‍♂️",
    		description: "man vampire: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FF",
    		emoji: "🧛🏿‍♂",
    		description: "man vampire: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FB",
    		emoji: "🧛🏻‍♀️",
    		description: "woman vampire: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FB",
    		emoji: "🧛🏻‍♀",
    		description: "woman vampire: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FC",
    		emoji: "🧛🏼‍♀️",
    		description: "woman vampire: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FC",
    		emoji: "🧛🏼‍♀",
    		description: "woman vampire: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FD",
    		emoji: "🧛🏽‍♀️",
    		description: "woman vampire: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FD",
    		emoji: "🧛🏽‍♀",
    		description: "woman vampire: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FE",
    		emoji: "🧛🏾‍♀️",
    		description: "woman vampire: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FE",
    		emoji: "🧛🏾‍♀",
    		description: "woman vampire: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FF",
    		emoji: "🧛🏿‍♀️",
    		description: "woman vampire: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FF",
    		emoji: "🧛🏿‍♀",
    		description: "woman vampire: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC",
    		emoji: "🧜",
    		description: "merperson",
    		keywords: [
    			"merperson"
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FB",
    		emoji: "🧜🏻",
    		description: "merperson: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FC",
    		emoji: "🧜🏼",
    		description: "merperson: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FD",
    		emoji: "🧜🏽",
    		description: "merperson: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FE",
    		emoji: "🧜🏾",
    		description: "merperson: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FF",
    		emoji: "🧜🏿",
    		description: "merperson: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FB",
    		emoji: "🧜🏻‍♂️",
    		description: "merman: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FB",
    		emoji: "🧜🏻‍♂",
    		description: "merman: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FC",
    		emoji: "🧜🏼‍♂️",
    		description: "merman: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FC",
    		emoji: "🧜🏼‍♂",
    		description: "merman: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FD",
    		emoji: "🧜🏽‍♂️",
    		description: "merman: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FD",
    		emoji: "🧜🏽‍♂",
    		description: "merman: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FE",
    		emoji: "🧜🏾‍♂️",
    		description: "merman: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FE",
    		emoji: "🧜🏾‍♂",
    		description: "merman: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FF",
    		emoji: "🧜🏿‍♂️",
    		description: "merman: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FF",
    		emoji: "🧜🏿‍♂",
    		description: "merman: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FB",
    		emoji: "🧜🏻‍♀️",
    		description: "mermaid: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FB",
    		emoji: "🧜🏻‍♀",
    		description: "mermaid: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FC",
    		emoji: "🧜🏼‍♀️",
    		description: "mermaid: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FC",
    		emoji: "🧜🏼‍♀",
    		description: "mermaid: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FD",
    		emoji: "🧜🏽‍♀️",
    		description: "mermaid: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FD",
    		emoji: "🧜🏽‍♀",
    		description: "mermaid: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FE",
    		emoji: "🧜🏾‍♀️",
    		description: "mermaid: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FE",
    		emoji: "🧜🏾‍♀",
    		description: "mermaid: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FF",
    		emoji: "🧜🏿‍♀️",
    		description: "mermaid: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FF",
    		emoji: "🧜🏿‍♀",
    		description: "mermaid: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD",
    		emoji: "🧝",
    		description: "elf",
    		keywords: [
    			"elf"
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FB",
    		emoji: "🧝🏻",
    		description: "elf: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FC",
    		emoji: "🧝🏼",
    		description: "elf: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FD",
    		emoji: "🧝🏽",
    		description: "elf: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FE",
    		emoji: "🧝🏾",
    		description: "elf: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FF",
    		emoji: "🧝🏿",
    		description: "elf: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FB",
    		emoji: "🧝🏻‍♂️",
    		description: "man elf: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FB",
    		emoji: "🧝🏻‍♂",
    		description: "man elf: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FC",
    		emoji: "🧝🏼‍♂️",
    		description: "man elf: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FC",
    		emoji: "🧝🏼‍♂",
    		description: "man elf: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FD",
    		emoji: "🧝🏽‍♂️",
    		description: "man elf: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FD",
    		emoji: "🧝🏽‍♂",
    		description: "man elf: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FE",
    		emoji: "🧝🏾‍♂️",
    		description: "man elf: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FE",
    		emoji: "🧝🏾‍♂",
    		description: "man elf: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FF",
    		emoji: "🧝🏿‍♂️",
    		description: "man elf: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FF",
    		emoji: "🧝🏿‍♂",
    		description: "man elf: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FB",
    		emoji: "🧝🏻‍♀️",
    		description: "woman elf: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FB",
    		emoji: "🧝🏻‍♀",
    		description: "woman elf: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FC",
    		emoji: "🧝🏼‍♀️",
    		description: "woman elf: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FC",
    		emoji: "🧝🏼‍♀",
    		description: "woman elf: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FD",
    		emoji: "🧝🏽‍♀️",
    		description: "woman elf: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FD",
    		emoji: "🧝🏽‍♀",
    		description: "woman elf: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FE",
    		emoji: "🧝🏾‍♀️",
    		description: "woman elf: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FE",
    		emoji: "🧝🏾‍♀",
    		description: "woman elf: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FF",
    		emoji: "🧝🏿‍♀️",
    		description: "woman elf: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FF",
    		emoji: "🧝🏿‍♀",
    		description: "woman elf: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DE",
    		emoji: "🧞",
    		description: "genie",
    		keywords: [
    			"genie"
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍🍳",
    		description: "cook: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍🍳",
    		description: "cook: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍🍳",
    		description: "cook: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍🍳",
    		description: "cook: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍🍳",
    		description: "cook: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍🍳",
    		description: "man cook: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍🍳",
    		description: "man cook: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍🍳",
    		description: "man cook: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍🍳",
    		description: "man cook: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍🍳",
    		description: "man cook: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍🍳",
    		description: "woman cook: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍🍳",
    		description: "woman cook: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍🍳",
    		description: "woman cook: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍🍳",
    		description: "woman cook: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍🍳",
    		description: "woman cook: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍🔧",
    		description: "mechanic: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍🔧",
    		description: "mechanic: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍🔧",
    		description: "mechanic: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍🔧",
    		description: "mechanic: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍🔧",
    		description: "mechanic: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍🔧",
    		description: "man mechanic: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍🔧",
    		description: "man mechanic: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍🔧",
    		description: "man mechanic: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍🔧",
    		description: "man mechanic: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍🔧",
    		description: "man mechanic: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍🔧",
    		description: "woman mechanic: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍🔧",
    		description: "woman mechanic: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍🔧",
    		description: "woman mechanic: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍🔧",
    		description: "woman mechanic: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍🔧",
    		description: "woman mechanic: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍🏭",
    		description: "factory worker: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍🏭",
    		description: "factory worker: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍🏭",
    		description: "factory worker: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍🏭",
    		description: "factory worker: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍🏭",
    		description: "factory worker: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍🏭",
    		description: "man factory worker: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍🏭",
    		description: "man factory worker: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍🏭",
    		description: "man factory worker: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍🏭",
    		description: "man factory worker: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍🏭",
    		description: "man factory worker: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍🏭",
    		description: "woman factory worker: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍🏭",
    		description: "woman factory worker: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍🏭",
    		description: "woman factory worker: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍🏭",
    		description: "woman factory worker: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍🏭",
    		description: "woman factory worker: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍💼",
    		description: "office worker: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍💼",
    		description: "office worker: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍💼",
    		description: "office worker: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍💼",
    		description: "office worker: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍💼",
    		description: "office worker: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍💼",
    		description: "man office worker: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍💼",
    		description: "man office worker: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍💼",
    		description: "man office worker: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍💼",
    		description: "man office worker: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍💼",
    		description: "man office worker: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍💼",
    		description: "woman office worker: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍💼",
    		description: "woman office worker: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍💼",
    		description: "woman office worker: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍💼",
    		description: "woman office worker: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍💼",
    		description: "woman office worker: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍🔬",
    		description: "scientist: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍🔬",
    		description: "scientist: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍🔬",
    		description: "scientist: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍🔬",
    		description: "scientist: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍🔬",
    		description: "scientist: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍🔬",
    		description: "man scientist: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍🔬",
    		description: "man scientist: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍🔬",
    		description: "man scientist: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍🔬",
    		description: "man scientist: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍🔬",
    		description: "man scientist: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍🔬",
    		description: "woman scientist: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍🔬",
    		description: "woman scientist: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍🔬",
    		description: "woman scientist: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍🔬",
    		description: "woman scientist: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍🔬",
    		description: "woman scientist: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍💻",
    		description: "technologist: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍💻",
    		description: "technologist: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍💻",
    		description: "technologist: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍💻",
    		description: "technologist: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍💻",
    		description: "technologist: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍💻",
    		description: "man technologist: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍💻",
    		description: "man technologist: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍💻",
    		description: "man technologist: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍💻",
    		description: "man technologist: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍💻",
    		description: "man technologist: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍💻",
    		description: "woman technologist: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍💻",
    		description: "woman technologist: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍💻",
    		description: "woman technologist: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍💻",
    		description: "woman technologist: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍💻",
    		description: "woman technologist: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍🎤",
    		description: "singer: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍🎤",
    		description: "singer: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍🎤",
    		description: "singer: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍🎤",
    		description: "singer: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍🎤",
    		description: "singer: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍🎤",
    		description: "man singer: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍🎤",
    		description: "man singer: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍🎤",
    		description: "man singer: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍🎤",
    		description: "man singer: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍🎤",
    		description: "man singer: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍🎤",
    		description: "woman singer: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍🎤",
    		description: "woman singer: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍🎤",
    		description: "woman singer: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍🎤",
    		description: "woman singer: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍🎤",
    		description: "woman singer: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍🎨",
    		description: "artist: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍🎨",
    		description: "artist: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍🎨",
    		description: "artist: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍🎨",
    		description: "artist: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍🎨",
    		description: "artist: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍🎨",
    		description: "man artist: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍🎨",
    		description: "man artist: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍🎨",
    		description: "man artist: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍🎨",
    		description: "man artist: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍🎨",
    		description: "man artist: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍🎨",
    		description: "woman artist: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍🎨",
    		description: "woman artist: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍🎨",
    		description: "woman artist: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍🎨",
    		description: "woman artist: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍🎨",
    		description: "woman artist: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍✈️",
    		description: "pilot: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍✈",
    		description: "pilot: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍✈️",
    		description: "pilot: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍✈",
    		description: "pilot: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍✈️",
    		description: "pilot: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍✈",
    		description: "pilot: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍✈️",
    		description: "pilot: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍✈",
    		description: "pilot: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍✈️",
    		description: "pilot: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍✈",
    		description: "pilot: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍✈️",
    		description: "man pilot: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍✈",
    		description: "man pilot: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍✈️",
    		description: "man pilot: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍✈",
    		description: "man pilot: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍✈️",
    		description: "man pilot: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍✈",
    		description: "man pilot: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍✈️",
    		description: "man pilot: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍✈",
    		description: "man pilot: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍✈️",
    		description: "man pilot: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍✈",
    		description: "man pilot: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍✈️",
    		description: "woman pilot: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍✈",
    		description: "woman pilot: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍✈️",
    		description: "woman pilot: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍✈",
    		description: "woman pilot: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍✈️",
    		description: "woman pilot: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍✈",
    		description: "woman pilot: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍✈️",
    		description: "woman pilot: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍✈",
    		description: "woman pilot: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍✈️",
    		description: "woman pilot: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍✈",
    		description: "woman pilot: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍🚀",
    		description: "astronaut: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍🚀",
    		description: "astronaut: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍🚀",
    		description: "astronaut: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍🚀",
    		description: "astronaut: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍🚀",
    		description: "astronaut: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍🚀",
    		description: "man astronaut: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍🚀",
    		description: "man astronaut: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍🚀",
    		description: "man astronaut: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍🚀",
    		description: "man astronaut: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍🚀",
    		description: "man astronaut: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍🚀",
    		description: "woman astronaut: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍🚀",
    		description: "woman astronaut: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍🚀",
    		description: "woman astronaut: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍🚀",
    		description: "woman astronaut: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍🚀",
    		description: "woman astronaut: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍🚒",
    		description: "firefighter: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍🚒",
    		description: "firefighter: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍🚒",
    		description: "firefighter: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍🚒",
    		description: "firefighter: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍🚒",
    		description: "firefighter: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍🚒",
    		description: "man firefighter: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍🚒",
    		description: "man firefighter: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍🚒",
    		description: "man firefighter: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍🚒",
    		description: "man firefighter: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍🚒",
    		description: "man firefighter: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍🚒",
    		description: "woman firefighter: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍🚒",
    		description: "woman firefighter: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍🚒",
    		description: "woman firefighter: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍🚒",
    		description: "woman firefighter: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍🚒",
    		description: "woman firefighter: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46E",
    		emoji: "👮",
    		description: "police officer",
    		keywords: [
    			"police officer"
    		]
    	},
    	{
    		unicode: "1F46E 1F3FB",
    		emoji: "👮🏻",
    		description: "police officer: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46E 1F3FC",
    		emoji: "👮🏼",
    		description: "police officer: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46E 1F3FD",
    		emoji: "👮🏽",
    		description: "police officer: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46E 1F3FE",
    		emoji: "👮🏾",
    		description: "police officer: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46E 1F3FF",
    		emoji: "👮🏿",
    		description: "police officer: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46E 1F3FB",
    		emoji: "👮🏻‍♂️",
    		description: "man police officer: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46E 1F3FB",
    		emoji: "👮🏻‍♂",
    		description: "man police officer: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46E 1F3FC",
    		emoji: "👮🏼‍♂️",
    		description: "man police officer: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46E 1F3FC",
    		emoji: "👮🏼‍♂",
    		description: "man police officer: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46E 1F3FD",
    		emoji: "👮🏽‍♂️",
    		description: "man police officer: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46E 1F3FD",
    		emoji: "👮🏽‍♂",
    		description: "man police officer: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46E 1F3FE",
    		emoji: "👮🏾‍♂️",
    		description: "man police officer: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46E 1F3FE",
    		emoji: "👮🏾‍♂",
    		description: "man police officer: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46E 1F3FF",
    		emoji: "👮🏿‍♂️",
    		description: "man police officer: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46E 1F3FF",
    		emoji: "👮🏿‍♂",
    		description: "man police officer: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46E 1F3FB",
    		emoji: "👮🏻‍♀️",
    		description: "woman police officer: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46E 1F3FB",
    		emoji: "👮🏻‍♀",
    		description: "woman police officer: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46E 1F3FC",
    		emoji: "👮🏼‍♀️",
    		description: "woman police officer: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46E 1F3FC",
    		emoji: "👮🏼‍♀",
    		description: "woman police officer: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46E 1F3FD",
    		emoji: "👮🏽‍♀️",
    		description: "woman police officer: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46E 1F3FD",
    		emoji: "👮🏽‍♀",
    		description: "woman police officer: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46E 1F3FE",
    		emoji: "👮🏾‍♀️",
    		description: "woman police officer: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46E 1F3FE",
    		emoji: "👮🏾‍♀",
    		description: "woman police officer: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46E 1F3FF",
    		emoji: "👮🏿‍♀️",
    		description: "woman police officer: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46E 1F3FF",
    		emoji: "👮🏿‍♀",
    		description: "woman police officer: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F575 FE0F",
    		emoji: "🕵️",
    		description: "detective",
    		keywords: [
    			"detective"
    		]
    	},
    	{
    		unicode: "1F575",
    		emoji: "🕵",
    		description: "detective",
    		keywords: [
    			"detective"
    		]
    	},
    	{
    		unicode: "1F575 1F3FB",
    		emoji: "🕵🏻",
    		description: "detective: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F575 1F3FC",
    		emoji: "🕵🏼",
    		description: "detective: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F575 1F3FD",
    		emoji: "🕵🏽",
    		description: "detective: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F575 1F3FE",
    		emoji: "🕵🏾",
    		description: "detective: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F575 1F3FF",
    		emoji: "🕵🏿",
    		description: "detective: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F575 1F3FB",
    		emoji: "🕵🏻‍♂️",
    		description: "man detective: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F575 1F3FB",
    		emoji: "🕵🏻‍♂",
    		description: "man detective: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F575 1F3FC",
    		emoji: "🕵🏼‍♂️",
    		description: "man detective: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F575 1F3FC",
    		emoji: "🕵🏼‍♂",
    		description: "man detective: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F575 1F3FD",
    		emoji: "🕵🏽‍♂️",
    		description: "man detective: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F575 1F3FD",
    		emoji: "🕵🏽‍♂",
    		description: "man detective: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F575 1F3FE",
    		emoji: "🕵🏾‍♂️",
    		description: "man detective: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F575 1F3FE",
    		emoji: "🕵🏾‍♂",
    		description: "man detective: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F575 1F3FF",
    		emoji: "🕵🏿‍♂️",
    		description: "man detective: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F575 1F3FF",
    		emoji: "🕵🏿‍♂",
    		description: "man detective: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F575 1F3FB",
    		emoji: "🕵🏻‍♀️",
    		description: "woman detective: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F575 1F3FB",
    		emoji: "🕵🏻‍♀",
    		description: "woman detective: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F575 1F3FC",
    		emoji: "🕵🏼‍♀️",
    		description: "woman detective: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F575 1F3FC",
    		emoji: "🕵🏼‍♀",
    		description: "woman detective: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F575 1F3FD",
    		emoji: "🕵🏽‍♀️",
    		description: "woman detective: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F575 1F3FD",
    		emoji: "🕵🏽‍♀",
    		description: "woman detective: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F575 1F3FE",
    		emoji: "🕵🏾‍♀️",
    		description: "woman detective: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F575 1F3FE",
    		emoji: "🕵🏾‍♀",
    		description: "woman detective: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F575 1F3FF",
    		emoji: "🕵🏿‍♀️",
    		description: "woman detective: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F575 1F3FF",
    		emoji: "🕵🏿‍♀",
    		description: "woman detective: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F482",
    		emoji: "💂",
    		description: "guard",
    		keywords: [
    			"guard"
    		]
    	},
    	{
    		unicode: "1F482 1F3FB",
    		emoji: "💂🏻",
    		description: "guard: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F482 1F3FC",
    		emoji: "💂🏼",
    		description: "guard: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F482 1F3FD",
    		emoji: "💂🏽",
    		description: "guard: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F482 1F3FE",
    		emoji: "💂🏾",
    		description: "guard: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F482 1F3FF",
    		emoji: "💂🏿",
    		description: "guard: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F482 1F3FB",
    		emoji: "💂🏻‍♂️",
    		description: "man guard: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F482 1F3FB",
    		emoji: "💂🏻‍♂",
    		description: "man guard: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F482 1F3FC",
    		emoji: "💂🏼‍♂️",
    		description: "man guard: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F482 1F3FC",
    		emoji: "💂🏼‍♂",
    		description: "man guard: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F482 1F3FD",
    		emoji: "💂🏽‍♂️",
    		description: "man guard: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F482 1F3FD",
    		emoji: "💂🏽‍♂",
    		description: "man guard: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F482 1F3FE",
    		emoji: "💂🏾‍♂️",
    		description: "man guard: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F482 1F3FE",
    		emoji: "💂🏾‍♂",
    		description: "man guard: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F482 1F3FF",
    		emoji: "💂🏿‍♂️",
    		description: "man guard: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F482 1F3FF",
    		emoji: "💂🏿‍♂",
    		description: "man guard: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F482 1F3FB",
    		emoji: "💂🏻‍♀️",
    		description: "woman guard: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F482 1F3FB",
    		emoji: "💂🏻‍♀",
    		description: "woman guard: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F482 1F3FC",
    		emoji: "💂🏼‍♀️",
    		description: "woman guard: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F482 1F3FC",
    		emoji: "💂🏼‍♀",
    		description: "woman guard: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F482 1F3FD",
    		emoji: "💂🏽‍♀️",
    		description: "woman guard: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F482 1F3FD",
    		emoji: "💂🏽‍♀",
    		description: "woman guard: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F482 1F3FE",
    		emoji: "💂🏾‍♀️",
    		description: "woman guard: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F482 1F3FE",
    		emoji: "💂🏾‍♀",
    		description: "woman guard: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F482 1F3FF",
    		emoji: "💂🏿‍♀️",
    		description: "woman guard: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F482 1F3FF",
    		emoji: "💂🏿‍♀",
    		description: "woman guard: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F977",
    		emoji: "🥷",
    		description: "ninja",
    		keywords: [
    			"ninja"
    		]
    	},
    	{
    		unicode: "1F977 1F3FB",
    		emoji: "🥷🏻",
    		description: "ninja: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F977 1F3FC",
    		emoji: "🥷🏼",
    		description: "ninja: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F977 1F3FD",
    		emoji: "🥷🏽",
    		description: "ninja: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F977 1F3FE",
    		emoji: "🥷🏾",
    		description: "ninja: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F977 1F3FF",
    		emoji: "🥷🏿",
    		description: "ninja: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F477",
    		emoji: "👷",
    		description: "construction worker",
    		keywords: [
    			"construction worker"
    		]
    	},
    	{
    		unicode: "1F477 1F3FB",
    		emoji: "👷🏻",
    		description: "construction worker: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F477 1F3FC",
    		emoji: "👷🏼",
    		description: "construction worker: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F477 1F3FD",
    		emoji: "👷🏽",
    		description: "construction worker: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F477 1F3FE",
    		emoji: "👷🏾",
    		description: "construction worker: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F477 1F3FF",
    		emoji: "👷🏿",
    		description: "construction worker: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F477 1F3FB",
    		emoji: "👷🏻‍♂️",
    		description: "man construction worker: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F477 1F3FB",
    		emoji: "👷🏻‍♂",
    		description: "man construction worker: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F477 1F3FC",
    		emoji: "👷🏼‍♂️",
    		description: "man construction worker: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F477 1F3FC",
    		emoji: "👷🏼‍♂",
    		description: "man construction worker: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F477 1F3FD",
    		emoji: "👷🏽‍♂️",
    		description: "man construction worker: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F477 1F3FD",
    		emoji: "👷🏽‍♂",
    		description: "man construction worker: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F477 1F3FE",
    		emoji: "👷🏾‍♂️",
    		description: "man construction worker: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F477 1F3FE",
    		emoji: "👷🏾‍♂",
    		description: "man construction worker: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F477 1F3FF",
    		emoji: "👷🏿‍♂️",
    		description: "man construction worker: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F477 1F3FF",
    		emoji: "👷🏿‍♂",
    		description: "man construction worker: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F477 1F3FB",
    		emoji: "👷🏻‍♀️",
    		description: "woman construction worker: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F477 1F3FB",
    		emoji: "👷🏻‍♀",
    		description: "woman construction worker: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F477 1F3FC",
    		emoji: "👷🏼‍♀️",
    		description: "woman construction worker: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F477 1F3FC",
    		emoji: "👷🏼‍♀",
    		description: "woman construction worker: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F477 1F3FD",
    		emoji: "👷🏽‍♀️",
    		description: "woman construction worker: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F477 1F3FD",
    		emoji: "👷🏽‍♀",
    		description: "woman construction worker: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F477 1F3FE",
    		emoji: "👷🏾‍♀️",
    		description: "woman construction worker: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F477 1F3FE",
    		emoji: "👷🏾‍♀",
    		description: "woman construction worker: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F477 1F3FF",
    		emoji: "👷🏿‍♀️",
    		description: "woman construction worker: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F477 1F3FF",
    		emoji: "👷🏿‍♀",
    		description: "woman construction worker: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F934",
    		emoji: "🤴",
    		description: "prince",
    		keywords: [
    			"prince"
    		]
    	},
    	{
    		unicode: "1F934 1F3FB",
    		emoji: "🤴🏻",
    		description: "prince: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F934 1F3FC",
    		emoji: "🤴🏼",
    		description: "prince: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F934 1F3FD",
    		emoji: "🤴🏽",
    		description: "prince: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F934 1F3FE",
    		emoji: "🤴🏾",
    		description: "prince: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F934 1F3FF",
    		emoji: "🤴🏿",
    		description: "prince: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F478",
    		emoji: "👸",
    		description: "princess",
    		keywords: [
    			"princess"
    		]
    	},
    	{
    		unicode: "1F478 1F3FB",
    		emoji: "👸🏻",
    		description: "princess: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F478 1F3FC",
    		emoji: "👸🏼",
    		description: "princess: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F478 1F3FD",
    		emoji: "👸🏽",
    		description: "princess: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F478 1F3FE",
    		emoji: "👸🏾",
    		description: "princess: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F478 1F3FF",
    		emoji: "👸🏿",
    		description: "princess: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F473 1F3FB",
    		emoji: "👳🏻",
    		description: "person wearing turban: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F473 1F3FC",
    		emoji: "👳🏼",
    		description: "person wearing turban: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F473 1F3FD",
    		emoji: "👳🏽",
    		description: "person wearing turban: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F473 1F3FE",
    		emoji: "👳🏾",
    		description: "person wearing turban: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F473 1F3FF",
    		emoji: "👳🏿",
    		description: "person wearing turban: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F473 1F3FB",
    		emoji: "👳🏻‍♂️",
    		description: "man wearing turban: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F473 1F3FB",
    		emoji: "👳🏻‍♂",
    		description: "man wearing turban: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F473 1F3FC",
    		emoji: "👳🏼‍♂️",
    		description: "man wearing turban: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F473 1F3FC",
    		emoji: "👳🏼‍♂",
    		description: "man wearing turban: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F473 1F3FD",
    		emoji: "👳🏽‍♂️",
    		description: "man wearing turban: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F473 1F3FD",
    		emoji: "👳🏽‍♂",
    		description: "man wearing turban: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F473 1F3FE",
    		emoji: "👳🏾‍♂️",
    		description: "man wearing turban: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F473 1F3FE",
    		emoji: "👳🏾‍♂",
    		description: "man wearing turban: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F473 1F3FF",
    		emoji: "👳🏿‍♂️",
    		description: "man wearing turban: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F473 1F3FF",
    		emoji: "👳🏿‍♂",
    		description: "man wearing turban: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F473 1F3FB",
    		emoji: "👳🏻‍♀️",
    		description: "woman wearing turban: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F473 1F3FB",
    		emoji: "👳🏻‍♀",
    		description: "woman wearing turban: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F473 1F3FC",
    		emoji: "👳🏼‍♀️",
    		description: "woman wearing turban: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F473 1F3FC",
    		emoji: "👳🏼‍♀",
    		description: "woman wearing turban: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F473 1F3FD",
    		emoji: "👳🏽‍♀️",
    		description: "woman wearing turban: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F473 1F3FD",
    		emoji: "👳🏽‍♀",
    		description: "woman wearing turban: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F473 1F3FE",
    		emoji: "👳🏾‍♀️",
    		description: "woman wearing turban: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F473 1F3FE",
    		emoji: "👳🏾‍♀",
    		description: "woman wearing turban: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F473 1F3FF",
    		emoji: "👳🏿‍♀️",
    		description: "woman wearing turban: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F473 1F3FF",
    		emoji: "👳🏿‍♀",
    		description: "woman wearing turban: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F472",
    		emoji: "👲",
    		description: "person with skullcap",
    		keywords: [
    			"person with skullcap"
    		]
    	},
    	{
    		unicode: "1F472 1F3FB",
    		emoji: "👲🏻",
    		description: "person with skullcap: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F472 1F3FC",
    		emoji: "👲🏼",
    		description: "person with skullcap: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F472 1F3FD",
    		emoji: "👲🏽",
    		description: "person with skullcap: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F472 1F3FE",
    		emoji: "👲🏾",
    		description: "person with skullcap: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F472 1F3FF",
    		emoji: "👲🏿",
    		description: "person with skullcap: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D5",
    		emoji: "🧕",
    		description: "woman with headscarf",
    		keywords: [
    			"woman with headscarf",
    			"muslim woman",
    			"muslima",
    			"muslimah",
    			"muslim girl"
    		]
    	},
    	{
    		unicode: "1F9D5 1F3FB",
    		emoji: "🧕🏻",
    		description: "woman with headscarf: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D5 1F3FC",
    		emoji: "🧕🏼",
    		description: "woman with headscarf: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D5 1F3FD",
    		emoji: "🧕🏽",
    		description: "woman with headscarf: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D5 1F3FE",
    		emoji: "🧕🏾",
    		description: "woman with headscarf: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D5 1F3FF",
    		emoji: "🧕🏿",
    		description: "woman with headscarf: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F935",
    		emoji: "🤵",
    		description: "person in tuxedo",
    		keywords: [
    			"person in tuxedo"
    		]
    	},
    	{
    		unicode: "1F935 1F3FB",
    		emoji: "🤵🏻",
    		description: "person in tuxedo: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F935 1F3FC",
    		emoji: "🤵🏼",
    		description: "person in tuxedo: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F935 1F3FD",
    		emoji: "🤵🏽",
    		description: "person in tuxedo: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F935 1F3FE",
    		emoji: "🤵🏾",
    		description: "person in tuxedo: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F935 1F3FF",
    		emoji: "🤵🏿",
    		description: "person in tuxedo: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F935 1F3FB",
    		emoji: "🤵🏻‍♂️",
    		description: "man in tuxedo: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F935 1F3FB",
    		emoji: "🤵🏻‍♂",
    		description: "man in tuxedo: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F935 1F3FC",
    		emoji: "🤵🏼‍♂️",
    		description: "man in tuxedo: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F935 1F3FC",
    		emoji: "🤵🏼‍♂",
    		description: "man in tuxedo: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F935 1F3FD",
    		emoji: "🤵🏽‍♂️",
    		description: "man in tuxedo: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F935 1F3FD",
    		emoji: "🤵🏽‍♂",
    		description: "man in tuxedo: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F935 1F3FE",
    		emoji: "🤵🏾‍♂️",
    		description: "man in tuxedo: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F935 1F3FE",
    		emoji: "🤵🏾‍♂",
    		description: "man in tuxedo: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F935 1F3FF",
    		emoji: "🤵🏿‍♂️",
    		description: "man in tuxedo: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F935 1F3FF",
    		emoji: "🤵🏿‍♂",
    		description: "man in tuxedo: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F935 1F3FB",
    		emoji: "🤵🏻‍♀️",
    		description: "woman in tuxedo: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F935 1F3FB",
    		emoji: "🤵🏻‍♀",
    		description: "woman in tuxedo: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F935 1F3FC",
    		emoji: "🤵🏼‍♀️",
    		description: "woman in tuxedo: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F935 1F3FC",
    		emoji: "🤵🏼‍♀",
    		description: "woman in tuxedo: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F935 1F3FD",
    		emoji: "🤵🏽‍♀️",
    		description: "woman in tuxedo: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F935 1F3FD",
    		emoji: "🤵🏽‍♀",
    		description: "woman in tuxedo: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F935 1F3FE",
    		emoji: "🤵🏾‍♀️",
    		description: "woman in tuxedo: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F935 1F3FE",
    		emoji: "🤵🏾‍♀",
    		description: "woman in tuxedo: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F935 1F3FF",
    		emoji: "🤵🏿‍♀️",
    		description: "woman in tuxedo: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F935 1F3FF",
    		emoji: "🤵🏿‍♀",
    		description: "woman in tuxedo: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F470",
    		emoji: "👰",
    		description: "person with veil",
    		keywords: [
    			"person with veil"
    		]
    	},
    	{
    		unicode: "1F470 1F3FB",
    		emoji: "👰🏻",
    		description: "person with veil: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F470 1F3FC",
    		emoji: "👰🏼",
    		description: "person with veil: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F470 1F3FD",
    		emoji: "👰🏽",
    		description: "person with veil: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F470 1F3FE",
    		emoji: "👰🏾",
    		description: "person with veil: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F470 1F3FF",
    		emoji: "👰🏿",
    		description: "person with veil: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F470 1F3FB",
    		emoji: "👰🏻‍♂️",
    		description: "man with veil: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F470 1F3FB",
    		emoji: "👰🏻‍♂",
    		description: "man with veil: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F470 1F3FC",
    		emoji: "👰🏼‍♂️",
    		description: "man with veil: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F470 1F3FC",
    		emoji: "👰🏼‍♂",
    		description: "man with veil: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F470 1F3FD",
    		emoji: "👰🏽‍♂️",
    		description: "man with veil: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F470 1F3FD",
    		emoji: "👰🏽‍♂",
    		description: "man with veil: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F470 1F3FE",
    		emoji: "👰🏾‍♂️",
    		description: "man with veil: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F470 1F3FE",
    		emoji: "👰🏾‍♂",
    		description: "man with veil: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F470 1F3FF",
    		emoji: "👰🏿‍♂️",
    		description: "man with veil: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F470 1F3FF",
    		emoji: "👰🏿‍♂",
    		description: "man with veil: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F470 1F3FB",
    		emoji: "👰🏻‍♀️",
    		description: "woman with veil: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F470 1F3FB",
    		emoji: "👰🏻‍♀",
    		description: "woman with veil: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F470 1F3FC",
    		emoji: "👰🏼‍♀️",
    		description: "woman with veil: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F470 1F3FC",
    		emoji: "👰🏼‍♀",
    		description: "woman with veil: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F470 1F3FD",
    		emoji: "👰🏽‍♀️",
    		description: "woman with veil: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F470 1F3FD",
    		emoji: "👰🏽‍♀",
    		description: "woman with veil: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F470 1F3FE",
    		emoji: "👰🏾‍♀️",
    		description: "woman with veil: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F470 1F3FE",
    		emoji: "👰🏾‍♀",
    		description: "woman with veil: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F470 1F3FF",
    		emoji: "👰🏿‍♀️",
    		description: "woman with veil: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F470 1F3FF",
    		emoji: "👰🏿‍♀",
    		description: "woman with veil: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F930",
    		emoji: "🤰",
    		description: "pregnant woman",
    		keywords: [
    			"pregnant woman"
    		]
    	},
    	{
    		unicode: "1F930 1F3FB",
    		emoji: "🤰🏻",
    		description: "pregnant woman: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F930 1F3FC",
    		emoji: "🤰🏼",
    		description: "pregnant woman: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F930 1F3FD",
    		emoji: "🤰🏽",
    		description: "pregnant woman: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F930 1F3FE",
    		emoji: "🤰🏾",
    		description: "pregnant woman: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F930 1F3FF",
    		emoji: "🤰🏿",
    		description: "pregnant woman: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F931",
    		emoji: "🤱",
    		description: "breast-feeding",
    		keywords: [
    			"breast-feeding"
    		]
    	},
    	{
    		unicode: "1F931 1F3FB",
    		emoji: "🤱🏻",
    		description: "breast-feeding: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F931 1F3FC",
    		emoji: "🤱🏼",
    		description: "breast-feeding: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F931 1F3FD",
    		emoji: "🤱🏽",
    		description: "breast-feeding: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F931 1F3FE",
    		emoji: "🤱🏾",
    		description: "breast-feeding: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F931 1F3FF",
    		emoji: "🤱🏿",
    		description: "breast-feeding: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍🍼",
    		description: "woman feeding baby: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍🍼",
    		description: "woman feeding baby: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍🍼",
    		description: "woman feeding baby: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍🍼",
    		description: "woman feeding baby: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍🍼",
    		description: "woman feeding baby: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍🍼",
    		description: "man feeding baby: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍🍼",
    		description: "man feeding baby: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍🍼",
    		description: "man feeding baby: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍🍼",
    		description: "man feeding baby: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍🍼",
    		description: "man feeding baby: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍🍼",
    		description: "person feeding baby: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍🍼",
    		description: "person feeding baby: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍🍼",
    		description: "person feeding baby: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍🍼",
    		description: "person feeding baby: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍🍼",
    		description: "person feeding baby: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F47C",
    		emoji: "👼",
    		description: "baby angel",
    		keywords: [
    			"baby angel"
    		]
    	},
    	{
    		unicode: "1F47C 1F3FB",
    		emoji: "👼🏻",
    		description: "baby angel: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F47C 1F3FC",
    		emoji: "👼🏼",
    		description: "baby angel: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F47C 1F3FD",
    		emoji: "👼🏽",
    		description: "baby angel: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F47C 1F3FE",
    		emoji: "👼🏾",
    		description: "baby angel: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F47C 1F3FF",
    		emoji: "👼🏿",
    		description: "baby angel: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F385",
    		emoji: "🎅",
    		description: "Santa Claus",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F385 1F3FB",
    		emoji: "🎅🏻",
    		description: "Santa Claus: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F385 1F3FC",
    		emoji: "🎅🏼",
    		description: "Santa Claus: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F385 1F3FD",
    		emoji: "🎅🏽",
    		description: "Santa Claus: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F385 1F3FE",
    		emoji: "🎅🏾",
    		description: "Santa Claus: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F385 1F3FF",
    		emoji: "🎅🏿",
    		description: "Santa Claus: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F936",
    		emoji: "🤶",
    		description: "Mrs. Claus",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F936 1F3FB",
    		emoji: "🤶🏻",
    		description: "Mrs. Claus: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F936 1F3FC",
    		emoji: "🤶🏼",
    		description: "Mrs. Claus: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F936 1F3FD",
    		emoji: "🤶🏽",
    		description: "Mrs. Claus: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F936 1F3FE",
    		emoji: "🤶🏾",
    		description: "Mrs. Claus: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F936 1F3FF",
    		emoji: "🤶🏿",
    		description: "Mrs. Claus: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍🎄",
    		description: "mx claus: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍🎄",
    		description: "mx claus: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍🎄",
    		description: "mx claus: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍🎄",
    		description: "mx claus: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍🎄",
    		description: "mx claus: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8",
    		emoji: "🦸",
    		description: "superhero",
    		keywords: [
    			"superhero"
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FB",
    		emoji: "🦸🏻",
    		description: "superhero: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FC",
    		emoji: "🦸🏼",
    		description: "superhero: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FD",
    		emoji: "🦸🏽",
    		description: "superhero: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FE",
    		emoji: "🦸🏾",
    		description: "superhero: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FF",
    		emoji: "🦸🏿",
    		description: "superhero: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FB",
    		emoji: "🦸🏻‍♂️",
    		description: "man superhero: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FB",
    		emoji: "🦸🏻‍♂",
    		description: "man superhero: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FC",
    		emoji: "🦸🏼‍♂️",
    		description: "man superhero: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FC",
    		emoji: "🦸🏼‍♂",
    		description: "man superhero: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FD",
    		emoji: "🦸🏽‍♂️",
    		description: "man superhero: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FD",
    		emoji: "🦸🏽‍♂",
    		description: "man superhero: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FE",
    		emoji: "🦸🏾‍♂️",
    		description: "man superhero: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FE",
    		emoji: "🦸🏾‍♂",
    		description: "man superhero: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FF",
    		emoji: "🦸🏿‍♂️",
    		description: "man superhero: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FF",
    		emoji: "🦸🏿‍♂",
    		description: "man superhero: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FB",
    		emoji: "🦸🏻‍♀️",
    		description: "woman superhero: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FB",
    		emoji: "🦸🏻‍♀",
    		description: "woman superhero: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FC",
    		emoji: "🦸🏼‍♀️",
    		description: "woman superhero: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FC",
    		emoji: "🦸🏼‍♀",
    		description: "woman superhero: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FD",
    		emoji: "🦸🏽‍♀️",
    		description: "woman superhero: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FD",
    		emoji: "🦸🏽‍♀",
    		description: "woman superhero: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FE",
    		emoji: "🦸🏾‍♀️",
    		description: "woman superhero: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FE",
    		emoji: "🦸🏾‍♀",
    		description: "woman superhero: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FF",
    		emoji: "🦸🏿‍♀️",
    		description: "woman superhero: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B8 1F3FF",
    		emoji: "🦸🏿‍♀",
    		description: "woman superhero: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9",
    		emoji: "🦹",
    		description: "supervillain",
    		keywords: [
    			"supervillain"
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FB",
    		emoji: "🦹🏻",
    		description: "supervillain: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FC",
    		emoji: "🦹🏼",
    		description: "supervillain: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FD",
    		emoji: "🦹🏽",
    		description: "supervillain: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FE",
    		emoji: "🦹🏾",
    		description: "supervillain: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FF",
    		emoji: "🦹🏿",
    		description: "supervillain: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FB",
    		emoji: "🦹🏻‍♂️",
    		description: "man supervillain: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FB",
    		emoji: "🦹🏻‍♂",
    		description: "man supervillain: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FC",
    		emoji: "🦹🏼‍♂️",
    		description: "man supervillain: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FC",
    		emoji: "🦹🏼‍♂",
    		description: "man supervillain: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FD",
    		emoji: "🦹🏽‍♂️",
    		description: "man supervillain: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FD",
    		emoji: "🦹🏽‍♂",
    		description: "man supervillain: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FE",
    		emoji: "🦹🏾‍♂️",
    		description: "man supervillain: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FE",
    		emoji: "🦹🏾‍♂",
    		description: "man supervillain: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FF",
    		emoji: "🦹🏿‍♂️",
    		description: "man supervillain: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FF",
    		emoji: "🦹🏿‍♂",
    		description: "man supervillain: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FB",
    		emoji: "🦹🏻‍♀️",
    		description: "woman supervillain: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FB",
    		emoji: "🦹🏻‍♀",
    		description: "woman supervillain: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FC",
    		emoji: "🦹🏼‍♀️",
    		description: "woman supervillain: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FC",
    		emoji: "🦹🏼‍♀",
    		description: "woman supervillain: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FD",
    		emoji: "🦹🏽‍♀️",
    		description: "woman supervillain: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FD",
    		emoji: "🦹🏽‍♀",
    		description: "woman supervillain: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FE",
    		emoji: "🦹🏾‍♀️",
    		description: "woman supervillain: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FE",
    		emoji: "🦹🏾‍♀",
    		description: "woman supervillain: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FF",
    		emoji: "🦹🏿‍♀️",
    		description: "woman supervillain: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9B9 1F3FF",
    		emoji: "🦹🏿‍♀",
    		description: "woman supervillain: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9",
    		emoji: "🧙",
    		description: "mage",
    		keywords: [
    			"mage"
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FB",
    		emoji: "🧙🏻",
    		description: "mage: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FC",
    		emoji: "🧙🏼",
    		description: "mage: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FD",
    		emoji: "🧙🏽",
    		description: "mage: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FE",
    		emoji: "🧙🏾",
    		description: "mage: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FF",
    		emoji: "🧙🏿",
    		description: "mage: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FB",
    		emoji: "🧙🏻‍♂️",
    		description: "man mage: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FB",
    		emoji: "🧙🏻‍♂",
    		description: "man mage: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FC",
    		emoji: "🧙🏼‍♂️",
    		description: "man mage: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FC",
    		emoji: "🧙🏼‍♂",
    		description: "man mage: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FD",
    		emoji: "🧙🏽‍♂️",
    		description: "man mage: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FD",
    		emoji: "🧙🏽‍♂",
    		description: "man mage: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FE",
    		emoji: "🧙🏾‍♂️",
    		description: "man mage: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FE",
    		emoji: "🧙🏾‍♂",
    		description: "man mage: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FF",
    		emoji: "🧙🏿‍♂️",
    		description: "man mage: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FF",
    		emoji: "🧙🏿‍♂",
    		description: "man mage: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FB",
    		emoji: "🧙🏻‍♀️",
    		description: "woman mage: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FB",
    		emoji: "🧙🏻‍♀",
    		description: "woman mage: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FC",
    		emoji: "🧙🏼‍♀️",
    		description: "woman mage: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FC",
    		emoji: "🧙🏼‍♀",
    		description: "woman mage: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FD",
    		emoji: "🧙🏽‍♀️",
    		description: "woman mage: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FD",
    		emoji: "🧙🏽‍♀",
    		description: "woman mage: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FE",
    		emoji: "🧙🏾‍♀️",
    		description: "woman mage: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FE",
    		emoji: "🧙🏾‍♀",
    		description: "woman mage: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FF",
    		emoji: "🧙🏿‍♀️",
    		description: "woman mage: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D9 1F3FF",
    		emoji: "🧙🏿‍♀",
    		description: "woman mage: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA",
    		emoji: "🧚",
    		description: "fairy",
    		keywords: [
    			"fairy"
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FB",
    		emoji: "🧚🏻",
    		description: "fairy: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FC",
    		emoji: "🧚🏼",
    		description: "fairy: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FD",
    		emoji: "🧚🏽",
    		description: "fairy: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FE",
    		emoji: "🧚🏾",
    		description: "fairy: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FF",
    		emoji: "🧚🏿",
    		description: "fairy: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FB",
    		emoji: "🧚🏻‍♂️",
    		description: "man fairy: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FB",
    		emoji: "🧚🏻‍♂",
    		description: "man fairy: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FC",
    		emoji: "🧚🏼‍♂️",
    		description: "man fairy: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FC",
    		emoji: "🧚🏼‍♂",
    		description: "man fairy: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FD",
    		emoji: "🧚🏽‍♂️",
    		description: "man fairy: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FD",
    		emoji: "🧚🏽‍♂",
    		description: "man fairy: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FE",
    		emoji: "🧚🏾‍♂️",
    		description: "man fairy: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FE",
    		emoji: "🧚🏾‍♂",
    		description: "man fairy: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FF",
    		emoji: "🧚🏿‍♂️",
    		description: "man fairy: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FF",
    		emoji: "🧚🏿‍♂",
    		description: "man fairy: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FB",
    		emoji: "🧚🏻‍♀️",
    		description: "woman fairy: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FB",
    		emoji: "🧚🏻‍♀",
    		description: "woman fairy: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FC",
    		emoji: "🧚🏼‍♀️",
    		description: "woman fairy: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FC",
    		emoji: "🧚🏼‍♀",
    		description: "woman fairy: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FD",
    		emoji: "🧚🏽‍♀️",
    		description: "woman fairy: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FD",
    		emoji: "🧚🏽‍♀",
    		description: "woman fairy: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FE",
    		emoji: "🧚🏾‍♀️",
    		description: "woman fairy: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FE",
    		emoji: "🧚🏾‍♀",
    		description: "woman fairy: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FF",
    		emoji: "🧚🏿‍♀️",
    		description: "woman fairy: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DA 1F3FF",
    		emoji: "🧚🏿‍♀",
    		description: "woman fairy: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB",
    		emoji: "🧛",
    		description: "vampire",
    		keywords: [
    			"vampire"
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FB",
    		emoji: "🧛🏻",
    		description: "vampire: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FC",
    		emoji: "🧛🏼",
    		description: "vampire: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FD",
    		emoji: "🧛🏽",
    		description: "vampire: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FE",
    		emoji: "🧛🏾",
    		description: "vampire: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FF",
    		emoji: "🧛🏿",
    		description: "vampire: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FB",
    		emoji: "🧛🏻‍♂️",
    		description: "man vampire: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FB",
    		emoji: "🧛🏻‍♂",
    		description: "man vampire: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FC",
    		emoji: "🧛🏼‍♂️",
    		description: "man vampire: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FC",
    		emoji: "🧛🏼‍♂",
    		description: "man vampire: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FD",
    		emoji: "🧛🏽‍♂️",
    		description: "man vampire: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FD",
    		emoji: "🧛🏽‍♂",
    		description: "man vampire: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FE",
    		emoji: "🧛🏾‍♂️",
    		description: "man vampire: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FE",
    		emoji: "🧛🏾‍♂",
    		description: "man vampire: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FF",
    		emoji: "🧛🏿‍♂️",
    		description: "man vampire: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FF",
    		emoji: "🧛🏿‍♂",
    		description: "man vampire: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FB",
    		emoji: "🧛🏻‍♀️",
    		description: "woman vampire: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FB",
    		emoji: "🧛🏻‍♀",
    		description: "woman vampire: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FC",
    		emoji: "🧛🏼‍♀️",
    		description: "woman vampire: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FC",
    		emoji: "🧛🏼‍♀",
    		description: "woman vampire: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FD",
    		emoji: "🧛🏽‍♀️",
    		description: "woman vampire: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FD",
    		emoji: "🧛🏽‍♀",
    		description: "woman vampire: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FE",
    		emoji: "🧛🏾‍♀️",
    		description: "woman vampire: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FE",
    		emoji: "🧛🏾‍♀",
    		description: "woman vampire: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FF",
    		emoji: "🧛🏿‍♀️",
    		description: "woman vampire: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DB 1F3FF",
    		emoji: "🧛🏿‍♀",
    		description: "woman vampire: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC",
    		emoji: "🧜",
    		description: "merperson",
    		keywords: [
    			"merperson"
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FB",
    		emoji: "🧜🏻",
    		description: "merperson: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FC",
    		emoji: "🧜🏼",
    		description: "merperson: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FD",
    		emoji: "🧜🏽",
    		description: "merperson: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FE",
    		emoji: "🧜🏾",
    		description: "merperson: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FF",
    		emoji: "🧜🏿",
    		description: "merperson: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FB",
    		emoji: "🧜🏻‍♂️",
    		description: "merman: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FB",
    		emoji: "🧜🏻‍♂",
    		description: "merman: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FC",
    		emoji: "🧜🏼‍♂️",
    		description: "merman: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FC",
    		emoji: "🧜🏼‍♂",
    		description: "merman: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FD",
    		emoji: "🧜🏽‍♂️",
    		description: "merman: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FD",
    		emoji: "🧜🏽‍♂",
    		description: "merman: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FE",
    		emoji: "🧜🏾‍♂️",
    		description: "merman: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FE",
    		emoji: "🧜🏾‍♂",
    		description: "merman: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FF",
    		emoji: "🧜🏿‍♂️",
    		description: "merman: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FF",
    		emoji: "🧜🏿‍♂",
    		description: "merman: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FB",
    		emoji: "🧜🏻‍♀️",
    		description: "mermaid: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FB",
    		emoji: "🧜🏻‍♀",
    		description: "mermaid: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FC",
    		emoji: "🧜🏼‍♀️",
    		description: "mermaid: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FC",
    		emoji: "🧜🏼‍♀",
    		description: "mermaid: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FD",
    		emoji: "🧜🏽‍♀️",
    		description: "mermaid: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FD",
    		emoji: "🧜🏽‍♀",
    		description: "mermaid: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FE",
    		emoji: "🧜🏾‍♀️",
    		description: "mermaid: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FE",
    		emoji: "🧜🏾‍♀",
    		description: "mermaid: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FF",
    		emoji: "🧜🏿‍♀️",
    		description: "mermaid: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DC 1F3FF",
    		emoji: "🧜🏿‍♀",
    		description: "mermaid: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD",
    		emoji: "🧝",
    		description: "elf",
    		keywords: [
    			"elf"
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FB",
    		emoji: "🧝🏻",
    		description: "elf: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FC",
    		emoji: "🧝🏼",
    		description: "elf: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FD",
    		emoji: "🧝🏽",
    		description: "elf: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FE",
    		emoji: "🧝🏾",
    		description: "elf: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FF",
    		emoji: "🧝🏿",
    		description: "elf: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FB",
    		emoji: "🧝🏻‍♂️",
    		description: "man elf: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FB",
    		emoji: "🧝🏻‍♂",
    		description: "man elf: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FC",
    		emoji: "🧝🏼‍♂️",
    		description: "man elf: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FC",
    		emoji: "🧝🏼‍♂",
    		description: "man elf: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FD",
    		emoji: "🧝🏽‍♂️",
    		description: "man elf: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FD",
    		emoji: "🧝🏽‍♂",
    		description: "man elf: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FE",
    		emoji: "🧝🏾‍♂️",
    		description: "man elf: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FE",
    		emoji: "🧝🏾‍♂",
    		description: "man elf: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FF",
    		emoji: "🧝🏿‍♂️",
    		description: "man elf: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FF",
    		emoji: "🧝🏿‍♂",
    		description: "man elf: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FB",
    		emoji: "🧝🏻‍♀️",
    		description: "woman elf: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FB",
    		emoji: "🧝🏻‍♀",
    		description: "woman elf: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FC",
    		emoji: "🧝🏼‍♀️",
    		description: "woman elf: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FC",
    		emoji: "🧝🏼‍♀",
    		description: "woman elf: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FD",
    		emoji: "🧝🏽‍♀️",
    		description: "woman elf: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FD",
    		emoji: "🧝🏽‍♀",
    		description: "woman elf: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FE",
    		emoji: "🧝🏾‍♀️",
    		description: "woman elf: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FE",
    		emoji: "🧝🏾‍♀",
    		description: "woman elf: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FF",
    		emoji: "🧝🏿‍♀️",
    		description: "woman elf: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DD 1F3FF",
    		emoji: "🧝🏿‍♀",
    		description: "woman elf: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9DE",
    		emoji: "🧞",
    		description: "genie",
    		keywords: [
    			"genie"
    		]
    	},
    	{
    		unicode: "1F9DF",
    		emoji: "🧟",
    		description: "zombie",
    		keywords: [
    			"zombie"
    		]
    	},
    	{
    		unicode: "1F486",
    		emoji: "💆",
    		description: "person getting massage",
    		keywords: [
    			"person getting massage"
    		]
    	},
    	{
    		unicode: "1F486 1F3FB",
    		emoji: "💆🏻",
    		description: "person getting massage: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F486 1F3FC",
    		emoji: "💆🏼",
    		description: "person getting massage: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F486 1F3FD",
    		emoji: "💆🏽",
    		description: "person getting massage: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F486 1F3FE",
    		emoji: "💆🏾",
    		description: "person getting massage: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F486 1F3FF",
    		emoji: "💆🏿",
    		description: "person getting massage: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F486 1F3FB",
    		emoji: "💆🏻‍♂️",
    		description: "man getting massage: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F486 1F3FB",
    		emoji: "💆🏻‍♂",
    		description: "man getting massage: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F486 1F3FC",
    		emoji: "💆🏼‍♂️",
    		description: "man getting massage: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F486 1F3FC",
    		emoji: "💆🏼‍♂",
    		description: "man getting massage: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F486 1F3FD",
    		emoji: "💆🏽‍♂️",
    		description: "man getting massage: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F486 1F3FD",
    		emoji: "💆🏽‍♂",
    		description: "man getting massage: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F486 1F3FE",
    		emoji: "💆🏾‍♂️",
    		description: "man getting massage: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F486 1F3FE",
    		emoji: "💆🏾‍♂",
    		description: "man getting massage: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F486 1F3FF",
    		emoji: "💆🏿‍♂️",
    		description: "man getting massage: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F486 1F3FF",
    		emoji: "💆🏿‍♂",
    		description: "man getting massage: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F486 1F3FB",
    		emoji: "💆🏻‍♀️",
    		description: "woman getting massage: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F486 1F3FB",
    		emoji: "💆🏻‍♀",
    		description: "woman getting massage: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F486 1F3FC",
    		emoji: "💆🏼‍♀️",
    		description: "woman getting massage: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F486 1F3FC",
    		emoji: "💆🏼‍♀",
    		description: "woman getting massage: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F486 1F3FD",
    		emoji: "💆🏽‍♀️",
    		description: "woman getting massage: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F486 1F3FD",
    		emoji: "💆🏽‍♀",
    		description: "woman getting massage: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F486 1F3FE",
    		emoji: "💆🏾‍♀️",
    		description: "woman getting massage: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F486 1F3FE",
    		emoji: "💆🏾‍♀",
    		description: "woman getting massage: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F486 1F3FF",
    		emoji: "💆🏿‍♀️",
    		description: "woman getting massage: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F486 1F3FF",
    		emoji: "💆🏿‍♀",
    		description: "woman getting massage: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F487",
    		emoji: "💇",
    		description: "person getting haircut",
    		keywords: [
    			"person getting haircut"
    		]
    	},
    	{
    		unicode: "1F487 1F3FB",
    		emoji: "💇🏻",
    		description: "person getting haircut: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F487 1F3FC",
    		emoji: "💇🏼",
    		description: "person getting haircut: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F487 1F3FD",
    		emoji: "💇🏽",
    		description: "person getting haircut: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F487 1F3FE",
    		emoji: "💇🏾",
    		description: "person getting haircut: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F487 1F3FF",
    		emoji: "💇🏿",
    		description: "person getting haircut: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F487 1F3FB",
    		emoji: "💇🏻‍♂️",
    		description: "man getting haircut: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F487 1F3FB",
    		emoji: "💇🏻‍♂",
    		description: "man getting haircut: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F487 1F3FC",
    		emoji: "💇🏼‍♂️",
    		description: "man getting haircut: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F487 1F3FC",
    		emoji: "💇🏼‍♂",
    		description: "man getting haircut: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F487 1F3FD",
    		emoji: "💇🏽‍♂️",
    		description: "man getting haircut: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F487 1F3FD",
    		emoji: "💇🏽‍♂",
    		description: "man getting haircut: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F487 1F3FE",
    		emoji: "💇🏾‍♂️",
    		description: "man getting haircut: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F487 1F3FE",
    		emoji: "💇🏾‍♂",
    		description: "man getting haircut: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F487 1F3FF",
    		emoji: "💇🏿‍♂️",
    		description: "man getting haircut: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F487 1F3FF",
    		emoji: "💇🏿‍♂",
    		description: "man getting haircut: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F487 1F3FB",
    		emoji: "💇🏻‍♀️",
    		description: "woman getting haircut: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F487 1F3FB",
    		emoji: "💇🏻‍♀",
    		description: "woman getting haircut: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F487 1F3FC",
    		emoji: "💇🏼‍♀️",
    		description: "woman getting haircut: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F487 1F3FC",
    		emoji: "💇🏼‍♀",
    		description: "woman getting haircut: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F487 1F3FD",
    		emoji: "💇🏽‍♀️",
    		description: "woman getting haircut: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F487 1F3FD",
    		emoji: "💇🏽‍♀",
    		description: "woman getting haircut: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F487 1F3FE",
    		emoji: "💇🏾‍♀️",
    		description: "woman getting haircut: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F487 1F3FE",
    		emoji: "💇🏾‍♀",
    		description: "woman getting haircut: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F487 1F3FF",
    		emoji: "💇🏿‍♀️",
    		description: "woman getting haircut: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F487 1F3FF",
    		emoji: "💇🏿‍♀",
    		description: "woman getting haircut: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B6",
    		emoji: "🚶",
    		description: "person walking",
    		keywords: [
    			"person walking"
    		]
    	},
    	{
    		unicode: "1F6B6 1F3FB",
    		emoji: "🚶🏻",
    		description: "person walking: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B6 1F3FC",
    		emoji: "🚶🏼",
    		description: "person walking: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B6 1F3FD",
    		emoji: "🚶🏽",
    		description: "person walking: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B6 1F3FE",
    		emoji: "🚶🏾",
    		description: "person walking: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B6 1F3FF",
    		emoji: "🚶🏿",
    		description: "person walking: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B6 1F3FB",
    		emoji: "🚶🏻‍♂️",
    		description: "man walking: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B6 1F3FB",
    		emoji: "🚶🏻‍♂",
    		description: "man walking: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B6 1F3FC",
    		emoji: "🚶🏼‍♂️",
    		description: "man walking: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B6 1F3FC",
    		emoji: "🚶🏼‍♂",
    		description: "man walking: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B6 1F3FD",
    		emoji: "🚶🏽‍♂️",
    		description: "man walking: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B6 1F3FD",
    		emoji: "🚶🏽‍♂",
    		description: "man walking: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B6 1F3FE",
    		emoji: "🚶🏾‍♂️",
    		description: "man walking: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B6 1F3FE",
    		emoji: "🚶🏾‍♂",
    		description: "man walking: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B6 1F3FF",
    		emoji: "🚶🏿‍♂️",
    		description: "man walking: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B6 1F3FF",
    		emoji: "🚶🏿‍♂",
    		description: "man walking: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B6 1F3FB",
    		emoji: "🚶🏻‍♀️",
    		description: "woman walking: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B6 1F3FB",
    		emoji: "🚶🏻‍♀",
    		description: "woman walking: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B6 1F3FC",
    		emoji: "🚶🏼‍♀️",
    		description: "woman walking: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B6 1F3FC",
    		emoji: "🚶🏼‍♀",
    		description: "woman walking: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B6 1F3FD",
    		emoji: "🚶🏽‍♀️",
    		description: "woman walking: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B6 1F3FD",
    		emoji: "🚶🏽‍♀",
    		description: "woman walking: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B6 1F3FE",
    		emoji: "🚶🏾‍♀️",
    		description: "woman walking: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B6 1F3FE",
    		emoji: "🚶🏾‍♀",
    		description: "woman walking: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B6 1F3FF",
    		emoji: "🚶🏿‍♀️",
    		description: "woman walking: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B6 1F3FF",
    		emoji: "🚶🏿‍♀",
    		description: "woman walking: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CD",
    		emoji: "🧍",
    		description: "person standing",
    		keywords: [
    			"person standing"
    		]
    	},
    	{
    		unicode: "1F9CD 1F3FB",
    		emoji: "🧍🏻",
    		description: "person standing: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CD 1F3FC",
    		emoji: "🧍🏼",
    		description: "person standing: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CD 1F3FD",
    		emoji: "🧍🏽",
    		description: "person standing: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CD 1F3FE",
    		emoji: "🧍🏾",
    		description: "person standing: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CD 1F3FF",
    		emoji: "🧍🏿",
    		description: "person standing: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CD 1F3FB",
    		emoji: "🧍🏻‍♂️",
    		description: "man standing: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CD 1F3FB",
    		emoji: "🧍🏻‍♂",
    		description: "man standing: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CD 1F3FC",
    		emoji: "🧍🏼‍♂️",
    		description: "man standing: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CD 1F3FC",
    		emoji: "🧍🏼‍♂",
    		description: "man standing: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CD 1F3FD",
    		emoji: "🧍🏽‍♂️",
    		description: "man standing: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CD 1F3FD",
    		emoji: "🧍🏽‍♂",
    		description: "man standing: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CD 1F3FE",
    		emoji: "🧍🏾‍♂️",
    		description: "man standing: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CD 1F3FE",
    		emoji: "🧍🏾‍♂",
    		description: "man standing: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CD 1F3FF",
    		emoji: "🧍🏿‍♂️",
    		description: "man standing: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CD 1F3FF",
    		emoji: "🧍🏿‍♂",
    		description: "man standing: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CD 1F3FB",
    		emoji: "🧍🏻‍♀️",
    		description: "woman standing: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CD 1F3FB",
    		emoji: "🧍🏻‍♀",
    		description: "woman standing: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CD 1F3FC",
    		emoji: "🧍🏼‍♀️",
    		description: "woman standing: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CD 1F3FC",
    		emoji: "🧍🏼‍♀",
    		description: "woman standing: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CD 1F3FD",
    		emoji: "🧍🏽‍♀️",
    		description: "woman standing: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CD 1F3FD",
    		emoji: "🧍🏽‍♀",
    		description: "woman standing: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CD 1F3FE",
    		emoji: "🧍🏾‍♀️",
    		description: "woman standing: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CD 1F3FE",
    		emoji: "🧍🏾‍♀",
    		description: "woman standing: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CD 1F3FF",
    		emoji: "🧍🏿‍♀️",
    		description: "woman standing: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CD 1F3FF",
    		emoji: "🧍🏿‍♀",
    		description: "woman standing: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CE",
    		emoji: "🧎",
    		description: "person kneeling",
    		keywords: [
    			"person kneeling"
    		]
    	},
    	{
    		unicode: "1F9CE 1F3FB",
    		emoji: "🧎🏻",
    		description: "person kneeling: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CE 1F3FC",
    		emoji: "🧎🏼",
    		description: "person kneeling: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CE 1F3FD",
    		emoji: "🧎🏽",
    		description: "person kneeling: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CE 1F3FE",
    		emoji: "🧎🏾",
    		description: "person kneeling: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CE 1F3FF",
    		emoji: "🧎🏿",
    		description: "person kneeling: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CE 1F3FB",
    		emoji: "🧎🏻‍♂️",
    		description: "man kneeling: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CE 1F3FB",
    		emoji: "🧎🏻‍♂",
    		description: "man kneeling: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CE 1F3FC",
    		emoji: "🧎🏼‍♂️",
    		description: "man kneeling: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CE 1F3FC",
    		emoji: "🧎🏼‍♂",
    		description: "man kneeling: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CE 1F3FD",
    		emoji: "🧎🏽‍♂️",
    		description: "man kneeling: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CE 1F3FD",
    		emoji: "🧎🏽‍♂",
    		description: "man kneeling: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CE 1F3FE",
    		emoji: "🧎🏾‍♂️",
    		description: "man kneeling: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CE 1F3FE",
    		emoji: "🧎🏾‍♂",
    		description: "man kneeling: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CE 1F3FF",
    		emoji: "🧎🏿‍♂️",
    		description: "man kneeling: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CE 1F3FF",
    		emoji: "🧎🏿‍♂",
    		description: "man kneeling: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CE 1F3FB",
    		emoji: "🧎🏻‍♀️",
    		description: "woman kneeling: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CE 1F3FB",
    		emoji: "🧎🏻‍♀",
    		description: "woman kneeling: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CE 1F3FC",
    		emoji: "🧎🏼‍♀️",
    		description: "woman kneeling: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CE 1F3FC",
    		emoji: "🧎🏼‍♀",
    		description: "woman kneeling: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CE 1F3FD",
    		emoji: "🧎🏽‍♀️",
    		description: "woman kneeling: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CE 1F3FD",
    		emoji: "🧎🏽‍♀",
    		description: "woman kneeling: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CE 1F3FE",
    		emoji: "🧎🏾‍♀️",
    		description: "woman kneeling: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CE 1F3FE",
    		emoji: "🧎🏾‍♀",
    		description: "woman kneeling: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CE 1F3FF",
    		emoji: "🧎🏿‍♀️",
    		description: "woman kneeling: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9CE 1F3FF",
    		emoji: "🧎🏿‍♀",
    		description: "woman kneeling: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍🦯",
    		description: "person with white cane: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍🦯",
    		description: "person with white cane: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍🦯",
    		description: "person with white cane: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍🦯",
    		description: "person with white cane: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍🦯",
    		description: "person with white cane: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍🦯",
    		description: "man with white cane: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍🦯",
    		description: "man with white cane: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍🦯",
    		description: "man with white cane: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍🦯",
    		description: "man with white cane: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍🦯",
    		description: "man with white cane: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍🦯",
    		description: "woman with white cane: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍🦯",
    		description: "woman with white cane: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍🦯",
    		description: "woman with white cane: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍🦯",
    		description: "woman with white cane: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍🦯",
    		description: "woman with white cane: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍🦼",
    		description: "person in motorized wheelchair: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍🦼",
    		description: "person in motorized wheelchair: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍🦼",
    		description: "person in motorized wheelchair: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍🦼",
    		description: "person in motorized wheelchair: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍🦼",
    		description: "person in motorized wheelchair: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍🦼",
    		description: "man in motorized wheelchair: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍🦼",
    		description: "man in motorized wheelchair: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍🦼",
    		description: "man in motorized wheelchair: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍🦼",
    		description: "man in motorized wheelchair: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍🦼",
    		description: "man in motorized wheelchair: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍🦼",
    		description: "woman in motorized wheelchair: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍🦼",
    		description: "woman in motorized wheelchair: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍🦼",
    		description: "woman in motorized wheelchair: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍🦼",
    		description: "woman in motorized wheelchair: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍🦼",
    		description: "woman in motorized wheelchair: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FB",
    		emoji: "🧑🏻‍🦽",
    		description: "person in manual wheelchair: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FC",
    		emoji: "🧑🏼‍🦽",
    		description: "person in manual wheelchair: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FD",
    		emoji: "🧑🏽‍🦽",
    		description: "person in manual wheelchair: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FE",
    		emoji: "🧑🏾‍🦽",
    		description: "person in manual wheelchair: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D1 1F3FF",
    		emoji: "🧑🏿‍🦽",
    		description: "person in manual wheelchair: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FB",
    		emoji: "👨🏻‍🦽",
    		description: "man in manual wheelchair: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FC",
    		emoji: "👨🏼‍🦽",
    		description: "man in manual wheelchair: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FD",
    		emoji: "👨🏽‍🦽",
    		description: "man in manual wheelchair: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FE",
    		emoji: "👨🏾‍🦽",
    		description: "man in manual wheelchair: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F468 1F3FF",
    		emoji: "👨🏿‍🦽",
    		description: "man in manual wheelchair: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FB",
    		emoji: "👩🏻‍🦽",
    		description: "woman in manual wheelchair: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FC",
    		emoji: "👩🏼‍🦽",
    		description: "woman in manual wheelchair: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FD",
    		emoji: "👩🏽‍🦽",
    		description: "woman in manual wheelchair: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FE",
    		emoji: "👩🏾‍🦽",
    		description: "woman in manual wheelchair: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F469 1F3FF",
    		emoji: "👩🏿‍🦽",
    		description: "woman in manual wheelchair: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C3",
    		emoji: "🏃",
    		description: "person running",
    		keywords: [
    			"person running"
    		]
    	},
    	{
    		unicode: "1F3C3 1F3FB",
    		emoji: "🏃🏻",
    		description: "person running: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C3 1F3FC",
    		emoji: "🏃🏼",
    		description: "person running: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C3 1F3FD",
    		emoji: "🏃🏽",
    		description: "person running: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C3 1F3FE",
    		emoji: "🏃🏾",
    		description: "person running: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C3 1F3FF",
    		emoji: "🏃🏿",
    		description: "person running: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C3 1F3FB",
    		emoji: "🏃🏻‍♂️",
    		description: "man running: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C3 1F3FB",
    		emoji: "🏃🏻‍♂",
    		description: "man running: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C3 1F3FC",
    		emoji: "🏃🏼‍♂️",
    		description: "man running: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C3 1F3FC",
    		emoji: "🏃🏼‍♂",
    		description: "man running: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C3 1F3FD",
    		emoji: "🏃🏽‍♂️",
    		description: "man running: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C3 1F3FD",
    		emoji: "🏃🏽‍♂",
    		description: "man running: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C3 1F3FE",
    		emoji: "🏃🏾‍♂️",
    		description: "man running: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C3 1F3FE",
    		emoji: "🏃🏾‍♂",
    		description: "man running: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C3 1F3FF",
    		emoji: "🏃🏿‍♂️",
    		description: "man running: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C3 1F3FF",
    		emoji: "🏃🏿‍♂",
    		description: "man running: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C3 1F3FB",
    		emoji: "🏃🏻‍♀️",
    		description: "woman running: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C3 1F3FB",
    		emoji: "🏃🏻‍♀",
    		description: "woman running: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C3 1F3FC",
    		emoji: "🏃🏼‍♀️",
    		description: "woman running: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C3 1F3FC",
    		emoji: "🏃🏼‍♀",
    		description: "woman running: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C3 1F3FD",
    		emoji: "🏃🏽‍♀️",
    		description: "woman running: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C3 1F3FD",
    		emoji: "🏃🏽‍♀",
    		description: "woman running: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C3 1F3FE",
    		emoji: "🏃🏾‍♀️",
    		description: "woman running: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C3 1F3FE",
    		emoji: "🏃🏾‍♀",
    		description: "woman running: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C3 1F3FF",
    		emoji: "🏃🏿‍♀️",
    		description: "woman running: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C3 1F3FF",
    		emoji: "🏃🏿‍♀",
    		description: "woman running: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F483",
    		emoji: "💃",
    		description: "woman dancing",
    		keywords: [
    			"woman dancing"
    		]
    	},
    	{
    		unicode: "1F483 1F3FB",
    		emoji: "💃🏻",
    		description: "woman dancing: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F483 1F3FC",
    		emoji: "💃🏼",
    		description: "woman dancing: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F483 1F3FD",
    		emoji: "💃🏽",
    		description: "woman dancing: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F483 1F3FE",
    		emoji: "💃🏾",
    		description: "woman dancing: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F483 1F3FF",
    		emoji: "💃🏿",
    		description: "woman dancing: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F57A",
    		emoji: "🕺",
    		description: "man dancing",
    		keywords: [
    			"man dancing"
    		]
    	},
    	{
    		unicode: "1F57A 1F3FB",
    		emoji: "🕺🏻",
    		description: "man dancing: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F57A 1F3FC",
    		emoji: "🕺🏼",
    		description: "man dancing: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F57A 1F3FD",
    		emoji: "🕺🏽",
    		description: "man dancing: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F57A 1F3FE",
    		emoji: "🕺🏾",
    		description: "man dancing: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F57A 1F3FF",
    		emoji: "🕺🏿",
    		description: "man dancing: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F574 FE0F",
    		emoji: "🕴️",
    		description: "person in suit levitating",
    		keywords: [
    			"person in suit levitating"
    		]
    	},
    	{
    		unicode: "1F574",
    		emoji: "🕴",
    		description: "person in suit levitating",
    		keywords: [
    			"person in suit levitating"
    		]
    	},
    	{
    		unicode: "1F574 1F3FB",
    		emoji: "🕴🏻",
    		description: "person in suit levitating: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F574 1F3FC",
    		emoji: "🕴🏼",
    		description: "person in suit levitating: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F574 1F3FD",
    		emoji: "🕴🏽",
    		description: "person in suit levitating: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F574 1F3FE",
    		emoji: "🕴🏾",
    		description: "person in suit levitating: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F574 1F3FF",
    		emoji: "🕴🏿",
    		description: "person in suit levitating: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F46F",
    		emoji: "👯",
    		description: "people with bunny ears",
    		keywords: [
    			"people with bunny ears"
    		]
    	},
    	{
    		unicode: "1F9D6",
    		emoji: "🧖",
    		description: "person in steamy room",
    		keywords: [
    			"person in steamy room"
    		]
    	},
    	{
    		unicode: "1F9D6 1F3FB",
    		emoji: "🧖🏻",
    		description: "person in steamy room: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D6 1F3FC",
    		emoji: "🧖🏼",
    		description: "person in steamy room: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D6 1F3FD",
    		emoji: "🧖🏽",
    		description: "person in steamy room: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D6 1F3FE",
    		emoji: "🧖🏾",
    		description: "person in steamy room: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D6 1F3FF",
    		emoji: "🧖🏿",
    		description: "person in steamy room: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D6 1F3FB",
    		emoji: "🧖🏻‍♂️",
    		description: "man in steamy room: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D6 1F3FB",
    		emoji: "🧖🏻‍♂",
    		description: "man in steamy room: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D6 1F3FC",
    		emoji: "🧖🏼‍♂️",
    		description: "man in steamy room: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D6 1F3FC",
    		emoji: "🧖🏼‍♂",
    		description: "man in steamy room: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D6 1F3FD",
    		emoji: "🧖🏽‍♂️",
    		description: "man in steamy room: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D6 1F3FD",
    		emoji: "🧖🏽‍♂",
    		description: "man in steamy room: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D6 1F3FE",
    		emoji: "🧖🏾‍♂️",
    		description: "man in steamy room: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D6 1F3FE",
    		emoji: "🧖🏾‍♂",
    		description: "man in steamy room: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D6 1F3FF",
    		emoji: "🧖🏿‍♂️",
    		description: "man in steamy room: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D6 1F3FF",
    		emoji: "🧖🏿‍♂",
    		description: "man in steamy room: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D6 1F3FB",
    		emoji: "🧖🏻‍♀️",
    		description: "woman in steamy room: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D6 1F3FB",
    		emoji: "🧖🏻‍♀",
    		description: "woman in steamy room: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D6 1F3FC",
    		emoji: "🧖🏼‍♀️",
    		description: "woman in steamy room: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D6 1F3FC",
    		emoji: "🧖🏼‍♀",
    		description: "woman in steamy room: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D6 1F3FD",
    		emoji: "🧖🏽‍♀️",
    		description: "woman in steamy room: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D6 1F3FD",
    		emoji: "🧖🏽‍♀",
    		description: "woman in steamy room: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D6 1F3FE",
    		emoji: "🧖🏾‍♀️",
    		description: "woman in steamy room: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D6 1F3FE",
    		emoji: "🧖🏾‍♀",
    		description: "woman in steamy room: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D6 1F3FF",
    		emoji: "🧖🏿‍♀️",
    		description: "woman in steamy room: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D6 1F3FF",
    		emoji: "🧖🏿‍♀",
    		description: "woman in steamy room: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D7",
    		emoji: "🧗",
    		description: "person climbing",
    		keywords: [
    			"person climbing"
    		]
    	},
    	{
    		unicode: "1F9D7 1F3FB",
    		emoji: "🧗🏻",
    		description: "person climbing: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D7 1F3FC",
    		emoji: "🧗🏼",
    		description: "person climbing: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D7 1F3FD",
    		emoji: "🧗🏽",
    		description: "person climbing: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D7 1F3FE",
    		emoji: "🧗🏾",
    		description: "person climbing: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D7 1F3FF",
    		emoji: "🧗🏿",
    		description: "person climbing: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D7 1F3FB",
    		emoji: "🧗🏻‍♂️",
    		description: "man climbing: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D7 1F3FB",
    		emoji: "🧗🏻‍♂",
    		description: "man climbing: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D7 1F3FC",
    		emoji: "🧗🏼‍♂️",
    		description: "man climbing: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D7 1F3FC",
    		emoji: "🧗🏼‍♂",
    		description: "man climbing: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D7 1F3FD",
    		emoji: "🧗🏽‍♂️",
    		description: "man climbing: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D7 1F3FD",
    		emoji: "🧗🏽‍♂",
    		description: "man climbing: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D7 1F3FE",
    		emoji: "🧗🏾‍♂️",
    		description: "man climbing: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D7 1F3FE",
    		emoji: "🧗🏾‍♂",
    		description: "man climbing: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D7 1F3FF",
    		emoji: "🧗🏿‍♂️",
    		description: "man climbing: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D7 1F3FF",
    		emoji: "🧗🏿‍♂",
    		description: "man climbing: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D7 1F3FB",
    		emoji: "🧗🏻‍♀️",
    		description: "woman climbing: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D7 1F3FB",
    		emoji: "🧗🏻‍♀",
    		description: "woman climbing: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D7 1F3FC",
    		emoji: "🧗🏼‍♀️",
    		description: "woman climbing: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D7 1F3FC",
    		emoji: "🧗🏼‍♀",
    		description: "woman climbing: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D7 1F3FD",
    		emoji: "🧗🏽‍♀️",
    		description: "woman climbing: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D7 1F3FD",
    		emoji: "🧗🏽‍♀",
    		description: "woman climbing: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D7 1F3FE",
    		emoji: "🧗🏾‍♀️",
    		description: "woman climbing: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D7 1F3FE",
    		emoji: "🧗🏾‍♀",
    		description: "woman climbing: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D7 1F3FF",
    		emoji: "🧗🏿‍♀️",
    		description: "woman climbing: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D7 1F3FF",
    		emoji: "🧗🏿‍♀",
    		description: "woman climbing: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F93A",
    		emoji: "🤺",
    		description: "person fencing",
    		keywords: [
    			"person fencing"
    		]
    	},
    	{
    		unicode: "1F3C7",
    		emoji: "🏇",
    		description: "horse racing",
    		keywords: [
    			"horse racing"
    		]
    	},
    	{
    		unicode: "1F3C7 1F3FB",
    		emoji: "🏇🏻",
    		description: "horse racing: light skin tone",
    		keywords: [
    			"horse racing"
    		]
    	},
    	{
    		unicode: "1F3C7 1F3FC",
    		emoji: "🏇🏼",
    		description: "horse racing: medium-light skin tone",
    		keywords: [
    			"horse racing"
    		]
    	},
    	{
    		unicode: "1F3C7 1F3FD",
    		emoji: "🏇🏽",
    		description: "horse racing: medium skin tone",
    		keywords: [
    			"horse racing"
    		]
    	},
    	{
    		unicode: "1F3C7 1F3FE",
    		emoji: "🏇🏾",
    		description: "horse racing: medium-dark skin tone",
    		keywords: [
    			"horse racing"
    		]
    	},
    	{
    		unicode: "1F3C7 1F3FF",
    		emoji: "🏇🏿",
    		description: "horse racing: dark skin tone",
    		keywords: [
    			"horse racing"
    		]
    	},
    	{
    		unicode: "26F7 FE0F",
    		emoji: "⛷️",
    		description: "skier",
    		keywords: [
    			"skier"
    		]
    	},
    	{
    		unicode: "26F7",
    		emoji: "⛷",
    		description: "skier",
    		keywords: [
    			"skier"
    		]
    	},
    	{
    		unicode: "1F3C2",
    		emoji: "🏂",
    		description: "snowboarder",
    		keywords: [
    			"snowboarder"
    		]
    	},
    	{
    		unicode: "1F3C2 1F3FB",
    		emoji: "🏂🏻",
    		description: "snowboarder: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C2 1F3FC",
    		emoji: "🏂🏼",
    		description: "snowboarder: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C2 1F3FD",
    		emoji: "🏂🏽",
    		description: "snowboarder: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C2 1F3FE",
    		emoji: "🏂🏾",
    		description: "snowboarder: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C2 1F3FF",
    		emoji: "🏂🏿",
    		description: "snowboarder: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CC FE0F",
    		emoji: "🏌️",
    		description: "person golfing",
    		keywords: [
    			"person golfing"
    		]
    	},
    	{
    		unicode: "1F3CC",
    		emoji: "🏌",
    		description: "person golfing",
    		keywords: [
    			"person golfing"
    		]
    	},
    	{
    		unicode: "1F3CC 1F3FB",
    		emoji: "🏌🏻",
    		description: "person golfing: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CC 1F3FC",
    		emoji: "🏌🏼",
    		description: "person golfing: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CC 1F3FD",
    		emoji: "🏌🏽",
    		description: "person golfing: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CC 1F3FE",
    		emoji: "🏌🏾",
    		description: "person golfing: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CC 1F3FF",
    		emoji: "🏌🏿",
    		description: "person golfing: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CC 1F3FB",
    		emoji: "🏌🏻‍♂️",
    		description: "man golfing: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CC 1F3FB",
    		emoji: "🏌🏻‍♂",
    		description: "man golfing: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CC 1F3FC",
    		emoji: "🏌🏼‍♂️",
    		description: "man golfing: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CC 1F3FC",
    		emoji: "🏌🏼‍♂",
    		description: "man golfing: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CC 1F3FD",
    		emoji: "🏌🏽‍♂️",
    		description: "man golfing: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CC 1F3FD",
    		emoji: "🏌🏽‍♂",
    		description: "man golfing: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CC 1F3FE",
    		emoji: "🏌🏾‍♂️",
    		description: "man golfing: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CC 1F3FE",
    		emoji: "🏌🏾‍♂",
    		description: "man golfing: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CC 1F3FF",
    		emoji: "🏌🏿‍♂️",
    		description: "man golfing: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CC 1F3FF",
    		emoji: "🏌🏿‍♂",
    		description: "man golfing: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CC 1F3FB",
    		emoji: "🏌🏻‍♀️",
    		description: "woman golfing: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CC 1F3FB",
    		emoji: "🏌🏻‍♀",
    		description: "woman golfing: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CC 1F3FC",
    		emoji: "🏌🏼‍♀️",
    		description: "woman golfing: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CC 1F3FC",
    		emoji: "🏌🏼‍♀",
    		description: "woman golfing: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CC 1F3FD",
    		emoji: "🏌🏽‍♀️",
    		description: "woman golfing: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CC 1F3FD",
    		emoji: "🏌🏽‍♀",
    		description: "woman golfing: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CC 1F3FE",
    		emoji: "🏌🏾‍♀️",
    		description: "woman golfing: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CC 1F3FE",
    		emoji: "🏌🏾‍♀",
    		description: "woman golfing: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CC 1F3FF",
    		emoji: "🏌🏿‍♀️",
    		description: "woman golfing: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CC 1F3FF",
    		emoji: "🏌🏿‍♀",
    		description: "woman golfing: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3C4",
    		emoji: "🏄",
    		description: "person surfing",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F3C4 1F3FB",
    		emoji: "🏄🏻",
    		description: "person surfing: light skin tone",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F3C4 1F3FC",
    		emoji: "🏄🏼",
    		description: "person surfing: medium-light skin tone",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F3C4 1F3FD",
    		emoji: "🏄🏽",
    		description: "person surfing: medium skin tone",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F3C4 1F3FE",
    		emoji: "🏄🏾",
    		description: "person surfing: medium-dark skin tone",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F3C4 1F3FF",
    		emoji: "🏄🏿",
    		description: "person surfing: dark skin tone",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F3C4 1F3FB",
    		emoji: "🏄🏻‍♂️",
    		description: "man surfing: light skin tone",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F3C4 1F3FB",
    		emoji: "🏄🏻‍♂",
    		description: "man surfing: light skin tone",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F3C4 1F3FC",
    		emoji: "🏄🏼‍♂️",
    		description: "man surfing: medium-light skin tone",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F3C4 1F3FC",
    		emoji: "🏄🏼‍♂",
    		description: "man surfing: medium-light skin tone",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F3C4 1F3FD",
    		emoji: "🏄🏽‍♂️",
    		description: "man surfing: medium skin tone",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F3C4 1F3FD",
    		emoji: "🏄🏽‍♂",
    		description: "man surfing: medium skin tone",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F3C4 1F3FE",
    		emoji: "🏄🏾‍♂️",
    		description: "man surfing: medium-dark skin tone",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F3C4 1F3FE",
    		emoji: "🏄🏾‍♂",
    		description: "man surfing: medium-dark skin tone",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F3C4 1F3FF",
    		emoji: "🏄🏿‍♂️",
    		description: "man surfing: dark skin tone",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F3C4 1F3FF",
    		emoji: "🏄🏿‍♂",
    		description: "man surfing: dark skin tone",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F3C4 1F3FB",
    		emoji: "🏄🏻‍♀️",
    		description: "woman surfing: light skin tone",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F3C4 1F3FB",
    		emoji: "🏄🏻‍♀",
    		description: "woman surfing: light skin tone",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F3C4 1F3FC",
    		emoji: "🏄🏼‍♀️",
    		description: "woman surfing: medium-light skin tone",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F3C4 1F3FC",
    		emoji: "🏄🏼‍♀",
    		description: "woman surfing: medium-light skin tone",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F3C4 1F3FD",
    		emoji: "🏄🏽‍♀️",
    		description: "woman surfing: medium skin tone",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F3C4 1F3FD",
    		emoji: "🏄🏽‍♀",
    		description: "woman surfing: medium skin tone",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F3C4 1F3FE",
    		emoji: "🏄🏾‍♀️",
    		description: "woman surfing: medium-dark skin tone",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F3C4 1F3FE",
    		emoji: "🏄🏾‍♀",
    		description: "woman surfing: medium-dark skin tone",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F3C4 1F3FF",
    		emoji: "🏄🏿‍♀️",
    		description: "woman surfing: dark skin tone",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F3C4 1F3FF",
    		emoji: "🏄🏿‍♀",
    		description: "woman surfing: dark skin tone",
    		keywords: [
    			"surf",
    			"surfing"
    		]
    	},
    	{
    		unicode: "1F6A3",
    		emoji: "🚣",
    		description: "person rowing boat",
    		keywords: [
    			"person rowing boat"
    		]
    	},
    	{
    		unicode: "1F6A3 1F3FB",
    		emoji: "🚣🏻",
    		description: "person rowing boat: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6A3 1F3FC",
    		emoji: "🚣🏼",
    		description: "person rowing boat: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6A3 1F3FD",
    		emoji: "🚣🏽",
    		description: "person rowing boat: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6A3 1F3FE",
    		emoji: "🚣🏾",
    		description: "person rowing boat: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6A3 1F3FF",
    		emoji: "🚣🏿",
    		description: "person rowing boat: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6A3 1F3FB",
    		emoji: "🚣🏻‍♂️",
    		description: "man rowing boat: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6A3 1F3FB",
    		emoji: "🚣🏻‍♂",
    		description: "man rowing boat: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6A3 1F3FC",
    		emoji: "🚣🏼‍♂️",
    		description: "man rowing boat: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6A3 1F3FC",
    		emoji: "🚣🏼‍♂",
    		description: "man rowing boat: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6A3 1F3FD",
    		emoji: "🚣🏽‍♂️",
    		description: "man rowing boat: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6A3 1F3FD",
    		emoji: "🚣🏽‍♂",
    		description: "man rowing boat: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6A3 1F3FE",
    		emoji: "🚣🏾‍♂️",
    		description: "man rowing boat: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6A3 1F3FE",
    		emoji: "🚣🏾‍♂",
    		description: "man rowing boat: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6A3 1F3FF",
    		emoji: "🚣🏿‍♂️",
    		description: "man rowing boat: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6A3 1F3FF",
    		emoji: "🚣🏿‍♂",
    		description: "man rowing boat: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6A3 1F3FB",
    		emoji: "🚣🏻‍♀️",
    		description: "woman rowing boat: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6A3 1F3FB",
    		emoji: "🚣🏻‍♀",
    		description: "woman rowing boat: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6A3 1F3FC",
    		emoji: "🚣🏼‍♀️",
    		description: "woman rowing boat: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6A3 1F3FC",
    		emoji: "🚣🏼‍♀",
    		description: "woman rowing boat: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6A3 1F3FD",
    		emoji: "🚣🏽‍♀️",
    		description: "woman rowing boat: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6A3 1F3FD",
    		emoji: "🚣🏽‍♀",
    		description: "woman rowing boat: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6A3 1F3FE",
    		emoji: "🚣🏾‍♀️",
    		description: "woman rowing boat: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6A3 1F3FE",
    		emoji: "🚣🏾‍♀",
    		description: "woman rowing boat: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6A3 1F3FF",
    		emoji: "🚣🏿‍♀️",
    		description: "woman rowing boat: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6A3 1F3FF",
    		emoji: "🚣🏿‍♀",
    		description: "woman rowing boat: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CA",
    		emoji: "🏊",
    		description: "person swimming",
    		keywords: [
    			"person swimming"
    		]
    	},
    	{
    		unicode: "1F3CA 1F3FB",
    		emoji: "🏊🏻",
    		description: "person swimming: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CA 1F3FC",
    		emoji: "🏊🏼",
    		description: "person swimming: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CA 1F3FD",
    		emoji: "🏊🏽",
    		description: "person swimming: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CA 1F3FE",
    		emoji: "🏊🏾",
    		description: "person swimming: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CA 1F3FF",
    		emoji: "🏊🏿",
    		description: "person swimming: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CA 1F3FB",
    		emoji: "🏊🏻‍♂️",
    		description: "man swimming: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CA 1F3FB",
    		emoji: "🏊🏻‍♂",
    		description: "man swimming: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CA 1F3FC",
    		emoji: "🏊🏼‍♂️",
    		description: "man swimming: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CA 1F3FC",
    		emoji: "🏊🏼‍♂",
    		description: "man swimming: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CA 1F3FD",
    		emoji: "🏊🏽‍♂️",
    		description: "man swimming: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CA 1F3FD",
    		emoji: "🏊🏽‍♂",
    		description: "man swimming: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CA 1F3FE",
    		emoji: "🏊🏾‍♂️",
    		description: "man swimming: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CA 1F3FE",
    		emoji: "🏊🏾‍♂",
    		description: "man swimming: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CA 1F3FF",
    		emoji: "🏊🏿‍♂️",
    		description: "man swimming: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CA 1F3FF",
    		emoji: "🏊🏿‍♂",
    		description: "man swimming: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CA 1F3FB",
    		emoji: "🏊🏻‍♀️",
    		description: "woman swimming: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CA 1F3FB",
    		emoji: "🏊🏻‍♀",
    		description: "woman swimming: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CA 1F3FC",
    		emoji: "🏊🏼‍♀️",
    		description: "woman swimming: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CA 1F3FC",
    		emoji: "🏊🏼‍♀",
    		description: "woman swimming: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CA 1F3FD",
    		emoji: "🏊🏽‍♀️",
    		description: "woman swimming: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CA 1F3FD",
    		emoji: "🏊🏽‍♀",
    		description: "woman swimming: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CA 1F3FE",
    		emoji: "🏊🏾‍♀️",
    		description: "woman swimming: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CA 1F3FE",
    		emoji: "🏊🏾‍♀",
    		description: "woman swimming: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CA 1F3FF",
    		emoji: "🏊🏿‍♀️",
    		description: "woman swimming: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CA 1F3FF",
    		emoji: "🏊🏿‍♀",
    		description: "woman swimming: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "26F9 FE0F",
    		emoji: "⛹️",
    		description: "person bouncing ball",
    		keywords: [
    			"person bouncing ball"
    		]
    	},
    	{
    		unicode: "26F9",
    		emoji: "⛹",
    		description: "person bouncing ball",
    		keywords: [
    			"person bouncing ball"
    		]
    	},
    	{
    		unicode: "26F9 1F3FB",
    		emoji: "⛹🏻",
    		description: "person bouncing ball: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "26F9 1F3FC",
    		emoji: "⛹🏼",
    		description: "person bouncing ball: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "26F9 1F3FD",
    		emoji: "⛹🏽",
    		description: "person bouncing ball: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "26F9 1F3FE",
    		emoji: "⛹🏾",
    		description: "person bouncing ball: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "26F9 1F3FF",
    		emoji: "⛹🏿",
    		description: "person bouncing ball: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CB FE0F",
    		emoji: "🏋️",
    		description: "person lifting weights",
    		keywords: [
    			"person lifting weights"
    		]
    	},
    	{
    		unicode: "1F3CB",
    		emoji: "🏋",
    		description: "person lifting weights",
    		keywords: [
    			"person lifting weights"
    		]
    	},
    	{
    		unicode: "1F3CB 1F3FB",
    		emoji: "🏋🏻",
    		description: "person lifting weights: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CB 1F3FC",
    		emoji: "🏋🏼",
    		description: "person lifting weights: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CB 1F3FD",
    		emoji: "🏋🏽",
    		description: "person lifting weights: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CB 1F3FE",
    		emoji: "🏋🏾",
    		description: "person lifting weights: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CB 1F3FF",
    		emoji: "🏋🏿",
    		description: "person lifting weights: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CB 1F3FB",
    		emoji: "🏋🏻‍♂️",
    		description: "man lifting weights: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CB 1F3FB",
    		emoji: "🏋🏻‍♂",
    		description: "man lifting weights: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CB 1F3FC",
    		emoji: "🏋🏼‍♂️",
    		description: "man lifting weights: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CB 1F3FC",
    		emoji: "🏋🏼‍♂",
    		description: "man lifting weights: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CB 1F3FD",
    		emoji: "🏋🏽‍♂️",
    		description: "man lifting weights: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CB 1F3FD",
    		emoji: "🏋🏽‍♂",
    		description: "man lifting weights: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CB 1F3FE",
    		emoji: "🏋🏾‍♂️",
    		description: "man lifting weights: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CB 1F3FE",
    		emoji: "🏋🏾‍♂",
    		description: "man lifting weights: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CB 1F3FF",
    		emoji: "🏋🏿‍♂️",
    		description: "man lifting weights: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CB 1F3FF",
    		emoji: "🏋🏿‍♂",
    		description: "man lifting weights: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CB 1F3FB",
    		emoji: "🏋🏻‍♀️",
    		description: "woman lifting weights: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CB 1F3FB",
    		emoji: "🏋🏻‍♀",
    		description: "woman lifting weights: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CB 1F3FC",
    		emoji: "🏋🏼‍♀️",
    		description: "woman lifting weights: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CB 1F3FC",
    		emoji: "🏋🏼‍♀",
    		description: "woman lifting weights: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CB 1F3FD",
    		emoji: "🏋🏽‍♀️",
    		description: "woman lifting weights: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CB 1F3FD",
    		emoji: "🏋🏽‍♀",
    		description: "woman lifting weights: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CB 1F3FE",
    		emoji: "🏋🏾‍♀️",
    		description: "woman lifting weights: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CB 1F3FE",
    		emoji: "🏋🏾‍♀",
    		description: "woman lifting weights: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CB 1F3FF",
    		emoji: "🏋🏿‍♀️",
    		description: "woman lifting weights: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3CB 1F3FF",
    		emoji: "🏋🏿‍♀",
    		description: "woman lifting weights: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B4",
    		emoji: "🚴",
    		description: "person biking",
    		keywords: [
    			"person biking"
    		]
    	},
    	{
    		unicode: "1F6B4 1F3FB",
    		emoji: "🚴🏻",
    		description: "person biking: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B4 1F3FC",
    		emoji: "🚴🏼",
    		description: "person biking: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B4 1F3FD",
    		emoji: "🚴🏽",
    		description: "person biking: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B4 1F3FE",
    		emoji: "🚴🏾",
    		description: "person biking: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B4 1F3FF",
    		emoji: "🚴🏿",
    		description: "person biking: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B4 1F3FB",
    		emoji: "🚴🏻‍♂️",
    		description: "man biking: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B4 1F3FB",
    		emoji: "🚴🏻‍♂",
    		description: "man biking: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B4 1F3FC",
    		emoji: "🚴🏼‍♂️",
    		description: "man biking: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B4 1F3FC",
    		emoji: "🚴🏼‍♂",
    		description: "man biking: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B4 1F3FD",
    		emoji: "🚴🏽‍♂️",
    		description: "man biking: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B4 1F3FD",
    		emoji: "🚴🏽‍♂",
    		description: "man biking: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B4 1F3FE",
    		emoji: "🚴🏾‍♂️",
    		description: "man biking: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B4 1F3FE",
    		emoji: "🚴🏾‍♂",
    		description: "man biking: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B4 1F3FF",
    		emoji: "🚴🏿‍♂️",
    		description: "man biking: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B4 1F3FF",
    		emoji: "🚴🏿‍♂",
    		description: "man biking: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B4 1F3FB",
    		emoji: "🚴🏻‍♀️",
    		description: "woman biking: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B4 1F3FB",
    		emoji: "🚴🏻‍♀",
    		description: "woman biking: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B4 1F3FC",
    		emoji: "🚴🏼‍♀️",
    		description: "woman biking: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B4 1F3FC",
    		emoji: "🚴🏼‍♀",
    		description: "woman biking: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B4 1F3FD",
    		emoji: "🚴🏽‍♀️",
    		description: "woman biking: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B4 1F3FD",
    		emoji: "🚴🏽‍♀",
    		description: "woman biking: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B4 1F3FE",
    		emoji: "🚴🏾‍♀️",
    		description: "woman biking: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B4 1F3FE",
    		emoji: "🚴🏾‍♀",
    		description: "woman biking: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B4 1F3FF",
    		emoji: "🚴🏿‍♀️",
    		description: "woman biking: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B4 1F3FF",
    		emoji: "🚴🏿‍♀",
    		description: "woman biking: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B5",
    		emoji: "🚵",
    		description: "person mountain biking",
    		keywords: [
    			"person mountain biking"
    		]
    	},
    	{
    		unicode: "1F6B5 1F3FB",
    		emoji: "🚵🏻",
    		description: "person mountain biking: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B5 1F3FC",
    		emoji: "🚵🏼",
    		description: "person mountain biking: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B5 1F3FD",
    		emoji: "🚵🏽",
    		description: "person mountain biking: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B5 1F3FE",
    		emoji: "🚵🏾",
    		description: "person mountain biking: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B5 1F3FF",
    		emoji: "🚵🏿",
    		description: "person mountain biking: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B5 1F3FB",
    		emoji: "🚵🏻‍♂️",
    		description: "man mountain biking: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B5 1F3FB",
    		emoji: "🚵🏻‍♂",
    		description: "man mountain biking: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B5 1F3FC",
    		emoji: "🚵🏼‍♂️",
    		description: "man mountain biking: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B5 1F3FC",
    		emoji: "🚵🏼‍♂",
    		description: "man mountain biking: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B5 1F3FD",
    		emoji: "🚵🏽‍♂️",
    		description: "man mountain biking: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B5 1F3FD",
    		emoji: "🚵🏽‍♂",
    		description: "man mountain biking: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B5 1F3FE",
    		emoji: "🚵🏾‍♂️",
    		description: "man mountain biking: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B5 1F3FE",
    		emoji: "🚵🏾‍♂",
    		description: "man mountain biking: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B5 1F3FF",
    		emoji: "🚵🏿‍♂️",
    		description: "man mountain biking: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B5 1F3FF",
    		emoji: "🚵🏿‍♂",
    		description: "man mountain biking: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B5 1F3FB",
    		emoji: "🚵🏻‍♀️",
    		description: "woman mountain biking: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B5 1F3FB",
    		emoji: "🚵🏻‍♀",
    		description: "woman mountain biking: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B5 1F3FC",
    		emoji: "🚵🏼‍♀️",
    		description: "woman mountain biking: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B5 1F3FC",
    		emoji: "🚵🏼‍♀",
    		description: "woman mountain biking: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B5 1F3FD",
    		emoji: "🚵🏽‍♀️",
    		description: "woman mountain biking: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B5 1F3FD",
    		emoji: "🚵🏽‍♀",
    		description: "woman mountain biking: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B5 1F3FE",
    		emoji: "🚵🏾‍♀️",
    		description: "woman mountain biking: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B5 1F3FE",
    		emoji: "🚵🏾‍♀",
    		description: "woman mountain biking: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B5 1F3FF",
    		emoji: "🚵🏿‍♀️",
    		description: "woman mountain biking: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6B5 1F3FF",
    		emoji: "🚵🏿‍♀",
    		description: "woman mountain biking: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F938",
    		emoji: "🤸",
    		description: "person cartwheeling",
    		keywords: [
    			"person cartwheeling"
    		]
    	},
    	{
    		unicode: "1F938 1F3FB",
    		emoji: "🤸🏻",
    		description: "person cartwheeling: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F938 1F3FC",
    		emoji: "🤸🏼",
    		description: "person cartwheeling: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F938 1F3FD",
    		emoji: "🤸🏽",
    		description: "person cartwheeling: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F938 1F3FE",
    		emoji: "🤸🏾",
    		description: "person cartwheeling: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F938 1F3FF",
    		emoji: "🤸🏿",
    		description: "person cartwheeling: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F938 1F3FB",
    		emoji: "🤸🏻‍♂️",
    		description: "man cartwheeling: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F938 1F3FB",
    		emoji: "🤸🏻‍♂",
    		description: "man cartwheeling: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F938 1F3FC",
    		emoji: "🤸🏼‍♂️",
    		description: "man cartwheeling: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F938 1F3FC",
    		emoji: "🤸🏼‍♂",
    		description: "man cartwheeling: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F938 1F3FD",
    		emoji: "🤸🏽‍♂️",
    		description: "man cartwheeling: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F938 1F3FD",
    		emoji: "🤸🏽‍♂",
    		description: "man cartwheeling: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F938 1F3FE",
    		emoji: "🤸🏾‍♂️",
    		description: "man cartwheeling: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F938 1F3FE",
    		emoji: "🤸🏾‍♂",
    		description: "man cartwheeling: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F938 1F3FF",
    		emoji: "🤸🏿‍♂️",
    		description: "man cartwheeling: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F938 1F3FF",
    		emoji: "🤸🏿‍♂",
    		description: "man cartwheeling: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F938 1F3FB",
    		emoji: "🤸🏻‍♀️",
    		description: "woman cartwheeling: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F938 1F3FB",
    		emoji: "🤸🏻‍♀",
    		description: "woman cartwheeling: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F938 1F3FC",
    		emoji: "🤸🏼‍♀️",
    		description: "woman cartwheeling: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F938 1F3FC",
    		emoji: "🤸🏼‍♀",
    		description: "woman cartwheeling: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F938 1F3FD",
    		emoji: "🤸🏽‍♀️",
    		description: "woman cartwheeling: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F938 1F3FD",
    		emoji: "🤸🏽‍♀",
    		description: "woman cartwheeling: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F938 1F3FE",
    		emoji: "🤸🏾‍♀️",
    		description: "woman cartwheeling: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F938 1F3FE",
    		emoji: "🤸🏾‍♀",
    		description: "woman cartwheeling: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F938 1F3FF",
    		emoji: "🤸🏿‍♀️",
    		description: "woman cartwheeling: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F938 1F3FF",
    		emoji: "🤸🏿‍♀",
    		description: "woman cartwheeling: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F93C",
    		emoji: "🤼",
    		description: "people wrestling",
    		keywords: [
    			"wrestling",
    			"wwe"
    		]
    	},
    	{
    		unicode: "1F93D",
    		emoji: "🤽",
    		description: "person playing water polo",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93D 1F3FB",
    		emoji: "🤽🏻",
    		description: "person playing water polo: light skin tone",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93D 1F3FC",
    		emoji: "🤽🏼",
    		description: "person playing water polo: medium-light skin tone",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93D 1F3FD",
    		emoji: "🤽🏽",
    		description: "person playing water polo: medium skin tone",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93D 1F3FE",
    		emoji: "🤽🏾",
    		description: "person playing water polo: medium-dark skin tone",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93D 1F3FF",
    		emoji: "🤽🏿",
    		description: "person playing water polo: dark skin tone",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93D 1F3FB",
    		emoji: "🤽🏻‍♂️",
    		description: "man playing water polo: light skin tone",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93D 1F3FB",
    		emoji: "🤽🏻‍♂",
    		description: "man playing water polo: light skin tone",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93D 1F3FC",
    		emoji: "🤽🏼‍♂️",
    		description: "man playing water polo: medium-light skin tone",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93D 1F3FC",
    		emoji: "🤽🏼‍♂",
    		description: "man playing water polo: medium-light skin tone",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93D 1F3FD",
    		emoji: "🤽🏽‍♂️",
    		description: "man playing water polo: medium skin tone",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93D 1F3FD",
    		emoji: "🤽🏽‍♂",
    		description: "man playing water polo: medium skin tone",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93D 1F3FE",
    		emoji: "🤽🏾‍♂️",
    		description: "man playing water polo: medium-dark skin tone",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93D 1F3FE",
    		emoji: "🤽🏾‍♂",
    		description: "man playing water polo: medium-dark skin tone",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93D 1F3FF",
    		emoji: "🤽🏿‍♂️",
    		description: "man playing water polo: dark skin tone",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93D 1F3FF",
    		emoji: "🤽🏿‍♂",
    		description: "man playing water polo: dark skin tone",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93D 1F3FB",
    		emoji: "🤽🏻‍♀️",
    		description: "woman playing water polo: light skin tone",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93D 1F3FB",
    		emoji: "🤽🏻‍♀",
    		description: "woman playing water polo: light skin tone",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93D 1F3FC",
    		emoji: "🤽🏼‍♀️",
    		description: "woman playing water polo: medium-light skin tone",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93D 1F3FC",
    		emoji: "🤽🏼‍♀",
    		description: "woman playing water polo: medium-light skin tone",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93D 1F3FD",
    		emoji: "🤽🏽‍♀️",
    		description: "woman playing water polo: medium skin tone",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93D 1F3FD",
    		emoji: "🤽🏽‍♀",
    		description: "woman playing water polo: medium skin tone",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93D 1F3FE",
    		emoji: "🤽🏾‍♀️",
    		description: "woman playing water polo: medium-dark skin tone",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93D 1F3FE",
    		emoji: "🤽🏾‍♀",
    		description: "woman playing water polo: medium-dark skin tone",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93D 1F3FF",
    		emoji: "🤽🏿‍♀️",
    		description: "woman playing water polo: dark skin tone",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93D 1F3FF",
    		emoji: "🤽🏿‍♀",
    		description: "woman playing water polo: dark skin tone",
    		keywords: [
    			"play water polo",
    			"playing water polo"
    		]
    	},
    	{
    		unicode: "1F93E",
    		emoji: "🤾",
    		description: "person playing handball",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F93E 1F3FB",
    		emoji: "🤾🏻",
    		description: "person playing handball: light skin tone",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F93E 1F3FC",
    		emoji: "🤾🏼",
    		description: "person playing handball: medium-light skin tone",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F93E 1F3FD",
    		emoji: "🤾🏽",
    		description: "person playing handball: medium skin tone",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F93E 1F3FE",
    		emoji: "🤾🏾",
    		description: "person playing handball: medium-dark skin tone",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F93E 1F3FF",
    		emoji: "🤾🏿",
    		description: "person playing handball: dark skin tone",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F93E 1F3FB",
    		emoji: "🤾🏻‍♂️",
    		description: "man playing handball: light skin tone",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F93E 1F3FB",
    		emoji: "🤾🏻‍♂",
    		description: "man playing handball: light skin tone",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F93E 1F3FC",
    		emoji: "🤾🏼‍♂️",
    		description: "man playing handball: medium-light skin tone",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F93E 1F3FC",
    		emoji: "🤾🏼‍♂",
    		description: "man playing handball: medium-light skin tone",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F93E 1F3FD",
    		emoji: "🤾🏽‍♂️",
    		description: "man playing handball: medium skin tone",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F93E 1F3FD",
    		emoji: "🤾🏽‍♂",
    		description: "man playing handball: medium skin tone",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F93E 1F3FE",
    		emoji: "🤾🏾‍♂️",
    		description: "man playing handball: medium-dark skin tone",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F93E 1F3FE",
    		emoji: "🤾🏾‍♂",
    		description: "man playing handball: medium-dark skin tone",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F93E 1F3FF",
    		emoji: "🤾🏿‍♂️",
    		description: "man playing handball: dark skin tone",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F93E 1F3FF",
    		emoji: "🤾🏿‍♂",
    		description: "man playing handball: dark skin tone",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F93E 1F3FB",
    		emoji: "🤾🏻‍♀️",
    		description: "woman playing handball: light skin tone",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F93E 1F3FB",
    		emoji: "🤾🏻‍♀",
    		description: "woman playing handball: light skin tone",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F93E 1F3FC",
    		emoji: "🤾🏼‍♀️",
    		description: "woman playing handball: medium-light skin tone",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F93E 1F3FC",
    		emoji: "🤾🏼‍♀",
    		description: "woman playing handball: medium-light skin tone",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F93E 1F3FD",
    		emoji: "🤾🏽‍♀️",
    		description: "woman playing handball: medium skin tone",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F93E 1F3FD",
    		emoji: "🤾🏽‍♀",
    		description: "woman playing handball: medium skin tone",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F93E 1F3FE",
    		emoji: "🤾🏾‍♀️",
    		description: "woman playing handball: medium-dark skin tone",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F93E 1F3FE",
    		emoji: "🤾🏾‍♀",
    		description: "woman playing handball: medium-dark skin tone",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F93E 1F3FF",
    		emoji: "🤾🏿‍♀️",
    		description: "woman playing handball: dark skin tone",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F93E 1F3FF",
    		emoji: "🤾🏿‍♀",
    		description: "woman playing handball: dark skin tone",
    		keywords: [
    			"play handball",
    			"playing handball"
    		]
    	},
    	{
    		unicode: "1F939",
    		emoji: "🤹",
    		description: "person juggling",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F939 1F3FB",
    		emoji: "🤹🏻",
    		description: "person juggling: light skin tone",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F939 1F3FC",
    		emoji: "🤹🏼",
    		description: "person juggling: medium-light skin tone",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F939 1F3FD",
    		emoji: "🤹🏽",
    		description: "person juggling: medium skin tone",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F939 1F3FE",
    		emoji: "🤹🏾",
    		description: "person juggling: medium-dark skin tone",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F939 1F3FF",
    		emoji: "🤹🏿",
    		description: "person juggling: dark skin tone",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F939 1F3FB",
    		emoji: "🤹🏻‍♂️",
    		description: "man juggling: light skin tone",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F939 1F3FB",
    		emoji: "🤹🏻‍♂",
    		description: "man juggling: light skin tone",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F939 1F3FC",
    		emoji: "🤹🏼‍♂️",
    		description: "man juggling: medium-light skin tone",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F939 1F3FC",
    		emoji: "🤹🏼‍♂",
    		description: "man juggling: medium-light skin tone",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F939 1F3FD",
    		emoji: "🤹🏽‍♂️",
    		description: "man juggling: medium skin tone",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F939 1F3FD",
    		emoji: "🤹🏽‍♂",
    		description: "man juggling: medium skin tone",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F939 1F3FE",
    		emoji: "🤹🏾‍♂️",
    		description: "man juggling: medium-dark skin tone",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F939 1F3FE",
    		emoji: "🤹🏾‍♂",
    		description: "man juggling: medium-dark skin tone",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F939 1F3FF",
    		emoji: "🤹🏿‍♂️",
    		description: "man juggling: dark skin tone",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F939 1F3FF",
    		emoji: "🤹🏿‍♂",
    		description: "man juggling: dark skin tone",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F939 1F3FB",
    		emoji: "🤹🏻‍♀️",
    		description: "woman juggling: light skin tone",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F939 1F3FB",
    		emoji: "🤹🏻‍♀",
    		description: "woman juggling: light skin tone",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F939 1F3FC",
    		emoji: "🤹🏼‍♀️",
    		description: "woman juggling: medium-light skin tone",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F939 1F3FC",
    		emoji: "🤹🏼‍♀",
    		description: "woman juggling: medium-light skin tone",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F939 1F3FD",
    		emoji: "🤹🏽‍♀️",
    		description: "woman juggling: medium skin tone",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F939 1F3FD",
    		emoji: "🤹🏽‍♀",
    		description: "woman juggling: medium skin tone",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F939 1F3FE",
    		emoji: "🤹🏾‍♀️",
    		description: "woman juggling: medium-dark skin tone",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F939 1F3FE",
    		emoji: "🤹🏾‍♀",
    		description: "woman juggling: medium-dark skin tone",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F939 1F3FF",
    		emoji: "🤹🏿‍♀️",
    		description: "woman juggling: dark skin tone",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F939 1F3FF",
    		emoji: "🤹🏿‍♀",
    		description: "woman juggling: dark skin tone",
    		keywords: [
    			"juggling"
    		]
    	},
    	{
    		unicode: "1F9D8",
    		emoji: "🧘",
    		description: "person in lotus position",
    		keywords: [
    			"person in lotus position"
    		]
    	},
    	{
    		unicode: "1F9D8 1F3FB",
    		emoji: "🧘🏻",
    		description: "person in lotus position: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D8 1F3FC",
    		emoji: "🧘🏼",
    		description: "person in lotus position: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D8 1F3FD",
    		emoji: "🧘🏽",
    		description: "person in lotus position: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D8 1F3FE",
    		emoji: "🧘🏾",
    		description: "person in lotus position: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D8 1F3FF",
    		emoji: "🧘🏿",
    		description: "person in lotus position: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D8 1F3FB",
    		emoji: "🧘🏻‍♂️",
    		description: "man in lotus position: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D8 1F3FB",
    		emoji: "🧘🏻‍♂",
    		description: "man in lotus position: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D8 1F3FC",
    		emoji: "🧘🏼‍♂️",
    		description: "man in lotus position: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D8 1F3FC",
    		emoji: "🧘🏼‍♂",
    		description: "man in lotus position: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D8 1F3FD",
    		emoji: "🧘🏽‍♂️",
    		description: "man in lotus position: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D8 1F3FD",
    		emoji: "🧘🏽‍♂",
    		description: "man in lotus position: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D8 1F3FE",
    		emoji: "🧘🏾‍♂️",
    		description: "man in lotus position: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D8 1F3FE",
    		emoji: "🧘🏾‍♂",
    		description: "man in lotus position: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D8 1F3FF",
    		emoji: "🧘🏿‍♂️",
    		description: "man in lotus position: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D8 1F3FF",
    		emoji: "🧘🏿‍♂",
    		description: "man in lotus position: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D8 1F3FB",
    		emoji: "🧘🏻‍♀️",
    		description: "woman in lotus position: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D8 1F3FB",
    		emoji: "🧘🏻‍♀",
    		description: "woman in lotus position: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D8 1F3FC",
    		emoji: "🧘🏼‍♀️",
    		description: "woman in lotus position: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D8 1F3FC",
    		emoji: "🧘🏼‍♀",
    		description: "woman in lotus position: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D8 1F3FD",
    		emoji: "🧘🏽‍♀️",
    		description: "woman in lotus position: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D8 1F3FD",
    		emoji: "🧘🏽‍♀",
    		description: "woman in lotus position: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D8 1F3FE",
    		emoji: "🧘🏾‍♀️",
    		description: "woman in lotus position: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D8 1F3FE",
    		emoji: "🧘🏾‍♀",
    		description: "woman in lotus position: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D8 1F3FF",
    		emoji: "🧘🏿‍♀️",
    		description: "woman in lotus position: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9D8 1F3FF",
    		emoji: "🧘🏿‍♀",
    		description: "woman in lotus position: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6C0",
    		emoji: "🛀",
    		description: "person taking bath",
    		keywords: [
    			"person taking bath"
    		]
    	},
    	{
    		unicode: "1F6C0 1F3FB",
    		emoji: "🛀🏻",
    		description: "person taking bath: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6C0 1F3FC",
    		emoji: "🛀🏼",
    		description: "person taking bath: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6C0 1F3FD",
    		emoji: "🛀🏽",
    		description: "person taking bath: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6C0 1F3FE",
    		emoji: "🛀🏾",
    		description: "person taking bath: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6C0 1F3FF",
    		emoji: "🛀🏿",
    		description: "person taking bath: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6CC",
    		emoji: "🛌",
    		description: "person in bed",
    		keywords: [
    			"person in bed"
    		]
    	},
    	{
    		unicode: "1F6CC 1F3FB",
    		emoji: "🛌🏻",
    		description: "person in bed: light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6CC 1F3FC",
    		emoji: "🛌🏼",
    		description: "person in bed: medium-light skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6CC 1F3FD",
    		emoji: "🛌🏽",
    		description: "person in bed: medium skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6CC 1F3FE",
    		emoji: "🛌🏾",
    		description: "person in bed: medium-dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6CC 1F3FF",
    		emoji: "🛌🏿",
    		description: "person in bed: dark skin tone",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F5E3 FE0F",
    		emoji: "🗣️",
    		description: "speaking head",
    		keywords: [
    			"speaking head"
    		]
    	},
    	{
    		unicode: "1F5E3",
    		emoji: "🗣",
    		description: "speaking head",
    		keywords: [
    			"speaking head"
    		]
    	},
    	{
    		unicode: "1F464",
    		emoji: "👤",
    		description: "bust in silhouette",
    		keywords: [
    			"bust in silhouette"
    		]
    	},
    	{
    		unicode: "1F465",
    		emoji: "👥",
    		description: "busts in silhouette",
    		keywords: [
    			"busts in silhouette"
    		]
    	},
    	{
    		unicode: "1FAC2",
    		emoji: "🫂",
    		description: "people hugging",
    		keywords: [
    			"people hugging"
    		]
    	},
    	{
    		unicode: "1F463",
    		emoji: "👣",
    		description: "footprints",
    		keywords: [
    			"footprints"
    		]
    	},
    	{
    		unicode: "1F3FB",
    		emoji: "🏻",
    		description: "light skin tone",
    		keywords: [
    			"light skin tone"
    		]
    	},
    	{
    		unicode: "1F3FC",
    		emoji: "🏼",
    		description: "medium-light skin tone",
    		keywords: [
    			"medium-light skin tone"
    		]
    	},
    	{
    		unicode: "1F3FD",
    		emoji: "🏽",
    		description: "medium skin tone",
    		keywords: [
    			"medium skin tone"
    		]
    	},
    	{
    		unicode: "1F3FE",
    		emoji: "🏾",
    		description: "medium-dark skin tone",
    		keywords: [
    			"medium-dark skin tone"
    		]
    	},
    	{
    		unicode: "1F3FF",
    		emoji: "🏿",
    		description: "dark skin tone",
    		keywords: [
    			"dark skin tone"
    		]
    	},
    	{
    		unicode: "1F9B0",
    		emoji: "🦰",
    		description: "red hair",
    		keywords: [
    			"red hair"
    		]
    	},
    	{
    		unicode: "1F9B1",
    		emoji: "🦱",
    		description: "curly hair",
    		keywords: [
    			"curly hair"
    		]
    	},
    	{
    		unicode: "1F9B3",
    		emoji: "🦳",
    		description: "white hair",
    		keywords: [
    			"white hair"
    		]
    	},
    	{
    		unicode: "1F9B2",
    		emoji: "🦲",
    		description: "bald",
    		keywords: [
    			"bald"
    		]
    	},
    	{
    		unicode: "1F435",
    		emoji: "🐵",
    		description: "monkey face",
    		keywords: [
    			"monkey face"
    		]
    	},
    	{
    		unicode: "1F412",
    		emoji: "🐒",
    		description: "monkey",
    		keywords: [
    			"monkey"
    		]
    	},
    	{
    		unicode: "1F98D",
    		emoji: "🦍",
    		description: "gorilla",
    		keywords: [
    			"gorilla"
    		]
    	},
    	{
    		unicode: "1F9A7",
    		emoji: "🦧",
    		description: "orangutan",
    		keywords: [
    			"orangutan"
    		]
    	},
    	{
    		unicode: "1F436",
    		emoji: "🐶",
    		description: "dog face",
    		keywords: [
    			"dog"
    		]
    	},
    	{
    		unicode: "1F415",
    		emoji: "🐕",
    		description: "dog",
    		keywords: [
    			"dog"
    		]
    	},
    	{
    		unicode: "1F9AE",
    		emoji: "🦮",
    		description: "guide dog",
    		keywords: [
    			"guide dog"
    		]
    	},
    	{
    		unicode: "1F415 200D 1F9BA",
    		emoji: "🐕‍🦺",
    		description: "service dog",
    		keywords: [
    			"service dog"
    		]
    	},
    	{
    		unicode: "1F429",
    		emoji: "🐩",
    		description: "poodle",
    		keywords: [
    			"poodle"
    		]
    	},
    	{
    		unicode: "1F43A",
    		emoji: "🐺",
    		description: "wolf",
    		keywords: [
    			"wolf"
    		]
    	},
    	{
    		unicode: "1F98A",
    		emoji: "🦊",
    		description: "fox",
    		keywords: [
    			"fox"
    		]
    	},
    	{
    		unicode: "1F99D",
    		emoji: "🦝",
    		description: "raccoon",
    		keywords: [
    			"raccoon"
    		]
    	},
    	{
    		unicode: "1F431",
    		emoji: "🐱",
    		description: "cat face",
    		keywords: [
    			"cat face"
    		]
    	},
    	{
    		unicode: "1F408",
    		emoji: "🐈",
    		description: "cat",
    		keywords: [
    			"cat"
    		]
    	},
    	{
    		unicode: "1F408 200D 2B1B",
    		emoji: "🐈‍⬛",
    		description: "black cat",
    		keywords: [
    			"black cat"
    		]
    	},
    	{
    		unicode: "1F981",
    		emoji: "🦁",
    		description: "lion",
    		keywords: [
    			"lion"
    		]
    	},
    	{
    		unicode: "1F42F",
    		emoji: "🐯",
    		description: "tiger face",
    		keywords: [
    			"tiger"
    		]
    	},
    	{
    		unicode: "1F405",
    		emoji: "🐅",
    		description: "tiger",
    		keywords: [
    			"big tiger"
    		]
    	},
    	{
    		unicode: "1F406",
    		emoji: "🐆",
    		description: "leopard",
    		keywords: [
    			"leopard"
    		]
    	},
    	{
    		unicode: "1F434",
    		emoji: "🐴",
    		description: "horse face",
    		keywords: [
    			"horse"
    		]
    	},
    	{
    		unicode: "1F40E",
    		emoji: "🐎",
    		description: "horse",
    		keywords: [
    			"big horse"
    		]
    	},
    	{
    		unicode: "1F984",
    		emoji: "🦄",
    		description: "unicorn",
    		keywords: [
    			"unicorn"
    		]
    	},
    	{
    		unicode: "1F993",
    		emoji: "🦓",
    		description: "zebra",
    		keywords: [
    			"zebra"
    		]
    	},
    	{
    		unicode: "1F98C",
    		emoji: "🦌",
    		description: "deer",
    		keywords: [
    			"deer"
    		]
    	},
    	{
    		unicode: "1F9AC",
    		emoji: "🦬",
    		description: "bison",
    		keywords: [
    			"bison"
    		]
    	},
    	{
    		unicode: "1F42E",
    		emoji: "🐮",
    		description: "cow face",
    		keywords: [
    			"cow face"
    		]
    	},
    	{
    		unicode: "1F402",
    		emoji: "🐂",
    		description: "ox",
    		keywords: [
    			"ox"
    		]
    	},
    	{
    		unicode: "1F403",
    		emoji: "🐃",
    		description: "water buffalo",
    		keywords: [
    			"water buffalo"
    		]
    	},
    	{
    		unicode: "1F404",
    		emoji: "🐄",
    		description: "cow",
    		keywords: [
    			"cow"
    		]
    	},
    	{
    		unicode: "1F437",
    		emoji: "🐷",
    		description: "pig face",
    		keywords: [
    			"pig face"
    		]
    	},
    	{
    		unicode: "1F416",
    		emoji: "🐖",
    		description: "pig",
    		keywords: [
    			"pig"
    		]
    	},
    	{
    		unicode: "1F417",
    		emoji: "🐗",
    		description: "boar",
    		keywords: [
    			"boar"
    		]
    	},
    	{
    		unicode: "1F43D",
    		emoji: "🐽",
    		description: "pig nose",
    		keywords: [
    			"pig nose"
    		]
    	},
    	{
    		unicode: "1F40F",
    		emoji: "🐏",
    		description: "ram",
    		keywords: [
    			"ram"
    		]
    	},
    	{
    		unicode: "1F411",
    		emoji: "🐑",
    		description: "ewe",
    		keywords: [
    			"ewe"
    		]
    	},
    	{
    		unicode: "1F410",
    		emoji: "🐐",
    		description: "goat",
    		keywords: [
    			"goat"
    		]
    	},
    	{
    		unicode: "1F42A",
    		emoji: "🐪",
    		description: "camel",
    		keywords: [
    			"camel"
    		]
    	},
    	{
    		unicode: "1F42B",
    		emoji: "🐫",
    		description: "two-hump camel",
    		keywords: [
    			"two-hump camel"
    		]
    	},
    	{
    		unicode: "1F999",
    		emoji: "🦙",
    		description: "llama",
    		keywords: [
    			"llama"
    		]
    	},
    	{
    		unicode: "1F992",
    		emoji: "🦒",
    		description: "giraffe",
    		keywords: [
    			"giraffe"
    		]
    	},
    	{
    		unicode: "1F418",
    		emoji: "🐘",
    		description: "elephant",
    		keywords: [
    			"elephant"
    		]
    	},
    	{
    		unicode: "1F9A3",
    		emoji: "🦣",
    		description: "mammoth",
    		keywords: [
    			"mammoth"
    		]
    	},
    	{
    		unicode: "1F98F",
    		emoji: "🦏",
    		description: "rhinoceros",
    		keywords: [
    			"rhinoceros"
    		]
    	},
    	{
    		unicode: "1F99B",
    		emoji: "🦛",
    		description: "hippopotamus",
    		keywords: [
    			"hippopotamus"
    		]
    	},
    	{
    		unicode: "1F42D",
    		emoji: "🐭",
    		description: "mouse face",
    		keywords: [
    			"mouse face"
    		]
    	},
    	{
    		unicode: "1F401",
    		emoji: "🐁",
    		description: "mouse",
    		keywords: [
    			"mouse"
    		]
    	},
    	{
    		unicode: "1F400",
    		emoji: "🐀",
    		description: "rat",
    		keywords: [
    			"rat"
    		]
    	},
    	{
    		unicode: "1F439",
    		emoji: "🐹",
    		description: "hamster",
    		keywords: [
    			"hamster"
    		]
    	},
    	{
    		unicode: "1F430",
    		emoji: "🐰",
    		description: "rabbit face",
    		keywords: [
    			"rabbit face"
    		]
    	},
    	{
    		unicode: "1F407",
    		emoji: "🐇",
    		description: "rabbit",
    		keywords: [
    			"rabbit"
    		]
    	},
    	{
    		unicode: "1F43F FE0F",
    		emoji: "🐿️",
    		description: "chipmunk",
    		keywords: [
    			"chipmunk"
    		]
    	},
    	{
    		unicode: "1F43F",
    		emoji: "🐿",
    		description: "chipmunk",
    		keywords: [
    			"chipmunk"
    		]
    	},
    	{
    		unicode: "1F9AB",
    		emoji: "🦫",
    		description: "beaver",
    		keywords: [
    			"beaver"
    		]
    	},
    	{
    		unicode: "1F994",
    		emoji: "🦔",
    		description: "hedgehog",
    		keywords: [
    			"hedgehog"
    		]
    	},
    	{
    		unicode: "1F987",
    		emoji: "🦇",
    		description: "bat",
    		keywords: [
    			"bat"
    		]
    	},
    	{
    		unicode: "1F43B",
    		emoji: "🐻",
    		description: "bear",
    		keywords: [
    			"bear"
    		]
    	},
    	{
    		unicode: "1F43B 200D 2744 FE0F",
    		emoji: "🐻‍❄️",
    		description: "polar bear",
    		keywords: [
    			"polar bear"
    		]
    	},
    	{
    		unicode: "1F43B 200D 2744",
    		emoji: "🐻‍❄",
    		description: "polar bear",
    		keywords: [
    			"polar bear"
    		]
    	},
    	{
    		unicode: "1F428",
    		emoji: "🐨",
    		description: "koala",
    		keywords: [
    			"koala"
    		]
    	},
    	{
    		unicode: "1F43C",
    		emoji: "🐼",
    		description: "panda",
    		keywords: [
    			"panda"
    		]
    	},
    	{
    		unicode: "1F9A5",
    		emoji: "🦥",
    		description: "sloth",
    		keywords: [
    			"sloth"
    		]
    	},
    	{
    		unicode: "1F9A6",
    		emoji: "🦦",
    		description: "otter",
    		keywords: [
    			"otter"
    		]
    	},
    	{
    		unicode: "1F9A8",
    		emoji: "🦨",
    		description: "skunk",
    		keywords: [
    			"skunk"
    		]
    	},
    	{
    		unicode: "1F998",
    		emoji: "🦘",
    		description: "kangaroo",
    		keywords: [
    			"kangaroo"
    		]
    	},
    	{
    		unicode: "1F9A1",
    		emoji: "🦡",
    		description: "badger",
    		keywords: [
    			"badger"
    		]
    	},
    	{
    		unicode: "1F43E",
    		emoji: "🐾",
    		description: "paw prints",
    		keywords: [
    			"paw prints"
    		]
    	},
    	{
    		unicode: "1F983",
    		emoji: "🦃",
    		description: "turkey",
    		keywords: [
    			"turkey"
    		]
    	},
    	{
    		unicode: "1F414",
    		emoji: "🐔",
    		description: "chicken",
    		keywords: [
    			"chicken"
    		]
    	},
    	{
    		unicode: "1F413",
    		emoji: "🐓",
    		description: "rooster",
    		keywords: [
    			"rooster"
    		]
    	},
    	{
    		unicode: "1F423",
    		emoji: "🐣",
    		description: "hatching chick",
    		keywords: [
    			"hatching chick"
    		]
    	},
    	{
    		unicode: "1F424",
    		emoji: "🐤",
    		description: "baby chick",
    		keywords: [
    			"baby chick"
    		]
    	},
    	{
    		unicode: "1F425",
    		emoji: "🐥",
    		description: "front-facing baby chick",
    		keywords: [
    			"front-facing baby chick"
    		]
    	},
    	{
    		unicode: "1F426",
    		emoji: "🐦",
    		description: "bird",
    		keywords: [
    			"bird"
    		]
    	},
    	{
    		unicode: "1F427",
    		emoji: "🐧",
    		description: "penguin",
    		keywords: [
    			"penguin"
    		]
    	},
    	{
    		unicode: "1F54A FE0F",
    		emoji: "🕊️",
    		description: "dove",
    		keywords: [
    			"dove"
    		]
    	},
    	{
    		unicode: "1F54A",
    		emoji: "🕊",
    		description: "dove",
    		keywords: [
    			"dove"
    		]
    	},
    	{
    		unicode: "1F985",
    		emoji: "🦅",
    		description: "eagle",
    		keywords: [
    			"eagle"
    		]
    	},
    	{
    		unicode: "1F986",
    		emoji: "🦆",
    		description: "duck",
    		keywords: [
    			"duck"
    		]
    	},
    	{
    		unicode: "1F9A2",
    		emoji: "🦢",
    		description: "swan",
    		keywords: [
    			"swan"
    		]
    	},
    	{
    		unicode: "1F989",
    		emoji: "🦉",
    		description: "owl",
    		keywords: [
    			"owl"
    		]
    	},
    	{
    		unicode: "1F9A4",
    		emoji: "🦤",
    		description: "dodo",
    		keywords: [
    			"dodo"
    		]
    	},
    	{
    		unicode: "1FAB6",
    		emoji: "🪶",
    		description: "feather",
    		keywords: [
    			"feather"
    		]
    	},
    	{
    		unicode: "1F9A9",
    		emoji: "🦩",
    		description: "flamingo",
    		keywords: [
    			"flamingo"
    		]
    	},
    	{
    		unicode: "1F99A",
    		emoji: "🦚",
    		description: "peacock",
    		keywords: [
    			"peacock"
    		]
    	},
    	{
    		unicode: "1F99C",
    		emoji: "🦜",
    		description: "parrot",
    		keywords: [
    			"parrot"
    		]
    	},
    	{
    		unicode: "1F438",
    		emoji: "🐸",
    		description: "frog",
    		keywords: [
    			"frog"
    		]
    	},
    	{
    		unicode: "1F40A",
    		emoji: "🐊",
    		description: "crocodile",
    		keywords: [
    			"crocodile"
    		]
    	},
    	{
    		unicode: "1F422",
    		emoji: "🐢",
    		description: "turtle",
    		keywords: [
    			"turtle"
    		]
    	},
    	{
    		unicode: "1F98E",
    		emoji: "🦎",
    		description: "lizard",
    		keywords: [
    			"lizard"
    		]
    	},
    	{
    		unicode: "1F40D",
    		emoji: "🐍",
    		description: "snake",
    		keywords: [
    			"snake"
    		]
    	},
    	{
    		unicode: "1F432",
    		emoji: "🐲",
    		description: "dragon face",
    		keywords: [
    			"dragon face"
    		]
    	},
    	{
    		unicode: "1F409",
    		emoji: "🐉",
    		description: "dragon",
    		keywords: [
    			"dragon"
    		]
    	},
    	{
    		unicode: "1F995",
    		emoji: "🦕",
    		description: "sauropod",
    		keywords: [
    			"sauropod"
    		]
    	},
    	{
    		unicode: "1F996",
    		emoji: "🦖",
    		description: "T-Rex",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F433",
    		emoji: "🐳",
    		description: "spouting whale",
    		keywords: [
    			"spouting whale"
    		]
    	},
    	{
    		unicode: "1F40B",
    		emoji: "🐋",
    		description: "whale",
    		keywords: [
    			"whale"
    		]
    	},
    	{
    		unicode: "1F42C",
    		emoji: "🐬",
    		description: "dolphin",
    		keywords: [
    			"dolphin"
    		]
    	},
    	{
    		unicode: "1F9AD",
    		emoji: "🦭",
    		description: "seal",
    		keywords: [
    			"seal"
    		]
    	},
    	{
    		unicode: "1F41F",
    		emoji: "🐟",
    		description: "fish",
    		keywords: [
    			"fish"
    		]
    	},
    	{
    		unicode: "1F420",
    		emoji: "🐠",
    		description: "tropical fish",
    		keywords: [
    			"tropical fish"
    		]
    	},
    	{
    		unicode: "1F421",
    		emoji: "🐡",
    		description: "blowfish",
    		keywords: [
    			"blowfish"
    		]
    	},
    	{
    		unicode: "1F988",
    		emoji: "🦈",
    		description: "shark",
    		keywords: [
    			"shark"
    		]
    	},
    	{
    		unicode: "1F419",
    		emoji: "🐙",
    		description: "octopus",
    		keywords: [
    			"octopus"
    		]
    	},
    	{
    		unicode: "1F41A",
    		emoji: "🐚",
    		description: "spiral shell",
    		keywords: [
    			"spiral shell"
    		]
    	},
    	{
    		unicode: "1F40C",
    		emoji: "🐌",
    		description: "snail",
    		keywords: [
    			"snail"
    		]
    	},
    	{
    		unicode: "1F98B",
    		emoji: "🦋",
    		description: "butterfly",
    		keywords: [
    			"butterfly"
    		]
    	},
    	{
    		unicode: "1F41B",
    		emoji: "🐛",
    		description: "bug",
    		keywords: [
    			"bug"
    		]
    	},
    	{
    		unicode: "1F41C",
    		emoji: "🐜",
    		description: "ant",
    		keywords: [
    			"ant"
    		]
    	},
    	{
    		unicode: "1F41D",
    		emoji: "🐝",
    		description: "honeybee",
    		keywords: [
    			"honeybee"
    		]
    	},
    	{
    		unicode: "1FAB2",
    		emoji: "🪲",
    		description: "beetle",
    		keywords: [
    			"beetle"
    		]
    	},
    	{
    		unicode: "1F41E",
    		emoji: "🐞",
    		description: "lady beetle",
    		keywords: [
    			"lady beetle"
    		]
    	},
    	{
    		unicode: "1F997",
    		emoji: "🦗",
    		description: "cricket",
    		keywords: [
    			"cricket"
    		]
    	},
    	{
    		unicode: "1FAB3",
    		emoji: "🪳",
    		description: "cockroach",
    		keywords: [
    			"cockroach"
    		]
    	},
    	{
    		unicode: "1F577 FE0F",
    		emoji: "🕷️",
    		description: "spider",
    		keywords: [
    			"spider"
    		]
    	},
    	{
    		unicode: "1F577",
    		emoji: "🕷",
    		description: "spider",
    		keywords: [
    			"spider"
    		]
    	},
    	{
    		unicode: "1F578 FE0F",
    		emoji: "🕸️",
    		description: "spider web",
    		keywords: [
    			"spider web"
    		]
    	},
    	{
    		unicode: "1F578",
    		emoji: "🕸",
    		description: "spider web",
    		keywords: [
    			"spider web"
    		]
    	},
    	{
    		unicode: "1F982",
    		emoji: "🦂",
    		description: "scorpion",
    		keywords: [
    			"scorpion"
    		]
    	},
    	{
    		unicode: "1F99F",
    		emoji: "🦟",
    		description: "mosquito",
    		keywords: [
    			"mosquito"
    		]
    	},
    	{
    		unicode: "1FAB0",
    		emoji: "🪰",
    		description: "fly",
    		keywords: [
    			"fly"
    		]
    	},
    	{
    		unicode: "1FAB1",
    		emoji: "🪱",
    		description: "worm",
    		keywords: [
    			"worm"
    		]
    	},
    	{
    		unicode: "1F9A0",
    		emoji: "🦠",
    		description: "microbe",
    		keywords: [
    			"microbe"
    		]
    	},
    	{
    		unicode: "1F490",
    		emoji: "💐",
    		description: "bouquet",
    		keywords: [
    			"bouquet"
    		]
    	},
    	{
    		unicode: "1F338",
    		emoji: "🌸",
    		description: "cherry blossom",
    		keywords: [
    			"cherry blossom"
    		]
    	},
    	{
    		unicode: "1F4AE",
    		emoji: "💮",
    		description: "white flower",
    		keywords: [
    			"white flower"
    		]
    	},
    	{
    		unicode: "1F3F5 FE0F",
    		emoji: "🏵️",
    		description: "rosette",
    		keywords: [
    			"rosette"
    		]
    	},
    	{
    		unicode: "1F3F5",
    		emoji: "🏵",
    		description: "rosette",
    		keywords: [
    			"rosette"
    		]
    	},
    	{
    		unicode: "1F339",
    		emoji: "🌹",
    		description: "rose",
    		keywords: [
    			"rose"
    		]
    	},
    	{
    		unicode: "1F940",
    		emoji: "🥀",
    		description: "wilted flower",
    		keywords: [
    			"wilted flower"
    		]
    	},
    	{
    		unicode: "1F33A",
    		emoji: "🌺",
    		description: "hibiscus",
    		keywords: [
    			"hibiscus"
    		]
    	},
    	{
    		unicode: "1F33B",
    		emoji: "🌻",
    		description: "sunflower",
    		keywords: [
    			"sunflower"
    		]
    	},
    	{
    		unicode: "1F33C",
    		emoji: "🌼",
    		description: "blossom",
    		keywords: [
    			"blossom"
    		]
    	},
    	{
    		unicode: "1F337",
    		emoji: "🌷",
    		description: "tulip",
    		keywords: [
    			"tulip"
    		]
    	},
    	{
    		unicode: "1F331",
    		emoji: "🌱",
    		description: "seedling",
    		keywords: [
    			"seedling"
    		]
    	},
    	{
    		unicode: "1FAB4",
    		emoji: "🪴",
    		description: "potted plant",
    		keywords: [
    			"potted plant"
    		]
    	},
    	{
    		unicode: "1F332",
    		emoji: "🌲",
    		description: "evergreen tree",
    		keywords: [
    			"evergreen"
    		]
    	},
    	{
    		unicode: "1F333",
    		emoji: "🌳",
    		description: "deciduous tree",
    		keywords: [
    			"deciduous"
    		]
    	},
    	{
    		unicode: "1F334",
    		emoji: "🌴",
    		description: "palm tree",
    		keywords: [
    			"palm"
    		]
    	},
    	{
    		unicode: "1F335",
    		emoji: "🌵",
    		description: "cactus",
    		keywords: [
    			"cactus"
    		]
    	},
    	{
    		unicode: "1F33E",
    		emoji: "🌾",
    		description: "sheaf of rice",
    		keywords: [
    			"sheaf of rice"
    		]
    	},
    	{
    		unicode: "1F33F",
    		emoji: "🌿",
    		description: "herb",
    		keywords: [
    			"herb"
    		]
    	},
    	{
    		unicode: "2618 FE0F",
    		emoji: "☘️",
    		description: "shamrock",
    		keywords: [
    			"shamrock"
    		]
    	},
    	{
    		unicode: "1F340",
    		emoji: "🍀",
    		description: "four leaf clover",
    		keywords: [
    			"four leaf clover"
    		]
    	},
    	{
    		unicode: "1F341",
    		emoji: "🍁",
    		description: "maple leaf",
    		keywords: [
    			"maple leaf"
    		]
    	},
    	{
    		unicode: "1F342",
    		emoji: "🍂",
    		description: "fallen leaf",
    		keywords: [
    			"fallen leaf",
    			"dead leaf",
    			"fallen leafs",
    			"dead leafs"
    		]
    	},
    	{
    		unicode: "1F343",
    		emoji: "🍃",
    		description: "leaf fluttering in wind",
    		keywords: [
    			"leaf fluttering in wind"
    		]
    	},
    	{
    		unicode: "1F347",
    		emoji: "🍇",
    		description: "grapes",
    		keywords: [
    			"grapes"
    		]
    	},
    	{
    		unicode: "1F348",
    		emoji: "🍈",
    		description: "melon",
    		keywords: [
    			"melon"
    		]
    	},
    	{
    		unicode: "1F349",
    		emoji: "🍉",
    		description: "watermelon",
    		keywords: [
    			"watermelon"
    		]
    	},
    	{
    		unicode: "1F34A",
    		emoji: "🍊",
    		description: "tangerine",
    		keywords: [
    			"tangerine"
    		]
    	},
    	{
    		unicode: "1F34B",
    		emoji: "🍋",
    		description: "lemon",
    		keywords: [
    			"lemon"
    		]
    	},
    	{
    		unicode: "1F34C",
    		emoji: "🍌",
    		description: "banana",
    		keywords: [
    			"banana"
    		]
    	},
    	{
    		unicode: "1F34D",
    		emoji: "🍍",
    		description: "pineapple",
    		keywords: [
    			"pineapple"
    		]
    	},
    	{
    		unicode: "1F96D",
    		emoji: "🥭",
    		description: "mango",
    		keywords: [
    			"mango"
    		]
    	},
    	{
    		unicode: "1F34E",
    		emoji: "🍎",
    		description: "red apple",
    		keywords: [
    			"apple"
    		]
    	},
    	{
    		unicode: "1F34F",
    		emoji: "🍏",
    		description: "green apple",
    		keywords: [
    			"green apple"
    		]
    	},
    	{
    		unicode: "1F350",
    		emoji: "🍐",
    		description: "pear",
    		keywords: [
    			"pear"
    		]
    	},
    	{
    		unicode: "1F351",
    		emoji: "🍑",
    		description: "peach",
    		keywords: [
    			"peach"
    		]
    	},
    	{
    		unicode: "1F352",
    		emoji: "🍒",
    		description: "cherries",
    		keywords: [
    			"cherries"
    		]
    	},
    	{
    		unicode: "1F353",
    		emoji: "🍓",
    		description: "strawberry",
    		keywords: [
    			"strawberry"
    		]
    	},
    	{
    		unicode: "1FAD0",
    		emoji: "🫐",
    		description: "blueberries",
    		keywords: [
    			"blueberries"
    		]
    	},
    	{
    		unicode: "1F95D",
    		emoji: "🥝",
    		description: "kiwi fruit",
    		keywords: [
    			"kiwi"
    		]
    	},
    	{
    		unicode: "1F345",
    		emoji: "🍅",
    		description: "tomato",
    		keywords: [
    			"tomato"
    		]
    	},
    	{
    		unicode: "1FAD2",
    		emoji: "🫒",
    		description: "olive",
    		keywords: [
    			"olive"
    		]
    	},
    	{
    		unicode: "1F965",
    		emoji: "🥥",
    		description: "coconut",
    		keywords: [
    			"coconut"
    		]
    	},
    	{
    		unicode: "1F951",
    		emoji: "🥑",
    		description: "avocado",
    		keywords: [
    			"avocado"
    		]
    	},
    	{
    		unicode: "1F346",
    		emoji: "🍆",
    		description: "eggplant",
    		keywords: [
    			"eggplant"
    		]
    	},
    	{
    		unicode: "1F954",
    		emoji: "🥔",
    		description: "potato",
    		keywords: [
    			"potato"
    		]
    	},
    	{
    		unicode: "1F955",
    		emoji: "🥕",
    		description: "carrot",
    		keywords: [
    			"carrot"
    		]
    	},
    	{
    		unicode: "1F33D",
    		emoji: "🌽",
    		description: "ear of corn",
    		keywords: [
    			"ear of corn"
    		]
    	},
    	{
    		unicode: "1F336 FE0F",
    		emoji: "🌶️",
    		description: "hot pepper",
    		keywords: [
    			"hot pepper"
    		]
    	},
    	{
    		unicode: "1F336",
    		emoji: "🌶",
    		description: "hot pepper",
    		keywords: [
    			"hot pepper"
    		]
    	},
    	{
    		unicode: "1FAD1",
    		emoji: "🫑",
    		description: "bell pepper",
    		keywords: [
    			"bell pepper"
    		]
    	},
    	{
    		unicode: "1F952",
    		emoji: "🥒",
    		description: "cucumber",
    		keywords: [
    			"cucumber"
    		]
    	},
    	{
    		unicode: "1F96C",
    		emoji: "🥬",
    		description: "leafy green",
    		keywords: [
    			"leafy green"
    		]
    	},
    	{
    		unicode: "1F966",
    		emoji: "🥦",
    		description: "broccoli",
    		keywords: [
    			"broccoli"
    		]
    	},
    	{
    		unicode: "1F9C4",
    		emoji: "🧄",
    		description: "garlic",
    		keywords: [
    			"garlic"
    		]
    	},
    	{
    		unicode: "1F9C5",
    		emoji: "🧅",
    		description: "onion",
    		keywords: [
    			"onion"
    		]
    	},
    	{
    		unicode: "1F344",
    		emoji: "🍄",
    		description: "mushroom",
    		keywords: [
    			"mushroom",
    			"mushrooms"
    		]
    	},
    	{
    		unicode: "1F95C",
    		emoji: "🥜",
    		description: "peanuts",
    		keywords: [
    			"peanuts"
    		]
    	},
    	{
    		unicode: "1F330",
    		emoji: "🌰",
    		description: "chestnut",
    		keywords: [
    			"chestnut"
    		]
    	},
    	{
    		unicode: "1F35E",
    		emoji: "🍞",
    		description: "bread",
    		keywords: [
    			"bread"
    		]
    	},
    	{
    		unicode: "1F950",
    		emoji: "🥐",
    		description: "croissant",
    		keywords: [
    			"croissant"
    		]
    	},
    	{
    		unicode: "1F956",
    		emoji: "🥖",
    		description: "baguette bread",
    		keywords: [
    			"baguette bread"
    		]
    	},
    	{
    		unicode: "1FAD3",
    		emoji: "🫓",
    		description: "flatbread",
    		keywords: [
    			"flatbread"
    		]
    	},
    	{
    		unicode: "1F968",
    		emoji: "🥨",
    		description: "pretzel",
    		keywords: [
    			"pretzel"
    		]
    	},
    	{
    		unicode: "1F96F",
    		emoji: "🥯",
    		description: "bagel",
    		keywords: [
    			"bagel"
    		]
    	},
    	{
    		unicode: "1F95E",
    		emoji: "🥞",
    		description: "pancakes",
    		keywords: [
    			"pancake",
    			"pancakes"
    		]
    	},
    	{
    		unicode: "1F9C7",
    		emoji: "🧇",
    		description: "waffle",
    		keywords: [
    			"waffle",
    			"waffles"
    		]
    	},
    	{
    		unicode: "1F9C0",
    		emoji: "🧀",
    		description: "cheese wedge",
    		keywords: [
    			"cheese"
    		]
    	},
    	{
    		unicode: "1F356",
    		emoji: "🍖",
    		description: "meat on bone",
    		keywords: [
    			"meat"
    		]
    	},
    	{
    		unicode: "1F357",
    		emoji: "🍗",
    		description: "poultry leg",
    		keywords: [
    			"poultry leg"
    		]
    	},
    	{
    		unicode: "1F969",
    		emoji: "🥩",
    		description: "cut of meat",
    		keywords: [
    			"slice of meat"
    		]
    	},
    	{
    		unicode: "1F953",
    		emoji: "🥓",
    		description: "bacon",
    		keywords: [
    			"bacon"
    		]
    	},
    	{
    		unicode: "1F354",
    		emoji: "🍔",
    		description: "hamburger",
    		keywords: [
    			"hamburger",
    			"hamburgers"
    		]
    	},
    	{
    		unicode: "1F35F",
    		emoji: "🍟",
    		description: "french fries",
    		keywords: [
    			"french fries"
    		]
    	},
    	{
    		unicode: "1F355",
    		emoji: "🍕",
    		description: "pizza",
    		keywords: [
    			"pizza"
    		]
    	},
    	{
    		unicode: "1F32D",
    		emoji: "🌭",
    		description: "hot dog",
    		keywords: [
    			"hot dog",
    			"hot dogs"
    		]
    	},
    	{
    		unicode: "1F96A",
    		emoji: "🥪",
    		description: "sandwich",
    		keywords: [
    			"sandwich",
    			"sandwichs"
    		]
    	},
    	{
    		unicode: "1F32E",
    		emoji: "🌮",
    		description: "taco",
    		keywords: [
    			"taco",
    			"tacos"
    		]
    	},
    	{
    		unicode: "1F32F",
    		emoji: "🌯",
    		description: "burrito",
    		keywords: [
    			"burrito"
    		]
    	},
    	{
    		unicode: "1FAD4",
    		emoji: "🫔",
    		description: "tamale",
    		keywords: [
    			"tamale"
    		]
    	},
    	{
    		unicode: "1F959",
    		emoji: "🥙",
    		description: "stuffed flatbread",
    		keywords: [
    			"stuffed flatbread"
    		]
    	},
    	{
    		unicode: "1F9C6",
    		emoji: "🧆",
    		description: "falafel",
    		keywords: [
    			"falafel"
    		]
    	},
    	{
    		unicode: "1F95A",
    		emoji: "🥚",
    		description: "egg",
    		keywords: [
    			"egg",
    			"eggs"
    		]
    	},
    	{
    		unicode: "1F373",
    		emoji: "🍳",
    		description: "cooking",
    		keywords: [
    			"cooking"
    		]
    	},
    	{
    		unicode: "1F958",
    		emoji: "🥘",
    		description: "shallow pan of food",
    		keywords: [
    			"shallow pan of food"
    		]
    	},
    	{
    		unicode: "1F372",
    		emoji: "🍲",
    		description: "pot of food",
    		keywords: [
    			"pot of food"
    		]
    	},
    	{
    		unicode: "1FAD5",
    		emoji: "🫕",
    		description: "fondue",
    		keywords: [
    			"fondue"
    		]
    	},
    	{
    		unicode: "1F963",
    		emoji: "🥣",
    		description: "bowl with spoon",
    		keywords: [
    			"bowl with spoon"
    		]
    	},
    	{
    		unicode: "1F957",
    		emoji: "🥗",
    		description: "green salad",
    		keywords: [
    			"green salad",
    			"green salads"
    		]
    	},
    	{
    		unicode: "1F37F",
    		emoji: "🍿",
    		description: "popcorn",
    		keywords: [
    			"popcorn"
    		]
    	},
    	{
    		unicode: "1F9C8",
    		emoji: "🧈",
    		description: "butter",
    		keywords: [
    			"butter"
    		]
    	},
    	{
    		unicode: "1F9C2",
    		emoji: "🧂",
    		description: "salt",
    		keywords: [
    			"salt"
    		]
    	},
    	{
    		unicode: "1F96B",
    		emoji: "🥫",
    		description: "canned food",
    		keywords: [
    			"canned food"
    		]
    	},
    	{
    		unicode: "1F371",
    		emoji: "🍱",
    		description: "bento box",
    		keywords: [
    			"bento box"
    		]
    	},
    	{
    		unicode: "1F358",
    		emoji: "🍘",
    		description: "rice cracker",
    		keywords: [
    			"rice cracker"
    		]
    	},
    	{
    		unicode: "1F359",
    		emoji: "🍙",
    		description: "rice ball",
    		keywords: [
    			"rice ball",
    			"rice balls"
    		]
    	},
    	{
    		unicode: "1F35A",
    		emoji: "🍚",
    		description: "cooked rice",
    		keywords: [
    			"cooked rice",
    			"cooked rices"
    		]
    	},
    	{
    		unicode: "1F35B",
    		emoji: "🍛",
    		description: "curry rice",
    		keywords: [
    			"curry rice"
    		]
    	},
    	{
    		unicode: "1F35C",
    		emoji: "🍜",
    		description: "steaming bowl",
    		keywords: [
    			"steaming bowl"
    		]
    	},
    	{
    		unicode: "1F35D",
    		emoji: "🍝",
    		description: "spaghetti",
    		keywords: [
    			"spaghetti"
    		]
    	},
    	{
    		unicode: "1F360",
    		emoji: "🍠",
    		description: "roasted sweet potato",
    		keywords: [
    			"roasted sweet potato"
    		]
    	},
    	{
    		unicode: "1F362",
    		emoji: "🍢",
    		description: "oden",
    		keywords: [
    			"oden"
    		]
    	},
    	{
    		unicode: "1F363",
    		emoji: "🍣",
    		description: "sushi",
    		keywords: [
    			"sushi"
    		]
    	},
    	{
    		unicode: "1F364",
    		emoji: "🍤",
    		description: "fried shrimp",
    		keywords: [
    			"fried shrimp"
    		]
    	},
    	{
    		unicode: "1F365",
    		emoji: "🍥",
    		description: "fish cake with swirl",
    		keywords: [
    			"fish cake with swirl"
    		]
    	},
    	{
    		unicode: "1F96E",
    		emoji: "🥮",
    		description: "moon cake",
    		keywords: [
    			"moon cake"
    		]
    	},
    	{
    		unicode: "1F361",
    		emoji: "🍡",
    		description: "dango",
    		keywords: [
    			"dango"
    		]
    	},
    	{
    		unicode: "1F95F",
    		emoji: "🥟",
    		description: "dumpling",
    		keywords: [
    			"dumpling"
    		]
    	},
    	{
    		unicode: "1F960",
    		emoji: "🥠",
    		description: "fortune cookie",
    		keywords: [
    			"fortune cookie"
    		]
    	},
    	{
    		unicode: "1F961",
    		emoji: "🥡",
    		description: "takeout box",
    		keywords: [
    			"takeout box"
    		]
    	},
    	{
    		unicode: "1F980",
    		emoji: "🦀",
    		description: "crab",
    		keywords: [
    			"crab"
    		]
    	},
    	{
    		unicode: "1F99E",
    		emoji: "🦞",
    		description: "lobster",
    		keywords: [
    			"lobster"
    		]
    	},
    	{
    		unicode: "1F990",
    		emoji: "🦐",
    		description: "shrimp",
    		keywords: [
    			"shrimp"
    		]
    	},
    	{
    		unicode: "1F991",
    		emoji: "🦑",
    		description: "squid",
    		keywords: [
    			"squid"
    		]
    	},
    	{
    		unicode: "1F9AA",
    		emoji: "🦪",
    		description: "oyster",
    		keywords: [
    			"oyster"
    		]
    	},
    	{
    		unicode: "1F366",
    		emoji: "🍦",
    		description: "soft ice cream",
    		keywords: [
    			"soft ice cream"
    		]
    	},
    	{
    		unicode: "1F367",
    		emoji: "🍧",
    		description: "shaved ice",
    		keywords: [
    			"shaved ice"
    		]
    	},
    	{
    		unicode: "1F368",
    		emoji: "🍨",
    		description: "ice cream",
    		keywords: [
    			"ice cream"
    		]
    	},
    	{
    		unicode: "1F369",
    		emoji: "🍩",
    		description: "doughnut",
    		keywords: [
    			"doughnut"
    		]
    	},
    	{
    		unicode: "1F36A",
    		emoji: "🍪",
    		description: "cookie",
    		keywords: [
    			"cookie"
    		]
    	},
    	{
    		unicode: "1F382",
    		emoji: "🎂",
    		description: "birthday cake",
    		keywords: [
    			"birthday cake"
    		]
    	},
    	{
    		unicode: "1F370",
    		emoji: "🍰",
    		description: "shortcake",
    		keywords: [
    			"shortcake"
    		]
    	},
    	{
    		unicode: "1F9C1",
    		emoji: "🧁",
    		description: "cupcake",
    		keywords: [
    			"cupcake"
    		]
    	},
    	{
    		unicode: "1F967",
    		emoji: "🥧",
    		description: "pie",
    		keywords: [
    			"pie"
    		]
    	},
    	{
    		unicode: "1F36B",
    		emoji: "🍫",
    		description: "chocolate bar",
    		keywords: [
    			"chocolate bar"
    		]
    	},
    	{
    		unicode: "1F36C",
    		emoji: "🍬",
    		description: "candy",
    		keywords: [
    			"candy"
    		]
    	},
    	{
    		unicode: "1F36D",
    		emoji: "🍭",
    		description: "lollipop",
    		keywords: [
    			"lollipop"
    		]
    	},
    	{
    		unicode: "1F36E",
    		emoji: "🍮",
    		description: "custard",
    		keywords: [
    			"custard"
    		]
    	},
    	{
    		unicode: "1F36F",
    		emoji: "🍯",
    		description: "honey pot",
    		keywords: [
    			"honey pot"
    		]
    	},
    	{
    		unicode: "1F37C",
    		emoji: "🍼",
    		description: "baby bottle",
    		keywords: [
    			"baby bottle"
    		]
    	},
    	{
    		unicode: "1F95B",
    		emoji: "🥛",
    		description: "glass of milk",
    		keywords: [
    			"glass of milk"
    		]
    	},
    	{
    		unicode: "2615",
    		emoji: "☕",
    		description: "hot beverage",
    		keywords: [
    			"hot beverage"
    		]
    	},
    	{
    		unicode: "1FAD6",
    		emoji: "🫖",
    		description: "teapot",
    		keywords: [
    			"teapot"
    		]
    	},
    	{
    		unicode: "1F375",
    		emoji: "🍵",
    		description: "teacup without handle",
    		keywords: [
    			"teacup without handle"
    		]
    	},
    	{
    		unicode: "1F376",
    		emoji: "🍶",
    		description: "sake",
    		keywords: [
    			"sake"
    		]
    	},
    	{
    		unicode: "1F37E",
    		emoji: "🍾",
    		description: "bottle with popping cork",
    		keywords: [
    			"bottle with popping cork"
    		]
    	},
    	{
    		unicode: "1F377",
    		emoji: "🍷",
    		description: "wine glass",
    		keywords: [
    			"wine glass"
    		]
    	},
    	{
    		unicode: "1F378",
    		emoji: "🍸",
    		description: "cocktail glass",
    		keywords: [
    			"cocktail glass"
    		]
    	},
    	{
    		unicode: "1F379",
    		emoji: "🍹",
    		description: "tropical drink",
    		keywords: [
    			"tropical drink"
    		]
    	},
    	{
    		unicode: "1F37A",
    		emoji: "🍺",
    		description: "beer mug",
    		keywords: [
    			"beer mug"
    		]
    	},
    	{
    		unicode: "1F37B",
    		emoji: "🍻",
    		description: "clinking beer mugs",
    		keywords: [
    			"clinking beer mugs"
    		]
    	},
    	{
    		unicode: "1F942",
    		emoji: "🥂",
    		description: "clinking glasses",
    		keywords: [
    			"clinking glasses"
    		]
    	},
    	{
    		unicode: "1F943",
    		emoji: "🥃",
    		description: "tumbler glass",
    		keywords: [
    			"tumbler glass"
    		]
    	},
    	{
    		unicode: "1F964",
    		emoji: "🥤",
    		description: "cup with straw",
    		keywords: [
    			"cup with straw"
    		]
    	},
    	{
    		unicode: "1F9CB",
    		emoji: "🧋",
    		description: "bubble tea",
    		keywords: [
    			"bubble tea"
    		]
    	},
    	{
    		unicode: "1F9C3",
    		emoji: "🧃",
    		description: "beverage box",
    		keywords: [
    			"beverage box"
    		]
    	},
    	{
    		unicode: "1F9C9",
    		emoji: "🧉",
    		description: "mate",
    		keywords: [
    			"mate"
    		]
    	},
    	{
    		unicode: "1F9CA",
    		emoji: "🧊",
    		description: "ice",
    		keywords: [
    			"ice"
    		]
    	},
    	{
    		unicode: "1F962",
    		emoji: "🥢",
    		description: "chopsticks",
    		keywords: [
    			"chopsticks"
    		]
    	},
    	{
    		unicode: "1F37D",
    		emoji: "🍽",
    		description: "fork and knife with plate",
    		keywords: [
    			"fork and knife with plate"
    		]
    	},
    	{
    		unicode: "1F374",
    		emoji: "🍴",
    		description: "fork and knife",
    		keywords: [
    			"fork and knife"
    		]
    	},
    	{
    		unicode: "1F944",
    		emoji: "🥄",
    		description: "spoon",
    		keywords: [
    			"spoon"
    		]
    	},
    	{
    		unicode: "1F52A",
    		emoji: "🔪",
    		description: "kitchen knife",
    		keywords: [
    			"kitchen knife"
    		]
    	},
    	{
    		unicode: "1F3FA",
    		emoji: "🏺",
    		description: "amphora",
    		keywords: [
    			"amphora"
    		]
    	},
    	{
    		unicode: "1F30D",
    		emoji: "🌍",
    		description: "globe showing Europe-Africa",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F30E",
    		emoji: "🌎",
    		description: "globe showing Americas",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F30F",
    		emoji: "🌏",
    		description: "globe showing Asia-Australia",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F310",
    		emoji: "🌐",
    		description: "globe with meridians",
    		keywords: [
    			"globe with meridians"
    		]
    	},
    	{
    		unicode: "1F5FA FE0F",
    		emoji: "🗺️",
    		description: "world map",
    		keywords: [
    			"world map"
    		]
    	},
    	{
    		unicode: "1F5FA",
    		emoji: "🗺",
    		description: "world map",
    		keywords: [
    			"world map"
    		]
    	},
    	{
    		unicode: "1F5FE",
    		emoji: "🗾",
    		description: "map of Japan",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F9ED",
    		emoji: "🧭",
    		description: "compass",
    		keywords: [
    			"compass"
    		]
    	},
    	{
    		unicode: "1F3D4 FE0F",
    		emoji: "🏔️",
    		description: "snow-capped mountain",
    		keywords: [
    			"snow-capped mountain"
    		]
    	},
    	{
    		unicode: "1F3D4",
    		emoji: "🏔",
    		description: "snow-capped mountain",
    		keywords: [
    			"snow-capped mountain"
    		]
    	},
    	{
    		unicode: "26F0 FE0F",
    		emoji: "⛰️",
    		description: "mountain",
    		keywords: [
    			"mountain"
    		]
    	},
    	{
    		unicode: "26F0",
    		emoji: "⛰",
    		description: "mountain",
    		keywords: [
    			"mountain"
    		]
    	},
    	{
    		unicode: "1F30B",
    		emoji: "🌋",
    		description: "volcano",
    		keywords: [
    			"volcano"
    		]
    	},
    	{
    		unicode: "1F5FB",
    		emoji: "🗻",
    		description: "mount fuji",
    		keywords: [
    			"mount fuji"
    		]
    	},
    	{
    		unicode: "1F3D5 FE0F",
    		emoji: "🏕️",
    		description: "camping",
    		keywords: [
    			"camping"
    		]
    	},
    	{
    		unicode: "1F3D5",
    		emoji: "🏕",
    		description: "camping",
    		keywords: [
    			"camping"
    		]
    	},
    	{
    		unicode: "1F3D6 FE0F",
    		emoji: "🏖️",
    		description: "beach with umbrella",
    		keywords: [
    			"beach with umbrella"
    		]
    	},
    	{
    		unicode: "1F3D6",
    		emoji: "🏖",
    		description: "beach with umbrella",
    		keywords: [
    			"beach with umbrella"
    		]
    	},
    	{
    		unicode: "1F3DC FE0F",
    		emoji: "🏜️",
    		description: "desert",
    		keywords: [
    			"desert"
    		]
    	},
    	{
    		unicode: "1F3DC",
    		emoji: "🏜",
    		description: "desert",
    		keywords: [
    			"desert"
    		]
    	},
    	{
    		unicode: "1F3DD FE0F",
    		emoji: "🏝️",
    		description: "desert island",
    		keywords: [
    			"desert island"
    		]
    	},
    	{
    		unicode: "1F3DD",
    		emoji: "🏝",
    		description: "desert island",
    		keywords: [
    			"desert island"
    		]
    	},
    	{
    		unicode: "1F3DE FE0F",
    		emoji: "🏞️",
    		description: "national park",
    		keywords: [
    			"national park"
    		]
    	},
    	{
    		unicode: "1F3DE",
    		emoji: "🏞",
    		description: "national park",
    		keywords: [
    			"national park"
    		]
    	},
    	{
    		unicode: "1F3DF FE0F",
    		emoji: "🏟️",
    		description: "stadium",
    		keywords: [
    			"stadium"
    		]
    	},
    	{
    		unicode: "1F3DF",
    		emoji: "🏟",
    		description: "stadium",
    		keywords: [
    			"stadium"
    		]
    	},
    	{
    		unicode: "1F3DB FE0F",
    		emoji: "🏛️",
    		description: "classical building",
    		keywords: [
    			"classical building"
    		]
    	},
    	{
    		unicode: "1F3DB",
    		emoji: "🏛",
    		description: "classical building",
    		keywords: [
    			"classical building"
    		]
    	},
    	{
    		unicode: "1F3D7 FE0F",
    		emoji: "🏗️",
    		description: "building construction",
    		keywords: [
    			"building construction"
    		]
    	},
    	{
    		unicode: "1F3D7",
    		emoji: "🏗",
    		description: "building construction",
    		keywords: [
    			"building construction"
    		]
    	},
    	{
    		unicode: "1F9F1",
    		emoji: "🧱",
    		description: "brick",
    		keywords: [
    			"brick"
    		]
    	},
    	{
    		unicode: "1FAA8",
    		emoji: "🪨",
    		description: "rock",
    		keywords: [
    			"rock"
    		]
    	},
    	{
    		unicode: "1FAB5",
    		emoji: "🪵",
    		description: "wood",
    		keywords: [
    			"wood"
    		]
    	},
    	{
    		unicode: "1F6D6",
    		emoji: "🛖",
    		description: "hut",
    		keywords: [
    			"hut"
    		]
    	},
    	{
    		unicode: "1F3D8 FE0F",
    		emoji: "🏘️",
    		description: "houses",
    		keywords: [
    			"houses"
    		]
    	},
    	{
    		unicode: "1F3D8",
    		emoji: "🏘",
    		description: "houses",
    		keywords: [
    			"houses"
    		]
    	},
    	{
    		unicode: "1F3DA",
    		emoji: "🏚",
    		description: "derelict house",
    		keywords: [
    			"home"
    		]
    	},
    	{
    		unicode: "1F3E0",
    		emoji: "🏠",
    		description: "house",
    		keywords: [
    			"house"
    		]
    	},
    	{
    		unicode: "1F3E1",
    		emoji: "🏡",
    		description: "house with garden",
    		keywords: [
    			"house with garden"
    		]
    	},
    	{
    		unicode: "1F3E2",
    		emoji: "🏢",
    		description: "office building",
    		keywords: [
    			"office building"
    		]
    	},
    	{
    		unicode: "1F3E3",
    		emoji: "🏣",
    		description: "Japanese post office",
    		keywords: [
    			"Japanese post office"
    		]
    	},
    	{
    		unicode: "1F3E4",
    		emoji: "🏤",
    		description: "post office",
    		keywords: [
    			"post office"
    		]
    	},
    	{
    		unicode: "1F3E5",
    		emoji: "🏥",
    		description: "hospital",
    		keywords: [
    			"hospital"
    		]
    	},
    	{
    		unicode: "1F3E6",
    		emoji: "🏦",
    		description: "bank",
    		keywords: [
    			"bank"
    		]
    	},
    	{
    		unicode: "1F3E8",
    		emoji: "🏨",
    		description: "hotel",
    		keywords: [
    			"hotel"
    		]
    	},
    	{
    		unicode: "1F3EA",
    		emoji: "🏪",
    		description: "convenience store",
    		keywords: [
    			"convenience store"
    		]
    	},
    	{
    		unicode: "1F3EB",
    		emoji: "🏫",
    		description: "school",
    		keywords: [
    			"school"
    		]
    	},
    	{
    		unicode: "1F3EC",
    		emoji: "🏬",
    		description: "department store",
    		keywords: [
    			"department store"
    		]
    	},
    	{
    		unicode: "1F3ED",
    		emoji: "🏭",
    		description: "factory",
    		keywords: [
    			"factory"
    		]
    	},
    	{
    		unicode: "1F3EF",
    		emoji: "🏯",
    		description: "Japanese castle",
    		keywords: [
    			"Japanese castle"
    		]
    	},
    	{
    		unicode: "1F3F0",
    		emoji: "🏰",
    		description: "castle",
    		keywords: [
    			"castle"
    		]
    	},
    	{
    		unicode: "1F492",
    		emoji: "💒",
    		description: "wedding",
    		keywords: [
    			"wedding"
    		]
    	},
    	{
    		unicode: "1F5FC",
    		emoji: "🗼",
    		description: "Tokyo tower",
    		keywords: [
    			"Tokyo tower"
    		]
    	},
    	{
    		unicode: "1F5FD",
    		emoji: "🗽",
    		description: "Statue of Liberty",
    		keywords: [
    			"Statue of Liberty"
    		]
    	},
    	{
    		unicode: "26EA",
    		emoji: "⛪",
    		description: "church",
    		keywords: [
    			"church"
    		]
    	},
    	{
    		unicode: "1F54C",
    		emoji: "🕌",
    		description: "mosque",
    		keywords: [
    			"mosque"
    		]
    	},
    	{
    		unicode: "1F6D5",
    		emoji: "🛕",
    		description: "hindu temple",
    		keywords: [
    			"hindu temple"
    		]
    	},
    	{
    		unicode: "1F54D",
    		emoji: "🕍",
    		description: "synagogue",
    		keywords: [
    			"synagogue"
    		]
    	},
    	{
    		unicode: "26E9 FE0F",
    		emoji: "⛩️",
    		description: "shinto shrine",
    		keywords: [
    			"shinto shrine"
    		]
    	},
    	{
    		unicode: "26E9",
    		emoji: "⛩",
    		description: "shinto shrine",
    		keywords: [
    			"shinto shrine"
    		]
    	},
    	{
    		unicode: "1F54B",
    		emoji: "🕋",
    		description: "kaaba",
    		keywords: [
    			"kaaba"
    		]
    	},
    	{
    		unicode: "26F2",
    		emoji: "⛲",
    		description: "fountain",
    		keywords: [
    			"fountain"
    		]
    	},
    	{
    		unicode: "26FA",
    		emoji: "⛺",
    		description: "tent",
    		keywords: [
    			"tent"
    		]
    	},
    	{
    		unicode: "1F301",
    		emoji: "🌁",
    		description: "foggy",
    		keywords: [
    			"foggy"
    		]
    	},
    	{
    		unicode: "1F303",
    		emoji: "🌃",
    		description: "night with stars",
    		keywords: [
    			"night with stars"
    		]
    	},
    	{
    		unicode: "1F3D9 FE0F",
    		emoji: "🏙️",
    		description: "cityscape",
    		keywords: [
    			"cityscape"
    		]
    	},
    	{
    		unicode: "1F3D9",
    		emoji: "🏙",
    		description: "cityscape",
    		keywords: [
    			"cityscape"
    		]
    	},
    	{
    		unicode: "1F304",
    		emoji: "🌄",
    		description: "sunrise over mountains",
    		keywords: [
    			"sunrise over mountains"
    		]
    	},
    	{
    		unicode: "1F305",
    		emoji: "🌅",
    		description: "sunrise",
    		keywords: [
    			"sunrise"
    		]
    	},
    	{
    		unicode: "1F306",
    		emoji: "🌆",
    		description: "cityscape at dusk",
    		keywords: [
    			"cityscape at dusk"
    		]
    	},
    	{
    		unicode: "1F307",
    		emoji: "🌇",
    		description: "sunset",
    		keywords: [
    			"sunset"
    		]
    	},
    	{
    		unicode: "1F309",
    		emoji: "🌉",
    		description: "bridge at night",
    		keywords: [
    			"bridge at night"
    		]
    	},
    	{
    		unicode: "2668 FE0F",
    		emoji: "♨️",
    		description: "hot springs",
    		keywords: [
    			"hot springs"
    		]
    	},
    	{
    		unicode: "2668",
    		emoji: "♨",
    		description: "hot springs",
    		keywords: [
    			"hot springs"
    		]
    	},
    	{
    		unicode: "1F3A0",
    		emoji: "🎠",
    		description: "carousel horse",
    		keywords: [
    			"carousel horse"
    		]
    	},
    	{
    		unicode: "1F3A1",
    		emoji: "🎡",
    		description: "ferris wheel",
    		keywords: [
    			"ferris wheel"
    		]
    	},
    	{
    		unicode: "1F3A2",
    		emoji: "🎢",
    		description: "roller coaster",
    		keywords: [
    			"roller coaster"
    		]
    	},
    	{
    		unicode: "1F488",
    		emoji: "💈",
    		description: "barber pole",
    		keywords: [
    			"barber pole"
    		]
    	},
    	{
    		unicode: "1F3AA",
    		emoji: "🎪",
    		description: "circus tent",
    		keywords: [
    			"circus tent"
    		]
    	},
    	{
    		unicode: "1F682",
    		emoji: "🚂",
    		description: "locomotive",
    		keywords: [
    			"locomotive"
    		]
    	},
    	{
    		unicode: "1F683",
    		emoji: "🚃",
    		description: "railway car",
    		keywords: [
    			"railway car"
    		]
    	},
    	{
    		unicode: "1F684",
    		emoji: "🚄",
    		description: "high-speed train",
    		keywords: [
    			"high-speed train"
    		]
    	},
    	{
    		unicode: "1F685",
    		emoji: "🚅",
    		description: "bullet train",
    		keywords: [
    			"bullet train"
    		]
    	},
    	{
    		unicode: "1F686",
    		emoji: "🚆",
    		description: "train",
    		keywords: [
    			"train"
    		]
    	},
    	{
    		unicode: "1F687",
    		emoji: "🚇",
    		description: "metro",
    		keywords: [
    			"metro"
    		]
    	},
    	{
    		unicode: "1F688",
    		emoji: "🚈",
    		description: "light rail",
    		keywords: [
    			"light rail"
    		]
    	},
    	{
    		unicode: "1F689",
    		emoji: "🚉",
    		description: "station",
    		keywords: [
    			"station"
    		]
    	},
    	{
    		unicode: "1F68A",
    		emoji: "🚊",
    		description: "tram",
    		keywords: [
    			"tram"
    		]
    	},
    	{
    		unicode: "1F69D",
    		emoji: "🚝",
    		description: "monorail",
    		keywords: [
    			"monorail"
    		]
    	},
    	{
    		unicode: "1F69E",
    		emoji: "🚞",
    		description: "mountain railway",
    		keywords: [
    			"mountain railway"
    		]
    	},
    	{
    		unicode: "1F68B",
    		emoji: "🚋",
    		description: "tram car",
    		keywords: [
    			"tram car"
    		]
    	},
    	{
    		unicode: "1F68C",
    		emoji: "🚌",
    		description: "bus",
    		keywords: [
    			"bus"
    		]
    	},
    	{
    		unicode: "1F68D",
    		emoji: "🚍",
    		description: "oncoming bus",
    		keywords: [
    			"oncoming bus"
    		]
    	},
    	{
    		unicode: "1F68E",
    		emoji: "🚎",
    		description: "trolleybus",
    		keywords: [
    			"trolleybus"
    		]
    	},
    	{
    		unicode: "1F690",
    		emoji: "🚐",
    		description: "minibus",
    		keywords: [
    			"minibus"
    		]
    	},
    	{
    		unicode: "1F691",
    		emoji: "🚑",
    		description: "ambulance",
    		keywords: [
    			"ambulance"
    		]
    	},
    	{
    		unicode: "1F692",
    		emoji: "🚒",
    		description: "fire engine",
    		keywords: [
    			"fire engine"
    		]
    	},
    	{
    		unicode: "1F693",
    		emoji: "🚓",
    		description: "police car",
    		keywords: [
    			"police car"
    		]
    	},
    	{
    		unicode: "1F694",
    		emoji: "🚔",
    		description: "oncoming police car",
    		keywords: [
    			"oncoming police car"
    		]
    	},
    	{
    		unicode: "1F695",
    		emoji: "🚕",
    		description: "taxi",
    		keywords: [
    			"taxi"
    		]
    	},
    	{
    		unicode: "1F696",
    		emoji: "🚖",
    		description: "oncoming taxi",
    		keywords: [
    			"oncoming taxi"
    		]
    	},
    	{
    		unicode: "1F697",
    		emoji: "🚗",
    		description: "automobile",
    		keywords: [
    			"automobile",
    			"car"
    		]
    	},
    	{
    		unicode: "1F698",
    		emoji: "🚘",
    		description: "oncoming automobile",
    		keywords: [
    			"oncoming automobile"
    		]
    	},
    	{
    		unicode: "1F699",
    		emoji: "🚙",
    		description: "sport utility vehicle",
    		keywords: [
    			"sport utility vehicle"
    		]
    	},
    	{
    		unicode: "1F6FB",
    		emoji: "🛻",
    		description: "pickup truck",
    		keywords: [
    			"pickup truck"
    		]
    	},
    	{
    		unicode: "1F69A",
    		emoji: "🚚",
    		description: "delivery truck",
    		keywords: [
    			"delivery truck"
    		]
    	},
    	{
    		unicode: "1F69B",
    		emoji: "🚛",
    		description: "articulated lorry",
    		keywords: [
    			"articulated lorry"
    		]
    	},
    	{
    		unicode: "1F69C",
    		emoji: "🚜",
    		description: "tractor",
    		keywords: [
    			"tractor"
    		]
    	},
    	{
    		unicode: "1F3CE FE0F",
    		emoji: "🏎️",
    		description: "racing car",
    		keywords: [
    			"racing car",
    			"Formula 1 car",
    			"Formula one car"
    		]
    	},
    	{
    		unicode: "1F3CE",
    		emoji: "🏎",
    		description: "racing car",
    		keywords: [
    			"racing car"
    		]
    	},
    	{
    		unicode: "1F3CD FE0F",
    		emoji: "🏍️",
    		description: "motorcycle",
    		keywords: [
    			"motorcycle",
    			"bike"
    		]
    	},
    	{
    		unicode: "1F3CD",
    		emoji: "🏍",
    		description: "motorcycle",
    		keywords: [
    			"motorcycle"
    		]
    	},
    	{
    		unicode: "1F6F5",
    		emoji: "🛵",
    		description: "motor scooter",
    		keywords: [
    			"motor scooter"
    		]
    	},
    	{
    		unicode: "1F9BD",
    		emoji: "🦽",
    		description: "manual wheelchair",
    		keywords: [
    			"manual wheelchair"
    		]
    	},
    	{
    		unicode: "1F9BC",
    		emoji: "🦼",
    		description: "motorized wheelchair",
    		keywords: [
    			"motorized wheelchair"
    		]
    	},
    	{
    		unicode: "1F6FA",
    		emoji: "🛺",
    		description: "auto rickshaw",
    		keywords: [
    			"auto rickshaw"
    		]
    	},
    	{
    		unicode: "1F6B2",
    		emoji: "🚲",
    		description: "bicycle",
    		keywords: [
    			"bicycle"
    		]
    	},
    	{
    		unicode: "1F6F4",
    		emoji: "🛴",
    		description: "kick scooter",
    		keywords: [
    			"kick scooter"
    		]
    	},
    	{
    		unicode: "1F6F9",
    		emoji: "🛹",
    		description: "skateboard",
    		keywords: [
    			"skateboard"
    		]
    	},
    	{
    		unicode: "1F6FC",
    		emoji: "🛼",
    		description: "roller skate",
    		keywords: [
    			"roller skate"
    		]
    	},
    	{
    		unicode: "1F68F",
    		emoji: "🚏",
    		description: "bus stop",
    		keywords: [
    			"bus stop"
    		]
    	},
    	{
    		unicode: "1F6E3 FE0F",
    		emoji: "🛣️",
    		description: "motorway",
    		keywords: [
    			"motorway"
    		]
    	},
    	{
    		unicode: "1F6E3",
    		emoji: "🛣",
    		description: "motorway",
    		keywords: [
    			"motorway"
    		]
    	},
    	{
    		unicode: "1F6E4 FE0F",
    		emoji: "🛤️",
    		description: "railway track",
    		keywords: [
    			"railway track"
    		]
    	},
    	{
    		unicode: "1F6E4",
    		emoji: "🛤",
    		description: "railway track",
    		keywords: [
    			"railway track"
    		]
    	},
    	{
    		unicode: "1F6E2 FE0F",
    		emoji: "🛢️",
    		description: "oil drum",
    		keywords: [
    			"oil drum"
    		]
    	},
    	{
    		unicode: "1F6E2",
    		emoji: "🛢",
    		description: "oil drum",
    		keywords: [
    			"oil drum"
    		]
    	},
    	{
    		unicode: "26FD",
    		emoji: "⛽",
    		description: "fuel pump",
    		keywords: [
    			"fuel pump"
    		]
    	},
    	{
    		unicode: "1F6A8",
    		emoji: "🚨",
    		description: "police car light",
    		keywords: [
    			"police car light"
    		]
    	},
    	{
    		unicode: "1F6A5",
    		emoji: "🚥",
    		description: "horizontal traffic light",
    		keywords: [
    			"horizontal traffic light"
    		]
    	},
    	{
    		unicode: "1F6A6",
    		emoji: "🚦",
    		description: "vertical traffic light",
    		keywords: [
    			"vertical traffic light"
    		]
    	},
    	{
    		unicode: "1F6D1",
    		emoji: "🛑",
    		description: "stop sign",
    		keywords: [
    			"stop sign"
    		]
    	},
    	{
    		unicode: "1F6A7",
    		emoji: "🚧",
    		description: "construction",
    		keywords: [
    			"construction"
    		]
    	},
    	{
    		unicode: "2693",
    		emoji: "⚓",
    		description: "anchor",
    		keywords: [
    			"anchor"
    		]
    	},
    	{
    		unicode: "26F5",
    		emoji: "⛵",
    		description: "sailboat",
    		keywords: [
    			"sailboat"
    		]
    	},
    	{
    		unicode: "1F6F6",
    		emoji: "🛶",
    		description: "canoe",
    		keywords: [
    			"canoe"
    		]
    	},
    	{
    		unicode: "1F6A4",
    		emoji: "🚤",
    		description: "speedboat",
    		keywords: [
    			"speedboat"
    		]
    	},
    	{
    		unicode: "1F6F3 FE0F",
    		emoji: "🛳️",
    		description: "passenger ship",
    		keywords: [
    			"passenger ship"
    		]
    	},
    	{
    		unicode: "1F6F3",
    		emoji: "🛳",
    		description: "passenger ship",
    		keywords: [
    			"passenger ship"
    		]
    	},
    	{
    		unicode: "26F4 FE0F",
    		emoji: "⛴️",
    		description: "ferry",
    		keywords: [
    			"ferry"
    		]
    	},
    	{
    		unicode: "26F4",
    		emoji: "⛴",
    		description: "ferry",
    		keywords: [
    			"ferry"
    		]
    	},
    	{
    		unicode: "1F6E5 FE0F",
    		emoji: "🛥️",
    		description: "motor boat",
    		keywords: [
    			"motor boat"
    		]
    	},
    	{
    		unicode: "1F6E5",
    		emoji: "🛥",
    		description: "motor boat",
    		keywords: [
    			"motor boat"
    		]
    	},
    	{
    		unicode: "1F6A2",
    		emoji: "🚢",
    		description: "ship",
    		keywords: [
    			"ship"
    		]
    	},
    	{
    		unicode: "2708 FE0F",
    		emoji: "✈️",
    		description: "airplane",
    		keywords: [
    			"airplane"
    		]
    	},
    	{
    		unicode: "1F6E9 FE0F",
    		emoji: "🛩️",
    		description: "small airplane",
    		keywords: [
    			"small airplane"
    		]
    	},
    	{
    		unicode: "1F6E9",
    		emoji: "🛩",
    		description: "small airplane",
    		keywords: [
    			"small airplane"
    		]
    	},
    	{
    		unicode: "1F6EB",
    		emoji: "🛫",
    		description: "airplane departure",
    		keywords: [
    			"airplane departure"
    		]
    	},
    	{
    		unicode: "1F6EC",
    		emoji: "🛬",
    		description: "airplane arrival",
    		keywords: [
    			"airplane arrival"
    		]
    	},
    	{
    		unicode: "1FA82",
    		emoji: "🪂",
    		description: "parachute",
    		keywords: [
    			"parachute"
    		]
    	},
    	{
    		unicode: "1F4BA",
    		emoji: "💺",
    		description: "seat",
    		keywords: [
    			"seat"
    		]
    	},
    	{
    		unicode: "1F681",
    		emoji: "🚁",
    		description: "helicopter",
    		keywords: [
    			"helicopter"
    		]
    	},
    	{
    		unicode: "1F69F",
    		emoji: "🚟",
    		description: "suspension railway",
    		keywords: [
    			"suspension railway"
    		]
    	},
    	{
    		unicode: "1F6A0",
    		emoji: "🚠",
    		description: "mountain cableway",
    		keywords: [
    			"mountain cableway"
    		]
    	},
    	{
    		unicode: "1F6A1",
    		emoji: "🚡",
    		description: "aerial tramway",
    		keywords: [
    			"aerial tramway"
    		]
    	},
    	{
    		unicode: "1F6F0 FE0F",
    		emoji: "🛰️",
    		description: "satellite",
    		keywords: [
    			"satellite"
    		]
    	},
    	{
    		unicode: "1F6F0",
    		emoji: "🛰",
    		description: "satellite",
    		keywords: [
    			"satellite"
    		]
    	},
    	{
    		unicode: "1F680",
    		emoji: "🚀",
    		description: "rocket",
    		keywords: [
    			"rocket"
    		]
    	},
    	{
    		unicode: "1F6F8",
    		emoji: "🛸",
    		description: "flying saucer",
    		keywords: [
    			"flying saucer"
    		]
    	},
    	{
    		unicode: "1F6CE FE0F",
    		emoji: "🛎️",
    		description: "bellhop bell",
    		keywords: [
    			"bellhop bell"
    		]
    	},
    	{
    		unicode: "1F6CE",
    		emoji: "🛎",
    		description: "bellhop bell",
    		keywords: [
    			"bellhop bell"
    		]
    	},
    	{
    		unicode: "1F9F3",
    		emoji: "🧳",
    		description: "luggage",
    		keywords: [
    			"luggage"
    		]
    	},
    	{
    		unicode: "231B",
    		emoji: "⌛",
    		description: "hourglass done",
    		keywords: [
    			"hourglass done"
    		]
    	},
    	{
    		unicode: "23F3",
    		emoji: "⏳",
    		description: "hourglass not done",
    		keywords: [
    			"hourglass not done"
    		]
    	},
    	{
    		unicode: "231A",
    		emoji: "⌚",
    		description: "watch",
    		keywords: [
    			"watch"
    		]
    	},
    	{
    		unicode: "23F0",
    		emoji: "⏰",
    		description: "alarm clock",
    		keywords: [
    			"alarm clock"
    		]
    	},
    	{
    		unicode: "23F1 FE0F",
    		emoji: "⏱️",
    		description: "stopwatch",
    		keywords: [
    			"stopwatch"
    		]
    	},
    	{
    		unicode: "23F1",
    		emoji: "⏱",
    		description: "stopwatch",
    		keywords: [
    			"stopwatch"
    		]
    	},
    	{
    		unicode: "23F2 FE0F",
    		emoji: "⏲️",
    		description: "timer clock",
    		keywords: [
    			"timer clock"
    		]
    	},
    	{
    		unicode: "23F2",
    		emoji: "⏲",
    		description: "timer clock",
    		keywords: [
    			"timer clock"
    		]
    	},
    	{
    		unicode: "1F570 FE0F",
    		emoji: "🕰️",
    		description: "mantelpiece clock",
    		keywords: [
    			"mantelpiece clock"
    		]
    	},
    	{
    		unicode: "1F570",
    		emoji: "🕰",
    		description: "mantelpiece clock",
    		keywords: [
    			"mantelpiece clock"
    		]
    	},
    	{
    		unicode: "1F55B",
    		emoji: "🕛",
    		description: "twelve o’clock",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F567",
    		emoji: "🕧",
    		description: "twelve-thirty",
    		keywords: [
    			"twelve-thirty"
    		]
    	},
    	{
    		unicode: "1F550",
    		emoji: "🕐",
    		description: "one o’clock",
    		keywords: [
    			"one o’clock"
    		]
    	},
    	{
    		unicode: "1F55C",
    		emoji: "🕜",
    		description: "one-thirty",
    		keywords: [
    			"one-thirty"
    		]
    	},
    	{
    		unicode: "1F551",
    		emoji: "🕑",
    		description: "two o’clock",
    		keywords: [
    			"two o’clock"
    		]
    	},
    	{
    		unicode: "1F55D",
    		emoji: "🕝",
    		description: "two-thirty",
    		keywords: [
    			"two-thirty"
    		]
    	},
    	{
    		unicode: "1F552",
    		emoji: "🕒",
    		description: "three o’clock",
    		keywords: [
    			"three o’clock"
    		]
    	},
    	{
    		unicode: "1F55E",
    		emoji: "🕞",
    		description: "three-thirty",
    		keywords: [
    			"three-thirty"
    		]
    	},
    	{
    		unicode: "1F553",
    		emoji: "🕓",
    		description: "four o’clock",
    		keywords: [
    			"four o’clock"
    		]
    	},
    	{
    		unicode: "1F55F",
    		emoji: "🕟",
    		description: "four-thirty",
    		keywords: [
    			"four-thirty"
    		]
    	},
    	{
    		unicode: "1F554",
    		emoji: "🕔",
    		description: "five o’clock",
    		keywords: [
    			"five o’clock"
    		]
    	},
    	{
    		unicode: "1F560",
    		emoji: "🕠",
    		description: "five-thirty",
    		keywords: [
    			"five-thirty"
    		]
    	},
    	{
    		unicode: "1F555",
    		emoji: "🕕",
    		description: "six o’clock",
    		keywords: [
    			"six o’clock"
    		]
    	},
    	{
    		unicode: "1F561",
    		emoji: "🕡",
    		description: "six-thirty",
    		keywords: [
    			"six-thirty"
    		]
    	},
    	{
    		unicode: "1F556",
    		emoji: "🕖",
    		description: "seven o’clock",
    		keywords: [
    			"seven o’clock"
    		]
    	},
    	{
    		unicode: "1F562",
    		emoji: "🕢",
    		description: "seven-thirty",
    		keywords: [
    			"seven-thirty"
    		]
    	},
    	{
    		unicode: "1F557",
    		emoji: "🕗",
    		description: "eight o’clock",
    		keywords: [
    			"eight o’clock"
    		]
    	},
    	{
    		unicode: "1F563",
    		emoji: "🕣",
    		description: "eight-thirty",
    		keywords: [
    			"eight-thirty"
    		]
    	},
    	{
    		unicode: "1F558",
    		emoji: "🕘",
    		description: "nine o’clock",
    		keywords: [
    			"nine o’clock"
    		]
    	},
    	{
    		unicode: "1F564",
    		emoji: "🕤",
    		description: "nine-thirty",
    		keywords: [
    			"nine-thirty"
    		]
    	},
    	{
    		unicode: "1F559",
    		emoji: "🕙",
    		description: "ten o’clock",
    		keywords: [
    			"ten o’clock"
    		]
    	},
    	{
    		unicode: "1F565",
    		emoji: "🕥",
    		description: "ten-thirty",
    		keywords: [
    			"ten-thirty"
    		]
    	},
    	{
    		unicode: "1F55A",
    		emoji: "🕚",
    		description: "eleven o’clock",
    		keywords: [
    			"eleven o’clock"
    		]
    	},
    	{
    		unicode: "1F566",
    		emoji: "🕦",
    		description: "eleven-thirty",
    		keywords: [
    			"eleven-thirty"
    		]
    	},
    	{
    		unicode: "1F311",
    		emoji: "🌑",
    		description: "new moon",
    		keywords: [
    			"new moon"
    		]
    	},
    	{
    		unicode: "1F312",
    		emoji: "🌒",
    		description: "waxing crescent moon",
    		keywords: [
    			"waxing crescent moon"
    		]
    	},
    	{
    		unicode: "1F313",
    		emoji: "🌓",
    		description: "first quarter moon",
    		keywords: [
    			"first quarter moon"
    		]
    	},
    	{
    		unicode: "1F314",
    		emoji: "🌔",
    		description: "waxing gibbous moon",
    		keywords: [
    			"waxing gibbous moon"
    		]
    	},
    	{
    		unicode: "1F315",
    		emoji: "🌕",
    		description: "full moon",
    		keywords: [
    			"full moon"
    		]
    	},
    	{
    		unicode: "1F316",
    		emoji: "🌖",
    		description: "waning gibbous moon",
    		keywords: [
    			"waning gibbous moon"
    		]
    	},
    	{
    		unicode: "1F317",
    		emoji: "🌗",
    		description: "last quarter moon",
    		keywords: [
    			"last quarter moon"
    		]
    	},
    	{
    		unicode: "1F318",
    		emoji: "🌘",
    		description: "waning crescent moon",
    		keywords: [
    			"waning crescent moon"
    		]
    	},
    	{
    		unicode: "1F319",
    		emoji: "🌙",
    		description: "crescent moon",
    		keywords: [
    			"crescent moon"
    		]
    	},
    	{
    		unicode: "1F31A",
    		emoji: "🌚",
    		description: "new moon face",
    		keywords: [
    			"new moon face"
    		]
    	},
    	{
    		unicode: "1F31B",
    		emoji: "🌛",
    		description: "first quarter moon face",
    		keywords: [
    			"first quarter moon face"
    		]
    	},
    	{
    		unicode: "1F31C",
    		emoji: "🌜",
    		description: "last quarter moon face",
    		keywords: [
    			"last quarter moon face"
    		]
    	},
    	{
    		unicode: "1F321 FE0F",
    		emoji: "🌡️",
    		description: "thermometer",
    		keywords: [
    			"thermometer"
    		]
    	},
    	{
    		unicode: "1F321",
    		emoji: "🌡",
    		description: "thermometer",
    		keywords: [
    			"thermometer"
    		]
    	},
    	{
    		unicode: "2600 FE0F",
    		emoji: "☀️",
    		description: "sun",
    		keywords: [
    			"sun"
    		]
    	},
    	{
    		unicode: "1F31E",
    		emoji: "🌞",
    		description: "sun with face",
    		keywords: [
    			"smiling sun"
    		]
    	},
    	{
    		unicode: "1FA90",
    		emoji: "🪐",
    		description: "ringed planet",
    		keywords: [
    			"ringed planet"
    		]
    	},
    	{
    		unicode: "2B50",
    		emoji: "⭐",
    		description: "star",
    		keywords: [
    			"star"
    		]
    	},
    	{
    		unicode: "1F31F",
    		emoji: "🌟",
    		description: "glowing star",
    		keywords: [
    			"glowing star"
    		]
    	},
    	{
    		unicode: "1F320",
    		emoji: "🌠",
    		description: "shooting star",
    		keywords: [
    			"shooting star"
    		]
    	},
    	{
    		unicode: "1F30C",
    		emoji: "🌌",
    		description: "milky way",
    		keywords: [
    			"milky way"
    		]
    	},
    	{
    		unicode: "2601 FE0F",
    		emoji: "☁️",
    		description: "cloud",
    		keywords: [
    			"cloud"
    		]
    	},
    	{
    		unicode: "26C5",
    		emoji: "⛅",
    		description: "sun behind cloud",
    		keywords: [
    			"sun behind cloud"
    		]
    	},
    	{
    		unicode: "26C8 FE0F",
    		emoji: "⛈️",
    		description: "cloud with lightning and rain",
    		keywords: [
    			"cloud with lightning and rain"
    		]
    	},
    	{
    		unicode: "1F324 FE0F",
    		emoji: "🌤️",
    		description: "sun behind small cloud",
    		keywords: [
    			"sun behind small cloud"
    		]
    	},
    	{
    		unicode: "1F324",
    		emoji: "🌤",
    		description: "sun behind small cloud",
    		keywords: [
    			"sun behind small cloud"
    		]
    	},
    	{
    		unicode: "1F325 FE0F",
    		emoji: "🌥️",
    		description: "sun behind large cloud",
    		keywords: [
    			"sun behind large cloud"
    		]
    	},
    	{
    		unicode: "1F325",
    		emoji: "🌥",
    		description: "sun behind large cloud",
    		keywords: [
    			"sun behind large cloud"
    		]
    	},
    	{
    		unicode: "1F326 FE0F",
    		emoji: "🌦️",
    		description: "sun behind rain cloud",
    		keywords: [
    			"sun behind rain cloud"
    		]
    	},
    	{
    		unicode: "1F326",
    		emoji: "🌦",
    		description: "sun behind rain cloud",
    		keywords: [
    			"sun behind rain cloud"
    		]
    	},
    	{
    		unicode: "1F327 FE0F",
    		emoji: "🌧️",
    		description: "cloud with rain",
    		keywords: [
    			"cloud with rain"
    		]
    	},
    	{
    		unicode: "1F327",
    		emoji: "🌧",
    		description: "cloud with rain",
    		keywords: [
    			"cloud with rain"
    		]
    	},
    	{
    		unicode: "1F328 FE0F",
    		emoji: "🌨️",
    		description: "cloud with snow",
    		keywords: [
    			"cloud with snow"
    		]
    	},
    	{
    		unicode: "1F328",
    		emoji: "🌨",
    		description: "cloud with snow",
    		keywords: [
    			"cloud with snow"
    		]
    	},
    	{
    		unicode: "1F329 FE0F",
    		emoji: "🌩️",
    		description: "cloud with lightning",
    		keywords: [
    			"cloud with lightning"
    		]
    	},
    	{
    		unicode: "1F329",
    		emoji: "🌩",
    		description: "cloud with lightning",
    		keywords: [
    			"cloud with lightning"
    		]
    	},
    	{
    		unicode: "1F32A FE0F",
    		emoji: "🌪️",
    		description: "tornado",
    		keywords: [
    			"tornado"
    		]
    	},
    	{
    		unicode: "1F32B FE0F",
    		emoji: "🌫️",
    		description: "fog",
    		keywords: [
    			"fog"
    		]
    	},
    	{
    		unicode: "1F32C FE0F",
    		emoji: "🌬️",
    		description: "wind face",
    		keywords: [
    			"wind face"
    		]
    	},
    	{
    		unicode: "1F300",
    		emoji: "🌀",
    		description: "cyclone",
    		keywords: [
    			"cyclone"
    		]
    	},
    	{
    		unicode: "1F308",
    		emoji: "🌈",
    		description: "rainbow",
    		keywords: [
    			"rainbow"
    		]
    	},
    	{
    		unicode: "1F302",
    		emoji: "🌂",
    		description: "closed umbrella",
    		keywords: [
    			"closed umbrella"
    		]
    	},
    	{
    		unicode: "2602 FE0F",
    		emoji: "☂️",
    		description: "umbrella",
    		keywords: [
    			"umbrella"
    		]
    	},
    	{
    		unicode: "2614",
    		emoji: "☔",
    		description: "umbrella with rain drops",
    		keywords: [
    			"umbrella with rain drops"
    		]
    	},
    	{
    		unicode: "26F1 FE0F",
    		emoji: "⛱️",
    		description: "umbrella on ground",
    		keywords: [
    			"umbrella on ground"
    		]
    	},
    	{
    		unicode: "26F1",
    		emoji: "⛱",
    		description: "umbrella on ground",
    		keywords: [
    			"umbrella on ground"
    		]
    	},
    	{
    		unicode: "26A1",
    		emoji: "⚡",
    		description: "high voltage",
    		keywords: [
    			"high voltage"
    		]
    	},
    	{
    		unicode: "2744 FE0F",
    		emoji: "❄️",
    		description: "snowflake",
    		keywords: [
    			"snowflake"
    		]
    	},
    	{
    		unicode: "2744",
    		emoji: "❄",
    		description: "snowflake",
    		keywords: [
    			"snowflake"
    		]
    	},
    	{
    		unicode: "2603 FE0F",
    		emoji: "☃️",
    		description: "snowman",
    		keywords: [
    			"snowman"
    		]
    	},
    	{
    		unicode: "2603",
    		emoji: "☃",
    		description: "snowman",
    		keywords: [
    			"snowman"
    		]
    	},
    	{
    		unicode: "26C4",
    		emoji: "⛄",
    		description: "snowman without snow",
    		keywords: [
    			"snowman without snow"
    		]
    	},
    	{
    		unicode: "2604 FE0F",
    		emoji: "☄️",
    		description: "comet",
    		keywords: [
    			"comet"
    		]
    	},
    	{
    		unicode: "2604",
    		emoji: "☄",
    		description: "comet",
    		keywords: [
    			"comet"
    		]
    	},
    	{
    		unicode: "1F525",
    		emoji: "🔥",
    		description: "fire",
    		keywords: [
    			"fire"
    		]
    	},
    	{
    		unicode: "1F4A7",
    		emoji: "💧",
    		description: "droplet",
    		keywords: [
    			"droplet"
    		]
    	},
    	{
    		unicode: "1F30A",
    		emoji: "🌊",
    		description: "water wave",
    		keywords: [
    			"water wave"
    		]
    	},
    	{
    		unicode: "1F383",
    		emoji: "🎃",
    		description: "jack-o-lantern",
    		keywords: [
    			"jack-o-lantern"
    		]
    	},
    	{
    		unicode: "1F384",
    		emoji: "🎄",
    		description: "Christmas tree",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F386",
    		emoji: "🎆",
    		description: "fireworks",
    		keywords: [
    			"fireworks"
    		]
    	},
    	{
    		unicode: "1F387",
    		emoji: "🎇",
    		description: "sparkler",
    		keywords: [
    			"sparkler"
    		]
    	},
    	{
    		unicode: "1F9E8",
    		emoji: "🧨",
    		description: "firecracker",
    		keywords: [
    			"firecracker"
    		]
    	},
    	{
    		unicode: "2728",
    		emoji: "✨",
    		description: "sparkles",
    		keywords: [
    			"sparkles"
    		]
    	},
    	{
    		unicode: "1F388",
    		emoji: "🎈",
    		description: "balloon",
    		keywords: [
    			"balloon"
    		]
    	},
    	{
    		unicode: "1F389",
    		emoji: "🎉",
    		description: "party popper",
    		keywords: [
    			"party popper",
    			"congratulations"
    		]
    	},
    	{
    		unicode: "1F38A",
    		emoji: "🎊",
    		description: "confetti ball",
    		keywords: [
    			"confetti ball"
    		]
    	},
    	{
    		unicode: "1F38B",
    		emoji: "🎋",
    		description: "tanabata tree",
    		keywords: [
    			"tanabata tree"
    		]
    	},
    	{
    		unicode: "1F38D",
    		emoji: "🎍",
    		description: "pine decoration",
    		keywords: [
    			"pine decoration"
    		]
    	},
    	{
    		unicode: "1F38E",
    		emoji: "🎎",
    		description: "Japanese dolls",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F38F",
    		emoji: "🎏",
    		description: "carp streamer",
    		keywords: [
    			"carp streamer"
    		]
    	},
    	{
    		unicode: "1F390",
    		emoji: "🎐",
    		description: "wind chime",
    		keywords: [
    			"wind chime"
    		]
    	},
    	{
    		unicode: "1F391",
    		emoji: "🎑",
    		description: "moon viewing ceremony",
    		keywords: [
    			"moon viewing ceremony"
    		]
    	},
    	{
    		unicode: "1F9E7",
    		emoji: "🧧",
    		description: "red envelope",
    		keywords: [
    			"red envelope"
    		]
    	},
    	{
    		unicode: "1F380",
    		emoji: "🎀",
    		description: "ribbon",
    		keywords: [
    			"ribbon"
    		]
    	},
    	{
    		unicode: "1F381",
    		emoji: "🎁",
    		description: "wrapped gift",
    		keywords: [
    			"wrapped gift"
    		]
    	},
    	{
    		unicode: "1F397 FE0F",
    		emoji: "🎗️",
    		description: "reminder ribbon",
    		keywords: [
    			"reminder ribbon"
    		]
    	},
    	{
    		unicode: "1F397",
    		emoji: "🎗",
    		description: "reminder ribbon",
    		keywords: [
    			"reminder ribbon"
    		]
    	},
    	{
    		unicode: "1F39F FE0F",
    		emoji: "🎟️",
    		description: "admission tickets",
    		keywords: [
    			"admission tickets"
    		]
    	},
    	{
    		unicode: "1F39F",
    		emoji: "🎟",
    		description: "admission tickets",
    		keywords: [
    			"admission tickets"
    		]
    	},
    	{
    		unicode: "1F3AB",
    		emoji: "🎫",
    		description: "ticket",
    		keywords: [
    			"ticket"
    		]
    	},
    	{
    		unicode: "1F396 FE0F",
    		emoji: "🎖️",
    		description: "military medal",
    		keywords: [
    			"military medal"
    		]
    	},
    	{
    		unicode: "1F3C6",
    		emoji: "🏆",
    		description: "trophy",
    		keywords: [
    			"trophy"
    		]
    	},
    	{
    		unicode: "1F3C5",
    		emoji: "🏅",
    		description: "sports medal",
    		keywords: [
    			"sports medal"
    		]
    	},
    	{
    		unicode: "1F947",
    		emoji: "🥇",
    		description: "1st place medal",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F948",
    		emoji: "🥈",
    		description: "2nd place medal",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F949",
    		emoji: "🥉",
    		description: "3rd place medal",
    		keywords: [
    		]
    	},
    	{
    		unicode: "26BD",
    		emoji: "⚽",
    		description: "soccer ball",
    		keywords: [
    			"soccer ball",
    			"soccer"
    		]
    	},
    	{
    		unicode: "26BE",
    		emoji: "⚾",
    		description: "baseball",
    		keywords: [
    			"baseball"
    		]
    	},
    	{
    		unicode: "1F94E",
    		emoji: "🥎",
    		description: "softball",
    		keywords: [
    			"softball"
    		]
    	},
    	{
    		unicode: "1F3C0",
    		emoji: "🏀",
    		description: "basketball",
    		keywords: [
    			"basketball"
    		]
    	},
    	{
    		unicode: "1F3D0",
    		emoji: "🏐",
    		description: "volleyball",
    		keywords: [
    			"volleyball"
    		]
    	},
    	{
    		unicode: "1F3C8",
    		emoji: "🏈",
    		description: "american football",
    		keywords: [
    			"american football"
    		]
    	},
    	{
    		unicode: "1F3C9",
    		emoji: "🏉",
    		description: "rugby football",
    		keywords: [
    			"rugby football"
    		]
    	},
    	{
    		unicode: "1F3BE",
    		emoji: "🎾",
    		description: "tennis",
    		keywords: [
    			"tennis"
    		]
    	},
    	{
    		unicode: "1F94F",
    		emoji: "🥏",
    		description: "flying disc",
    		keywords: [
    			"flying disc"
    		]
    	},
    	{
    		unicode: "1F3B3",
    		emoji: "🎳",
    		description: "bowling",
    		keywords: [
    			"bowling"
    		]
    	},
    	{
    		unicode: "1F3CF",
    		emoji: "🏏",
    		description: "cricket game",
    		keywords: [
    			"cricket game"
    		]
    	},
    	{
    		unicode: "1F3D1",
    		emoji: "🏑",
    		description: "field hockey",
    		keywords: [
    			"field hockey"
    		]
    	},
    	{
    		unicode: "1F3D2",
    		emoji: "🏒",
    		description: "ice hockey",
    		keywords: [
    			"ice hockey"
    		]
    	},
    	{
    		unicode: "1F94D",
    		emoji: "🥍",
    		description: "lacrosse",
    		keywords: [
    			"lacrosse"
    		]
    	},
    	{
    		unicode: "1F3D3",
    		emoji: "🏓",
    		description: "ping pong",
    		keywords: [
    			"ping pong"
    		]
    	},
    	{
    		unicode: "1F3F8",
    		emoji: "🏸",
    		description: "badminton",
    		keywords: [
    			"badminton"
    		]
    	},
    	{
    		unicode: "1F94A",
    		emoji: "🥊",
    		description: "boxing glove",
    		keywords: [
    			"boxing glove"
    		]
    	},
    	{
    		unicode: "1F94B",
    		emoji: "🥋",
    		description: "martial arts uniform",
    		keywords: [
    			"martial arts uniform"
    		]
    	},
    	{
    		unicode: "1F945",
    		emoji: "🥅",
    		description: "goal net",
    		keywords: [
    			"goal net"
    		]
    	},
    	{
    		unicode: "26F3",
    		emoji: "⛳",
    		description: "flag in hole",
    		keywords: [
    			"flag in hole"
    		]
    	},
    	{
    		unicode: "26F8 FE0F",
    		emoji: "⛸️",
    		description: "ice skate",
    		keywords: [
    			"ice skate"
    		]
    	},
    	{
    		unicode: "26F8",
    		emoji: "⛸",
    		description: "ice skate",
    		keywords: [
    			"ice skate"
    		]
    	},
    	{
    		unicode: "1F3A3",
    		emoji: "🎣",
    		description: "fishing pole",
    		keywords: [
    			"fishing pole"
    		]
    	},
    	{
    		unicode: "1F93F",
    		emoji: "🤿",
    		description: "diving mask",
    		keywords: [
    			"diving mask"
    		]
    	},
    	{
    		unicode: "1F3BD",
    		emoji: "🎽",
    		description: "running shirt",
    		keywords: [
    			"running shirt"
    		]
    	},
    	{
    		unicode: "1F3BF",
    		emoji: "🎿",
    		description: "skis",
    		keywords: [
    			"skis"
    		]
    	},
    	{
    		unicode: "1F6F7",
    		emoji: "🛷",
    		description: "sled",
    		keywords: [
    			"sled"
    		]
    	},
    	{
    		unicode: "1F94C",
    		emoji: "🥌",
    		description: "curling stone",
    		keywords: [
    			"curling stone"
    		]
    	},
    	{
    		unicode: "1F3AF",
    		emoji: "🎯",
    		description: "direct hit",
    		keywords: [
    			"direct hit"
    		]
    	},
    	{
    		unicode: "1FA80",
    		emoji: "🪀",
    		description: "yo-yo",
    		keywords: [
    			"yo-yo"
    		]
    	},
    	{
    		unicode: "1FA81",
    		emoji: "🪁",
    		description: "kite",
    		keywords: [
    			"kite"
    		]
    	},
    	{
    		unicode: "1F3B1",
    		emoji: "🎱",
    		description: "pool 8 ball",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F52E",
    		emoji: "🔮",
    		description: "crystal ball",
    		keywords: [
    			"crystal ball"
    		]
    	},
    	{
    		unicode: "1FA84",
    		emoji: "🪄",
    		description: "magic wand",
    		keywords: [
    			"magic wand"
    		]
    	},
    	{
    		unicode: "1F9FF",
    		emoji: "🧿",
    		description: "nazar amulet",
    		keywords: [
    			"nazar amulet"
    		]
    	},
    	{
    		unicode: "1F3AE",
    		emoji: "🎮",
    		description: "video game",
    		keywords: [
    			"video game"
    		]
    	},
    	{
    		unicode: "1F579 FE0F",
    		emoji: "🕹️",
    		description: "joystick",
    		keywords: [
    			"joystick"
    		]
    	},
    	{
    		unicode: "1F579",
    		emoji: "🕹",
    		description: "joystick",
    		keywords: [
    			"joystick"
    		]
    	},
    	{
    		unicode: "1F3B0",
    		emoji: "🎰",
    		description: "slot machine",
    		keywords: [
    			"slot machine"
    		]
    	},
    	{
    		unicode: "1F3B2",
    		emoji: "🎲",
    		description: "game die",
    		keywords: [
    			"game die"
    		]
    	},
    	{
    		unicode: "1F9E9",
    		emoji: "🧩",
    		description: "puzzle piece",
    		keywords: [
    			"puzzle piece"
    		]
    	},
    	{
    		unicode: "1F9F8",
    		emoji: "🧸",
    		description: "teddy bear",
    		keywords: [
    			"teddy bear"
    		]
    	},
    	{
    		unicode: "2660 FE0F",
    		emoji: "♠️",
    		description: "spade suit",
    		keywords: [
    			"spade suit"
    		]
    	},
    	{
    		unicode: "2660",
    		emoji: "♠",
    		description: "spade suit",
    		keywords: [
    			"spade suit"
    		]
    	},
    	{
    		unicode: "2665 FE0F",
    		emoji: "♥️",
    		description: "heart suit",
    		keywords: [
    			"heart suit"
    		]
    	},
    	{
    		unicode: "2665",
    		emoji: "♥",
    		description: "heart suit",
    		keywords: [
    			"heart suit"
    		]
    	},
    	{
    		unicode: "2666 FE0F",
    		emoji: "♦️",
    		description: "diamond suit",
    		keywords: [
    			"diamond suit"
    		]
    	},
    	{
    		unicode: "2666",
    		emoji: "♦",
    		description: "diamond suit",
    		keywords: [
    			"diamond suit"
    		]
    	},
    	{
    		unicode: "2663 FE0F",
    		emoji: "♣️",
    		description: "club suit",
    		keywords: [
    			"club suit"
    		]
    	},
    	{
    		unicode: "2663",
    		emoji: "♣",
    		description: "club suit",
    		keywords: [
    			"club suit"
    		]
    	},
    	{
    		unicode: "265F FE0F",
    		emoji: "♟️",
    		description: "chess pawn",
    		keywords: [
    			"chess pawn"
    		]
    	},
    	{
    		unicode: "265F",
    		emoji: "♟",
    		description: "chess pawn",
    		keywords: [
    			"chess pawn"
    		]
    	},
    	{
    		unicode: "1F0CF",
    		emoji: "🃏",
    		description: "joker",
    		keywords: [
    			"joker"
    		]
    	},
    	{
    		unicode: "1F004",
    		emoji: "🀄",
    		description: "mahjong red dragon",
    		keywords: [
    			"mahjong red dragon"
    		]
    	},
    	{
    		unicode: "1F3B4",
    		emoji: "🎴",
    		description: "flower playing cards",
    		keywords: [
    			"flower playing cards"
    		]
    	},
    	{
    		unicode: "1F3AD",
    		emoji: "🎭",
    		description: "performing arts",
    		keywords: [
    			"performing arts",
    			"theatre"
    		]
    	},
    	{
    		unicode: "1F5BC FE0F",
    		emoji: "🖼️",
    		description: "framed picture",
    		keywords: [
    			"framed picture"
    		]
    	},
    	{
    		unicode: "1F5BC",
    		emoji: "🖼",
    		description: "framed picture",
    		keywords: [
    			"framed picture"
    		]
    	},
    	{
    		unicode: "1F3A8",
    		emoji: "🎨",
    		description: "artist palette",
    		keywords: [
    			"artist palette"
    		]
    	},
    	{
    		unicode: "1F9F5",
    		emoji: "🧵",
    		description: "thread",
    		keywords: [
    			"thread"
    		]
    	},
    	{
    		unicode: "1FAA1",
    		emoji: "🪡",
    		description: "sewing needle",
    		keywords: [
    			"sewing needle"
    		]
    	},
    	{
    		unicode: "1F9F6",
    		emoji: "🧶",
    		description: "yarn",
    		keywords: [
    			"yarn"
    		]
    	},
    	{
    		unicode: "1F453",
    		emoji: "👓",
    		description: "glasses",
    		keywords: [
    			"glasses"
    		]
    	},
    	{
    		unicode: "1F576 FE0F",
    		emoji: "🕶️",
    		description: "sunglasses",
    		keywords: [
    			"sunglasses"
    		]
    	},
    	{
    		unicode: "1F97D",
    		emoji: "🥽",
    		description: "goggles",
    		keywords: [
    			"goggles"
    		]
    	},
    	{
    		unicode: "1F97C",
    		emoji: "🥼",
    		description: "lab coat",
    		keywords: [
    			"lab coat"
    		]
    	},
    	{
    		unicode: "1F9BA",
    		emoji: "🦺",
    		description: "safety vest",
    		keywords: [
    			"safety vest"
    		]
    	},
    	{
    		unicode: "1F454",
    		emoji: "👔",
    		description: "necktie",
    		keywords: [
    			"necktie"
    		]
    	},
    	{
    		unicode: "1F455",
    		emoji: "👕",
    		description: "t-shirt",
    		keywords: [
    			"t-shirt"
    		]
    	},
    	{
    		unicode: "1F456",
    		emoji: "👖",
    		description: "jeans",
    		keywords: [
    			"jeans"
    		]
    	},
    	{
    		unicode: "1F9E3",
    		emoji: "🧣",
    		description: "scarf",
    		keywords: [
    			"scarf"
    		]
    	},
    	{
    		unicode: "1F9E4",
    		emoji: "🧤",
    		description: "gloves",
    		keywords: [
    			"gloves"
    		]
    	},
    	{
    		unicode: "1F9E5",
    		emoji: "🧥",
    		description: "coat",
    		keywords: [
    			"coat"
    		]
    	},
    	{
    		unicode: "1F9E6",
    		emoji: "🧦",
    		description: "socks",
    		keywords: [
    			"socks"
    		]
    	},
    	{
    		unicode: "1F457",
    		emoji: "👗",
    		description: "dress",
    		keywords: [
    			"dress"
    		]
    	},
    	{
    		unicode: "1F458",
    		emoji: "👘",
    		description: "kimono",
    		keywords: [
    			"kimono"
    		]
    	},
    	{
    		unicode: "1F97B",
    		emoji: "🥻",
    		description: "sari",
    		keywords: [
    			"sari"
    		]
    	},
    	{
    		unicode: "1FA71",
    		emoji: "🩱",
    		description: "one-piece swimsuit",
    		keywords: [
    			"one-piece swimsuit"
    		]
    	},
    	{
    		unicode: "1FA72",
    		emoji: "🩲",
    		description: "briefs",
    		keywords: [
    			"briefs"
    		]
    	},
    	{
    		unicode: "1FA73",
    		emoji: "🩳",
    		description: "shorts",
    		keywords: [
    			"shorts"
    		]
    	},
    	{
    		unicode: "1F459",
    		emoji: "👙",
    		description: "bikini",
    		keywords: [
    			"bikini"
    		]
    	},
    	{
    		unicode: "1F45A",
    		emoji: "👚",
    		description: "woman’s clothes",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F45B",
    		emoji: "👛",
    		description: "purse",
    		keywords: [
    			"purse"
    		]
    	},
    	{
    		unicode: "1F45C",
    		emoji: "👜",
    		description: "handbag",
    		keywords: [
    			"handbag"
    		]
    	},
    	{
    		unicode: "1F45D",
    		emoji: "👝",
    		description: "clutch bag",
    		keywords: [
    			"clutch bag"
    		]
    	},
    	{
    		unicode: "1F6CD FE0F",
    		emoji: "🛍️",
    		description: "shopping bags",
    		keywords: [
    			"shopping bags"
    		]
    	},
    	{
    		unicode: "1F6CD",
    		emoji: "🛍",
    		description: "shopping bags",
    		keywords: [
    			"shopping bags"
    		]
    	},
    	{
    		unicode: "1F392",
    		emoji: "🎒",
    		description: "backpack",
    		keywords: [
    			"backpack"
    		]
    	},
    	{
    		unicode: "1F45E",
    		emoji: "👞",
    		description: "man’s shoe",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F45F",
    		emoji: "👟",
    		description: "running shoe",
    		keywords: [
    			"running shoe"
    		]
    	},
    	{
    		unicode: "1F97E",
    		emoji: "🥾",
    		description: "hiking boot",
    		keywords: [
    			"hiking boot"
    		]
    	},
    	{
    		unicode: "1F97F",
    		emoji: "🥿",
    		description: "flat shoe",
    		keywords: [
    			"flat shoe"
    		]
    	},
    	{
    		unicode: "1F460",
    		emoji: "👠",
    		description: "high-heeled shoe",
    		keywords: [
    			"high-heeled shoe"
    		]
    	},
    	{
    		unicode: "1F461",
    		emoji: "👡",
    		description: "woman’s sandal",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1FA70",
    		emoji: "🩰",
    		description: "ballet shoes",
    		keywords: [
    			"ballet shoes"
    		]
    	},
    	{
    		unicode: "1F462",
    		emoji: "👢",
    		description: "woman’s boot",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F451",
    		emoji: "👑",
    		description: "crown",
    		keywords: [
    			"crown"
    		]
    	},
    	{
    		unicode: "1F452",
    		emoji: "👒",
    		description: "woman’s hat",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F3A9",
    		emoji: "🎩",
    		description: "top hat",
    		keywords: [
    			"top hat"
    		]
    	},
    	{
    		unicode: "1F393",
    		emoji: "🎓",
    		description: "graduation cap",
    		keywords: [
    			"graduation cap"
    		]
    	},
    	{
    		unicode: "1F9E2",
    		emoji: "🧢",
    		description: "billed cap",
    		keywords: [
    			"billed cap"
    		]
    	},
    	{
    		unicode: "1FA96",
    		emoji: "🪖",
    		description: "military helmet",
    		keywords: [
    			"military helmet"
    		]
    	},
    	{
    		unicode: "26D1 FE0F",
    		emoji: "⛑️",
    		description: "rescue worker’s helmet",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F4FF",
    		emoji: "📿",
    		description: "prayer beads",
    		keywords: [
    			"prayer beads"
    		]
    	},
    	{
    		unicode: "1F484",
    		emoji: "💄",
    		description: "lipstick",
    		keywords: [
    			"lipstick"
    		]
    	},
    	{
    		unicode: "1F48D",
    		emoji: "💍",
    		description: "ring",
    		keywords: [
    			"ring"
    		]
    	},
    	{
    		unicode: "1F48E",
    		emoji: "💎",
    		description: "gem stone",
    		keywords: [
    			"gem stone"
    		]
    	},
    	{
    		unicode: "1F507",
    		emoji: "🔇",
    		description: "muted speaker",
    		keywords: [
    			"muted speaker"
    		]
    	},
    	{
    		unicode: "1F508",
    		emoji: "🔈",
    		description: "speaker low volume",
    		keywords: [
    			"speaker low volume"
    		]
    	},
    	{
    		unicode: "1F509",
    		emoji: "🔉",
    		description: "speaker medium volume",
    		keywords: [
    			"speaker medium volume"
    		]
    	},
    	{
    		unicode: "1F50A",
    		emoji: "🔊",
    		description: "speaker high volume",
    		keywords: [
    			"speaker high volume"
    		]
    	},
    	{
    		unicode: "1F4E2",
    		emoji: "📢",
    		description: "loudspeaker",
    		keywords: [
    			"loudspeaker"
    		]
    	},
    	{
    		unicode: "1F4E3",
    		emoji: "📣",
    		description: "megaphone",
    		keywords: [
    			"megaphone"
    		]
    	},
    	{
    		unicode: "1F4EF",
    		emoji: "📯",
    		description: "postal horn",
    		keywords: [
    			"postal horn"
    		]
    	},
    	{
    		unicode: "1F514",
    		emoji: "🔔",
    		description: "bell",
    		keywords: [
    			"bell"
    		]
    	},
    	{
    		unicode: "1F515",
    		emoji: "🔕",
    		description: "bell with slash",
    		keywords: [
    			"bell with slash"
    		]
    	},
    	{
    		unicode: "1F3BC",
    		emoji: "🎼",
    		description: "musical score",
    		keywords: [
    			"musical score"
    		]
    	},
    	{
    		unicode: "1F3B5",
    		emoji: "🎵",
    		description: "musical note",
    		keywords: [
    			"musical note"
    		]
    	},
    	{
    		unicode: "1F3B6",
    		emoji: "🎶",
    		description: "musical notes",
    		keywords: [
    			"musical notes"
    		]
    	},
    	{
    		unicode: "1F399 FE0F",
    		emoji: "🎙️",
    		description: "studio microphone",
    		keywords: [
    			"studio microphone"
    		]
    	},
    	{
    		unicode: "1F39A FE0F",
    		emoji: "🎚️",
    		description: "level slider",
    		keywords: [
    			"level slider"
    		]
    	},
    	{
    		unicode: "1F39B FE0F",
    		emoji: "🎛️",
    		description: "control knobs",
    		keywords: [
    			"control knobs"
    		]
    	},
    	{
    		unicode: "1F3A4",
    		emoji: "🎤",
    		description: "microphone",
    		keywords: [
    			"microphone"
    		]
    	},
    	{
    		unicode: "1F3A7",
    		emoji: "🎧",
    		description: "headphone",
    		keywords: [
    			"headphone"
    		]
    	},
    	{
    		unicode: "1F4FB",
    		emoji: "📻",
    		description: "radio",
    		keywords: [
    			"radio"
    		]
    	},
    	{
    		unicode: "1F3B7",
    		emoji: "🎷",
    		description: "saxophone",
    		keywords: [
    			"saxophone"
    		]
    	},
    	{
    		unicode: "1F3B8",
    		emoji: "🎸",
    		description: "guitar",
    		keywords: [
    			"guitar"
    		]
    	},
    	{
    		unicode: "1F3B9",
    		emoji: "🎹",
    		description: "musical keyboard",
    		keywords: [
    			"musical keyboard"
    		]
    	},
    	{
    		unicode: "1F3BA",
    		emoji: "🎺",
    		description: "trumpet",
    		keywords: [
    			"trumpet"
    		]
    	},
    	{
    		unicode: "1F3BB",
    		emoji: "🎻",
    		description: "violin",
    		keywords: [
    			"violin"
    		]
    	},
    	{
    		unicode: "1FA95",
    		emoji: "🪕",
    		description: "banjo",
    		keywords: [
    			"banjo"
    		]
    	},
    	{
    		unicode: "1F941",
    		emoji: "🥁",
    		description: "drum",
    		keywords: [
    			"drum"
    		]
    	},
    	{
    		unicode: "1F4F1",
    		emoji: "📱",
    		description: "mobile phone",
    		keywords: [
    			"mobile phone"
    		]
    	},
    	{
    		unicode: "1F4F2",
    		emoji: "📲",
    		description: "mobile phone with arrow",
    		keywords: [
    			"mobile phone with arrow"
    		]
    	},
    	{
    		unicode: "260E FE0F",
    		emoji: "☎️",
    		description: "telephone",
    		keywords: [
    			"telephone"
    		]
    	},
    	{
    		unicode: "260E",
    		emoji: "☎",
    		description: "telephone",
    		keywords: [
    			"telephone"
    		]
    	},
    	{
    		unicode: "1F4DE",
    		emoji: "📞",
    		description: "telephone receiver",
    		keywords: [
    			"telephone receiver"
    		]
    	},
    	{
    		unicode: "1F4DF",
    		emoji: "📟",
    		description: "pager",
    		keywords: [
    			"pager"
    		]
    	},
    	{
    		unicode: "1F4E0",
    		emoji: "📠",
    		description: "fax machine",
    		keywords: [
    			"fax machine"
    		]
    	},
    	{
    		unicode: "1F50B",
    		emoji: "🔋",
    		description: "battery",
    		keywords: [
    			"battery"
    		]
    	},
    	{
    		unicode: "1F50C",
    		emoji: "🔌",
    		description: "electric plug",
    		keywords: [
    			"electric plug"
    		]
    	},
    	{
    		unicode: "1F4BB",
    		emoji: "💻",
    		description: "laptop",
    		keywords: [
    			"laptop"
    		]
    	},
    	{
    		unicode: "1F5A5 FE0F",
    		emoji: "🖥️",
    		description: "desktop computer",
    		keywords: [
    			"desktop computer"
    		]
    	},
    	{
    		unicode: "1F5A5",
    		emoji: "🖥",
    		description: "desktop computer",
    		keywords: [
    			"desktop computer"
    		]
    	},
    	{
    		unicode: "1F5A8 FE0F",
    		emoji: "🖨️",
    		description: "printer",
    		keywords: [
    			"printer"
    		]
    	},
    	{
    		unicode: "1F5A8",
    		emoji: "🖨",
    		description: "printer",
    		keywords: [
    			"printer"
    		]
    	},
    	{
    		unicode: "2328 FE0F",
    		emoji: "⌨️",
    		description: "keyboard",
    		keywords: [
    			"keyboard"
    		]
    	},
    	{
    		unicode: "2328",
    		emoji: "⌨",
    		description: "keyboard",
    		keywords: [
    			"keyboard"
    		]
    	},
    	{
    		unicode: "1F5B1 FE0F",
    		emoji: "🖱️",
    		description: "computer mouse",
    		keywords: [
    			"computer mouse"
    		]
    	},
    	{
    		unicode: "1F5B1",
    		emoji: "🖱",
    		description: "computer mouse",
    		keywords: [
    			"computer mouse"
    		]
    	},
    	{
    		unicode: "1F5B2 FE0F",
    		emoji: "🖲️",
    		description: "trackball",
    		keywords: [
    			"trackball"
    		]
    	},
    	{
    		unicode: "1F5B2",
    		emoji: "🖲",
    		description: "trackball",
    		keywords: [
    			"trackball"
    		]
    	},
    	{
    		unicode: "1F4BD",
    		emoji: "💽",
    		description: "computer disk",
    		keywords: [
    			"computer disk"
    		]
    	},
    	{
    		unicode: "1F4BE",
    		emoji: "💾",
    		description: "floppy disk",
    		keywords: [
    			"floppy disk"
    		]
    	},
    	{
    		unicode: "1F4BF",
    		emoji: "💿",
    		description: "optical disk",
    		keywords: [
    			"optical disk"
    		]
    	},
    	{
    		unicode: "1F4C0",
    		emoji: "📀",
    		description: "dvd",
    		keywords: [
    			"dvd"
    		]
    	},
    	{
    		unicode: "1F9EE",
    		emoji: "🧮",
    		description: "abacus",
    		keywords: [
    			"abacus"
    		]
    	},
    	{
    		unicode: "1F3A5",
    		emoji: "🎥",
    		description: "movie camera",
    		keywords: [
    			"movie camera"
    		]
    	},
    	{
    		unicode: "1F39E FE0F",
    		emoji: "🎞️",
    		description: "film frames",
    		keywords: [
    			"film frames"
    		]
    	},
    	{
    		unicode: "1F39E",
    		emoji: "🎞",
    		description: "film frames",
    		keywords: [
    			"film frames"
    		]
    	},
    	{
    		unicode: "1F4FD FE0F",
    		emoji: "📽️",
    		description: "film projector",
    		keywords: [
    			"film projector"
    		]
    	},
    	{
    		unicode: "1F4FD",
    		emoji: "📽",
    		description: "film projector",
    		keywords: [
    			"film projector"
    		]
    	},
    	{
    		unicode: "1F3AC",
    		emoji: "🎬",
    		description: "clapper board",
    		keywords: [
    			"clapper board"
    		]
    	},
    	{
    		unicode: "1F4FA",
    		emoji: "📺",
    		description: "television",
    		keywords: [
    			"television"
    		]
    	},
    	{
    		unicode: "1F4F7",
    		emoji: "📷",
    		description: "camera",
    		keywords: [
    			"camera"
    		]
    	},
    	{
    		unicode: "1F4F8",
    		emoji: "📸",
    		description: "camera with flash",
    		keywords: [
    			"camera with flash"
    		]
    	},
    	{
    		unicode: "1F4F9",
    		emoji: "📹",
    		description: "video camera",
    		keywords: [
    			"video camera"
    		]
    	},
    	{
    		unicode: "1F4FC",
    		emoji: "📼",
    		description: "videocassette",
    		keywords: [
    			"videocassette"
    		]
    	},
    	{
    		unicode: "1F50D",
    		emoji: "🔍",
    		description: "magnifying glass tilted left",
    		keywords: [
    			"magnifying glass tilted left"
    		]
    	},
    	{
    		unicode: "1F50E",
    		emoji: "🔎",
    		description: "magnifying glass tilted right",
    		keywords: [
    			"magnifying glass tilted right"
    		]
    	},
    	{
    		unicode: "1F56F FE0F",
    		emoji: "🕯️",
    		description: "candle",
    		keywords: [
    			"candle"
    		]
    	},
    	{
    		unicode: "1F56F",
    		emoji: "🕯",
    		description: "candle",
    		keywords: [
    			"candle"
    		]
    	},
    	{
    		unicode: "1F4A1",
    		emoji: "💡",
    		description: "light bulb",
    		keywords: [
    			"light bulb"
    		]
    	},
    	{
    		unicode: "1F526",
    		emoji: "🔦",
    		description: "flashlight",
    		keywords: [
    			"flashlight"
    		]
    	},
    	{
    		unicode: "1F3EE",
    		emoji: "🏮",
    		description: "red paper lantern",
    		keywords: [
    			"red paper lantern"
    		]
    	},
    	{
    		unicode: "1FA94",
    		emoji: "🪔",
    		description: "diya lamp",
    		keywords: [
    			"diya lamp"
    		]
    	},
    	{
    		unicode: "1F4D4",
    		emoji: "📔",
    		description: "notebook with decorative cover",
    		keywords: [
    			"notebook with decorative cover"
    		]
    	},
    	{
    		unicode: "1F4D5",
    		emoji: "📕",
    		description: "closed book",
    		keywords: [
    			"closed book"
    		]
    	},
    	{
    		unicode: "1F4D6",
    		emoji: "📖",
    		description: "open book",
    		keywords: [
    			"open book"
    		]
    	},
    	{
    		unicode: "1F4D7",
    		emoji: "📗",
    		description: "green book",
    		keywords: [
    			"green book"
    		]
    	},
    	{
    		unicode: "1F4D8",
    		emoji: "📘",
    		description: "blue book",
    		keywords: [
    			"blue book"
    		]
    	},
    	{
    		unicode: "1F4D9",
    		emoji: "📙",
    		description: "orange book",
    		keywords: [
    			"orange book"
    		]
    	},
    	{
    		unicode: "1F4DA",
    		emoji: "📚",
    		description: "books",
    		keywords: [
    			"books"
    		]
    	},
    	{
    		unicode: "1F4D3",
    		emoji: "📓",
    		description: "notebook",
    		keywords: [
    			"notebook"
    		]
    	},
    	{
    		unicode: "1F4D2",
    		emoji: "📒",
    		description: "ledger",
    		keywords: [
    			"ledger"
    		]
    	},
    	{
    		unicode: "1F4C3",
    		emoji: "📃",
    		description: "page with curl",
    		keywords: [
    			"page with curl"
    		]
    	},
    	{
    		unicode: "1F4DC",
    		emoji: "📜",
    		description: "scroll",
    		keywords: [
    			"scroll"
    		]
    	},
    	{
    		unicode: "1F4C4",
    		emoji: "📄",
    		description: "page facing up",
    		keywords: [
    			"page facing up"
    		]
    	},
    	{
    		unicode: "1F4F0",
    		emoji: "📰",
    		description: "newspaper",
    		keywords: [
    			"newspaper"
    		]
    	},
    	{
    		unicode: "1F5DE FE0F",
    		emoji: "🗞️",
    		description: "rolled-up newspaper",
    		keywords: [
    			"rolled-up newspaper"
    		]
    	},
    	{
    		unicode: "1F5DE",
    		emoji: "🗞",
    		description: "rolled-up newspaper",
    		keywords: [
    			"rolled-up newspaper"
    		]
    	},
    	{
    		unicode: "1F4D1",
    		emoji: "📑",
    		description: "bookmark tabs",
    		keywords: [
    			"bookmark tabs"
    		]
    	},
    	{
    		unicode: "1F516",
    		emoji: "🔖",
    		description: "bookmark",
    		keywords: [
    			"bookmark"
    		]
    	},
    	{
    		unicode: "1F3F7 FE0F",
    		emoji: "🏷️",
    		description: "label",
    		keywords: [
    			"label"
    		]
    	},
    	{
    		unicode: "1F3F7",
    		emoji: "🏷",
    		description: "label",
    		keywords: [
    			"label"
    		]
    	},
    	{
    		unicode: "1F4B0",
    		emoji: "💰",
    		description: "money bag",
    		keywords: [
    			"money bag"
    		]
    	},
    	{
    		unicode: "1FA99",
    		emoji: "🪙",
    		description: "coin",
    		keywords: [
    			"coin"
    		]
    	},
    	{
    		unicode: "1F4B4",
    		emoji: "💴",
    		description: "yen banknote",
    		keywords: [
    			"yen banknote"
    		]
    	},
    	{
    		unicode: "1F4B5",
    		emoji: "💵",
    		description: "dollar banknote",
    		keywords: [
    			"dollar banknote"
    		]
    	},
    	{
    		unicode: "1F4B6",
    		emoji: "💶",
    		description: "euro banknote",
    		keywords: [
    			"euro banknote"
    		]
    	},
    	{
    		unicode: "1F4B7",
    		emoji: "💷",
    		description: "pound banknote",
    		keywords: [
    			"pound banknote"
    		]
    	},
    	{
    		unicode: "1F4B8",
    		emoji: "💸",
    		description: "money with wings",
    		keywords: [
    			"money with wings"
    		]
    	},
    	{
    		unicode: "1F4B3",
    		emoji: "💳",
    		description: "credit card",
    		keywords: [
    			"credit card"
    		]
    	},
    	{
    		unicode: "1F9FE",
    		emoji: "🧾",
    		description: "receipt",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F4B9",
    		emoji: "💹",
    		description: "chart increasing with yen",
    		keywords: [
    			"chart increasing with yen"
    		]
    	},
    	{
    		unicode: "2709 FE0F",
    		emoji: "✉️",
    		description: "envelope",
    		keywords: [
    			"envelope",
    			"envelopes"
    		]
    	},
    	{
    		unicode: "1F4E7",
    		emoji: "📧",
    		description: "e-mail",
    		keywords: [
    			"e-mail"
    		]
    	},
    	{
    		unicode: "1F4E8",
    		emoji: "📨",
    		description: "incoming envelope",
    		keywords: [
    			"incoming envelope"
    		]
    	},
    	{
    		unicode: "1F4E9",
    		emoji: "📩",
    		description: "envelope with arrow",
    		keywords: [
    			"envelope with arrow"
    		]
    	},
    	{
    		unicode: "1F4E4",
    		emoji: "📤",
    		description: "outbox tray",
    		keywords: [
    			"outbox tray"
    		]
    	},
    	{
    		unicode: "1F4E5",
    		emoji: "📥",
    		description: "inbox tray",
    		keywords: [
    			"inbox tray"
    		]
    	},
    	{
    		unicode: "1F4E6",
    		emoji: "📦",
    		description: "package",
    		keywords: [
    			"package",
    			"packages"
    		]
    	},
    	{
    		unicode: "1F4EB",
    		emoji: "📫",
    		description: "closed mailbox with raised flag",
    		keywords: [
    			"mailbox"
    		]
    	},
    	{
    		unicode: "1F4EA",
    		emoji: "📪",
    		description: "closed mailbox with lowered flag",
    		keywords: [
    			"closed mailbox with lowered flag"
    		]
    	},
    	{
    		unicode: "1F4EC",
    		emoji: "📬",
    		description: "open mailbox with raised flag",
    		keywords: [
    			"open mailbox with raised flag"
    		]
    	},
    	{
    		unicode: "1F4ED",
    		emoji: "📭",
    		description: "open mailbox with lowered flag",
    		keywords: [
    			"open mailbox with lowered flag"
    		]
    	},
    	{
    		unicode: "1F4EE",
    		emoji: "📮",
    		description: "postbox",
    		keywords: [
    			"postbox",
    			"postboxs"
    		]
    	},
    	{
    		unicode: "1F5F3 FE0F",
    		emoji: "🗳️",
    		description: "ballot box with ballot",
    		keywords: [
    			"ballot box with ballot"
    		]
    	},
    	{
    		unicode: "1F5F3",
    		emoji: "🗳",
    		description: "ballot box with ballot",
    		keywords: [
    			"ballot box with ballot"
    		]
    	},
    	{
    		unicode: "270F FE0F",
    		emoji: "✏️",
    		description: "pencil",
    		keywords: [
    			"pencil"
    		]
    	},
    	{
    		unicode: "270F",
    		emoji: "✏",
    		description: "pencil",
    		keywords: [
    			"pencil"
    		]
    	},
    	{
    		unicode: "2712 FE0F",
    		emoji: "✒️",
    		description: "black nib",
    		keywords: [
    			"black nib"
    		]
    	},
    	{
    		unicode: "2712",
    		emoji: "✒",
    		description: "black nib",
    		keywords: [
    			"black nib"
    		]
    	},
    	{
    		unicode: "1F58B FE0F",
    		emoji: "🖋️",
    		description: "fountain pen",
    		keywords: [
    			"fountain pen"
    		]
    	},
    	{
    		unicode: "1F58B",
    		emoji: "🖋",
    		description: "fountain pen",
    		keywords: [
    			"fountain pen"
    		]
    	},
    	{
    		unicode: "1F58A FE0F",
    		emoji: "🖊️",
    		description: "pen",
    		keywords: [
    			"pen"
    		]
    	},
    	{
    		unicode: "1F58A",
    		emoji: "🖊",
    		description: "pen",
    		keywords: [
    			"pen"
    		]
    	},
    	{
    		unicode: "1F58C FE0F",
    		emoji: "🖌️",
    		description: "paintbrush",
    		keywords: [
    			"paintbrush"
    		]
    	},
    	{
    		unicode: "1F58C",
    		emoji: "🖌",
    		description: "paintbrush",
    		keywords: [
    			"paintbrush"
    		]
    	},
    	{
    		unicode: "1F58D FE0F",
    		emoji: "🖍️",
    		description: "crayon",
    		keywords: [
    			"crayon"
    		]
    	},
    	{
    		unicode: "1F58D",
    		emoji: "🖍",
    		description: "crayon",
    		keywords: [
    			"crayon"
    		]
    	},
    	{
    		unicode: "1F4DD",
    		emoji: "📝",
    		description: "memo",
    		keywords: [
    			"memo"
    		]
    	},
    	{
    		unicode: "1F4BC",
    		emoji: "💼",
    		description: "briefcase",
    		keywords: [
    			"briefcase",
    			"briefcases"
    		]
    	},
    	{
    		unicode: "1F4C1",
    		emoji: "📁",
    		description: "file folder",
    		keywords: [
    			"file folder"
    		]
    	},
    	{
    		unicode: "1F4C2",
    		emoji: "📂",
    		description: "open file folder",
    		keywords: [
    			"open file folder"
    		]
    	},
    	{
    		unicode: "1F5C2 FE0F",
    		emoji: "🗂️",
    		description: "card index dividers",
    		keywords: [
    			"card index dividers"
    		]
    	},
    	{
    		unicode: "1F5C2",
    		emoji: "🗂",
    		description: "card index dividers",
    		keywords: [
    			"card index dividers"
    		]
    	},
    	{
    		unicode: "1F4C5",
    		emoji: "📅",
    		description: "calendar",
    		keywords: [
    			"calendar",
    			"calendars"
    		]
    	},
    	{
    		unicode: "1F4C6",
    		emoji: "📆",
    		description: "tear-off calendar",
    		keywords: [
    			"tear-off calendar"
    		]
    	},
    	{
    		unicode: "1F5D2 FE0F",
    		emoji: "🗒️",
    		description: "spiral notepad",
    		keywords: [
    			"spiral notepad"
    		]
    	},
    	{
    		unicode: "1F5D2",
    		emoji: "🗒",
    		description: "spiral notepad",
    		keywords: [
    			"spiral notepad"
    		]
    	},
    	{
    		unicode: "1F5D3 FE0F",
    		emoji: "🗓️",
    		description: "spiral calendar",
    		keywords: [
    			"spiral calendar"
    		]
    	},
    	{
    		unicode: "1F5D3",
    		emoji: "🗓",
    		description: "spiral calendar",
    		keywords: [
    			"spiral calendar"
    		]
    	},
    	{
    		unicode: "1F4C7",
    		emoji: "📇",
    		description: "card index",
    		keywords: [
    			"card index"
    		]
    	},
    	{
    		unicode: "1F4C8",
    		emoji: "📈",
    		description: "chart increasing",
    		keywords: [
    			"chart increasing"
    		]
    	},
    	{
    		unicode: "1F4C9",
    		emoji: "📉",
    		description: "chart decreasing",
    		keywords: [
    			"chart decreasing"
    		]
    	},
    	{
    		unicode: "1F4CA",
    		emoji: "📊",
    		description: "bar chart",
    		keywords: [
    			"bar chart"
    		]
    	},
    	{
    		unicode: "1F4CB",
    		emoji: "📋",
    		description: "clipboard",
    		keywords: [
    			"clipboard"
    		]
    	},
    	{
    		unicode: "1F4CC",
    		emoji: "📌",
    		description: "pushpin",
    		keywords: [
    			"pushpin"
    		]
    	},
    	{
    		unicode: "1F4CD",
    		emoji: "📍",
    		description: "round pushpin",
    		keywords: [
    			"round pushpin"
    		]
    	},
    	{
    		unicode: "1F4CE",
    		emoji: "📎",
    		description: "paperclip",
    		keywords: [
    			"paperclip"
    		]
    	},
    	{
    		unicode: "1F587 FE0F",
    		emoji: "🖇️",
    		description: "linked paperclips",
    		keywords: [
    			"linked paperclips"
    		]
    	},
    	{
    		unicode: "1F587",
    		emoji: "🖇",
    		description: "linked paperclips",
    		keywords: [
    			"linked paperclips"
    		]
    	},
    	{
    		unicode: "1F4CF",
    		emoji: "📏",
    		description: "straight ruler",
    		keywords: [
    			"straight ruler"
    		]
    	},
    	{
    		unicode: "1F4D0",
    		emoji: "📐",
    		description: "triangular ruler",
    		keywords: [
    			"triangular ruler"
    		]
    	},
    	{
    		unicode: "2702 FE0F",
    		emoji: "✂️",
    		description: "scissors",
    		keywords: [
    			"scissors"
    		]
    	},
    	{
    		unicode: "2702",
    		emoji: "✂",
    		description: "scissors",
    		keywords: [
    			"scissors"
    		]
    	},
    	{
    		unicode: "1F5C3 FE0F",
    		emoji: "🗃️",
    		description: "card file box",
    		keywords: [
    			"card file box"
    		]
    	},
    	{
    		unicode: "1F5C3",
    		emoji: "🗃",
    		description: "card file box",
    		keywords: [
    			"card file box"
    		]
    	},
    	{
    		unicode: "1F5C4",
    		emoji: "🗄",
    		description: "file cabinet",
    		keywords: [
    			"file cabinet"
    		]
    	},
    	{
    		unicode: "1F5D1",
    		emoji: "🗑",
    		description: "wastebasket",
    		keywords: [
    			"wastebasket"
    		]
    	},
    	{
    		unicode: "1F512",
    		emoji: "🔒",
    		description: "locked",
    		keywords: [
    			"locked"
    		]
    	},
    	{
    		unicode: "1F513",
    		emoji: "🔓",
    		description: "unlocked",
    		keywords: [
    			"unlocked"
    		]
    	},
    	{
    		unicode: "1F50F",
    		emoji: "🔏",
    		description: "locked with pen",
    		keywords: [
    			"locked with pen"
    		]
    	},
    	{
    		unicode: "1F510",
    		emoji: "🔐",
    		description: "locked with key",
    		keywords: [
    			"locked with key"
    		]
    	},
    	{
    		unicode: "1F511",
    		emoji: "🔑",
    		description: "key",
    		keywords: [
    			"key"
    		]
    	},
    	{
    		unicode: "1F5DD FE0F",
    		emoji: "🗝️",
    		description: "old key",
    		keywords: [
    			"old key"
    		]
    	},
    	{
    		unicode: "1F5DD",
    		emoji: "🗝",
    		description: "old key",
    		keywords: [
    			"old key"
    		]
    	},
    	{
    		unicode: "1F528",
    		emoji: "🔨",
    		description: "hammer",
    		keywords: [
    			"hammer"
    		]
    	},
    	{
    		unicode: "1FA93",
    		emoji: "🪓",
    		description: "axe",
    		keywords: [
    			"axe"
    		]
    	},
    	{
    		unicode: "26CF FE0F",
    		emoji: "⛏️",
    		description: "pick",
    		keywords: [
    			"pick"
    		]
    	},
    	{
    		unicode: "26CF",
    		emoji: "⛏",
    		description: "pick",
    		keywords: [
    			"pick"
    		]
    	},
    	{
    		unicode: "2692 FE0F",
    		emoji: "⚒️",
    		description: "hammer and pick",
    		keywords: [
    			"hammer and pick"
    		]
    	},
    	{
    		unicode: "1F6E0 FE0F",
    		emoji: "🛠️",
    		description: "hammer and wrench",
    		keywords: [
    			"hammer and wrench"
    		]
    	},
    	{
    		unicode: "1F5E1 FE0F",
    		emoji: "🗡️",
    		description: "dagger",
    		keywords: [
    			"dagger"
    		]
    	},
    	{
    		unicode: "1F5E1",
    		emoji: "🗡",
    		description: "dagger",
    		keywords: [
    			"dagger"
    		]
    	},
    	{
    		unicode: "2694 FE0F",
    		emoji: "⚔️",
    		description: "crossed swords",
    		keywords: [
    			"crossed swords"
    		]
    	},
    	{
    		unicode: "2694",
    		emoji: "⚔",
    		description: "crossed swords",
    		keywords: [
    			"crossed swords"
    		]
    	},
    	{
    		unicode: "1F52B",
    		emoji: "🔫",
    		description: "pistol",
    		keywords: [
    			"pistol"
    		]
    	},
    	{
    		unicode: "1FA83",
    		emoji: "🪃",
    		description: "boomerang",
    		keywords: [
    			"boomerang"
    		]
    	},
    	{
    		unicode: "1F3F9",
    		emoji: "🏹",
    		description: "bow and arrow",
    		keywords: [
    			"bow and arrow"
    		]
    	},
    	{
    		unicode: "1F6E1 FE0F",
    		emoji: "🛡️",
    		description: "shield",
    		keywords: [
    			"shield"
    		]
    	},
    	{
    		unicode: "1F6E1",
    		emoji: "🛡",
    		description: "shield",
    		keywords: [
    			"shield"
    		]
    	},
    	{
    		unicode: "1FA9A",
    		emoji: "🪚",
    		description: "carpentry saw",
    		keywords: [
    			"carpentry saw"
    		]
    	},
    	{
    		unicode: "1F527",
    		emoji: "🔧",
    		description: "wrench",
    		keywords: [
    			"wrench"
    		]
    	},
    	{
    		unicode: "1FA9B",
    		emoji: "🪛",
    		description: "screwdriver",
    		keywords: [
    			"screwdriver"
    		]
    	},
    	{
    		unicode: "1F529",
    		emoji: "🔩",
    		description: "nut and bolt",
    		keywords: [
    			"nut and bolt"
    		]
    	},
    	{
    		unicode: "2699 FE0F",
    		emoji: "⚙️",
    		description: "gear",
    		keywords: [
    			"gear"
    		]
    	},
    	{
    		unicode: "2699",
    		emoji: "⚙",
    		description: "gear",
    		keywords: [
    			"gear"
    		]
    	},
    	{
    		unicode: "1F5DC FE0F",
    		emoji: "🗜️",
    		description: "clamp",
    		keywords: [
    			"clamp"
    		]
    	},
    	{
    		unicode: "1F5DC",
    		emoji: "🗜",
    		description: "clamp",
    		keywords: [
    			"clamp"
    		]
    	},
    	{
    		unicode: "2696 FE0F",
    		emoji: "⚖️",
    		description: "balance scale",
    		keywords: [
    			"balance scale"
    		]
    	},
    	{
    		unicode: "2696",
    		emoji: "⚖",
    		description: "balance scale",
    		keywords: [
    			"balance scale"
    		]
    	},
    	{
    		unicode: "1F9AF",
    		emoji: "🦯",
    		description: "white cane",
    		keywords: [
    			"white cane"
    		]
    	},
    	{
    		unicode: "1F517",
    		emoji: "🔗",
    		description: "link",
    		keywords: [
    			"link"
    		]
    	},
    	{
    		unicode: "26D3 FE0F",
    		emoji: "⛓️",
    		description: "chains",
    		keywords: [
    			"chains"
    		]
    	},
    	{
    		unicode: "26D3",
    		emoji: "⛓",
    		description: "chains",
    		keywords: [
    			"chains"
    		]
    	},
    	{
    		unicode: "1FA9D",
    		emoji: "🪝",
    		description: "hook",
    		keywords: [
    			"hook"
    		]
    	},
    	{
    		unicode: "1F9F0",
    		emoji: "🧰",
    		description: "toolbox",
    		keywords: [
    			"toolbox"
    		]
    	},
    	{
    		unicode: "1F9F2",
    		emoji: "🧲",
    		description: "magnet",
    		keywords: [
    			"magnet"
    		]
    	},
    	{
    		unicode: "1FA9C",
    		emoji: "🪜",
    		description: "ladder",
    		keywords: [
    			"ladder"
    		]
    	},
    	{
    		unicode: "2697 FE0F",
    		emoji: "⚗️",
    		description: "alembic",
    		keywords: [
    			"alembic"
    		]
    	},
    	{
    		unicode: "2697",
    		emoji: "⚗",
    		description: "alembic",
    		keywords: [
    			"alembic"
    		]
    	},
    	{
    		unicode: "1F9EA",
    		emoji: "🧪",
    		description: "test tube",
    		keywords: [
    			"test tube"
    		]
    	},
    	{
    		unicode: "1F9EB",
    		emoji: "🧫",
    		description: "petri dish",
    		keywords: [
    			"petri dish"
    		]
    	},
    	{
    		unicode: "1F9EC",
    		emoji: "🧬",
    		description: "dna",
    		keywords: [
    			"dna"
    		]
    	},
    	{
    		unicode: "1F52C",
    		emoji: "🔬",
    		description: "microscope",
    		keywords: [
    			"microscope"
    		]
    	},
    	{
    		unicode: "1F52D",
    		emoji: "🔭",
    		description: "telescope",
    		keywords: [
    			"telescope"
    		]
    	},
    	{
    		unicode: "1F4E1",
    		emoji: "📡",
    		description: "satellite antenna",
    		keywords: [
    			"satellite antenna"
    		]
    	},
    	{
    		unicode: "1F489",
    		emoji: "💉",
    		description: "syringe",
    		keywords: [
    			"syringe"
    		]
    	},
    	{
    		unicode: "1FA78",
    		emoji: "🩸",
    		description: "drop of blood",
    		keywords: [
    			"drop of blood"
    		]
    	},
    	{
    		unicode: "1F48A",
    		emoji: "💊",
    		description: "pill",
    		keywords: [
    			"pill"
    		]
    	},
    	{
    		unicode: "1FA79",
    		emoji: "🩹",
    		description: "adhesive bandage",
    		keywords: [
    			"adhesive bandage"
    		]
    	},
    	{
    		unicode: "1FA7A",
    		emoji: "🩺",
    		description: "stethoscope",
    		keywords: [
    			"stethoscope"
    		]
    	},
    	{
    		unicode: "1F6AA",
    		emoji: "🚪",
    		description: "door",
    		keywords: [
    			"door"
    		]
    	},
    	{
    		unicode: "1F6D7",
    		emoji: "🛗",
    		description: "elevator",
    		keywords: [
    			"elevator"
    		]
    	},
    	{
    		unicode: "1FA9E",
    		emoji: "🪞",
    		description: "mirror",
    		keywords: [
    			"mirror"
    		]
    	},
    	{
    		unicode: "1FA9F",
    		emoji: "🪟",
    		description: "window",
    		keywords: [
    			"window"
    		]
    	},
    	{
    		unicode: "1F6CF FE0F",
    		emoji: "🛏️",
    		description: "bed",
    		keywords: [
    			"bed"
    		]
    	},
    	{
    		unicode: "1F6CF",
    		emoji: "🛏",
    		description: "bed",
    		keywords: [
    			"bed"
    		]
    	},
    	{
    		unicode: "1F6CB FE0F",
    		emoji: "🛋️",
    		description: "couch and lamp",
    		keywords: [
    			"couch and lamp",
    			"couch & lamp"
    		]
    	},
    	{
    		unicode: "1F6CB",
    		emoji: "🛋",
    		description: "couch and lamp",
    		keywords: [
    			"couch and lamp"
    		]
    	},
    	{
    		unicode: "1FA91",
    		emoji: "🪑",
    		description: "chair",
    		keywords: [
    			"chair"
    		]
    	},
    	{
    		unicode: "1F6BD",
    		emoji: "🚽",
    		description: "toilet",
    		keywords: [
    			"toilet"
    		]
    	},
    	{
    		unicode: "1FAA0",
    		emoji: "🪠",
    		description: "plunger",
    		keywords: [
    			"plunger"
    		]
    	},
    	{
    		unicode: "1F6BF",
    		emoji: "🚿",
    		description: "shower",
    		keywords: [
    			"shower"
    		]
    	},
    	{
    		unicode: "1F6C1",
    		emoji: "🛁",
    		description: "bathtub",
    		keywords: [
    			"bathtub"
    		]
    	},
    	{
    		unicode: "1FAA4",
    		emoji: "🪤",
    		description: "mouse trap",
    		keywords: [
    			"mouse trap"
    		]
    	},
    	{
    		unicode: "1FA92",
    		emoji: "🪒",
    		description: "razor",
    		keywords: [
    			"razor"
    		]
    	},
    	{
    		unicode: "1F9F4",
    		emoji: "🧴",
    		description: "lotion bottle",
    		keywords: [
    			"lotion bottle"
    		]
    	},
    	{
    		unicode: "1F9F7",
    		emoji: "🧷",
    		description: "safety pin",
    		keywords: [
    			"safety pin"
    		]
    	},
    	{
    		unicode: "1F9F9",
    		emoji: "🧹",
    		description: "broom",
    		keywords: [
    			"broom"
    		]
    	},
    	{
    		unicode: "1F9FA",
    		emoji: "🧺",
    		description: "basket",
    		keywords: [
    			"basket"
    		]
    	},
    	{
    		unicode: "1F9FB",
    		emoji: "🧻",
    		description: "roll of paper",
    		keywords: [
    			"roll of paper"
    		]
    	},
    	{
    		unicode: "1FAA3",
    		emoji: "🪣",
    		description: "bucket",
    		keywords: [
    			"bucket"
    		]
    	},
    	{
    		unicode: "1F9FC",
    		emoji: "🧼",
    		description: "soap",
    		keywords: [
    			"soap"
    		]
    	},
    	{
    		unicode: "1FAA5",
    		emoji: "🪥",
    		description: "toothbrush",
    		keywords: [
    			"toothbrush"
    		]
    	},
    	{
    		unicode: "1F9FD",
    		emoji: "🧽",
    		description: "sponge",
    		keywords: [
    			"sponge"
    		]
    	},
    	{
    		unicode: "1F9EF",
    		emoji: "🧯",
    		description: "fire extinguisher",
    		keywords: [
    			"fire extinguisher"
    		]
    	},
    	{
    		unicode: "1F6D2",
    		emoji: "🛒",
    		description: "shopping cart",
    		keywords: [
    			"shopping cart"
    		]
    	},
    	{
    		unicode: "1F6AC",
    		emoji: "🚬",
    		description: "cigarette",
    		keywords: [
    			"cigarette"
    		]
    	},
    	{
    		unicode: "26B0 FE0F",
    		emoji: "⚰️",
    		description: "coffin",
    		keywords: [
    			"coffin"
    		]
    	},
    	{
    		unicode: "26B0",
    		emoji: "⚰",
    		description: "coffin",
    		keywords: [
    			"coffin"
    		]
    	},
    	{
    		unicode: "1FAA6",
    		emoji: "🪦",
    		description: "headstone",
    		keywords: [
    			"headstone"
    		]
    	},
    	{
    		unicode: "26B1 FE0F",
    		emoji: "⚱️",
    		description: "funeral urn",
    		keywords: [
    			"funeral urn"
    		]
    	},
    	{
    		unicode: "26B1",
    		emoji: "⚱",
    		description: "funeral urn",
    		keywords: [
    			"funeral urn"
    		]
    	},
    	{
    		unicode: "1F5FF",
    		emoji: "🗿",
    		description: "moai",
    		keywords: [
    			"moai"
    		]
    	},
    	{
    		unicode: "1FAA7",
    		emoji: "🪧",
    		description: "placard",
    		keywords: [
    			"placard"
    		]
    	},
    	{
    		unicode: "1F3E7",
    		emoji: "🏧",
    		description: "ATM sign",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6AE",
    		emoji: "🚮",
    		description: "litter in bin sign",
    		keywords: [
    			"litter in bin sign"
    		]
    	},
    	{
    		unicode: "1F6B0",
    		emoji: "🚰",
    		description: "potable water",
    		keywords: [
    			"potable water"
    		]
    	},
    	{
    		unicode: "267F",
    		emoji: "♿",
    		description: "wheelchair symbol",
    		keywords: [
    			"wheelchair symbol"
    		]
    	},
    	{
    		unicode: "1F6B9",
    		emoji: "🚹",
    		description: "men’s room",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6BA",
    		emoji: "🚺",
    		description: "women’s room",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6BB",
    		emoji: "🚻",
    		description: "restroom",
    		keywords: [
    			"restroom"
    		]
    	},
    	{
    		unicode: "1F6BC",
    		emoji: "🚼",
    		description: "baby symbol",
    		keywords: [
    			"baby symbol"
    		]
    	},
    	{
    		unicode: "1F6BE",
    		emoji: "🚾",
    		description: "water closet",
    		keywords: [
    			"water closet"
    		]
    	},
    	{
    		unicode: "1F6C2",
    		emoji: "🛂",
    		description: "passport control",
    		keywords: [
    			"passport control"
    		]
    	},
    	{
    		unicode: "1F6C3",
    		emoji: "🛃",
    		description: "customs",
    		keywords: [
    			"customs"
    		]
    	},
    	{
    		unicode: "1F6C4",
    		emoji: "🛄",
    		description: "baggage claim",
    		keywords: [
    			"baggage claim"
    		]
    	},
    	{
    		unicode: "1F6C5",
    		emoji: "🛅",
    		description: "left luggage",
    		keywords: [
    			"left luggage"
    		]
    	},
    	{
    		unicode: "26A0 FE0F",
    		emoji: "⚠️",
    		description: "warning",
    		keywords: [
    			"warning"
    		]
    	},
    	{
    		unicode: "26A0",
    		emoji: "⚠",
    		description: "warning",
    		keywords: [
    			"warning"
    		]
    	},
    	{
    		unicode: "1F6B8",
    		emoji: "🚸",
    		description: "children crossing",
    		keywords: [
    			"children crossing"
    		]
    	},
    	{
    		unicode: "26D4",
    		emoji: "⛔",
    		description: "no entry",
    		keywords: [
    			"no entry"
    		]
    	},
    	{
    		unicode: "1F6AB",
    		emoji: "🚫",
    		description: "prohibited",
    		keywords: [
    			"prohibited"
    		]
    	},
    	{
    		unicode: "1F6B3",
    		emoji: "🚳",
    		description: "no bicycles",
    		keywords: [
    			"no bicycles"
    		]
    	},
    	{
    		unicode: "1F6AD",
    		emoji: "🚭",
    		description: "no smoking",
    		keywords: [
    			"no smoking"
    		]
    	},
    	{
    		unicode: "1F6AF",
    		emoji: "🚯",
    		description: "no littering",
    		keywords: [
    			"no littering"
    		]
    	},
    	{
    		unicode: "1F6B1",
    		emoji: "🚱",
    		description: "non-potable water",
    		keywords: [
    			"non-potable water"
    		]
    	},
    	{
    		unicode: "1F6B7",
    		emoji: "🚷",
    		description: "no pedestrians",
    		keywords: [
    			"no pedestrians"
    		]
    	},
    	{
    		unicode: "1F4F5",
    		emoji: "📵",
    		description: "no mobile phones",
    		keywords: [
    			"no mobile phones"
    		]
    	},
    	{
    		unicode: "1F51E",
    		emoji: "🔞",
    		description: "no one under eighteen",
    		keywords: [
    			"no one under eighteen"
    		]
    	},
    	{
    		unicode: "2622 FE0F",
    		emoji: "☢️",
    		description: "radioactive",
    		keywords: [
    			"radioactive"
    		]
    	},
    	{
    		unicode: "2622",
    		emoji: "☢",
    		description: "radioactive",
    		keywords: [
    			"radioactive"
    		]
    	},
    	{
    		unicode: "2623 FE0F",
    		emoji: "☣️",
    		description: "biohazard",
    		keywords: [
    			"biohazard"
    		]
    	},
    	{
    		unicode: "2623",
    		emoji: "☣",
    		description: "biohazard",
    		keywords: [
    			"biohazard"
    		]
    	},
    	{
    		unicode: "2B06 FE0F",
    		emoji: "⬆️",
    		description: "up arrow",
    		keywords: [
    			"up arrow"
    		]
    	},
    	{
    		unicode: "2B06",
    		emoji: "⬆",
    		description: "up arrow",
    		keywords: [
    			"up arrow"
    		]
    	},
    	{
    		unicode: "2197 FE0F",
    		emoji: "↗️",
    		description: "up-right arrow",
    		keywords: [
    			"up-right arrow"
    		]
    	},
    	{
    		unicode: "2197",
    		emoji: "↗",
    		description: "up-right arrow",
    		keywords: [
    			"up-right arrow"
    		]
    	},
    	{
    		unicode: "27A1 FE0F",
    		emoji: "➡️",
    		description: "right arrow",
    		keywords: [
    			"right arrow"
    		]
    	},
    	{
    		unicode: "27A1",
    		emoji: "➡",
    		description: "right arrow",
    		keywords: [
    			"right arrow"
    		]
    	},
    	{
    		unicode: "2198 FE0F",
    		emoji: "↘️",
    		description: "down-right arrow",
    		keywords: [
    			"down-right arrow"
    		]
    	},
    	{
    		unicode: "2198",
    		emoji: "↘",
    		description: "down-right arrow",
    		keywords: [
    			"down-right arrow"
    		]
    	},
    	{
    		unicode: "2B07 FE0F",
    		emoji: "⬇️",
    		description: "down arrow",
    		keywords: [
    			"down arrow"
    		]
    	},
    	{
    		unicode: "2B07",
    		emoji: "⬇",
    		description: "down arrow",
    		keywords: [
    			"down arrow"
    		]
    	},
    	{
    		unicode: "2199 FE0F",
    		emoji: "↙️",
    		description: "down-left arrow",
    		keywords: [
    			"down-left arrow"
    		]
    	},
    	{
    		unicode: "2199",
    		emoji: "↙",
    		description: "down-left arrow",
    		keywords: [
    			"down-left arrow"
    		]
    	},
    	{
    		unicode: "2B05 FE0F",
    		emoji: "⬅️",
    		description: "left arrow",
    		keywords: [
    			"left arrow"
    		]
    	},
    	{
    		unicode: "2B05",
    		emoji: "⬅",
    		description: "left arrow",
    		keywords: [
    			"left arrow"
    		]
    	},
    	{
    		unicode: "2196 FE0F",
    		emoji: "↖️",
    		description: "up-left arrow",
    		keywords: [
    			"up-left arrow"
    		]
    	},
    	{
    		unicode: "2196",
    		emoji: "↖",
    		description: "up-left arrow",
    		keywords: [
    			"up-left arrow"
    		]
    	},
    	{
    		unicode: "2195 FE0F",
    		emoji: "↕️",
    		description: "up-down arrow",
    		keywords: [
    			"up-down arrow"
    		]
    	},
    	{
    		unicode: "2195",
    		emoji: "↕",
    		description: "up-down arrow",
    		keywords: [
    			"up-down arrow"
    		]
    	},
    	{
    		unicode: "2194 FE0F",
    		emoji: "↔️",
    		description: "left-right arrow",
    		keywords: [
    			"left-right arrow"
    		]
    	},
    	{
    		unicode: "2194",
    		emoji: "↔",
    		description: "left-right arrow",
    		keywords: [
    			"left-right arrow"
    		]
    	},
    	{
    		unicode: "21A9 FE0F",
    		emoji: "↩️",
    		description: "right arrow curving left",
    		keywords: [
    			"right arrow curving left"
    		]
    	},
    	{
    		unicode: "21A9",
    		emoji: "↩",
    		description: "right arrow curving left",
    		keywords: [
    			"right arrow curving left"
    		]
    	},
    	{
    		unicode: "21AA FE0F",
    		emoji: "↪️",
    		description: "left arrow curving right",
    		keywords: [
    			"left arrow curving right"
    		]
    	},
    	{
    		unicode: "21AA",
    		emoji: "↪",
    		description: "left arrow curving right",
    		keywords: [
    			"left arrow curving right"
    		]
    	},
    	{
    		unicode: "2934 FE0F",
    		emoji: "⤴️",
    		description: "right arrow curving up",
    		keywords: [
    			"right arrow curving up"
    		]
    	},
    	{
    		unicode: "2934",
    		emoji: "⤴",
    		description: "right arrow curving up",
    		keywords: [
    			"right arrow curving up"
    		]
    	},
    	{
    		unicode: "2935 FE0F",
    		emoji: "⤵️",
    		description: "right arrow curving down",
    		keywords: [
    			"right arrow curving down"
    		]
    	},
    	{
    		unicode: "2935",
    		emoji: "⤵",
    		description: "right arrow curving down",
    		keywords: [
    			"right arrow curving down"
    		]
    	},
    	{
    		unicode: "1F503",
    		emoji: "🔃",
    		description: "clockwise vertical arrows",
    		keywords: [
    			"clockwise vertical arrows"
    		]
    	},
    	{
    		unicode: "1F504",
    		emoji: "🔄",
    		description: "counterclockwise arrows button",
    		keywords: [
    			"counterclockwise arrows button"
    		]
    	},
    	{
    		unicode: "1F51A",
    		emoji: "🔚",
    		description: "END arrow",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F51B",
    		emoji: "🔛",
    		description: "ON",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F51C",
    		emoji: "🔜",
    		description: "",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F51D",
    		emoji: "🔝",
    		description: "TOP arrow",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F6D0",
    		emoji: "🛐",
    		description: "place of worship",
    		keywords: [
    			"place of worship"
    		]
    	},
    	{
    		unicode: "269B FE0F",
    		emoji: "⚛️",
    		description: "atom symbol",
    		keywords: [
    			"atom symbol"
    		]
    	},
    	{
    		unicode: "269B",
    		emoji: "⚛",
    		description: "atom symbol",
    		keywords: [
    			"atom symbol"
    		]
    	},
    	{
    		unicode: "1F549 FE0F",
    		emoji: "🕉️",
    		description: "om",
    		keywords: [
    			"om"
    		]
    	},
    	{
    		unicode: "1F549",
    		emoji: "🕉",
    		description: "om",
    		keywords: [
    			"om"
    		]
    	},
    	{
    		unicode: "2721 FE0F",
    		emoji: "✡️",
    		description: "star of David",
    		keywords: [
    		]
    	},
    	{
    		unicode: "2721",
    		emoji: "✡",
    		description: "star of David",
    		keywords: [
    		]
    	},
    	{
    		unicode: "2638 FE0F",
    		emoji: "☸️",
    		description: "wheel of dharma",
    		keywords: [
    			"wheel of dharma"
    		]
    	},
    	{
    		unicode: "2638",
    		emoji: "☸",
    		description: "wheel of dharma",
    		keywords: [
    			"wheel of dharma"
    		]
    	},
    	{
    		unicode: "262F FE0F",
    		emoji: "☯️",
    		description: "yin yang",
    		keywords: [
    			"yin yang"
    		]
    	},
    	{
    		unicode: "262F",
    		emoji: "☯",
    		description: "yin yang",
    		keywords: [
    			"yin yang"
    		]
    	},
    	{
    		unicode: "271D FE0F",
    		emoji: "✝️",
    		description: "latin cross",
    		keywords: [
    			"latin cross"
    		]
    	},
    	{
    		unicode: "271D",
    		emoji: "✝",
    		description: "latin cross",
    		keywords: [
    			"latin cross"
    		]
    	},
    	{
    		unicode: "2626 FE0F",
    		emoji: "☦️",
    		description: "orthodox cross",
    		keywords: [
    			"orthodox cross"
    		]
    	},
    	{
    		unicode: "2626",
    		emoji: "☦",
    		description: "orthodox cross",
    		keywords: [
    			"orthodox cross"
    		]
    	},
    	{
    		unicode: "262A FE0F",
    		emoji: "☪️",
    		description: "star and crescent",
    		keywords: [
    			"star and crescent"
    		]
    	},
    	{
    		unicode: "262A",
    		emoji: "☪",
    		description: "star and crescent",
    		keywords: [
    			"star and crescent"
    		]
    	},
    	{
    		unicode: "262E FE0F",
    		emoji: "☮️",
    		description: "peace symbol",
    		keywords: [
    			"peace symbol"
    		]
    	},
    	{
    		unicode: "262E",
    		emoji: "☮",
    		description: "peace symbol",
    		keywords: [
    			"peace symbol"
    		]
    	},
    	{
    		unicode: "1F54E",
    		emoji: "🕎",
    		description: "menorah",
    		keywords: [
    			"menorah"
    		]
    	},
    	{
    		unicode: "1F52F",
    		emoji: "🔯",
    		description: "dotted six-pointed star",
    		keywords: [
    			"dotted six-pointed star"
    		]
    	},
    	{
    		unicode: "2648",
    		emoji: "♈",
    		description: "Aries",
    		keywords: [
    		]
    	},
    	{
    		unicode: "2649",
    		emoji: "♉",
    		description: "Taurus",
    		keywords: [
    		]
    	},
    	{
    		unicode: "264A",
    		emoji: "♊",
    		description: "Gemini",
    		keywords: [
    		]
    	},
    	{
    		unicode: "264B",
    		emoji: "♋",
    		description: "Cancer",
    		keywords: [
    		]
    	},
    	{
    		unicode: "264C",
    		emoji: "♌",
    		description: "Leo",
    		keywords: [
    		]
    	},
    	{
    		unicode: "264D",
    		emoji: "♍",
    		description: "Virgo",
    		keywords: [
    		]
    	},
    	{
    		unicode: "264E",
    		emoji: "♎",
    		description: "Libra",
    		keywords: [
    		]
    	},
    	{
    		unicode: "264F",
    		emoji: "♏",
    		description: "Scorpio",
    		keywords: [
    		]
    	},
    	{
    		unicode: "2650",
    		emoji: "♐",
    		description: "Sagittarius",
    		keywords: [
    		]
    	},
    	{
    		unicode: "2651",
    		emoji: "♑",
    		description: "Capricorn",
    		keywords: [
    		]
    	},
    	{
    		unicode: "2652",
    		emoji: "♒",
    		description: "Aquarius",
    		keywords: [
    		]
    	},
    	{
    		unicode: "2653",
    		emoji: "♓",
    		description: "Pisces",
    		keywords: [
    		]
    	},
    	{
    		unicode: "26CE",
    		emoji: "⛎",
    		description: "Ophiuchus",
    		keywords: [
    		]
    	},
    	{
    		unicode: "1F500",
    		emoji: "🔀",
    		description: "shuffle tracks button",
    		keywords: [
    			"shuffle tracks button"
    		]
    	},
    	{
    		unicode: "1F501",
    		emoji: "🔁",
    		description: "repeat button",
    		keywords: [
    			"repeat button"
    		]
    	},
    	{
    		unicode: "1F502",
    		emoji: "🔂",
    		description: "repeat single button",
    		keywords: [
    			"repeat single button"
    		]
    	},
    	{
    		unicode: "25B6 FE0F",
    		emoji: "▶️",
    		description: "play button",
    		keywords: [
    			"play button"
    		]
    	},
    	{
    		unicode: "25B6",
    		emoji: "▶",
    		description: "play button",
    		keywords: [
    			"play button"
    		]
    	},
    	{
    		unicode: "23E9",
    		emoji: "⏩",
    		description: "fast-forward button",
    		keywords: [
    			"fast-forward button"
    		]
    	},
    	{
    		unicode: "23ED FE0F",
    		emoji: "⏭️",
    		description: "next track button",
    		keywords: [
    			"next track button"
    		]
    	},
    	{
    		unicode: "23ED",
    		emoji: "⏭",
    		description: "next track button",
    		keywords: [
    			"next track button"
    		]
    	},
    	{
    		unicode: "23EF FE0F",
    		emoji: "⏯️",
    		description: "play or pause button",
    		keywords: [
    			"play or pause button"
    		]
    	},
    	{
    		unicode: "23EF",
    		emoji: "⏯",
    		description: "play or pause button",
    		keywords: [
    			"play or pause button"
    		]
    	},
    	{
    		unicode: "25C0 FE0F",
    		emoji: "◀️",
    		description: "reverse button",
    		keywords: [
    			"reverse button"
    		]
    	},
    	{
    		unicode: "25C0",
    		emoji: "◀",
    		description: "reverse button",
    		keywords: [
    			"reverse button"
    		]
    	},
    	{
    		unicode: "23EA",
    		emoji: "⏪",
    		description: "fast reverse button",
    		keywords: [
    			"fast reverse button"
    		]
    	},
    	{
    		unicode: "23EE FE0F",
    		emoji: "⏮️",
    		description: "last track button",
    		keywords: [
    			"last track button"
    		]
    	},
    	{
    		unicode: "23EE",
    		emoji: "⏮",
    		description: "last track button",
    		keywords: [
    			"last track button"
    		]
    	},
    	{
    		unicode: "1F53C",
    		emoji: "🔼",
    		description: "upwards button",
    		keywords: [
    			"upwards button"
    		]
    	},
    	{
    		unicode: "23EB",
    		emoji: "⏫",
    		description: "fast up button",
    		keywords: [
    			"fast up button"
    		]
    	},
    	{
    		unicode: "1F53D",
    		emoji: "🔽",
    		description: "downwards button",
    		keywords: [
    			"downwards button"
    		]
    	},
    	{
    		unicode: "23EC",
    		emoji: "⏬",
    		description: "fast down button",
    		keywords: [
    			"fast down button"
    		]
    	},
    	{
    		unicode: "23F8 FE0F",
    		emoji: "⏸️",
    		description: "pause button",
    		keywords: [
    			"pause button"
    		]
    	},
    	{
    		unicode: "23F8",
    		emoji: "⏸",
    		description: "pause button",
    		keywords: [
    			"pause button"
    		]
    	},
    	{
    		unicode: "23F9 FE0F",
    		emoji: "⏹️",
    		description: "stop button",
    		keywords: [
    			"stop button"
    		]
    	},
    	{
    		unicode: "23F9",
    		emoji: "⏹",
    		description: "stop button",
    		keywords: [
    			"stop button"
    		]
    	},
    	{
    		unicode: "23FA FE0F",
    		emoji: "⏺️",
    		description: "record button",
    		keywords: [
    			"record button"
    		]
    	},
    	{
    		unicode: "23FA",
    		emoji: "⏺",
    		description: "record button",
    		keywords: [
    			"record button"
    		]
    	},
    	{
    		unicode: "23CF FE0F",
    		emoji: "⏏️",
    		description: "eject button",
    		keywords: [
    			"eject button"
    		]
    	},
    	{
    		unicode: "23CF",
    		emoji: "⏏",
    		description: "eject button",
    		keywords: [
    			"eject button"
    		]
    	},
    	{
    		unicode: "1F3A6",
    		emoji: "🎦",
    		description: "cinema",
    		keywords: [
    			"cinema"
    		]
    	},
    	{
    		unicode: "1F505",
    		emoji: "🔅",
    		description: "dim button",
    		keywords: [
    			"dim button"
    		]
    	},
    	{
    		unicode: "1F506",
    		emoji: "🔆",
    		description: "bright button",
    		keywords: [
    			"bright button"
    		]
    	},
    	{
    		unicode: "1F4F6",
    		emoji: "📶",
    		description: "antenna bars",
    		keywords: [
    			"antenna bars"
    		]
    	},
    	{
    		unicode: "1F4F3",
    		emoji: "📳",
    		description: "vibration mode",
    		keywords: [
    			"vibration mode"
    		]
    	},
    	{
    		unicode: "1F4F4",
    		emoji: "📴",
    		description: "mobile phone off",
    		keywords: [
    			"mobile phone off"
    		]
    	},
    	{
    		unicode: "2640 FE0F",
    		emoji: "♀️",
    		description: "female sign",
    		keywords: [
    			"female sign"
    		]
    	},
    	{
    		unicode: "2640",
    		emoji: "♀",
    		description: "female sign",
    		keywords: [
    			"female sign"
    		]
    	},
    	{
    		unicode: "2642 FE0F",
    		emoji: "♂️",
    		description: "male sign",
    		keywords: [
    			"male sign"
    		]
    	},
    	{
    		unicode: "2642",
    		emoji: "♂",
    		description: "male sign",
    		keywords: [
    			"male sign"
    		]
    	},
    	{
    		unicode: "26A7 FE0F",
    		emoji: "⚧️",
    		description: "transgender symbol",
    		keywords: [
    			"transgender symbol"
    		]
    	},
    	{
    		unicode: "26A7",
    		emoji: "⚧",
    		description: "transgender symbol",
    		keywords: [
    			"transgender symbol"
    		]
    	},
    	{
    		unicode: "2716 FE0F",
    		emoji: "✖️",
    		description: "multiply",
    		keywords: [
    			"multiply"
    		]
    	},
    	{
    		unicode: "2716",
    		emoji: "✖",
    		description: "multiply",
    		keywords: [
    			"multiply"
    		]
    	},
    	{
    		unicode: "2795",
    		emoji: "➕",
    		description: "plus",
    		keywords: [
    			"plus"
    		]
    	},
    	{
    		unicode: "2796",
    		emoji: "➖",
    		description: "minus",
    		keywords: [
    			"minus"
    		]
    	},
    	{
    		unicode: "2797",
    		emoji: "➗",
    		description: "divide",
    		keywords: [
    			"divide"
    		]
    	},
    	{
    		unicode: "267E FE0F",
    		emoji: "♾️",
    		description: "infinity",
    		keywords: [
    			"infinity"
    		]
    	},
    	{
    		unicode: "267E",
    		emoji: "♾",
    		description: "infinity",
    		keywords: [
    			"infinity"
    		]
    	},
    	{
    		unicode: "203C FE0F",
    		emoji: "‼️",
    		description: "double exclamation mark",
    		keywords: [
    			"double exclamation mark"
    		]
    	},
    	{
    		unicode: "203C",
    		emoji: "‼",
    		description: "double exclamation mark",
    		keywords: [
    			"double exclamation mark"
    		]
    	},
    	{
    		unicode: "2049 FE0F",
    		emoji: "⁉️",
    		description: "exclamation question mark",
    		keywords: [
    			"exclamation question mark"
    		]
    	},
    	{
    		unicode: "2049",
    		emoji: "⁉",
    		description: "exclamation question mark",
    		keywords: [
    			"exclamation question mark"
    		]
    	},
    	{
    		unicode: "2753",
    		emoji: "❓",
    		description: "question mark",
    		keywords: [
    			"question mark"
    		]
    	},
    	{
    		unicode: "2754",
    		emoji: "❔",
    		description: "white question mark",
    		keywords: [
    			"white question mark"
    		]
    	},
    	{
    		unicode: "2755",
    		emoji: "❕",
    		description: "white exclamation mark",
    		keywords: [
    			"white exclamation mark"
    		]
    	},
    	{
    		unicode: "2757",
    		emoji: "❗",
    		description: "exclamation mark",
    		keywords: [
    			"exclamation mark"
    		]
    	},
    	{
    		unicode: "3030 FE0F",
    		emoji: "〰️",
    		description: "wavy dash",
    		keywords: [
    			"wavy dash"
    		]
    	},
    	{
    		unicode: "3030",
    		emoji: "〰",
    		description: "wavy dash",
    		keywords: [
    			"wavy dash"
    		]
    	},
    	{
    		unicode: "1F4B1",
    		emoji: "💱",
    		description: "currency exchange",
    		keywords: [
    			"currency exchange"
    		]
    	},
    	{
    		unicode: "1F4B2",
    		emoji: "💲",
    		description: "heavy dollar sign",
    		keywords: [
    			"heavy dollar sign"
    		]
    	},
    	{
    		unicode: "2695 FE0F",
    		emoji: "⚕️",
    		description: "medical symbol",
    		keywords: [
    			"medical symbol"
    		]
    	},
    	{
    		unicode: "2695",
    		emoji: "⚕",
    		description: "medical symbol",
    		keywords: [
    			"medical symbol"
    		]
    	},
    	{
    		unicode: "267B FE0F",
    		emoji: "♻️",
    		description: "recycling symbol",
    		keywords: [
    			"recycling symbol"
    		]
    	},
    	{
    		unicode: "267B",
    		emoji: "♻",
    		description: "recycling symbol",
    		keywords: [
    			"recycling symbol"
    		]
    	},
    	{
    		unicode: "269C FE0F",
    		emoji: "⚜️",
    		description: "fleur-de-lis",
    		keywords: [
    			"fleur-de-lis"
    		]
    	},
    	{
    		unicode: "269C",
    		emoji: "⚜",
    		description: "fleur-de-lis",
    		keywords: [
    			"fleur-de-lis"
    		]
    	},
    	{
    		unicode: "1F531",
    		emoji: "🔱",
    		description: "trident emblem",
    		keywords: [
    			"trident emblem"
    		]
    	},
    	{
    		unicode: "1F4DB",
    		emoji: "📛",
    		description: "name badge",
    		keywords: [
    			"name badge"
    		]
    	},
    	{
    		unicode: "1F530",
    		emoji: "🔰",
    		description: "Japanese symbol for beginner",
    		keywords: [
    		]
    	},
    	{
    		unicode: "2B55",
    		emoji: "⭕",
    		description: "hollow red circle",
    		keywords: [
    			"hollow red circle"
    		]
    	},
    	{
    		unicode: "2705",
    		emoji: "✅",
    		description: "check mark button",
    		keywords: [
    			"check mark button"
    		]
    	},
    	{
    		unicode: "2611 FE0F",
    		emoji: "☑️",
    		description: "check box with check",
    		keywords: [
    			"check box with check"
    		]
    	},
    	{
    		unicode: "2611",
    		emoji: "☑",
    		description: "check box with check",
    		keywords: [
    			"check box with check"
    		]
    	},
    	{
    		unicode: "2714 FE0F",
    		emoji: "✔️",
    		description: "check mark",
    		keywords: [
    			"check mark"
    		]
    	},
    	{
    		unicode: "2714",
    		emoji: "✔",
    		description: "check mark",
    		keywords: [
    			"check mark"
    		]
    	},
    	{
    		unicode: "274C",
    		emoji: "❌",
    		description: "cross mark",
    		keywords: [
    			"cross mark"
    		]
    	},
    	{
    		unicode: "274E",
    		emoji: "❎",
    		description: "cross mark button",
    		keywords: [
    			"cross mark button"
    		]
    	},
    	{
    		unicode: "27B0",
    		emoji: "➰",
    		description: "curly loop",
    		keywords: [
    			"curly loop"
    		]
    	},
    	{
    		unicode: "27BF",
    		emoji: "➿",
    		description: "double curly loop",
    		keywords: [
    			"double curly loop"
    		]
    	},
    	{
    		unicode: "303D FE0F",
    		emoji: "〽️",
    		description: "part alternation mark",
    		keywords: [
    			"part alternation mark"
    		]
    	},
    	{
    		unicode: "303D",
    		emoji: "〽",
    		description: "part alternation mark",
    		keywords: [
    			"part alternation mark"
    		]
    	},
    	{
    		unicode: "2733 FE0F",
    		emoji: "✳️",
    		description: "eight-spoked asterisk",
    		keywords: [
    			"eight-spoked asterisk"
    		]
    	},
    	{
    		unicode: "2733",
    		emoji: "✳",
    		description: "eight-spoked asterisk",
    		keywords: [
    			"eight-spoked asterisk"
    		]
    	},
    	{
    		unicode: "2734 FE0F",
    		emoji: "✴️",
    		description: "eight-pointed star",
    		keywords: [
    			"eight-pointed star"
    		]
    	},
    	{
    		unicode: "2734",
    		emoji: "✴",
    		description: "eight-pointed star",
    		keywords: [
    			"eight-pointed star"
    		]
    	},
    	{
    		unicode: "2747 FE0F",
    		emoji: "❇️",
    		description: "sparkle",
    		keywords: [
    			"sparkle"
    		]
    	},
    	{
    		unicode: "2747",
    		emoji: "❇",
    		description: "sparkle",
    		keywords: [
    			"sparkle"
    		]
    	},
    	{
    		unicode: "00A9 FE0F",
    		emoji: "©️",
    		description: "copyright",
    		keywords: [
    			"copyright"
    		]
    	},
    	{
    		unicode: "00A9",
    		emoji: "©",
    		description: "copyright",
    		keywords: [
    			"copyright"
    		]
    	},
    	{
    		unicode: "00AE FE0F",
    		emoji: "®️",
    		description: "registered",
    		keywords: [
    			"registered"
    		]
    	},
    	{
    		unicode: "00AE",
    		emoji: "®",
    		description: "registered",
    		keywords: [
    			"registered"
    		]
    	},
    	{
    		unicode: "2122 FE0F",
    		emoji: "™️",
    		description: "trade mark",
    		keywords: [
    			"trade mark"
    		]
    	},
    	{
    		unicode: "2122",
    		emoji: "™",
    		description: "trade mark",
    		keywords: [
    			"trade mark"
    		]
    	},
    	{
    		unicode: "1F534",
    		emoji: "🔴",
    		description: "red circle",
    		keywords: [
    			"red circle"
    		]
    	},
    	{
    		unicode: "1F7E0",
    		emoji: "🟠",
    		description: "orange circle",
    		keywords: [
    			"orange circle"
    		]
    	},
    	{
    		unicode: "1F7E1",
    		emoji: "🟡",
    		description: "yellow circle",
    		keywords: [
    			"yellow circle"
    		]
    	},
    	{
    		unicode: "1F7E2",
    		emoji: "🟢",
    		description: "green circle",
    		keywords: [
    			"green circle"
    		]
    	},
    	{
    		unicode: "1F535",
    		emoji: "🔵",
    		description: "blue circle",
    		keywords: [
    			"blue circle"
    		]
    	},
    	{
    		unicode: "1F7E3",
    		emoji: "🟣",
    		description: "purple circle",
    		keywords: [
    			"purple circle"
    		]
    	},
    	{
    		unicode: "1F7E4",
    		emoji: "🟤",
    		description: "brown circle",
    		keywords: [
    			"brown circle"
    		]
    	},
    	{
    		unicode: "26AB",
    		emoji: "⚫",
    		description: "black circle",
    		keywords: [
    			"black circle"
    		]
    	},
    	{
    		unicode: "26AA",
    		emoji: "⚪",
    		description: "white circle",
    		keywords: [
    			"white circle"
    		]
    	},
    	{
    		unicode: "1F7E5",
    		emoji: "🟥",
    		description: "red square",
    		keywords: [
    			"red square"
    		]
    	},
    	{
    		unicode: "1F7E7",
    		emoji: "🟧",
    		description: "orange square",
    		keywords: [
    			"orange square"
    		]
    	},
    	{
    		unicode: "1F7E8",
    		emoji: "🟨",
    		description: "yellow square",
    		keywords: [
    			"yellow square"
    		]
    	},
    	{
    		unicode: "1F7E9",
    		emoji: "🟩",
    		description: "green square",
    		keywords: [
    			"green square"
    		]
    	},
    	{
    		unicode: "1F7E6",
    		emoji: "🟦",
    		description: "blue square",
    		keywords: [
    			"blue square"
    		]
    	},
    	{
    		unicode: "1F7EA",
    		emoji: "🟪",
    		description: "purple square",
    		keywords: [
    			"purple square"
    		]
    	},
    	{
    		unicode: "1F7EB",
    		emoji: "🟫",
    		description: "brown square",
    		keywords: [
    			"brown square"
    		]
    	},
    	{
    		unicode: "2B1B",
    		emoji: "⬛",
    		description: "black large square",
    		keywords: [
    			"black large square"
    		]
    	},
    	{
    		unicode: "2B1C",
    		emoji: "⬜",
    		description: "white large square",
    		keywords: [
    			"white large square"
    		]
    	},
    	{
    		unicode: "25FC",
    		emoji: "◼",
    		description: "black medium square",
    		keywords: [
    			"black medium square"
    		]
    	},
    	{
    		unicode: "25FB",
    		emoji: "◻",
    		description: "white medium square",
    		keywords: [
    			"white medium square"
    		]
    	},
    	{
    		unicode: "25FE",
    		emoji: "◾",
    		description: "black medium-small square",
    		keywords: [
    			"black medium-small square"
    		]
    	},
    	{
    		unicode: "25FD",
    		emoji: "◽",
    		description: "white medium-small square",
    		keywords: [
    			"white medium-small square"
    		]
    	},
    	{
    		unicode: "25AA",
    		emoji: "▪",
    		description: "black small square",
    		keywords: [
    			"black small square"
    		]
    	},
    	{
    		unicode: "25AB",
    		emoji: "▫",
    		description: "white small square",
    		keywords: [
    			"white small square"
    		]
    	},
    	{
    		unicode: "1F536",
    		emoji: "🔶",
    		description: "large orange diamond",
    		keywords: [
    			"large orange diamond"
    		]
    	},
    	{
    		unicode: "1F537",
    		emoji: "🔷",
    		description: "large blue diamond",
    		keywords: [
    			"large blue diamond"
    		]
    	},
    	{
    		unicode: "1F538",
    		emoji: "🔸",
    		description: "small orange diamond",
    		keywords: [
    			"small orange diamond"
    		]
    	},
    	{
    		unicode: "1F539",
    		emoji: "🔹",
    		description: "small blue diamond",
    		keywords: [
    			"small blue diamond"
    		]
    	},
    	{
    		unicode: "1F53A",
    		emoji: "🔺",
    		description: "red triangle pointed up",
    		keywords: [
    			"red triangle pointed up"
    		]
    	},
    	{
    		unicode: "1F53B",
    		emoji: "🔻",
    		description: "red triangle pointed down",
    		keywords: [
    			"red triangle pointed down"
    		]
    	},
    	{
    		unicode: "1F4A0",
    		emoji: "💠",
    		description: "diamond with a dot",
    		keywords: [
    			"diamond with a dot"
    		]
    	},
    	{
    		unicode: "1F518",
    		emoji: "🔘",
    		description: "radio button",
    		keywords: [
    			"radio button"
    		]
    	},
    	{
    		unicode: "1F533",
    		emoji: "🔳",
    		description: "white square button",
    		keywords: [
    			"white square button"
    		]
    	},
    	{
    		unicode: "1F532",
    		emoji: "🔲",
    		description: "black square button",
    		keywords: [
    			"black square button"
    		]
    	},
    	{
    		unicode: "1F3C1",
    		emoji: "🏁",
    		description: "chequered flag",
    		keywords: [
    			"chequered flag",
    			"race flag"
    		]
    	},
    	{
    		unicode: "1F6A9",
    		emoji: "🚩",
    		description: "triangular flag",
    		keywords: [
    			"triangular flag"
    		]
    	},
    	{
    		unicode: "1F38C",
    		emoji: "🎌",
    		description: "crossed flags",
    		keywords: [
    			"crossed flags"
    		]
    	},
    	{
    		unicode: "1F3F4",
    		emoji: "🏴",
    		description: "black flag",
    		keywords: [
    			"black flag"
    		]
    	},
    	{
    		unicode: "FE0F",
    		emoji: "🏳️",
    		description: "white flag",
    		keywords: [
    			"white flag",
    			"surrender"
    		]
    	},
    	{
    		unicode: "1F3F3",
    		emoji: "🏳",
    		description: "white flag",
    		keywords: [
    			"white flag",
    			"surrendering"
    		]
    	},
    	{
    		unicode: "1F1E6 1F1E8",
    		emoji: "🇦🇨",
    		description: "flag: Ascension Island",
    		keywords: [
    			"ascension island",
    			"ascension"
    		]
    	},
    	{
    		unicode: "1F1E6 1F1E9",
    		emoji: "🇦🇩",
    		description: "flag: Andorra",
    		keywords: [
    			"andorra"
    		]
    	},
    	{
    		unicode: "1F1E6 1F1EA",
    		emoji: "🇦🇪",
    		description: "flag: United Arab Emirates",
    		keywords: [
    			"united arab emirates",
    			"uae",
    			"u.a.e"
    		]
    	},
    	{
    		unicode: "1F1E6 1F1EB",
    		emoji: "🇦🇫",
    		description: "flag: Afghanistan",
    		keywords: [
    			"afghanistan"
    		]
    	},
    	{
    		unicode: "1F1E6 1F1EC",
    		emoji: "🇦🇬",
    		description: "flag: Antigua & Barbuda",
    		keywords: [
    			"antigua & barbuda",
    			"antigua and barbuda"
    		]
    	},
    	{
    		unicode: "1F1E6 1F1EE",
    		emoji: "🇦🇮",
    		description: "flag: Anguilla",
    		keywords: [
    			"anguilla"
    		]
    	},
    	{
    		unicode: "1F1E6 1F1F1",
    		emoji: "🇦🇱",
    		description: "flag: Albania",
    		keywords: [
    			"albania"
    		]
    	},
    	{
    		unicode: "1F1E6 1F1F2",
    		emoji: "🇦🇲",
    		description: "flag: Armenia",
    		keywords: [
    			"armenia"
    		]
    	},
    	{
    		unicode: "1F1E6 1F1F4",
    		emoji: "🇦🇴",
    		description: "flag: Angola",
    		keywords: [
    			"angola"
    		]
    	},
    	{
    		unicode: "1F1E6 1F1F6",
    		emoji: "🇦🇶",
    		description: "flag: Antarctica",
    		keywords: [
    			"antarctica"
    		]
    	},
    	{
    		unicode: "1F1E6 1F1F7",
    		emoji: "🇦🇷",
    		description: "flag: Argentina",
    		keywords: [
    			"argentina"
    		]
    	},
    	{
    		unicode: "1F1E6 1F1F8",
    		emoji: "🇦🇸",
    		description: "flag: American Samoa",
    		keywords: [
    			"american samoa"
    		]
    	},
    	{
    		unicode: "1F1E6 1F1F9",
    		emoji: "🇦🇹",
    		description: "flag: Austria",
    		keywords: [
    			"austria"
    		]
    	},
    	{
    		unicode: "1F1E6 1F1FA",
    		emoji: "🇦🇺",
    		description: "flag: Australia",
    		keywords: [
    			"australia"
    		]
    	},
    	{
    		unicode: "1F1E6 1F1FC",
    		emoji: "🇦🇼",
    		description: "flag: Aruba",
    		keywords: [
    			"aruba"
    		]
    	},
    	{
    		unicode: "1F1E6 1F1FD",
    		emoji: "🇦🇽",
    		description: "flag: Åland Islands",
    		keywords: [
    			"åland islands",
    			"åland"
    		]
    	},
    	{
    		unicode: "1F1E6 1F1FF",
    		emoji: "🇦🇿",
    		description: "flag: Azerbaijan",
    		keywords: [
    			"azerbaijan"
    		]
    	},
    	{
    		unicode: "1F1E7 1F1E6",
    		emoji: "🇧🇦",
    		description: "flag: Bosnia & Herzegovina",
    		keywords: [
    			"bosnia & herzegovina",
    			"bosnia and herzegovina"
    		]
    	},
    	{
    		unicode: "1F1E7 1F1E7",
    		emoji: "🇧🇧",
    		description: "flag: Barbados",
    		keywords: [
    			"barbados"
    		]
    	},
    	{
    		unicode: "1F1E7 1F1E9",
    		emoji: "🇧🇩",
    		description: "flag: Bangladesh",
    		keywords: [
    			"bangladesh"
    		]
    	},
    	{
    		unicode: "1F1E7 1F1EA",
    		emoji: "🇧🇪",
    		description: "flag: Belgium",
    		keywords: [
    			"belgium"
    		]
    	},
    	{
    		unicode: "1F1E7 1F1EB",
    		emoji: "🇧🇫",
    		description: "flag: Burkina Faso",
    		keywords: [
    			"burkina faso"
    		]
    	},
    	{
    		unicode: "1F1E7 1F1EC",
    		emoji: "🇧🇬",
    		description: "flag: Bulgaria",
    		keywords: [
    			"bulgaria"
    		]
    	},
    	{
    		unicode: "1F1E7 1F1ED",
    		emoji: "🇧🇭",
    		description: "flag: Bahrain",
    		keywords: [
    			"bahrain"
    		]
    	},
    	{
    		unicode: "1F1E7 1F1EE",
    		emoji: "🇧🇮",
    		description: "flag: Burundi",
    		keywords: [
    			"burundi"
    		]
    	},
    	{
    		unicode: "1F1E7 1F1EF",
    		emoji: "🇧🇯",
    		description: "flag: Benin",
    		keywords: [
    			"benin"
    		]
    	},
    	{
    		unicode: "1F1E7 1F1F1",
    		emoji: "🇧🇱",
    		description: "flag: St. Barth élemy",
    		keywords: [
    			"st. barth élemy"
    		]
    	},
    	{
    		unicode: "1F1E7 1F1F2",
    		emoji: "🇧🇲",
    		description: "flag: Bermuda",
    		keywords: [
    			"bermuda"
    		]
    	},
    	{
    		unicode: "1F1E7 1F1F3",
    		emoji: "🇧🇳",
    		description: "flag: Brunei",
    		keywords: [
    			"brunei"
    		]
    	},
    	{
    		unicode: "1F1E7 1F1F4",
    		emoji: "🇧🇴",
    		description: "flag: Bolivia",
    		keywords: [
    			"bolivia"
    		]
    	},
    	{
    		unicode: "1F1E7 1F1F6",
    		emoji: "🇧🇶",
    		description: "flag: Caribbean Netherlands",
    		keywords: [
    			"caribbean netherlands"
    		]
    	},
    	{
    		unicode: "1F1E7 1F1F7",
    		emoji: "🇧🇷",
    		description: "flag: Brazil",
    		keywords: [
    			"brazil"
    		]
    	},
    	{
    		unicode: "1F1E7 1F1F8",
    		emoji: "🇧🇸",
    		description: "flag: Bahamas",
    		keywords: [
    			"bahamas"
    		]
    	},
    	{
    		unicode: "1F1E7 1F1F9",
    		emoji: "🇧🇹",
    		description: "flag: Bhutan",
    		keywords: [
    			"bhutan"
    		]
    	},
    	{
    		unicode: "1F1E7 1F1FB",
    		emoji: "🇧🇻",
    		description: "flag: Bouvet Island",
    		keywords: [
    			"bouvet island",
    			"bouvet"
    		]
    	},
    	{
    		unicode: "1F1E7 1F1FC",
    		emoji: "🇧🇼",
    		description: "flag: Botswana",
    		keywords: [
    			"botswana"
    		]
    	},
    	{
    		unicode: "1F1E7 1F1FE",
    		emoji: "🇧🇾",
    		description: "flag: Belarus",
    		keywords: [
    			"belarus"
    		]
    	},
    	{
    		unicode: "1F1E7 1F1FF",
    		emoji: "🇧🇿",
    		description: "flag: Belize",
    		keywords: [
    			"belize"
    		]
    	},
    	{
    		unicode: "1F1E8 1F1E6",
    		emoji: "🇨🇦",
    		description: "flag: Canada",
    		keywords: [
    			"canada"
    		]
    	},
    	{
    		unicode: "1F1E8 1F1E8",
    		emoji: "🇨🇨",
    		description: "flag: Cocos (Keeling) Islands",
    		keywords: [
    			"cocos (keeling) islands",
    			"cocos (keeling)"
    		]
    	},
    	{
    		unicode: "1F1E8 1F1E9",
    		emoji: "🇨🇩",
    		description: "flag: Congo - Kinshasa",
    		keywords: [
    			"congo - kinshasa",
    			"congo kinshasa"
    		]
    	},
    	{
    		unicode: "1F1E8 1F1EB",
    		emoji: "🇨🇫",
    		description: "flag: Central African Republic",
    		keywords: [
    			"central african republic"
    		]
    	},
    	{
    		unicode: "1F1E8 1F1EC",
    		emoji: "🇨🇬",
    		description: "flag: Congo - Brazzaville",
    		keywords: [
    			"congo - brazzaville",
    			"congo brazzaville"
    		]
    	},
    	{
    		unicode: "1F1E8 1F1ED",
    		emoji: "🇨🇭",
    		description: "flag: Switzerland",
    		keywords: [
    			"switzerland"
    		]
    	},
    	{
    		unicode: "1F1E8 1F1EE",
    		emoji: "🇨🇮",
    		description: "flag: Côte d’Ivoire",
    		keywords: [
    			"côte d’ivoire"
    		]
    	},
    	{
    		unicode: "1F1E8 1F1F0",
    		emoji: "🇨🇰",
    		description: "flag: Cook Islands",
    		keywords: [
    			"cook islands",
    			"cook"
    		]
    	},
    	{
    		unicode: "1F1E8 1F1F1",
    		emoji: "🇨🇱",
    		description: "flag: Chile",
    		keywords: [
    			"chile"
    		]
    	},
    	{
    		unicode: "1F1E8 1F1F2",
    		emoji: "🇨🇲",
    		description: "flag: Cameroon",
    		keywords: [
    			"cameroon"
    		]
    	},
    	{
    		unicode: "1F1E8 1F1F3",
    		emoji: "🇨🇳",
    		description: "flag: China",
    		keywords: [
    			"china"
    		]
    	},
    	{
    		unicode: "1F1E8 1F1F4",
    		emoji: "🇨🇴",
    		description: "flag: Colombia",
    		keywords: [
    			"colombia"
    		]
    	},
    	{
    		unicode: "1F1E8 1F1F5",
    		emoji: "🇨🇵",
    		description: "flag: Clipperton Island",
    		keywords: [
    			"clipperton island",
    			"clipperton"
    		]
    	},
    	{
    		unicode: "1F1E8 1F1F7",
    		emoji: "🇨🇷",
    		description: "flag: Costa Rica",
    		keywords: [
    			"costa rica"
    		]
    	},
    	{
    		unicode: "1F1E8 1F1FA",
    		emoji: "🇨🇺",
    		description: "flag: Cuba",
    		keywords: [
    			"cuba"
    		]
    	},
    	{
    		unicode: "1F1E8 1F1FB",
    		emoji: "🇨🇻",
    		description: "flag: Cape Verde",
    		keywords: [
    			"cape verde"
    		]
    	},
    	{
    		unicode: "1F1E8 1F1FC",
    		emoji: "🇨🇼",
    		description: "flag: Curaçao",
    		keywords: [
    			"curaçao"
    		]
    	},
    	{
    		unicode: "1F1E8 1F1FD",
    		emoji: "🇨🇽",
    		description: "flag: Christmas Island",
    		keywords: [
    			"christmas island",
    			"christmas"
    		]
    	},
    	{
    		unicode: "1F1E8 1F1FE",
    		emoji: "🇨🇾",
    		description: "flag: Cyprus",
    		keywords: [
    			"cyprus"
    		]
    	},
    	{
    		unicode: "1F1E8 1F1FF",
    		emoji: "🇨🇿",
    		description: "flag: Czechia",
    		keywords: [
    			"czechia"
    		]
    	},
    	{
    		unicode: "1F1E9 1F1EA",
    		emoji: "🇩🇪",
    		description: "flag: Germany",
    		keywords: [
    			"germany"
    		]
    	},
    	{
    		unicode: "1F1E9 1F1EC",
    		emoji: "🇩🇬",
    		description: "flag: Diego Garcia",
    		keywords: [
    			"diego garcia"
    		]
    	},
    	{
    		unicode: "1F1E9 1F1EF",
    		emoji: "🇩🇯",
    		description: "flag: Djibouti",
    		keywords: [
    			"djibouti"
    		]
    	},
    	{
    		unicode: "1F1E9 1F1F0",
    		emoji: "🇩🇰",
    		description: "flag: Denmark",
    		keywords: [
    			"denmark"
    		]
    	},
    	{
    		unicode: "1F1E9 1F1F2",
    		emoji: "🇩🇲",
    		description: "flag: Dominica",
    		keywords: [
    			"dominica"
    		]
    	},
    	{
    		unicode: "1F1E9 1F1F4",
    		emoji: "🇩🇴",
    		description: "flag: Dominican Republic",
    		keywords: [
    			"dominican republic"
    		]
    	},
    	{
    		unicode: "1F1E9 1F1FF",
    		emoji: "🇩🇿",
    		description: "flag: Algeria",
    		keywords: [
    			"algeria"
    		]
    	},
    	{
    		unicode: "1F1EA 1F1E8",
    		emoji: "🇪🇨",
    		description: "flag: Ecuador",
    		keywords: [
    			"ecuador"
    		]
    	},
    	{
    		unicode: "1F1EA 1F1EA",
    		emoji: "🇪🇪",
    		description: "flag: Estonia",
    		keywords: [
    			"estonia"
    		]
    	},
    	{
    		unicode: "1F1EA 1F1EC",
    		emoji: "🇪🇬",
    		description: "flag: Egypt",
    		keywords: [
    			"egypt"
    		]
    	},
    	{
    		unicode: "1F1EA 1F1ED",
    		emoji: "🇪🇭",
    		description: "flag: Western Sahara",
    		keywords: [
    			"western sahara"
    		]
    	},
    	{
    		unicode: "1F1EA 1F1F7",
    		emoji: "🇪🇷",
    		description: "flag: Eritrea",
    		keywords: [
    			"eritrea"
    		]
    	},
    	{
    		unicode: "1F1EA 1F1F8",
    		emoji: "🇪🇸",
    		description: "flag: Spain",
    		keywords: [
    			"spain"
    		]
    	},
    	{
    		unicode: "1F1EA 1F1F9",
    		emoji: "🇪🇹",
    		description: "flag: Ethiopia",
    		keywords: [
    			"ethiopia"
    		]
    	},
    	{
    		unicode: "1F1EA 1F1FA",
    		emoji: "🇪🇺",
    		description: "flag: European Union",
    		keywords: [
    			"european union"
    		]
    	},
    	{
    		unicode: "1F1EB 1F1EE",
    		emoji: "🇫🇮",
    		description: "flag: Finland",
    		keywords: [
    			"finland"
    		]
    	},
    	{
    		unicode: "1F1EB 1F1EF",
    		emoji: "🇫🇯",
    		description: "flag: Fiji",
    		keywords: [
    			"fiji"
    		]
    	},
    	{
    		unicode: "1F1EB 1F1F0",
    		emoji: "🇫🇰",
    		description: "flag: Falkland Islands",
    		keywords: [
    			"falkland islands",
    			"falkland"
    		]
    	},
    	{
    		unicode: "1F1EB 1F1F2",
    		emoji: "🇫🇲",
    		description: "flag: Micronesia",
    		keywords: [
    			"micronesia"
    		]
    	},
    	{
    		unicode: "1F1EB 1F1F4",
    		emoji: "🇫🇴",
    		description: "flag: Faroe Islands",
    		keywords: [
    			"faroe islands",
    			"faroe"
    		]
    	},
    	{
    		unicode: "1F1EB 1F1F7",
    		emoji: "🇫🇷",
    		description: "flag: France",
    		keywords: [
    			"france"
    		]
    	},
    	{
    		unicode: "1F1EC 1F1E6",
    		emoji: "🇬🇦",
    		description: "flag: Gabon",
    		keywords: [
    			"gabon"
    		]
    	},
    	{
    		unicode: "1F1EC 1F1E7",
    		emoji: "🇬🇧",
    		description: "flag: United Kingdom",
    		keywords: [
    			"united kingdom"
    		]
    	},
    	{
    		unicode: "1F1EC 1F1E9",
    		emoji: "🇬🇩",
    		description: "flag: Grenada",
    		keywords: [
    			"grenada"
    		]
    	},
    	{
    		unicode: "1F1EC 1F1EA",
    		emoji: "🇬🇪",
    		description: "flag: Georgia",
    		keywords: [
    			"georgia"
    		]
    	},
    	{
    		unicode: "1F1EC 1F1EB",
    		emoji: "🇬🇫",
    		description: "flag: French Guiana",
    		keywords: [
    			"french guiana"
    		]
    	},
    	{
    		unicode: "1F1EC 1F1EC",
    		emoji: "🇬🇬",
    		description: "flag: Guernsey",
    		keywords: [
    			"guernsey"
    		]
    	},
    	{
    		unicode: "1F1EC 1F1ED",
    		emoji: "🇬🇭",
    		description: "flag: Ghana",
    		keywords: [
    			"ghana"
    		]
    	},
    	{
    		unicode: "1F1EC 1F1EE",
    		emoji: "🇬🇮",
    		description: "flag: Gibraltar",
    		keywords: [
    			"gibraltar"
    		]
    	},
    	{
    		unicode: "1F1EC 1F1F1",
    		emoji: "🇬🇱",
    		description: "flag: Greenland",
    		keywords: [
    			"greenland"
    		]
    	},
    	{
    		unicode: "1F1EC 1F1F2",
    		emoji: "🇬🇲",
    		description: "flag: Gambia",
    		keywords: [
    			"gambia"
    		]
    	},
    	{
    		unicode: "1F1EC 1F1F3",
    		emoji: "🇬🇳",
    		description: "flag: Guinea",
    		keywords: [
    			"guinea"
    		]
    	},
    	{
    		unicode: "1F1EC 1F1F5",
    		emoji: "🇬🇵",
    		description: "flag: Guadeloupe",
    		keywords: [
    			"guadeloupe"
    		]
    	},
    	{
    		unicode: "1F1EC 1F1F6",
    		emoji: "🇬🇶",
    		description: "flag: Equatorial Guinea",
    		keywords: [
    			"equatorial guinea"
    		]
    	},
    	{
    		unicode: "1F1EC 1F1F7",
    		emoji: "🇬🇷",
    		description: "flag: Greece",
    		keywords: [
    			"greece"
    		]
    	},
    	{
    		unicode: "1F1EC 1F1F8",
    		emoji: "🇬🇸",
    		description: "flag: South Georgia & South Sandwich Islands",
    		keywords: [
    			"south georgia & south sandwich islands",
    			"south georgia & south sandwich"
    		]
    	},
    	{
    		unicode: "1F1EC 1F1F9",
    		emoji: "🇬🇹",
    		description: "flag: Guatemala",
    		keywords: [
    			"guatemala"
    		]
    	},
    	{
    		unicode: "1F1EC 1F1FA",
    		emoji: "🇬🇺",
    		description: "flag: Guam",
    		keywords: [
    			"guam"
    		]
    	},
    	{
    		unicode: "1F1EC 1F1FC",
    		emoji: "🇬🇼",
    		description: "flag: Guinea-Bissau",
    		keywords: [
    			"guinea-bissau"
    		]
    	},
    	{
    		unicode: "1F1EC 1F1FE",
    		emoji: "🇬🇾",
    		description: "flag: Guyana",
    		keywords: [
    			"guyana"
    		]
    	},
    	{
    		unicode: "1F1ED 1F1F0",
    		emoji: "🇭🇰",
    		description: "flag: Hong Kong SAR China",
    		keywords: [
    			"hong kong sar china"
    		]
    	},
    	{
    		unicode: "1F1ED 1F1F2",
    		emoji: "🇭🇲",
    		description: "flag: Heard & McDonald Islands",
    		keywords: [
    			"heard & mcdonald islands",
    			"heard & mcdonald"
    		]
    	},
    	{
    		unicode: "1F1ED 1F1F3",
    		emoji: "🇭🇳",
    		description: "flag: Honduras",
    		keywords: [
    			"honduras"
    		]
    	},
    	{
    		unicode: "1F1ED 1F1F7",
    		emoji: "🇭🇷",
    		description: "flag: Croatia",
    		keywords: [
    			"croatia"
    		]
    	},
    	{
    		unicode: "1F1ED 1F1F9",
    		emoji: "🇭🇹",
    		description: "flag: Haiti",
    		keywords: [
    			"haiti"
    		]
    	},
    	{
    		unicode: "1F1ED 1F1FA",
    		emoji: "🇭🇺",
    		description: "flag: Hungary",
    		keywords: [
    			"hungary"
    		]
    	},
    	{
    		unicode: "1F1EE 1F1E8",
    		emoji: "🇮🇨",
    		description: "flag: Canary Islands",
    		keywords: [
    			"canary islands",
    			"canary"
    		]
    	},
    	{
    		unicode: "1F1EE 1F1E9",
    		emoji: "🇮🇩",
    		description: "flag: Indonesia",
    		keywords: [
    			"indonesia"
    		]
    	},
    	{
    		unicode: "1F1EE 1F1EA",
    		emoji: "🇮🇪",
    		description: "flag: Ireland",
    		keywords: [
    			"ireland"
    		]
    	},
    	{
    		unicode: "1F1EE 1F1F2",
    		emoji: "🇮🇲",
    		description: "flag: Isle of Man",
    		keywords: [
    			"isle of man"
    		]
    	},
    	{
    		unicode: "1F1EE 1F1F3",
    		emoji: "🇮🇳",
    		description: "flag: India",
    		keywords: [
    			"india"
    		]
    	},
    	{
    		unicode: "1F1EE 1F1F4",
    		emoji: "🇮🇴",
    		description: "flag: British Indian Ocean Territory",
    		keywords: [
    			"british indian ocean territory"
    		]
    	},
    	{
    		unicode: "1F1EE 1F1F6",
    		emoji: "🇮🇶",
    		description: "flag: Iraq",
    		keywords: [
    			"iraq"
    		]
    	},
    	{
    		unicode: "1F1EE 1F1F7",
    		emoji: "🇮🇷",
    		description: "flag: Iran",
    		keywords: [
    			"iran"
    		]
    	},
    	{
    		unicode: "1F1EE 1F1F8",
    		emoji: "🇮🇸",
    		description: "flag: Iceland",
    		keywords: [
    			"iceland"
    		]
    	},
    	{
    		unicode: "1F1EE 1F1F9",
    		emoji: "🇮🇹",
    		description: "flag: Italy",
    		keywords: [
    			"italy"
    		]
    	},
    	{
    		unicode: "1F1EF 1F1EA",
    		emoji: "🇯🇪",
    		description: "flag: Jersey",
    		keywords: [
    			"jersey"
    		]
    	},
    	{
    		unicode: "1F1EF 1F1F2",
    		emoji: "🇯🇲",
    		description: "flag: Jamaica",
    		keywords: [
    			"jamaica"
    		]
    	},
    	{
    		unicode: "1F1EF 1F1F4",
    		emoji: "🇯🇴",
    		description: "flag: Jordan",
    		keywords: [
    			"jordan"
    		]
    	},
    	{
    		unicode: "1F1EF 1F1F5",
    		emoji: "🇯🇵",
    		description: "flag: Japan",
    		keywords: [
    			"japan"
    		]
    	},
    	{
    		unicode: "1F1F0 1F1EA",
    		emoji: "🇰🇪",
    		description: "flag: Kenya",
    		keywords: [
    			"kenya"
    		]
    	},
    	{
    		unicode: "1F1F0 1F1EC",
    		emoji: "🇰🇬",
    		description: "flag: Kyrgyzstan",
    		keywords: [
    			"kyrgyzstan"
    		]
    	},
    	{
    		unicode: "1F1F0 1F1ED",
    		emoji: "🇰🇭",
    		description: "flag: Cambodia",
    		keywords: [
    			"cambodia"
    		]
    	},
    	{
    		unicode: "1F1F0 1F1EE",
    		emoji: "🇰🇮",
    		description: "flag: Kiribati",
    		keywords: [
    			"kiribati"
    		]
    	},
    	{
    		unicode: "1F1F0 1F1F2",
    		emoji: "🇰🇲",
    		description: "flag: Comoros",
    		keywords: [
    			"comoros"
    		]
    	},
    	{
    		unicode: "1F1F0 1F1F3",
    		emoji: "🇰🇳",
    		description: "flag: St. Kitts Nevis",
    		keywords: [
    			"st. kitts nevis"
    		]
    	},
    	{
    		unicode: "1F1F0 1F1F5",
    		emoji: "🇰🇵",
    		description: "flag: North Korea",
    		keywords: [
    			"north korea"
    		]
    	},
    	{
    		unicode: "1F1F0 1F1F7",
    		emoji: "🇰🇷",
    		description: "flag: South Korea",
    		keywords: [
    			"south korea"
    		]
    	},
    	{
    		unicode: "1F1F0 1F1FC",
    		emoji: "🇰🇼",
    		description: "flag: Kuwait",
    		keywords: [
    			"kuwait"
    		]
    	},
    	{
    		unicode: "1F1F0 1F1FE",
    		emoji: "🇰🇾",
    		description: "flag: Cayman Islands",
    		keywords: [
    			"cayman islands",
    			"cayman"
    		]
    	},
    	{
    		unicode: "1F1F0 1F1FF",
    		emoji: "🇰🇿",
    		description: "flag: Kazakhstan",
    		keywords: [
    			"kazakhstan"
    		]
    	},
    	{
    		unicode: "1F1F1 1F1E6",
    		emoji: "🇱🇦",
    		description: "flag: Laos",
    		keywords: [
    			"laos"
    		]
    	},
    	{
    		unicode: "1F1F1 1F1E7",
    		emoji: "🇱🇧",
    		description: "flag: Lebanon",
    		keywords: [
    			"lebanon"
    		]
    	},
    	{
    		unicode: "1F1F1 1F1E8",
    		emoji: "🇱🇨",
    		description: "flag: St. Lucia",
    		keywords: [
    			"st. lucia"
    		]
    	},
    	{
    		unicode: "1F1F1 1F1EE",
    		emoji: "🇱🇮",
    		description: "flag: Liechtenstein",
    		keywords: [
    			"liechtenstein"
    		]
    	},
    	{
    		unicode: "1F1F1 1F1F0",
    		emoji: "🇱🇰",
    		description: "flag: Sri Lanka",
    		keywords: [
    			"sri lanka"
    		]
    	},
    	{
    		unicode: "1F1F1 1F1F7",
    		emoji: "🇱🇷",
    		description: "flag: Liberia",
    		keywords: [
    			"liberia"
    		]
    	},
    	{
    		unicode: "1F1F1 1F1F8",
    		emoji: "🇱🇸",
    		description: "flag: Lesotho",
    		keywords: [
    			"lesotho"
    		]
    	},
    	{
    		unicode: "1F1F1 1F1F9",
    		emoji: "🇱🇹",
    		description: "flag: Lithuania",
    		keywords: [
    			"lithuania"
    		]
    	},
    	{
    		unicode: "1F1F1 1F1FA",
    		emoji: "🇱🇺",
    		description: "flag: Luxembourg",
    		keywords: [
    			"luxembourg"
    		]
    	},
    	{
    		unicode: "1F1F1 1F1FB",
    		emoji: "🇱🇻",
    		description: "flag: Latvia",
    		keywords: [
    			"latvia"
    		]
    	},
    	{
    		unicode: "1F1F1 1F1FE",
    		emoji: "🇱🇾",
    		description: "flag: Libya",
    		keywords: [
    			"libya"
    		]
    	},
    	{
    		unicode: "1F1F2 1F1E6",
    		emoji: "🇲🇦",
    		description: "flag: Morocco",
    		keywords: [
    			"morocco"
    		]
    	},
    	{
    		unicode: "1F1F2 1F1E8",
    		emoji: "🇲🇨",
    		description: "flag: Monaco",
    		keywords: [
    			"monaco"
    		]
    	},
    	{
    		unicode: "1F1F2 1F1E9",
    		emoji: "🇲🇩",
    		description: "flag: Moldova",
    		keywords: [
    			"moldova"
    		]
    	},
    	{
    		unicode: "1F1F2 1F1EA",
    		emoji: "🇲🇪",
    		description: "flag: Montenegro",
    		keywords: [
    			"montenegro"
    		]
    	},
    	{
    		unicode: "1F1F2 1F1EB",
    		emoji: "🇲🇫",
    		description: "flag: St. Martin",
    		keywords: [
    			"st. martin"
    		]
    	},
    	{
    		unicode: "1F1F2 1F1EC",
    		emoji: "🇲🇬",
    		description: "flag: Madagascar",
    		keywords: [
    			"madagascar"
    		]
    	},
    	{
    		unicode: "1F1F2 1F1ED",
    		emoji: "🇲🇭",
    		description: "flag: Marshall Islands",
    		keywords: [
    			"marshall islands",
    			"marshall"
    		]
    	},
    	{
    		unicode: "1F1F2 1F1F0",
    		emoji: "🇲🇰",
    		description: "flag: North Macedonia",
    		keywords: [
    			"north macedonia"
    		]
    	},
    	{
    		unicode: "1F1F2 1F1F1",
    		emoji: "🇲🇱",
    		description: "flag: Mali",
    		keywords: [
    			"mali"
    		]
    	},
    	{
    		unicode: "1F1F2 1F1F2",
    		emoji: "🇲🇲",
    		description: "flag: Myanmar (Burma)",
    		keywords: [
    			"myanmar",
    			"burma"
    		]
    	},
    	{
    		unicode: "1F1F2 1F1F3",
    		emoji: "🇲🇳",
    		description: "flag: Mongolia",
    		keywords: [
    			"mongolia"
    		]
    	},
    	{
    		unicode: "1F1F2 1F1F4",
    		emoji: "🇲🇴",
    		description: "flag: Macao SAR China",
    		keywords: [
    			"macao sar china"
    		]
    	},
    	{
    		unicode: "1F1F2 1F1F5",
    		emoji: "🇲🇵",
    		description: "flag: Northern Mariana Islands",
    		keywords: [
    			"northern mariana islands",
    			"northern mariana"
    		]
    	},
    	{
    		unicode: "1F1F2 1F1F6",
    		emoji: "🇲🇶",
    		description: "flag: Martinique",
    		keywords: [
    			"martinique"
    		]
    	},
    	{
    		unicode: "1F1F2 1F1F7",
    		emoji: "🇲🇷",
    		description: "flag: Mauritania",
    		keywords: [
    			"mauritania"
    		]
    	},
    	{
    		unicode: "1F1F2 1F1F8",
    		emoji: "🇲🇸",
    		description: "flag: Montserrat",
    		keywords: [
    			"montserrat"
    		]
    	},
    	{
    		unicode: "1F1F2 1F1F9",
    		emoji: "🇲🇹",
    		description: "flag: Malta",
    		keywords: [
    			"malta"
    		]
    	},
    	{
    		unicode: "1F1F2 1F1FA",
    		emoji: "🇲🇺",
    		description: "flag: Mauritius",
    		keywords: [
    			"mauritius"
    		]
    	},
    	{
    		unicode: "1F1F2 1F1FB",
    		emoji: "🇲🇻",
    		description: "flag: Maldives",
    		keywords: [
    			"maldives"
    		]
    	},
    	{
    		unicode: "1F1F2 1F1FC",
    		emoji: "🇲🇼",
    		description: "flag: Malawi",
    		keywords: [
    			"malawi"
    		]
    	},
    	{
    		unicode: "1F1F2 1F1FD",
    		emoji: "🇲🇽",
    		description: "flag: Mexico",
    		keywords: [
    			"mexico"
    		]
    	},
    	{
    		unicode: "1F1F2 1F1FE",
    		emoji: "🇲🇾",
    		description: "flag: Malaysia",
    		keywords: [
    			"malaysia"
    		]
    	},
    	{
    		unicode: "1F1F2 1F1FF",
    		emoji: "🇲🇿",
    		description: "flag: Mozambique",
    		keywords: [
    			"mozambique"
    		]
    	},
    	{
    		unicode: "1F1F3 1F1E6",
    		emoji: "🇳🇦",
    		description: "flag: Namibia",
    		keywords: [
    			"namibia"
    		]
    	},
    	{
    		unicode: "1F1F3 1F1E8",
    		emoji: "🇳🇨",
    		description: "flag: New Caledonia",
    		keywords: [
    			"new caledonia"
    		]
    	},
    	{
    		unicode: "1F1F3 1F1EA",
    		emoji: "🇳🇪",
    		description: "flag: Niger",
    		keywords: [
    			"niger"
    		]
    	},
    	{
    		unicode: "1F1F3 1F1EB",
    		emoji: "🇳🇫",
    		description: "flag: Norfolk Island",
    		keywords: [
    			"norfolk island",
    			"norfolk"
    		]
    	},
    	{
    		unicode: "1F1F3 1F1EC",
    		emoji: "🇳🇬",
    		description: "flag: Nigeria",
    		keywords: [
    			"nigeria"
    		]
    	},
    	{
    		unicode: "1F1F3 1F1EE",
    		emoji: "🇳🇮",
    		description: "flag: Nicaragua",
    		keywords: [
    			"nicaragua"
    		]
    	},
    	{
    		unicode: "1F1F3 1F1F1",
    		emoji: "🇳🇱",
    		description: "flag: Netherlands",
    		keywords: [
    			"netherlands"
    		]
    	},
    	{
    		unicode: "1F1F3 1F1F4",
    		emoji: "🇳🇴",
    		description: "flag: Norway",
    		keywords: [
    			"norway"
    		]
    	},
    	{
    		unicode: "1F1F3 1F1F5",
    		emoji: "🇳🇵",
    		description: "flag: Nepal",
    		keywords: [
    			"nepal"
    		]
    	},
    	{
    		unicode: "1F1F3 1F1F7",
    		emoji: "🇳🇷",
    		description: "flag: Nauru",
    		keywords: [
    			"nauru"
    		]
    	},
    	{
    		unicode: "1F1F3 1F1FA",
    		emoji: "🇳🇺",
    		description: "flag: Niue",
    		keywords: [
    			"niue"
    		]
    	},
    	{
    		unicode: "1F1F3 1F1FF",
    		emoji: "🇳🇿",
    		description: "flag: New Zealand",
    		keywords: [
    			"new zealand"
    		]
    	},
    	{
    		unicode: "1F1F4 1F1F2",
    		emoji: "🇴🇲",
    		description: "flag: Oman",
    		keywords: [
    			"oman"
    		]
    	},
    	{
    		unicode: "1F1F5 1F1E6",
    		emoji: "🇵🇦",
    		description: "flag: Panama",
    		keywords: [
    			"panama"
    		]
    	},
    	{
    		unicode: "1F1F5 1F1EA",
    		emoji: "🇵🇪",
    		description: "flag: Peru",
    		keywords: [
    			"peru"
    		]
    	},
    	{
    		unicode: "1F1F5 1F1EB",
    		emoji: "🇵🇫",
    		description: "flag: French Polynesia",
    		keywords: [
    			"french polynesia"
    		]
    	},
    	{
    		unicode: "1F1F5 1F1EC",
    		emoji: "🇵🇬",
    		description: "flag: Papua New Guinea",
    		keywords: [
    			"papua new guinea"
    		]
    	},
    	{
    		unicode: "1F1F5 1F1ED",
    		emoji: "🇵🇭",
    		description: "flag: Philippines",
    		keywords: [
    			"philippines"
    		]
    	},
    	{
    		unicode: "1F1F5 1F1F0",
    		emoji: "🇵🇰",
    		description: "flag: Pakistan",
    		keywords: [
    			"pakistan"
    		]
    	},
    	{
    		unicode: "1F1F5 1F1F1",
    		emoji: "🇵🇱",
    		description: "flag: Poland",
    		keywords: [
    			"poland"
    		]
    	},
    	{
    		unicode: "1F1F5 1F1F2",
    		emoji: "🇵🇲",
    		description: "flag: St. Pierre Miquelon",
    		keywords: [
    			"st. pierre miquelon"
    		]
    	},
    	{
    		unicode: "1F1F5 1F1F3",
    		emoji: "🇵🇳",
    		description: "flag: Pitcairn Islands",
    		keywords: [
    			"pitcairn islands",
    			"pitcairn"
    		]
    	},
    	{
    		unicode: "1F1F5 1F1F7",
    		emoji: "🇵🇷",
    		description: "flag: Puerto Rico",
    		keywords: [
    			"puerto rico"
    		]
    	},
    	{
    		unicode: "1F1F5 1F1F8",
    		emoji: "🇵🇸",
    		description: "flag: Palestinian Territories",
    		keywords: [
    			"palestinian territories",
    			"palestine"
    		]
    	},
    	{
    		unicode: "1F1F5 1F1F9",
    		emoji: "🇵🇹",
    		description: "flag: Portugal",
    		keywords: [
    			"portugal"
    		]
    	},
    	{
    		unicode: "1F1F5 1F1FC",
    		emoji: "🇵🇼",
    		description: "flag: Palau",
    		keywords: [
    			"palau"
    		]
    	},
    	{
    		unicode: "1F1F5 1F1FE",
    		emoji: "🇵🇾",
    		description: "flag: Paraguay",
    		keywords: [
    			"paraguay"
    		]
    	},
    	{
    		unicode: "1F1F6 1F1E6",
    		emoji: "🇶🇦",
    		description: "flag: Qatar",
    		keywords: [
    			"qatar"
    		]
    	},
    	{
    		unicode: "1F1F7 1F1EA",
    		emoji: "🇷🇪",
    		description: "flag: Réunion",
    		keywords: [
    			"réunion"
    		]
    	},
    	{
    		unicode: "1F1F7 1F1F4",
    		emoji: "🇷🇴",
    		description: "flag: Romania",
    		keywords: [
    			"romania"
    		]
    	},
    	{
    		unicode: "1F1F7 1F1F8",
    		emoji: "🇷🇸",
    		description: "flag: Serbia",
    		keywords: [
    			"serbia"
    		]
    	},
    	{
    		unicode: "1F1F7 1F1FA",
    		emoji: "🇷🇺",
    		description: "flag: Russia",
    		keywords: [
    			"russia"
    		]
    	},
    	{
    		unicode: "1F1F7 1F1FC",
    		emoji: "🇷🇼",
    		description: "flag: Rwanda",
    		keywords: [
    			"rwanda"
    		]
    	},
    	{
    		unicode: "1F1F8 1F1E6",
    		emoji: "🇸🇦",
    		description: "flag: Saudi Arabia",
    		keywords: [
    			"saudi arabia"
    		]
    	},
    	{
    		unicode: "1F1F8 1F1E7",
    		emoji: "🇸🇧",
    		description: "flag: Solomon Islands",
    		keywords: [
    			"solomon islands",
    			"solomon"
    		]
    	},
    	{
    		unicode: "1F1F8 1F1E8",
    		emoji: "🇸🇨",
    		description: "flag: Seychelles",
    		keywords: [
    			"seychelles"
    		]
    	},
    	{
    		unicode: "1F1F8 1F1E9",
    		emoji: "🇸🇩",
    		description: "flag: Sudan",
    		keywords: [
    			"sudan"
    		]
    	},
    	{
    		unicode: "1F1F8 1F1EA",
    		emoji: "🇸🇪",
    		description: "flag: Sweden",
    		keywords: [
    			"sweden"
    		]
    	},
    	{
    		unicode: "1F1F8 1F1EC",
    		emoji: "🇸🇬",
    		description: "flag: Singapore",
    		keywords: [
    			"singapore"
    		]
    	},
    	{
    		unicode: "1F1F8 1F1ED",
    		emoji: "🇸🇭",
    		description: "flag: St. Helena",
    		keywords: [
    			"st. helena"
    		]
    	},
    	{
    		unicode: "1F1F8 1F1EE",
    		emoji: "🇸🇮",
    		description: "flag: Slovenia",
    		keywords: [
    			"slovenia"
    		]
    	},
    	{
    		unicode: "1F1F8 1F1EF",
    		emoji: "🇸🇯",
    		description: "flag: Svalbard & Jan Mayen",
    		keywords: [
    			"svalbard & jan mayen",
    			"svalbard and jan mayen"
    		]
    	},
    	{
    		unicode: "1F1F8 1F1F0",
    		emoji: "🇸🇰",
    		description: "flag: Slovakia",
    		keywords: [
    			"slovakia"
    		]
    	},
    	{
    		unicode: "1F1F8 1F1F1",
    		emoji: "🇸🇱",
    		description: "flag: Sierra Leone",
    		keywords: [
    			"sierra leone"
    		]
    	},
    	{
    		unicode: "1F1F8 1F1F2",
    		emoji: "🇸🇲",
    		description: "flag: San Marino",
    		keywords: [
    			"san marino"
    		]
    	},
    	{
    		unicode: "1F1F8 1F1F3",
    		emoji: "🇸🇳",
    		description: "flag: Senegal",
    		keywords: [
    			"senegal"
    		]
    	},
    	{
    		unicode: "1F1F8 1F1F4",
    		emoji: "🇸🇴",
    		description: "flag: Somalia",
    		keywords: [
    			"somalia"
    		]
    	},
    	{
    		unicode: "1F1F8 1F1F7",
    		emoji: "🇸🇷",
    		description: "flag: Suriname",
    		keywords: [
    			"suriname"
    		]
    	},
    	{
    		unicode: "1F1F8 1F1F8",
    		emoji: "🇸🇸",
    		description: "flag: South Sudan",
    		keywords: [
    			"south sudan"
    		]
    	},
    	{
    		unicode: "1F1F8 1F1F9",
    		emoji: "🇸🇹",
    		description: "flag: São Tomé & Príncipe",
    		keywords: [
    			"são tomé & príncipe"
    		]
    	},
    	{
    		unicode: "1F1F8 1F1FB",
    		emoji: "🇸🇻",
    		description: "flag: El Salvador",
    		keywords: [
    			"el salvador",
    			"salvador"
    		]
    	},
    	{
    		unicode: "1F1F8 1F1FD",
    		emoji: "🇸🇽",
    		description: "flag: Sint Maarten",
    		keywords: [
    			"sint maarten"
    		]
    	},
    	{
    		unicode: "1F1F8 1F1FE",
    		emoji: "🇸🇾",
    		description: "flag: Syria",
    		keywords: [
    			"syria"
    		]
    	},
    	{
    		unicode: "1F1F8 1F1FF",
    		emoji: "🇸🇿",
    		description: "flag: Eswatini",
    		keywords: [
    			"eswatini"
    		]
    	},
    	{
    		unicode: "1F1F9 1F1E6",
    		emoji: "🇹🇦",
    		description: "flag: Tristan da Cunha",
    		keywords: [
    			"tristan da cunha"
    		]
    	},
    	{
    		unicode: "1F1F9 1F1E8",
    		emoji: "🇹🇨",
    		description: "flag: Turks Caicos Islands",
    		keywords: [
    			"turks caicos islands",
    			"turks caicos"
    		]
    	},
    	{
    		unicode: "1F1F9 1F1E9",
    		emoji: "🇹🇩",
    		description: "flag: Chad",
    		keywords: [
    			"chad"
    		]
    	},
    	{
    		unicode: "1F1F9 1F1EB",
    		emoji: "🇹🇫",
    		description: "flag: French Southern Territories",
    		keywords: [
    			"french southern territories"
    		]
    	},
    	{
    		unicode: "1F1F9 1F1EC",
    		emoji: "🇹🇬",
    		description: "flag: Togo",
    		keywords: [
    			"togo"
    		]
    	},
    	{
    		unicode: "1F1F9 1F1ED",
    		emoji: "🇹🇭",
    		description: "flag: Thailand",
    		keywords: [
    			"thailand"
    		]
    	},
    	{
    		unicode: "1F1F9 1F1EF",
    		emoji: "🇹🇯",
    		description: "flag: Tajikistan",
    		keywords: [
    			"tajikistan"
    		]
    	},
    	{
    		unicode: "1F1F9 1F1F0",
    		emoji: "🇹🇰",
    		description: "flag: Tokelau",
    		keywords: [
    			"tokelau"
    		]
    	},
    	{
    		unicode: "1F1F9 1F1F1",
    		emoji: "🇹🇱",
    		description: "flag: Timor-Leste",
    		keywords: [
    			"timor-leste"
    		]
    	},
    	{
    		unicode: "1F1F9 1F1F2",
    		emoji: "🇹🇲",
    		description: "flag: Turkmenistan",
    		keywords: [
    			"turkmenistan"
    		]
    	},
    	{
    		unicode: "1F1F9 1F1F3",
    		emoji: "🇹🇳",
    		description: "flag: Tunisia",
    		keywords: [
    			"tunisia"
    		]
    	},
    	{
    		unicode: "1F1F9 1F1F4",
    		emoji: "🇹🇴",
    		description: "flag: Tonga",
    		keywords: [
    			"tonga"
    		]
    	},
    	{
    		unicode: "1F1F9 1F1F7",
    		emoji: "🇹🇷",
    		description: "flag: Turkey",
    		keywords: [
    			"turkey"
    		]
    	},
    	{
    		unicode: "1F1F9 1F1F9",
    		emoji: "🇹🇹",
    		description: "flag: Trinidad Tobago",
    		keywords: [
    			"trinidad tobago"
    		]
    	},
    	{
    		unicode: "1F1F9 1F1FB",
    		emoji: "🇹🇻",
    		description: "flag: Tuvalu",
    		keywords: [
    			"tuvalu"
    		]
    	},
    	{
    		unicode: "1F1F9 1F1FC",
    		emoji: "🇹🇼",
    		description: "flag: Taiwan",
    		keywords: [
    			"taiwan"
    		]
    	},
    	{
    		unicode: "1F1F9 1F1FF",
    		emoji: "🇹🇿",
    		description: "flag: Tanzania",
    		keywords: [
    			"tanzania"
    		]
    	},
    	{
    		unicode: "1F1FA 1F1E6",
    		emoji: "🇺🇦",
    		description: "flag: Ukraine",
    		keywords: [
    			"ukraine"
    		]
    	},
    	{
    		unicode: "1F1FA 1F1EC",
    		emoji: "🇺🇬",
    		description: "flag: Uganda",
    		keywords: [
    			"uganda"
    		]
    	},
    	{
    		unicode: "1F1FA 1F1F2",
    		emoji: "🇺🇲",
    		description: "flag: U.S. Outlying Islands",
    		keywords: [
    			"u.s. outlying islands",
    			"u.s. outlying"
    		]
    	},
    	{
    		unicode: "1F1FA 1F1F3",
    		emoji: "🇺🇳",
    		description: "flag: United Nations",
    		keywords: [
    			"united nations",
    			"un"
    		]
    	},
    	{
    		unicode: "1F1FA 1F1F8",
    		emoji: "🇺🇸",
    		description: "flag: United States",
    		keywords: [
    			"united states",
    			"usa",
    			"u.s.a"
    		]
    	},
    	{
    		unicode: "1F1FA 1F1FE",
    		emoji: "🇺🇾",
    		description: "flag: Uruguay",
    		keywords: [
    			"uruguay"
    		]
    	},
    	{
    		unicode: "1F1FA 1F1FF",
    		emoji: "🇺🇿",
    		description: "flag: Uzbekistan",
    		keywords: [
    			"uzbekistan"
    		]
    	},
    	{
    		unicode: "1F1FB 1F1E6",
    		emoji: "🇻🇦",
    		description: "flag: Vatican City",
    		keywords: [
    			"vatican city"
    		]
    	},
    	{
    		unicode: "1F1FB 1F1E8",
    		emoji: "🇻🇨",
    		description: "flag: St. Vincent & Grenadines",
    		keywords: [
    			"st. vincent & grenadines",
    			"st. vincent and grenadines"
    		]
    	},
    	{
    		unicode: "1F1FB 1F1EA",
    		emoji: "🇻🇪",
    		description: "flag: Venezuela",
    		keywords: [
    			"venezuela"
    		]
    	},
    	{
    		unicode: "1F1FB 1F1EC",
    		emoji: "🇻🇬",
    		description: "flag: British Virgin Islands",
    		keywords: [
    			"british virgin islands",
    			"british virgin"
    		]
    	},
    	{
    		unicode: "1F1FB 1F1EE",
    		emoji: "🇻🇮",
    		description: "flag: U.S. Virgin Islands",
    		keywords: [
    			"u.s. virgin islands",
    			"u.s. virgin"
    		]
    	},
    	{
    		unicode: "1F1FB 1F1F3",
    		emoji: "🇻🇳",
    		description: "flag: Vietnam",
    		keywords: [
    			"vietnam"
    		]
    	},
    	{
    		unicode: "1F1FB 1F1FA",
    		emoji: "🇻🇺",
    		description: "flag: Vanuatu",
    		keywords: [
    			"vanuatu"
    		]
    	},
    	{
    		unicode: "1F1FC 1F1EB",
    		emoji: "🇼🇫",
    		description: "flag: Wallis & Futuna",
    		keywords: [
    			"wallis & futuna",
    			"wallis and futuna"
    		]
    	},
    	{
    		unicode: "1F1FC 1F1F8",
    		emoji: "🇼🇸",
    		description: "flag: Samoa",
    		keywords: [
    			"samoa"
    		]
    	},
    	{
    		unicode: "1F1FD 1F1F0",
    		emoji: "🇽🇰",
    		description: "flag: Kosovo",
    		keywords: [
    			"kosovo"
    		]
    	},
    	{
    		unicode: "1F1FE 1F1EA",
    		emoji: "🇾🇪",
    		description: "flag: Yemen",
    		keywords: [
    			"yemen"
    		]
    	},
    	{
    		unicode: "1F1FE 1F1F9",
    		emoji: "🇾🇹",
    		description: "flag: Mayotte",
    		keywords: [
    			"mayotte"
    		]
    	},
    	{
    		unicode: "1F1FF 1F1E6",
    		emoji: "🇿🇦",
    		description: "flag: South Africa",
    		keywords: [
    			"south africa"
    		]
    	},
    	{
    		unicode: "1F1FF 1F1F2",
    		emoji: "🇿🇲",
    		description: "flag: Zambia",
    		keywords: [
    			"zambia"
    		]
    	},
    	{
    		unicode: "1F1FF 1F1FC",
    		emoji: "🇿🇼",
    		description: "flag: Zimbabwe",
    		keywords: [
    			"zimbabwe"
    		]
    	},
    	{
    		unicode: "1F3F4 E0067",
    		emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    		description: "flag England",
    		keywords: [
    			"england"
    		]
    	},
    	{
    		unicode: "1F3F4 E0067",
    		emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    		description: "flag: Scotland",
    		keywords: [
    			"scotland"
    		]
    	},
    	{
    		unicode: "1F3F4 E0067",
    		emoji: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
    		description: "flag: Wales",
    		keywords: [
    			"wales"
    		]
    	}
    ];

    /* src/components/translator/buttons.svelte generated by Svelte v3.49.0 */
    const file$1 = "src/components/translator/buttons.svelte";

    // (62:4) {#if $translator.error}
    function create_if_block(ctx) {
    	let strong;
    	let t_value = /*$translator*/ ctx[0].error + "";
    	let t;

    	const block = {
    		c: function create() {
    			strong = element("strong");
    			t = text(t_value);
    			attr_dev(strong, "class", "svelte-otdox1");
    			add_location(strong, file$1, 62, 8, 2068);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, strong, anchor);
    			append_dev(strong, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$translator*/ 1 && t_value !== (t_value = /*$translator*/ ctx[0].error + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(strong);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(62:4) {#if $translator.error}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;
    	let t0;
    	let aside;
    	let button0;
    	let t2;
    	let button1;
    	let mounted;
    	let dispose;
    	let if_block = /*$translator*/ ctx[0].error && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			aside = element("aside");
    			button0 = element("button");
    			button0.textContent = "Clear";
    			t2 = space();
    			button1 = element("button");
    			button1.textContent = "Translate";
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "svelte-otdox1");
    			add_location(button0, file$1, 66, 8, 2136);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "svelte-otdox1");
    			add_location(button1, file$1, 67, 8, 2206);
    			attr_dev(aside, "class", "svelte-otdox1");
    			add_location(aside, file$1, 65, 4, 2120);
    			attr_dev(div, "class", "svelte-otdox1");
    			add_location(div, file$1, 60, 0, 2026);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			append_dev(div, t0);
    			append_dev(div, aside);
    			append_dev(aside, button0);
    			append_dev(aside, t2);
    			append_dev(aside, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*handleClear*/ ctx[1], false, false, false),
    					listen_dev(button1, "click", /*handleTranslate*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$translator*/ ctx[0].error) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $translator;
    	validate_store(translator, 'translator');
    	component_subscribe($$self, translator, $$value => $$invalidate(0, $translator = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Buttons', slots, []);

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

    				if (collectEmojis.find(ce => ce.keyword === keyword)) {
    					break;
    				}

    				if (regexReplaceByEmoji.test(translated)) {
    					translated = translated.replace(regexReplaceByEmoji, ` ${emoji.emoji}`).replace(regexRemoveSpace, `${emoji.emoji} $1`);
    					collectEmojis.push({ keyword, emoji: emoji.emoji });
    				}
    			}
    		}

    		for (let m = 0; m < collectEmojis.length; m += 1) {
    			const emoji = collectEmojis[m];
    			const regexEmoji = new RegExp(`(${collectEmojis[m].emoji})`);
    			const regexBreakLines = new RegExp('\\n', 'g');
    			translated = translated.replace(regexEmoji, `<span title="${emoji.keyword}">$1</span>`).replace(regexBreakLines, '<br />');
    		}

    		translator.updateLast(text);
    		translator.updatedTranslated(translated);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Buttons> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		translator,
    		JSON_EMOJI,
    		handleClear,
    		handleTranslate,
    		$translator
    	});

    	return [$translator, handleClear, handleTranslate];
    }

    class Buttons extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Buttons",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/components/translator/translator.svelte generated by Svelte v3.49.0 */
    const file = "src/components/translator/translator.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let textarea;
    	let textarea_value_value;
    	let t0;
    	let footer;
    	let buttons;
    	let t1;
    	let output;
    	let raw_value = /*$translator*/ ctx[0].translated + "";
    	let current;
    	let mounted;
    	let dispose;
    	buttons = new Buttons({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			textarea = element("textarea");
    			t0 = space();
    			footer = element("footer");
    			create_component(buttons.$$.fragment);
    			t1 = space();
    			output = element("output");
    			attr_dev(textarea, "placeholder", "Enter your text in english, for example: I want to go to Japan to visit the Tokyo tower");
    			textarea.value = textarea_value_value = /*$translator*/ ctx[0].text;
    			attr_dev(textarea, "class", "svelte-cwhi7z");
    			add_location(textarea, file, 10, 4, 228);
    			attr_dev(output, "class", "svelte-cwhi7z");
    			add_location(output, file, 17, 8, 461);
    			add_location(footer, file, 15, 4, 424);
    			attr_dev(div, "class", "translator svelte-cwhi7z");
    			add_location(div, file, 9, 0, 199);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, textarea);
    			append_dev(div, t0);
    			append_dev(div, footer);
    			mount_component(buttons, footer, null);
    			append_dev(footer, t1);
    			append_dev(footer, output);
    			output.innerHTML = raw_value;
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(textarea, "input", /*handleChange*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*$translator*/ 1 && textarea_value_value !== (textarea_value_value = /*$translator*/ ctx[0].text)) {
    				prop_dev(textarea, "value", textarea_value_value);
    			}

    			if ((!current || dirty & /*$translator*/ 1) && raw_value !== (raw_value = /*$translator*/ ctx[0].translated + "")) output.innerHTML = raw_value;		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(buttons.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(buttons.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(buttons);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $translator;
    	validate_store(translator, 'translator');
    	component_subscribe($$self, translator, $$value => $$invalidate(0, $translator = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Translator', slots, []);

    	function handleChange(event) {
    		translator.updateText(event.target.value);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Translator> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		translator,
    		Buttons,
    		handleChange,
    		$translator
    	});

    	return [$translator, handleChange];
    }

    class Translator extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Translator",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/app.svelte generated by Svelte v3.49.0 */

    // (6:0) <Layout>
    function create_default_slot(ctx) {
    	let translator;
    	let current;
    	translator = new Translator({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(translator.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(translator, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(translator.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(translator.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(translator, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(6:0) <Layout>",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let layout;
    	let current;

    	layout = new Layout({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(layout.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(layout, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const layout_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				layout_changes.$$scope = { dirty, ctx };
    			}

    			layout.$set(layout_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(layout.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(layout.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(layout, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Layout, Translator });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
