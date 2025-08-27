// Main application file
const AuthManager = require('./auth');

console.log('Hello, MyGit!');

function main() {
    console.log('Running MyGit demo with authentication...');
    
    const auth = new AuthManager();
    
    try {
        // Demo user registration and login
        auth.register('demo-user', 'password123');
        console.log('User registered successfully');
        
        const session = auth.login('demo-user', 'password123');
        console.log('User logged in:', session.username);
        
    } catch (error) {
        console.error('Auth error:', error.message);
    }
}

main();
