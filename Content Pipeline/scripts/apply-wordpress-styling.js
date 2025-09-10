const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function applyWordPressStyling() {
  log('\n🎨 WordPress Site Styling Enhancement', 'bold');
  log('=' .repeat(50), 'blue');
  
  // WordPress site configuration
  const wordpressUrl = 'http://automated-content-pipeline-local-test-site.local';
  const wordpressUsername = 'content-bot';
  const wordpressPassword = 'inB4 Er6i Koi4 J7Ls JKkN n3Hu';
  
  log(`\n📋 WordPress Configuration:`, 'bold');
  log(`   URL: ${wordpressUrl}`, 'blue');
  log(`   Username: ${wordpressUsername}`, 'blue');
  log(`   Password: ${wordpressPassword.substring(0, 10)}...`, 'blue');
  
  try {
    // Read the custom CSS file
    const cssPath = path.join(__dirname, '..', 'wordpress-enhancements', 'custom-styles.css');
    const customCSS = fs.readFileSync(cssPath, 'utf8');
    
    log(`\n📁 Custom CSS loaded: ${cssPath}`, 'green');
    log(`   Size: ${customCSS.length} characters`, 'blue');
    
    // Create a simple HTML file with the styling for easy copy-paste
    const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WordPress Styling Enhancement</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5rem;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
        .instructions {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            border-left: 4px solid #667eea;
        }
        .code-block {
            background: #2d3748;
            color: #e2e8f0;
            padding: 20px;
            border-radius: 10px;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.5;
            margin: 20px 0;
        }
        .step {
            background: white;
            border: 1px solid #e1e5e9;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .step h3 {
            color: #667eea;
            margin-top: 0;
        }
        .button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin: 10px 5px;
            transition: all 0.3s ease;
        }
        .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        .success {
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 10px;
            border: 1px solid #c3e6cb;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎨 WordPress Styling Enhancement</h1>
            <p>Apply beautiful custom styling to your WordPress site</p>
        </div>
        
        <div class="success">
            <strong>✅ Ready to Apply!</strong> Your custom styling is ready to be applied to your WordPress site.
        </div>
        
        <div class="instructions">
            <h3>📋 Quick Installation Steps:</h3>
            <ol>
                <li>Go to your WordPress admin: <a href="${wordpressUrl}/wp-admin" target="_blank">${wordpressUrl}/wp-admin</a></li>
                <li>Navigate to <strong>Appearance → Customize</strong></li>
                <li>Click on <strong>Additional CSS</strong></li>
                <li>Copy and paste the CSS code below</li>
                <li>Click <strong>Publish</strong></li>
            </ol>
        </div>
        
        <div class="step">
            <h3>🎯 Method 1: Additional CSS (Easiest)</h3>
            <p>Copy the CSS code below and paste it into your WordPress Additional CSS section:</p>
            <div class="code-block">${customCSS}</div>
            <a href="${wordpressUrl}/wp-admin/customize.php" target="_blank" class="button">Open WordPress Customizer</a>
        </div>
        
        <div class="step">
            <h3>🔧 Method 2: Theme Functions (Advanced)</h3>
            <p>For more advanced users, you can add this to your theme's functions.php file:</p>
            <div class="code-block">// Add this to your theme's functions.php file
function content_pipeline_custom_styles() {
    echo '<style type="text/css">
        ${customCSS.replace(/\n/g, '\\n')}
    </style>';
}
add_action('wp_head', 'content_pipeline_custom_styles');</div>
        </div>
        
        <div class="step">
            <h3>🎉 What You'll Get:</h3>
            <ul>
                <li>✨ Modern gradient backgrounds</li>
                <li>🎨 Beautiful color scheme</li>
                <li>📱 Responsive design</li>
                <li>🤖 Special styling for AI-generated content</li>
                <li>💫 Smooth hover effects</li>
                <li>📝 Enhanced typography</li>
            </ul>
        </div>
        
        <div class="step">
            <h3>🔗 Quick Links:</h3>
            <a href="${wordpressUrl}" target="_blank" class="button">View Your Site</a>
            <a href="${wordpressUrl}/wp-admin" target="_blank" class="button">WordPress Admin</a>
            <a href="${wordpressUrl}/wp-admin/customize.php" target="_blank" class="button">Customizer</a>
        </div>
    </div>
</body>
</html>`;
    
    // Save the HTML file
    const htmlPath = path.join(__dirname, '..', 'wordpress-enhancements', 'styling-instructions.html');
    fs.writeFileSync(htmlPath, htmlTemplate);
    
    log(`\n📄 Styling instructions created: ${htmlPath}`, 'green');
    
    // Create a simple CSS file for easy copying
    const simpleCSSPath = path.join(__dirname, '..', 'wordpress-enhancements', 'copy-this-css.css');
    fs.writeFileSync(simpleCSSPath, customCSS);
    
    log(`\n📋 CSS file ready for copying: ${simpleCSSPath}`, 'green');
    
    log('\n🎯 Next Steps:', 'bold');
    log('1. Open the styling instructions: wordpress-enhancements/styling-instructions.html', 'yellow');
    log('2. Follow the step-by-step guide', 'yellow');
    log('3. Apply the CSS to your WordPress site', 'yellow');
    log('4. Enjoy your beautiful new styling!', 'yellow');
    
    log('\n🔗 Quick Access:', 'bold');
    log(`   WordPress Site: ${wordpressUrl}`, 'blue');
    log(`   WordPress Admin: ${wordpressUrl}/wp-admin`, 'blue');
    log(`   Customizer: ${wordpressUrl}/wp-admin/customize.php`, 'blue');
    
    log('\n✅ WordPress styling enhancement ready!', 'green');
    log('Open the HTML file in your browser to see the installation guide.', 'cyan');
    
  } catch (error) {
    log('\n❌ Error applying WordPress styling:', 'red');
    log(`   ${error.message}`, 'red');
    
    log('\n💡 Manual Installation:', 'yellow');
    log('1. Go to your WordPress admin', 'yellow');
    log('2. Navigate to Appearance → Customize', 'yellow');
    log('3. Click on Additional CSS', 'yellow');
    log('4. Copy the CSS from wordpress-enhancements/custom-styles.css', 'yellow');
    log('5. Paste and publish', 'yellow');
  }
}

// Run the styling application
applyWordPressStyling().catch(console.error);
