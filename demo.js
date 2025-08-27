#!/usr/bin/env node

/**
 * MyGit Demonstration Script
 * 
 * This script demonstrates the core functionality of our Git implementation
 * by walking through a typical development workflow.
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class GitDemo {
  constructor() {
    this.demoDir = path.join(__dirname, 'demo-project');
    this.gitCommand = 'node ' + path.join(__dirname, 'mygit-cli.js');
  }

  async log(message, color = 'blue') {
    console.log(chalk[color](`\n📝 ${message}`));
  }

  async execute(command, description) {
    console.log(chalk.gray(`\n$ ${command}`));
    
    try {
      const { stdout, stderr } = await execAsync(command, { cwd: this.demoDir });
      if (stdout) console.log(stdout.trim());
      if (stderr) console.log(chalk.red(stderr.trim()));
    } catch (error) {
      console.log(chalk.red(`Error: ${error.message}`));
    }
  }

  async createFile(filename, content) {
    const filePath = path.join(this.demoDir, filename);
    await fs.writeFile(filePath, content);
    console.log(chalk.green(`✓ Created ${filename}`));
  }

  async runDemo() {
    console.log(chalk.bold.blue('\n🚀 MyGit Implementation Demo'));
    console.log(chalk.gray('This demo shows how to use our custom Git implementation\n'));

    // Clean up and create demo directory
    await fs.remove(this.demoDir);
    await fs.ensureDir(this.demoDir);

    await this.log('Step 1: Initialize a new repository');
    await this.execute(`${this.gitCommand} init`, 'Initialize repository');

    await this.log('Step 2: Create some files');
    await this.createFile('README.md', `# My Project

This is a demo project for MyGit implementation.

## Features
- Custom version control
- Educational purpose
- Git-compatible workflow
`);

    await this.createFile('app.js', `// Main application file
console.log('Hello, MyGit!');

function main() {
    console.log('Running MyGit demo...');
}

main();
`);

    await this.createFile('package.json', `{
  "name": "mygit-demo",
  "version": "1.0.0",
  "description": "Demo project for MyGit",
  "main": "app.js",
  "scripts": {
    "start": "node app.js"
  }
}
`);

    await this.log('Step 3: Check repository status');
    await this.execute(`${this.gitCommand} status`, 'Show status');

    await this.log('Step 4: Add files to staging area');
    await this.execute(`${this.gitCommand} add README.md app.js`, 'Add multiple files');

    await this.log('Step 5: Check status after staging');
    await this.execute(`${this.gitCommand} status`, 'Show status with staged files');

    await this.log('Step 6: Commit the changes');
    await this.execute(`${this.gitCommand} commit -m "Initial commit: Add README, app.js"`, 'Create first commit');

    await this.log('Step 7: Add remaining file and commit');
    await this.execute(`${this.gitCommand} add package.json`, 'Add package.json');
    await this.execute(`${this.gitCommand} commit -m "Add package.json"`, 'Second commit');

    await this.log('Step 8: View commit history');
    await this.execute(`${this.gitCommand} log`, 'Show detailed log');
    await this.execute(`${this.gitCommand} log --oneline`, 'Show compact log');

    await this.log('Step 9: Create a feature branch');
    await this.execute(`${this.gitCommand} branch feature/user-auth`, 'Create new branch');
    await this.execute(`${this.gitCommand} branch -v`, 'List all branches');

    await this.log('Step 10: Switch to feature branch');
    await this.execute(`${this.gitCommand} checkout feature/user-auth`, 'Switch branches');

    await this.log('Step 11: Develop feature on branch');
    await this.createFile('auth.js', `// User authentication module
class AuthManager {
    constructor() {
        this.users = new Map();
    }

    register(username, password) {
        if (this.users.has(username)) {
            throw new Error('User already exists');
        }
        
        this.users.set(username, {
            password: this.hashPassword(password),
            createdAt: new Date()
        });
        
        return true;
    }

    login(username, password) {
        const user = this.users.get(username);
        if (!user || user.password !== this.hashPassword(password)) {
            throw new Error('Invalid credentials');
        }
        
        return { username, loginAt: new Date() };
    }

    hashPassword(password) {
        // Simple hash for demo (don't use in production!)
        return Buffer.from(password).toString('base64');
    }
}

module.exports = AuthManager;
`);

    await this.execute(`${this.gitCommand} add auth.js`, 'Add auth module');
    await this.execute(`${this.gitCommand} commit -m "Add user authentication module"`, 'Commit feature');

    await this.log('Step 12: Update main app to use auth');
    await this.createFile('app.js', `// Main application file
const AuthManager = require('./auth');

console.log('Hello, MyGit!');

function main() {
    console.log('Running MyGit demo with authentication...');
    
    const auth = new AuthManager();
    
    try {
        // Demo user registration and login
        auth.register('demo-user', 'password123');
        console.log('User registered successfully');
        
        const session = auth.login('demo-user', 'password123');
        console.log('User logged in:', session.username);
        
    } catch (error) {
        console.error('Auth error:', error.message);
    }
}

main();
`);

    await this.execute(`${this.gitCommand} add app.js`, 'Update main app');
    await this.execute(`${this.gitCommand} commit -m "Integrate authentication with main app"`, 'Commit integration');

    await this.log('Step 13: View branch comparison');
    await this.execute(`${this.gitCommand} log --oneline`, 'Show feature branch history');

    await this.log('Step 14: Switch back to master');
    await this.execute(`${this.gitCommand} checkout master`, 'Switch to master');
    await this.execute(`${this.gitCommand} log --oneline`, 'Show master history');

    await this.log('Step 15: Inspect Git objects (advanced)');
    console.log(chalk.yellow('\n🔍 Let\'s peek inside Git\'s object storage:'));
    
    // Get the latest commit hash
    const { stdout } = await execAsync(`${this.gitCommand} log --oneline | head -1`, { cwd: this.demoDir });
    const commitHash = stdout.trim().split(' ')[0];
    
    await this.execute(`${this.gitCommand} cat-file -p ${commitHash}`, 'Inspect commit object');

    await this.log('Demo completed! 🎉', 'green');
    console.log(chalk.green(`
✨ Congratulations! You've successfully:
• Initialized a MyGit repository
• Staged and committed files
• Created and switched branches
• Viewed commit history
• Inspected Git objects

Your demo project is in: ${this.demoDir}

Try exploring more:
• Create more branches
• Make conflicting changes
• Inspect different object types
• Compare with real Git behavior
`));

    console.log(chalk.blue(`
🎓 Learning Exercise:
1. Compare this with real Git: run the same commands with 'git' instead of 'mygit'
2. Examine the .mygit vs .git directory structures
3. Try to break it and see what happens!
4. Implement additional features like 'mygit diff'
`));
  }
}

// Run the demo
if (require.main === module) {
  const demo = new GitDemo();
  demo.runDemo().catch(console.error);
}

module.exports = GitDemo;
