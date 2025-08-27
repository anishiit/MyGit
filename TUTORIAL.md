# Building Your Own Git: Step-by-Step Tutorial

Welcome to the comprehensive tutorial on building your own version control system! This guide will take you through every step of creating a Git-like system from scratch.

## Table of Contents

1. [Understanding Version Control](#understanding-version-control)
2. [Git's Core Concepts](#gits-core-concepts)
3. [Implementation Architecture](#implementation-architecture)
4. [Step-by-Step Implementation](#step-by-step-implementation)
5. [Advanced Features](#advanced-features)
6. [Testing Your Implementation](#testing-your-implementation)

## Understanding Version Control

Version control systems track changes to files over time. They allow you to:

- **Track Changes**: See what changed, when, and who changed it
- **Collaboration**: Multiple people can work on the same project
- **Branching**: Work on different features simultaneously
- **Backup**: Your code history is preserved
- **Rollback**: Undo changes when things go wrong

### Why Build Your Own?

Building your own VCS helps you understand:
- How distributed systems work
- Content-addressable storage
- Graph data structures
- File system operations
- Cryptographic hashing

## Git's Core Concepts

### 1. Objects and Hashing

Git stores everything as objects, identified by SHA-1 hashes:

```javascript
// Example: Creating a hash
const crypto = require('crypto');
const content = "Hello, World!";
const hash = crypto.createHash('sha1').update(content).digest('hex');
// Result: 8ab686eafeb1f44702738c8b0f24f2567c36da6d
```

### 2. The Four Object Types

#### Blob Objects
Store file content:
```
blob 13\0Hello, World!
```

#### Tree Objects
Store directory structure:
```
tree 100\0100644 hello.txt\0[20-byte hash]100644 world.txt\0[20-byte hash]
```

#### Commit Objects
Store snapshots with metadata:
```
tree [tree-hash]
parent [parent-hash]
author John Doe <john@example.com> 1234567890 +0000
committer John Doe <john@example.com> 1234567890 +0000

Initial commit
```

#### Tag Objects (Advanced)
Named references to commits:
```
object [commit-hash]
type commit
tag v1.0
tagger John Doe <john@example.com> 1234567890 +0000

Version 1.0 release
```

### 3. Repository Structure

```
.git/
├── objects/           # Object storage
│   ├── 8a/           # First 2 chars of hash
│   │   └── b686ea... # Remaining 38 chars
│   └── info/
├── refs/
│   ├── heads/        # Branch references
│   │   ├── master
│   │   └── feature
│   └── tags/         # Tag references
├── HEAD              # Current branch pointer
├── index             # Staging area
└── config            # Repository configuration
```

## Implementation Architecture

Our MyGit implementation consists of four main components:

### 1. ObjectStore (`src/ObjectStore.js`)
- **Purpose**: Manage Git objects (blobs, trees, commits)
- **Responsibilities**:
  - Create and store objects
  - Retrieve objects by hash
  - Handle object serialization/deserialization

### 2. Index (`src/Index.js`)
- **Purpose**: Manage the staging area
- **Responsibilities**:
  - Track files ready for commit
  - Store file metadata and hashes
  - Provide staging operations

### 3. Reference (`src/Reference.js`)
- **Purpose**: Manage branches and HEAD
- **Responsibilities**:
  - Create and delete branches
  - Update branch pointers
  - Handle HEAD movement

### 4. MyGit (`src/MyGit.js`)
- **Purpose**: Main orchestrator class
- **Responsibilities**:
  - Coordinate between components
  - Implement high-level operations
  - Handle repository initialization

## Step-by-Step Implementation

### Step 1: Project Setup

```bash
# Create project structure
mkdir my-git-implementation
cd my-git-implementation
npm init -y

# Install dependencies
npm install fs-extra crypto commander chalk

# Create source directory
mkdir src
```

### Step 2: Object Storage System

Start by implementing the `ObjectStore` class:

```javascript
class ObjectStore {
  constructor(gitDir) {
    this.objectsDir = path.join(gitDir, 'objects');
  }

  // Create SHA-1 hash
  hash(content) {
    return crypto.createHash('sha1').update(content).digest('hex');
  }

  // Store object with Git format
  async storeObject(type, content) {
    const header = `${type} ${content.length}\0`;
    const fullContent = Buffer.concat([Buffer.from(header), Buffer.from(content)]);
    const hash = this.hash(fullContent);
    
    // Store in subdirectory (Git's optimization)
    const dir = hash.substring(0, 2);
    const file = hash.substring(2);
    const objectPath = path.join(this.objectsDir, dir, file);
    
    await fs.ensureDir(path.dirname(objectPath));
    await fs.writeFile(objectPath, fullContent);
    
    return hash;
  }
}
```

### Step 3: Staging Area (Index)

Implement the staging area:

```javascript
class Index {
  constructor(gitDir) {
    this.indexPath = path.join(gitDir, 'index');
  }

  async add(filePath, blobHash) {
    const entries = await this.load();
    
    // Remove existing entry and add new one
    const filteredEntries = entries.filter(entry => entry.path !== filePath);
    filteredEntries.push({
      path: filePath,
      hash: blobHash,
      mode: '100644',
      timestamp: Date.now()
    });
    
    await this.save(filteredEntries);
  }
}
```

### Step 4: Reference Management

Handle branches and HEAD:

```javascript
class Reference {
  async setHead(branchName) {
    const headContent = `ref: refs/heads/${branchName}`;
    await fs.writeFile(this.headPath, headContent);
  }

  async createBranch(branchName, commitHash) {
    const branchPath = path.join(this.headsDir, branchName);
    await fs.writeFile(branchPath, commitHash || '');
  }
}
```

### Step 5: High-Level Operations

Implement the main Git operations:

```javascript
class MyGit {
  async init() {
    // Create directory structure
    await fs.ensureDir(this.gitDir);
    await fs.ensureDir(path.join(this.gitDir, 'objects'));
    await fs.ensureDir(path.join(this.gitDir, 'refs', 'heads'));
    
    // Initialize HEAD and master branch
    await this.reference.setHead('master');
    await this.reference.createBranch('master', null);
  }

  async add(filePath) {
    const content = await fs.readFile(path.resolve(this.workingDir, filePath));
    const blobHash = await this.objectStore.createBlob(content);
    await this.index.add(filePath, blobHash);
  }

  async commit(message) {
    const stagedFiles = await this.index.getStagedFiles();
    const treeHash = await this.objectStore.createTree(stagedFiles);
    const parentCommit = await this.reference.getBranchCommit(await this.reference.getCurrentBranch());
    const commitHash = await this.objectStore.createCommit(treeHash, parentCommit, message);
    
    await this.reference.updateBranch(await this.reference.getCurrentBranch(), commitHash);
    await this.index.clear();
    
    return commitHash;
  }
}
```

### Step 6: Command Line Interface

Create a user-friendly CLI:

```javascript
const program = new Command();

program
  .command('init [directory]')
  .description('Initialize a new repository')
  .action(async (directory = '.') => {
    const git = new MyGit(directory);
    await git.init();
    console.log('Initialized empty repository');
  });

program
  .command('add <files...>')
  .description('Add files to staging area')
  .action(async (files) => {
    const git = new MyGit('.');
    for (const file of files) {
      await git.add(file);
    }
  });
```

## Advanced Features

### 1. Diff Implementation

Show differences between versions:

```javascript
async diff(file1Hash, file2Hash) {
  const content1 = await this.objectStore.getBlob(file1Hash);
  const content2 = await this.objectStore.getBlob(file2Hash);
  
  const lines1 = content1.toString().split('\n');
  const lines2 = content2.toString().split('\n');
  
  // Implement diff algorithm (Myers, etc.)
  return this.computeDiff(lines1, lines2);
}
```

### 2. Merge Functionality

Combine branches:

```javascript
async merge(branchName) {
  const currentCommit = await this.getCurrentCommit();
  const targetCommit = await this.reference.getBranchCommit(branchName);
  const baseCommit = await this.findMergeBase(currentCommit, targetCommit);
  
  // Three-way merge
  const mergedTree = await this.threeWayMerge(baseCommit, currentCommit, targetCommit);
  const mergeCommit = await this.objectStore.createCommit(
    mergedTree, 
    currentCommit, 
    `Merge branch '${branchName}'`,
    null, // additional parent
    targetCommit
  );
  
  await this.reference.updateBranch(await this.reference.getCurrentBranch(), mergeCommit);
}
```

### 3. Remote Repositories

Add networking capabilities:

```javascript
async clone(url, directory) {
  // 1. Create new repository
  await this.init(directory);
  
  // 2. Fetch objects from remote
  const objects = await this.fetchObjects(url);
  
  // 3. Store objects locally
  for (const obj of objects) {
    await this.objectStore.storeObject(obj.type, obj.content);
  }
  
  // 4. Set up remote tracking
  await this.addRemote('origin', url);
}

async push(remote, branch) {
  const commits = await this.getNewCommits(remote, branch);
  await this.uploadObjects(remote, commits);
  await this.updateRemoteRef(remote, branch);
}
```

### 4. Pack Files (Optimization)

Optimize storage:

```javascript
async createPackFile(objects) {
  const pack = new PackFile();
  
  for (const obj of objects) {
    // Find similar objects for delta compression
    const base = await this.findSimilarObject(obj);
    
    if (base) {
      const delta = this.computeDelta(base.content, obj.content);
      pack.addDelta(obj.hash, base.hash, delta);
    } else {
      pack.addObject(obj.hash, obj.content);
    }
  }
  
  return pack.serialize();
}
```

## Testing Your Implementation

### 1. Basic Workflow Test

```bash
# Initialize repository
node mygit-cli.js init

# Create and add files
echo "Hello" > file1.txt
echo "World" > file2.txt
node mygit-cli.js add file1.txt file2.txt

# Commit changes
node mygit-cli.js commit -m "Initial commit"

# Check status and history
node mygit-cli.js status
node mygit-cli.js log
```

### 2. Branch Operations Test

```bash
# Create and switch branches
node mygit-cli.js branch feature
node mygit-cli.js checkout feature

# Make changes on feature branch
echo "Feature code" > feature.txt
node mygit-cli.js add feature.txt
node mygit-cli.js commit -m "Add feature"

# Switch back and compare
node mygit-cli.js checkout master
node mygit-cli.js branch -v
```

### 3. Object Inspection Test

```bash
# Examine objects (for learning)
node mygit-cli.js cat-file -p [commit-hash]
node mygit-cli.js cat-file -t [blob-hash]
```

### 4. Automated Testing

Create test scripts:

```javascript
// test/basic-operations.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const MyGit = require('../src/MyGit');
const fs = require('fs-extra');
const path = require('path');

test('Repository initialization', async () => {
  const testDir = './test-repo';
  await fs.ensureDir(testDir);
  
  const git = new MyGit(testDir);
  await git.init();
  
  assert(await fs.pathExists(path.join(testDir, '.mygit')));
  assert(await fs.pathExists(path.join(testDir, '.mygit', 'objects')));
  
  await fs.remove(testDir);
});

test('File staging and commit', async () => {
  const testDir = './test-repo';
  await fs.ensureDir(testDir);
  
  const git = new MyGit(testDir);
  await git.init();
  
  // Create test file
  const testFile = path.join(testDir, 'test.txt');
  await fs.writeFile(testFile, 'Test content');
  
  // Add and commit
  await git.add('test.txt');
  const commitHash = await git.commit('Test commit');
  
  assert(typeof commitHash === 'string');
  assert(commitHash.length === 40); // SHA-1 hash length
  
  await fs.remove(testDir);
});
```

## Performance Considerations

### 1. Object Storage Optimization

- **Pack Files**: Compress similar objects
- **Delta Compression**: Store differences instead of full content
- **Garbage Collection**: Remove unreferenced objects

### 2. Index Optimization

- **Binary Format**: Use binary instead of JSON for speed
- **Sparse Checkout**: Only track subset of files
- **File System Monitoring**: Watch for changes instead of scanning

### 3. Network Optimization

- **Smart Protocol**: Transfer only necessary objects
- **Compression**: Compress data during transfer
- **Resumable Operations**: Handle interrupted transfers

## Extending Your Implementation

### 1. Additional Commands

Implement more Git commands:
- `reset`: Undo changes
- `revert`: Create inverse commits
- `cherry-pick`: Apply specific commits
- `rebase`: Replay commits on different base
- `stash`: Temporarily save changes

### 2. Advanced Features

Add sophisticated functionality:
- **Hooks**: Scripts that run at specific events
- **Submodules**: Nested repositories
- **Worktrees**: Multiple working directories
- **LFS**: Large file support
- **Partial Clone**: Download subset of repository

### 3. User Interface Improvements

Enhance the user experience:
- **Progress Bars**: Show operation progress
- **Auto-completion**: Shell command completion
- **Configuration**: User and repository settings
- **Aliases**: Custom command shortcuts

## Learning Resources

### Books
- "Pro Git" by Scott Chacon and Ben Straub
- "Building Git" by James Coglan
- "Version Control with Git" by Jon Loeliger

### Online Resources
- [Git Internals Documentation](https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain)
- [Git Source Code](https://github.com/git/git)
- [Git Protocol Documentation](https://git-scm.com/docs/protocol-common)

### Practice Projects
1. Implement a simple merge algorithm
2. Create a web interface for your Git
3. Add support for binary files
4. Implement a basic Git server
5. Create a visual commit graph

## Conclusion

Building your own Git implementation is an excellent way to understand:
- Distributed systems architecture
- Content-addressable storage
- Graph algorithms and data structures
- File system operations
- Command-line interface design

The key concepts you've learned:
1. **Immutable Objects**: Everything is stored as immutable objects
2. **Content Addressing**: Objects are identified by their content hash
3. **Graph Structure**: Commits form a directed acyclic graph
4. **Staging Area**: Intermediate area for preparing commits
5. **References**: Pointers to commits (branches, tags)

Continue experimenting with your implementation, add new features, and most importantly, have fun learning how one of the most important tools in software development actually works!

Remember: The best way to understand a complex system is to build it yourself. 🚀
