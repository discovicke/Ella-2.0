const { spawn } = require("child_process");
const readline = require("readline");
const ui = require("./lib/ella-ui");
const { c } = ui;

ui.header("Test Runner");

const dotnet = spawn("dotnet", [
  "test",
  "Backend.Tests/Backend.Tests.csproj",
  "--logger",
  "console;verbosity=normal",
  "--nologo",
  "-p:SkipOpenApi=true",
]);

const rl = readline.createInterface({
  input: dotnet.stdout,
  terminal: false,
});

let currentClass = "";
let captureFailure = false;

rl.on("line", (line) => {
  const match = line.match(
    /^\s*(Passed|Failed|Skipped)\s+([\w\.]+)\.([\w_]+)\s+\[.*\]/,
  );

  if (match) {
    const [_, status, fullClass, method] = match;
    const className = fullClass.split(".").pop();

    if (className !== currentClass) {
      currentClass = className;
      console.log(`\n  ${c.bold}${c.yellow}${currentClass}${c.reset}`);
    }

    const statusColor =
      status === "Passed" ? c.green : status === "Failed" ? c.red : c.yellow;
    const icon = status === "Passed" ? "✔" : status === "Failed" ? "✖" : "▲";

    console.log(
      `  ${statusColor}${icon}${c.reset} ${method}: ${statusColor}${status.toUpperCase()}${c.reset}`,
    );

    captureFailure = status === "Failed";
  } else if (captureFailure && line.trim().startsWith("Error Message:")) {
    console.log(`     ${c.red}${line.trim()}${c.reset}`);
  } else if (captureFailure && line.trim().startsWith("Stack Trace:")) {
    captureFailure = false; // We stop at stack trace to keep it clean, but could show it if wanted
  } else if (
    captureFailure &&
    line.trim() &&
    !line.includes("Standard Output")
  ) {
    console.log(`     ${c.dim}${line.trim()}${c.reset}`);
  }
});

dotnet.on("close", (code) => {
  if (code === 0) {
    ui.done("All tests passed!");
  } else {
    console.log("");
    ui.fail(`${c.bold}Some tests failed.${c.reset}`);
  }
  ui.footer();
});
