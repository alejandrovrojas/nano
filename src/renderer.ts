import type {
	Template,
	TemplateBlock,
	TemplateBlockList,
	NodeFlagList,
	NodeIdentifierList,
	NodeCallExpressionArgumentList,
	NodeExpression,
	NodeLiteral,
	NodeImport,
	NodeIf,
	NodeElse,
	NodeFor,
	NodeTag,
	NodeText,
	NodeIfStatement,
	NodeImportStatement,
	NodeImportStatementArgument,
	NodeImportStatementArgumentList,
	NodeForStatement,
	NodeConditionalExpression,
	NodeLogicalExpression,
	NodeBinaryExpression,
	NodeUnaryExpression,
	NodeMemberExpression,
	NodeCallExpression,
	NodeIdentifier,
	NodeBooleanLiteral,
	NodeNullLiteral,
	NodeStringLiteral,
	NodeNumericLiteral,
} from './types.ts';
import { parse } from './parser.ts';

export function TemplateRenderer(parsed_template: Template, input_data: InputData, input_settings: InputSettings) {
	function Literal(node: NodeLiteral): any {
		return node.value;
	}

	/**** render ****/

	async function render_node(node: TemplateBlock | NodeExpression): Promise<string> {
		switch (node.type) {
			case 'Text':
			case 'Tag':
			case 'Import':
			case 'If':
			case 'For':
			case 'CallExpression':
			case 'MemberExpression':
			case 'LogicalExpression':
			case 'BinaryExpression':
			case 'ConditionalExpression':
			case 'UnaryExpression':
			case 'Identifier':
				return '--';
			case 'StringLiteral':
			case 'NumericLiteral':
			case 'BooleanLiteral':
			case 'NullLiteral':
				return Literal(node);
			default:
				return '';
		}
	}

	async function render_nodes(node_list: any): Promise<any> {
		const rendered_nodes: Array<any> = [];

		for (const node of node_list.nodes) {
			rendered_nodes.push(await render_node(node));
		}

		return rendered_nodes;
	}

	async function render(): Promise<string> {
		const rendered_nodes = await render_nodes(parsed_template);
		return rendered_nodes.join('');
	}

	/**** misc ****/

	function return_type(value: any): string {
		return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
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

type InputTemplate = string;
type InputData = Record<string, any>;
type InputSettings = {
	import_directory: string;
};

export async function render(
	input_template: InputTemplate,
	input_data: InputData = {},
	input_settings: InputSettings = {
		import_directory: '',
	}
) {
	return TemplateRenderer(parse(input_template), input_data, input_settings).render();
}
