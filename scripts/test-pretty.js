const { spawn } = require('child_process');
const readline = require('readline');

const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m",
    dim: "\x1b[2m"
};

console.log(`${colors.bright}${colors.cyan}--- ELLA TEST RUNNER ---${colors.reset}\n`);

const dotnet = spawn('dotnet', ['test', 'Backend.Tests/Backend.Tests.csproj', '--logger', 'console;verbosity=normal', '--nologo', '-p:SkipOpenApi=true']);

const rl = readline.createInterface({
    input: dotnet.stdout,
    terminal: false
});

let currentClass = "";
let captureFailure = false;

rl.on('line', (line) => {
    const match = line.match(/^\s*(Passed|Failed|Skipped)\s+([\w\.]+)\.([\w_]+)\s+\[.*\]/);
    
    if (match) {
        const [_, status, fullClass, method] = match;
        const className = fullClass.split('.').pop();

        if (className !== currentClass) {
            currentClass = className;
            console.log(`\n${colors.bright}${colors.yellow}[ ${currentClass} ]${colors.reset}`);
        }

        const statusColor = status === 'Passed' ? colors.green : (status === 'Failed' ? colors.red : colors.yellow);
        const icon = status === 'Passed' ? '✓' : (status === 'Failed' ? '✗' : '!');
        
        console.log(`  ${statusColor}${icon}${colors.reset} ${method}: ${statusColor}${status.toUpperCase()}${colors.reset}`);
        
        captureFailure = (status === 'Failed');
    } else if (captureFailure && line.trim().startsWith('Error Message:')) {
        console.log(`     ${colors.red}${line.trim()}${colors.reset}`);
    } else if (captureFailure && line.trim().startsWith('Stack Trace:')) {
        captureFailure = false; // We stop at stack trace to keep it clean, but could show it if wanted
    } else if (captureFailure && line.trim() && !line.includes("Standard Output")) {
        console.log(`     ${colors.dim}${line.trim()}${colors.reset}`);
    }
});

dotnet.on('close', (code) => {
    console.log(`\n${colors.dim}-------------------------------------------${colors.reset}`);
    if (code === 0) {
        console.log(`${colors.green}${colors.bright}✨ ALLA TESTER GODKÄNDA!${colors.reset}\n`);
    } else {
        console.log(`${colors.red}${colors.bright}❌ NÅGOT GICK FEL I TESTERNA.${colors.reset}\n`);
    }
});
