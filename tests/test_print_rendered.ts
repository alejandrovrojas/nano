import { render } from '../src/renderer.ts';
import { input_data } from './input_data.ts';

try {
	const input_template = Deno.readTextFileSync('tests/input_template.html');

	const time_start = performance.now();
	const rendered = await render(input_template, input_data);
	const time_end = performance.now();

	console.log(`%cRENDER ${time_end - time_start}ms`, 'color: red;');
	console.dir(rendered, { depth: 10 });
} catch (error) {
	console.log(error);
}
