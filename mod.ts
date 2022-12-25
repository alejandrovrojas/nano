// Copyright (c) 2022 Alejandro V. Rojas. All rights reserved. MIT license.

/**
 * 	NANO – eval-free template engine
 *
 * 	should have
 * 		[] keep track of indentation for debugging/error messages
 * 		[] log a warning if variable calls return undefined?
 * 	could have
 * 		[] proper type definitions for nodes/tokens zZzZzzZzz...
 * 	won't have
 * 		[x] inline object-like variable definitions
 * */

//@ts-ignore
import { join as join_path, isAbsolute as is_path_absolute } from 'https://deno.land/std@0.165.0/path/mod.ts';

type TokenSpec = Array<[RegExp, string | null]>;

function Tokenizer(input: string, token_spec: TokenSpec, line_offset = 1) {
	let cursor = 0;
	let line = line_offset;
	let lookahead_token = get_next_token();

	function lookahead() {
		return lookahead_token;
	}

	function has_remaining_tokens() {
		return cursor < input.length;
	}

	function get_next_token() {
		if (!has_remaining_tokens()) {
			return null;
		}

		const current_input = input.slice(cursor);

		for (const [token_regexp, token_type] of token_spec) {
			const token_match = get_token_match(token_regexp, current_input);

			if (token_match === null) {
				continue;
			}

			const line_match = token_match.match(/\n/g);

			if (line_match) {
				line += line_match.length;
			}

			cursor += token_match.length;

			if (token_type === null) {
				return get_next_token();
			}

			return {
				type: token_type,
				value: token_match,
				line: line,
			};
		}

		throw new Error(`Unexpected token: "${current_input[0]}"  (line: ${line})`);
	}

	function get_token_match(token_regexp: RegExp, string_input: string) {
		const regex_match = token_regexp.exec(string_input);
		return regex_match ? regex_match[0] : null;
	}

	function advance_token(token_type: string) {
		const current_token = lookahead_token;

		if (current_token === null) {
			throw_unexpected_end();
		}

		if (current_token.type !== token_type) {
			throw new Error(`Unexpected token: "${current_token.value}" (line: ${line})`);
		}

		lookahead_token = get_next_token();

		return current_token;
	}

	function throw_unexpected_end() {
		throw new Error(`Unexpected end of input (line: ${line})`);
	}

	return {
		lookahead,
		advance_token,
		throw_unexpected_end,
	};
}

export function Parse(input_template: string) {
	if (!input_template) {
		return new Error('Missing input template string');
	}

	return StructureTemplate(ParseTemplate(input_template));
}

export function ParseTemplate(input_template: string) {
	const tokens: Array<any> = [];
	const split_rule = /(<!--[^]*?-->|<style.*>[^]*?<\/style>|<script.*>[^]*?<\/script>|\{[^]*?\})/;
	const split_template = input_template.split(split_rule);

	let line = 1;
	let column = 1;

	for (let index = 0; index < split_template.length; index += 1) {
		let value = split_template[index];
		let current_type = 'Text';

		if (value.startsWith('<!--')) {
			current_type = 'Comment';
		}

		if (value.startsWith('{#')) {
			current_type = 'EscapedTag';
			value = value.slice(2, -1);
		}

		if (value.startsWith('{!')) {
			current_type = 'TrimmedTag';
			value = value.slice(2, -1);
		}

		if (value.startsWith('{/')) {
			current_type = 'ClosingTag';
			value = value.slice(2, -1);
		}

		if (value.startsWith('{')) {
			current_type = 'Tag';
			value = value.slice(1, -1);
		}

		tokens.push({
			type: current_type,
			value: value,
			line: line,
			column: column,
		});

		const line_match = value.match(/\n/g);

		if (line_match) {
			line += line_match.length;
			column = 0;
		}

		const last_newline = value.lastIndexOf('\n');

		column += value.slice(last_newline > -1 ? last_newline : 0, value.length).length;
	}

	return tokens;
}

export function ParseExpression(input_expression: string, line_offset: number) {
	const token_spec: TokenSpec = [
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

	const tokenizer = Tokenizer(input_expression, token_spec, line_offset);

	function Root() {
		switch (tokenizer.lookahead().type) {
			case 'IMPORT':
				return ImportStatement();
			case 'FOR':
				return ForStatement();
			case 'IF':
				return IfStatement();
			case 'ELSE':
				return ElseStatement();
			default:
				return Expression();
		}
	}

	function ImportStatement() {
		tokenizer.advance_token('IMPORT');

		const path_token = VariableExpression();
		const key_value_pairs: Array<any> = [];

		if (tokenizer.lookahead() && tokenizer.lookahead().type === 'WITH') {
			tokenizer.advance_token('WITH');
			tokenizer.advance_token('L_PARENTHESIS');

			do {
				const pair = KeyValuePair();
				key_value_pairs.push(pair.value);
			} while (tokenizer.lookahead() && tokenizer.lookahead().type === 'COMMA' && tokenizer.advance_token('COMMA'));

			tokenizer.advance_token('R_PARENTHESIS');
		}

		return {
			type: 'ImportStatement',
			path: path_token,
			with: key_value_pairs,
		};
	}

	function KeyValuePair() {
		const key = Identifier();
		tokenizer.advance_token('COLON');
		const value = VariableExpression();

		return {
			type: 'KeyValuePair',
			value: {
				key: key.value,
				value,
			},
		};
	}

	function IfStatement() {
		tokenizer.advance_token('IF');

		const test = Expression();

		return {
			type: 'IfStatement',
			test: test,
		};
	}

	function ElseStatement() {
		tokenizer.advance_token('ELSE');

		if (tokenizer.lookahead() && tokenizer.lookahead().type === 'IF') {
			const if_statement = IfStatement();

			return {
				type: 'ElseIfStatement',
				test: if_statement.test,
			};
		}

		return {
			type: 'ElseStatement',
		};
	}

	function ForStatement() {
		tokenizer.advance_token('FOR');

		/**
		 * 	@TODO: throw if variables.length > 2.
		 * */
		const variables = IdentifierList();

		tokenizer.advance_token('IN');

		const iterator = VariableExpression();

		return {
			type: 'ForStatement',
			variables: variables.map((t: any) => t.value),
			iterator,
		};
	}

	function IdentifierList() {
		const declarations: Array<any> = [];

		do {
			declarations.push(Identifier());
		} while (tokenizer.lookahead() && tokenizer.lookahead().type === 'COMMA' && tokenizer.advance_token('COMMA'));

		return declarations;
	}

	function BinaryExpression(expression_method, token_type) {
		let left = expression_method();

		while (tokenizer.lookahead() && tokenizer.lookahead().type === token_type) {
			const operator_token = tokenizer.advance_token(token_type);
			const right = expression_method();

			left = {
				type: 'BinaryExpression',
				operator: operator_token.value,
				left,
				right,
			};
		}

		return left;
	}

	function LogicalExpression(expression_method, token_type) {
		let left = expression_method();

		while (tokenizer.lookahead() && tokenizer.lookahead().type === token_type) {
			const operator_token = tokenizer.advance_token(token_type);
			const right = expression_method();

			left = {
				type: 'LogicalExpression',
				operator: operator_token.value,
				left,
				right,
			};
		}

		return left;
	}

	function Expression() {
		return TernaryExpression();
	}

	function TernaryExpression() {
		const left = OrExpression();

		if (tokenizer.lookahead() && tokenizer.lookahead().type === 'QUESTIONMARK') {
			tokenizer.advance_token('QUESTIONMARK');

			const consequent = Expression();

			tokenizer.advance_token('COLON');

			const alternate = Expression();

			return {
				type: 'TernaryExpression',
				test: left,
				consequent,
				alternate,
			};
		} else {
			return left;
		}
	}

	function OrExpression() {
		return LogicalExpression(AndExpression, 'AND');
	}

	function AndExpression() {
		return LogicalExpression(EqualityExpression, 'OR');
	}

	function EqualityExpression() {
		return BinaryExpression(RelationalExpression, 'EQUALITY');
	}

	function RelationalExpression() {
		return BinaryExpression(AddExpression, 'RELATIONAL');
	}

	function AddExpression() {
		return BinaryExpression(MultiExpression, 'ADDITIVE');
	}

	function MultiExpression() {
		return BinaryExpression(UnaryExpression, 'MULTIPLICATIVE');
	}

	function UnaryExpression() {
		let unary_operator: any = null;

		if (tokenizer.lookahead()) {
			switch (tokenizer.lookahead().type) {
				case 'ADDITIVE':
					unary_operator = tokenizer.advance_token('ADDITIVE');
					break;

				case 'NOT':
					unary_operator = tokenizer.advance_token('NOT');
					break;
			}
		}

		if (unary_operator !== null) {
			return {
				type: 'UnaryExpression',
				operator: unary_operator.value,
				value: UnaryExpression(),
			};
		}

		return VariableExpression();
	}

	function VariableExpression() {
		const variable_call = VariableCall();

		if (tokenizer.lookahead() && tokenizer.lookahead().type === 'L_PARENTHESIS') {
			return FunctionCall(variable_call);
		}

		return variable_call;
	}

	function VariableCall() {
		let variable = PrimaryExpression();

		while (
			tokenizer.lookahead() &&
			(tokenizer.lookahead().type === 'DOT' || tokenizer.lookahead().type === 'L_BRACKET')
		) {
			if (tokenizer.lookahead().type === 'DOT') {
				tokenizer.advance_token('DOT');

				const property = Identifier();

				variable = {
					type: 'VariableCall',
					variable,
					property: {
						type: 'StringLiteral',
						value: property.value,
					},
				};
			} else if (tokenizer.lookahead().type === 'L_BRACKET') {
				tokenizer.advance_token('L_BRACKET');

				const property = Expression();

				tokenizer.advance_token('R_BRACKET');

				variable = {
					type: 'VariableCall',
					variable,
					property,
				};
			}
		}

		return variable;
	}

	function FunctionCall(variable_call) {
		let current_expression = {
			type: 'FunctionCall',
			function: variable_call,
			arguments: FunctionArguments(),
		};

		if (tokenizer.lookahead() && tokenizer.lookahead().type === 'L_PARENTHESIS') {
			current_expression = FunctionCall(current_expression);
		}

		return current_expression;
	}

	function FunctionArguments() {
		tokenizer.advance_token('L_PARENTHESIS');
		const argument_list =
			tokenizer.lookahead() && tokenizer.lookahead().type !== 'R_PARENTHESIS' ? FunctionArgumentList() : [];
		tokenizer.advance_token('R_PARENTHESIS');

		return argument_list;
	}

	function FunctionArgumentList() {
		const argument_list: Array<any> = [];

		do {
			argument_list.push(VariableExpression());
		} while (tokenizer.lookahead() && tokenizer.lookahead().type === 'COMMA' && tokenizer.advance_token('COMMA'));

		return argument_list;
	}

	function PrimaryExpression() {
		if (!tokenizer.lookahead()) {
			tokenizer.throw_unexpected_end();
		}

		switch (tokenizer.lookahead().type) {
			case 'L_PARENTHESIS':
				return ParenthesisExpression();
			case 'IDENTIFIER':
				return Identifier();
			default:
				return Literal();
		}
	}

	function ParenthesisExpression() {
		tokenizer.advance_token('L_PARENTHESIS');
		const expression = Expression();
		tokenizer.advance_token('R_PARENTHESIS');

		return expression;
	}

	function Identifier() {
		const token = tokenizer.advance_token('IDENTIFIER');
		return {
			type: 'Identifier',
			value: token.value,
		};
	}

	function Literal() {
		switch (tokenizer.lookahead().type) {
			case 'STRING':
				return StringLiteral();
			case 'NUMBER':
				return NumericLiteral();
			case 'TRUE':
				return TrueLiteral();
			case 'FALSE':
				return FalseLiteral();
			case 'NULL':
				return NullLiteral();
		}
	}

	function TrueLiteral() {
		tokenizer.advance_token('TRUE');

		return {
			type: 'BooleanLiteral',
			value: true,
		};
	}

	function FalseLiteral() {
		tokenizer.advance_token('FALSE');

		return {
			type: 'BooleanLiteral',
			value: false,
		};
	}

	function NullLiteral() {
		tokenizer.advance_token('NULL');

		return {
			type: 'NullLiteral',
			value: null,
		};
	}

	function StringLiteral() {
		const token = tokenizer.advance_token('STRING');

		return {
			type: 'StringLiteral',
			value: token.value.slice(1, -1),
		};
	}

	function NumericLiteral() {
		const token = tokenizer.advance_token('NUMBER');

		return {
			type: 'NumericLiteral',
			value: Number(token.value),
		};
	}

	return Root();
}

export function StructureTemplate(node_list): any[] {
	const node_tree: Array<any> = [];
	const node_buffer: Array<any> = [];

	function push_node(node: any) {
		if (node_buffer.length > 0) {
			node_buffer[node_buffer.length - 1].body.push(node);
		} else {
			node_tree.push(node);
		}
	}

	function ensure_open_blocks_in_buffer(node) {
		if (node_buffer.length === 0) {
			throw new Error(`Unexpected statement (${node.line}:${node.column})`);
		}
	}

	for (let index = 0; index < node_list.length; index += 1) {
		const node = node_list[index];
		const { line, column } = node;

		switch (node.type) {
			case 'Text':
				const last = node_buffer[node_buffer.length - 1];
				const inside_trim_block = last && last.trim;
				const inside_escape_block = last && last.escape;

				push_node({
					type: 'Text',
					value: node.value,
					line,
					trim: inside_trim_block,
					escape: inside_escape_block
				});
				break;

			case 'Tag':
			case 'EscapedTag':
			case 'TrimmedTag':
				const parsed_expression = ParseExpression(node.value, line);
				const trimmed_tag = node.type === 'TrimmedTag';
				const escaped_tag = node.type === 'EscapedTag';

				switch (parsed_expression.type) {
					case 'IfStatement':
						node_buffer.push({
							type: 'IfStatement',
							test: parsed_expression.test,
							body: [],
							alternate: null,
							line,
							trim: trimmed_tag,
							escape: escaped_tag
						});
						break;

					case 'ForStatement':
						node_buffer.push({
							type: 'ForStatement',
							variables: parsed_expression.variables,
							iterator: parsed_expression.iterator,
							body: [],
							line,
							trim: trimmed_tag,
							escape: escaped_tag
						});
						break;

					case 'ElseIfStatement':
						node_buffer.push({
							type: 'ElseIfStatement',
							test: parsed_expression.test,
							body: [],
							alternate: null,
							line,
							trim: trimmed_tag,
							escape: escaped_tag
						});
						break;

					case 'ElseStatement':
						node_buffer.push({
							type: 'ElseStatement',
							body: [],
							line,
							trim: trimmed_tag,
							escape: escaped_tag
						});
						break;

					case 'ImportStatement':
						push_node({
							type: 'ImportStatement',
							path: parsed_expression.path,
							with: parsed_expression.with,
							trim: trimmed_tag,
							escape: escaped_tag
						});
						break;

					default:
						push_node({
							type: 'Tag',
							value: parsed_expression,
							line,
							trim: trimmed_tag,
							escape: escaped_tag
						});
				}
				break;

			case 'ClosingTag':
				ensure_open_blocks_in_buffer(node);

				function nest_buffered_nodes() {
					const last_buffered = node_buffer.pop();
					const last_in_buffer = node_buffer[node_buffer.length - 1];

					switch (last_buffered.type) {
						case 'ElseIfStatement':
							ensure_open_blocks_in_buffer(last_buffered);
							last_buffered.type = 'IfStatement';
							last_in_buffer.alternate = [last_buffered];
							nest_buffered_nodes();
							break;

						case 'ElseStatement':
							ensure_open_blocks_in_buffer(last_buffered);
							last_in_buffer.alternate = last_buffered.body;
							nest_buffered_nodes();
							break;

						default:
							const check_map = {
								if: 'IfStatement',
								for: 'ForStatement',
							};

							if (!check_map[node.value]) {
								throw new Error(`Invalid closing tag "${node.value}" (line: ${node.line})`);
							}

							if (check_map[node.value] !== last_buffered.type) {
								throw new Error(
									`Incorrect closing tag "${node.value}" ${last_buffered.type} (line: ${node.line})`
								);
							}

							push_node(last_buffered);
					}
				}

				nest_buffered_nodes();
				break;
		}
	}

	if (node_buffer.length > 0) {
		const open_block = node_buffer.shift();
		throw new Error(`Missing closing tag inside block (line: ${open_block.line})`);
	}

	return node_tree;
}

export async function RenderTemplate(parsed_template: any, input_data: InputData, input_settings: InputSettings) {
	async function Text(node) {
		if (node.trim) {
			return return_trimmed_value(node.value);
		}

		if (node.escape) {
			return return_escaped_value(node.value);
		}

		return node.value;
	}

	async function Tag(node) {
		const value = await render_node(node.value);

		if (node.trim) {
			return return_trimmed_value(value);
		}

		if (node.escape) {
			return return_escaped_value(value);
		}

		return value;
	}

	async function ImportStatement(node) {
		const import_path = await render_node(node.path);
		const import_path_prefixed = is_path_absolute(import_path) ? import_path : join_path(input_settings.import_directory, import_path);

		try {
			//@ts-ignore
			const imported_file = input_data[import_path] || await Deno.readTextFile(import_path_prefixed);
			const imported_file_parsed = Parse(imported_file);

			const import_data = { ...input_data };
			const import_settings = { ...input_settings };

			for (const subnode of imported_file_parsed) {
				subnode.trim = node.trim && subnode.type === "Text";
				subnode.escape = node.escape && subnode.type === "Text";
			}

			for (const pair of node.with) {
				const key = pair.key;
				const value = await render_node(pair.value);

				import_data[key] = value;
			}

			return RenderTemplate(imported_file_parsed, import_data, import_settings);
		} catch (error) {
			if (error.name === 'NotFound') {
				throw new Error(`Imported file "${import_path}" could not be found.`);
			}

			throw error;
		}
	}

	async function IfStatement(node) {
		const test = await render_node(node.test);

		if (test) {
			return RenderTemplate(node.body, input_data, input_settings);
		} else {
			if (node.alternate) {
				return RenderTemplate(node.alternate, input_data, input_settings);
			}
		}
	}

	async function ForStatement(node) {
		const iterator_value = await render_node(node.iterator);
		const iterator_type = return_type(iterator_value);

		let iterator: any = null;
		let iterator_output: string = '';

		switch (iterator_type) {
			case 'object':
				iterator = Object.keys(iterator_value).map(k => [k, iterator_value[k]]);
				break;
			case 'array':
				iterator = iterator_value.map((v, i) => [v, i]);
				break;
			case 'string':
				iterator = iterator_value.split('').map((v, i) => [v, i]);
				break;
			case 'number':
				iterator = Array.from({ length: iterator_value }).map((v, i) => [i + 1, i]);
				break;
		}

		const [iterator_index_key_name, iterator_value_name] = node.variables;

		for (const [loop_index_key, loop_value] of iterator) {
			const block_input_data = { ...input_data };
			const block_input_settings = { ...input_settings };

			block_input_data[iterator_index_key_name] = loop_index_key;
			block_input_data[iterator_value_name] = loop_value;

			iterator_output += await RenderTemplate(node.body, block_input_data, block_input_settings);
		}

		return iterator_output;
	}

	async function FunctionCall(node) {
		const function_name = await render_node(node.function);
		const argument_list = await render_nodes(node.arguments);

		if (!function_name) {
			return undefined;
		}

		return function_name(...argument_list);
	}

	async function VariableCall(node) {
		const variable = await render_node(node.variable);
		const property = await render_node(node.property);

		if (!variable) {
			return undefined;
		}

		return variable[property];
	}

	async function LogicalExpression(node) {
		const operator = node.operator;
		const left = await render_node(node.left);
		const right = await render_node(node.right);

		switch (node.operator) {
			case '&&':
				return left && right;
			case '||':
				return left || right;
		}
	}

	async function BinaryExpression(node) {
		const operator = node.operator;
		const left = await render_node(node.left);
		const right = await render_node(node.right);

		switch (node.operator) {
			case '!=':
				return left != right;
			case '==':
				return left == right;
			case '<=':
				return left <= right;
			case '>=':
				return left >= right;
			case '<':
				return left < right;
			case '>':
				return left > right;
			case '+':
				return left + right;
			case '-':
				return left - right;
			case '*':
				return left * right;
			case '/':
				return left / right;
		}
	}

	async function TernaryExpression(node) {
		const test = await render_node(node.test);

		if (test) {
			return render_node(node.consequent);
		} else {
			return render_node(node.alternate);
		}
	}

	async function UnaryExpression(node) {
		const value = await render_node(node.value);

		switch (node.operator) {
			case '!':
				return !value;
			case '-':
				return -value;
		}
	}

	async function Identifier(node) {
		return input_data[node.value];
	}

	async function Literal(node) {
		return node.value;
	}

	async function render_nodes(node_list) {
		const rendered_nodes: Array<any> = [];

		for (const node of node_list) {
			rendered_nodes.push(await render_node(node));
		}

		return rendered_nodes;
	}

	async function render_node(node) {
		switch (node.type) {
			case 'Text':
				return Text(node);
			case 'Tag':
				return Tag(node);
			case 'ImportStatement':
				return ImportStatement(node);
			case 'IfStatement':
				return IfStatement(node);
			case 'ForStatement':
				return ForStatement(node);
			case 'FunctionCall':
				return FunctionCall(node);
			case 'VariableCall':
				return VariableCall(node);
			case 'LogicalExpression':
				return LogicalExpression(node);
			case 'BinaryExpression':
				return BinaryExpression(node);
			case 'TernaryExpression':
				return TernaryExpression(node);
			case 'UnaryExpression':
				return UnaryExpression(node);
			case 'Identifier':
				return Identifier(node);
			case 'StringLiteral':
			case 'NumericLiteral':
			case 'TrueLiteral':
			case 'FalseLiteral':
			case 'NullLiteral':
				return Literal(node);
		}
	}

	function return_type(value) {
		return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
	}

	function return_trimmed_value(value: string) {
		return value.replace(/\>\s+\</g, '><').replace(/\t|\n/g, '');
	}

	function return_escaped_value(value: string) {
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

		return value.replace(/[&<>"'`=\/]/g, (match: string) => character_map[match]);
	}

	const rendered_nodes = await render_nodes(parsed_template);
	return rendered_nodes.join('');
}

type InputTemplate = string;
type InputData = Record<string, any>;
type InputSettings = {
	import_directory: string;
};

export default async function render(
	input_template: InputTemplate,
	input_data: InputData = {},
	input_settings: InputSettings = { import_directory: '' }
) {
	return RenderTemplate(Parse(input_template), input_data, input_settings);
}
