import type { Token, TokenSpecList } from './types.ts';
import { NanoError } from './classes.ts';

export function Tokenizer(input: string, token_spec: TokenSpecList) {
	let line = 0;
	let cursor = 0;
	let next_token = traverse_next_token();

	function traverse_next_token(): Token | null {
		if (!has_remaining_tokens()) {
			return null;
		}

		const current_input = input.slice(cursor);

		for (const [token_regexp, token_type] of token_spec) {
			const token_match = return_token_match(token_regexp, current_input);

			if (token_match === null) {
				continue;
			}

			const line_match = token_match.match(/\n/g);

			if (line_match) {
				line += line_match.length;
			}

			cursor += token_match.length;

			if (token_type === null) {
				return traverse_next_token();
			}

			const new_token: Token = {
				type: token_type,
				value: token_match,
			};

			return new_token;
		}

		throw new NanoError(`Unexpected token ${current_input[0]} (line ${line})`);
	}

	function return_token_match(token_regexp: RegExp, string_input: string) {
		const regex_match = token_regexp.exec(string_input);
		return regex_match ? regex_match[0] : null;
	}

	function return_next_token() {
		return next_token;
	}

	function return_current_line() {
		return line;
	}

	function has_remaining_tokens() {
		return cursor < input.length;
	}

	function traverse_and_set_token(token_type_match: string | undefined = undefined) {
		if (next_token === null) {
			throw new NanoError(`Unexpected end of input (line ${line + 1})`);
		}

		if (next_token.type !== token_type_match) {
			throw new NanoError(`Unexpected token ${next_token.value} (line ${line + 1})`);
		}

		const current_token = next_token;
		next_token = traverse_next_token();

		return current_token;
	}

	return {
		line: return_current_line,
		next: return_next_token,
		advance: traverse_and_set_token,
	};
}
