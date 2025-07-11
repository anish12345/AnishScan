// Demo: How Package Version Vulnerability Checking Works
console.log('🔍 Package Version Vulnerability Checking Demo\n');

// 1. Version Parsing Function
const parseVersion = (version) => {
  const parts = version.split('.');
  return {
    major: parseInt(parts[0]) || 0,
    minor: parseInt(parts[1]) || 0,
    patch: parseInt(parts[2]) || 0
  };
};

// 2. Version Comparison Function
const compareVersions = (version1, version2) => {
  const v1 = parseVersion(version1);
  const v2 = parseVersion(version2);
  
  if (v1.major !== v2.major) {
    return v1.major - v2.major;
  }
  if (v1.minor !== v2.minor) {
    return v1.minor - v2.minor;
  }
  return v1.patch - v2.patch;
};

// 3. Vulnerability Check Function
const isVersionVulnerable = (version, vulnerableRange) => {
  try {
    if (vulnerableRange === '*') {
      return true; // All versions vulnerable
    }
    
    // Handle different comparison operators
    if (vulnerableRange.startsWith('<')) {
      const targetVersion = vulnerableRange.substring(1);
      return compareVersions(version, targetVersion) < 0;
    } else if (vulnerableRange.startsWith('<=')) {
      const targetVersion = vulnerableRange.substring(2);
      return compareVersions(version, targetVersion) <= 0;
    } else if (vulnerableRange.startsWith('>=')) {
      const targetVersion = vulnerableRange.substring(2);
      return compareVersions(version, targetVersion) >= 0;
    } else if (vulnerableRange.startsWith('>')) {
      const targetVersion = vulnerableRange.substring(1);
      return compareVersions(version, targetVersion) > 0;
    } else {
      // Exact match
      return version === vulnerableRange;
    }
  } catch (error) {
    return false;
  }
};

// 4. Demo Known Vulnerable Packages
const knownVulnerablePackages = {
  'lodash': [
    {
      versions: ['<4.17.21'],
      severity: 'High',
      description: 'Prototype pollution vulnerability',
      safeVersion: '4.17.21'
    }
  ],
  'handlebars': [
    {
      versions: ['<4.7.7'],
      severity: 'High',
      description: 'Remote code execution vulnerability',
      safeVersion: '4.7.7'
    }
  ],
  'node-serialize': [
    {
      versions: ['<=0.0.4'],
      severity: 'Critical',
      description: 'Remote code execution via untrusted data deserialization',
      safeVersion: 'N/A'
    }
  ]
};

// 5. Test Different Package Versions
console.log('📦 Testing Package Version Vulnerability Detection:\n');

const testCases = [
  { package: 'lodash', version: '4.17.20', expected: true },
  { package: 'lodash', version: '4.17.21', expected: false },
  { package: 'lodash', version: '4.18.0', expected: false },
  { package: 'handlebars', version: '4.7.6', expected: true },
  { package: 'handlebars', version: '4.7.7', expected: false },
  { package: 'node-serialize', version: '0.0.4', expected: true },
  { package: 'node-serialize', version: '0.0.5', expected: false },
  { package: 'unknown-package', version: '1.0.0', expected: false }
];

testCases.forEach(({ package, version, expected }) => {
  const vulnerableVersions = knownVulnerablePackages[package];
  let isVulnerable = false;
  
  if (vulnerableVersions) {
    isVulnerable = vulnerableVersions.some(vulnInfo => 
      vulnInfo.versions.some(range => isVersionVulnerable(version, range))
    );
  }
  
  const status = isVulnerable ? '❌ VULNERABLE' : '✅ SAFE';
  const match = isVulnerable === expected ? '✓' : '✗';
  
  console.log(`${match} ${package}@${version}: ${status}`);
  
  if (isVulnerable && vulnerableVersions) {
    const vulnInfo = vulnerableVersions.find(v => 
      v.versions.some(range => isVersionVulnerable(version, range))
    );
    console.log(`   📋 ${vulnInfo.description}`);
    console.log(`   🔧 Safe version: ${vulnInfo.safeVersion}`);
    console.log(`   ⚠️  Severity: ${vulnInfo.severity}\n`);
  } else {
    console.log('');
  }
});

// 6. Show Version Comparison Examples
console.log('🔢 Version Comparison Examples:\n');

const versionComparisons = [
  { v1: '4.17.20', v2: '4.17.21' },
  { v1: '4.17.21', v2: '4.17.21' },
  { v1: '4.18.0', v2: '4.17.21' },
  { v1: '1.0.0', v2: '2.0.0' },
  { v1: '1.5.0', v2: '1.4.9' }
];

versionComparisons.forEach(({ v1, v2 }) => {
  const result = compareVersions(v1, v2);
  let comparison;
  
  if (result < 0) {
    comparison = '<';
  } else if (result > 0) {
    comparison = '>';
  } else {
    comparison = '=';
  }
  
  console.log(`${v1} ${comparison} ${v2} (result: ${result})`);
});

// 7. Show Range Matching Examples
console.log('\n📋 Range Matching Examples:\n');

const rangeTests = [
  { version: '4.17.20', range: '<4.17.21' },
  { version: '4.17.21', range: '<4.17.21' },
  { version: '0.0.4', range: '<=0.0.4' },
  { version: '0.0.5', range: '<=0.0.4' },
  { version: '1.0.0', range: '*' }
];

rangeTests.forEach(({ version, range }) => {
  const vulnerable = isVersionVulnerable(version, range);
  const status = vulnerable ? '❌ MATCHES (vulnerable)' : '✅ SAFE';
  console.log(`${version} against range "${range}": ${status}`);
});

console.log('\n🎯 This is how the scanner determines if your packages are vulnerable!'); 