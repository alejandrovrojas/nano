import { parse } from '../src/parser.ts';

try {
	const input_template = Deno.readTextFileSync('tests/input_template.html');
	console.time('parse');
	const parsed = parse(input_template);
	console.timeEnd('parse');

	console.dir(parsed, { depth: 10 });
} catch (error) {
	console.log(error);
}
