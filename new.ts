const INPUT = `{if thing}AAA{else if otherthing}BBB{else}CCC{/if}`;

const spec_expressions: TokenSpec = [
	[/^\s+/, null],
	[/^\/\/.*/, null],
	[/^\/\*[\s\S]*?\*\//, null],

	[/^\(/, 'L_PARENTHESIS'],
	[/^\)/, 'R_PARENTHESIS'],
	[/^\[/, 'L_BRACKET'],
	[/^\]/, 'R_BRACKET'],
	[/^\{/, 'L_CURLY'],
	[/^\}/, 'R_CURLY'],
	[/^\,/, 'COMMA'],
	[/^\./, 'DOT'],

	[/^\bimport\b/, 'IMPORT'],
	[/^\bwith\b/, 'WITH'],
	[/^\bfor\b/, 'FOR'],
	[/^\bin\b/, 'IN'],
	[/^\bif\b/, 'IF'],
	[/^\belse\b/, 'ELSE'],
	[/^\btrue\b/, 'TRUE'],
	[/^\bfalse\b/, 'FALSE'],
	[/^\bnull\b/, 'NULL'],

	[/^[+\-]/, 'ADDITIVE'],
	[/^[*\/]/, 'MULTIPLICATIVE'],

	[/^[=!]=/, 'EQUALITY'],
	[/^[><]=?/, 'RELATIONAL'],
	[/^&&/, 'AND'],
	[/^\|\|/, 'OR'],
	[/^!/, 'NOT'],

	[/^\d+(\.\d+)?/, 'NUMBER'],
	[/^[A-Za-z0-9_$ß]+/, 'IDENTIFIER'],

	[/^\?/, 'QUESTIONMARK'],
	[/^\:/, 'COLON'],

	[/^"[^"]*"/, 'STRING'],
	[/^'[^']*'/, 'STRING'],
];

type Token = {
	type: string;
	value: string;
};

type TokenSpec = Array<[RegExp, string | null]>;

type NodeFor = {
	type: 'For';
	variables: any;
	iterator: any;
	value: NodeTypeList;
};

type NodeIf = {
	type: 'If';
	test: any;
	consequent: NodeTypeList;
	alternate: NodeIf | NodeElse | null;
};

type NodeElse = {
	type: 'Else';
	value: NodeTypeList;
};

type NodeText = {
	type: 'Text';
	value: string;
};

type NodeTag = {
	type: 'Tag';
	value: string;
};

type NodeTypeList = NodeType[];
type NodeType = NodeIf | NodeElse | NodeText | NodeTag;

function Tokenizer(input: string, token_spec: TokenSpec) {
	let cursor = 0;
	let next_token: Token = traverse_next_token();

	function traverse_next_token() {
		if (!has_remaining_tokens()) {
			return null;
		}

		const current_input = input.slice(cursor);

		for (const [token_regexp, token_type] of token_spec) {
			const token_match = return_token_match(token_regexp, current_input);

			if (token_match === null) {
				continue;
			}

			cursor += token_match.length;

			if (token_type === null) {
				return traverse_next_token();
			}

			const new_token: Token = {
				type: token_type,
				value: token_match,
			};

			return new_token;
		}

		throw new Error(`Unexpected token: ${current_input[0]}`);
	}

	function return_token_match(token_regexp: RegExp, string_input: string) {
		const regex_match = token_regexp.exec(string_input);
		return regex_match ? regex_match[0] : null;
	}

	function return_next_token() {
		return next_token;
	}

	function has_remaining_tokens() {
		return cursor < input.length;
	}

	function advance_and_return_token(token_type_match: string) {
		if (next_token === null) {
			throw new Error(`Unexpected end of input`);
		}

		if (next_token.type !== token_type_match) {
			throw new Error(`Unexpected token: ${next_token.value}`);
		}

		const current_token = next_token;
		next_token = traverse_next_token();

		return current_token;
	}

	return {
		next: return_next_token,
		advance: advance_and_return_token,
	};
}

function ParseTemplate(input_template: string) {
	const spec_template: TokenSpec = [
		[/^<!--[\s\S]*?-->/, 'COMMENT'],

		[/^<style[\s\S]*?>[\s\S]*?<\/style>/, 'HTML_STYLE'],
		[/^<script[\s\S]*?>[\s\S]*?<\/script>/, 'HTML_SCRIPT'],

		[/^{if [\s\S]*?}/, 'IF'],
		[/^{else if [\s\S]*?}/, 'ELSEIF'],
		[/^{else}/, 'ELSE'],
		[/^{\/if}/, 'IF_END'],

		// [/^{for [\s\S]*?}/, 'FOR'],
		// [/^{\/for}/, 'FOR_END'],

		[/^{[\s\S]*?}/, 'TAG'],
		[/^[\s\S]?/, 'ANY'],
	];

	const tokenizer = Tokenizer(input_template, spec_template);

	function Node(token_type: any): NodeType {
		switch (token_type) {
			case 'IF':
				return If();
			case 'ELSEIF':
				return ElseIf();
			case 'ELSE':
				return Else();
			case 'TAG':
				return Tag();
			default:
				return Text();
		}
	}

	function NodeList(stop_at_type: undefined | string = undefined): NodeTypeList {
		const node_list: NodeType[] = [];

		while (tokenizer.next() && tokenizer.next().type !== stop_at_type) {
			const next_type = tokenizer.next().type;
			const next_node = Node(next_type);

			node_list.push(next_node);
		}

		return node_list;
	}

	function If(if_type: 'IF' | 'ELSEIF' = 'IF'): NodeIf {
		const block_tag = tokenizer.advance(if_type);
		const test = block_tag.value;

		let consequent: NodeTypeList = [];
		let alternate: NodeIf | NodeElse | null = null;

		while (tokenizer.next() && tokenizer.next().type !== 'IF_END') {
			const next_type = tokenizer.next().type;
			const next_node = Node(next_type);

			if (next_type === 'ELSEIF') {
				alternate = next_node as NodeIf;
			} else if (next_type === 'ELSE') {
				alternate = next_node as NodeElse;
			} else {
				consequent.push(next_node);
			}
		}

		if (if_type === 'IF') {
			tokenizer.advance('IF_END');
		}

		return {
			type: 'If',
			test: test,
			consequent: consequent,
			alternate: alternate,
		};
	}

	function ElseIf(): NodeIf {
		return If('ELSEIF');
	}

	function Else(): NodeElse {
		tokenizer.advance('ELSE');

		return {
			type: 'Else',
			value: NodeList('IF_END'),
		};
	}

	function Text(): NodeText {
		const token = tokenizer.advance('ANY');
		let token_value = token.value;

		while (tokenizer.next() && tokenizer.next().type === 'ANY') {
			token_value += tokenizer.advance('ANY').value;
		}

		return {
			type: 'Text',
			value: token_value,
		};
	}

	function Tag(): NodeTag {
		const token = tokenizer.advance('TAG');

		return {
			type: 'Tag',
			value: token.value,
		};
	}

	function Root() {
		return {
			type: 'Root',
			value: NodeList(),
		};
	}

	return Root();
}

console.dir(ParseTemplate(INPUT), { depth: 100 });
