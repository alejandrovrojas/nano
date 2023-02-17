export type InputTemplate = string;
export type InputData = Record<string, any>;
export type InputSettings = { import_directory: string };

export type Token = {
	type: string;
	value: string;
};

export type TokenSpec = Array<[RegExp, string | null]>;

/* prettier-ignore */
export type Node =
	| NodeBlock
	| NodeExpression

/* prettier-ignore */
export type NodeBlock =
	| NodeImport
	| NodeIf
	| NodeElse
	| NodeFor
	| NodeTag
	| NodeText;

/* prettier-ignore */
export type NodeExpression =
	| NodeConditionalExpression
	| NodeLogicalExpression
	| NodeBinaryExpression
	| NodeUnaryExpression
	| NodeMemberExpression
	| NodeCallExpression
	| NodeIdentifier
	| NodeLiteral;

/* prettier-ignore */
export type NodeLiteral =
	| NodeBooleanLiteral
	| NodeNullLiteral
	| NodeStringLiteral
	| NodeNumericLiteral;

export type NodeBlockList = {
	type: 'BlockList';
	nodes: NodeBlock[];
};

export type NodeText = {
	type: 'Text';
	value: string;
	flags?: NodeFlagList;
};

export type NodeTag = {
	type: 'Tag';
	value: NodeExpression;
	flags?: NodeFlagList;
};

export type NodeFlagList = string[] | [];

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

export type NodeImportStatementArgumentList = NodeImportStatementArgument[];

export type NodeIf = {
	type: 'If';
	statement: NodeIfStatement;
	consequent: NodeBlockList;
	alternate: NodeIf | NodeElse | null;
};

export type NodeIfStatement = {
	type: 'IfStatement';
	test: NodeExpression;
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
	identifiers: string[];
	iterator: NodeExpression;
};

export type NodeIdentifierList = NodeIdentifier[];

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

export type NodeCallExpressionArgumentList = NodeExpression[];

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
