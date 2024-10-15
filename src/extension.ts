import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import ignore from 'ignore';

let gitignore: ReturnType<typeof ignore> | null = null;

export function activate(context: vscode.ExtensionContext) {
  console.log('File Path Header extension activated!');

  // Load .gitignore rules
  vscode.workspace.onDidChangeWorkspaceFolders(loadGitignore);
  loadGitignore();

  // Track active editor changes
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      setTimeout(() => tryInsertComment(editor.document), 50); // Delay to ensure editor is ready
    }
  });

  // Register manual command (for testing)
  const disposableCommand = vscode.commands.registerCommand(
    'filePathCommentInserter.insertPath',
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        insertFilePathComment(editor.document);
      } else {
        console.error('No active editor found.');
      }
    }
  );

  context.subscriptions.push(disposableCommand);

  console.log('File Path Header extension setup complete.');
}

export function deactivate() {
  console.log('File Path Header extension deactivated.');
}

// Load .gitignore rules
function loadGitignore() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    console.log('No workspace folders found.');
    return;
  }

  const gitignorePath = path.join(workspaceFolders[0].uri.fsPath, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    gitignore = ignore().add(content);
    console.log('Loaded .gitignore:', gitignore);
  } else {
    gitignore = null;
    console.log('No .gitignore found.');
  }
}

// Try to insert a comment if the document is not ignored

async function tryInsertComment(document: vscode.TextDocument) {
  if (shouldIgnore(document)) {
    console.log(`Ignored: ${document.uri.fsPath}`);
    return;
  }

  console.log(`Attempting insertion for: ${document.uri.fsPath}`);

  // Add a delay to ensure the editor is fully loaded and ready
  setTimeout(() => {
    insertFilePathComment(document);
  }, 100);
}

async function insertFilePathComment(document: vscode.TextDocument) {
  const editor = vscode.window.activeTextEditor;

  if (!editor || document !== editor.document) {
    console.log(`Editor not available or document mismatch for: ${document.uri.fsPath}`);
    return;
  }

  const filePath = vscode.workspace.asRelativePath(document.uri);
  const commentSyntax = getCommentSyntax(document.languageId);

  if (!commentSyntax) {
    console.log(`No comment syntax found for: ${document.languageId}`);
    return;
  }

  const commentText = formatComment(commentSyntax, filePath);
  const firstLine = document.lineAt(0);

  if (firstLine.text.includes(filePath)) {
    console.log(`File path already present: ${filePath}`);
    return; // Avoid duplicate comments
  }

  console.log(`Inserting comment at the top of the file: ${filePath}`);

  try {
    const success = await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), commentText);
    });

    if (success) {
      console.log(`Successfully inserted comment in: ${filePath}`);
    } else {
      console.error(`Failed to insert comment in: ${filePath}`);
    }
  } catch (error) {
    console.error('Error during edit operation:', error);
  }
}


// Check if the document should be ignored
function shouldIgnore(document: vscode.TextDocument): boolean {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) 
  {
     console.log('No workspace folders found.');
     return false; // No workspace open, allow all files
  }
  const workspaceRoot = workspaceFolders[0].uri.fsPath; // Get the root of the workspace
  const absolutePath = document.uri.fsPath; // Absolute path of the current document

  // Convert absolute path to a relative path for the `ignore` library
  const relativePath = path.relative(workspaceRoot, absolutePath);

  console.log(`Checking if ignored: ${relativePath}`);

  if (!gitignore) {
    return false; // No .gitignore loaded, allow all files
  }

  const isIgnored = gitignore.ignores(relativePath); // Check if file is ignored
  console.log(`Ignored: ${relativePath} -> ${isIgnored}`);
  return isIgnored;
}


// Insert the file path comment at the top of the document


// Get the comment syntax for the given language
function getCommentSyntax(languageId: string): CommentSyntax | null {
  const commentSyntaxMap: { [key: string]: CommentSyntax } = {
    // Web Languages
    'html': { start: '<!-- ', end: ' -->' },
    'xml': { start: '<!-- ', end: ' -->' },
    'svg': { start: '<!-- ', end: ' -->' },
    'css': { start: '/* ', end: ' */' },
    'scss': { start: '// ', end: '' },
    'sass': { start: '// ', end: '' },
    'less': { start: '// ', end: '' },
    'javascript': { start: '// ', end: '' },
    'javascriptreact': { start: '// ', end: '' },
    'typescript': { start: '// ', end: '' },
    'typescriptreact': { start: '// ', end: '' },
    'jsonc': { start: '// ', end: '' },

    // Programming Languages
    'python': { start: '# ', end: '' },
    'java': { start: '// ', end: '' },
    'c': { start: '// ', end: '' },
    'cpp': { start: '// ', end: '' },
    'csharp': { start: '// ', end: '' },
    'go': { start: '// ', end: '' },
    'ruby': { start: '# ', end: '' },
    'php': { start: '// ', end: '' },
    'swift': { start: '// ', end: '' },
    'kotlin': { start: '// ', end: '' },
    'rust': { start: '// ', end: '' },
    'dart': { start: '// ', end: '' },
    'perl': { start: '# ', end: '' },
    'haskell': { start: '-- ', end: '' },
    'elixir': { start: '# ', end: '' },
    'erlang': { start: '% ', end: '' },
    'scala': { start: '// ', end: '' },
    'clojure': { start: '; ', end: '' },
    'lua': { start: '-- ', end: '' },
    'matlab': { start: '% ', end: '' },
    'r': { start: '# ', end: '' },
    'julia': { start: '# ', end: '' },
    'fortran': { start: '! ', end: '' },
    'nim': { start: '# ', end: '' },
    'pascal': { start: '{ ', end: ' }' },
    'assembly': { start: '; ', end: '' },
    'vb': { start: "' ", end: '' },
    'powershell': { start: '# ', end: '' },
    'shellscript': { start: '# ', end: '' },
    'makefile': { start: '# ', end: '' },
    'batch': { start: 'REM ', end: '' },
    'fsharp': { start: '// ', end: '' },
    'ocaml': { start: '(* ', end: ' *)' },
    'reason': { start: '// ', end: '' },
    'prolog': { start: '% ', end: '' },
    'lisp': { start: '; ', end: '' },
    'scheme': { start: '; ', end: '' },
    'racket': { start: '; ', end: '' },
    'apex': { start: '// ', end: '' },
    'smalltalk': { start: '"', end: '"' },
    'groovy': { start: '// ', end: '' },
    'tcl': { start: '# ', end: '' },

    // Data and Config Files
    'yaml': { start: '# ', end: '' },
    'toml': { start: '# ', end: '' },
    'ini': { start: '; ', end: '' },
    'properties': { start: '# ', end: '' },
    'dockerfile': { start: '# ', end: '' },
    'gitignore': { start: '# ', end: '' },
    'dotenv': { start: '# ', end: '' },
    'sql': { start: '-- ', end: '' },
    'graphql': { start: '# ', end: '' },
    'terraform': { start: '# ', end: '' },

    // Markup Languages
    'markdown': { start: '<!-- ', end: ' -->' },
    'latex': { start: '% ', end: '' },
    'bibtex': { start: '% ', end: '' },

    // Scripting Languages
    'perl6': { start: '# ', end: '' },
    'coffeescript': { start: '# ', end: '' },
    'haxe': { start: '// ', end: '' },

    // Miscellaneous
    'plaintext': { start: '', end: '' }, // Allow plaintext to pass through
    'diff': { start: '# ', end: '' },
    'dockerignore': { start: '# ', end: '' },
    'gitattributes': { start: '# ', end: '' },
    'gitconfig': { start: '# ', end: '' },
    'ignore': { start: '# ', end: '' },
    'restructuredtext': { start: '.. ', end: '' },
    'vssettings': { start: '<!-- ', end: ' -->' },
    'git-commit': { start: '# ', end: '' },
    'git-rebase': { start: '# ', end: '' },
    'pip-requirements': { start: '# ', end: '' },
    'cabal': { start: '-- ', end: '' },
    'elm': { start: '-- ', end: '' },
    'objective-c': { start: '// ', end: '' },
    'objective-cpp': { start: '// ', end: '' },
    'handlebars': { start: '{{!-- ', end: ' --}}' },
    'mustache': { start: '{{! ', end: ' }}' },
    'twig': { start: '{# ', end: ' #}' },
    'svelte': { start: '<!-- ', end: ' -->' },
    'clojurescript': { start: '; ', end: '' },
    'apl': { start: '⍝ ', end: '' },
    'crystal': { start: '# ', end: '' },
    'verilog': { start: '// ', end: '' },
    'systemverilog': { start: '// ', end: '' },
    'cfml': { start: '<!--- ', end: ' --->' },
    'vue': { start: '<!-- ', end: ' -->' },
    'hcl': { start: '# ', end: '' },
    'puppet': { start: '# ', end: '' },
    'raku': { start: '# ', end: '' },
    'q': { start: '/', end: '' },
    'solidity': { start: '// ', end: '' },
    'vhdl': { start: '-- ', end: '' },
    'zig': { start: '// ', end: '' },
  };

  return commentSyntaxMap[languageId] || null;
}


// Format the comment with the appropriate syntax
interface CommentSyntax {
  start: string;
  end: string;
}

function formatComment(commentSyntax: CommentSyntax, filePath: string): string {
  if (commentSyntax.end) {
    return `${commentSyntax.start}${filePath}${commentSyntax.end}\n`;
  } else {
    return `${commentSyntax.start}${filePath}\n`;
  }
}
