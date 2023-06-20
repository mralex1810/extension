// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import { spawn } from 'node:child_process';
import path = require('path');

var dirName = __dirname?.split(path.sep)
dirName.pop()
var workspaceFolder = vscode.workspace.workspaceFolders?.at(0)?.uri.path.toString() ?? "error";
const runJava = spawn('java', ['-jar',
	"--add-opens", "java.base/java.nio=ALL-UNNAMED",
	"--add-opens", "java.base/sun.nio.ch=ALL-UNNAMED",
	dirName.join(path.sep) + path.sep + "src" + path.sep + 'persistent-caches-1.0-SNAPSHOT-shaded.jar',
	workspaceFolder,
	"true", // reset db
	"parseHead", // parseHead
	"true", // enable trigram index
	"true", // enable camel case index
]);

enum Operation {
	trigramSearch,
	ccSearch,
}

interface OpReq {
	operation: Operation
	request: string
	start: number
}

var currentOperation: OpReq | null = null;
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


function getWebviewContent(req: string, text: string, time: string, prevNext: boolean) {
	return `<html>
	<head>
		<title>Alert Box</title>
		<script type="text/javascript">
		const vscode = acquireVsCodeApi();
			function onClick(com) {
				const text = document.getElementById('search').value;
				vscode.postMessage({
					command: com,
					text: text
				});
			}

			function openFile(uri) {
				vscode.postMessage({
					command: 'open',
					text: uri
				});
			}
			
		</script>
	</head>
	<body>
	<input type="text" id="search" style="font-size:50px"/><br />
	<input type="button" value="Trigram search" onclick="onClick('search')" style="font-size:25px" />
	<input type="button" value="Checkout" onclick="onClick('checkout')" style="font-size:25px">
	<input type="button" value="Camel case search" onclick="onClick('ccsearch')" style="font-size:25px">
	</body>
	<body>
	<p style="font-size:25px">${req}</p>
	<p style="font-size:25px">${time}</p>
	<p style="font-size:25px">${text}</p>
	</body>
	${prevNext ? `<br>
	<body>
	<input type="button" value="Previous 10" onclick="onClick('prev')" style="font-size:25px">
	<input type="button" value="Next 10" onclick="onClick('next')" style="font-size:25px">
	</body>`: ""}
	</html>
	`;
}

function fileToHref(filePath: string, name: string | null) {
	const fileName = name != null ? name : path.basename(filePath);
	var thisPath = workspaceFolder.trim() + path.sep + filePath.trim()
	return `<a href="${filePath}" onclick="openFile('${thisPath}')">${fileName}</a>`
}




function showNew(panel: vscode.WebviewPanel, list: string, total: string, time: string) {
	if (currentOperation == null) {
		throw new Error("must have operation");
	}
	panel.webview.html = getWebviewContent(
		`Results for \"${currentOperation.request}\"
		found ${total}`,
		`<ol start="${currentOperation.start + 1}" style="font-size:25px">`
		+
		list
		+
		"</ol>", "execution time " + time + " ms", parseInt(total) > 10
	)
}

function processRequest(panel: vscode.WebviewPanel, data: string) {
	if (currentOperation?.operation == Operation.ccSearch) {
		processCcSearch(panel, data)

	}
	if (currentOperation?.operation == Operation.trigramSearch) {
		processTrigramSearch(panel, data)
	}
}

function processTrigramSearch(panel: vscode.WebviewPanel, data: string) {
	var variables = data.toString().trim().split("\n");
	var total = variables[0];
	var time = variables[1];
	var rest = variables.slice(2);
	var list = rest.map(it => fileToHref(it, null)).map((it: string) => "<li>" + it + "</li>").join("\n")
	// console.log(list)
	showNew(panel, list, total, time)
	// vscode.commands.executeCommand(
	// `extension.openFile`, "abacaba")

}

const toListElement = (it: string) => "<li>" + it + "</li>";
function processCcSearch(panel: vscode.WebviewPanel, data: string) {
	var variables = data.toString().trim().split("\n");
	var total = variables[0];
	var time = variables[1];
	var rest = variables.slice(2);
	if (currentOperation == null) {
		throw new Error("must have operation");
	}
	var list = rest
		.map(it => it.split(" "))
		.map(it => [colorCcResult(it[0], it.slice(2).map(i => parseInt(i))), it[1]])
		.map(it => fileToHref(it[1], it[0]))
		.map(toListElement)
		.join("\n")
	showNew(panel, list, total, time)
}

function colorCcResult(name: string, indexes: number[]): string {
	var res = ""
	for (var i = 0; i < name.length; i++) {
		if (indexes.find(it => it === i) !== undefined) {
			res += `<span style="background-color: yellow;">${name[i]}</span>`
		} else {
			res += name[i];
		}
	}
	return res
}



function openFile(uri: string) {
	// Open the file when the command is triggered
	vscode.workspace.openTextDocument(uri)
		.then(vscode.window.showTextDocument);
}

const BUCKET_SIZE = 10;
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const panel = vscode.window.createWebviewPanel(
		'search', // Identifies the type of the webview. Used internally
		'Search', // Title of the panel displayed to the user
		vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
		{ enableScripts: true } // Webview options. More on these later.

	);

	panel.webview.html = getWebviewContent("", "", "", false);

	context.subscriptions.push(
		vscode.commands.registerCommand("extension.openFile", openFile)
	);

	panel.webview.onDidReceiveMessage(message => {
		switch (message.command) {
			case 'search':
				currentOperation = { operation: Operation.trigramSearch, request: message.text, start: 0 }
				runJava.stdout.once('data', (data: string) => processRequest(panel, data));
				runJava.stdin.write("search\n" + message.text);
				console.log('search');
				console.log(message.text);
				return;
			case 'checkout':
				runJava.stdout.once('data', (data: string) =>
					panel.webview.html = getWebviewContent("checkout to " + message.text, "", "execution time " + data + " ms", false)
				);
				runJava.stdin.write("checkout\n" + message.text);
				console.log('checkout');
				console.log(message.text);
				return;
			case 'ccsearch':
				currentOperation = { operation: Operation.ccSearch, request: message.text, start: 0 }
				runJava.stdout.once('data', (data: string) => processRequest(panel, data));
				runJava.stdin.write("ccsearch\n" + message.text);
				console.log('ccsearch');
				console.log(message.text);
				return;
			case 'next':
				if (currentOperation == null) {
					throw new Error("must have operation");
				}
				currentOperation.start += BUCKET_SIZE
				runJava.stdout.once('data', (data: string) => processRequest(panel, data));
				runJava.stdin.write("next\n");
				console.log('next');
				return;
			case 'prev':
				if (currentOperation == null) {
					throw new Error("must have operation");
				}
				currentOperation.start -= BUCKET_SIZE
				runJava.stdout.once('data', (data: string) => processRequest(panel, data));
				runJava.stdin.write("prev\n");
				console.log('prev');
				return
			case 'open':
				openFile(message.text)
		}
	},
		undefined,
		context.subscriptions
	);

	// Register the command to open the file


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

