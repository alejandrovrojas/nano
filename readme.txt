nano

eval()-free template engine with expression parsing and block structures.
compiles templates to executable functions without eval() or function constructor.
supports nested property access, function calls, conditionals, loops, and imports.
whitespace and html escaping flags for output control. template caching and
file-based imports with data object fallback.

USAGE
    import render from 'https://deno.land/x/nano/mod.ts';

    const data = {
        message: 'Hello',
        shout: (value: string) => value + '!!!!',
    };

    const template = `<div>{shout(message)}</div>`;
    const result = await render(template, data);
    // output: <div>Hello!!!!</div>

EXPRESSIONS
    {2 + 2}
    {my_variable}
    {nested.property}
    {nested['property'][0]}
    {2 + 2 == 4 ? 'Yes' : 'No'}
    {example_function(my_variable)}
    {nested.function(other.variable)}

BLOCKS
    // conditionals
    {if condition_1}
        content
    {else if condition_2}
        content
    {else}
        content
    {/if}

    // loops - arrays, objects, strings, numbers
    {for item in array_like}
        <div>{item}</div>
    {/for}

    {for item, index in array_like}
        <div>{item}</div>
    {/for}

    {for key, value in object_like}
        <div>{value}</div>
    {/for}

    // switch statements
    {switch value}
        {case "a", "b", "c"}
            content
        {/case}
        {case 20 + 5}
            content
        {/case}
        {default}
            content
        {/default}
    {/switch}

IMPORTS
	// the renderer will check data['subfolder/other_file.html'] before
	// disk access to allow caching template files
    {import 'subfolder/other_file.html'}

    // the data context can be replaced on import
    {import 'list_item.html' with (number: index + 1, other: "thing")}

FLAGS
    {!...}  // remove whitespace around output
    {#...}  // escape html characters in output
    {!#...} // both flags combined
