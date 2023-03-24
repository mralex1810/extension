// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { Server } from 'http';
import * as vscode from 'vscode';
import * as fs from 'fs';

const { spawn } = require('node:child_process');
const runJava = spawn('java', ['-cp', 'extension1/src', 'caches.SaveChanges', 'Java started']);
const oldFiles = new Map<String, String>();
const newFiles = new Map<String, String>();

function pushEvents(events: object) {
	console.log(JSON.stringify(events));

	runJava.stdin.write(JSON.stringify(events) + '\r\n');

	runJava.stdout.on('data', (data: String) => {
		console.log(`stdout: ${data}`);

	});

	runJava.stderr.on('data', (data: String) => {
		console.error(`stderr: ${data}`);
	});

	runJava.on('close', (code: Number) => {
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
export function activate(context: vscode.ExtensionContext) {

	const panel = vscode.window.createWebviewPanel(
        'search', // Identifies the type of the webview. Used internally
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
	  },
	  undefined,
	  context.subscriptions
    );

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
		} else {
			vscode.commands.executeCommand('default:type', args);
		}
	});


	if (workspace !== undefined) {

		let modifyChanges: String[] = [];
		let addChanges: String[] = [];
		let deleteChanges: String[] = [];
		let renameChanges: String[] = [];

		let intervalId = setInterval(() => {
			newFiles.forEach((key: String, value: String) => {
				modifyChanges.push(JSON.stringify({uri: key, oldText: oldFiles.get(key), newText: value}));
			});
			const events = {timestamp: Date.now(), modifyChanges: modifyChanges, addChanges: addChanges, deleteChanges: deleteChanges, renameChanges: renameChanges};
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
				addChanges.push(JSON.stringify({timestamp: Date.now(), uri: file.path, text: fs.readFileSync(file.path)}));
			});
		});
		workspace.onDidDeleteFiles(event => {
			console.log("delete files");
			event.files.forEach(file => {
				deleteChanges.push(JSON.stringify({timestamp: Date.now(), uri: file.path}));
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
				renameChanges.push(JSON.stringify({timestamp: Date.now(), oldUri: file.oldUri, newUri: file.newUri}));
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

// This method is called when your extension is deactivated
export function deactivate() {
}
