/*prettier-ignore*/
export type NodeBlock =
	| NodeImport
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
export type NodeImportStatementArgumentList = Array<NodeImportStatementArgument>;

export type Token = {
	type: string;
	value: string;
};

export type Root = {
	type: 'Root';
	value: NodeBlockList;
};

export type NodeImport = {
	type: 'Import';
	statement: NodeImportStatement;
};

export type NodeImportStatement = {
	type: 'ImportStatement';
	path: NodeExpression | NodeLiteral;
	with: NodeImportStatementArgumentList;
};

export type NodeImportStatementArgument = {
	type: 'ImportStatementArgument';
	value: {
		key: string;
		value: NodeExpression | NodeLiteral;
	};
};

export type NodeIf = {
	type: 'If';
	statement: NodeIfStatement;
	consequent: NodeBlockList;
	alternate: NodeIf | NodeElse | null;
};

export type NodeIfStatement = {
	type: 'IfStatement';
	test: NodeExpression | NodeLiteral;
};

export type NodeElse = {
	type: 'Else';
	value: NodeBlockList;
};

export type NodeFor = {
	type: 'For';
	statement: NodeForStatement;
	value: NodeBlockList;
};

export type NodeForStatement = {
	type: 'ForStatement';
	identifiers: NodeIdentifierList;
	iterator: NodeExpression | NodeLiteral;
};

export type NodeTag = {
	type: 'Tag';
	value: NodeExpression | NodeLiteral;
};

export type NodeText = {
	type: 'Text';
	value: string;
};

export type NodeConditionalExpression = {
	type: 'ConditionalExpression';
	test: NodeExpression;
	consequent: NodeExpression | NodeLiteral;
	alternate: NodeExpression | NodeLiteral;
};

export type NodeLogicalExpression = {
	type: 'LogicalExpression';
	operator: string;
	left: NodeExpression | NodeLiteral;
	right: NodeExpression | NodeLiteral;
};

export type NodeBinaryExpression = {
	type: 'BinaryExpression';
	operator: string;
	left: NodeBinaryExpression | NodeUnaryExpression;
	right: NodeBinaryExpression | NodeUnaryExpression;
};

export type NodeUnaryExpression = {
	type: 'UnaryExpression';
	operator: string;
	value: NodeExpression | NodeLiteral;
};

export type NodeMemberExpression = {
	type: 'MemberExpression';
	object: NodeExpression | NodeLiteral;
	property: NodeExpression | NodeLiteral;
};

export type NodeCallExpression = {
	type: 'CallExpression';
	callee: NodeMemberExpression | NodeIdentifier;
	arguments: NodeCallExpressionArgumentList;
};

export type NodeIdentifier = {
	type: 'Identifier';
	value: string;
};

export type NodeBooleanLiteral = {
	type: 'BooleanLiteral';
	value: true | false;
};

export type NodeNullLiteral = {
	type: 'NullLiteral';
	value: null;
};

export type NodeStringLiteral = {
	type: 'StringLiteral';
	value: string;
};

export type NodeNumericLiteral = {
	type: 'NumericLiteral';
	value: number;
};
