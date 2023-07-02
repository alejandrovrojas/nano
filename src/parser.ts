import type {
	Token,
	TokenSpec,
	NodeBlock,
	NodeExpression,
	NodeLiteral,
	NodeBlockList,
	NodeText,
	NodeTag,
	NodeFlagList,
	NodeImport,
	NodeImportStatement,
	NodeImportStatementArgument,
	NodeImportStatementArgumentList,
	NodeIf,
	NodeIfStatement,
	NodeElse,
	NodeFor,
	NodeForStatement,
	NodeIdentifierList,
	NodeConditionalExpression,
	NodeLogicalExpression,
	NodeBinaryExpression,
	NodeUnaryExpression,
	NodeMemberExpression,
	NodeMemberBracketExpression,
	NodeCallExpression,
	NodeCallExpressionArgumentList,
	NodeIdentifier,
	NodeBooleanLiteral,
	NodeNullLiteral,
	NodeStringLiteral,
	NodeNumericLiteral,
} from './types.ts';

import { Tokenizer } from './tokenizer.ts';
import { NanoError } from './classes.ts';

function ExpressionParser(input_expression: string, line_offset = 0) {
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

	const tokenizer = Tokenizer(input_expression, expression_tokens, line_offset);

	function ImportStatement(): NodeImportStatement {
		tokenizer.advance('IMPORT');

		const import_path = Expression();
		const import_with: NodeImportStatementArgumentList = [];

		if (tokenizer.next() && tokenizer.next()?.type === 'WITH') {
			tokenizer.advance('WITH');
			tokenizer.advance('L_PARENTHESIS');

			do {
				import_with.push(ImportStatementArgument());
			} while (tokenizer.next() && tokenizer.next()?.type === 'COMMA' && tokenizer.advance('COMMA'));

			tokenizer.advance('R_PARENTHESIS');
		}

		return {
			type: 'ImportStatement',
			path: import_path,
			with: import_with,
		};
	}

	function ImportStatementArgument(): NodeImportStatementArgument {
		const key = Identifier();
		tokenizer.advance('COLON');
		const value = Expression();

		return {
			type: 'ImportStatementArgument',
			key: key.value,
			value,
		};
	}

	function IfStatement(): NodeIfStatement {
		if (tokenizer.next() && tokenizer.next()?.type === 'ELSE') {
			tokenizer.advance('ELSE');
		}

		tokenizer.advance('IF');

		return {
			type: 'IfStatement',
			test: Expression(),
		};
	}

	function ForStatement(): NodeForStatement {
		tokenizer.advance('FOR');
		const identifiers = IdentifierList();
		tokenizer.advance('IN');
		const iterator = Expression();

		/**
		 * 	@NOTE consider throwing if identifiers.length > 2
		 * 	because the allowed syntax by the interpreter is either
		 * 	{for a in x} or {for a, b in x} where a, b equals to
		 * 	value, index or key, value depending on the iterator
		 * */

		return {
			type: 'ForStatement',
			identifiers: identifiers.map((node: NodeIdentifier) => node.value),
			iterator,
		};
	}

	function Expression(): NodeExpression {
		return ConditionalExpression();
	}

	function ConditionalExpression() {
		const left = OrExpression();

		if (tokenizer.next() && tokenizer.next()?.type === 'QUESTIONMARK') {
			tokenizer.advance('QUESTIONMARK');

			const consequent = Expression();

			tokenizer.advance('COLON');

			const alternate = Expression();

			return {
				type: 'ConditionalExpression',
				test: left,
				consequent,
				alternate,
			} as NodeConditionalExpression;
		} else {
			return left;
		}
	}

	function BinaryExpression(expression_method: any, token_type: string) {
		let left = expression_method();

		while (tokenizer.next() && tokenizer.next()?.type === token_type) {
			const operator_token = tokenizer.advance(token_type);
			const right = expression_method();

			left = {
				type: 'BinaryExpression',
				operator: operator_token.value,
				left,
				right,
			} as NodeBinaryExpression;
		}

		return left;
	}

	function LogicalExpression(expression_method: any, token_type: string) {
		let left = expression_method();

		while (tokenizer.next() && tokenizer.next()?.type === token_type) {
			const operator_token = tokenizer.advance(token_type);
			const right = expression_method();

			left = {
				type: 'LogicalExpression',
				operator: operator_token.value,
				left,
				right,
			} as NodeLogicalExpression;
		}

		return left;
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
			const unary_expression: NodeUnaryExpression = {
				type: 'UnaryExpression',
				operator: unary_operator.value,
				value: UnaryExpression(),
			};

			return unary_expression;
		}

		return MemberExpression();
	}

	function MemberExpression() {
		let object = PrimaryExpression();

		while (
			tokenizer.next() &&
			(tokenizer.next()?.type === 'DOT' ||
				tokenizer.next()?.type === 'L_BRACKET' ||
				tokenizer.next()?.type === 'L_PARENTHESIS')
		) {
			if (tokenizer.next()?.type === 'DOT') {
				tokenizer.advance('DOT');

				const property = Identifier();

				object = {
					type: 'MemberExpression',
					object,
					property,
				} as NodeMemberExpression;
			} else if (tokenizer.next()?.type === 'L_BRACKET') {
				tokenizer.advance('L_BRACKET');

				const property = Expression();

				tokenizer.advance('R_BRACKET');

				object = {
					type: 'MemberBracketExpression',
					object,
					property,
				} as NodeMemberBracketExpression;
			} else if (tokenizer.next()?.type === 'L_PARENTHESIS') {
				object = CallExpression(object);
			}
		}

		return object;
	}

	function CallExpression(nested_expression: any) {
		let current_expression: NodeCallExpression = {
			type: 'CallExpression',
			callee: nested_expression,
			arguments: FunctionArgumentList(),
		};

		if (tokenizer.next() && tokenizer.next()?.type === 'L_PARENTHESIS') {
			current_expression = CallExpression(current_expression);
		}

		return current_expression;
	}

	function FunctionArgumentList() {
		tokenizer.advance('L_PARENTHESIS');

		const argument_list: NodeCallExpressionArgumentList = [];

		if (tokenizer.next() && tokenizer.next()?.type !== 'R_PARENTHESIS') {
			do {
				argument_list.push(Expression());
			} while (tokenizer.next() && tokenizer.next()?.type === 'COMMA' && tokenizer.advance('COMMA'));
		}

		tokenizer.advance('R_PARENTHESIS');

		return argument_list;
	}

	function PrimaryExpression() {
		switch (tokenizer.next()?.type) {
			case 'L_PARENTHESIS':
				return ParenthesisExpression();
			case 'IDENTIFIER':
				return Identifier();
			default:
				return Literal();
		}
	}

	function ParenthesisExpression() {
		tokenizer.advance('L_PARENTHESIS');
		const expression = Expression();
		tokenizer.advance('R_PARENTHESIS');

		return expression;
	}

	function IdentifierList() {
		const declarations: NodeIdentifierList = [];

		do {
			declarations.push(Identifier());
		} while (tokenizer.next() && tokenizer.next()?.type === 'COMMA' && tokenizer.advance('COMMA'));

		return declarations;
	}

	function Literal(): NodeLiteral {
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
			default:
				throw new NanoError(`Unknown tag {${tokenizer.input()}} (line: ${tokenizer.line()})`);
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

	return {
		import_statement: ImportStatement,
		if_statement: IfStatement,
		for_statement: ForStatement,
		expression: Expression,
	};
}

function TemplateParser(input_template: string) {
	const template_tokens: TokenSpec = [
		[/^<!--[\s\S]*?-->/, null],
		[/^<(style|script).*?>[\s\S]*?<\/(script|style)>/, 'TEXT'],

		[/^{import .+}/, 'IMPORT'],
		[/^{switch .+}/, 'SWITCH'],
		[/^{case .+}/, 'CASE'],

		[/^{[#!]{0,2}if .+}/, 'IF'],
		[/^{[#!]{0,2}else if .+}/, 'ELSEIF'],
		[/^{[#!]{0,2}else}/, 'ELSE'],
		[/^{[#!]{0,2}for .+}/, 'FOR'],

		[/^{\/if}/, 'IF_END'],
		[/^{\/for}/, 'FOR_END'],
		[/^{\/switch}/, 'SWITCH_END'],
		[/^{\/case}/, 'CASE_END'],

		[/^{[#!]{0,2}.*?}/, 'TAG'],
		[/^[\s\S]?/, 'TEXT'],
	];

	const tokenizer = Tokenizer(input_template, template_tokens);

	function parse() {
		return BlockList();
	}

	function parse_token(token_type: string | undefined): NodeBlock | null {
		switch (token_type) {
			case 'IMPORT':
				return Import();
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

	function BlockList(token_type_limit: string | undefined = undefined, flags: NodeFlagList = []): NodeBlockList {
		const node_list: NodeBlock[] = [];

		while (tokenizer.next() && tokenizer.next()?.type !== token_type_limit) {
			const next_type = tokenizer.next()?.type || '';
			const next_node = parse_token(next_type);

			if (next_node !== null) {
				if (next_node.type === 'Text' && flags.length > 0) {
					next_node.flags = flags;
				}

				node_list.push(next_node);
			}
		}

		return {
			type: 'BlockList',
			nodes: node_list,
		};
	}

	function Import(): NodeImport {
		const token = tokenizer.advance('IMPORT');
		const expression = token.value.slice(1, -1);
		const statement = ExpressionParser(expression, tokenizer.line() - 1).import_statement();

		return {
			type: 'Import',
			statement,
		};
	}

	function For(): NodeFor {
		const token = tokenizer.advance('FOR');
		const { flags, expression } = handle_statement_tag(token.value);
		const statement = ExpressionParser(expression, tokenizer.line() - 1).for_statement();
		const value = BlockList('FOR_END', flags);

		try {
			tokenizer.advance('FOR_END');
		} catch (error) {
			throw new NanoError(`Missing {/for} closing tag (line ${tokenizer.line()})`);
		}

		return {
			type: 'For',
			statement,
			value,
		};
	}

	function If(token_type: 'IF' | 'ELSEIF' = 'IF'): NodeIf {
		const token = tokenizer.advance(token_type);
		const { flags, expression } = handle_statement_tag(token.value);
		const statement = ExpressionParser(expression, tokenizer.line() - 1).if_statement();

		const consequent: NodeBlockList = {
			type: 'BlockList',
			nodes: [],
		};

		let alternate: NodeIf | NodeElse | null = null;

		while (tokenizer.next() && tokenizer.next()?.type !== 'IF_END') {
			const next_type = tokenizer.next()?.type;
			const next_node = parse_token(next_type);

			if (next_node) {
				if (next_type === 'ELSEIF') {
					alternate = next_node as NodeIf;
				} else if (next_type === 'ELSE') {
					alternate = next_node as NodeElse;
				} else {
					if (next_node.type === 'Text' && flags.length > 0) {
						next_node.flags = flags;
					}

					consequent.nodes.push(next_node);
				}
			}
		}

		try {
			if (token_type === 'IF') {
				tokenizer.advance('IF_END');
			}
		} catch (error) {
			throw new NanoError(`Missing {/if} closing tag (line ${tokenizer.line()})`);
		}

		return {
			type: 'If',
			statement,
			consequent,
			alternate,
		};
	}

	function ElseIf(): NodeIf {
		return If('ELSEIF');
	}

	function Else(): NodeElse {
		const token = tokenizer.advance('ELSE');
		const { flags } = handle_statement_tag(token.value);

		return {
			type: 'Else',
			value: BlockList('IF_END', flags),
		};
	}

	function Tag(): NodeTag {
		const token = tokenizer.advance('TAG');
		const { flags, expression } = handle_statement_tag(token.value);
		const value = ExpressionParser(expression, tokenizer.line() - 1).expression();

		const tag_node: NodeTag = {
			type: 'Tag',
			value,
		};

		if (flags.length > 0) {
			tag_node.flags = flags;
		}

		return tag_node;
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

	function handle_statement_tag(tag_string: string) {
		const raw_string = tag_string.slice(1, -1);
		const raw_flags_match = raw_string.match(/^[#!]{0,2}/);
		const raw_flags = raw_flags_match ? raw_flags_match[0] : '';
		const flags: NodeFlagList = raw_flags.split('');
		const expression = raw_string.slice(flags.length);

		/**
		 * 	@NOTE consider throwing a syntax error in case of
		 * 	duplicate flags or in case an unknown character
		 * 	is used (for whatever reason)
		 * */

		return {
			flags,
			expression,
		};
	}

	return {
		parse,
	};
}

export function parse(input_template: string) {
	return TemplateParser(input_template).parse();
}
