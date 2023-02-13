import { assertEquals } from 'https://deno.land/std/testing/asserts.ts';
import { Parse } from '../src/parser.ts';

try {
	console.dir(Parse(`{if this} A {else if that} B {else} C {/if}`), { depth: 100 });

	const result = {
		type: 'Root',
		value: [
			{
				type: 'If',
				test: 'if this',
				consequent: [{ type: 'Text', value: ' A ' }],
				alternate: {
					type: 'If',
					test: 'if that',
					consequent: [{ type: 'Text', value: ' B ' }],
					alternate: {
						type: 'Else',
						value: [{ type: 'Text', value: ' C ' }],
					},
				},
			},
		],
	};
} catch (error) {
	console.log(error);
}
