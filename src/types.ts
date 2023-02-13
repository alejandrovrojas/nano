export type TokenSpec = Array<[RegExp, string | null]>;

export type Token = {
	type: string;
	value: string;
};

export type NodeType = NodeIf | NodeElse | NodeFor | NodeTag | NodeText;
export type NodeTypeList = NodeType[];

export type NodeIf = {
	type: 'If';
	test: any;
	consequent: NodeTypeList;
	alternate: NodeIf | NodeElse | null;
};

export type NodeElse = {
	type: 'Else';
	value: NodeTypeList;
};

export type NodeFor = {
	type: 'For';
	variables: any;
	iterator: any;
	value: NodeTypeList;
};

export type NodeTag = {
	type: 'Tag';
	value: string;
};

export type NodeText = {
	type: 'Text';
	value: string;
};

export type Root = {
	type: 'Root';
	value: NodeTypeList;
};
