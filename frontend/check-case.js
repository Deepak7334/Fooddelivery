import fs from 'fs';
import path from 'path';

function checkDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            checkDirectory(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
            let match;
            while ((match = importRegex.exec(content)) !== null) {
                const importPath = match[1];
                if (importPath.startsWith('.')) {
                    let resolvedDir = path.dirname(fullPath);
                    let targetPath = path.join(resolvedDir, importPath);
                    
                    let foundExact = false;
                    const extensions = ['', '.js', '.jsx', '/index.js', '/index.jsx'];
                    for (const ext of extensions) {
                        const testPath = targetPath + ext;
                        if (fs.existsSync(testPath)) {
                            const dirName = path.dirname(testPath);
                            const baseName = path.basename(testPath);
                            if (fs.existsSync(dirName)) {
                                const realFiles = fs.readdirSync(dirName);
                                if (!realFiles.includes(baseName)) {
                                    console.log(`CASE MISMATCH in ${fullPath}: imported '${importPath}', real file is ${baseName}`);
                                } else {
                                    foundExact = true;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
checkDirectory('./src');
console.log("Done checking case.");
