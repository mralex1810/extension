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
const vscode = __webpack_require__(1);
const fs = __webpack_require__(2);
const { spawn } = __webpack_require__(3);
const runJava = spawn('java', ['-cp', 'extension1/src', 'caches.SaveChanges', 'Java started']);
const oldFiles = new Map();
const newFiles = new Map();
function pushEvents(events) {
    console.log(JSON.stringify(events));
    runJava.stdin.write(JSON.stringify(events) + '\r\n');
    runJava.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });
    runJava.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });
    runJava.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    });
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
                console.log(message.text);
                vscode.window.showErrorMessage(message.text);
                return;
        }
    }, undefined, context.subscriptions);
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "extension1" is now active!');
    const workspace = vscode.workspace;
    console.log(workspace);
    vscode.commands.registerCommand('editor.action.nextMatchFindAction', (e) => {
        console.log(e);
    });
    vscode.commands.registerCommand('type', (args) => {
        if (findWidgetActive) {
            console.log(args);
        }
        else {
            vscode.commands.executeCommand('default:type', args);
        }
    });
    if (workspace !== undefined) {
        let modifyChanges = [];
        let addChanges = [];
        let deleteChanges = [];
        let renameChanges = [];
        let intervalId = setInterval(() => {
            newFiles.forEach((key, value) => {
                modifyChanges.push(JSON.stringify({ uri: key, oldText: oldFiles.get(key), newText: value }));
            });
            const events = { timestamp: Date.now(), modifyChanges: modifyChanges, addChanges: addChanges, deleteChanges: deleteChanges, renameChanges: renameChanges };
            pushEvents(events);
            newFiles.clear();
            modifyChanges = [];
            addChanges = [];
            deleteChanges = [];
            renameChanges = [];
        }, 5000);
        workspace.onDidCreateFiles(event => {
            console.log("create files");
            event.files.forEach(file => {
                addChanges.push(JSON.stringify({ timestamp: Date.now(), uri: file.path, text: fs.readFileSync(file.path) }));
            });
        });
        workspace.onDidDeleteFiles(event => {
            console.log("delete files");
            event.files.forEach(file => {
                deleteChanges.push(JSON.stringify({ timestamp: Date.now(), uri: file.path }));
            });
        });
        workspace.onDidChangeTextDocument(event => {
            console.log("modify files");
            const uri = event.document.uri.toString();
            if (!newFiles.has(uri)) {
                oldFiles.set(uri, event.document.getText());
            }
            newFiles.set(uri, event.document.getText());
        });
        workspace.onDidRenameFiles(event => {
            console.log("rename files");
            event.files.forEach(file => {
                renameChanges.push(JSON.stringify({ timestamp: Date.now(), oldUri: file.oldUri, newUri: file.newUri }));
            });
        });
    }
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension1.helloWorld', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        vscode.window.showInformationMessage('Hello World from extension1!');
    });
}
exports.activate = activate;
// This method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=extension.js.map