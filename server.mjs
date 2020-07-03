import Koa from 'koa';
import {resolve} from 'path';
import {execSync} from 'child_process';
import serve from 'koa-static';
import watch from 'node-watch';
import websockify from 'koa-websocket';
import chalk from 'chalk';
import {writeFileSync} from 'fs';
import opn from 'opn';

const port = process.env.PORT || 8080;
const app = websockify(new Koa());
const staticPath = resolve('static');

app.use(serve(staticPath));
app.ws.use((ctx, next) => {
  logInfo('Client connected');

  watch(resolve('src'), {recursive: true}, (_, filePath) => {
    const infoMessage = `${filePath} changed. Recompiling...`;
    logInfo(infoMessage);
    ctx.websocket.send(
      JSON.stringify({action: 'log', data: infoMessage})
    );
    buildAppSync();
    ctx.websocket.send(
      JSON.stringify({action: 'doReload', data: null})
    );
  });

  return next(ctx);
});

logInfo(`Generating hot reload script...`);
writeFileSync(`${staticPath}/hot-reload.generated.js`, `
// Do not change. This file is automatically generated by server.mjs.

const webSocket = new WebSocket('ws://localhost:${port}');
webSocket.addEventListener('message', ({data}) => {
  const {action, data: actionData} = JSON.parse(data);
  if (action === 'doReload') location.reload();
  if (action === 'log') console.log(actionData);
});
`);

logInfo('Building app...');
buildAppSync();

opn(`http://localhost:${port}`);

app.listen(port);
logSuccess(`Serving ${staticPath} on *:${port}`);

function buildAppSync() {
  execSync('yarn build');
}

function logSuccess(message) {
  console.log(chalk.green(message));
}

function logInfo(message) {
  console.info(chalk.blue(message));
}
