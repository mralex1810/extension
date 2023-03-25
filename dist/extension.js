/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ ((module) => {

module.exports = require("fs");

/***/ }),
/* 3 */
/***/ ((module) => {

module.exports = require("node:child_process");

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __webpack_require__(1);
const fs = __webpack_require__(2);
const node_child_process_1 = __webpack_require__(3);
const runJava = (0, node_child_process_1.spawn)('java', ['-jar',
    "--add-opens", "java.base/java.nio=ALL-UNNAMED",
    "--add-opens", "java.base/sun.nio.ch=ALL-UNNAMED",
    "--enable-preview",
    '/home/alex/Programming/caches/extension/src/persistent-ide-caches.jar',
    vscode.workspace.workspaceFolders?.at(0)?.uri.path.toString() ?? "error",
]);
const oldFiles = new Map();
const newFiles = new Map();
// runJava.stdout.on('data', (data: string) => {
// 	console.log(`stdout: ${data}`);
// });
runJava.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
});
runJava.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
});
function pushEvents(events) {
    console.log(JSON.stringify(events));
    runJava.stdin.write("changes\n" + JSON.stringify(events));
}
function getWebviewContent() {
    return `<html>
	<head>
		<title>Alert Box</title>
		<script type="text/javascript">
		const vscode = acquireVsCodeApi();
			function onClick() {
				const text = document.getElementById('search').value;
				vscode.postMessage({
					command: 'search',
					text: text
				});
			}
		</script>
	</head>
	<body>
	<input type="text" id="search" /><br />
	<input type="button" value="Click Here" onclick="onClick()" />
	</body>
	</html>
	`;
}
let findWidgetActive = false;
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context) {
    const panel = vscode.window.createWebviewPanel('search', // Identifies the type of the webview. Used internally
    'Search', // Title of the panel displayed to the user
    vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
    { enableScripts: true } // Webview options. More on these later.
    );
    panel.webview.html = getWebviewContent();
    panel.webview.onDidReceiveMessage(message => {
        switch (message.command) {
            case 'search':
                runJava.stdout.once('data', (data) => vscode.window.showErrorMessage(`${data}`));
                runJava.stdin.write("search\n" + message.text);
                return;
        }
    }, undefined, context.subscriptions);
    const workspace = vscode.workspace;
    console.log(workspace);
    if (workspace !== undefined) {
        let modifyChanges = [];
        let addChanges = [];
        let deleteChanges = [];
        let renameChanges = [];
        let intervalId = setInterval(() => {
            modifyChanges.length = 0;
            addChanges.length = 0;
            deleteChanges.length = 0;
            renameChanges.length = 0;
            newFiles.forEach((value, key) => {
                modifyChanges.push({ uri: key, oldText: oldFiles.get(key), newText: value });
            });
            newFiles.clear();
            const events = { timestamp: Date.now(), modifyChanges: modifyChanges, addChanges: addChanges, deleteChanges: deleteChanges, renameChanges: renameChanges };
            console.log;
            if (events.modifyChanges.length > 0) {
                pushEvents(events);
            }
        }, 5000);
        workspace.onDidCreateFiles(event => {
            console.log("create files");
            event.files.forEach(file => {
                addChanges.push({ uri: file.path, text: fs.readFileSync(file.path).toString() });
            });
            123;
        });
        workspace.onDidDeleteFiles(event => {
            console.log("delete files");
            event.files.forEach(file => {
                deleteChanges.push({ uri: file.path, text: oldFiles.get(file.path) });
            });
        });
        workspace.onDidChangeTextDocument(event => {
            console.log("modify files");
            const uri = event.document.uri.path;
            if (!newFiles.has(uri)) {
                oldFiles.set(uri, event.document.getText());
            }
            newFiles.set(uri, event.document.getText());
        });
        workspace.onDidRenameFiles(event => {
            console.log("rename files");
            event.files.forEach(file => {
                renameChanges.push({ oldUri: file.oldUri.path, newUri: file.newUri.path });
            });
        });
    }
    ;
}
exports.activate = activate;
// The command has been defined in the package.json file
// Now provide the implementation of the command with registerCommand
// The commandId parameter must match the command field in package.json
let disposable = vscode.commands.registerCommand('extension1.helloWorld', () => {
    // The code you place here will be executed every time your command is executed
    // Display a message box to the user
    vscode.window.showInformationMessage('Hello World from extension1!');
});
// This method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=extension.js.map