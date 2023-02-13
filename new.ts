type TokenSpec = Array<[RegExp, string | null]>;

type Token = {
	type: string;
	value: string;
};

type NodeType = NodeFor | NodeIf | NodeElse | NodeTag | NodeText;
type NodeTypeList = NodeType[];

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

type NodeTag = {
	type: 'Tag';
	value: string;
};

type NodeText = {
	type: 'Text';
	value: string;
};

class NanoError extends SyntaxError {
	public name = 'NanoSyntaxError';
}

function Tokenizer(input: string, token_spec: TokenSpec) {
	let line = 0;
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

			const line_match = token_match.match(/\n/g);

			if (line_match) {
				line += line_match.length;
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

		throw new NanoError(`Unexpected token ${current_input[0]} (line ${line})`);
	}

	function return_token_match(token_regexp: RegExp, string_input: string) {
		const regex_match = token_regexp.exec(string_input);
		return regex_match ? regex_match[0] : null;
	}

	function return_next_token() {
		return next_token;
	}

	function return_current_line() {
		return line;
	}

	function has_remaining_tokens() {
		return cursor < input.length;
	}

	function traverse_and_set_token(token_type_match: string) {
		if (next_token === null) {
			throw new NanoError(`Unexpected end of input (line ${line + 1})`);
		}

		if (next_token.type !== token_type_match) {
			throw new NanoError(`Unexpected token ${next_token.value} (line ${line + 1})`);
		}

		const current_token = next_token;
		next_token = traverse_next_token();

		return current_token;
	}

	return {
		line: return_current_line,
		next: return_next_token,
		advance: traverse_and_set_token,
	};
}

function ParseExpression(input_expression: string) {
	const expression_tokens: TokenSpec = [
		[/^\s+/, null],
		[/^<!--[\s\S]*?-->/, null],

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
	const tokenizer = Tokenizer(input_expression, expression_tokens);
}

function ParseTemplate(input_template: string) {
	const template_tokens: TokenSpec = [
		[/^<!--[\s\S]*?-->/, null],
		[/^<(style|script)[\s\S]*?>[\s\S]*?<\/(script|style)>/, 'TEXT'],

		[/^{if [\s\S]*?}/, 'IF'],
		[/^{else if [\s\S]*?}/, 'ELSEIF'],
		[/^{else}/, 'ELSE'],
		[/^{\/if}/, 'IF_END'],

		[/^{for [\s\S]*?}/, 'FOR'],
		[/^{\/for}/, 'FOR_END'],

		[/^{[\s\S]*?}/, 'TAG'],
		[/^[\s\S]?/, 'TEXT'],
	];
	const tokenizer = Tokenizer(input_template, template_tokens);

	function Node(token_type: any): NodeType {
		switch (token_type) {
			case 'IF':
				return If();
			case 'ELSEIF':
				return ElseIf();
			case 'ELSE':
				return Else();
			case 'FOR':
				return For();
			case 'TAG':
				return Tag();
			case 'TEXT':
				return Text();
			default:
				return Skip();
		}
	}

	function NodeList(token_type_limit: undefined | string = undefined): NodeTypeList {
		const node_list: NodeTypeList = [];

		while (tokenizer.next() && tokenizer.next().type !== token_type_limit) {
			const next_type = tokenizer.next().type;
			const next_node = Node(next_type);

			node_list.push(next_node);
		}

		return node_list;
	}

	function For(): NodeFor {
		const token = tokenizer.advance('FOR');
		const expression_string = token.value.slice(1, -1);
		const expression_parsed = expression_string;
		const value = NodeList('FOR_END');

		tokenizer.advance('FOR_END');

		return {
			type: 'For',
			variables: expression_string,
			iterator: '',
			value: value,
		};
	}

	function If(token_type: 'IF' | 'ELSEIF' = 'IF'): NodeIf {
		const token = tokenizer.advance(token_type);
		const expression_string = token.value.slice(1, -1);
		const expression_parsed = expression_string;

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
				/**
				 * @TODO handle flags
				 * */

				// if (next_type === 'TEXT') {
				// 	next_node.flags = [true];
				// }

				consequent.push(next_node);
			}
		}

		// try {
		if (token_type === 'IF') {
			tokenizer.advance('IF_END');
		}
		// } catch (error) {
		// 	throw new NanoError(`Missing {/if} closing tag (line ${tokenizer.line()})`);
		// }

		return {
			type: 'If',
			test: expression_parsed,
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

	function Tag(): NodeTag {
		const token = tokenizer.advance('TAG');
		const expression_string = token.value.slice(1, -1);

		return {
			type: 'Tag',
			value: expression_string,
		};
	}

	function Text(): NodeText {
		const token = tokenizer.advance('TEXT');
		let token_value = token.value;

		while (tokenizer.next() && tokenizer.next().type === 'TEXT') {
			token_value += tokenizer.advance('TEXT').value;
		}

		return {
			type: 'Text',
			value: token_value,
		};
	}

	function Skip(token_type) {
		return tokenizer.advance();
	}

	function Root() {
		return {
			type: 'Root',
			value: NodeList(),
		};
	}

	return Root();
}

try {
	console.dir(
		ParseTemplate(`{ey bla}
			BBBB
			{if ble}
		`),
		{ depth: 100 }
	);
} catch (error) {
	console.log(error);
}
