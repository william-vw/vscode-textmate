/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as fs from 'fs';
import { Registry, IGrammar, parseRawGrammar } from '../main';
import { StateStack as StackElementImpl, Grammar as GrammarImpl } from '../grammar';
import * as debug from '../debug';
import { getOniguruma } from './onigLibs';

class ExtendedStackElement extends StackElementImpl {
	_instanceId?: number;
}

debug.DebugFlags.InDebugMode = true;

if (process.argv.length < 4) {
	console.log('usage: node index.js <mainGrammarPath> [<additionalGrammarPath1> ...] <filePath>');
	process.exit(0);
}

const GRAMMAR_PATHS = process.argv.slice(2, process.argv.length - 1);
const FILE_PATH = process.argv[process.argv.length - 1];

const registry = new Registry({
	onigLib: getOniguruma(),
	loadGrammar: () => Promise.resolve(null)
});
let grammarPromises: Promise<IGrammar>[] = [];
for (let path of GRAMMAR_PATHS) {
	console.log('LOADING GRAMMAR: ' + path);
	const content = fs.readFileSync(path).toString();
	const rawGrammar = parseRawGrammar(content, path);
	grammarPromises.push(registry.addGrammar(rawGrammar));
}

Promise.all(grammarPromises).then(_grammars => {
	const grammar = _grammars[0];
	const fileContents = fs.readFileSync(FILE_PATH).toString();
	const lines = fileContents.split(/\r\n|\r|\n/);
	let ruleStack = null;
	let lastElementId = 0;
	// source:
	// https://github.com/microsoft/vscode-textmate
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		const lineTokens = grammar.tokenizeLine(line, ruleStack);
		console.log(`\nTokenizing line: ${line}`);
		for (let j = 0; j < lineTokens.tokens.length; j++) {
		    const token = lineTokens.tokens[j];
		    console.log(` - token from ${token.startIndex} to ${token.endIndex} ` +
		      `(${line.substring(token.startIndex, token.endIndex)}) ` +
		      `with scopes ${token.scopes.join(', ')}`
		    );
		}
		ruleStack = lineTokens.ruleStack;
	}
});
