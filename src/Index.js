const fs = require('fs-extra');
const path = require('path');

/**
 * Index - Manages the staging area (index)
 * 
 * The index is Git's staging area where changes are prepared before committing.
 * It's a binary file that contains a list of files with their metadata and hashes.
 * For simplicity, we'll use JSON format instead of Git's binary format.
 */
class Index {
  constructor(gitDir) {
    this.indexPath = path.join(gitDir, 'index');
  }

  /**
   * Load the index from disk
   * @returns {Array} - Array of staged files
   */
  async load() {
    try {
      if (await fs.pathExists(this.indexPath)) {
        const content = await fs.readFile(this.indexPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.log('Warning: Could not load index, starting with empty index');
    }
    return [];
  }

  /**
   * Save the index to disk
   * @param {Array} entries - Array of index entries
   */
  async save(entries) {
    await fs.writeFile(this.indexPath, JSON.stringify(entries, null, 2));
  }

  /**
   * Add a file to the staging area
   * @param {string} filePath - Path to the file
   * @param {string} blobHash - Hash of the blob object
   */
  async add(filePath, blobHash) {
    const entries = await this.load();
    
    // Remove existing entry for this file if it exists
    const filteredEntries = entries.filter(entry => entry.path !== filePath);
    
    // Add new entry
    const newEntry = {
      path: filePath,
      hash: blobHash,
      mode: '100644', // Regular file mode
      size: 0, // We could store file size here
      timestamp: Date.now()
    };
    
    filteredEntries.push(newEntry);
    
    // Sort by path (Git requirement)
    filteredEntries.sort((a, b) => a.path.localeCompare(b.path));
    
    await this.save(filteredEntries);
    
    console.log(`Index updated:`);
    console.log(`  Added: ${filePath} -> ${blobHash.substring(0, 7)}`);
    console.log(`  Total staged files: ${filteredEntries.length}`);
  }

  /**
   * Remove a file from the staging area
   * @param {string} filePath - Path to the file to remove
   */
  async remove(filePath) {
    const entries = await this.load();
    const filteredEntries = entries.filter(entry => entry.path !== filePath);
    
    if (filteredEntries.length === entries.length) {
      throw new Error(`File ${filePath} is not in the staging area`);
    }
    
    await this.save(filteredEntries);
    
    console.log(`Removed ${filePath} from staging area`);
  }

  /**
   * Get all staged files
   * @returns {Array} - Array of staged file entries
   */
  async getStagedFiles() {
    return await this.load();
  }

  /**
   * Check if a file is staged
   * @param {string} filePath - Path to check
   * @returns {boolean} - True if file is staged
   */
  async isStaged(filePath) {
    const entries = await this.load();
    return entries.some(entry => entry.path === filePath);
  }

  /**
   * Get the hash of a staged file
   * @param {string} filePath - Path to the file
   * @returns {string|null} - Hash of the staged file or null if not staged
   */
  async getStagedHash(filePath) {
    const entries = await this.load();
    const entry = entries.find(entry => entry.path === filePath);
    return entry ? entry.hash : null;
  }

  /**
   * Clear all staged files
   */
  async clear() {
    await this.save([]);
    console.log('Staging area cleared');
  }

  /**
   * Get staging area status
   * @returns {Object} - Status information
   */
  async getStatus() {
    const entries = await this.load();
    
    return {
      totalFiles: entries.length,
      files: entries.map(entry => ({
        path: entry.path,
        hash: entry.hash.substring(0, 7),
        mode: entry.mode,
        staged: new Date(entry.timestamp).toISOString()
      }))
    };
  }

  /**
   * Show detailed index information
   */
  async show() {
    const status = await this.getStatus();
    
    console.log('Index (Staging Area) Status:');
    console.log(`Total staged files: ${status.totalFiles}`);
    
    if (status.totalFiles > 0) {
      console.log('\nStaged files:');
      status.files.forEach(file => {
        console.log(`  ${file.mode} ${file.hash} ${file.path}`);
        console.log(`    Staged: ${file.staged}`);
      });
    } else {
      console.log('No files staged for commit');
    }
  }
}

module.exports = { Index };
