const spawn = require('child_process').spawn;
const chokidar = require('chokidar');
var node;
var webpack;

const filesToWatch = [
  './src/**/*.js',
  './server.js'
];

const watcher = chokidar.watch(filesToWatch);

function startDevServer() {
  if (node) {
    node.kill();
    console.log('Stoping node process');
  }

  console.log('Restarting node process');
  node = spawn('node', ['--debug=5858', 'server.js'], { stdio: 'inherit' });
  node.on('close', () =>  console.log('The node process has ended') );
}

watcher.on('ready', () => {
  startDevServer();
  watcher.on('all', startDevServer);
});
