const ts = require('typescript');
const configPath = ts.findConfigFile('.', ts.sys.fileExists, 'tsconfig.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, '.');
const program = ts.createProgram(parsed.fileNames, parsed.options);
const diagnostics = ts.getPreEmitDiagnostics(program);

const fs = require('fs');
let output = '';

diagnostics.forEach(d => {
    const file = d.file;
    if (file) {
        const { line, character } = file.getLineAndCharacterOfPosition(d.start);
        const message = ts.flattenDiagnosticMessageText(d.messageText, '\n');
        output += `${file.fileName}:${line+1}:${character} - ${message}\n`;
    } else {
        output += ts.flattenDiagnosticMessageText(d.messageText, '\n') + '\n';
    }
});

if (diagnostics.length === 0) {
    output = 'No TypeScript errors found!';
}

fs.writeFileSync('ts-errors.txt', output);
console.log(output);
