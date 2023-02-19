import { render } from '../src/renderer.ts';

try {
	const input = Deno.readTextFileSync('tests/input.html');
	const data = {
		message: 'hello',
		uppercase: (v: string) => v.toUpperCase(),
	};

	const rendered = await render(input, data);

	console.dir(rendered, { depth: 10 });
} catch (error) {
	console.log(error);
}
