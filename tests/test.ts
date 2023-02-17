import type { NodeBlockList } from '../src/types.ts';

type Test = {
	name: string;
	input: string;
	parsed: NodeBlockList;
};

import { parse } from '../src/parser.ts';
import { assertEquals } from 'https://deno.land/std/testing/asserts.ts';

const tests: Test[] = [
	{
		name: 'if else',
		input: `{if this} A {else} B {/if}`,
		parsed: {
			type: 'BlockList',
			nodes: [
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
		assertEquals(parse(test.input), test.parsed);
	});
}
