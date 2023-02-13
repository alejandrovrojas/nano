import { Parse } from '../src/parser.ts';

try {
	console.dir(Parse(Deno.readTextFileSync('tests/input.html')), { depth: 10 });
} catch (error) {
	console.log(error);
}
