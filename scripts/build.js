/**
 * Build Script for Universal Contribution Manager
 * 
 * This script builds the application for production deployment by:
 * - Copying and processing HTML files
 * - Bundling and minifying CSS files
 * - Copying JavaScript modules
 * - Optimizing assets
 * - Generating deployment-ready files
 * 
 * @author Universal Contribution Manager Team
 * @version 3.0.0
 * @since 2024-06-14
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Build configuration
const buildConfig = {
    srcDir: path.join(projectRoot, 'src'),
    distDir: path.join(projectRoot, 'dist'),
    assetsDir: path.join(projectRoot, 'assets'),
    publicFiles: [
        'index.html',
        'sw.js',
        'README.md',
        'package.json'
    ],    cssFiles: [
        'src/styles/main.css',
        'src/styles/components.css',
        'src/styles/themes.css',
        'src/styles/components/home.css',
        'src/styles/components/auth.css',
        'src/styles/components/dashboard.css',
        'src/styles/components/not-found.css',
        'src/styles/components/sweet-alert.css',
    ],
    minify: process.env.NODE_ENV === 'production',
    sourceMaps: process.env.NODE_ENV !== 'production'
};

/**
 * Main build function
 */
async function build() {
    console.log('🚀 Starting Universal Contribution Manager build...');
    console.log(`📁 Building from: ${projectRoot}`);
    console.log(`📁 Building to: ${buildConfig.distDir}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    try {
        // Clean and create dist directory
        await cleanDist();
        await createDist();
        
        // Copy and process files
        await copyPublicFiles();
        await processCSSFiles();
        await copyJavaScriptFiles();
        await copyAssets();
        await createOfflinePage();
        await generateManifest();
        
        console.log('✅ Build completed successfully!');
        await printBuildStats();
        
    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

/**
 * Clean the dist directory
 */
async function cleanDist() {
    console.log('🧹 Cleaning dist directory...');
    
    try {
        await fs.rm(buildConfig.distDir, { recursive: true, force: true });
        console.log('✅ Dist directory cleaned');
    } catch (error) {
        // Directory might not exist, which is fine
        console.log('ℹ️  Dist directory was empty or didn\'t exist');
    }
}

/**
 * Create dist directory structure
 */
async function createDist() {
    console.log('📁 Creating dist directory structure...');
      const directories = [
        buildConfig.distDir,
        path.join(buildConfig.distDir, 'src'),
        path.join(buildConfig.distDir, 'src', 'styles'),
        path.join(buildConfig.distDir, 'src', 'styles', 'components'),
        path.join(buildConfig.distDir, 'src', 'components'),
        path.join(buildConfig.distDir, 'src', 'core'),
        path.join(buildConfig.distDir, 'src', 'services'),
        path.join(buildConfig.distDir, 'src', 'utils'),
        path.join(buildConfig.distDir, 'src', 'config'),
        path.join(buildConfig.distDir, 'assets'),
        path.join(buildConfig.distDir, 'assets', 'icons')
    ];
    
    for (const dir of directories) {
        await fs.mkdir(dir, { recursive: true });
    }
    
    console.log('✅ Directory structure created');
}

/**
 * Copy public files to dist
 */
async function copyPublicFiles() {
    console.log('📄 Copying public files...');
    
    for (const file of buildConfig.publicFiles) {
        try {
            const srcPath = path.join(projectRoot, file);
            const distPath = path.join(buildConfig.distDir, file);
            
            // Check if file exists
            await fs.access(srcPath);
            
            // Process HTML files
            if (file.endsWith('.html')) {
                await processHTMLFile(srcPath, distPath);
            } else {
                await fs.copyFile(srcPath, distPath);
            }
            
            console.log(`✅ Copied ${file}`);
        } catch (error) {
            console.log(`⚠️  Skipped ${file} (not found)`);
        }
    }
}

/**
 * Process HTML files (minify, optimize)
 */
async function processHTMLFile(srcPath, distPath) {
    let content = await fs.readFile(srcPath, 'utf-8');
    
    // Basic HTML optimization
    if (buildConfig.minify) {
        content = content
            .replace(/\s+/g, ' ') // Collapse whitespace
            .replace(/>\s+</g, '><') // Remove whitespace between tags
            .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
            .trim();
    }
    
    // Update asset paths for production
    content = content.replace(
        /src=\"src\//g,
        'src="src/'
    );
    
    await fs.writeFile(distPath, content, 'utf-8');
}

/**
 * Process and bundle CSS files
 */
async function processCSSFiles() {
    console.log('🎨 Processing CSS files...');
    
    const bundledCSS = [];
    
    for (const cssFile of buildConfig.cssFiles) {
        try {
            const cssPath = path.join(projectRoot, cssFile);
            const content = await fs.readFile(cssPath, 'utf-8');
            
            // Add file header comment
            bundledCSS.push(`/* === ${cssFile} === */`);
            bundledCSS.push(content);
            bundledCSS.push(''); // Empty line between files
            
            console.log(`✅ Processed ${cssFile}`);
        } catch (error) {
            console.log(`⚠️  CSS file not found: ${cssFile}`);
        }
    }
    
    let finalCSS = bundledCSS.join('\n');
    
    // Basic CSS minification
    if (buildConfig.minify) {
        finalCSS = minifyCSS(finalCSS);
    }
    
    // Write individual files and bundled file
    for (const cssFile of buildConfig.cssFiles) {
        try {
            const srcPath = path.join(projectRoot, cssFile);
            const distPath = path.join(buildConfig.distDir, cssFile);
            
            let content = await fs.readFile(srcPath, 'utf-8');
            
            if (buildConfig.minify) {
                content = minifyCSS(content);
            }
            
            await fs.writeFile(distPath, content, 'utf-8');
        } catch (error) {
            // File might not exist
        }
    }
    
    // Write bundled CSS
    const bundledPath = path.join(buildConfig.distDir, 'src', 'styles', 'bundle.css');
    await fs.writeFile(bundledPath, finalCSS, 'utf-8');
    
    console.log('✅ CSS processing completed');
}

/**
 * Basic CSS minification
 */
function minifyCSS(css) {
    return css
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
        .replace(/\s+/g, ' ') // Collapse whitespace
        .replace(/;\s*}/g, '}') // Remove last semicolon in blocks
        .replace(/\s*{\s*/g, '{') // Clean up braces
        .replace(/}\s*/g, '}') // Clean up closing braces
        .replace(/:\s+/g, ':') // Clean up colons
        .replace(/;\s+/g, ';') // Clean up semicolons
        .trim();
}

/**
 * Copy JavaScript files
 */
async function copyJavaScriptFiles() {
    console.log('📜 Copying JavaScript files...');
    
    const jsExtensions = ['.js', '.mjs'];
    
    await copyDirectoryRecursive(
        buildConfig.srcDir,
        path.join(buildConfig.distDir, 'src'),
        (filePath) => {
            const ext = path.extname(filePath);
            return jsExtensions.includes(ext);
        }
    );
    
    console.log('✅ JavaScript files copied');
}

/**
 * Copy assets directory
 */
async function copyAssets() {
    console.log('🖼️  Copying assets...');
    
    try {
        await copyDirectoryRecursive(
            buildConfig.assetsDir,
            path.join(buildConfig.distDir, 'assets')
        );
        console.log('✅ Assets copied');
    } catch (error) {
        console.log('⚠️  No assets directory found, creating basic assets...');
        await createBasicAssets();
    }
}

/**
 * Create basic assets if none exist
 */
async function createBasicAssets() {
    const iconsDir = path.join(buildConfig.distDir, 'assets', 'icons');
    await fs.mkdir(iconsDir, { recursive: true });
    
    // Create a simple SVG favicon
    const favicon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" fill="#2563eb"/>
    <text x="16" y="22" font-family="Arial, sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="white">U</text>
</svg>`;
    
    await fs.writeFile(path.join(buildConfig.distDir, 'assets', 'favicon.svg'), favicon);
    
    // Create simple PWA icons
    const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
    for (const size of iconSizes) {
        const iconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="#2563eb" rx="${size * 0.1}"/>
    <text x="${size / 2}" y="${size * 0.7}" font-family="Arial, sans-serif" font-size="${size * 0.6}" font-weight="bold" text-anchor="middle" fill="white">U</text>
</svg>`;
        
        await fs.writeFile(
            path.join(iconsDir, `icon-${size}x${size}.svg`),
            iconSvg
        );
    }
    
    console.log('✅ Basic assets created');
}

/**
 * Create offline page
 */
async function createOfflinePage() {
    console.log('📱 Creating offline page...');
    
    const offlineHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Offline - Universal Contribution Manager</title>
    <link rel="stylesheet" href="src/styles/main.css">
    <style>
        .offline-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 2rem;
        }
        .offline-content {
            max-width: 500px;
        }
        .offline-icon {
            width: 64px;
            height: 64px;
            margin: 0 auto 2rem;
            color: var(--color-gray-400);
        }
        .offline-title {
            font-size: 2rem;
            font-weight: bold;
            color: var(--color-gray-800);
            margin-bottom: 1rem;
        }
        .offline-description {
            color: var(--color-gray-600);
            margin-bottom: 2rem;
            line-height: 1.6;
        }
        .retry-button {
            background-color: var(--color-primary);
            color: white;
            border: none;
            padding: 0.75rem 2rem;
            border-radius: 0.5rem;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .retry-button:hover {
            background-color: var(--color-primary-dark);
        }
    </style>
</head>
<body>
    <div class="offline-container">
        <div class="offline-content">
            <svg class="offline-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.07 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
            </svg>
            
            <h1 class="offline-title">You're Offline</h1>
            
            <p class="offline-description">
                It looks like you've lost your internet connection. 
                Please check your connection and try again.
            </p>
            
            <button class="retry-button" onclick="window.location.reload()">
                Try Again
            </button>
        </div>
    </div>
</body>
</html>`;
    
    await fs.writeFile(
        path.join(buildConfig.distDir, 'offline.html'),
        offlineHTML,
        'utf-8'
    );
    
    console.log('✅ Offline page created');
}

/**
 * Generate PWA manifest
 */
async function generateManifest() {
    console.log('📱 Generating PWA manifest...');
    
    const manifest = {
        name: 'Universal Contribution Manager',
        short_name: 'UCM',
        description: 'A modern, secure, and scalable contribution management system for organizations',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#2563eb',
        orientation: 'portrait-primary',
        categories: ['finance', 'productivity', 'business'],
        icons: [
            {
                src: 'assets/icons/icon-72x72.svg',
                sizes: '72x72',
                type: 'image/svg+xml'
            },
            {
                src: 'assets/icons/icon-96x96.svg',
                sizes: '96x96',
                type: 'image/svg+xml'
            },
            {
                src: 'assets/icons/icon-128x128.svg',
                sizes: '128x128',
                type: 'image/svg+xml'
            },
            {
                src: 'assets/icons/icon-144x144.svg',
                sizes: '144x144',
                type: 'image/svg+xml'
            },
            {
                src: 'assets/icons/icon-152x152.svg',
                sizes: '152x152',
                type: 'image/svg+xml'
            },
            {
                src: 'assets/icons/icon-192x192.svg',
                sizes: '192x192',
                type: 'image/svg+xml'
            },
            {
                src: 'assets/icons/icon-384x384.svg',
                sizes: '384x384',
                type: 'image/svg+xml'
            },
            {
                src: 'assets/icons/icon-512x512.svg',
                sizes: '512x512',
                type: 'image/svg+xml'
            }
        ]
    };
    
    await fs.writeFile(
        path.join(buildConfig.distDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2),
        'utf-8'
    );
    
    console.log('✅ PWA manifest generated');
}

/**
 * Copy directory recursively with optional filter
 */
async function copyDirectoryRecursive(src, dest, filter = null) {
    await fs.mkdir(dest, { recursive: true });
    
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            await copyDirectoryRecursive(srcPath, destPath, filter);
        } else if (!filter || filter(srcPath)) {
            await fs.copyFile(srcPath, destPath);
        }
    }
}

/**
 * Print build statistics
 */
async function printBuildStats() {
    console.log('\n📊 Build Statistics:');
    
    const stats = await getDirectoryStats(buildConfig.distDir);
    
    console.log(`📁 Total files: ${stats.fileCount}`);
    console.log(`📏 Total size: ${formatBytes(stats.totalSize)}`);
    console.log(`📁 Build output: ${buildConfig.distDir}`);
    
    if (buildConfig.minify) {
        console.log('🗜️  Files were minified for production');
    }
    
    console.log('\n🚀 Ready for deployment!');
    console.log('💡 Run "npm run serve" to test the build locally');
}

/**
 * Get directory statistics
 */
async function getDirectoryStats(dir) {
    let fileCount = 0;
    let totalSize = 0;
    
    async function traverse(currentDir) {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            
            if (entry.isDirectory()) {
                await traverse(fullPath);
            } else {
                fileCount++;
                const stats = await fs.stat(fullPath);
                totalSize += stats.size;
            }
        }
    }
    
    await traverse(dir);
    
    return { fileCount, totalSize };
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n⚠️  Build interrupted');
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
    process.exit(1);
});

// Run build if this script is executed directly
const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] === scriptPath) {
    build().catch(error => {
        console.error('Build failed:', error);
        process.exit(1);
    });
}

export { build, buildConfig };
