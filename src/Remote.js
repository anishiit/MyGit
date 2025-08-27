const fs = require('fs-extra');
const path = require('path');
const fetch = require('node-fetch');
const tar = require('tar-stream');
const { pipeline } = require('stream');
const { promisify } = require('util');

/**
 * Remote - Handles remote repository operations
 * 
 * This class manages interactions with remote Git repositories,
 * including cloning, fetching, and basic HTTP Git protocol operations.
 */
class Remote {
  constructor(gitDir = null) {
    this.gitDir = gitDir;
    if (gitDir) {
      this.remotesPath = path.join(gitDir, 'remotes');
    }
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
      branch = 'master', 
      depth = null, 
      bare = false,
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
      // For GitHub repositories, we'll use the archive API
      if (repoInfo.platform === 'github') {
        await this.cloneFromGitHub(repoInfo, targetPath, branch, verbose);
      } else if (repoInfo.platform === 'gitlab') {
        await this.cloneFromGitLab(repoInfo, targetPath, branch, verbose);
      } else {
        throw new Error(`Unsupported platform: ${repoInfo.platform}`);
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
   * Clone from GitHub using the archive API
   * @param {Object} repoInfo - Repository information
   * @param {string} targetPath - Target directory
   * @param {string} branch - Branch to clone
   * @param {boolean} verbose - Verbose output
   */
  async cloneFromGitHub(repoInfo, targetPath, branch, verbose) {
    const archiveUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/tarball/${branch}`;
    
    if (verbose) {
      console.log(`Fetching archive from: ${archiveUrl}`);
    }

    const response = await fetch(archiveUrl, {
      headers: {
        'User-Agent': 'MyGit-Clone/1.0.0'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Repository ${repoInfo.owner}/${repoInfo.repo} not found or branch '${branch}' doesn't exist`);
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Extract tar stream
    await this.extractTarStream(response.body, targetPath, verbose);
  }

  /**
   * Clone from GitLab using the archive API
   * @param {Object} repoInfo - Repository information
   * @param {string} targetPath - Target directory
   * @param {string} branch - Branch to clone
   * @param {boolean} verbose - Verbose output
   */
  async cloneFromGitLab(repoInfo, targetPath, branch, verbose) {
    const projectPath = encodeURIComponent(`${repoInfo.owner}/${repoInfo.repo}`);
    const archiveUrl = `https://gitlab.com/api/v4/projects/${projectPath}/repository/archive.tar.gz?sha=${branch}`;
    
    if (verbose) {
      console.log(`Fetching archive from: ${archiveUrl}`);
    }

    const response = await fetch(archiveUrl);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Repository ${repoInfo.owner}/${repoInfo.repo} not found or branch '${branch}' doesn't exist`);
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    await this.extractTarStream(response.body, targetPath, verbose);
  }

  /**
   * Extract tar stream to target directory
   * @param {Stream} tarStream - Tar stream
   * @param {string} targetPath - Target directory
   * @param {boolean} verbose - Verbose output
   */
  async extractTarStream(tarStream, targetPath, verbose) {
    return new Promise((resolve, reject) => {
      const extract = tar.extract();
      let rootDir = null;
      let fileCount = 0;

      extract.on('entry', async (header, stream, next) => {
        try {
          // Skip directories and get root directory name
          if (header.type === 'directory') {
            if (!rootDir) {
              rootDir = header.name.split('/')[0];
            }
            stream.resume();
            next();
            return;
          }

          // Remove root directory from path
          let filePath = header.name;
          if (rootDir && filePath.startsWith(rootDir + '/')) {
            filePath = filePath.substring(rootDir.length + 1);
          }

          if (!filePath) {
            stream.resume();
            next();
            return;
          }

          const fullPath = path.join(targetPath, filePath);
          await fs.ensureDir(path.dirname(fullPath));

          // Write file
          const writeStream = fs.createWriteStream(fullPath);
          stream.pipe(writeStream);

          stream.on('end', () => {
            fileCount++;
            if (verbose && fileCount % 10 === 0) {
              process.stdout.write(`\rExtracting files... ${fileCount}`);
            }
            next();
          });

          stream.on('error', reject);
          writeStream.on('error', reject);

        } catch (error) {
          reject(error);
        }
      });

      extract.on('finish', () => {
        if (verbose) {
          console.log(`\n✓ Extracted ${fileCount} files`);
        }
        resolve();
      });

      extract.on('error', reject);

      tarStream.pipe(extract);
    });
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

    // GitLab patterns
    const gitlabPatterns = [
      /^https?:\/\/gitlab\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/,
      /^git@gitlab\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/,
      /^gitlab\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/
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

    // Try GitLab patterns
    for (const pattern of gitlabPatterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          platform: 'gitlab',
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

  /**
   * Validate if a URL is accessible
   * @param {string} url - URL to validate
   * @returns {boolean} - True if accessible
   */
  async validateUrl(url) {
    const repoInfo = this.parseRepositoryUrl(url);
    if (!repoInfo) {
      return false;
    }

    try {
      let checkUrl;
      if (repoInfo.platform === 'github') {
        checkUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`;
      } else if (repoInfo.platform === 'gitlab') {
        const projectPath = encodeURIComponent(`${repoInfo.owner}/${repoInfo.repo}`);
        checkUrl = `https://gitlab.com/api/v4/projects/${projectPath}`;
      } else {
        return false;
      }

      const response = await fetch(checkUrl, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

module.exports = { Remote };
