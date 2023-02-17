import { parse } from '../src/parser.ts';

try {
	const input = Deno.readTextFileSync('tests/input.html');
	console.time('parse');
	const parsed = parse(input);
	console.timeEnd('parse');

	console.dir(parsed, { depth: 10 });
} catch (error) {
	console.log(error);
}
