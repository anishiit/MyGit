// User authentication module
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
