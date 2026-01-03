/**
 * Script to help update all navigation calls in App.tsx
 * 
 * This script provides find-and-replace patterns to migrate from
 * old navigation pattern to new stack-based navigation
 * 
 * Run this with: node apps/mobile/scripts/update-navigation.js
 * Then manually review and apply the changes
 */

const fs = require('fs');
const path = require('path');

const appTsxPath = path.join(__dirname, '../App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// Pattern 1: Replace onBack handlers
// OLD: onBack={() => setCurrentScreen('screenName')}
// NEW: onBack={goBack}

const onBackPattern = /onBack=\{\(\)\s*=>\s*setCurrentScreen\(['"]([^'"]+)['"]\)\}/g;
const onBackMatches = [];
let match;
while ((match = onBackPattern.exec(content)) !== null) {
  onBackMatches.push({
    old: match[0],
    screen: match[1],
    line: content.substring(0, match.index).split('\n').length,
  });
}

// Pattern 2: Replace navigation calls
// OLD: setCurrentScreen('screenName')
// NEW: navigate('screenName', { params })

const navPattern = /setCurrentScreen\(['"]([^'"]+)['"]\)/g;
const navMatches = [];
while ((match = navPattern.exec(content)) !== null) {
  navMatches.push({
    old: match[0],
    screen: match[1],
    line: content.substring(0, match.index).split('\n').length,
  });
}

console.log('=== Navigation Migration Report ===\n');
console.log(`Found ${onBackMatches.length} onBack handlers to update`);
console.log(`Found ${navMatches.length} navigation calls to update\n`);

console.log('=== onBack Handlers ===');
onBackMatches.forEach((m, i) => {
  console.log(`${i + 1}. Line ${m.line}: ${m.old}`);
  console.log(`   → Replace with: onBack={goBack}`);
});

console.log('\n=== Navigation Calls ===');
navMatches.slice(0, 20).forEach((m, i) => {
  console.log(`${i + 1}. Line ${m.line}: ${m.old}`);
  console.log(`   → Replace with: navigate('${m.screen}', { /* params */ })`);
});

if (navMatches.length > 20) {
  console.log(`\n... and ${navMatches.length - 20} more`);
}

console.log('\n=== Next Steps ===');
console.log('1. Review the patterns above');
console.log('2. Manually update App.tsx using the patterns');
console.log('3. Wrap all screens with <SwipeableScreen>');
console.log('4. Test navigation flow');

