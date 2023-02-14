import type {
	Token,
	TokenSpec,
	NodeType,
	NodeTypeList,
	NodeIf,
	NodeElse,
	NodeFor,
	NodeTag,
	NodeText,
	RootTemplate,
} from './types.ts';

import { Tokenizer } from './tokenizer.ts';

type IdentifierList = NodeIdentifier[];
type FunctionArgumentList = VariableExpression[];

type ParenthesisExpression = Expression;
type Expression = TernaryExpression;
type TernaryExpression = NodeTernaryExpression | LogicalExpression;
type LogicalExpression = NodeLogicalExpression | BinaryExpression;
type BinaryExpression = NodeBinaryExpression | UnaryExpression;
type UnaryExpression = NodeUnaryExpression | VariableExpression;

type VariableExpression = FunctionCall | VariableCall;

type FunctionCall = NodeFunctionCall | VariableCall;
type VariableCall = NodeVariableCall | PrimaryExpression;
type PrimaryExpression = ParenthesisExpression | NodeIdentifier | Literal;

type Literal = NodeBooleanLiteral | NodeNullLiteral | NodeStringLiteral | NodeNumericLiteral;

type NodeTernaryExpression = {
	type: 'TernaryExpression';
	test: NodeLogicalExpression;
	consequent: Expression;
	alternate: Expression;
};

type NodeLogicalExpression = {
	type: 'LogicalExpression';
	operator: string;
	left: NodeLogicalExpression | NodeBinaryExpression;
	right: NodeLogicalExpression | NodeBinaryExpression;
};

type NodeBinaryExpression = {
	type: 'BinaryExpression';
	operator: string;
	left: NodeBinaryExpression | NodeUnaryExpression;
	right: NodeBinaryExpression | NodeUnaryExpression;
};

type NodeUnaryExpression = {
	type: 'UnaryExpression';
	operator: string;
	value: VariableExpression;
};

type NodeVariableCall = {
	type: 'VariableCall';
	variable: NodeVariableCall | NodeIdentifier;
	property: NodeStringLiteral | Expression;
};

type NodeFunctionCall = {
	type: 'FunctionCall';
	function: NodeFunctionCall | NodeVariableCall | NodeIdentifier;
	arguments: FunctionArgumentList;
};

type NodeIdentifier = {
	type: 'Identifier';
	value: string;
};

type NodeBooleanLiteral = {
	type: 'BooleanLiteral';
	value: true | false;
};

type NodeNullLiteral = {
	type: 'NullLiteral';
	value: null;
};

type NodeStringLiteral = {
	type: 'StringLiteral';
	value: string;
};

type NodeNumericLiteral = {
	type: 'NumericLiteral';
	value: number;
};

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

	function RootExpression() {
		switch (tokenizer.next()?.type) {
			case 'IMPORT':
				return ImportStatement();
			case 'IF':
				return IfStatement();
			case 'ELSE':
				return ElseStatement();
			case 'FOR':
				return ForStatement();
			default:
				return Expression();
		}
	}

	function ImportStatement() {
		tokenizer.advance('IMPORT');

		const path_token = VariableExpression();
		const key_value_pairs: Array<any> = [];

		if (tokenizer.next() && tokenizer.next()?.type === 'WITH') {
			tokenizer.advance('WITH');
			tokenizer.advance('L_PARENTHESIS');

			do {
				const pair = KeyValuePair();
				key_value_pairs.push(pair.value);
			} while (tokenizer.next() && tokenizer.next()?.type === 'COMMA' && tokenizer.advance('COMMA'));

			tokenizer.advance('R_PARENTHESIS');
		}

		return {
			type: 'ImportStatement',
			path: path_token,
			with: key_value_pairs,
		};
	}

	function KeyValuePair() {
		const key = Identifier();
		tokenizer.advance('COLON');
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
		tokenizer.advance('IF');

		const test = Expression();

		return {
			type: 'IfStatement',
			test: test,
		};
	}

	function ElseStatement() {
		tokenizer.advance('ELSE');

		if (tokenizer.next() && tokenizer.next()?.type === 'IF') {
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
		tokenizer.advance('FOR');
		const identifiers = IdentifierList();
		tokenizer.advance('IN');
		const iterator = VariableExpression();

		/**
		 * @TODO throw if identifiers.length > 2.
		 * */

		return {
			type: 'ForStatement',
			identifiers: identifiers.map((t: any) => t.value),
			iterator,
		};
	}

	function Expression(): Expression {
		return TernaryExpression();
	}

	function TernaryExpression(): TernaryExpression {
		const left = OrExpression();

		if (tokenizer.next() && tokenizer.next()?.type === 'QUESTIONMARK') {
			tokenizer.advance('QUESTIONMARK');

			const consequent = Expression();

			tokenizer.advance('COLON');

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

	function BinaryExpression(expression_method: any, token_type: string): BinaryExpression {
		let left = expression_method();

		while (tokenizer.next() && tokenizer.next()?.type === token_type) {
			const operator_token = tokenizer.advance(token_type);
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

	function LogicalExpression(expression_method: any, token_type: string): LogicalExpression {
		let left = expression_method();

		while (tokenizer.next() && tokenizer.next()?.type === token_type) {
			const operator_token = tokenizer.advance(token_type);
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

	function OrExpression(): LogicalExpression {
		return LogicalExpression(AndExpression, 'AND');
	}

	function AndExpression(): LogicalExpression {
		return LogicalExpression(EqualityExpression, 'OR');
	}

	function EqualityExpression(): BinaryExpression {
		return BinaryExpression(RelationalExpression, 'EQUALITY');
	}

	function RelationalExpression(): BinaryExpression {
		return BinaryExpression(AddExpression, 'RELATIONAL');
	}

	function AddExpression(): BinaryExpression {
		return BinaryExpression(MultiExpression, 'ADDITIVE');
	}

	function MultiExpression(): BinaryExpression {
		return BinaryExpression(UnaryExpression, 'MULTIPLICATIVE');
	}

	function UnaryExpression(): UnaryExpression {
		let unary_operator: Token | null = null;

		if (tokenizer.next()) {
			switch (tokenizer.next()?.type) {
				case 'ADDITIVE':
					unary_operator = tokenizer.advance('ADDITIVE');
					break;

				case 'NOT':
					unary_operator = tokenizer.advance('NOT');
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

	function VariableExpression(): VariableExpression {
		/**
		 * VariableCall invokes a PrimaryExpression which is
		 * the "last stop" before defaulting to literals
		 * */
		const variable_call = VariableCall();

		if (tokenizer.next() && tokenizer.next()?.type === 'L_PARENTHESIS') {
			return FunctionCall(variable_call);
		}

		return variable_call;
	}

	function VariableCall() {
		let variable: PrimaryExpression | NodeVariableCall = PrimaryExpression();

		while (tokenizer.next() && (tokenizer.next()?.type === 'DOT' || tokenizer.next()?.type === 'L_BRACKET')) {
			if (tokenizer.next()?.type === 'DOT') {
				tokenizer.advance('DOT');

				const property = Identifier();

				variable = {
					type: 'VariableCall',
					variable,
					property: {
						type: 'StringLiteral',
						value: property.value,
					},
				};
			} else if (tokenizer.next()?.type === 'L_BRACKET') {
				tokenizer.advance('L_BRACKET');

				const property = Expression();

				tokenizer.advance('R_BRACKET');

				variable = {
					type: 'VariableCall',
					variable,
					property,
				};
			}
		}

		return variable;
	}

	function FunctionCall(nested_expression_call: any): FunctionCall {
		let current_expression: NodeFunctionCall = {
			type: 'FunctionCall',
			function: nested_expression_call,
			arguments: FunctionArgumentList(),
		};

		if (tokenizer.next() && tokenizer.next()?.type === 'L_PARENTHESIS') {
			current_expression = FunctionCall(current_expression);
		}

		return current_expression;
	}

	function FunctionArgumentList(): FunctionArgumentList {
		tokenizer.advance('L_PARENTHESIS');

		const argument_list: FunctionArgumentList = [];
		const is_inside_parenthesis = tokenizer.next() && tokenizer.next()?.type !== 'R_PARENTHESIS';

		if (is_inside_parenthesis) {
			do {
				argument_list.push(VariableExpression());
			} while (tokenizer.next() && tokenizer.next()?.type === 'COMMA' && tokenizer.advance('COMMA'));
		}

		tokenizer.advance('R_PARENTHESIS');

		return argument_list;
	}

	function PrimaryExpression(): PrimaryExpression {
		switch (tokenizer.next()?.type) {
			case 'L_PARENTHESIS':
				return ParenthesisExpression();
			case 'IDENTIFIER':
				return Identifier();
			default:
				return Literal();
		}
	}

	function ParenthesisExpression(): ParenthesisExpression {
		tokenizer.advance('L_PARENTHESIS');
		const expression = Expression();
		tokenizer.advance('R_PARENTHESIS');

		return expression;
	}

	function IdentifierList(): IdentifierList {
		const declarations: IdentifierList = [];

		do {
			declarations.push(Identifier());
		} while (tokenizer.next() && tokenizer.next()?.type === 'COMMA' && tokenizer.advance('COMMA'));

		return declarations;
	}

	function Literal(): Literal | undefined {
		switch (tokenizer.next()?.type) {
			case 'TRUE':
				return TrueLiteral();
			case 'FALSE':
				return FalseLiteral();
			case 'NULL':
				return NullLiteral();
			case 'STRING':
				return StringLiteral();
			case 'NUMBER':
				return NumericLiteral();
		}
	}

	function Identifier(): NodeIdentifier {
		const token = tokenizer.advance('IDENTIFIER');

		return {
			type: 'Identifier',
			value: token.value,
		};
	}

	function TrueLiteral(): NodeBooleanLiteral {
		tokenizer.advance('TRUE');

		return {
			type: 'BooleanLiteral',
			value: true,
		};
	}

	function FalseLiteral(): NodeBooleanLiteral {
		tokenizer.advance('FALSE');

		return {
			type: 'BooleanLiteral',
			value: false,
		};
	}

	function NullLiteral(): NodeNullLiteral {
		tokenizer.advance('NULL');

		return {
			type: 'NullLiteral',
			value: null,
		};
	}

	function StringLiteral(): NodeStringLiteral {
		const token = tokenizer.advance('STRING');

		return {
			type: 'StringLiteral',
			value: token.value.slice(1, -1),
		};
	}

	function NumericLiteral(): NodeNumericLiteral {
		const token = tokenizer.advance('NUMBER');

		return {
			type: 'NumericLiteral',
			value: Number(token.value),
		};
	}

	return RootExpression();
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

	function RootTemplate(): RootTemplate {
		return {
			type: 'RootTemplate',
			value: NodeList(),
		};
	}

	function Node(token_type: any): NodeType | null {
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

		while (tokenizer.next() && tokenizer.next()?.type !== token_type_limit) {
			const next_type = tokenizer.next()?.type;
			const next_node = Node(next_type);

			if (next_node) {
				node_list.push(next_node);
			}
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

		while (tokenizer.next() && tokenizer.next()?.type !== 'IF_END') {
			const next_type = tokenizer.next()?.type;
			const next_node = Node(next_type);

			if (next_node) {
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
			value: ParseExpression(expression_string),
		};
	}

	function Text(): NodeText {
		const token = tokenizer.advance('TEXT');
		let token_value = token.value;

		while (tokenizer.next() && tokenizer.next()?.type === 'TEXT') {
			token_value += tokenizer.advance('TEXT').value;
		}

		return {
			type: 'Text',
			value: token_value,
		};
	}

	function Skip(): null {
		tokenizer.advance();
		return null;
	}

	return RootTemplate();
}

export function Parse(input_template: string) {
	return ParseTemplate(input_template);
}
