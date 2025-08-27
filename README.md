# MyGit - A Simple Git Implementation

MyGit is a simplified version control system that implements core Git functionality. This project is designed to help you understand how Git works internally by building your own version control system from scratch.

## 🎯 Purpose

This project demonstrates the fundamental concepts of Git:
- Object storage (blobs, trees, commits)
- Content-addressable filesystem using SHA-1 hashes
- Staging area (index)
- Branch management
- Repository structure

## 🏗️ Architecture

### Core Components

1. **ObjectStore** (`src/ObjectStore.js`)
   - Stores Git objects (blobs, trees, commits)
   - Uses SHA-1 hashing for content addressing
   - Implements Git's object format

2. **Index** (`src/Index.js`)
   - Manages the staging area
   - Tracks files ready for commit
   - Simplified JSON format (vs Git's binary format)

3. **Reference** (`src/Reference.js`)
   - Manages branches and HEAD pointer
   - Stores branch references as files
   - Handles branch creation and switching

4. **MyGit** (`src/MyGit.js`)
   - Main class that orchestrates all operations
   - Implements high-level Git commands
   - Manages repository state

### Repository Structure

```
.mygit/
├── objects/           # Object storage (blobs, trees, commits)
│   ├── ab/           # First 2 chars of SHA-1 hash
│   │   └── cdef123...# Rest of hash (object file)
│   └── ...
├── refs/
│   └── heads/        # Branch references
│       ├── master    # Points to latest commit on master
│       └── feature   # Points to latest commit on feature
├── HEAD              # Points to current branch
└── index             # Staging area (JSON format)
```

## 🚀 Installation & Usage

### Prerequisites
- Node.js (v14 or higher)
- npm

### Setup

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Make the CLI globally available (optional):
   ```bash
   npm link
   ```

### Basic Usage

```bash
# Initialize a new repository
node index.js init [directory]

# Add files to staging area
node index.js add file1.txt file2.txt

# Commit changes
node index.js commit -m "Your commit message"

# Check repository status
node index.js status

# View commit history
node index.js log

# Create a new branch
node index.js branch feature-branch

# List all branches
node index.js branch

# Switch to a branch
node index.js checkout feature-branch
```

If you installed globally with `npm link`:
```bash
mygit init
mygit add file.txt
mygit commit -m "Initial commit"
```

## 📚 How It Works

### 1. Object Storage

Git stores everything as objects identified by SHA-1 hashes:

```javascript
// Creating a blob object
const content = "Hello, World!";
const hash = await objectStore.createBlob(content);
// hash: "8ab686eafeb1f44702738c8b0f24f2567c36da6d"
```

**Object Types:**
- **Blob**: Stores file content
- **Tree**: Stores directory structure (like filesystem)
- **Commit**: Stores snapshot metadata

### 2. Content Addressing

Every object is stored by its SHA-1 hash:
```
Object: "blob 13\0Hello, World!"
SHA-1:  "8ab686eafeb1f44702738c8b0f24f2567c36da6d"
Path:   ".mygit/objects/8a/b686eafeb1f44702738c8b0f24f2567c36da6d"
```

### 3. Staging Area (Index)

The index tracks which files are ready for commit:
```json
[
  {
    "path": "file.txt",
    "hash": "8ab686eafeb1f44702738c8b0f24f2567c36da6d",
    "mode": "100644",
    "timestamp": 1703123456789
  }
]
```

### 4. Commits

Commits link everything together:
```
tree abc123...         # Points to root tree
parent def456...       # Points to previous commit
author John Doe <john@example.com> 1703123456 +0000
committer John Doe <john@example.com> 1703123456 +0000

Initial commit
```

### 5. Branches

Branches are just files containing commit hashes:
```
.mygit/refs/heads/master → "abc123def456..."
.mygit/HEAD → "ref: refs/heads/master"
```

## 🔧 Building Your Own Git

### Step 1: Understanding the Basics

1. **Content Addressing**: Every piece of data gets a unique identifier (hash)
2. **Immutable Objects**: Objects never change, new versions create new objects
3. **Graph Structure**: Commits form a directed acyclic graph (DAG)

### Step 2: Core Data Structures

```javascript
// Blob Object
{
  type: 'blob',
  content: Buffer.from('file content')
}

// Tree Object  
{
  type: 'tree',
  entries: [
    { mode: '100644', path: 'file.txt', hash: 'abc123...' }
  ]
}

// Commit Object
{
  type: 'commit',
  tree: 'def456...',
  parent: 'ghi789...',
  author: 'John Doe <john@example.com>',
  message: 'Commit message'
}
```

### Step 3: Implementation Order

1. **Object Storage System**
   - Implement hashing (SHA-1)
   - Create object storage/retrieval
   - Handle blob, tree, commit objects

2. **Staging Area**
   - Track file changes
   - Prepare commits
   - Manage file states

3. **Reference Management**
   - Implement branches
   - Handle HEAD pointer
   - Manage branch switching

4. **High-Level Commands**
   - init, add, commit
   - status, log
   - branch, checkout

### Step 4: Key Algorithms

**Creating a Commit:**
1. Hash all staged files → create blob objects
2. Build tree structure → create tree objects
3. Create commit object with tree hash + metadata
4. Update branch reference to new commit hash

**Branch Switching:**
1. Read target branch's commit hash
2. Reconstruct working directory from commit's tree
3. Update HEAD to point to new branch

## 🔍 Differences from Real Git

This implementation simplifies several aspects:

1. **Object Compression**: Real Git uses zlib compression
2. **Pack Files**: Git optimizes storage with pack files
3. **Index Format**: Git uses a binary format, we use JSON
4. **Networking**: No clone/push/pull functionality
5. **Merge**: No merge conflict resolution
6. **Performance**: No optimization for large repositories

## 🎓 Learning Exercises

1. **Add Merge Functionality**
   - Implement three-way merge
   - Handle merge conflicts
   - Create merge commits

2. **Implement Diff**
   - Compare file contents
   - Show changes between commits
   - Line-by-line diff output

3. **Add Remote Support**
   - Implement clone functionality
   - Add push/pull operations
   - Handle remote references

4. **Optimize Storage**
   - Implement pack files
   - Add object compression
   - Delta compression for similar objects

5. **Enhanced CLI**
   - Add more Git commands (reset, revert, cherry-pick)
   - Improve error handling
   - Add configuration support

## 📖 Further Reading

- [Pro Git Book](https://git-scm.com/book) - Comprehensive Git documentation
- [Git Internals](https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain) - How Git works internally
- [Building Git](http://shop.oreilly.com/product/0636920034650.do) - Detailed guide to implementing Git

## 🤝 Contributing

This is an educational project! Feel free to:
- Add new features
- Improve documentation
- Fix bugs
- Add tests
- Optimize performance

## 📄 License

MIT License - Feel free to use this code for learning and teaching!

---

## 🎯 Quick Start Tutorial

Let's create your first repository:

```bash
# 1. Create a test directory
mkdir my-project
cd my-project

# 2. Initialize repository
node /path/to/mygit/index.js init

# 3. Create a file
echo "Hello, MyGit!" > README.txt

# 4. Add and commit
node /path/to/mygit/index.js add README.txt
node /path/to/mygit/index.js commit -m "Initial commit"

# 5. Check status
node /path/to/mygit/index.js status

# 6. View history
node /path/to/mygit/index.js log

# 7. Create and switch branch
node /path/to/mygit/index.js branch feature
node /path/to/mygit/index.js checkout feature

# 8. Make changes and commit
echo "Feature content" > feature.txt
node /path/to/mygit/index.js add feature.txt
node /path/to/mygit/index.js commit -m "Add feature"
```

Congratulations! You've just used your own Git implementation! 🎉
