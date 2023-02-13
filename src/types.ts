export type TokenSpec = Array<[RegExp, string | null]>;

export type Token = {
	type: string;
	value: string;
};
