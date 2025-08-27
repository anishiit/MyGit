const fs = require('fs-extra');
const path = require('path');
const fetch = require('node-fetch');

/**
 * Simple Remote - Handles basic repository cloning
 * 
 * This simplified version focuses on basic cloning functionality
 * for educational purposes, downloading repository content as zip/tar
 * and extracting it manually.
 */
class SimpleRemote {
  constructor(gitDir = null) {
    this.gitDir = gitDir;
  }

  /**
   * Clone a repository from a remote URL
   * @param {string} url - Repository URL (GitHub, GitLab, etc.)
   * @param {string} directory - Local directory to clone into
   * @param {Object} options - Clone options
   * @returns {string} - Path to cloned repository
   */
  async clone(url, directory, options = {}) {
    const { 
      branch = 'main', 
      verbose = true 
    } = options;

    // Validate and parse URL
    const repoInfo = this.parseRepositoryUrl(url);
    if (!repoInfo) {
      throw new Error(`Invalid repository URL: ${url}`);
    }

    // Create target directory
    const targetPath = path.resolve(directory);
    await fs.ensureDir(targetPath);

    if (verbose) {
      console.log(`Cloning into '${directory}'...`);
      console.log(`Repository: ${repoInfo.owner}/${repoInfo.repo}`);
      console.log(`Branch: ${branch}`);
    }

    try {
      // Try different branch names (master, main)
      const branches = [branch, 'main', 'master'];
      let success = false;
      
      for (const branchName of branches) {
        try {
          if (repoInfo.platform === 'github') {
            await this.cloneFromGitHubZip(repoInfo, targetPath, branchName, verbose);
            success = true;
            break;
          }
        } catch (error) {
          if (verbose) {
            console.log(`Branch '${branchName}' not found, trying next...`);
          }
          continue;
        }
      }

      if (!success) {
        throw new Error(`Could not clone repository. Tried branches: ${branches.join(', ')}`);
      }

      // Initialize MyGit repository in the cloned directory
      const MyGit = require('./MyGit');
      const git = new MyGit(targetPath);
      await git.init();

      // Set up remote
      await this.addRemote(git.gitDir, 'origin', url);

      if (verbose) {
        console.log(`✓ Repository cloned successfully to ${targetPath}`);
        console.log(`✓ Remote 'origin' set to ${url}`);
      }

      return targetPath;

    } catch (error) {
      // Clean up on error
      try {
        await fs.remove(targetPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw new Error(`Clone failed: ${error.message}`);
    }
  }

  /**
   * Clone from GitHub using the download ZIP API
   * @param {Object} repoInfo - Repository information
   * @param {string} targetPath - Target directory
   * @param {string} branch - Branch to clone
   * @param {boolean} verbose - Verbose output
   */
  async cloneFromGitHubZip(repoInfo, targetPath, branch, verbose) {
    // Use the raw content API to get individual files
    const contentsUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents?ref=${branch}`;
    
    if (verbose) {
      console.log(`Fetching repository contents from GitHub API...`);
    }

    const response = await fetch(contentsUrl, {
      headers: {
        'User-Agent': 'MyGit-Clone/1.0.0',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Repository ${repoInfo.owner}/${repoInfo.repo} not found or branch '${branch}' doesn't exist`);
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contents = await response.json();
    
    if (verbose) {
      console.log(`Found ${contents.length} items in repository`);
    }

    // Download files recursively
    await this.downloadContents(contents, targetPath, repoInfo, branch, verbose);
  }

  /**
   * Download repository contents recursively
   * @param {Array} contents - GitHub API contents response
   * @param {string} targetPath - Target directory
   * @param {Object} repoInfo - Repository information
   * @param {string} branch - Branch name
   * @param {boolean} verbose - Verbose output
   */
  async downloadContents(contents, targetPath, repoInfo, branch, verbose) {
    let fileCount = 0;

    for (const item of contents) {
      const itemPath = path.join(targetPath, item.name);

      if (item.type === 'file') {
        // Download file content
        const fileResponse = await fetch(item.download_url);
        if (fileResponse.ok) {
          const content = await fileResponse.text();
          await fs.writeFile(itemPath, content);
          fileCount++;
          
          if (verbose && fileCount % 5 === 0) {
            process.stdout.write(`\rDownloading files... ${fileCount}`);
          }
        }
      } else if (item.type === 'dir') {
        // Create directory and download its contents
        await fs.ensureDir(itemPath);
        
        const dirResponse = await fetch(item.url, {
          headers: {
            'User-Agent': 'MyGit-Clone/1.0.0',
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        if (dirResponse.ok) {
          const dirContents = await dirResponse.json();
          await this.downloadContents(dirContents, targetPath, repoInfo, branch, verbose);
        }
      }
    }

    if (verbose && fileCount > 0) {
      console.log(`\n✓ Downloaded ${fileCount} files`);
    }
  }

  /**
   * Parse repository URL to extract platform, owner, and repo name
   * @param {string} url - Repository URL
   * @returns {Object|null} - Parsed repository information
   */
  parseRepositoryUrl(url) {
    // GitHub patterns
    const githubPatterns = [
      /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/,
      /^git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/,
      /^github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/
    ];

    // Try GitHub patterns
    for (const pattern of githubPatterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          platform: 'github',
          owner: match[1],
          repo: match[2],
          originalUrl: url
        };
      }
    }

    return null;
  }

  /**
   * Add a remote to the repository
   * @param {string} gitDir - Git directory path
   * @param {string} name - Remote name (e.g., 'origin')
   * @param {string} url - Remote URL
   */
  async addRemote(gitDir, name, url) {
    const remotesDir = path.join(gitDir, 'remotes');
    await fs.ensureDir(remotesDir);

    const remoteConfig = {
      name,
      url,
      fetch: `+refs/heads/*:refs/remotes/${name}/*`,
      addedAt: new Date().toISOString()
    };

    const remotePath = path.join(remotesDir, name);
    await fs.writeFile(remotePath, JSON.stringify(remoteConfig, null, 2));

    console.log(`✓ Added remote '${name}' -> ${url}`);
  }

  /**
   * List all remotes
   * @param {string} gitDir - Git directory path
   * @returns {Array} - Array of remote configurations
   */
  async listRemotes(gitDir) {
    const remotesDir = path.join(gitDir, 'remotes');
    
    if (!await fs.pathExists(remotesDir)) {
      return [];
    }

    const remoteFiles = await fs.readdir(remotesDir);
    const remotes = [];

    for (const file of remoteFiles) {
      try {
        const remotePath = path.join(remotesDir, file);
        const content = await fs.readFile(remotePath, 'utf8');
        const config = JSON.parse(content);
        remotes.push(config);
      } catch (error) {
        console.warn(`Warning: Could not parse remote config for '${file}'`);
      }
    }

    return remotes;
  }

  /**
   * Remove a remote
   * @param {string} gitDir - Git directory path
   * @param {string} name - Remote name to remove
   */
  async removeRemote(gitDir, name) {
    const remotePath = path.join(gitDir, 'remotes', name);
    
    if (!await fs.pathExists(remotePath)) {
      throw new Error(`Remote '${name}' does not exist`);
    }

    await fs.unlink(remotePath);
    console.log(`✓ Removed remote '${name}'`);
  }

  /**
   * Get remote information
   * @param {string} gitDir - Git directory path
   * @param {string} name - Remote name
   * @returns {Object|null} - Remote configuration
   */
  async getRemote(gitDir, name) {
    const remotePath = path.join(gitDir, 'remotes', name);
    
    if (!await fs.pathExists(remotePath)) {
      return null;
    }

    try {
      const content = await fs.readFile(remotePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Could not parse remote config for '${name}': ${error.message}`);
    }
  }
}

module.exports = { SimpleRemote };
