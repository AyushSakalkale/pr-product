const path = require('path');
const readline = require('readline');
require('dotenv').config();

const { getDependencyTree } = require('./collectors/tree');
const { scoreTree } = require('./scorer/treeScorer');
const { generateTreeReport } = require('./output/treeReport');
const { printTreeReport } = require('./output/printTreeReport');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Main scan orchestrator.
 */
async function runScan() {
    const targetPath = process.argv[2] || process.cwd();
    const absolutePath = path.resolve(targetPath);

    console.log(`\n🔍 Initializing DepGuard Scan for: ${absolutePath}`);

    // 1. Get Dependency Tree
    const tree = await getDependencyTree(absolutePath, 3);
    if (!tree) {
        console.error('Failed to read dependency tree. Make sure node_modules is installed.');
        process.exit(1);
    }

    // 2. Print count
    console.log(`📦 Found ${tree.length} unique packages in the tree (up to depth 3).`);

    // 3. User Prompt
    rl.question('\nDo you want to score ALL packages? (y/n): ', async (answer) => {
        let packagesToScore = tree;
        
        if (answer.toLowerCase() !== 'y') {
            console.log('Limiting scan to top 20 packages alphabetically to save time...');
            packagesToScore = tree
                .sort((a, b) => a.name.localeCompare(b.name))
                .slice(0, 20);
        }

        console.log(`\n🚀 Starting assessment for ${packagesToScore.length} packages...`);
        
        // 4. Score Tree (with live progress)
        const scoredPackages = await scoreTree(packagesToScore, 5);

        // 5. Generate Report
        const report = generateTreeReport(scoredPackages);

        // 6. Print Report
        printTreeReport(report);

        rl.close();
    });
}

runScan();
