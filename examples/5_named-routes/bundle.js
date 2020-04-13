function noop() { }
function assign(tar, src) {
    // @ts-ignore
    for (const k in src)
        tar[k] = src[k];
    return tar;
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
function exclude_internal_props(props) {
    const result = {};
    for (const k in props)
        if (k[0] !== '$')
            result[k] = props[k];
    return result;
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
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function empty() {
    return text('');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function prevent_default(fn) {
    return function (event) {
        event.preventDefault();
        // @ts-ignore
        return fn.call(this, event);
    };
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function set_attributes(node, attributes) {
    // @ts-ignore
    const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
    for (const key in attributes) {
        if (attributes[key] == null) {
            node.removeAttribute(key);
        }
        else if (key === 'style') {
            node.style.cssText = attributes[key];
        }
        else if (key === '__value' || descriptors[key] && descriptors[key].set) {
            node[key] = attributes[key];
        }
        else {
            attr(node, key, attributes[key]);
        }
    }
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_data(text, data) {
    data = '' + data;
    if (text.data !== data)
        text.data = data;
}
function custom_event(type, detail) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, false, false, detail);
    return e;
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error(`Function called outside component initialization`);
    return current_component;
}
function onDestroy(fn) {
    get_current_component().$$.on_destroy.push(fn);
}
function createEventDispatcher() {
    const component = get_current_component();
    return (type, detail) => {
        const callbacks = component.$$.callbacks[type];
        if (callbacks) {
            // TODO are there situations where events could be dispatched
            // in a server (non-DOM) environment?
            const event = custom_event(type, detail);
            callbacks.slice().forEach(fn => {
                fn.call(component, event);
            });
        }
    };
}
function setContext(key, context) {
    get_current_component().$$.context.set(key, context);
}
function getContext(key) {
    return get_current_component().$$.context.get(key);
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
let flushing = false;
const seen_callbacks = new Set();
function flush() {
    if (flushing)
        return;
    flushing = true;
    do {
        // first, call beforeUpdate functions
        // and update components
        for (let i = 0; i < dirty_components.length; i += 1) {
            const component = dirty_components[i];
            set_current_component(component);
            update(component.$$);
        }
        dirty_components.length = 0;
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
    flushing = false;
    seen_callbacks.clear();
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
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
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
}

function get_spread_update(levels, updates) {
    const update = {};
    const to_null_out = {};
    const accounted_for = { $$scope: 1 };
    let i = levels.length;
    while (i--) {
        const o = levels[i];
        const n = updates[i];
        if (n) {
            for (const key in o) {
                if (!(key in n))
                    to_null_out[key] = 1;
            }
            for (const key in n) {
                if (!accounted_for[key]) {
                    update[key] = n[key];
                    accounted_for[key] = 1;
                }
            }
            levels[i] = n;
        }
        else {
            for (const key in o) {
                accounted_for[key] = 1;
            }
        }
    }
    for (const key in to_null_out) {
        if (!(key in update))
            update[key] = undefined;
    }
    return update;
}
function get_spread_object(spread_props) {
    return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
}
function create_component(block) {
    block && block.c();
}
function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
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
function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const prop_values = options.props || {};
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
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, prop_values, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if ($$.bound[i])
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
        mount_component(component, options.target, options.anchor);
        flush();
    }
    set_current_component(parent_component);
}
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
    $set() {
        // overridden by instance, if it has props
    }
}

/**
 * Tokenize input string.
 */
function lexer(str) {
    var tokens = [];
    var i = 0;
    while (i < str.length) {
        var char = str[i];
        if (char === "*" || char === "+" || char === "?") {
            tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
            continue;
        }
        if (char === "\\") {
            tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
            continue;
        }
        if (char === "{") {
            tokens.push({ type: "OPEN", index: i, value: str[i++] });
            continue;
        }
        if (char === "}") {
            tokens.push({ type: "CLOSE", index: i, value: str[i++] });
            continue;
        }
        if (char === ":") {
            var name = "";
            var j = i + 1;
            while (j < str.length) {
                var code = str.charCodeAt(j);
                if (
                // `0-9`
                (code >= 48 && code <= 57) ||
                    // `A-Z`
                    (code >= 65 && code <= 90) ||
                    // `a-z`
                    (code >= 97 && code <= 122) ||
                    // `_`
                    code === 95) {
                    name += str[j++];
                    continue;
                }
                break;
            }
            if (!name)
                throw new TypeError("Missing parameter name at " + i);
            tokens.push({ type: "NAME", index: i, value: name });
            i = j;
            continue;
        }
        if (char === "(") {
            var count = 1;
            var pattern = "";
            var j = i + 1;
            if (str[j] === "?") {
                throw new TypeError("Pattern cannot start with \"?\" at " + j);
            }
            while (j < str.length) {
                if (str[j] === "\\") {
                    pattern += str[j++] + str[j++];
                    continue;
                }
                if (str[j] === ")") {
                    count--;
                    if (count === 0) {
                        j++;
                        break;
                    }
                }
                else if (str[j] === "(") {
                    count++;
                    if (str[j + 1] !== "?") {
                        throw new TypeError("Capturing groups are not allowed at " + j);
                    }
                }
                pattern += str[j++];
            }
            if (count)
                throw new TypeError("Unbalanced pattern at " + i);
            if (!pattern)
                throw new TypeError("Missing pattern at " + i);
            tokens.push({ type: "PATTERN", index: i, value: pattern });
            i = j;
            continue;
        }
        tokens.push({ type: "CHAR", index: i, value: str[i++] });
    }
    tokens.push({ type: "END", index: i, value: "" });
    return tokens;
}
/**
 * Parse a string for the raw tokens.
 */
function parse(str, options) {
    if (options === void 0) { options = {}; }
    var tokens = lexer(str);
    var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a;
    var defaultPattern = "[^" + escapeString(options.delimiter || "/#?") + "]+?";
    var result = [];
    var key = 0;
    var i = 0;
    var path = "";
    var tryConsume = function (type) {
        if (i < tokens.length && tokens[i].type === type)
            return tokens[i++].value;
    };
    var mustConsume = function (type) {
        var value = tryConsume(type);
        if (value !== undefined)
            return value;
        var _a = tokens[i], nextType = _a.type, index = _a.index;
        throw new TypeError("Unexpected " + nextType + " at " + index + ", expected " + type);
    };
    var consumeText = function () {
        var result = "";
        var value;
        // tslint:disable-next-line
        while ((value = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR"))) {
            result += value;
        }
        return result;
    };
    while (i < tokens.length) {
        var char = tryConsume("CHAR");
        var name = tryConsume("NAME");
        var pattern = tryConsume("PATTERN");
        if (name || pattern) {
            var prefix = char || "";
            if (prefixes.indexOf(prefix) === -1) {
                path += prefix;
                prefix = "";
            }
            if (path) {
                result.push(path);
                path = "";
            }
            result.push({
                name: name || key++,
                prefix: prefix,
                suffix: "",
                pattern: pattern || defaultPattern,
                modifier: tryConsume("MODIFIER") || ""
            });
            continue;
        }
        var value = char || tryConsume("ESCAPED_CHAR");
        if (value) {
            path += value;
            continue;
        }
        if (path) {
            result.push(path);
            path = "";
        }
        var open = tryConsume("OPEN");
        if (open) {
            var prefix = consumeText();
            var name_1 = tryConsume("NAME") || "";
            var pattern_1 = tryConsume("PATTERN") || "";
            var suffix = consumeText();
            mustConsume("CLOSE");
            result.push({
                name: name_1 || (pattern_1 ? key++ : ""),
                pattern: name_1 && !pattern_1 ? defaultPattern : pattern_1,
                prefix: prefix,
                suffix: suffix,
                modifier: tryConsume("MODIFIER") || ""
            });
            continue;
        }
        mustConsume("END");
    }
    return result;
}
/**
 * Compile a string to a template function for the path.
 */
function compile(str, options) {
    return tokensToFunction(parse(str, options), options);
}
/**
 * Expose a method for transforming tokens into the path function.
 */
function tokensToFunction(tokens, options) {
    if (options === void 0) { options = {}; }
    var reFlags = flags(options);
    var _a = options.encode, encode = _a === void 0 ? function (x) { return x; } : _a, _b = options.validate, validate = _b === void 0 ? true : _b;
    // Compile all the tokens into regexps.
    var matches = tokens.map(function (token) {
        if (typeof token === "object") {
            return new RegExp("^(?:" + token.pattern + ")$", reFlags);
        }
    });
    return function (data) {
        var path = "";
        for (var i = 0; i < tokens.length; i++) {
            var token = tokens[i];
            if (typeof token === "string") {
                path += token;
                continue;
            }
            var value = data ? data[token.name] : undefined;
            var optional = token.modifier === "?" || token.modifier === "*";
            var repeat = token.modifier === "*" || token.modifier === "+";
            if (Array.isArray(value)) {
                if (!repeat) {
                    throw new TypeError("Expected \"" + token.name + "\" to not repeat, but got an array");
                }
                if (value.length === 0) {
                    if (optional)
                        continue;
                    throw new TypeError("Expected \"" + token.name + "\" to not be empty");
                }
                for (var j = 0; j < value.length; j++) {
                    var segment = encode(value[j], token);
                    if (validate && !matches[i].test(segment)) {
                        throw new TypeError("Expected all \"" + token.name + "\" to match \"" + token.pattern + "\", but got \"" + segment + "\"");
                    }
                    path += token.prefix + segment + token.suffix;
                }
                continue;
            }
            if (typeof value === "string" || typeof value === "number") {
                var segment = encode(String(value), token);
                if (validate && !matches[i].test(segment)) {
                    throw new TypeError("Expected \"" + token.name + "\" to match \"" + token.pattern + "\", but got \"" + segment + "\"");
                }
                path += token.prefix + segment + token.suffix;
                continue;
            }
            if (optional)
                continue;
            var typeOfMessage = repeat ? "an array" : "a string";
            throw new TypeError("Expected \"" + token.name + "\" to be " + typeOfMessage);
        }
        return path;
    };
}
/**
 * Escape a regular expression string.
 */
function escapeString(str) {
    return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
/**
 * Get the flags for a regexp from the options.
 */
function flags(options) {
    return options && options.sensitive ? "" : "i";
}
/**
 * Pull out keys from a regexp.
 */
function regexpToRegexp(path, keys) {
    if (!keys)
        return path;
    // Use a negative lookahead to match only capturing groups.
    var groups = path.source.match(/\((?!\?)/g);
    if (groups) {
        for (var i = 0; i < groups.length; i++) {
            keys.push({
                name: i,
                prefix: "",
                suffix: "",
                modifier: "",
                pattern: ""
            });
        }
    }
    return path;
}
/**
 * Transform an array into a regexp.
 */
function arrayToRegexp(paths, keys, options) {
    var parts = paths.map(function (path) { return pathToRegexp(path, keys, options).source; });
    return new RegExp("(?:" + parts.join("|") + ")", flags(options));
}
/**
 * Create a path regexp from string input.
 */
function stringToRegexp(path, keys, options) {
    return tokensToRegexp(parse(path, options), keys, options);
}
/**
 * Expose a function for taking tokens and returning a RegExp.
 */
function tokensToRegexp(tokens, keys, options) {
    if (options === void 0) { options = {}; }
    var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function (x) { return x; } : _d;
    var endsWith = "[" + escapeString(options.endsWith || "") + "]|$";
    var delimiter = "[" + escapeString(options.delimiter || "/#?") + "]";
    var route = start ? "^" : "";
    // Iterate over the tokens and create our regexp string.
    for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
        var token = tokens_1[_i];
        if (typeof token === "string") {
            route += escapeString(encode(token));
        }
        else {
            var prefix = escapeString(encode(token.prefix));
            var suffix = escapeString(encode(token.suffix));
            if (token.pattern) {
                if (keys)
                    keys.push(token);
                if (prefix || suffix) {
                    if (token.modifier === "+" || token.modifier === "*") {
                        var mod = token.modifier === "*" ? "?" : "";
                        route += "(?:" + prefix + "((?:" + token.pattern + ")(?:" + suffix + prefix + "(?:" + token.pattern + "))*)" + suffix + ")" + mod;
                    }
                    else {
                        route += "(?:" + prefix + "(" + token.pattern + ")" + suffix + ")" + token.modifier;
                    }
                }
                else {
                    route += "(" + token.pattern + ")" + token.modifier;
                }
            }
            else {
                route += "(?:" + prefix + suffix + ")" + token.modifier;
            }
        }
    }
    if (end) {
        if (!strict)
            route += delimiter + "?";
        route += !options.endsWith ? "$" : "(?=" + endsWith + ")";
    }
    else {
        var endToken = tokens[tokens.length - 1];
        var isEndDelimited = typeof endToken === "string"
            ? delimiter.indexOf(endToken[endToken.length - 1]) > -1
            : // tslint:disable-next-line
                endToken === undefined;
        if (!strict) {
            route += "(?:" + delimiter + "(?=" + endsWith + "))?";
        }
        if (!isEndDelimited) {
            route += "(?=" + delimiter + "|" + endsWith + ")";
        }
    }
    return new RegExp(route, flags(options));
}
/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 */
function pathToRegexp(path, keys, options) {
    if (path instanceof RegExp)
        return regexpToRegexp(path, keys);
    if (Array.isArray(path))
        return arrayToRegexp(path, keys, options);
    return stringToRegexp(path, keys, options);
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var strictUriEncode = str => encodeURIComponent(str).replace(/[!'()*]/g, x => `%${x.charCodeAt(0).toString(16).toUpperCase()}`);

var token = '%[a-f0-9]{2}';
var singleMatcher = new RegExp(token, 'gi');
var multiMatcher = new RegExp('(' + token + ')+', 'gi');

function decodeComponents(components, split) {
	try {
		// Try to decode the entire string first
		return decodeURIComponent(components.join(''));
	} catch (err) {
		// Do nothing
	}

	if (components.length === 1) {
		return components;
	}

	split = split || 1;

	// Split the array in 2 parts
	var left = components.slice(0, split);
	var right = components.slice(split);

	return Array.prototype.concat.call([], decodeComponents(left), decodeComponents(right));
}

function decode(input) {
	try {
		return decodeURIComponent(input);
	} catch (err) {
		var tokens = input.match(singleMatcher);

		for (var i = 1; i < tokens.length; i++) {
			input = decodeComponents(tokens, i).join('');

			tokens = input.match(singleMatcher);
		}

		return input;
	}
}

function customDecodeURIComponent(input) {
	// Keep track of all the replacements and prefill the map with the `BOM`
	var replaceMap = {
		'%FE%FF': '\uFFFD\uFFFD',
		'%FF%FE': '\uFFFD\uFFFD'
	};

	var match = multiMatcher.exec(input);
	while (match) {
		try {
			// Decode as big chunks as possible
			replaceMap[match[0]] = decodeURIComponent(match[0]);
		} catch (err) {
			var result = decode(match[0]);

			if (result !== match[0]) {
				replaceMap[match[0]] = result;
			}
		}

		match = multiMatcher.exec(input);
	}

	// Add `%C2` at the end of the map to make sure it does not replace the combinator before everything else
	replaceMap['%C2'] = '\uFFFD';

	var entries = Object.keys(replaceMap);

	for (var i = 0; i < entries.length; i++) {
		// Replace all decoded components
		var key = entries[i];
		input = input.replace(new RegExp(key, 'g'), replaceMap[key]);
	}

	return input;
}

var decodeUriComponent = function (encodedURI) {
	if (typeof encodedURI !== 'string') {
		throw new TypeError('Expected `encodedURI` to be of type `string`, got `' + typeof encodedURI + '`');
	}

	try {
		encodedURI = encodedURI.replace(/\+/g, ' ');

		// Try the built in decoder first
		return decodeURIComponent(encodedURI);
	} catch (err) {
		// Fallback to a more advanced decoder
		return customDecodeURIComponent(encodedURI);
	}
};

var splitOnFirst = (string, separator) => {
	if (!(typeof string === 'string' && typeof separator === 'string')) {
		throw new TypeError('Expected the arguments to be of type `string`');
	}

	if (separator === '') {
		return [string];
	}

	const separatorIndex = string.indexOf(separator);

	if (separatorIndex === -1) {
		return [string];
	}

	return [
		string.slice(0, separatorIndex),
		string.slice(separatorIndex + separator.length)
	];
};

var queryString = createCommonjsModule(function (module, exports) {




function encoderForArrayFormat(options) {
	switch (options.arrayFormat) {
		case 'index':
			return key => (result, value) => {
				const index = result.length;
				if (value === undefined || (options.skipNull && value === null)) {
					return result;
				}

				if (value === null) {
					return [...result, [encode(key, options), '[', index, ']'].join('')];
				}

				return [
					...result,
					[encode(key, options), '[', encode(index, options), ']=', encode(value, options)].join('')
				];
			};

		case 'bracket':
			return key => (result, value) => {
				if (value === undefined || (options.skipNull && value === null)) {
					return result;
				}

				if (value === null) {
					return [...result, [encode(key, options), '[]'].join('')];
				}

				return [...result, [encode(key, options), '[]=', encode(value, options)].join('')];
			};

		case 'comma':
		case 'separator':
			return key => (result, value) => {
				if (value === null || value === undefined || value.length === 0) {
					return result;
				}

				if (result.length === 0) {
					return [[encode(key, options), '=', encode(value, options)].join('')];
				}

				return [[result, encode(value, options)].join(options.arrayFormatSeparator)];
			};

		default:
			return key => (result, value) => {
				if (value === undefined || (options.skipNull && value === null)) {
					return result;
				}

				if (value === null) {
					return [...result, encode(key, options)];
				}

				return [...result, [encode(key, options), '=', encode(value, options)].join('')];
			};
	}
}

function parserForArrayFormat(options) {
	let result;

	switch (options.arrayFormat) {
		case 'index':
			return (key, value, accumulator) => {
				result = /\[(\d*)\]$/.exec(key);

				key = key.replace(/\[\d*\]$/, '');

				if (!result) {
					accumulator[key] = value;
					return;
				}

				if (accumulator[key] === undefined) {
					accumulator[key] = {};
				}

				accumulator[key][result[1]] = value;
			};

		case 'bracket':
			return (key, value, accumulator) => {
				result = /(\[\])$/.exec(key);
				key = key.replace(/\[\]$/, '');

				if (!result) {
					accumulator[key] = value;
					return;
				}

				if (accumulator[key] === undefined) {
					accumulator[key] = [value];
					return;
				}

				accumulator[key] = [].concat(accumulator[key], value);
			};

		case 'comma':
		case 'separator':
			return (key, value, accumulator) => {
				const isArray = typeof value === 'string' && value.split('').indexOf(options.arrayFormatSeparator) > -1;
				const newValue = isArray ? value.split(options.arrayFormatSeparator).map(item => decode(item, options)) : value === null ? value : decode(value, options);
				accumulator[key] = newValue;
			};

		default:
			return (key, value, accumulator) => {
				if (accumulator[key] === undefined) {
					accumulator[key] = value;
					return;
				}

				accumulator[key] = [].concat(accumulator[key], value);
			};
	}
}

function validateArrayFormatSeparator(value) {
	if (typeof value !== 'string' || value.length !== 1) {
		throw new TypeError('arrayFormatSeparator must be single character string');
	}
}

function encode(value, options) {
	if (options.encode) {
		return options.strict ? strictUriEncode(value) : encodeURIComponent(value);
	}

	return value;
}

function decode(value, options) {
	if (options.decode) {
		return decodeUriComponent(value);
	}

	return value;
}

function keysSorter(input) {
	if (Array.isArray(input)) {
		return input.sort();
	}

	if (typeof input === 'object') {
		return keysSorter(Object.keys(input))
			.sort((a, b) => Number(a) - Number(b))
			.map(key => input[key]);
	}

	return input;
}

function removeHash(input) {
	const hashStart = input.indexOf('#');
	if (hashStart !== -1) {
		input = input.slice(0, hashStart);
	}

	return input;
}

function getHash(url) {
	let hash = '';
	const hashStart = url.indexOf('#');
	if (hashStart !== -1) {
		hash = url.slice(hashStart);
	}

	return hash;
}

function extract(input) {
	input = removeHash(input);
	const queryStart = input.indexOf('?');
	if (queryStart === -1) {
		return '';
	}

	return input.slice(queryStart + 1);
}

function parseValue(value, options) {
	if (options.parseNumbers && !Number.isNaN(Number(value)) && (typeof value === 'string' && value.trim() !== '')) {
		value = Number(value);
	} else if (options.parseBooleans && value !== null && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')) {
		value = value.toLowerCase() === 'true';
	}

	return value;
}

function parse(input, options) {
	options = Object.assign({
		decode: true,
		sort: true,
		arrayFormat: 'none',
		arrayFormatSeparator: ',',
		parseNumbers: false,
		parseBooleans: false
	}, options);

	validateArrayFormatSeparator(options.arrayFormatSeparator);

	const formatter = parserForArrayFormat(options);

	// Create an object with no prototype
	const ret = Object.create(null);

	if (typeof input !== 'string') {
		return ret;
	}

	input = input.trim().replace(/^[?#&]/, '');

	if (!input) {
		return ret;
	}

	for (const param of input.split('&')) {
		let [key, value] = splitOnFirst(options.decode ? param.replace(/\+/g, ' ') : param, '=');

		// Missing `=` should be `null`:
		// http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
		value = value === undefined ? null : options.arrayFormat === 'comma' ? value : decode(value, options);
		formatter(decode(key, options), value, ret);
	}

	for (const key of Object.keys(ret)) {
		const value = ret[key];
		if (typeof value === 'object' && value !== null) {
			for (const k of Object.keys(value)) {
				value[k] = parseValue(value[k], options);
			}
		} else {
			ret[key] = parseValue(value, options);
		}
	}

	if (options.sort === false) {
		return ret;
	}

	return (options.sort === true ? Object.keys(ret).sort() : Object.keys(ret).sort(options.sort)).reduce((result, key) => {
		const value = ret[key];
		if (Boolean(value) && typeof value === 'object' && !Array.isArray(value)) {
			// Sort object keys, not values
			result[key] = keysSorter(value);
		} else {
			result[key] = value;
		}

		return result;
	}, Object.create(null));
}

exports.extract = extract;
exports.parse = parse;

exports.stringify = (object, options) => {
	if (!object) {
		return '';
	}

	options = Object.assign({
		encode: true,
		strict: true,
		arrayFormat: 'none',
		arrayFormatSeparator: ','
	}, options);

	validateArrayFormatSeparator(options.arrayFormatSeparator);

	const formatter = encoderForArrayFormat(options);

	const objectCopy = Object.assign({}, object);
	if (options.skipNull) {
		for (const key of Object.keys(objectCopy)) {
			if (objectCopy[key] === undefined || objectCopy[key] === null) {
				delete objectCopy[key];
			}
		}
	}

	const keys = Object.keys(objectCopy);

	if (options.sort !== false) {
		keys.sort(options.sort);
	}

	return keys.map(key => {
		const value = object[key];

		if (value === undefined) {
			return '';
		}

		if (value === null) {
			return encode(key, options);
		}

		if (Array.isArray(value)) {
			return value
				.reduce(formatter(key), [])
				.join('&');
		}

		return encode(key, options) + '=' + encode(value, options);
	}).filter(x => x.length > 0).join('&');
};

exports.parseUrl = (input, options) => {
	return {
		url: removeHash(input).split('?')[0] || '',
		query: parse(extract(input), options)
	};
};

exports.stringifyUrl = (input, options) => {
	const url = removeHash(input.url).split('?')[0] || '';
	const queryFromUrl = exports.extract(input.url);
	const parsedQueryFromUrl = exports.parse(queryFromUrl);
	const hash = getHash(input.url);
	const query = Object.assign(parsedQueryFromUrl, input.query);
	let queryString = exports.stringify(query, options);
	if (queryString) {
		queryString = `?${queryString}`;
	}

	return `${url}${queryString}${hash}`;
};
});
var queryString_1 = queryString.extract;
var queryString_2 = queryString.parse;
var queryString_3 = queryString.stringify;
var queryString_4 = queryString.parseUrl;
var queryString_5 = queryString.stringifyUrl;

/**
 * routeParser
 * Inspired from https://github.com/pillarjs/path-match
 *
 * parse a pathname given a path (see https://www.npmjs.com/package/path-to-regexp)
 *
 * returns an object if the path matches, populated with the possible params
 */
function routeParser(options) {
  options = options || {};

  return function (path) {
    var keys = [];
    var re = pathToRegexp(path, keys, options);

    return function (pathname) {
      var m = re.exec(pathname);
      if (!m) return false;

      let params = {};

      var key, param;
      for (var i = 0; i < keys.length; i++) {
        key = keys[i];
        param = m[i + 1];
        if (!param) continue;
        params[key.name] = decodeURIComponent(param);
        if (key.repeat)
          params[key.name] = params[key.name].split(key.delimiter);
      }

      return {
        path: m[0],
        params,
      };
    };
  };
}

/**
 * Return a function that will be able to compile an uri
 * given a path and an object of parameters
 *
 * See https://www.npmjs.com/package/path-to-regexp#compile-reverse-path-to-regexp
 * @param {String} path
 *
 * usage: compiler('/path/:param')({ param: 1}) // => '/path/1'
 */
function compiler(path) {
  return compile(path, { encode: encodeURIComponent });
}

const parser = routeParser({
  // path-to-regexp options
  sensitive: false,
  strict: false,
  end: false,
});

const parser_to_end = routeParser({
  // path-to-regexp options
  sensitive: false,
  strict: false,
  end: true,
});

/**
 * Get current location parts used by the Router
 * @param {Object} options
 */
function getLocationInfos() {
  // @TODO: change to make it SSR friendly?!
  const pathname = location.pathname;
  const hash = location.hash || '#'; // if hash === ''
  const query = queryString_2(location.search || '');

  return {
    pathname,
    hash,
    query,
  };
}

/**
 * Guess the BaseName to add before Links
 * Will look for a base
 * Else will use location.pathname
 */
function guessBasename() {
  try {
    const _base = document.querySelector('head base');
    if (_base) {
      return _base.href.replace(location.origin, '');
    }

    return location.pathname;
  } catch (e) {
    return '';
  }
}

class Group {
  constructor(name) {
    this.name = name;
    this.routes = [];
  }

  /**
   * Register a route to the Group
   */
  registerRoute(route) {
    const index = this.routes.indexOf(route);
    if (index === -1) {
      this.routes.push(route);
      // order routes
      this.routes.sort((a, b) => {
        return a.group.order - b.group.order;
      });
    }
  }

  /**
   * Unregister a Route from the Group
   */
  unregisterRoute(route) {
    const index = this.routes.indexOf(route);
    if (index !== -1) {
      this.routes.splice(index, 1);
    }
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
    const subscribers = [];
    function set(new_value) {
        if (safe_not_equal(value, new_value)) {
            value = new_value;
            if (stop) { // store is ready
                const run_queue = !subscriber_queue.length;
                for (let i = 0; i < subscribers.length; i += 1) {
                    const s = subscribers[i];
                    s[1]();
                    subscriber_queue.push(s, value);
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
        subscribers.push(subscriber);
        if (subscribers.length === 1) {
            stop = start(set) || noop;
        }
        run(value);
        return () => {
            const index = subscribers.indexOf(subscriber);
            if (index !== -1) {
                subscribers.splice(index, 1);
            }
            if (subscribers.length === 0) {
                stop();
                stop = null;
            }
        };
    }
    return { set, update, subscribe };
}

class Route {
  constructor(id, path, exact, is, group) {
    this.id = id;
    this.path = path;
    this.exact = exact;
    this.is = is;
    this.group = group;
    this.match = false;

    this.useHash = path[0] == '#';
    this.parser = parser(path);
    this.parser_to_end = parser_to_end(path);

    let store_data = {
      match: this.match,
    };

    // set a readable store for the Route components to see
    let { subscribe, update } = writable(store_data);

    this.updateStore = update;
    this.store = { subscribe };
  }

  /**
   * Tells if this route matches the given path
   *
   * specify if current path is an exact match
   * also returns params if there are
   */
  test(path) {
    // if the route match
    const match = this.parser(path);
    if (match) {
      // if the route is the exact route for given url
      const is_exact = !!this.parser_to_end(path);
      // if the route should only be shown when it's the exact one
      if (!this.exact || is_exact) {
        return {
          is_matching: true,
          is_exact: is_exact,
          params: match.params,
          path: match.path,
        };
      }
    }

    return { is_matching: false };
  }

  /**
   * Update current route match property
   * And the store associated to the route
   * so Route component can update
   */
  updateMatch(match) {
    this.match = match;
    this.updateStore((store_data) => {
      return {
        ...store_data,
        match,
      };
    });
  }
}

class Router {
  constructor(basename, locationInfos) {
    this.basename = basename;
    this.locationInfos = locationInfos;

    this.groups = {};
    this.routes = [];

    this.routes_id = 0;
    this.groups_id = 0;
    this.waiting_for_tick = false;
  }

  /**
   * Pass through all the routes
   * and update them according of their match to the current location path
   */
  change(locationInfos = null) {
    // update locationInfos if provided
    if (locationInfos) {
      this.locationInfos = locationInfos;
    }

    // go throug all routes
    // update match for the one that have a change
    const routes = this.routes;
    for (let i = 0; i < routes.length; i++) {
      if (!routes[i].group) {
        this.testRoute(routes[i]);
      }
    }

    const groups = this.groups;
    Object.keys(groups).forEach((group_name) =>
      this.testGroup(groups[group_name])
    );
  }

  /**
   * Register a new Route in the router
   */
  registerRoute(path, exact, is, routeGroup = null) {
    const routes = this.routes;

    const id = 'route_' + this.routes_id++;

    if (path[0] !== '#') {
      path = (this.basename + path).replace('//', '/');
    }

    const route = new Route(id, path, exact, is, routeGroup);
    routes.push(route);

    if (routeGroup) {
      const groups = this.groups;
      if (!groups[routeGroup.name]) {
        this.registerGroup(routeGroup.name);
      }

      const group = groups[routeGroup.name];
      group.registerRoute(route);

      //trigger group matching process
      this.testGroup(group);
    } else {
      // triggers the route matching process
      this.testRoute(route);
    }

    return route;
  }

  /**
   * Unregister a route from the Router
   */
  unregisterRoute(route) {
    // remove route from routes
    const routes = this.routes;
    const index = routes.indexOf(route);
    if (index !== -1) {
      routes.splice(index, 1);
    }

    // if grouped route, remove from it
    if (route.group && groups[route.group]) {
      const groups = this.groups;
      groups[route.group].unregisterRoute(route);
      // redo group matching if not empty
      if (groups.routes.length !== 0) {
        this.testGroup(groups[route.group]);
      } else {
        // else unregister group
        unregisterGroup(route.group);
      }
    }
  }

  /**
   * Register a Group in the Router
   */
  registerGroup(group_name) {
    const groups = this.groups;
    if (!groups[group_name]) {
      groups[group_name] = new Group(group_name);
    }

    return groups[group_name];
  }

  /**
   * Unregister a Group from the router
   */
  unregisterGroup(group_name) {
    const groups = this.groups;
    delete groups[group_name];
  }

  /**
   * Test a route against current location
   *
   * returns the corresponding match object
   */
  getRouteMatch(route) {
    let current_path = this.locationInfos.pathname;
    if (route.useHash) {
      current_path = this.locationInfos.hash;
    }

    const route_match = route.test(current_path);
    return route_match;
  }

  /**
   * Test a route and update its matching state
   */
  testRoute(route) {
    const route_match = this.getRouteMatch(route);

    if (route_match && route_match.is_matching) {
      let match = {
        is_matching: route_match.is_matching,
        is_exact: route_match.is_exact || false,
        params: route_match.params || null,
        path: route_match.path || null,
        location: { ...this.locationInfos },
      };

      route.updateMatch(match);
    } else if (route.match) {
      // else if route was currently matching, set to false
      route.updateMatch(false);
    }
  }

  /**
   * Test routes from a Group
   * if one matches, show this one
   * if none match, and there is a fallback, show this one
   * all others are hidden
   */
  testGroup(group) {
    const routes = group.routes;

    let fallback = null;
    let is_fallback = false;
    // go through group routes
    // if there is one or more matches, select the first one
    const match = { id: null };
    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      const route_match = this.getRouteMatch(route);
      if (route_match.is_matching) {
        match.id = route.id;
        match.route_match = route_match;
        break;
      }

      // save the fallback route
      if (!fallback && route.group.fallback) {
        fallback = route;
      }
    }

    // If no route matches, but the group is set to fallback to last route
    if (null === match.id && fallback) {
      match.id = fallback.id;
      match.route_match = { is_matching: false };
      is_fallback = true;
    }

    // go again through all group routes and select the right one - if there is one -
    // deactivate the one that might have been selected
    routes.forEach((route) => {
      if (route.id === match.id) {
        const route_match = match.route_match;
        route.updateMatch({
          is_matching: route_match.is_matching,
          is_exact: route_match.is_exact || false,
          path: route_match.path || null,
          params: route_match.params || null,
          location: { ...this.locationInfos },
          is_fallback,
        });
      } else if (route.match) {
        route.updateMatch(false);
      }
    });
  }
}

class Link {
  constructor(to, params, basename, locationInfos) {
    this.basename = basename;
    this.setTo(to);
    this.params = params;
    this.locationInfos = locationInfos;

    this.compileHref();
    this.active = this.test();

    this._store = writable({
      active: this.active,
      href: this.href,
    });

    this.store = {
      subscribe: this._store.subscribe,
      update: (params) => this.updateParams(params),
    };
  }

  setTo(to) {
    if (to[0] !== '#' && to.indexOf(this.basename) === -1) {
      to = this.basename + to;
    }

    this.to = to.replace('//', '/');
    this.compiler = compiler(this.to);
    return this;
  }

  compileHref() {
    this.href = this.compiler(this.params);
    this.parser = parser_to_end(this.href);
    return this;
  }

  test() {
    if (this.href[0] === '#') {
      return !!this.parser(this.locationInfos.hash);
    } else {
      return !!this.parser(this.locationInfos.pathname);
    }
  }

  update() {
    this.compileHref();
    this.active = this.test();

    this._store.update((data) => {
      data.active = this.active;
      data.href = this.href;
      return data;
    });

    return this;
  }

  updateParams(params) {
    this.params = params;
    this.update();
    return this;
  }

  /**
   * Update link with current location infos
   */
  updateLocation(locationInfos) {
    this.locationInfos = locationInfos;
    this.update();
  }
}

// CONTEXT_KEY used for contexts
const CONTEXT_KEY = {};

// list of all active routerstick
const routers = [];

// list of all links
const links = [];

// named routes liste
const namedRoutes = [];

// save locationInfos
let locationInfos = getLocationInfos();

// default basename for routers
const defaultBasename = guessBasename();

let forceHash = window.location.origin === 'null';

let defaultRouter = null;

/**
 * Used on window location change (goTo or popstate)
 */
async function onStateChanged() {
  // location changed
  locationInfos = getLocationInfos();

  // location changed
  // triggers route matching process on all routers
  updateRouters();

  // go through all Link stores, and update with the new path
  updateLinks();
}
/**
 * Go through all known routers
 * and call the change method
 */
function updateRouters() {
  routers.forEach((router) => router.change(locationInfos));
}

// Returns Router for current Route or Group
function getCurrentRouter() {
  const context = getContext(CONTEXT_KEY);
  if (context) {
    return context.router;
  }

  return getDefaultRouter();
}

function getDefaultRouter() {
  if (!defaultRouter) {
    defaultRouter = registerRouter(defaultBasename, false);
  }

  return defaultRouter;
}

// change browser location to href
function goTo(href, options = {}) {
  if (history && !options.reload) {
    // else check if we can play with history
    if (options.replaceState) {
      history.replaceState({ page: href }, '', href);
    } else {
      history.pushState({ page: href }, '', href);
    }

    if (options.scrollToTop) {
      window.scrollTo(0, 0);
    }

    onStateChanged();
  } else {
    // else go to page the hard way
    location.href = href;
  }
}

// register a new Router
function registerRouter(basename, set_context = true) {
  const router = new Router(basename || defaultBasename, locationInfos);
  routers.push(router);

  // do not set context for default router
  if (set_context) {
    setContext(CONTEXT_KEY, {
      router,
    });
  }

  if (routers.length === 1) {
    window.addEventListener('popstate', onStateChanged);
  }

  onDestroy(() => {
    unregisterRouter(router);
  });

  return router;
}

// unregister a Router
function unregisterRouter(router) {
  const index = routers.indexOf(router);
  if (index !== -1) {
    routers.splice(index, 1);
  }

  if (routers.length === 0) {
    window.removeEventListener('popstate', onStateChanged);
  }
}

// register a new Route
function registerRoute(path, exact, is, routeGroup) {
  const router = getCurrentRouter();

  // force non empty path
  if (path === '') {
    path = '/';
  }

  // force # is hash env
  if (forceHash && path[0] !== '#') {
    path = '#' + path;
  }

  // force trailing /
  if (path[path.length - 1] !== '/') {
    path = path + '/';
  }

  const route = router.registerRoute(path, exact, is, routeGroup);

  if (is) {
    const namedRoute = namedRoutes[is] || { route: null, links: [] };
    if (namedRoute.route) {
      throw new Error(
        `Route name [${is}] already associated with another route with path [${namedRoutes[is].route.path}]`
      );
    }

    namedRoute.route = route;
    namedRoute.links.forEach((link) => link.setTo(route.path).update());
    namedRoutes[is] = namedRoute;
  }

  // unregister the route from the router when component is destroyed
  onDestroy(() => {
    router.unregisterRoute(route);
    if (is) {
      namedRoutes[is].route = null;
      namedRoutes[is].links.forEach((link) => link.setTo('/').update());
    }
  });

  return route.store;
}

// register a link
function registerLink(to, params, route) {
  const router = getCurrentRouter();
  let basename = router.basename || defaultBasename;

  // force non empty path
  if (to === '') {
    to = '/';
  }

  // force # is hash env
  if (forceHash && to[0] !== '#') {
    to = '#' + to;
  }

  // force trailing /
  if (to[to.length - 1] !== '/') {
    to = to + '/';
  }

  const link = new Link(to, params, basename, locationInfos);
  links.push(link);

  // add to namedRoutes
  if (route) {
    const namedRoute = namedRoutes[route] || { route: null, links: [] };
    namedRoute.links.push(link);
    if (namedRoute.route) {
      link.setTo(namedRoute.route.path);
    }

    namedRoutes[route] = namedRoute;
  }

  // unregister the link from the app when component is destroyed
  onDestroy(() => {
    // unregister the link when it is destroyed
    unregisterLink(link);
    // remove from namedRoutes
    if (route) {
      const index = namedRoutes[route].links.indexOf(link);
      if (index !== -1) {
        namedRoutes.links.splice(index, 1);
      }
    }
  });

  return link.store;
}

// unregister a link
function unregisterLink(link) {
  const index = links.indexOf(link);
  if (index !== -1) {
    links.splice(index, 1);
  }
}

// go through all links and updates according to the last known location
function updateLinks() {
  links.forEach((link) => link.updateLocation(locationInfos));
}

/* src/components/Route.svelte generated by Svelte v3.20.1 */

const get_default_slot_changes_1 = dirty => ({
	routeInfos: dirty & /*routeInfos*/ 2,
	match: dirty & /*$route*/ 8,
	props: dirty & /*props*/ 4
});

const get_default_slot_context_1 = ctx => ({
	routeInfos: /*routeInfos*/ ctx[1],
	match: /*$route*/ ctx[3].match,
	props: /*props*/ ctx[2]
});

const get_default_slot_changes = dirty => ({
	routeInfos: dirty & /*routeInfos*/ 2,
	match: dirty & /*$route*/ 8,
	props: dirty & /*props*/ 4
});

const get_default_slot_context = ctx => ({
	routeInfos: /*routeInfos*/ ctx[1],
	match: /*$route*/ ctx[3].match,
	props: /*props*/ ctx[2]
});

// (44:0) {#if $route.match}
function create_if_block(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block_1, create_else_block];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*component*/ ctx[0]) return 0;
		return 1;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_blocks[current_block_type_index].m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				}

				transition_in(if_block, 1);
				if_block.m(if_block_anchor.parentNode, if_block_anchor);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if_blocks[current_block_type_index].d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

// (53:2) {:else}
function create_else_block(ctx) {
	let current;
	const default_slot_template = /*$$slots*/ ctx[13].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[14], get_default_slot_context_1);

	return {
		c() {
			if (default_slot) default_slot.c();
		},
		m(target, anchor) {
			if (default_slot) {
				default_slot.m(target, anchor);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope, routeInfos, $route, props*/ 16398) {
					default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[14], get_default_slot_context_1), get_slot_changes(default_slot_template, /*$$scope*/ ctx[14], dirty, get_default_slot_changes_1));
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (default_slot) default_slot.d(detaching);
		}
	};
}

// (45:2) {#if component}
function create_if_block_1(ctx) {
	let switch_instance_anchor;
	let current;

	const switch_instance_spread_levels = [
		{ routeInfos: /*routeInfos*/ ctx[1] },
		{ match: /*$route*/ ctx[3].match },
		/*props*/ ctx[2]
	];

	var switch_value = /*component*/ ctx[0];

	function switch_props(ctx) {
		let switch_instance_props = {
			$$slots: { default: [create_default_slot] },
			$$scope: { ctx }
		};

		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
		}

		return { props: switch_instance_props };
	}

	if (switch_value) {
		var switch_instance = new switch_value(switch_props(ctx));
	}

	return {
		c() {
			if (switch_instance) create_component(switch_instance.$$.fragment);
			switch_instance_anchor = empty();
		},
		m(target, anchor) {
			if (switch_instance) {
				mount_component(switch_instance, target, anchor);
			}

			insert(target, switch_instance_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const switch_instance_changes = (dirty & /*routeInfos, $route, props*/ 14)
			? get_spread_update(switch_instance_spread_levels, [
					dirty & /*routeInfos*/ 2 && { routeInfos: /*routeInfos*/ ctx[1] },
					dirty & /*$route*/ 8 && { match: /*$route*/ ctx[3].match },
					dirty & /*props*/ 4 && get_spread_object(/*props*/ ctx[2])
				])
			: {};

			if (dirty & /*$$scope, routeInfos, $route, props*/ 16398) {
				switch_instance_changes.$$scope = { dirty, ctx };
			}

			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = new switch_value(switch_props(ctx));
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}
		},
		i(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(switch_instance_anchor);
			if (switch_instance) destroy_component(switch_instance, detaching);
		}
	};
}

// (46:4) <svelte:component       this={component}       {routeInfos}       match={$route.match}       {...props}>
function create_default_slot(ctx) {
	let current;
	const default_slot_template = /*$$slots*/ ctx[13].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[14], get_default_slot_context);

	return {
		c() {
			if (default_slot) default_slot.c();
		},
		m(target, anchor) {
			if (default_slot) {
				default_slot.m(target, anchor);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope, routeInfos, $route, props*/ 16398) {
					default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[14], get_default_slot_context), get_slot_changes(default_slot_template, /*$$scope*/ ctx[14], dirty, get_default_slot_changes));
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function create_fragment(ctx) {
	let if_block_anchor;
	let current;
	let if_block = /*$route*/ ctx[3].match && create_if_block(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if (/*$route*/ ctx[3].match) {
				if (if_block) {
					if_block.p(ctx, dirty);
					transition_in(if_block, 1);
				} else {
					if_block = create_if_block(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let $route;
	let { path = "" } = $$props;
	let { component = null } = $$props;
	let { exact = false } = $$props;
	let { is = null } = $$props;
	let { group = null } = $$props;
	let { order = +Infinity } = $$props;
	let { fallback = false } = $$props;
	let routeGroup = false;

	if (group) {
		routeGroup = { name: group, order, fallback };
	}

	// this is a custom store, automatically updated when location changes
	const route = registerRoute(path, exact, is, routeGroup);

	component_subscribe($$self, route, value => $$invalidate(3, $route = value));

	// passed to the mounted component/slot
	const routeInfos = { path, is, exact };

	if (group) {
		routeInfos.group = group;
		routeInfos.fallback = fallback;
	}

	// passed to the mounted component/slot
	let props = {};

	let { $$slots = {}, $$scope } = $$props;

	$$self.$set = $$new_props => {
		$$invalidate(12, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
		if ("path" in $$new_props) $$invalidate(5, path = $$new_props.path);
		if ("component" in $$new_props) $$invalidate(0, component = $$new_props.component);
		if ("exact" in $$new_props) $$invalidate(6, exact = $$new_props.exact);
		if ("is" in $$new_props) $$invalidate(7, is = $$new_props.is);
		if ("group" in $$new_props) $$invalidate(8, group = $$new_props.group);
		if ("order" in $$new_props) $$invalidate(9, order = $$new_props.order);
		if ("fallback" in $$new_props) $$invalidate(10, fallback = $$new_props.fallback);
		if ("$$scope" in $$new_props) $$invalidate(14, $$scope = $$new_props.$$scope);
	};

	$$self.$$.update = () => {
		 {
			const { path, component, exact, is, group, order, fallback, ...rest } = $$props;
			$$invalidate(2, props = rest);
		}
	};

	$$props = exclude_internal_props($$props);

	return [
		component,
		routeInfos,
		props,
		$route,
		route,
		path,
		exact,
		is,
		group,
		order,
		fallback,
		routeGroup,
		$$props,
		$$slots,
		$$scope
	];
}

class Route$1 extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance, create_fragment, safe_not_equal, {
			path: 5,
			component: 0,
			exact: 6,
			is: 7,
			group: 8,
			order: 9,
			fallback: 10
		});
	}
}

/* src/components/Link.svelte generated by Svelte v3.20.1 */

function create_fragment$1(ctx) {
	let a;
	let current;
	let dispose;
	const default_slot_template = /*$$slots*/ ctx[19].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[18], null);
	let a_levels = [{ href: /*href*/ ctx[2] }, /*props*/ ctx[0], /*localProps*/ ctx[1]];
	let a_data = {};

	for (let i = 0; i < a_levels.length; i += 1) {
		a_data = assign(a_data, a_levels[i]);
	}

	return {
		c() {
			a = element("a");
			if (default_slot) default_slot.c();
			set_attributes(a, a_data);
		},
		m(target, anchor, remount) {
			insert(target, a, anchor);

			if (default_slot) {
				default_slot.m(a, null);
			}

			current = true;
			if (remount) dispose();
			dispose = listen(a, "click", prevent_default(/*onClickHandler*/ ctx[4]));
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 262144) {
					default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[18], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[18], dirty, null));
				}
			}

			set_attributes(a, get_spread_update(a_levels, [
				dirty & /*href*/ 4 && { href: /*href*/ ctx[2] },
				dirty & /*props*/ 1 && /*props*/ ctx[0],
				dirty & /*localProps*/ 2 && /*localProps*/ ctx[1]
			]));
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(a);
			if (default_slot) default_slot.d(detaching);
			dispose();
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	let $props,
		$$unsubscribe_props = noop,
		$$subscribe_props = () => ($$unsubscribe_props(), $$unsubscribe_props = subscribe(props, $$value => $$invalidate(11, $props = $$value)), props);

	let $store,
		$$unsubscribe_store = noop,
		$$subscribe_store = () => ($$unsubscribe_store(), $$unsubscribe_store = subscribe(store, $$value => $$invalidate(12, $store = $$value)), store);

	$$self.$$.on_destroy.push(() => $$unsubscribe_props());
	$$self.$$.on_destroy.push(() => $$unsubscribe_store());
	let { to = "/" } = $$props;
	let { route = "" } = $$props;
	let { action = null } = $$props;
	let { params = {} } = $$props;
	let { navigateOptions = {} } = $$props;
	let setted = 0;

	["to", "route", "action"].forEach(name => {
		if (!!$props[name]) setted++;
	});

	if (setted < 1) {
		throw new Error("Link must have either a to, a route or an action specified");
	} else if (setted > 1) {
		throw new Error("Link can only have one of to, route or action specified at the same time");
	}

	let props = {};
	$$subscribe_props();
	let localProps = {};
	let href = "";
	let store = null;
	$$subscribe_store();

	if (!action) {
		$$subscribe_store(store = registerLink(to, params, route));
	}

	let use_store = !!store;
	const dispatch = createEventDispatcher();

	// handle click
	// dispatch the click event
	// and go to href
	async function onClickHandler(event) {
		if (action !== null && window.history && window.history.length) {
			if (action === "back") window.history.back(); else if (action === "forward") window.history.forward(); else if (action === "go" && params.go) {
				window.history.go(params.go);
			}

			return;
		}

		dispatch("click", event);
		goTo(href, navigateOptions);
		return false;
	}

	// update props coming from store
	function storeUpdated(store) {
		$$invalidate(2, href = store.href);

		if (store.active) {
			$$invalidate(1, localProps = {
				"aria-current": "page",
				"data-active": "active"
			});
		} else {
			$$invalidate(1, localProps = {});
		}
	}

	/**
 *  Save properties that are not used for building the Link
 * So we can add them to the <a>
 */
	function setProps($$props) {
		const { to, route, params, ...rest } = $$props;
		$$subscribe_props($$invalidate(0, props = rest));
	}

	let { $$slots = {}, $$scope } = $$props;

	$$self.$set = $$new_props => {
		$$invalidate(17, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
		if ("to" in $$new_props) $$invalidate(5, to = $$new_props.to);
		if ("route" in $$new_props) $$invalidate(6, route = $$new_props.route);
		if ("action" in $$new_props) $$invalidate(7, action = $$new_props.action);
		if ("params" in $$new_props) $$invalidate(8, params = $$new_props.params);
		if ("navigateOptions" in $$new_props) $$invalidate(9, navigateOptions = $$new_props.navigateOptions);
		if ("$$scope" in $$new_props) $$invalidate(18, $$scope = $$new_props.$$scope);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*store, params*/ 264) {
			// if params change, update store
			 use_store && store.update(params);
		}

		// if props change
		 use_store && setProps($$props);

		if ($$self.$$.dirty & /*$store*/ 4096) {
			// when store changed
			 use_store && storeUpdated($store);
		}
	};

	$$props = exclude_internal_props($$props);

	return [
		props,
		localProps,
		href,
		store,
		onClickHandler,
		to,
		route,
		action,
		params,
		navigateOptions,
		setted,
		$props,
		$store,
		use_store,
		dispatch,
		storeUpdated,
		setProps,
		$$props,
		$$scope,
		$$slots
	];
}

class Link$1 extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
			to: 5,
			route: 6,
			action: 7,
			params: 8,
			navigateOptions: 9
		});
	}
}

/* examples/components/Home.svelte generated by Svelte v3.20.1 */

function create_fragment$2(ctx) {
	let section;

	return {
		c() {
			section = element("section");

			section.innerHTML = `<h1>Home</h1> 
  <p>Home content</p>`;

			attr(section, "class", "page page-home");
		},
		m(target, anchor) {
			insert(target, section, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(section);
		}
	};
}

class Home extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment$2, safe_not_equal, {});
	}
}

/* examples/5_named-routes/src/App.svelte generated by Svelte v3.20.1 */

function create_default_slot_4(ctx) {
	let t;

	return {
		c() {
			t = text("Home");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (14:4) <Link route="page" params={{ page_id: 1 }}>
function create_default_slot_3(ctx) {
	let t;

	return {
		c() {
			t = text("Page 1");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (17:4) <Link route="page" params={{ page_id: 2 }}>
function create_default_slot_2(ctx) {
	let t;

	return {
		c() {
			t = text("Page 2");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (33:4) <Route is="page" path="page/:page_id" let:match>
function create_default_slot_1(ctx) {
	let h1;
	let t0;
	let t1_value = /*match*/ ctx[0].params.page_id + "";
	let t1;
	let t2;
	let p;
	let t3;
	let t4_value = /*match*/ ctx[0].params.page_id + "";
	let t4;

	return {
		c() {
			h1 = element("h1");
			t0 = text("Page ");
			t1 = text(t1_value);
			t2 = space();
			p = element("p");
			t3 = text("Page content: this is page ");
			t4 = text(t4_value);
		},
		m(target, anchor) {
			insert(target, h1, anchor);
			append(h1, t0);
			append(h1, t1);
			insert(target, t2, anchor);
			insert(target, p, anchor);
			append(p, t3);
			append(p, t4);
		},
		p(ctx, dirty) {
			if (dirty & /*match*/ 1 && t1_value !== (t1_value = /*match*/ ctx[0].params.page_id + "")) set_data(t1, t1_value);
			if (dirty & /*match*/ 1 && t4_value !== (t4_value = /*match*/ ctx[0].params.page_id + "")) set_data(t4, t4_value);
		},
		d(detaching) {
			if (detaching) detach(h1);
			if (detaching) detach(t2);
			if (detaching) detach(p);
		}
	};
}

// (40:4) <Route path="page/:page_id" let:match>
function create_default_slot$1(ctx) {
	let h1;
	let t0;
	let t1_value = /*match*/ ctx[0].params.page_id + "";
	let t1;
	let t2;
	let p;
	let t3;
	let t4_value = /*match*/ ctx[0].params.page_id + "";
	let t4;

	return {
		c() {
			h1 = element("h1");
			t0 = text("Page ");
			t1 = text(t1_value);
			t2 = space();
			p = element("p");
			t3 = text("Page aside: this is page ");
			t4 = text(t4_value);
		},
		m(target, anchor) {
			insert(target, h1, anchor);
			append(h1, t0);
			append(h1, t1);
			insert(target, t2, anchor);
			insert(target, p, anchor);
			append(p, t3);
			append(p, t4);
		},
		p(ctx, dirty) {
			if (dirty & /*match*/ 1 && t1_value !== (t1_value = /*match*/ ctx[0].params.page_id + "")) set_data(t1, t1_value);
			if (dirty & /*match*/ 1 && t4_value !== (t4_value = /*match*/ ctx[0].params.page_id + "")) set_data(t4, t4_value);
		},
		d(detaching) {
			if (detaching) detach(h1);
			if (detaching) detach(t2);
			if (detaching) detach(p);
		}
	};
}

function create_fragment$3(ctx) {
	let a;
	let t1;
	let ul;
	let li0;
	let t2;
	let li1;
	let t3;
	let li2;
	let t4;
	let p;
	let t7;
	let main;
	let section;
	let t8;
	let t9;
	let aside;
	let current;

	const link0 = new Link$1({
			props: {
				route: "home",
				$$slots: { default: [create_default_slot_4] },
				$$scope: { ctx }
			}
		});

	const link1 = new Link$1({
			props: {
				route: "page",
				params: { page_id: 1 },
				$$slots: { default: [create_default_slot_3] },
				$$scope: { ctx }
			}
		});

	const link2 = new Link$1({
			props: {
				route: "page",
				params: { page_id: 2 },
				$$slots: { default: [create_default_slot_2] },
				$$scope: { ctx }
			}
		});

	const route0 = new Route$1({
			props: {
				is: "home",
				path: "/",
				exact: true,
				component: Home
			}
		});

	const route1 = new Route$1({
			props: {
				is: "page",
				path: "page/:page_id",
				$$slots: {
					default: [
						create_default_slot_1,
						({ match }) => ({ 0: match }),
						({ match }) => match ? 1 : 0
					]
				},
				$$scope: { ctx }
			}
		});

	const route2 = new Route$1({
			props: {
				path: "page/:page_id",
				$$slots: {
					default: [
						create_default_slot$1,
						({ match }) => ({ 0: match }),
						({ match }) => match ? 1 : 0
					]
				},
				$$scope: { ctx }
			}
		});

	return {
		c() {
			a = element("a");
			a.textContent = "< Back to examples";
			t1 = space();
			ul = element("ul");
			li0 = element("li");
			create_component(link0.$$.fragment);
			t2 = space();
			li1 = element("li");
			create_component(link1.$$.fragment);
			t3 = space();
			li2 = element("li");
			create_component(link2.$$.fragment);
			t4 = space();
			p = element("p");

			p.innerHTML = `
  Route can be named, and Links can directly point to those routes by naming
  them.
  <br>
  The Route&#39;s path will then be used as path to render the right href for the
  Link
`;

			t7 = space();
			main = element("main");
			section = element("section");
			create_component(route0.$$.fragment);
			t8 = space();
			create_component(route1.$$.fragment);
			t9 = space();
			aside = element("aside");
			create_component(route2.$$.fragment);
			attr(a, "class", "back");
			attr(a, "href", "/");
			attr(ul, "class", "menu");
			attr(p, "class", "description");
			attr(section, "class", "content");
		},
		m(target, anchor) {
			insert(target, a, anchor);
			insert(target, t1, anchor);
			insert(target, ul, anchor);
			append(ul, li0);
			mount_component(link0, li0, null);
			append(ul, t2);
			append(ul, li1);
			mount_component(link1, li1, null);
			append(ul, t3);
			append(ul, li2);
			mount_component(link2, li2, null);
			insert(target, t4, anchor);
			insert(target, p, anchor);
			insert(target, t7, anchor);
			insert(target, main, anchor);
			append(main, section);
			mount_component(route0, section, null);
			append(section, t8);
			mount_component(route1, section, null);
			append(main, t9);
			append(main, aside);
			mount_component(route2, aside, null);
			current = true;
		},
		p(ctx, [dirty]) {
			const link0_changes = {};

			if (dirty & /*$$scope*/ 2) {
				link0_changes.$$scope = { dirty, ctx };
			}

			link0.$set(link0_changes);
			const link1_changes = {};

			if (dirty & /*$$scope*/ 2) {
				link1_changes.$$scope = { dirty, ctx };
			}

			link1.$set(link1_changes);
			const link2_changes = {};

			if (dirty & /*$$scope*/ 2) {
				link2_changes.$$scope = { dirty, ctx };
			}

			link2.$set(link2_changes);
			const route1_changes = {};

			if (dirty & /*$$scope, match*/ 3) {
				route1_changes.$$scope = { dirty, ctx };
			}

			route1.$set(route1_changes);
			const route2_changes = {};

			if (dirty & /*$$scope, match*/ 3) {
				route2_changes.$$scope = { dirty, ctx };
			}

			route2.$set(route2_changes);
		},
		i(local) {
			if (current) return;
			transition_in(link0.$$.fragment, local);
			transition_in(link1.$$.fragment, local);
			transition_in(link2.$$.fragment, local);
			transition_in(route0.$$.fragment, local);
			transition_in(route1.$$.fragment, local);
			transition_in(route2.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(link0.$$.fragment, local);
			transition_out(link1.$$.fragment, local);
			transition_out(link2.$$.fragment, local);
			transition_out(route0.$$.fragment, local);
			transition_out(route1.$$.fragment, local);
			transition_out(route2.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(a);
			if (detaching) detach(t1);
			if (detaching) detach(ul);
			destroy_component(link0);
			destroy_component(link1);
			destroy_component(link2);
			if (detaching) detach(t4);
			if (detaching) detach(p);
			if (detaching) detach(t7);
			if (detaching) detach(main);
			destroy_component(route0);
			destroy_component(route1);
			destroy_component(route2);
		}
	};
}

class App extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment$3, safe_not_equal, {});
	}
}

const element$1 = document.querySelector("#app");
new App({ target: element$1 });
