# Site Configuration Field Specification

**Task:** 1.1.2 - Document current field types, required vs optional fields, and value constraints  
**Status:** ✅ COMPLETED  
**Date:** January 2025

## Field Classification

### Required Fields (Must be present and non-empty)

#### 1. `id` (string)
- **Type:** String
- **Format:** Lowercase with hyphens (kebab-case)
- **Examples:** "health-wellness", "tech-blog"
- **Constraints:**
  - Must be unique across all site configurations
  - Must match filename (without .json extension)
  - Must be valid identifier (alphanumeric and hyphens only)
  - Length: 3-50 characters
- **Usage:** Used as key in sites object and for site identification

#### 2. `name` (string)
- **Type:** String
- **Format:** Human-readable title case
- **Examples:** "Health & Wellness Blog", "Technology Blog"
- **Constraints:**
  - Must be non-empty
  - Length: 5-100 characters
  - Should be descriptive and unique
- **Usage:** Used for logging, error messages, and display purposes

#### 3. `url` (string)
- **Type:** String (URL)
- **Format:** Valid HTTP/HTTPS URL
- **Examples:** "http://health-blog-test.local", "https://example.com"
- **Constraints:**
  - Must be valid URL format
  - Must be accessible (connectivity test required)
  - Should end with WordPress site root
- **Usage:** Used for WordPress API calls and content publishing

#### 4. `username` (string)
- **Type:** String
- **Format:** WordPress admin username
- **Examples:** "admin", "content-bot"
- **Constraints:**
  - Must be non-empty
  - Length: 3-50 characters
  - Must be valid WordPress username
- **Usage:** Used for WordPress authentication

#### 5. `appPassword` (string)
- **Type:** String
- **Format:** WordPress application password
- **Examples:** "nch1 omeQ 7EPJ RzjU x105 p1KJ", "odNl IaCt 3OYb o4I7 W3sK zGw7"
- **Constraints:**
  - Must match WordPress app password format
  - Format: 4 groups of 4 characters separated by spaces
  - Must be valid for WordPress authentication
- **Usage:** Used for WordPress API authentication

#### 6. `topics` (array)
- **Type:** Array of strings
- **Format:** Lowercase topic strings
- **Examples:** ["nutrition", "fitness", "mental health"]
- **Constraints:**
  - Must be non-empty array
  - Each item must be non-empty string
  - Length: 1-50 items per site
  - Each topic: 2-50 characters
- **Usage:** Used for content routing and topic matching

#### 7. `categories` (array)
- **Type:** Array of strings
- **Format:** Title case category names
- **Examples:** ["Nutrition", "Fitness", "Mental Health"]
- **Constraints:**
  - Must be non-empty array
  - Each item must be non-empty string
  - Length: 1-20 items per site
  - Each category: 3-50 characters
- **Usage:** Used for WordPress post categorization

#### 8. `tags` (array)
- **Type:** Array of strings
- **Format:** Lowercase with hyphens (kebab-case)
- **Examples:** ["health", "wellness", "mental-health"]
- **Constraints:**
  - Must be non-empty array
  - Each item must be non-empty string
  - Length: 1-30 items per site
  - Each tag: 2-30 characters
- **Usage:** Used for WordPress post tagging

#### 9. `status` (string)
- **Type:** String (enum)
- **Format:** Predefined status values
- **Examples:** "active", "inactive"
- **Constraints:**
  - Must be one of: "active", "inactive"
  - Case-sensitive
- **Usage:** Used for site filtering and activation control

### Optional Fields (May be present)

#### 1. `description` (string)
- **Type:** String
- **Format:** Sentence case description
- **Examples:** "Health and wellness content focused on nutrition, fitness, mental health, and overall well-being"
- **Constraints:**
  - Length: 10-500 characters
  - Should be descriptive and informative
- **Usage:** Used for documentation and site information

#### 2. `lastUpdated` (string)
- **Type:** String (ISO 8601 timestamp)
- **Format:** ISO 8601 datetime string
- **Examples:** "2025-01-27T00:00:00Z", "2025-01-27T12:30:45.123Z"
- **Constraints:**
  - Must be valid ISO 8601 format
  - Should be recent timestamp
- **Usage:** Used for tracking configuration changes

## Value Constraints by Type

### String Constraints
- **Minimum Length:** 1 character (except where specified)
- **Maximum Length:** Varies by field (see individual field specs)
- **Character Set:** UTF-8 encoded strings
- **Whitespace:** Leading/trailing whitespace should be trimmed

### Array Constraints
- **Minimum Items:** 1 item (for required arrays)
- **Maximum Items:** Varies by field (see individual field specs)
- **Item Type:** All items must be strings
- **Uniqueness:** Items should be unique within the array

### URL Constraints
- **Protocol:** Must be HTTP or HTTPS
- **Format:** Must be valid URL format
- **Accessibility:** Must be reachable (validation required)
- **WordPress:** Should point to WordPress site root

### Enum Constraints
- **`status`:** Must be exactly "active" or "inactive"
- **Case Sensitivity:** Exact match required

## Validation Rules Summary

### Required Field Validation
1. All required fields must be present
2. All required fields must be non-empty
3. Required arrays must have at least one item

### Data Type Validation
1. String fields must be strings
2. Array fields must be arrays
3. Enum fields must match allowed values

### Format Validation
1. URLs must be valid URL format
2. Timestamps must be valid ISO 8601 format
3. App passwords must match WordPress format

### Business Rule Validation
1. Site IDs must be unique
2. URLs must be accessible
3. WordPress credentials must be valid
4. Arrays must not be empty

## Error Handling Requirements

### Missing Required Fields
- **Error:** "Required field '{field}' is missing"
- **Action:** Reject configuration

### Invalid Data Types
- **Error:** "Field '{field}' must be of type {expected_type}"
- **Action:** Reject configuration

### Invalid Format
- **Error:** "Field '{field}' has invalid format: {current_value}"
- **Action:** Reject configuration

### Business Rule Violations
- **Error:** "Business rule violation: {rule_description}"
- **Action:** Reject configuration

## Next Steps

- [ ] Identify business rules and validation requirements from existing code
- [ ] Create field mapping documentation for schema design
