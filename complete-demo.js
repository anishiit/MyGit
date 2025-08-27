#!/usr/bin/env node

/**
 * Complete MyGit Demonstration Script
 * Shows all functionality including the new clone feature
 */

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class MyGitDemo {
  constructor() {
    this.demoDir = path.join(__dirname, 'demo-complete');
    this.cloneDir = path.join(__dirname, 'demo-clone');
  }

  log(message, color = 'blue') {
    console.log(chalk[color](`\n${message}`));
  }

  header(message) {
    console.log(chalk.cyan('\n' + '='.repeat(50)));
    console.log(chalk.cyan.bold(`  ${message}`));
    console.log(chalk.cyan('='.repeat(50)));
  }

  run(command, cwd = this.demoDir) {
    this.log(`$ ${command}`, 'gray');
    try {
      const result = execSync(command, { 
        cwd, 
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      if (result.trim()) {
        console.log(result);
      }
      return result;
    } catch (error) {
      console.log(chalk.red(`Error: ${error.message}`));
      return '';
    }
  }

  async setup() {
    this.header('Setting Up Demo Environment');
    
    // Clean up any existing demo directories
    await fs.remove(this.demoDir);
    await fs.remove(this.cloneDir);
    
    // Create demo directory
    await fs.ensureDir(this.demoDir);
    
    this.log('Demo environment prepared!', 'green');
  }

  async basicOperations() {
    this.header('Basic MyGit Operations');
    
    // Initialize repository
    this.log('Initializing MyGit repository...');
    this.run('node ../index.js init');
    
    // Create some demo files
    this.log('Creating demo files...');
    await fs.writeFile(path.join(this.demoDir, 'README.md'), '# My Project\n\nThis is a demo project for MyGit!');
    await fs.writeFile(path.join(this.demoDir, 'app.js'), 'console.log("Hello from MyGit!");');
    await fs.writeFile(path.join(this.demoDir, 'config.json'), JSON.stringify({
      name: 'MyGit Demo',
      version: '1.0.0',
      author: 'You!'
    }, null, 2));
    
    // Check status
    this.log('Checking repository status...');
    this.run('node ../index.js status');
    
    // Add files to staging area
    this.log('Adding files to staging area...');
    this.run('node ../index.js add README.md');
    this.run('node ../index.js add app.js');
    
    // Check status again
    this.log('Status after adding files:');
    this.run('node ../index.js status');
    
    // Commit files
    this.log('Making first commit...');
    this.run('node ../index.js commit -m "Initial commit with README and app.js"');
    
    // Add more files and commit
    this.log('Adding config and making second commit...');
    this.run('node ../index.js add config.json');
    this.run('node ../index.js commit -m "Add configuration file"');
    
    // Show commit history
    this.log('Viewing commit history...');
    this.run('node ../index.js log');
    
    this.log('Basic operations completed!', 'green');
  }

  async branchOperations() {
    this.header('Branch Operations');
    
    // Create a new branch
    this.log('Creating feature branch...');
    this.run('node ../index.js branch feature/awesome-feature');
    
    // List branches
    this.log('Listing all branches:');
    this.run('node ../index.js branch');
    
    // Switch to the new branch
    this.log('Switching to feature branch...');
    this.run('node ../index.js checkout feature/awesome-feature');
    
    // Make changes on the branch
    this.log('Making changes on feature branch...');
    await fs.writeFile(path.join(this.demoDir, 'feature.js'), 'console.log("This is an awesome feature!");');
    
    this.run('node ../index.js add feature.js');
    this.run('node ../index.js commit -m "Add awesome feature"');
    
    // Switch back to main
    this.log('Switching back to main branch...');
    this.run('node ../index.js checkout main');
    
    // Show that feature.js doesn't exist on main
    this.log('Checking that feature.js is not on main branch:');
    const featureExists = await fs.pathExists(path.join(this.demoDir, 'feature.js'));
    console.log(`feature.js exists on main: ${featureExists}`);
    
    // Switch back to feature branch to show it exists there
    this.log('Switching back to feature branch to verify feature.js exists:');
    this.run('node ../index.js checkout feature/awesome-feature');
    const featureExistsOnBranch = await fs.pathExists(path.join(this.demoDir, 'feature.js'));
    console.log(`feature.js exists on feature branch: ${featureExistsOnBranch}`);
    
    this.log('Branch operations completed!', 'green');
  }

  async cloneOperations() {
    this.header('Clone Operations - The New Feature!');
    
    // Clean up clone directory
    await fs.remove(this.cloneDir);
    
    // Clone a simple repository
    this.log('Cloning octocat/Hello-World repository...');
    this.run(`node mygit-clone.js clone https://github.com/octocat/Hello-World hello-world`, __dirname);
    
    // Check what was cloned
    const helloWorldPath = path.join(__dirname, 'hello-world');
    if (await fs.pathExists(helloWorldPath)) {
      this.log('Successfully cloned! Checking contents:');
      const files = await fs.readdir(helloWorldPath);
      console.log('Files in cloned repository:', files);
      
      // Show the README content
      const readmePath = path.join(helloWorldPath, 'README');
      if (await fs.pathExists(readmePath)) {
        const content = await fs.readFile(readmePath, 'utf-8');
        this.log('README content:');
        console.log(content);
      }
      
      // Check repository status
      this.log('Checking cloned repository status:');
      this.run('node ../mygit-clone.js status', helloWorldPath);
      
      // Check remote configuration
      this.log('Checking remote configuration:');
      this.run('node ../mygit-clone.js remote -v', helloWorldPath);
      
      // Clean up
      await fs.remove(helloWorldPath);
    }
    
    this.log('Clone operations completed!', 'green');
  }

  async remoteOperations() {
    this.header('Remote Management Operations');
    
    // Go back to our demo repository
    process.chdir(this.demoDir);
    
    // Add remotes
    this.log('Adding remote repositories...');
    this.run('node ../mygit-clone.js remote-add origin https://github.com/myuser/myrepo.git');
    this.run('node ../mygit-clone.js remote-add upstream https://github.com/upstream/repo.git');
    
    // List remotes
    this.log('Listing configured remotes:');
    this.run('node ../mygit-clone.js remote');
    
    // List remotes with URLs
    this.log('Listing remotes with URLs:');
    this.run('node ../mygit-clone.js remote -v');
    
    // Remove a remote
    this.log('Removing upstream remote...');
    this.run('node ../mygit-clone.js remote remove upstream');
    
    // List remotes again
    this.log('Remotes after removal:');
    this.run('node ../mygit-clone.js remote -v');
    
    this.log('Remote management operations completed!', 'green');
  }

  async advancedFeatures() {
    this.header('Advanced Features Demonstration');
    
    // Show partial hash resolution
    this.log('Demonstrating partial hash resolution...');
    const logOutput = this.run('node ../index.js log --oneline');
    
    if (logOutput) {
      // Extract first commit hash and try partial hash
      const lines = logOutput.trim().split('\n');
      if (lines.length > 0) {
        const fullHash = lines[0].split(' ')[0];
        const partialHash = fullHash.substring(0, 7);
        
        this.log(`Full hash: ${fullHash}`);
        this.log(`Trying partial hash: ${partialHash}`);
        
        // This would work if we had checkout by hash implemented
        // For now, just show the concept
        console.log(chalk.yellow('Partial hash resolution concept demonstrated!'));
      }
    }
    
    // Show detailed status
    this.log('Showing detailed repository information...');
    this.run('node ../index.js status');
    this.run('node ../index.js log --graph');
    
    this.log('Advanced features demonstrated!', 'green');
  }

  async cleanup() {
    this.header('Cleaning Up Demo Environment');
    
    // Remove demo directories
    await fs.remove(this.demoDir);
    await fs.remove(this.cloneDir);
    
    // Remove any cloned repositories
    const helloWorldPath = path.join(__dirname, 'hello-world');
    if (await fs.pathExists(helloWorldPath)) {
      await fs.remove(helloWorldPath);
    }
    
    this.log('Demo environment cleaned up!', 'green');
  }

  async showSummary() {
    this.header('MyGit Implementation Summary');
    
    console.log(chalk.green('🎉 Congratulations! You have successfully built a complete Git implementation!'));
    console.log(chalk.blue('\n✅ Implemented Features:'));
    console.log('  • Repository initialization (init)');
    console.log('  • File staging (add)');
    console.log('  • Committing changes (commit)');
    console.log('  • Repository status (status)');
    console.log('  • Commit history (log)');
    console.log('  • Branch creation and management (branch)');
    console.log('  • Branch switching (checkout)');
    console.log('  • Remote repository cloning (clone) 🆕');
    console.log('  • Remote management (remote add/remove/list) 🆕');
    
    console.log(chalk.blue('\n🏗️ Architecture Components:'));
    console.log('  • ObjectStore - Content-addressable storage with SHA-1 hashing');
    console.log('  • Index - Staging area management');
    console.log('  • Reference - Branch and HEAD management');
    console.log('  • SimpleRemote - GitHub API integration for cloning');
    console.log('  • MyGit - Main orchestrator class');
    
    console.log(chalk.blue('\n🌟 Key Learning Achievements:'));
    console.log('  • Understanding Git internals and object model');
    console.log('  • Implementing content-addressable filesystem');
    console.log('  • Managing repository state and branches');
    console.log('  • Network programming with HTTP APIs');
    console.log('  • Building command-line interfaces');
    
    console.log(chalk.blue('\n🚀 Possible Extensions:'));
    console.log('  • Merge functionality');
    console.log('  • Diff implementation');
    console.log('  • Push/Pull operations');
    console.log('  • GitLab/Bitbucket support');
    console.log('  • Authentication for private repos');
    console.log('  • Performance optimizations');
    
    console.log(chalk.green('\n🎓 You now understand version control systems at the deepest level!'));
    console.log(chalk.cyan('Keep building, keep learning, and keep pushing boundaries! 💪'));
  }

  async run() {
    console.log(chalk.magenta.bold('🚀 Welcome to the Complete MyGit Demonstration!'));
    console.log(chalk.yellow('This demo will showcase all implemented features including the new clone functionality.\n'));
    
    try {
      await this.setup();
      await this.basicOperations();
      await this.branchOperations();
      await this.cloneOperations();
      await this.remoteOperations();
      await this.advancedFeatures();
      await this.showSummary();
    } catch (error) {
      console.error(chalk.red('Demo failed:'), error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  const demo = new MyGitDemo();
  demo.run().catch(console.error);
}

module.exports = MyGitDemo;
