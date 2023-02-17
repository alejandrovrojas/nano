## Nano
Nano is an `eval()`-free template engine.

---

### Usage
As with any template processor, the output is rendered by combining a string template and a data object.

```js
import render from 'https://deno.land/x/nano/mod.ts';

const data = {
	message: 'Hello',
	shout: value => value + '!!!!',
};

const template = `<div>{ shout(message) }</div>`;

const result = await render(template, data);
```

_Result_

```html
<div>Hello!!!!</div>
```

---

### Syntax

#### Expressions

```html
<div>{2 + 2}</div>
```

```html
<div>{my_variable}</div>
```

```html
<div>{nested.property}</div>
```

```html
<div>{nested['bracket']['notation']}</div>
```

```html
<div>{2 + 2 == 4 ? 'Yes' : 'No'}</div>
```

```html
<div>{example_function(my_variable)}</div>
```

```html
<div>{nested.function(other.variable)}</div>
```

```html
<div>{nested(function(1, true, "foo", my_variable))}</div>
```

#### Blocks

```html
{if condition_1}
	<!--foo-->
{else if condition_2}
	<!--bar-->
{else}
	<!--baz-->
{/if}
```

```html
{for item in array_like}
	<div>{ item }</div>
{/for}
```

```html
{for item, index in array_like}
	<div>{ item }</div>
{/for}
```

```html
{for key, value in object_like}
	<div>{ item }</div>
{/for}
```

```html
{for character, index in "hello"}
	<div>{ character }</div>
{/for}
```

```html
{for number, index in 10}
	<div>{ number - 1 } equals { index }</div>
{/for}
```

#### Imports

```html
{import 'subfolder/other_file.html'}
```

The imported module will have access to the same data accessible to the scope it's being imported from:

```html
<!-- list.html -->
{for fruit in fruits}
	{ import 'list_item.html' }
{/for}

<!-- list_item.html -->
<li>{fruit}</li>
```

It's also possible to define/rewrite variables using the `with` keyword along with a list of `(key: value)` pairs

```html
<!-- list.html -->
{for fruit, index in fruits}
	{ import 'list_item.html' with (number: index + 1, other: "thing") }
{/for}

<!-- list_item.html -->
<li>{fruit} no. {number}</li>
```
Before reading a file from disk, the renderer will look for a matching template inside the data object first. If an object key matches the import path, the string value will be loaded as a template. 
```html
{ import 'my_block.html' }
```
```js
// data
{
  'my_block.html': '<div>...</div>'
}
```


---

### If/for block flags
Blocks can be flagged with `!` or `#` (or both) for removing whitespace around HTML tags or escape reserved HTML characters respectively.

#### Remove whitespace `{!...}`
In this example (with whitespace added for clarity), the following `{for}`

```html
{for number in 10} ↩
	⇥ <span>{ number }</span> ↩
{/for}
```

will output

```html
↩
	⇥ <span>1</span> ↩
	⇥ <span>2</span> ↩
	⇥ <span>3</span> ↩
	⇥ <span>4</span> ↩
```

however `{!for}`

```html
{!for number in 10} ↩
	⇥ <span>{ number }</span> ↩
{/for}
```

will output

```html
<span>1</span><span>2</span><span>3</span><span>4</span>
```

#### Escape HTML `{#...}`
Similarly, for a variable named `code` with the value

```js
'<script>/* test */</script>';
```

the tag `{code}` will output

```
<script>/* test */</script>
```

however `{#code}` will output

```html
&lt;script&gt;&#x2F;* test *&#x2F;&lt;&#x2F;script&gt;
```
