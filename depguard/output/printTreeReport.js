const COLORS = {
    RED: '\x1b[31m',
    YELLOW: '\x1b[33m',
    GREEN: '\x1b[32m',
    RESET: '\x1b[0m',
    BOLD: '\x1b[1m'
};

/**
 * Prints a formatted terminal report from the aggregated tree data.
 */
function printTreeReport(report) {
    const { totalPackages, riskSurface, criticalPackages, highRiskPackages, transitiveRisks, worstPackage } = report;

    // 1. Header
    const surfaceColor = riskSurface === 'Clean' ? COLORS.GREEN : (riskSurface === 'Moderate' ? COLORS.YELLOW : COLORS.RED);
    console.log(`\n${COLORS.BOLD}DEP_GUARD PROJECT SCAN RESULTS${COLORS.RESET}`);
    console.log(`------------------------------------------------`);
    console.log(`Total Packages Scanned: ${totalPackages}`);
    console.log(`Overall Risk Surface:   ${surfaceColor}${COLORS.BOLD}${riskSurface}${COLORS.RESET}`);
    console.log(`------------------------------------------------\n`);

    // 2. CRITICAL PACKAGES
    if (criticalPackages.length > 0) {
        console.log(`${COLORS.RED}${COLORS.BOLD}CRITICAL PACKAGES (< 25)${COLORS.RESET}`);
        criticalPackages.forEach(pkg => {
            const type = pkg.isDirect ? 'Direct' : 'Transitive';
            console.log(`- ${pkg.name} (${pkg.finalScore}/100) [${type}]`);
        });
        console.log('');
    }

    // 3. HIGH RISK PACKAGES
    if (highRiskPackages.length > 0) {
        console.log(`${COLORS.YELLOW}${COLORS.BOLD}HIGH RISK PACKAGES (25-50)${COLORS.RESET}`);
        highRiskPackages.forEach(pkg => {
            const type = pkg.isDirect ? 'Direct' : 'Transitive';
            console.log(`- ${pkg.name} (${pkg.finalScore}/100) [${type}]`);
        });
        console.log('');
    }

    // 4. TRANSITIVE RISKS SUMMARY
    if (transitiveRisks.length > 0) {
        console.log(`${COLORS.BOLD}TRANSITIVE RISKS SUMMARY (Hidden Dangers)${COLORS.RESET}`);
        transitiveRisks.forEach(pkg => {
            console.log(`- ${pkg.name} (${pkg.finalScore}/100)`);
        });
        console.log('');
    }

    // 5. Worst Package Explanation
    if (worstPackage) {
        console.log(`${COLORS.BOLD}WORST PACKAGE IN TREE:${COLORS.RESET}`);
        
        const subScores = {
            'Maintenance': worstPackage.maintenanceScore,
            'Adoption': worstPackage.adoptionScore,
            'Security': worstPackage.securityScore,
            'Stability': worstPackage.stabilityScore,
            'License': worstPackage.licenseScore
        };

        // Find the lowest non-null subscore
        let lowestCategory = 'Health';
        let lowestVal = 101;
        
        Object.entries(subScores).forEach(([cat, val]) => {
            if (val !== undefined && val !== null && val < lowestVal) {
                lowestVal = val;
                lowestCategory = cat;
            }
        });

        const explanation = getExplanation(lowestCategory, worstPackage.name);
        console.log(`${COLORS.RED}${worstPackage.name}${COLORS.RESET} (${worstPackage.finalScore}/100) - ${explanation}`);
    }
    console.log('\n');
}

function getExplanation(category, name) {
    const map = {
        'Maintenance': `This package has been abandoned or lacks active maintenance.`,
        'Adoption': `This package has extremely low usage or declining popularity.`,
        'Security': `This package has known, unpatched vulnerabilities.`,
        'Stability': `This package is unstable or has high breaking change risks.`,
        'License': `This package uses a restricted or incompatible license.`,
        'Health': `This package has overall poor health metrics across multiple dimensions.`
    };
    return map[category] || map['Health'];
}

module.exports = { printTreeReport };

// Test it if run directly
if (require.main === module) {
    const fakeReport = {
        totalPackages: 150,
        riskSurface: 'Critical',
        criticalPackages: [
            { name: 'event-stream', finalScore: 8, isDirect: false },
            { name: 'left-pad', finalScore: 12, isDirect: false }
        ],
        highRiskPackages: [
            { name: 'colors', finalScore: 45, isDirect: true },
            { name: 'vulnerable-pkg-1', finalScore: 35, isDirect: true },
            { name: 'vulnerable-pkg-2', finalScore: 48, isDirect: false }
        ],
        transitiveRisks: [
            { name: 'event-stream', finalScore: 8 },
            { name: 'left-pad', finalScore: 12 },
            { name: 'vulnerable-pkg-2', finalScore: 48 }
        ],
        worstPackage: {
            name: 'event-stream',
            finalScore: 8,
            maintenanceScore: 0,
            adoptionScore: 80,
            securityScore: 80,
            stabilityScore: 94,
            licenseScore: 100
        }
    };

    printTreeReport(fakeReport);
}
