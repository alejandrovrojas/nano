import type {
	InputTemplate,
	InputData,
	InputSettings,
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

import { parse } from './parser.ts';

export function Renderer(parsed_template: NodeNodeList, input_data: InputData, input_settings: InputSettings) {
	async function NodeList(node: NodeNodeList): Promise<string> {
		const rendered_nodes: any = [];

		for (const subnode of node.nodes) {
			rendered_nodes.push(await render_node(subnode));
		}

		return rendered_nodes.join('');
	}

	async function Tag(node: NodeTag): Promise<any> {
		const value = await render_node(node.value);

		if (node.flags !== undefined) {
			return return_flagged_value(value, node.flags);
		}

		return value;
	}

	async function Text(node: NodeText): Promise<string> {
		const value = node.value;

		if (node.flags !== undefined) {
			return return_flagged_value(value, node.flags);
		}

		return value;
	}

	async function If(node: NodeIf) {
		const test = await render_node(node.statement.test);

		if (test) {
			return render_node(node.consequent);
		} else {
			if (node.alternate) {
				return render_node(node.alternate);
			}

			return '';
		}
	}

	async function Else(node: NodeElse) {
		return render_node(node.value);
	}

	async function Identifier(node: NodeIdentifier): Promise<any> {
		return input_data[node.value];
	}

	async function Literal(node: NodeLiteral): Promise<any> {
		return node.value;
	}

	async function render_node(node: Node | NodeNodeList | NodeExpression): Promise<string> {
		switch (node.type) {
			case 'NodeList':
				return NodeList(node);
			case 'Text':
				return Text(node);
			case 'Tag':
				return Tag(node);
			case 'If':
				return If(node);
			case 'Else':
				return Else(node);
			case 'Import':
				return ''; // @TODO
			case 'For':
				return ''; // @TODO
			case 'ConditionalExpression':
			case 'LogicalExpression':
			case 'BinaryExpression':
			case 'UnaryExpression':
			case 'CallExpression':
			case 'MemberExpression':
				return '--';
			case 'Identifier':
				return Identifier(node);
			case 'StringLiteral':
			case 'NumericLiteral':
			case 'BooleanLiteral':
			case 'NullLiteral':
				return Literal(node);
			default:
				return '';
		}
	}

	async function render(): Promise<string> {
		return NodeList(parsed_template);
	}

	function return_type(value: any): string {
		return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
	}

	function return_flagged_value(value: any, flags: NodeFlagList): string {
		return [...flags].reduce((new_value: any, flag: string) => {
			switch (flag) {
				case '!':
					return return_trimmed_string(new_value);
				case '#':
					return return_escaped_string(new_value);
			}

			return new_value;
		}, value);
	}

	function return_trimmed_string(value: string): string {
		return value.replace(/\>\s+\</g, '><').replace(/\t|\n/g, '');
	}

	function return_escaped_string(value: string): string {
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

	return {
		render,
	};
}

export async function render(
	input_template: InputTemplate,
	input_data: InputData = {},
	input_settings: InputSettings = {
		import_directory: '',
	}
) {
	return Renderer(parse(input_template), input_data, input_settings).render();
}
