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
		name: 'expression',
		input: `{2 + 2}`,
		parsed: {
			type: 'BlockList',
			nodes: [
				{
					type: 'Tag',
					value: {
						type: 'BinaryExpression',
						operator: '+',
						left: { type: 'NumericLiteral', value: 2 },
						right: { type: 'NumericLiteral', value: 2 },
					},
				},
			],
		},
	},
	{
		name: 'if else',
		input: `{if this}A{else}B{/if}`,
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
					consequent: {
						type: 'BlockList',
						nodes: [{ type: 'Text', value: 'A' }],
					},
					alternate: {
						type: 'Else',
						value: {
							type: 'BlockList',
							nodes: [{ type: 'Text', value: 'B' }],
						},
					},
				},
			],
		},
	},
];

for (const test of tests) {
	Deno.test('>> ' + test.name, () => {
		assertEquals(test.parsed, parse(test.input));
	});
}
