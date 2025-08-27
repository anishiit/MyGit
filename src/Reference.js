const fs = require('fs-extra');
const path = require('path');

/**
 * Reference - Manages Git references (branches, HEAD)
 * 
 * Git references are pointers to commits. The main types are:
 * - HEAD: Points to the current branch
 * - Branches: Named pointers to specific commits
 * - Tags: Named pointers to specific commits (not implemented)
 */
class Reference {
  constructor(gitDir) {
    this.gitDir = gitDir;
    this.headPath = path.join(gitDir, 'HEAD');
    this.refsDir = path.join(gitDir, 'refs');
    this.headsDir = path.join(gitDir, 'refs', 'heads');
  }

  /**
   * Set HEAD to point to a branch
   * @param {string} branchName - Name of the branch
   */
  async setHead(branchName) {
    const headContent = `ref: refs/heads/${branchName}`;
    await fs.writeFile(this.headPath, headContent);
    
    console.log(`HEAD now points to branch '${branchName}'`);
  }

  /**
   * Get the current branch name
   * @returns {string} - Current branch name
   */
  async getCurrentBranch() {
    if (!await fs.pathExists(this.headPath)) {
      return 'master'; // Default branch
    }
    
    const headContent = await fs.readFile(this.headPath, 'utf8');
    
    if (headContent.startsWith('ref: refs/heads/')) {
      return headContent.substring(16).trim();
    }
    
    // HEAD is detached (pointing directly to a commit)
    return 'HEAD';
  }

  /**
   * Create a new branch
   * @param {string} branchName - Name of the new branch
   * @param {string|null} commitHash - Commit hash to point to (null for no commits yet)
   */
  async createBranch(branchName, commitHash) {
    const branchPath = path.join(this.headsDir, branchName);
    
    if (await fs.pathExists(branchPath)) {
      throw new Error(`Branch '${branchName}' already exists`);
    }
    
    // Ensure directory exists for nested branch names (e.g., feature/auth)
    await fs.ensureDir(path.dirname(branchPath));
    
    // If commitHash is null, we're creating the first branch
    if (commitHash) {
      await fs.writeFile(branchPath, commitHash);
      console.log(`Created branch '${branchName}' pointing to ${commitHash.substring(0, 7)}`);
    } else {
      // Create empty branch file (will be updated on first commit)
      await fs.writeFile(branchPath, '');
      console.log(`Created initial branch '${branchName}'`);
    }
  }

  /**
   * Update a branch to point to a new commit
   * @param {string} branchName - Name of the branch
   * @param {string} commitHash - New commit hash
   */
  async updateBranch(branchName, commitHash) {
    const branchPath = path.join(this.headsDir, branchName);
    
    if (!await fs.pathExists(branchPath)) {
      throw new Error(`Branch '${branchName}' does not exist`);
    }
    
    await fs.writeFile(branchPath, commitHash);
    
    console.log(`Updated branch '${branchName}' to ${commitHash.substring(0, 7)}`);
  }

  /**
   * Get the commit hash that a branch points to
   * @param {string} branchName - Name of the branch
   * @returns {string|null} - Commit hash or null if branch has no commits
   */
  async getBranchCommit(branchName) {
    const branchPath = path.join(this.headsDir, branchName);
    
    if (!await fs.pathExists(branchPath)) {
      throw new Error(`Branch '${branchName}' does not exist`);
    }
    
    const content = await fs.readFile(branchPath, 'utf8');
    const trimmed = content.trim();
    
    return trimmed === '' ? null : trimmed;
  }

  /**
   * List all branches
   * @returns {Array} - Array of branch names
   */
  async listBranches() {
    if (!await fs.pathExists(this.headsDir)) {
      return [];
    }
    
    const files = await fs.readdir(this.headsDir);
    return files.filter(file => {
      // Only include regular files, not directories
      const filePath = path.join(this.headsDir, file);
      return fs.statSync(filePath).isFile();
    });
  }

  /**
   * Delete a branch
   * @param {string} branchName - Name of the branch to delete
   */
  async deleteBranch(branchName) {
    const currentBranch = await this.getCurrentBranch();
    
    if (branchName === currentBranch) {
      throw new Error(`Cannot delete the current branch '${branchName}'`);
    }
    
    const branchPath = path.join(this.headsDir, branchName);
    
    if (!await fs.pathExists(branchPath)) {
      throw new Error(`Branch '${branchName}' does not exist`);
    }
    
    await fs.unlink(branchPath);
    
    console.log(`Deleted branch '${branchName}'`);
  }

  /**
   * Check if a branch exists
   * @param {string} branchName - Name of the branch
   * @returns {boolean} - True if branch exists
   */
  async branchExists(branchName) {
    const branchPath = path.join(this.headsDir, branchName);
    return await fs.pathExists(branchPath);
  }

  /**
   * Get detailed information about all references
   * @returns {Object} - Reference information
   */
  async getInfo() {
    const currentBranch = await this.getCurrentBranch();
    const branches = await this.listBranches();
    
    const branchInfo = [];
    
    for (const branch of branches) {
      const commit = await this.getBranchCommit(branch);
      branchInfo.push({
        name: branch,
        commit: commit ? commit.substring(0, 7) : 'none',
        current: branch === currentBranch
      });
    }
    
    return {
      currentBranch,
      branches: branchInfo
    };
  }

  /**
   * Show detailed reference information
   */
  async show() {
    const info = await this.getInfo();
    
    console.log('Reference Information:');
    console.log(`Current branch: ${info.currentBranch}`);
    console.log('\nBranches:');
    
    info.branches.forEach(branch => {
      const marker = branch.current ? '* ' : '  ';
      console.log(`${marker}${branch.name} -> ${branch.commit}`);
    });
  }
}

module.exports = { Reference };
