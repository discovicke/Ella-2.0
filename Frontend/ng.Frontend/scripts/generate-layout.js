/**
 * Usage: npm run layout <name>
 * Logic:
 * 1. If run from Project Root -> Defaults to 'src/app/pages'
 * 2. If run from ANY subfolder -> Creates it right there.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const inputPath = args[0];

if (!inputPath) {
  console.error('❌ Error: Name required. Try: npm run layout admin');
  process.exit(1);
}

// 1. Context Detection (The "Trust Me" Fix)
const projectRoot = path.resolve(__dirname, '..');
const pagesRoot = path.join(projectRoot, 'src/app/pages');

// Get the actual folder where the user typed the command
const originalCwd = process.env.INIT_CWD || process.cwd();

let targetBaseDir;

// NORMALIZATION: Handle Windows case-insensitivity
const normProjectRoot = path.normalize(projectRoot).toLowerCase();
const normCwd = path.normalize(originalCwd).toLowerCase();

// LOGIC: Are we standing at the root?
if (normCwd === normProjectRoot) {
  // ✅ Case A: User is at Root -> Send to default 'pages' folder
  console.log(`📂 Running from Root. Defaulting to: src/app/pages`);
  targetBaseDir = pagesRoot;
} else {
  // ✅ Case B: User is in a folder -> Trust them
  console.log(`📂 Running from: ${path.relative(projectRoot, originalCwd)}`);
  targetBaseDir = originalCwd;
}

// 2. Parse Names
const parts = inputPath.split('/');
const name = parts[parts.length - 1];
const parentPath = parts.slice(0, -1).join('/');

const toPascal = (s) => s.replace(/(^\w|-\w)/g, (m) => m.replace('-', '').toUpperCase());
const toKebab = (s) => s.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();

const kebabName = toKebab(name);
const className = `${toPascal(name)}Layout`;
const selector = `app-${kebabName}-layout`;

// 3. Final Target Directory
const targetDir = path.join(targetBaseDir, parentPath, kebabName);
const relativePath = path.relative(projectRoot, targetDir);

if (fs.existsSync(targetDir)) {
  console.error(`❌ Error: ${relativePath} already exists.`);
  process.exit(1);
}

// 4. Templates
const tsContent = `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: '${selector}',
  imports: [RouterOutlet],
  templateUrl: './${kebabName}.layout.html',
  styleUrl: './${kebabName}.layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ${className} {}
`;

const specContent = `import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ${className} } from './${kebabName}.layout';

describe('${className}', () => {
  let component: ${className};
  let fixture: ComponentFixture<${className}>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [${className}],
    }).compileComponents();

    fixture = TestBed.createComponent(${className});
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
`;

const htmlContent = `<div class="layout-wrapper">\n  <router-outlet />\n</div>\n`;
const scssContent = ``;

// 5. Write Files
fs.mkdirSync(targetDir, { recursive: true });

function writeFile(fileName, content) {
  const filePath = path.join(targetDir, fileName);
  fs.writeFileSync(filePath, content);
  // Angular Style Log: CREATE src/... (bytes)
  const relFile = path.join(relativePath, fileName).replace(/\\/g, '/');
  console.log(`CREATE ${relFile} (${content.length} bytes)`);
}

writeFile(`${kebabName}.layout.html`, htmlContent);
writeFile(`${kebabName}.layout.spec.ts`, specContent);
writeFile(`${kebabName}.layout.ts`, tsContent);
writeFile(`${kebabName}.layout.scss`, scssContent);
