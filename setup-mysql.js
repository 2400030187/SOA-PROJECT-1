const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

console.log('🚀 Setting up MySQL Database "driveease_db"...');

const schemaPath = path.join(__dirname, 'schema-mysql.sql');
const sqlScript = fs.readFileSync(schemaPath, 'utf8');

console.log('\n=============================================================');
console.log('📌 INSTRUCTIONS TO IMPORT MYSQL SCHEMA IN YOUR ENVIRONMENT:');
console.log('=============================================================\n');

console.log('▶ METHOD 1: MySQL Command Line (Terminal / PowerShell)');
console.log('-------------------------------------------------------------');
console.log('1. Open terminal and login to MySQL:');
console.log('   mysql -u root -p\n');
console.log('2. Run this command inside MySQL prompt:');
console.log('   SOURCE c:/Users/ramch/OneDrive/Desktop/soa project 1/schema-mysql.sql;\n');

console.log('▶ METHOD 2: MySQL Workbench (Graphical UI)');
console.log('-------------------------------------------------------------');
console.log('1. Open MySQL Workbench.');
console.log('2. Click File -> Open SQL Script (Ctrl + O).');
console.log('3. Choose file: "c:\\Users\\ramch\\OneDrive\\Desktop\\soa project 1\\schema-mysql.sql"');
console.log('4. Click the Lightning Bolt (⚡) button to execute script.\n');

console.log('▶ METHOD 3: One-Line Command (if mysql CLI is in PATH)');
console.log('-------------------------------------------------------------');
console.log('   mysql -u root -proot < "c:\\Users\\ramch\\OneDrive\\Desktop\\soa project 1\\schema-mysql.sql"\n');

console.log('✓ SQL Script file ready at: ' + schemaPath);
