# Site Configuration Business Rules and Validation Requirements

**Task:** 1.1.3 - Identify business rules and validation requirements from existing code  
**Status:** ✅ COMPLETED  
**Date:** January 2025

## Business Rules Identified from Code Analysis

### 1. Site Existence and Availability Rules

#### Rule 1.1: Site Must Exist
- **Code Location:** `scripts/multi-site-generator.js:219`, `scripts/topic-router.js:100`
- **Validation:** `if (!site) { throw new Error(\`Site ${siteId} not found\`); }`
- **Business Rule:** Site configuration must exist for the given site ID
- **Error Handling:** Throw error and stop execution

#### Rule 1.2: Site ID Must Be Provided
- **Code Location:** `scripts/multi-site-generator.js:266`
- **Validation:** `if (!siteId) { console.log('❌ Please provide site ID'); return; }`
- **Business Rule:** Site ID is required for site-specific operations
- **Error Handling:** Log error and return early

### 2. WordPress Authentication Rules

#### Rule 2.1: Application Password Must Be Configured
- **Code Location:** `scripts/multi-site-generator.js:27`, `scripts/test-wordpress-publishing.js:84`
- **Validation:** `if (!wordpressPassword) { throw new Error(\`Application password not configured for ${targetSite.name}\`); }`
- **Business Rule:** WordPress application password is required for publishing
- **Error Handling:** Throw error with descriptive message

#### Rule 2.2: WordPress Credentials Must Be Valid
- **Code Location:** `scripts/test-tech-blog.js:23`, `scripts/test-health-site.js:23`
- **Validation:** `if (!siteConfig.appPassword) { console.log('⚠️ Application Password not configured yet!'); process.exit(1); }`
- **Business Rule:** Valid WordPress credentials are required for site operations
- **Error Handling:** Log warning and exit process

### 3. Configuration File Rules

#### Rule 3.1: Configuration File Must Exist
- **Code Location:** `scripts/test-tech-blog.js:9`, `scripts/test-health-site.js:9`
- **Validation:** `if (!fs.existsSync(configPath)) { console.error('❌ Tech blog configuration not found at:', configPath); process.exit(1); }`
- **Business Rule:** Site configuration file must exist in the expected location
- **Error Handling:** Log error and exit process

#### Rule 3.2: Configuration Directory Must Exist
- **Code Location:** `scripts/configure-site.js:97`
- **Validation:** `if (!fs.existsSync(configDir)) { fs.mkdirSync(configDir, { recursive: true }); }`
- **Business Rule:** Configuration directory must exist (auto-create if missing)
- **Error Handling:** Create directory recursively

### 4. Content Routing Rules

#### Rule 4.1: Site Must Be Found for Topic
- **Code Location:** `scripts/multi-site-generator.js:19`, `scripts/test-wordpress-publishing.js:74`
- **Validation:** `if (!targetSite) { throw new Error('No suitable site found for this topic'); }`
- **Business Rule:** At least one site must match the given topic
- **Error Handling:** Throw error and stop execution

#### Rule 4.2: Topic Matching Scoring
- **Code Location:** `scripts/topic-router.js:38-56`
- **Business Rule:** Topics are matched using a scoring system:
  - Topic matches: 10 points
  - Category matches: 5 points  
  - Tag matches: 3 points
- **Error Handling:** Return best match or null if no matches

### 5. Data Integrity Rules

#### Rule 5.1: Arrays Must Not Be Empty
- **Code Location:** Implied from usage patterns
- **Business Rule:** Required arrays (topics, categories, tags) must contain at least one item
- **Error Handling:** Reject configuration if arrays are empty

#### Rule 5.2: Strings Must Be Non-Empty
- **Code Location:** Implied from validation patterns
- **Business Rule:** Required string fields must not be empty or null
- **Error Handling:** Reject configuration if required strings are empty

## Validation Requirements from Code Analysis

### 1. Required Field Validation

#### Critical Fields (Must Exist and Be Non-Empty)
- **`id`**: Site identifier
- **`name`**: Site display name
- **`url`**: WordPress site URL
- **`username`**: WordPress username
- **`appPassword`**: WordPress application password
- **`topics`**: Array of topics (must have at least one)
- **`categories`**: Array of categories (must have at least one)
- **`tags`**: Array of tags (must have at least one)
- **`status`**: Site status

#### Optional Fields (May Be Empty or Missing)
- **`description`**: Site description
- **`lastUpdated`**: Last update timestamp

### 2. Data Type Validation

#### String Fields
- **`id`**: Must be string, non-empty
- **`name`**: Must be string, non-empty
- **`url`**: Must be string, valid URL format
- **`username`**: Must be string, non-empty
- **`appPassword`**: Must be string, non-empty
- **`status`**: Must be string, enum value
- **`description`**: Must be string (if present)
- **`lastUpdated`**: Must be string, ISO 8601 format (if present)

#### Array Fields
- **`topics`**: Must be array of strings, non-empty
- **`categories`**: Must be array of strings, non-empty
- **`tags`**: Must be array of strings, non-empty

### 3. Format Validation

#### URL Format
- **Pattern:** Must be valid HTTP/HTTPS URL
- **Examples:** `http://example.com`, `https://example.com`
- **Validation:** Use URL constructor or regex pattern

#### WordPress App Password Format
- **Pattern:** 4 groups of 4 characters separated by spaces
- **Examples:** `nch1 omeQ 7EPJ RzjU x105 p1KJ`
- **Validation:** Regex pattern: `^[A-Za-z0-9]{4} [A-Za-z0-9]{4} [A-Za-z0-9]{4} [A-Za-z0-9]{4} [A-Za-z0-9]{4} [A-Za-z0-9]{4}$`

#### ISO 8601 Timestamp Format
- **Pattern:** `YYYY-MM-DDTHH:mm:ss.sssZ`
- **Examples:** `2025-01-27T00:00:00Z`, `2025-01-27T12:30:45.123Z`
- **Validation:** Date constructor or regex pattern

#### Status Enum Format
- **Allowed Values:** `"active"`, `"inactive"`
- **Case Sensitivity:** Exact match required
- **Validation:** Enum validation

### 4. Business Logic Validation

#### Uniqueness Validation
- **`id`**: Must be unique across all site configurations
- **Validation:** Check against existing site IDs

#### Connectivity Validation
- **`url`**: Must be accessible (optional, for runtime validation)
- **Validation:** HTTP request to URL

#### WordPress Authentication Validation
- **`username` + `appPassword`**: Must be valid for WordPress API
- **Validation:** Test WordPress API authentication

### 5. Array Content Validation

#### Topics Array
- **Minimum Items:** 1
- **Maximum Items:** 50 (recommended)
- **Item Format:** Non-empty strings
- **Uniqueness:** Items should be unique within array

#### Categories Array
- **Minimum Items:** 1
- **Maximum Items:** 20 (recommended)
- **Item Format:** Non-empty strings
- **Uniqueness:** Items should be unique within array

#### Tags Array
- **Minimum Items:** 1
- **Maximum Items:** 30 (recommended)
- **Item Format:** Non-empty strings
- **Uniqueness:** Items should be unique within array

## Error Handling Patterns

### 1. Critical Errors (Throw and Stop)
- Missing required fields
- Invalid data types
- Invalid formats
- Business rule violations

### 2. Warnings (Log and Continue)
- Missing optional fields
- Non-critical format issues
- Performance warnings

### 3. Info Messages (Log for Information)
- Configuration loading status
- Validation results
- Processing progress

## Validation Implementation Requirements

### 1. Schema Validation
- Use JSON Schema for structure validation
- Validate required fields and data types
- Validate format patterns

### 2. Business Rule Validation
- Implement custom validation functions
- Check uniqueness constraints
- Validate business logic rules

### 3. Runtime Validation
- Test connectivity (optional)
- Test authentication (optional)
- Validate against external systems

### 4. Error Reporting
- Provide clear error messages
- Include field paths and line numbers
- Suggest fixes for common issues

## Next Steps

- [ ] Create field mapping documentation for schema design
