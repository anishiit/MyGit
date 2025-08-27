const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

/**
 * ObjectStore - Handles Git object storage and retrieval
 * 
 * Git stores four types of objects:
 * 1. Blob - File content
 * 2. Tree - Directory structure
 * 3. Commit - Snapshot with metadata
 * 4. Tag - Named reference to a commit (not implemented)
 */
class ObjectStore {
  constructor(gitDir) {
    this.objectsDir = path.join(gitDir, 'objects');
  }

  /**
   * Create a SHA-1 hash of content
   * @param {Buffer|string} content - Content to hash
   * @returns {string} - SHA-1 hash
   */
  hash(content) {
    return crypto.createHash('sha1').update(content).digest('hex');
  }

  /**
   * Store an object in the object store
   * @param {string} type - Object type (blob, tree, commit)
   * @param {Buffer|string} content - Object content
   * @returns {string} - Object hash
   */
  async storeObject(type, content) {
    // Git object format: "type size\0content"
    const header = `${type} ${content.length}\0`;
    const fullContent = Buffer.concat([Buffer.from(header), Buffer.from(content)]);
    
    const hash = this.hash(fullContent);
    
    // Store in subdirectory (first 2 chars of hash)
    const dir = hash.substring(0, 2);
    const file = hash.substring(2);
    const objectPath = path.join(this.objectsDir, dir, file);
    
    await fs.ensureDir(path.dirname(objectPath));
    await fs.writeFile(objectPath, fullContent);
    
    return hash;
  }

  /**
   * Retrieve an object from the object store
   * @param {string} hash - Object hash
   * @returns {Object} - Object with type and content
   */
  async getObject(hash) {
    const dir = hash.substring(0, 2);
    const file = hash.substring(2);
    const objectPath = path.join(this.objectsDir, dir, file);
    
    if (!await fs.pathExists(objectPath)) {
      throw new Error(`Object ${hash} not found`);
    }
    
    const content = await fs.readFile(objectPath);
    const nullIndex = content.indexOf(0);
    const header = content.slice(0, nullIndex).toString();
    const objectContent = content.slice(nullIndex + 1);
    
    const [type, size] = header.split(' ');
    
    return {
      type,
      size: parseInt(size),
      content: objectContent
    };
  }

  /**
   * Create a blob object (stores file content)
   * @param {Buffer|string} content - File content
   * @returns {string} - Blob hash
   */
  async createBlob(content) {
    const hash = await this.storeObject('blob', content);
    
    console.log(`Created blob object:`);
    console.log(`  Hash: ${hash}`);
    console.log(`  Size: ${content.length} bytes`);
    
    return hash;
  }

  /**
   * Create a tree object (stores directory structure)
   * @param {Array} entries - Array of {path, hash, mode} objects
   * @returns {string} - Tree hash
   */
  async createTree(entries) {
    // Sort entries by path (Git requirement)
    entries.sort((a, b) => a.path.localeCompare(b.path));
    
    let treeContent = '';
    
    for (const entry of entries) {
      // Tree entry format: "mode path\0hash"
      const mode = '100644'; // Regular file mode
      treeContent += `${mode} ${entry.path}\0`;
      // Convert hex hash to binary
      treeContent += Buffer.from(entry.hash, 'hex').toString('binary');
    }
    
    const hash = await this.storeObject('tree', Buffer.from(treeContent, 'binary'));
    
    console.log(`Created tree object:`);
    console.log(`  Hash: ${hash}`);
    console.log(`  Entries: ${entries.length}`);
    entries.forEach(entry => {
      console.log(`    ${entry.path} -> ${entry.hash.substring(0, 7)}`);
    });
    
    return hash;
  }

  /**
   * Create a commit object
   * @param {string} treeHash - Hash of the tree object
   * @param {string|null} parentHash - Hash of parent commit (null for initial commit)
   * @param {string} message - Commit message
   * @param {string} author - Author information
   * @returns {string} - Commit hash
   */
  async createCommit(treeHash, parentHash, message, author) {
    const timestamp = Math.floor(Date.now() / 1000);
    const timezone = '+0000'; // UTC
    
    let commitContent = `tree ${treeHash}\n`;
    
    if (parentHash) {
      commitContent += `parent ${parentHash}\n`;
    }
    
    commitContent += `author ${author} ${timestamp} ${timezone}\n`;
    commitContent += `committer ${author} ${timestamp} ${timezone}\n`;
    commitContent += `\n${message}\n`;
    
    const hash = await this.storeObject('commit', commitContent);
    
    console.log(`Created commit object:`);
    console.log(`  Hash: ${hash}`);
    console.log(`  Tree: ${treeHash}`);
    console.log(`  Parent: ${parentHash || 'none'}`);
    console.log(`  Message: ${message}`);
    
    return hash;
  }

  /**
   * Get blob content
   * @param {string} hash - Blob hash
   * @returns {Buffer} - Blob content
   */
  async getBlob(hash) {
    const obj = await this.getObject(hash);
    if (obj.type !== 'blob') {
      throw new Error(`Object ${hash} is not a blob`);
    }
    return obj.content;
  }

  /**
   * Get tree entries
   * @param {string} hash - Tree hash
   * @returns {Array} - Array of tree entries
   */
  async getTree(hash) {
    const obj = await this.getObject(hash);
    if (obj.type !== 'tree') {
      throw new Error(`Object ${hash} is not a tree`);
    }
    
    const entries = [];
    let offset = 0;
    const content = obj.content;
    
    while (offset < content.length) {
      // Find null terminator
      const nullIndex = content.indexOf(0, offset);
      const header = content.slice(offset, nullIndex).toString();
      const [mode, path] = header.split(' ');
      
      // Next 20 bytes are the hash
      const hashBytes = content.slice(nullIndex + 1, nullIndex + 21);
      const hash = hashBytes.toString('hex');
      
      entries.push({ mode, path, hash });
      offset = nullIndex + 21;
    }
    
    return entries;
  }

  /**
   * Get commit data
   * @param {string} hash - Commit hash
   * @returns {Object} - Commit data
   */
  async getCommit(hash) {
    const obj = await this.getObject(hash);
    if (obj.type !== 'commit') {
      throw new Error(`Object ${hash} is not a commit`);
    }
    
    const content = obj.content.toString();
    const lines = content.split('\n');
    
    const commit = {
      tree: null,
      parent: null,
      author: null,
      committer: null,
      message: null,
      date: null
    };
    
    let messageStart = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('tree ')) {
        commit.tree = line.substring(5);
      } else if (line.startsWith('parent ')) {
        commit.parent = line.substring(7);
      } else if (line.startsWith('author ')) {
        const authorMatch = line.match(/^author (.+) (\d+) (.+)$/);
        if (authorMatch) {
          commit.author = authorMatch[1];
          commit.date = new Date(parseInt(authorMatch[2]) * 1000).toISOString();
        }
      } else if (line.startsWith('committer ')) {
        const committerMatch = line.match(/^committer (.+) (\d+) (.+)$/);
        if (committerMatch) {
          commit.committer = committerMatch[1];
        }
      } else if (line === '') {
        messageStart = i + 1;
        break;
      }
    }
    
    // Get commit message (everything after the empty line)
    commit.message = lines.slice(messageStart).join('\n').trim();
    
    return commit;
  }
}

module.exports = { ObjectStore };
