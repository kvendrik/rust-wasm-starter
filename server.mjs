import Koa from 'koa';
import {resolve} from 'path';
import {execSync} from 'child_process';
import serve from 'koa-static';
import watch from 'node-watch';

const app = new Koa();
const staticPath = resolve('static');

app.use(serve(staticPath));

watch(resolve('src'), { recursive: true }, (_, filePath) => {
  console.log(`${filePath} changed. Recompiling...`);
  buildAppSync();
});

console.log('Building app...');
buildAppSync();

app.listen(3000);
console.log(`Serving ${staticPath} on *:3000`);

function buildAppSync() {
  execSync('yarn build');
}
