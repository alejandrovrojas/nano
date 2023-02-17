/*prettier-ignore*/
export type TemplateBlock =
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
	| NodeIdentifier
	| NodeLiteral;

/*prettier-ignore*/
export type NodeLiteral =
	| NodeBooleanLiteral
	| NodeNullLiteral
	| NodeStringLiteral
	| NodeNumericLiteral;

export type TokenSpecList = Array<[RegExp, string | null]>;
export type TemplateBlockList = TemplateBlock[];
export type NodeIdentifierList = Array<NodeIdentifier>;
export type NodeCallExpressionArgumentList = Array<NodeExpression>;
export type NodeImportStatementArgumentList = Array<NodeImportStatementArgument>;

export type Token = {
	type: string;
	value: string;
};

export type Template = {
	type: 'Template';
	value: TemplateBlockList;
};

export type NodeImport = {
	type: 'Import';
	statement: NodeImportStatement;
};

export type NodeImportStatement = {
	type: 'ImportStatement';
	path: NodeExpression;
	with: NodeImportStatementArgumentList;
};

export type NodeImportStatementArgument = {
	type: 'ImportStatementArgument';
	key: string;
	value: NodeExpression;
};

export type NodeIf = {
	type: 'If';
	statement: NodeIfStatement;
	consequent: TemplateBlockList;
	alternate: NodeIf | NodeElse | null;
};

export type NodeIfStatement = {
	type: 'IfStatement';
	test: NodeExpression;
};

export type NodeElse = {
	type: 'Else';
	value: TemplateBlockList;
};

export type NodeFor = {
	type: 'For';
	flags: any;
	statement: NodeForStatement;
	value: TemplateBlockList;
};

export type NodeForStatement = {
	type: 'ForStatement';
	identifiers: NodeIdentifierList;
	iterator: NodeExpression;
};

export type NodeTag = {
	type: 'Tag';
	value: NodeExpression;
};

export type NodeText = {
	type: 'Text';
	value: string;
};

export type NodeConditionalExpression = {
	type: 'ConditionalExpression';
	test: NodeExpression;
	consequent: NodeExpression;
	alternate: NodeExpression;
};

export type NodeLogicalExpression = {
	type: 'LogicalExpression';
	operator: string;
	left: NodeExpression;
	right: NodeExpression;
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
	value: NodeExpression;
};

export type NodeMemberExpression = {
	type: 'MemberExpression';
	object: NodeExpression;
	property: NodeExpression;
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
