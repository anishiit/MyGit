#!/usr/bin/env node

/**
 * MyGit CLI Tool with Clone Support
 * 
 * A simplified Git implementation for educational purposes with remote repository support.
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
  .description('A simple Git implementation with clone support')
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
    } catch (error) {
      handleError(error, 'init');
    }
  });

// Clone repository
program
  .command('clone <url> [directory]')
  .description('Clone a repository from a remote URL')
  .option('-b, --branch <branch>', 'Clone a specific branch', 'master')
  .action(async (url, directory, options) => {
    try {
      // If no directory specified, use repo name from URL
      if (!directory) {
        const match = url.match(/\/([^\/]+?)(?:\.git)?(?:\/.*)?$/);
        directory = match ? match[1] : 'repository';
      }

      console.log(chalk.blue(`🌐 Cloning repository from ${url}...`));
      
      const clonedPath = await MyGit.clone(url, directory, {
        branch: options.branch,
        verbose: program.opts().verbose
      });

      console.log(chalk.green(`✓ Repository cloned successfully!`));
      console.log(chalk.blue(`📁 Location: ${clonedPath}`));
      
    } catch (error) {
      handleError(error, 'clone');
    }
  });

// Add files to staging area
program
  .command('add <files...>')
  .description('Add files to the staging area')
  .action(async (files) => {
    try {
      const git = await requireRepository();
      
      for (const file of files) {
        await git.add(file);
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
  .action(async (options) => {
    try {
      const git = await requireRepository();
      
      if (!options.message) {
        throw new Error('Commit message is required. Use -m "your message"');
      }
      
      const commitHash = await git.commit(options.message);
      console.log(chalk.green(`✓ [${await git.reference.getCurrentBranch()} ${commitHash.substring(0, 7)}] ${options.message}`));
      
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
          status.staged.forEach(file => {
            console.log(chalk.green(`\tnew file:   ${file}`));
          });
        }
        
        if (status.modified.length > 0) {
          console.log(chalk.red('\nChanges not staged for commit:'));
          status.modified.forEach(file => {
            console.log(chalk.red(`\tmodified:   ${file}`));
          });
        }
        
        if (status.untracked.length > 0) {
          console.log(chalk.red('\nUntracked files:'));
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
          
          console.log(chalk.yellow(`commit ${commit.hash}`));
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
  .option('-v, --verbose', 'Show commit hash for each branch')
  .action(async (name, options) => {
    try {
      const git = await requireRepository();
      
      if (name) {
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
  .description('Switch branches')
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

// Remote operations
program
  .command('remote')
  .description('List remote repositories')
  .option('-v, --verbose', 'Show remote URLs')
  .action(async (options) => {
    try {
      const git = await requireRepository();
      const remotes = await git.listRemotes();
      
      if (remotes.length === 0) {
        console.log(chalk.yellow('No remotes configured.'));
        return;
      }
      
      remotes.forEach(remote => {
        if (options.verbose) {
          console.log(`${remote.name}\t${remote.url} (fetch)`);
          console.log(`${remote.name}\t${remote.url} (push)`);
        } else {
          console.log(remote.name);
        }
      });
    } catch (error) {
      handleError(error, 'remote');
    }
  });

program
  .command('remote-add <name> <url>')
  .description('Add a new remote repository')
  .action(async (name, url) => {
    try {
      const git = await requireRepository();
      await git.addRemote(name, url);
    } catch (error) {
      handleError(error, 'remote-add');
    }
  });

// Show object information (for debugging/learning)
program
  .command('cat-file <hash>')
  .description('Show object content (for debugging)')
  .option('-p, --pretty', 'Pretty-print object content')
  .action(async (hash, options) => {
    try {
      const git = await requireRepository();
      const obj = await git.objectStore.getObject(hash);
      
      if (options.pretty) {
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
