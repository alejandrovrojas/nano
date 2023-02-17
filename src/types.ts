/*prettier-ignore*/
export type NodeBlock =
	| NodeIf
	| NodeElse
	| NodeFor
	| NodeTag
	| NodeText;

/*prettier-ignore*/
export type NodeExpression =
	| NodeConditionalExpression
	| NodeLogicalExpression
	| NodeBinaryExpression
	| NodeUnaryExpression
	| NodeMemberExpression
	| NodeCallExpression
	| NodeIdentifier;

/*prettier-ignore*/
export type NodeLiteral =
	| NodeBooleanLiteral
	| NodeNullLiteral
	| NodeStringLiteral
	| NodeNumericLiteral;

export type TokenSpecList = Array<[RegExp, string | null]>;
export type NodeBlockList = NodeBlock[];
export type NodeIdentifierList = Array<NodeIdentifier>;
export type NodeCallExpressionArgumentList = Array<NodeExpression | NodeLiteral>;

export interface Token {
	type: string;
	value: string;
}

export interface Node {
	type: string;
}

export interface Root {
	type: 'Root';
	value: NodeBlockList;
}

export interface NodeIf extends Node {
	type: 'If';
	test: any;
	consequent: NodeBlockList;
	alternate: NodeIf | NodeElse | null;
}

export interface NodeElse extends Node {
	type: 'Else';
	value: NodeBlockList;
}

export interface NodeFor extends Node {
	type: 'For';
	variables: any;
	iterator: any;
	value: NodeBlockList;
}

export interface NodeTag extends Node {
	type: 'Tag';
	value: any; //Expressions and statements
}

export interface NodeText extends Node {
	type: 'Text';
	value: string;
}

export interface NodeConditionalExpression extends Node {
	type: 'ConditionalExpression';
	test: NodeExpression;
	consequent: NodeExpression | NodeLiteral;
	alternate: NodeExpression | NodeLiteral;
}

export interface NodeLogicalExpression extends Node {
	type: 'LogicalExpression';
	operator: string;
	left: NodeExpression | NodeLiteral;
	right: NodeExpression | NodeLiteral;
}

export interface NodeBinaryExpression extends Node {
	type: 'BinaryExpression';
	operator: string;
	left: NodeBinaryExpression | NodeUnaryExpression;
	right: NodeBinaryExpression | NodeUnaryExpression;
}

export interface NodeUnaryExpression extends Node {
	type: 'UnaryExpression';
	operator: string;
	value: NodeExpression | NodeLiteral;
}

export interface NodeMemberExpression extends Node {
	type: 'MemberExpression';
	object: NodeExpression | NodeLiteral;
	property: NodeExpression | NodeLiteral;
}

export interface NodeCallExpression extends Node {
	type: 'CallExpression';
	callee: NodeMemberExpression | NodeIdentifier;
	arguments: NodeCallExpressionArgumentList;
}

export interface NodeIdentifier extends Node {
	type: 'Identifier';
	value: string;
}

export interface NodeBooleanLiteral extends Node {
	type: 'BooleanLiteral';
	value: true | false;
}

export interface NodeNullLiteral extends Node {
	type: 'NullLiteral';
	value: null;
}

export interface NodeStringLiteral extends Node {
	type: 'StringLiteral';
	value: string;
}

export interface NodeNumericLiteral extends Node {
	type: 'NumericLiteral';
	value: number;
}
