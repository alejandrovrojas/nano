import type {
	Token,
	TokenSpecList,
	Node,
	NodeExpression,
	NodeLiteral,
	NodeNodeList,
	NodeList,
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

function ExpressionParser(input_expression: string) {
	const expression_tokens: TokenSpecList = [
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

	function ImportStatement(): NodeImportStatement {
		tokenizer.advance('IMPORT');

		const import_path = VariableExpression();
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
		const iterator = VariableExpression();

		/**
		 * @TODO	this should probably throw if identifiers.length > 2.
		 *      	because the allowed syntax by the interpreter is either
		 *      	{for a in x} or {for a, b in x} where a, b equals to
		 *      	value, index or key, value depending on the iterator
		 * */

		return {
			type: 'ForStatement',
			identifiers,
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
			};
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
			};
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
			};
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

		return VariableExpression();
	}

	function VariableExpression() {
		/**
		 * @NOTE	the order of operations could be reconsidered
		 *      	at some point, also in relation to PrimaryExpression().
		 *      	as of now it's not possible to chain method calls'
		 *      	member expressions e.g. something().like().this() though
		 *      	(at least as far as i know) this is partly a technical
		 *      	limitation of this type of parser
		 * */
		const member_expression = MemberExpression();

		if (tokenizer.next() && tokenizer.next()?.type === 'L_PARENTHESIS') {
			return CallExpression(member_expression);
		}

		return member_expression;
	}

	function MemberExpression() {
		let object = PrimaryExpression();

		while (tokenizer.next() && (tokenizer.next()?.type === 'DOT' || tokenizer.next()?.type === 'L_BRACKET')) {
			if (tokenizer.next()?.type === 'DOT') {
				tokenizer.advance('DOT');

				const property = MemberExpression();

				object = {
					type: 'MemberExpression',
					object,
					property,
				};
			} else if (tokenizer.next()?.type === 'L_BRACKET') {
				tokenizer.advance('L_BRACKET');

				const property = Expression();

				tokenizer.advance('R_BRACKET');

				object = {
					type: 'MemberExpression',
					object,
					property,
				};
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
				argument_list.push(VariableExpression());
			} while (tokenizer.next() && tokenizer.next()?.type === 'COMMA' && tokenizer.advance('COMMA'));
		}

		tokenizer.advance('R_PARENTHESIS');

		return argument_list;
	}

	function PrimaryExpression() {
		/**
		 * @NOTE	this should be refactored at some point.
		 *      	using Literal as the default switch allows
		 *      	member expressions using literal values
		 *      	e.g. something.2.like."this" which is somewhat
		 *      	unexpected when the rest of the syntax
		 *      	otherwise looks like a subset of javascript.
		 *      	also, this parser already supports property
		 *      	access using a bracket syntax, so supporting
		 *      	both methods is inconsistent and unexpected
		 * */
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
				throw new NanoError(`Unknown tag {${tokenizer.input()}}`);
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
	const template_tokens: TokenSpecList = [
		[/^<!--[\s\S]*?-->/, null],
		[/^<(style|script)[\s\S]*?>[\s\S]*?<\/(script|style)>/, 'TEXT'],

		[/^{!?#?!?#?import [\s\S]*?}/, 'IMPORT'],

		[/^{!?#?!?#?if [\s\S]*?}/, 'IF'],
		[/^{!?#?!?#?else if [\s\S]*?}/, 'ELSEIF'],
		[/^{!?#?!?#?else}/, 'ELSE'],
		[/^{\/if}/, 'IF_END'],

		[/^{!?#?!?#?for [\s\S]*?}/, 'FOR'],
		[/^{\/for}/, 'FOR_END'],

		[/^{!?#?!?#?[\s\S]*?}/, 'TAG'],
		[/^[\s\S]?/, 'TEXT'],
	];

	const tokenizer = Tokenizer(input_template, template_tokens);

	console.log(tokenizer.next());

	function parse_token(token_type: string | undefined): Node | null {
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

	function NodeList(token_type_limit: string | undefined = undefined, flags: NodeFlagList = []): NodeNodeList {
		const node_list: NodeList = [];

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
			type: 'NodeList',
			nodes: node_list,
		};
	}

	function Import(): NodeImport {
		const token = tokenizer.advance('IMPORT');
		const expression = token.value.slice(1, -1);
		const statement = ExpressionParser(expression).import_statement();

		return {
			type: 'Import',
			statement,
		};
	}

	function For(): NodeFor {
		const token = tokenizer.advance('FOR');
		const flags = token.value.match(/#|!/g) || [];
		const expression = token.value.slice(flags.length + 1, -1);
		const statement = ExpressionParser(expression).for_statement();
		const value = NodeList('FOR_END', flags);

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
		const flags = token.value.match(/#|!/g) || [];
		const expression = token.value.slice(flags.length + 1, -1);
		const statement = ExpressionParser(expression).if_statement();

		const consequent: NodeNodeList = {
			type: 'NodeList',
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
		const flags = token.value.match(/#|!/g) || [];

		return {
			type: 'Else',
			value: NodeList('IF_END', flags),
		};
	}

	function Tag(): NodeTag {
		const token = tokenizer.advance('TAG');
		const flags = token.value.match(/#|!/g) || [];
		const expression = token.value.slice(flags.length + 1, -1);
		const value = ExpressionParser(expression).expression();

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

	return {
		parse: NodeList,
	};
}

export function parse(input_template: string) {
	return TemplateParser(input_template).parse();
}
