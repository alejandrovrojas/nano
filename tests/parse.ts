import { parse } from '../src/parser.ts';

try {
	const input = Deno.readTextFileSync('tests/input.html');
	const parsed = parse(input);

	console.dir(parsed, { depth: 10 });
} catch (error) {
	console.log(error);
}
