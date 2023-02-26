import type {
	InputTemplate,
	InputData,
	InputSettings,
	Node,
	NodeBlock,
	NodeExpression,
	NodeLiteral,
	NodeBlockList,
	NodeText,
	NodeTag,
	NodeFlagList,
	NodeImport,
	NodeIf,
	NodeElse,
	NodeFor,
	NodeConditionalExpression,
	NodeLogicalExpression,
	NodeBinaryExpression,
	NodeUnaryExpression,
	NodeMemberExpression,
	NodeMemberBracketExpression,
	NodeCallExpression,
	NodeIdentifier,
} from './types.ts';

import { parse } from './parser.ts';
import { join as join_path, isAbsolute as is_path_absolute } from 'https://deno.land/std@0.165.0/path/mod.ts';

export function Renderer(input_template_parsed: NodeBlockList, input_data: InputData, input_settings: InputSettings) {
	async function BlockList(node: NodeBlockList, node_data?: InputData): Promise<string> {
		const rendered_nodes = await render_nodes(node.nodes, node_data);
		return rendered_nodes.join('');
	}

	async function Import(node: NodeImport, node_data?: InputData) {
		const import_path = await render_node(node.statement.path, node_data);
		const import_path_prefixed = is_path_absolute(import_path)
			? import_path
			: join_path(input_settings.import_directory, import_path);

		try {
			//@ts-ignore
			const import_context = node_data || input_data;
			const imported_file = import_context[import_path] || (await Deno.readTextFile(import_path_prefixed));

			const import_data = { ...import_context };

			/**
			 * 	@YAGNI render "with" pairs as individual nodes and/or
			 * 	refactor argument lists as a generic node type.
			 * 	direct access to the pair values is nevertheless not
			 * 	all that bad when the node object is type safe
			 *
			 * 	@SEE CallExpression()
			 * */

			for (const pair of node.statement.with) {
				const key = pair.key;
				const value = await render_node(pair.value, import_context);

				import_data[key] = value;
			}

			return render_node(parse(imported_file), import_data);
		} catch (error) {
			if (error.name === 'NotFound') {
				throw new Error(`Imported file "${import_path}" could not be found.`);
			}

			throw error;
		}
	}

	async function For(node: NodeFor, node_data?: InputData) {
		const iterator_value = await render_node(node.statement.iterator, node_data);
		const iterator_type = return_type(iterator_value);

		let iterator: Array<[any, number]> | null = null;
		let iterator_output: string = '';

		switch (iterator_type) {
			case 'array':
				iterator = iterator_value.map((value: any, index: number) => [value, index]);
				break;
			case 'string':
				iterator = iterator_value.split('').map((value: string, index: number) => [value, index]);
				break;
			case 'number':
				iterator = Array.from({ length: Math.abs(iterator_value) }).map((value: unknown, index: number) => [
					index + 1,
					index,
				]);
				break;
			case 'object':
				iterator = Object.keys(iterator_value).map((key: string) => [key, iterator_value[key]]);
				break;
		}

		const [iterator_index_key_name, iterator_value_name] = node.statement.identifiers;

		/**
		 * 	@TODO this method should probably throw an error if
		 * 	the iterator is undefined? there is no real reason to
		 * 	fail silently when the iterator is not iterable
		 * */

		if (iterator) {
			for (const [loop_index_key, loop_value] of iterator) {
				const block_input_data = { ...input_data };

				if (iterator_index_key_name) {
					block_input_data[iterator_index_key_name] = loop_index_key;
				}

				if (iterator_value_name) {
					block_input_data[iterator_value_name] = loop_value;
				}

				iterator_output += await render_node(node.value, block_input_data);
			}

			return iterator_output;
		} else {
			return '';
		}
	}

	async function If(node: NodeIf, node_data?: InputData) {
		const test = await render_node(node.statement.test, node_data);

		if (test) {
			return render_node(node.consequent, node_data);
		} else if (node.alternate) {
			return render_node(node.alternate, node_data);
		}
	}

	async function Else(node: NodeElse, node_data?: InputData) {
		return render_node(node.value, node_data);
	}

	async function CallExpression(node: NodeCallExpression, node_data?: InputData) {
		const callee = await render_node(node.callee, node_data);
		const argument_list = await render_nodes(node.arguments, node_data);

		if (!callee) {
			return undefined;
		}

		return callee(...argument_list);
	}

	async function MemberExpression(node: NodeMemberExpression, node_data?: InputData) {
		const object = await render_node(node.object, node_data);

		if (!object) {
			return undefined;
		}

		return object[node.property.value];
	}

	async function MemberBracketExpression(node: NodeMemberBracketExpression, node_data?: InputData) {
		const object = await render_node(node.object, node_data);
		const property = await render_node(node.property, node_data);

		if (!object) {
			return undefined;
		}

		return object[property];
	}

	async function ConditionalExpression(node: NodeConditionalExpression, node_data?: InputData) {
		const test = await render_node(node.test, node_data);

		if (test) {
			return render_node(node.consequent, node_data);
		} else {
			return render_node(node.alternate, node_data);
		}
	}

	async function LogicalExpression(node: NodeLogicalExpression, node_data?: InputData) {
		const left = await render_node(node.left, node_data);
		const right = await render_node(node.right, node_data);

		switch (node.operator) {
			case '&&':
				return left && right;
			case '||':
				return left || right;
		}
	}

	async function BinaryExpression(node: NodeBinaryExpression, node_data?: InputData) {
		const left: any = await render_node(node.left, node_data);
		const right: any = await render_node(node.right, node_data);

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
			default:
				return ''; // @NEVER
		}
	}

	async function UnaryExpression(node: NodeUnaryExpression, node_data?: InputData) {
		const value = await render_node(node.value, node_data);

		switch (node.operator) {
			case '!':
				return !value;
			case '-':
				return -value;
		}
	}

	async function Identifier(node: NodeIdentifier, node_data?: InputData): Promise<any> {
		const context = node_data || input_data;
		return context[node.value];
	}

	async function Tag(node: NodeTag, node_data?: InputData): Promise<any> {
		const value = await render_node(node.value, node_data);

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

	async function Literal(node: NodeLiteral): Promise<any> {
		return node.value;
	}

	async function render_nodes(node_list: Node[], node_data?: InputData) {
		const rendered_nodes: Node[] = [];

		for (const node of node_list) {
			rendered_nodes.push(await render_node(node, node_data));
		}

		return rendered_nodes;
	}

	async function render_node(node: NodeBlock | NodeBlockList | NodeExpression, node_data?: InputData): Promise<any> {
		switch (node.type) {
			case 'BlockList':
				return BlockList(node, node_data);
			case 'Import':
				return Import(node, node_data);
			case 'For':
				return For(node, node_data);
			case 'If':
				return If(node, node_data);
			case 'Else':
				return Else(node, node_data);
			case 'CallExpression':
				return CallExpression(node, node_data);
			case 'MemberExpression':
				return MemberExpression(node, node_data);
			case 'MemberBracketExpression':
				return MemberBracketExpression(node, node_data);
			case 'ConditionalExpression':
				return ConditionalExpression(node, node_data);
			case 'LogicalExpression':
				return LogicalExpression(node, node_data);
			case 'BinaryExpression':
				return BinaryExpression(node, node_data);
			case 'UnaryExpression':
				return UnaryExpression(node, node_data);
			case 'Identifier':
				return Identifier(node, node_data);
			case 'Tag':
				return Tag(node, node_data);
			case 'Text':
				return Text(node);
			case 'StringLiteral':
			case 'NumericLiteral':
			case 'BooleanLiteral':
			case 'NullLiteral':
				return Literal(node);
			default:
				return ''; // @NEVER
		}
	}

	async function render(): Promise<string> {
		return BlockList(input_template_parsed, input_data);
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
