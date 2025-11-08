const fs = require('fs');
const path = require('path');

// Build script to copy frontend files to build directory
// This helps hide source code from browser sources tab

const frontendDir = path.join(__dirname, 'frontend');
const buildDir = path.join(__dirname, 'build');

// Function to copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const files = fs.readdirSync(src);
  
  files.forEach(file => {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    
    if (fs.statSync(srcFile).isDirectory()) {
      copyDir(srcFile, destFile);
    } else {
      // Only copy specific file types
      const ext = path.extname(file).toLowerCase();
      if (['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg'].includes(ext)) {
        fs.copyFileSync(srcFile, destFile);
        console.log(`Copied: ${srcFile} -> ${destFile}`);
      }
    }
  });
}

// Function to minify CSS (basic minification)
function minifyCSS(cssContent) {
  return cssContent
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/;\s*}/g, '}') // Remove semicolon before closing brace
    .replace(/\s*{\s*/g, '{') // Remove spaces around opening brace
    .replace(/;\s*/g, ';') // Remove spaces after semicolons
    .trim();
}

// Function to minify HTML (basic minification)
function minifyHTML(htmlContent) {
  return htmlContent
    .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/>\s+</g, '><') // Remove whitespace between tags
    .trim();
}

// Function to minify JavaScript (basic minification)
function minifyJS(jsContent) {
  return jsContent
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .replace(/\/\/.*$/gm, '') // Remove single-line comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
}

// Main build process
console.log('Starting build process...');

try {
  // Copy and process CSS files
  const cssDir = path.join(frontendDir, 'css');
  const buildCssDir = path.join(buildDir, 'css');
  
  if (fs.existsSync(cssDir)) {
    const cssFiles = fs.readdirSync(cssDir);
    cssFiles.forEach(file => {
      if (file.endsWith('.css')) {
        const cssContent = fs.readFileSync(path.join(cssDir, file), 'utf8');
        const minified = minifyCSS(cssContent);
        fs.writeFileSync(path.join(buildCssDir, file), minified);
        console.log(`Minified CSS: ${file}`);
      }
    });
  }
  
  // Copy and process HTML files
  const pagesDir = path.join(frontendDir, 'pages');
  const buildPagesDir = path.join(buildDir, 'pages');
  
  if (fs.existsSync(pagesDir)) {
    const htmlFiles = fs.readdirSync(pagesDir);
    htmlFiles.forEach(file => {
      if (file.endsWith('.html')) {
        const htmlContent = fs.readFileSync(path.join(pagesDir, file), 'utf8');
        const minified = minifyHTML(htmlContent);
        fs.writeFileSync(path.join(buildPagesDir, file), minified);
        console.log(`Minified HTML: ${file}`);
      }
    });
  }
  
  // Copy and process JavaScript files
  const jsDir = path.join(frontendDir, 'js');
  const buildJsDir = path.join(buildDir, 'js');
  
  if (fs.existsSync(jsDir)) {
    const jsFiles = fs.readdirSync(jsDir);
    jsFiles.forEach(file => {
      if (file.endsWith('.js')) {
        const jsContent = fs.readFileSync(path.join(jsDir, file), 'utf8');
        const minified = minifyJS(jsContent);
        fs.writeFileSync(path.join(buildJsDir, file), minified);
        console.log(`Minified JS: ${file}`);
      }
    });
  }
  
  // Copy public assets (images, etc.)
  const publicDir = path.join(frontendDir, 'public');
  const buildPublicDir = path.join(buildDir, 'public');
  
  if (fs.existsSync(publicDir)) {
    copyDir(publicDir, buildPublicDir);
    console.log('Copied public assets');
  }
  
  console.log('Build process completed successfully!');
  
} catch (error) {
  console.error('Build process failed:', error);
  process.exit(1);
}