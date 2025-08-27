#!/usr/bin/env node

/**
 * MyGit CLI Tool
 * 
 * A simplified Git implementation for educational purposes.
 * This tool demonstrates core Git concepts including:
 * - Object storage with SHA-1 hashing
 * - Staging area (index) management
 * - Branch and reference handling
 * - Basic version control operations
 * 
 * Usage: node mygit-cli.js <command> [options]
 */

const { Command } = require('commander');
const MyGit = require('./src/MyGit');
const chalk = require('chalk');
const path = require('path');

const program = new Command();

// Global error handler
function handleError(error, command) {
  console.error(chalk.red('Error in'), chalk.bold(command) + ':');
  console.error(chalk.red(error.message));
  
  if (process.env.DEBUG) {
    console.error(chalk.gray(error.stack));
  }
  
  process.exit(1);
}

// Utility to check if we're in a MyGit repository
async function requireRepository() {
  const git = new MyGit('.');
  const gitDir = path.join(process.cwd(), '.mygit');
  const fs = require('fs-extra');
  
  if (!await fs.pathExists(gitDir)) {
    throw new Error('Not a MyGit repository. Run "mygit init" to initialize one.');
  }
  
  return git;
}

program
  .name('mygit')
  .description('A simple Git implementation for learning purposes')
  .version('1.0.0')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--debug', 'Enable debug mode');

// Initialize repository
program
  .command('init [directory]')
  .description('Initialize a new MyGit repository')
  .action(async (directory = '.') => {
    try {
      const git = new MyGit(directory);
      await git.init();
      console.log(chalk.green(`✓ Initialized empty MyGit repository in ${path.resolve(directory)}/.mygit/`));
      
      if (program.opts().verbose) {
        console.log(chalk.blue('\nRepository structure:'));
        console.log('  .mygit/objects/     - Object storage');
        console.log('  .mygit/refs/heads/  - Branch references');
        console.log('  .mygit/HEAD         - Current branch pointer');
        console.log('  .mygit/index        - Staging area');
      }
    } catch (error) {
      handleError(error, 'init');
    }
  });

// Add files to staging area
program
  .command('add <files...>')
  .description('Add files to the staging area')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (files, options) => {
    try {
      const git = await requireRepository();
      
      for (const file of files) {
        await git.add(file);
        if (options.verbose) {
          console.log(chalk.green(`✓ Added ${file} to staging area`));
        }
      }
      
      console.log(chalk.green(`✓ Added ${files.length} file(s) to staging area`));
    } catch (error) {
      handleError(error, 'add');
    }
  });

// Commit changes
program
  .command('commit')
  .description('Record changes to the repository')
  .option('-m, --message <message>', 'Use the given message as the commit message')
  .option('-v, --verbose', 'Show detailed commit information')
  .action(async (options) => {
    try {
      const git = await requireRepository();
      
      if (!options.message) {
        throw new Error('Commit message is required. Use -m "your message"');
      }
      
      const commitHash = await git.commit(options.message);
      console.log(chalk.green(`✓ [${await git.reference.getCurrentBranch()} ${commitHash.substring(0, 7)}] ${options.message}`));
      
      if (options.verbose) {
        const commitData = await git.objectStore.getCommit(commitHash);
        console.log(chalk.blue('\nCommit details:'));
        console.log(`  Hash: ${commitHash}`);
        console.log(`  Tree: ${commitData.tree}`);
        console.log(`  Parent: ${commitData.parent || 'none'}`);
        console.log(`  Author: ${commitData.author}`);
        console.log(`  Date: ${commitData.date}`);
      }
    } catch (error) {
      handleError(error, 'commit');
    }
  });

// Show repository status
program
  .command('status')
  .description('Show the working directory status')
  .option('-s, --short', 'Give the output in the short format')
  .action(async (options) => {
    try {
      const git = await requireRepository();
      const status = await git.status();
      
      if (options.short) {
        // Short format output
        status.staged.forEach(file => console.log(chalk.green(`A  ${file}`)));
        status.modified.forEach(file => console.log(chalk.red(`M  ${file}`)));
        status.untracked.forEach(file => console.log(chalk.red(`?? ${file}`)));
      } else {
        // Long format output
        console.log(chalk.blue('On branch'), chalk.bold(status.branch));
        
        if (status.staged.length > 0) {
          console.log(chalk.green('\nChanges to be committed:'));
          console.log(chalk.gray('  (use "mygit reset HEAD <file>..." to unstage)'));
          status.staged.forEach(file => {
            console.log(chalk.green(`\tnew file:   ${file}`));
          });
        }
        
        if (status.modified.length > 0) {
          console.log(chalk.red('\nChanges not staged for commit:'));
          console.log(chalk.gray('  (use "mygit add <file>..." to update what will be committed)'));
          status.modified.forEach(file => {
            console.log(chalk.red(`\tmodified:   ${file}`));
          });
        }
        
        if (status.untracked.length > 0) {
          console.log(chalk.red('\nUntracked files:'));
          console.log(chalk.gray('  (use "mygit add <file>..." to include in what will be committed)'));
          status.untracked.forEach(file => {
            console.log(chalk.red(`\t${file}`));
          });
        }
        
        if (status.staged.length === 0 && status.modified.length === 0 && status.untracked.length === 0) {
          console.log(chalk.green('\nnothing to commit, working tree clean'));
        }
      }
    } catch (error) {
      handleError(error, 'status');
    }
  });

// Show commit history
program
  .command('log')
  .description('Show commit logs')
  .option('-n, --max-count <number>', 'Limit the number of commits to output', '10')
  .option('--oneline', 'Show each commit on a single line')
  .option('--graph', 'Show ASCII graph of branch/merge history')
  .action(async (options) => {
    try {
      const git = await requireRepository();
      const commits = await git.log(parseInt(options.maxCount));
      
      if (commits.length === 0) {
        console.log(chalk.yellow('No commits yet.'));
        return;
      }
      
      commits.forEach((commit, index) => {
        if (options.oneline) {
          console.log(chalk.yellow(commit.hash.substring(0, 7)) + ' ' + commit.message);
        } else {
          if (index > 0) console.log(); // Add spacing between commits
          
          if (options.graph) {
            console.log(chalk.red('*') + chalk.yellow(` commit ${commit.hash}`));
          } else {
            console.log(chalk.yellow(`commit ${commit.hash}`));
          }
          
          console.log(`Author: ${commit.author}`);
          console.log(`Date:   ${new Date(commit.date).toDateString()}`);
          console.log('');
          console.log(`    ${commit.message}`);
        }
      });
    } catch (error) {
      handleError(error, 'log');
    }
  });

// Branch management
program
  .command('branch [name]')
  .description('List, create, or delete branches')
  .option('-d, --delete <branch>', 'Delete a branch')
  .option('-v, --verbose', 'Show commit hash for each branch')
  .action(async (name, options) => {
    try {
      const git = await requireRepository();
      
      if (options.delete) {
        await git.reference.deleteBranch(options.delete);
        console.log(chalk.green(`✓ Deleted branch '${options.delete}'`));
      } else if (name) {
        await git.createBranch(name);
        console.log(chalk.green(`✓ Created branch '${name}'`));
      } else {
        const branches = await git.listBranches();
        
        if (branches.length === 0) {
          console.log(chalk.yellow('No branches yet.'));
          return;
        }
        
        for (const branch of branches) {
          const marker = branch.current ? chalk.green('* ') : '  ';
          let output = marker + branch.name;
          
          if (options.verbose) {
            const commit = await git.reference.getBranchCommit(branch.name);
            if (commit) {
              const commitData = await git.objectStore.getCommit(commit);
              output += chalk.gray(` ${commit.substring(0, 7)} ${commitData.message}`);
            }
          }
          
          console.log(output);
        }
      }
    } catch (error) {
      handleError(error, 'branch');
    }
  });

// Switch branches
program
  .command('checkout <branch>')
  .description('Switch branches or restore working tree files')
  .option('-b, --new-branch', 'Create a new branch and switch to it')
  .action(async (branch, options) => {
    try {
      const git = await requireRepository();
      
      if (options.newBranch) {
        await git.createBranch(branch);
        await git.checkout(branch);
        console.log(chalk.green(`✓ Switched to a new branch '${branch}'`));
      } else {
        await git.checkout(branch);
        console.log(chalk.green(`✓ Switched to branch '${branch}'`));
      }
    } catch (error) {
      handleError(error, 'checkout');
    }
  });

// Show object information (for debugging/learning)
program
  .command('cat-file <hash>')
  .description('Show object content (for debugging)')
  .option('-t, --type', 'Show object type')
  .option('-s, --size', 'Show object size')
  .option('-p, --pretty', 'Pretty-print object content')
  .action(async (hash, options) => {
    try {
      const git = await requireRepository();
      const obj = await git.objectStore.getObject(hash);
      
      if (options.type) {
        console.log(obj.type);
      } else if (options.size) {
        console.log(obj.size);
      } else if (options.pretty) {
        console.log(chalk.blue(`Object type: ${obj.type}`));
        console.log(chalk.blue(`Object size: ${obj.size} bytes`));
        console.log(chalk.blue('Content:'));
        
        if (obj.type === 'blob') {
          console.log(obj.content.toString());
        } else if (obj.type === 'commit') {
          const commit = await git.objectStore.getCommit(hash);
          console.log(`tree ${commit.tree}`);
          if (commit.parent) console.log(`parent ${commit.parent}`);
          console.log(`author ${commit.author}`);
          console.log(`committer ${commit.committer || commit.author}`);
          console.log('');
          console.log(commit.message);
        } else {
          console.log(obj.content.toString());
        }
      } else {
        console.log(obj.content.toString());
      }
    } catch (error) {
      handleError(error, 'cat-file');
    }
  });

// Show help when no command is provided
if (process.argv.length <= 2) {
  program.help();
}

program.parse(process.argv);
