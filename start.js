// Production startup script for Render
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Starting MediRush deployment...');

// Check if database migrations need to be run
const runMigrations = () => {
  try {
    console.log('Running database migrations...');
    execSync('npm run db:push', { stdio: 'inherit' });
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
};

// Check if this is the first deployment
const isFirstDeploy = !fs.existsSync(path.join(process.cwd(), '.migration-completed'));

if (isFirstDeploy) {
  runMigrations();
  fs.writeFileSync(path.join(process.cwd(), '.migration-completed'), 'true');
}

// Start the main application
import('./dist/index.js');