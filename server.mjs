import Koa from 'koa';
import {join, relative, resolve} from 'path';
import {execSync} from 'child_process';
import Router from 'koa-router';
import koaSend from 'koa-send';
import watch from 'node-watch';
import websockify from 'koa-websocket';
import chalk from 'chalk';
import {readFileSync, writeFileSync} from 'fs';
import opn from 'opn';

const liveReloadOn = true;
const watchFilesOn = true;
const openPageOnStart = true;

// Test that the path of the changed file isn't in the build output path
// without this an infinite loop will occur when you change a source file
const watchIncludeTest = path => !path.includes('/wasm/');

const srcPath = resolve('src');
const staticPath = resolve('static');

const port = process.env.PORT || 8080;
const app = websockify(new Koa());
const router = new Router();
const getUniqueSocketId = createUniqueIdFactory('socket');
let currentWebsockets = [];

router.get('/(.*)', handleHttpRequest);

app
  .use(router.routes())
  .use(router.allowedMethods());

if (liveReloadOn) {
  app.ws.use(handleNewWsConnection);
}

logInfo('Building app...');
buildAppSync();

if (watchFilesOn) {
  logInfo('Setting up file watcher...');
  watch(
    // if live reload is not on
    // then only watch source files as they still
    // benefit from a watcher so you get
    // recompilation on file save
    liveReloadOn ? [srcPath, staticPath] : srcPath,
    {
      recursive: true,
      filter: watchIncludeTest,
    },
    handleFileChange
  );
}

if(openPageOnStart) opn(`http://localhost:${port}`);

app.listen(port);
logSuccess(`Serving ${staticPath} on *:${port}`);

function handleFileChange(_, filePath) {
  const isSourceFileChange = filePath.includes(srcPath);
  const infoMessage = `${filePath} changed. ${isSourceFileChange ? 'Recompiling' : 'Reloading'}...`;
  logInfo(infoMessage);

  for (const {socket} of currentWebsockets) {
    socket.send(
      JSON.stringify({action: 'log', data: infoMessage})
    );
  }

  if(isSourceFileChange) buildAppSync();

  for (const {socket} of currentWebsockets) {
    socket.send(
      JSON.stringify({action: 'doReload', data: null})
    );
  }
}

function handleNewWsConnection(ctx, next) {
  logInfo('Client connected');

  const socket = ctx.websocket;
  const socketId = getUniqueSocketId();

  currentWebsockets.push({id: socketId, socket});

  socket.on('close', () => {
    logInfo(`Closing socket ${socketId}`);
    currentWebsockets = currentWebsockets.filter(({id}) => id !== socketId);
  });

  return next(ctx);
}

async function handleHttpRequest(ctx, next) {
  const path = ctx.path;
  const scriptDirectory = process.cwd();

  if (path === '/') {
    const htmlPath = join(staticPath, 'index.html');

    if (liveReloadOn) {
      responseWithHtml(htmlPath);
      return next(ctx);
    }

    await koaSend(ctx, relative(scriptDirectory, htmlPath));
    return next(ctx);
  }

  const requestingHtml = path.includes('.html');
  const requestedFilePath = join(staticPath, path);

  if (requestingHtml) {
    responseWithHtml(requestedFilePath);
    return next(ctx);
  }

  await koaSend(ctx, relative(scriptDirectory, requestedFilePath));
  return next(ctx);

  function responseWithHtml(filePath) {
    const html = insertLiveReloadScriptIntoHtml(readFileSync(filePath, 'utf-8'));
    ctx.type = 'html';
    ctx.body = html;
  }
}

function insertLiveReloadScriptIntoHtml(html) {
  return html.replace('</body>', `<script>
const webSocket = new WebSocket('ws://localhost:${port}');
webSocket.addEventListener('message', ({data}) => {
  const {action, data: actionData} = JSON.parse(data);
  if (action === 'doReload') location.reload();
  if (action === 'log') console.log(actionData);
});</script></body>`);
}

function buildAppSync() {
  execSync('yarn build', {stdio: 'inherit'});
}

function logSuccess(message) {
  console.log(chalk.green(message));
}

function logInfo(message) {
  console.info(chalk.blue(message));
}

function createUniqueIdFactory(prefix) {
  let index = 0;
  return () => `${prefix}-${index++}`;
}
