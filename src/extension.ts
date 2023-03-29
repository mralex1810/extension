// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import { spawn } from 'node:child_process';
import path = require('path');

var dirName = __dirname?.split(path.sep)
dirName.pop()
const runJava = spawn('java', ['-jar',
	"--add-opens", "java.base/java.nio=ALL-UNNAMED",
	"--add-opens", "java.base/sun.nio.ch=ALL-UNNAMED",
	"--enable-preview",
	dirName.join(path.sep) + path.sep + "src" + path.sep + 'persistent-ide-caches.jar',
	vscode.workspace.workspaceFolders?.at(0)?.uri.path.toString() ?? "error",
] );

const oldFiles = new Map<string, string>();
const newFiles = new Map<string, string>();

// runJava.stdout.on('data', (data: string) => {
// 	console.log(`stdout: ${data}`);

// });

runJava.stderr.on('data', (data: string) => {
	console.error(`stderr: ${data}`);
});

runJava.on('close', (code: Number) => {
	console.log(`child process exited with code ${code}`);
});

function pushEvents(events: object) {
	console.log(JSON.stringify(events));

	runJava.stdin.write("changes\n" + JSON.stringify(events));
}


function getWebviewContent(req: string, text: string) {
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
	<input type="text" id="search" style="font-size:50px"/><br />
	<input type="button" value="Search" onclick="onClick()" style="font-size:50px" />
	</body>
	<body>
	<p style="font-size:50px">${req}</p>
	<p style="font-size:50px">${text}</p>
	</body>
	</html>
	`;
}


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const panel = vscode.window.createWebviewPanel(
		'search', // Identifies the type of the webview. Used internally
		'Search', // Title of the panel displayed to the user
		vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
		{ enableScripts: true } // Webview options. More on these later.

	);

	panel.webview.html = getWebviewContent("", "");

	panel.webview.onDidReceiveMessage(message => {
		switch (message.command) {
			case 'search':
				runJava.stdout.once('data', (data: string) =>
					panel.webview.html = getWebviewContent("Results for \"" + message.text + "\"", data.slice(1, -2)));
				runJava.stdin.write("search\n" + message.text);
				return;
		}
	},
		undefined,
		context.subscriptions
	);

	const workspace = vscode.workspace;
	console.log(workspace);

	if (workspace !== undefined) {

		let modifyChanges: { uri: String, oldText: String | undefined, newText: String }[] = [];
		let addChanges: { uri: string, text: string }[] = [];
		let deleteChanges: { uri: string, text: string | undefined }[] = [];
		let renameChanges: { newUri: string, oldUri: string }[] = [];

		let intervalId = setInterval(() => {
			modifyChanges.length = 0;
			addChanges.length = 0;
			deleteChanges.length = 0;
			renameChanges.length = 0;
			newFiles.forEach((value: string, key: string) => {
				modifyChanges.push({ uri: key, oldText: oldFiles.get(key), newText: value });
			});
			newFiles.clear();
			const events = { timestamp: Date.now(), modifyChanges: modifyChanges, addChanges: addChanges, deleteChanges: deleteChanges, renameChanges: renameChanges };
			console.log
			if (events.modifyChanges.length > 0) {
				pushEvents(events);
			}

		}, 5000);

		workspace.onDidCreateFiles(event => {
			console.log("create files");
			event.files.forEach(file => {
				addChanges.push({ uri: file.path, text: fs.readFileSync(file.path).toString() });
			}); 123
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
	};

}


// The command has been defined in the package.json file
// Now provide the implementation of the command with registerCommand
// The commandId parameter must match the command field in package.json
let disposable = vscode.commands.registerCommand('extension1.startSearch', () => {
	// The code you place here will be executed every time your command is executed
	// Display a message box to the user
	vscode.window.showInformationMessage('Hello World from extension1!');
});


}

// This method is called when your extension is deactivated
export function deactivate() {
}
