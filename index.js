#!/usr/bin/env node

const { Command } = require('commander');
const MyGit = require('./src/MyGit');
const chalk = require('chalk');

const program = new Command();

program
  .name('mygit')
  .description('A simple Git implementation')
  .version('1.0.0');

// Initialize repository
program
  .command('init [directory]')
  .description('Initialize a new repository')
  .action(async (directory = '.') => {
    try {
      const git = new MyGit(directory);
      await git.init();
      console.log(chalk.green(`Initialized empty MyGit repository in ${directory}/.mygit/`));
    } catch (error) {
      console.error(chalk.red('Error:', error.message));
    }
  });

// Add files to staging area
program
  .command('add <files...>')
  .description('Add files to the staging area')
  .action(async (files) => {
    try {
      const git = new MyGit('.');
      for (const file of files) {
        await git.add(file);
      }
      console.log(chalk.green(`Added ${files.length} file(s) to staging area`));
    } catch (error) {
      console.error(chalk.red('Error:', error.message));
    }
  });

// Commit changes
program
  .command('commit')
  .description('Commit staged changes')
  .option('-m, --message <message>', 'commit message')
  .action(async (options) => {
    try {
      const git = new MyGit('.');
      const commitHash = await git.commit(options.message || 'No commit message');
      console.log(chalk.green(`Committed as ${commitHash.substring(0, 7)}`));
    } catch (error) {
      console.error(chalk.red('Error:', error.message));
    }
  });

// Show status
program
  .command('status')
  .description('Show the working directory status')
  .action(async () => {
    try {
      const git = new MyGit('.');
      const status = await git.status();
      console.log(chalk.blue('On branch'), chalk.bold(status.branch));
      
      if (status.staged.length > 0) {
        console.log(chalk.green('\nChanges to be committed:'));
        status.staged.forEach(file => {
          console.log(chalk.green(`  modified: ${file}`));
        });
      }
      
      if (status.modified.length > 0) {
        console.log(chalk.red('\nChanges not staged for commit:'));
        status.modified.forEach(file => {
          console.log(chalk.red(`  modified: ${file}`));
        });
      }
      
      if (status.untracked.length > 0) {
        console.log(chalk.red('\nUntracked files:'));
        status.untracked.forEach(file => {
          console.log(chalk.red(`  ${file}`));
        });
      }
      
      if (status.staged.length === 0 && status.modified.length === 0 && status.untracked.length === 0) {
        console.log(chalk.green('\nNothing to commit, working tree clean'));
      }
    } catch (error) {
      console.error(chalk.red('Error:', error.message));
    }
  });

// Show commit log
program
  .command('log')
  .description('Show commit history')
  .option('-n, --number <count>', 'number of commits to show', '10')
  .action(async (options) => {
    try {
      const git = new MyGit('.');
      const commits = await git.log(parseInt(options.number));
      
      commits.forEach(commit => {
        console.log(chalk.yellow(`commit ${commit.hash}`));
        console.log(`Author: ${commit.author}`);
        console.log(`Date: ${commit.date}`);
        console.log(`\n    ${commit.message}\n`);
      });
    } catch (error) {
      console.error(chalk.red('Error:', error.message));
    }
  });

// Create branch
program
  .command('branch [name]')
  .description('List or create branches')
  .action(async (name) => {
    try {
      const git = new MyGit('.');
      if (name) {
        await git.createBranch(name);
        console.log(chalk.green(`Created branch '${name}'`));
      } else {
        const branches = await git.listBranches();
        branches.forEach(branch => {
          if (branch.current) {
            console.log(chalk.green(`* ${branch.name}`));
          } else {
            console.log(`  ${branch.name}`);
          }
        });
      }
    } catch (error) {
      console.error(chalk.red('Error:', error.message));
    }
  });

// Checkout branch
program
  .command('checkout <branch>')
  .description('Switch to a branch')
  .action(async (branch) => {
    try {
      const git = new MyGit('.');
      await git.checkout(branch);
      console.log(chalk.green(`Switched to branch '${branch}'`));
    } catch (error) {
      console.error(chalk.red('Error:', error.message));
    }
  });

program.parse(process.argv);