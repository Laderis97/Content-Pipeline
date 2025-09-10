<?php
/**
 * Content Pipeline WordPress Site Enhancement
 * 
 * This file contains custom styling and enhancements for your WordPress site.
 * Add this to your active theme's functions.php file or create a custom plugin.
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Enqueue custom styles and scripts
 */
function content_pipeline_enqueue_styles() {
    // Enqueue custom CSS
    wp_enqueue_style(
        'content-pipeline-custom-styles',
        get_template_directory_uri() . '/wordpress-enhancements/custom-styles.css',
        array(),
        '1.0.0'
    );
    
    // Add custom inline styles as fallback
    $custom_css = get_content_pipeline_custom_css();
    wp_add_inline_style('content-pipeline-custom-styles', $custom_css);
}
add_action('wp_enqueue_scripts', 'content_pipeline_enqueue_styles');

/**
 * Get custom CSS content
 */
function get_content_pipeline_custom_css() {
    return '
    /* Content Pipeline WordPress Site - Custom Enhancements */
    
    :root {
        --primary-color: #667eea;
        --secondary-color: #764ba2;
        --accent-color: #f093fb;
        --text-color: #333;
        --light-bg: #f8f9fa;
        --border-color: #e1e5e9;
        --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        --border-radius: 12px;
        --transition: all 0.3s ease;
    }
    
    /* Body and Typography */
    body {
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
        line-height: 1.6;
        color: var(--text-color);
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%) !important;
        min-height: 100vh;
    }
    
    /* Header Enhancements */
    .site-header {
        background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%) !important;
        box-shadow: var(--shadow);
        position: relative;
        overflow: hidden;
        padding: 2rem 0;
    }
    
    .site-title a {
        color: white !important;
        text-decoration: none;
        font-weight: 700;
        font-size: 2.5rem;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        transition: var(--transition);
    }
    
    .site-title a:hover {
        transform: translateY(-2px);
        text-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
    }
    
    .site-description {
        color: rgba(255, 255, 255, 0.9) !important;
        font-size: 1.2rem;
        margin-top: 0.5rem;
    }
    
    /* Navigation Enhancements */
    .main-navigation {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border-radius: var(--border-radius);
        margin: 1rem 0;
        padding: 0.5rem;
    }
    
    .main-navigation ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 1rem;
    }
    
    .main-navigation a {
        color: white !important;
        text-decoration: none;
        padding: 0.75rem 1.5rem;
        border-radius: 25px;
        background: rgba(255, 255, 255, 0.1);
        transition: var(--transition);
        font-weight: 500;
        border: 2px solid transparent;
    }
    
    .main-navigation a:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    
    /* Main Content Area */
    .site-main {
        background: white;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow);
        margin: 2rem auto;
        padding: 2rem;
        max-width: 1200px;
        position: relative;
        overflow: hidden;
    }
    
    .site-main::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, var(--primary-color), var(--secondary-color), var(--accent-color));
    }
    
    /* Post Styling */
    .post {
        margin-bottom: 3rem;
        padding: 2rem;
        background: var(--light-bg);
        border-radius: var(--border-radius);
        border-left: 4px solid var(--primary-color);
        transition: var(--transition);
    }
    
    .post:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    }
    
    .entry-title {
        color: var(--text-color);
        font-size: 2.2rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
        line-height: 1.3;
    }
    
    .entry-title a {
        color: inherit;
        text-decoration: none;
        transition: var(--transition);
    }
    
    .entry-title a:hover {
        color: var(--primary-color);
    }
    
    .entry-meta {
        color: #666;
        font-size: 0.9rem;
        margin-bottom: 1rem;
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: center;
    }
    
    .entry-content {
        font-size: 1.1rem;
        line-height: 1.8;
    }
    
    .entry-content h1,
    .entry-content h2,
    .entry-content h3,
    .entry-content h4,
    .entry-content h5,
    .entry-content h6 {
        color: var(--text-color);
        margin-top: 2rem;
        margin-bottom: 1rem;
        font-weight: 600;
    }
    
    .entry-content h2 {
        font-size: 1.8rem;
        border-bottom: 2px solid var(--primary-color);
        padding-bottom: 0.5rem;
    }
    
    .entry-content h3 {
        font-size: 1.5rem;
        color: var(--secondary-color);
    }
    
    .entry-content p {
        margin-bottom: 1.5rem;
    }
    
    .entry-content blockquote {
        border-left: 4px solid var(--primary-color);
        background: var(--light-bg);
        padding: 1.5rem;
        margin: 2rem 0;
        border-radius: 0 var(--border-radius) var(--border-radius) 0;
        font-style: italic;
        position: relative;
    }
    
    .entry-content blockquote::before {
        content: """;
        font-size: 4rem;
        color: var(--primary-color);
        position: absolute;
        top: -10px;
        left: 15px;
        opacity: 0.3;
    }
    
    /* Content Pipeline Specific Styling */
    .content-pipeline-post {
        border: 2px solid var(--primary-color);
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        position: relative;
    }
    
    .content-pipeline-post::before {
        content: "🤖 AI Generated";
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: var(--primary-color);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 600;
    }
    
    /* Button Styling */
    .button,
    .wp-block-button__link,
    input[type="submit"] {
        background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 25px;
        font-weight: 600;
        text-decoration: none;
        display: inline-block;
        transition: var(--transition);
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }
    
    .button:hover,
    .wp-block-button__link:hover,
    input[type="submit"]:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }
    
    /* Footer Styling */
    .site-footer {
        background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
        color: white;
        padding: 3rem 0;
        margin-top: 3rem;
        text-align: center;
    }
    
    .site-footer a {
        color: #a0aec0;
        text-decoration: none;
        transition: var(--transition);
    }
    
    .site-footer a:hover {
        color: white;
    }
    
    /* Responsive Design */
    @media (max-width: 768px) {
        .site-main {
            margin: 1rem;
            padding: 1rem;
        }
        
        .entry-title {
            font-size: 1.8rem;
        }
        
        .main-navigation ul {
            flex-direction: column;
            align-items: center;
        }
        
        .main-navigation a {
            width: 100%;
            text-align: center;
            margin-bottom: 0.5rem;
        }
    }
    ';
}

/**
 * Add custom body classes
 */
function content_pipeline_body_classes($classes) {
    $classes[] = 'content-pipeline-enhanced';
    return $classes;
}
add_filter('body_class', 'content_pipeline_body_classes');

/**
 * Add custom post classes for AI-generated content
 */
function content_pipeline_post_classes($classes, $class, $post_id) {
    // Check if post was created by Content Pipeline
    $is_ai_generated = get_post_meta($post_id, '_content_pipeline_generated', true);
    if ($is_ai_generated) {
        $classes[] = 'content-pipeline-post';
    }
    return $classes;
}
add_filter('post_class', 'content_pipeline_post_classes', 10, 3);

/**
 * Add custom admin notice
 */
function content_pipeline_admin_notice() {
    if (current_user_can('manage_options')) {
        echo '<div class="notice notice-success is-dismissible">
            <p><strong>Content Pipeline:</strong> Site enhancements are active! Your WordPress site now has beautiful styling.</p>
        </div>';
    }
}
add_action('admin_notices', 'content_pipeline_admin_notice');

/**
 * Add custom meta box for Content Pipeline posts
 */
function content_pipeline_add_meta_box() {
    add_meta_box(
        'content_pipeline_meta',
        'Content Pipeline Info',
        'content_pipeline_meta_box_callback',
        'post',
        'side',
        'high'
    );
}
add_action('add_meta_boxes', 'content_pipeline_add_meta_box');

function content_pipeline_meta_box_callback($post) {
    $is_generated = get_post_meta($post->ID, '_content_pipeline_generated', true);
    $generation_time = get_post_meta($post->ID, '_content_pipeline_generation_time', true);
    $word_count = get_post_meta($post->ID, '_content_pipeline_word_count', true);
    
    if ($is_generated) {
        echo '<p><strong>🤖 AI Generated Content</strong></p>';
        if ($generation_time) {
            echo '<p>Generation Time: ' . esc_html($generation_time) . 'ms</p>';
        }
        if ($word_count) {
            echo '<p>Word Count: ' . esc_html($word_count) . '</p>';
        }
    } else {
        echo '<p>This is a manually created post.</p>';
    }
}

/**
 * Save Content Pipeline meta data
 */
function content_pipeline_save_meta($post_id) {
    if (isset($_POST['content_pipeline_generated'])) {
        update_post_meta($post_id, '_content_pipeline_generated', sanitize_text_field($_POST['content_pipeline_generated']));
    }
    if (isset($_POST['content_pipeline_generation_time'])) {
        update_post_meta($post_id, '_content_pipeline_generation_time', sanitize_text_field($_POST['content_pipeline_generation_time']));
    }
    if (isset($_POST['content_pipeline_word_count'])) {
        update_post_meta($post_id, '_content_pipeline_word_count', sanitize_text_field($_POST['content_pipeline_word_count']));
    }
}
add_action('save_post', 'content_pipeline_save_meta');
?>
