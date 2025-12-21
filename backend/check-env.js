#!/usr/bin/env node

// Simple script to check environment variables
// Usage: node check-env.js [filter]

const filter = process.argv[2] || '';

console.log('Environment Variables:');
console.log('====================\n');

const envVars = Object.keys(process.env)
  .filter(key => !filter || key.toLowerCase().includes(filter.toLowerCase()))
  .sort();

if (envVars.length === 0) {
  console.log('No matching environment variables found.');
} else {
  envVars.forEach(key => {
    const value = process.env[key];
    // Mask sensitive values (passwords, secrets, etc.)
    const masked = key.toLowerCase().includes('password') || 
                   key.toLowerCase().includes('secret') ||
                   key.toLowerCase().includes('key') ||
                   key.toLowerCase().includes('token')
      ? '***MASKED***'
      : value;
    console.log(`${key}=${masked}`);
  });
}

console.log(`\nTotal: ${envVars.length} variable(s)`);

