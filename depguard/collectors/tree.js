const fs = require('fs');
const path = require('path');

/**
 * Walks the node_modules folder recursively up to a specified depth.
 * Deduplicates by package name, keeping the shallowest occurrence.
 * 
 * @param {string} projectPath - Path to the project root.
 * @param {number} maxDepth - Maximum depth to walk.
 * @returns {Promise<Array>} - Flat array of unique dependency objects.
 */
async function getDependencyTree(projectPath, maxDepth = 3) {
    const uniquePackages = new Map();
    const rootPackageJsonPath = path.join(projectPath, 'package.json');

    try {
        // 1. Identify direct dependencies (Depth 0 candidates)
        const rootContent = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'));
        const directDeps = new Set([
            ...Object.keys(rootContent.dependencies || {}),
            ...Object.keys(rootContent.devDependencies || {})
        ]);

        // Pre-build a map of who depends on what at the top level
        // mapping subDepName -> directDepName
        const transitiveParentMap = new Map();
        for (const directDep of directDeps) {
            try {
                const directDepPkgJson = path.join(projectPath, 'node_modules', directDep, 'package.json');
                if (fs.existsSync(directDepPkgJson)) {
                    const content = JSON.parse(fs.readFileSync(directDepPkgJson, 'utf8'));
                    const subDeps = Object.keys(content.dependencies || {});
                    for (const subDep of subDeps) {
                        if (!transitiveParentMap.has(subDep)) {
                            transitiveParentMap.set(subDep, directDep);
                        }
                    }
                }
            } catch (e) { /* skip */ }
        }

        /**
         * Recursive walker
         */
        async function walk(currentPath, currentDepth, parentName) {
            if (currentDepth > maxDepth) return;

            const nodeModulesPath = path.join(currentPath, 'node_modules');
            if (!fs.existsSync(nodeModulesPath)) return;

            const entries = fs.readdirSync(nodeModulesPath, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    let pkgNames = [entry.name];
                    let pkgPaths = [path.join(nodeModulesPath, entry.name)];

                    // Handle scoped packages
                    if (entry.name.startsWith('@')) {
                        const scopedEntries = fs.readdirSync(pkgPaths[0], { withFileTypes: true });
                        pkgNames = [];
                        pkgPaths = [];
                        for (const se of scopedEntries) {
                            if (se.isDirectory()) {
                                pkgNames.push(`${entry.name}/${se.name}`);
                                pkgPaths.push(path.join(nodeModulesPath, entry.name, se.name));
                            }
                        }
                    }

                    for (let i = 0; i < pkgNames.length; i++) {
                        const name = pkgNames[i];
                        const fullPath = pkgPaths[i];
                        const pkgJsonPath = path.join(fullPath, 'package.json');

                        if (fs.existsSync(pkgJsonPath)) {
                            try {
                                const content = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
                                const version = content.version;
                                
                                // Determine depth: 0 if in root package.json AND at root node_modules
                                let depth = currentDepth;
                                if (currentDepth === 0 && !directDeps.has(name)) {
                                    depth = 1; // Flattened transitive dependency
                                }

                                // Resolve parent name for flattened transitive deps
                                let resolvedParent = parentName;
                                if (depth === 1 && !resolvedParent) {
                                    resolvedParent = transitiveParentMap.get(name) || null;
                                }

                                const existing = uniquePackages.get(name);
                                if (!existing || depth < existing.depth) {
                                    uniquePackages.set(name, {
                                        name,
                                        version,
                                        depth,
                                        isDirect: depth === 0,
                                        parentName: depth === 0 ? null : resolvedParent
                                    });
                                }

                                // Recurse
                                await walk(fullPath, depth + 1, name);
                            } catch (e) {
                                // Skip invalid package.json
                            }
                        }
                    }
                }
            }
        }

        // Start walking from the root
        await walk(projectPath, 0, null);

        // Convert Map to Array and sort by depth
        return Array.from(uniquePackages.values());
    } catch (error) {
        console.error(`Error building dependency tree: ${error.message}`);
        return null;
    }
}

module.exports = { getDependencyTree };

// Test it if run directly
if (require.main === module) {
    getDependencyTree(process.cwd(), 3).then(tree => {
        if (tree) {
            console.log(`Total unique packages found: ${tree.length}`);
            console.log('First 20 items (sorted by depth ASC):');
            const sorted = tree.sort((a, b) => a.depth - b.depth || a.name.localeCompare(b.name));
            console.log(JSON.stringify(sorted.slice(0, 20), null, 2));
        }
    });
}
