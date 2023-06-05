import { render } from '../src/renderer.ts';
import { input_data } from './input_data.js';

try {
	const input_template = Deno.readTextFileSync('tests/input_template.html');

	console.time('render');
	const rendered = await render(input_template, input_data);
	console.timeEnd('render');

	console.dir(rendered, { depth: 10 });
} catch (error) {
	console.log(error);
}
