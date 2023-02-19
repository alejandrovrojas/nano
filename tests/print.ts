import { parse } from '../src/parser.ts';
import { render } from '../src/renderer.ts';

try {
	const input = Deno.readTextFileSync('tests/input.html');
	const parsed = parse(input);
	const rendered = await render(input);

	console.dir(rendered, { depth: 10 });
} catch (error) {
	console.log(error);
}
