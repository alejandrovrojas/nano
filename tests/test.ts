import type { Template } from '../src/types.ts';
import { Parse } from '../src/parser.ts';
import { assertEquals } from 'https://deno.land/std/testing/asserts.ts';

const tests = [
	{
		name: 'if else',
		expression: `{if this} A {else} B {/if}`,
		result: {
			type: 'Template',
			value: [
				{
					type: 'If',
					statement: {
						type: 'IfStatement',
						test: {
							type: 'Identifier',
							value: 'this',
						},
					},
					consequent: [{ type: 'Text', value: ' A ' }],
					alternate: {
						type: 'Else',
						value: [{ type: 'Text', value: ' B ' }],
					},
				},
			],
		},
	},
];

for (const test of tests) {
	Deno.test('>> ' + test.name, () => {
		assertEquals(Parse(test.expression), test.result as Template);
	});
}
