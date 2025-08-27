const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { ObjectStore } = require('./ObjectStore');
const { Index } = require('./Index');
const { Reference } = require('./Reference');

/**
 * MyGit - A simple Git implementation
 * 
 * This class represents the main Git functionality including:
 * - Repository initialization
 * - File staging and committing
 * - Branch management
 * - Status checking
 */
class MyGit {
  constructor(workingDirectory = '.') {
    this.workingDir = path.resolve(workingDirectory);
    this.gitDir = path.join(this.workingDir, '.mygit');
    this.objectStore = new ObjectStore(this.gitDir);
    this.index = new Index(this.gitDir);
    this.reference = new Reference(this.gitDir);
  }

  /**
   * Initialize a new repository
   * Creates the .mygit directory structure
   */
  async init() {
    // Create .mygit directory structure
    await fs.ensureDir(this.gitDir);
    await fs.ensureDir(path.join(this.gitDir, 'objects'));
    await fs.ensureDir(path.join(this.gitDir, 'refs', 'heads'));
    
    // Initialize HEAD to point to master branch
    await this.reference.setHead('master');
    
    // Create initial master branch
    await this.reference.createBranch('master', null);
    
    console.log('Repository structure created:');
    console.log('├── .mygit/');
    console.log('│   ├── objects/     (stores all Git objects)');
    console.log('│   ├── refs/heads/  (stores branch references)');
    console.log('│   ├── HEAD         (points to current branch)');
    console.log('│   └── index        (staging area)');
  }

  /**
   * Add files to the staging area
   * @param {string} filePath - Path to the file to add
   */
  async add(filePath) {
    const fullPath = path.resolve(this.workingDir, filePath);
    
    if (!await fs.pathExists(fullPath)) {
      throw new Error(`File ${filePath} does not exist`);
    }
    
    // Read file content
    const content = await fs.readFile(fullPath);
    
    // Create blob object and store it
    const blobHash = await this.objectStore.createBlob(content);
    
    // Add to index (staging area)
    await this.index.add(filePath, blobHash);
    
    console.log(`Added ${filePath} (blob: ${blobHash.substring(0, 7)})`);
  }

  /**
   * Commit staged changes
   * @param {string} message - Commit message
   * @returns {string} - Commit hash
   */
  async commit(message) {
    const stagedFiles = await this.index.getStagedFiles();
    
    if (stagedFiles.length === 0) {
      throw new Error('No changes staged for commit');
    }
    
    // Create tree object from staged files
    const treeHash = await this.objectStore.createTree(stagedFiles);
    
    // Get parent commit (current HEAD)
    const currentBranch = await this.reference.getCurrentBranch();
    const parentCommit = await this.reference.getBranchCommit(currentBranch);
    
    // Create commit object
    const commitHash = await this.objectStore.createCommit(
      treeHash,
      parentCommit,
      message,
      'MyGit User <user@mygit.com>'
    );
    
    // Update branch reference
    await this.reference.updateBranch(currentBranch, commitHash);
    
    // Clear staging area
    await this.index.clear();
    
    console.log(`Created commit ${commitHash.substring(0, 7)}`);
    console.log(`Tree: ${treeHash.substring(0, 7)}`);
    console.log(`Parent: ${parentCommit ? parentCommit.substring(0, 7) : 'none'}`);
    
    return commitHash;
  }

  /**
   * Get repository status
   * @returns {Object} - Status information
   */
  async status() {
    const currentBranch = await this.reference.getCurrentBranch();
    const stagedFiles = await this.index.getStagedFiles();
    
    // Get all files in working directory
    const allFiles = await this.getAllFiles(this.workingDir);
    
    // Filter out .mygit directory and get relative paths
    const workingFiles = allFiles
      .filter(file => !file.includes('.mygit'))
      .map(file => path.relative(this.workingDir, file));
    
    const staged = stagedFiles.map(file => file.path);
    const untracked = workingFiles.filter(file => !staged.includes(file));
    
    return {
      branch: currentBranch,
      staged,
      modified: [], // TODO: Implement modified files detection
      untracked
    };
  }

  /**
   * Get commit history
   * @param {number} count - Number of commits to retrieve
   * @returns {Array} - Array of commit objects
   */
  async log(count = 10) {
    const currentBranch = await this.reference.getCurrentBranch();
    const headCommit = await this.reference.getBranchCommit(currentBranch);
    
    if (!headCommit) {
      return [];
    }
    
    const commits = [];
    let currentCommit = headCommit;
    
    for (let i = 0; i < count && currentCommit; i++) {
      const commitData = await this.objectStore.getCommit(currentCommit);
      commits.push({
        hash: currentCommit,
        ...commitData
      });
      currentCommit = commitData.parent;
    }
    
    return commits;
  }

  /**
   * Create a new branch
   * @param {string} branchName - Name of the new branch
   */
  async createBranch(branchName) {
    const currentBranch = await this.reference.getCurrentBranch();
    const currentCommit = await this.reference.getBranchCommit(currentBranch);
    
    await this.reference.createBranch(branchName, currentCommit);
    
    console.log(`Created branch '${branchName}' pointing to ${currentCommit ? currentCommit.substring(0, 7) : 'none'}`);
  }

  /**
   * List all branches
   * @returns {Array} - Array of branch objects
   */
  async listBranches() {
    const branches = await this.reference.listBranches();
    const currentBranch = await this.reference.getCurrentBranch();
    
    return branches.map(branch => ({
      name: branch,
      current: branch === currentBranch
    }));
  }

  /**
   * Switch to a different branch
   * @param {string} branchName - Name of the branch to switch to
   */
  async checkout(branchName) {
    const branches = await this.reference.listBranches();
    
    if (!branches.includes(branchName)) {
      throw new Error(`Branch '${branchName}' does not exist`);
    }
    
    await this.reference.setHead(branchName);
    
    console.log(`Switched to branch '${branchName}'`);
  }

  /**
   * Recursively get all files in a directory
   * @param {string} dir - Directory path
   * @returns {Array} - Array of file paths
   */
  async getAllFiles(dir) {
    const files = [];
    const items = await fs.readdir(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        const subFiles = await this.getAllFiles(fullPath);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }
}

module.exports = MyGit;
