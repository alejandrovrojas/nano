import { parse } from '../src/parser.ts';

try {
	const input_template = Deno.readTextFileSync('tests/input_template.html');

	const time_start = performance.now();
	const parsed = parse(input_template);
	const time_end = performance.now();

	console.log(`%cPARSE ${time_end - time_start}ms`, 'color: red;');
	console.dir(parsed, { depth: 10 });
} catch (error) {
	console.log(error);
}
