## Nano
Nano is a template engine initially made for use with Deno Deploy, which currently doesn't support template engines that rely on eval() for evaluating expressions at runtime. Nano currently supports logical and binary expressions but only using variables passed during the rendering phase and/or primitive values i.e. strings, numbers and booleans. Nano does still support all the basics like if/else/for statements, nested loops, filters, and imports with props. Nano inherits most of its syntax from the most commonly known template engines like Django, Twig, etc.

### Usage
As with most template engines, the output is rendered by combining a string template, a data object, and an optional set of filters.
```js
const template = `<div>Hello {{ name | shout }}</div>`;
const data = {
	name: "Alejandro"
};
const filters = {
	shout: (value: string) => `${value}!`
}

const result = await render(template, data, filters);
```

_Result:_
```html
<div>Hello Alejandro!</div>
```

### Options
An options object can be passed as fourth argument

```js
await render(template, data, filters, options);
```

- `display_comments` _(default: false)_ 
  - whether to display `{# comments #}` in the rendered output
- `import_directory` _(default: '')_ 
  - base directory to prepend to all paths used in `{% import %}` blocks

### Syntax

#### Variable access
Both dot and bracket notation are supported. Undefined/null variables are output as empty strings.
```twig
{{ value.nested.property }}
```
```twig
{{ value['nested']['property'] }}
```

#### Filters
Filters are functions that can be applied to any variable or primitive value. Filters don't support function arguments, but can be chained.
```twig
{{ "Hello" | to_lowercase }}
```
```twig
{{ my_array | first_item | to_uppercase }}
```

#### Expressions
Nano supports logical and binary expressions which can be used in combination with filters and variable/primitive values.
```twig
{{ foo == true && !bar || 200 >= 10 | times_two ? "yes" : "no" | to_uppercase }}
```

#### If / else
```twig
{% if foo > 100 && bar <= 5 | times_two %}
	...
{% elseif baz != "something" || !foo %}
	...
{% else %}
	...
{% endif%}
```

#### Ternary operator
```twig
{{ foo == true ? "yes" : "no" }}
```

#### Loops
```twig
{% for item in items %}
	...
{% endfor %}
```
It's possible to get the index in the loop.
```twig
{% for item, index in items %}
	...
{% endfor %}
```
As well as loop over objects.
```twig
{% for key, value in object %}
	...
{% endfor %}
```
Filters can also be applied to variables.
```twig
{% for item, index in array | filtered | sorted %}
	...
{% endfor %}
```

#### Import
Source code can be imported from other sources.
```twig
{{ import 'subfolder/other_file.html' }}
```
The imported module will have access to the same data and filters from its parent scope:
```twig
{# main.html #}
{% for item in items %}
  {{ import 'file.html' }}
{% endfor %}

{# file.html #}
I can render {{ item }} from here.
```
However it's possible to pass variables as props which allows for greater reusability of components:
```twig
{# main.html #}
{% for item in items %}
  {{ import 'file.html' with { foo: item } }}
{% endfor %}

{# file.html #}
{{ index }} does not exist here, but {{ foo }} does.
```

#### Comments
```twig
{# comments look like this #}
```

#### Escaped output
Nano doesn't provide a built-in method for escaping HTML but this can easily be solved with a filter:

```js
const template = `<code>{{ raw_html | escape }}</code>`;
const data = {
	raw_html: "<script>/**/</script>"
};
const filters = {
	escape: (html_input: string) => {
		const character_map: Record<string, string> = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#39;',
			'`': '&#x60;',
			'=': '&#x3D;',
			'/': '&#x2F;',
		};

		return html_input.replace(/[&<>"'`=\/]/g, (match: string) => character_map[match]);
	}
}

const result = await render(template, data, filters);
```
_Result:_
```html
<code>&lt;script&gt;&#x2F;*test*&#x2F;&lt;&#x2F;script&gt;</code>
```
