# Site Configuration Schema Mapping

**Task:** 1.1.4 - Create field mapping documentation for schema design  
**Status:** ✅ COMPLETED  
**Date:** January 2025

## JSON Schema Field Mapping

### Schema Structure Overview

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "Site Configuration",
  "description": "Configuration for a WordPress site in the multi-site content pipeline",
  "required": ["id", "name", "url", "username", "appPassword", "topics", "categories", "tags", "status"],
  "properties": {
    // Field definitions will be mapped below
  }
}
```

### Field Mappings

#### 1. `id` Field
```json
{
  "id": {
    "type": "string",
    "description": "Unique identifier for the site",
    "pattern": "^[a-z0-9-]+$",
    "minLength": 3,
    "maxLength": 50,
    "examples": ["health-wellness", "tech-blog"]
  }
}
```

**Mapping Details:**
- **JSON Schema Type:** `string`
- **Validation Rules:** 
  - Required field
  - Must match pattern: lowercase letters, numbers, and hyphens only
  - Length: 3-50 characters
  - Must be unique across all configurations
- **Business Rules:** Used as key in sites object and for site identification
- **Error Messages:**
  - Missing: "Required field 'id' is missing"
  - Invalid format: "Field 'id' must match pattern: lowercase letters, numbers, and hyphens only"
  - Too short: "Field 'id' must be at least 3 characters long"
  - Too long: "Field 'id' must be no more than 50 characters long"

#### 2. `name` Field
```json
{
  "name": {
    "type": "string",
    "description": "Human-readable site name",
    "minLength": 5,
    "maxLength": 100,
    "examples": ["Health & Wellness Blog", "Technology Blog"]
  }
}
```

**Mapping Details:**
- **JSON Schema Type:** `string`
- **Validation Rules:**
  - Required field
  - Length: 5-100 characters
  - Must be non-empty
- **Business Rules:** Used for logging, error messages, and display purposes
- **Error Messages:**
  - Missing: "Required field 'name' is missing"
  - Too short: "Field 'name' must be at least 5 characters long"
  - Too long: "Field 'name' must be no more than 100 characters long"

#### 3. `url` Field
```json
{
  "url": {
    "type": "string",
    "description": "WordPress site URL",
    "format": "uri",
    "pattern": "^https?://.*",
    "examples": ["http://health-blog-test.local", "https://example.com"]
  }
}
```

**Mapping Details:**
- **JSON Schema Type:** `string` with `uri` format
- **Validation Rules:**
  - Required field
  - Must be valid URI format
  - Must start with http:// or https://
  - Should be accessible (runtime validation)
- **Business Rules:** Used for WordPress API calls and content publishing
- **Error Messages:**
  - Missing: "Required field 'url' is missing"
  - Invalid format: "Field 'url' must be a valid URI"
  - Invalid protocol: "Field 'url' must start with http:// or https://"
  - Not accessible: "Field 'url' is not accessible"

#### 4. `username` Field
```json
{
  "username": {
    "type": "string",
    "description": "WordPress admin username",
    "minLength": 3,
    "maxLength": 50,
    "pattern": "^[a-zA-Z0-9_-]+$",
    "examples": ["admin", "content-bot"]
  }
}
```

**Mapping Details:**
- **JSON Schema Type:** `string`
- **Validation Rules:**
  - Required field
  - Length: 3-50 characters
  - Must match pattern: alphanumeric, underscores, and hyphens only
- **Business Rules:** Used for WordPress authentication
- **Error Messages:**
  - Missing: "Required field 'username' is missing"
  - Invalid format: "Field 'username' must contain only letters, numbers, underscores, and hyphens"
  - Too short: "Field 'username' must be at least 3 characters long"
  - Too long: "Field 'username' must be no more than 50 characters long"

#### 5. `appPassword` Field
```json
{
  "appPassword": {
    "type": "string",
    "description": "WordPress application password",
    "pattern": "^[A-Za-z0-9]{4} [A-Za-z0-9]{4} [A-Za-z0-9]{4} [A-Za-z0-9]{4} [A-Za-z0-9]{4} [A-Za-z0-9]{4}$",
    "examples": ["nch1 omeQ 7EPJ RzjU x105 p1KJ", "odNl IaCt 3OYb o4I7 W3sK zGw7"]
  }
}
```

**Mapping Details:**
- **JSON Schema Type:** `string`
- **Validation Rules:**
  - Required field
  - Must match WordPress app password format
  - Pattern: 6 groups of 4 characters separated by spaces
- **Business Rules:** Used for WordPress API authentication
- **Error Messages:**
  - Missing: "Required field 'appPassword' is missing"
  - Invalid format: "Field 'appPassword' must match WordPress application password format: 6 groups of 4 characters separated by spaces"

#### 6. `topics` Field
```json
{
  "topics": {
    "type": "array",
    "description": "List of topics this site covers",
    "items": {
      "type": "string",
      "minLength": 2,
      "maxLength": 50
    },
    "minItems": 1,
    "maxItems": 50,
    "uniqueItems": true,
    "examples": [["nutrition", "fitness", "mental health"]]
  }
}
```

**Mapping Details:**
- **JSON Schema Type:** `array` of `string` items
- **Validation Rules:**
  - Required field
  - Must have at least 1 item
  - Maximum 50 items
  - Each item: 2-50 characters
  - Items must be unique
- **Business Rules:** Used for content routing and topic matching
- **Error Messages:**
  - Missing: "Required field 'topics' is missing"
  - Empty array: "Field 'topics' must contain at least one item"
  - Too many items: "Field 'topics' must contain no more than 50 items"
  - Duplicate items: "Field 'topics' must contain unique items"
  - Invalid item: "Field 'topics' items must be 2-50 characters long"

#### 7. `categories` Field
```json
{
  "categories": {
    "type": "array",
    "description": "WordPress categories for content",
    "items": {
      "type": "string",
      "minLength": 3,
      "maxLength": 50
    },
    "minItems": 1,
    "maxItems": 20,
    "uniqueItems": true,
    "examples": [["Nutrition", "Fitness", "Mental Health"]]
  }
}
```

**Mapping Details:**
- **JSON Schema Type:** `array` of `string` items
- **Validation Rules:**
  - Required field
  - Must have at least 1 item
  - Maximum 20 items
  - Each item: 3-50 characters
  - Items must be unique
- **Business Rules:** Used for WordPress post categorization
- **Error Messages:**
  - Missing: "Required field 'categories' is missing"
  - Empty array: "Field 'categories' must contain at least one item"
  - Too many items: "Field 'categories' must contain no more than 20 items"
  - Duplicate items: "Field 'categories' must contain unique items"
  - Invalid item: "Field 'categories' items must be 3-50 characters long"

#### 8. `tags` Field
```json
{
  "tags": {
    "type": "array",
    "description": "WordPress tags for content",
    "items": {
      "type": "string",
      "minLength": 2,
      "maxLength": 30,
      "pattern": "^[a-z0-9-]+$"
    },
    "minItems": 1,
    "maxItems": 30,
    "uniqueItems": true,
    "examples": [["health", "wellness", "mental-health"]]
  }
}
```

**Mapping Details:**
- **JSON Schema Type:** `array` of `string` items
- **Validation Rules:**
  - Required field
  - Must have at least 1 item
  - Maximum 30 items
  - Each item: 2-30 characters, lowercase with hyphens
  - Items must be unique
- **Business Rules:** Used for WordPress post tagging
- **Error Messages:**
  - Missing: "Required field 'tags' is missing"
  - Empty array: "Field 'tags' must contain at least one item"
  - Too many items: "Field 'tags' must contain no more than 30 items"
  - Duplicate items: "Field 'tags' must contain unique items"
  - Invalid item: "Field 'tags' items must be 2-30 characters long and contain only lowercase letters, numbers, and hyphens"

#### 9. `status` Field
```json
{
  "status": {
    "type": "string",
    "description": "Site status",
    "enum": ["active", "inactive"],
    "default": "active",
    "examples": ["active", "inactive"]
  }
}
```

**Mapping Details:**
- **JSON Schema Type:** `string` with enum constraint
- **Validation Rules:**
  - Required field
  - Must be one of: "active", "inactive"
  - Case sensitive
- **Business Rules:** Used for site filtering and activation control
- **Error Messages:**
  - Missing: "Required field 'status' is missing"
  - Invalid value: "Field 'status' must be one of: active, inactive"

#### 10. `description` Field (Optional)
```json
{
  "description": {
    "type": "string",
    "description": "Site description",
    "minLength": 10,
    "maxLength": 500,
    "examples": ["Health and wellness content focused on nutrition, fitness, mental health, and overall well-being"]
  }
}
```

**Mapping Details:**
- **JSON Schema Type:** `string`
- **Validation Rules:**
  - Optional field
  - If present, must be 10-500 characters
- **Business Rules:** Used for documentation and site information
- **Error Messages:**
  - Too short: "Field 'description' must be at least 10 characters long"
  - Too long: "Field 'description' must be no more than 500 characters long"

#### 11. `lastUpdated` Field (Optional)
```json
{
  "lastUpdated": {
    "type": "string",
    "description": "Last update timestamp",
    "format": "date-time",
    "examples": ["2025-01-27T00:00:00Z", "2025-01-27T12:30:45.123Z"]
  }
}
```

**Mapping Details:**
- **JSON Schema Type:** `string` with `date-time` format
- **Validation Rules:**
  - Optional field
  - If present, must be valid ISO 8601 format
- **Business Rules:** Used for tracking configuration changes
- **Error Messages:**
  - Invalid format: "Field 'lastUpdated' must be a valid ISO 8601 date-time format"

## Complete JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "Site Configuration",
  "description": "Configuration for a WordPress site in the multi-site content pipeline",
  "required": ["id", "name", "url", "username", "appPassword", "topics", "categories", "tags", "status"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier for the site",
      "pattern": "^[a-z0-9-]+$",
      "minLength": 3,
      "maxLength": 50,
      "examples": ["health-wellness", "tech-blog"]
    },
    "name": {
      "type": "string",
      "description": "Human-readable site name",
      "minLength": 5,
      "maxLength": 100,
      "examples": ["Health & Wellness Blog", "Technology Blog"]
    },
    "url": {
      "type": "string",
      "description": "WordPress site URL",
      "format": "uri",
      "pattern": "^https?://.*",
      "examples": ["http://health-blog-test.local", "https://example.com"]
    },
    "username": {
      "type": "string",
      "description": "WordPress admin username",
      "minLength": 3,
      "maxLength": 50,
      "pattern": "^[a-zA-Z0-9_-]+$",
      "examples": ["admin", "content-bot"]
    },
    "appPassword": {
      "type": "string",
      "description": "WordPress application password",
      "pattern": "^[A-Za-z0-9]{4} [A-Za-z0-9]{4} [A-Za-z0-9]{4} [A-Za-z0-9]{4} [A-Za-z0-9]{4} [A-Za-z0-9]{4}$",
      "examples": ["nch1 omeQ 7EPJ RzjU x105 p1KJ", "odNl IaCt 3OYb o4I7 W3sK zGw7"]
    },
    "topics": {
      "type": "array",
      "description": "List of topics this site covers",
      "items": {
        "type": "string",
        "minLength": 2,
        "maxLength": 50
      },
      "minItems": 1,
      "maxItems": 50,
      "uniqueItems": true,
      "examples": [["nutrition", "fitness", "mental health"]]
    },
    "categories": {
      "type": "array",
      "description": "WordPress categories for content",
      "items": {
        "type": "string",
        "minLength": 3,
        "maxLength": 50
      },
      "minItems": 1,
      "maxItems": 20,
      "uniqueItems": true,
      "examples": [["Nutrition", "Fitness", "Mental Health"]]
    },
    "tags": {
      "type": "array",
      "description": "WordPress tags for content",
      "items": {
        "type": "string",
        "minLength": 2,
        "maxLength": 30,
        "pattern": "^[a-z0-9-]+$"
      },
      "minItems": 1,
      "maxItems": 30,
      "uniqueItems": true,
      "examples": [["health", "wellness", "mental-health"]]
    },
    "status": {
      "type": "string",
      "description": "Site status",
      "enum": ["active", "inactive"],
      "default": "active",
      "examples": ["active", "inactive"]
    },
    "description": {
      "type": "string",
      "description": "Site description",
      "minLength": 10,
      "maxLength": 500,
      "examples": ["Health and wellness content focused on nutrition, fitness, mental health, and overall well-being"]
    },
    "lastUpdated": {
      "type": "string",
      "description": "Last update timestamp",
      "format": "date-time",
      "examples": ["2025-01-27T00:00:00Z", "2025-01-27T12:30:45.123Z"]
    }
  },
  "additionalProperties": false
}
```

## Implementation Notes

### 1. Schema Validation Library
- Use `ajv` for JSON Schema validation
- Use `ajv-formats` for format validation (uri, date-time)
- Implement custom validation for WordPress app password format

### 2. Error Handling
- Provide clear, actionable error messages
- Include field paths for nested validation errors
- Suggest fixes for common validation issues

### 3. Business Rule Validation
- Implement custom validators for uniqueness constraints
- Add runtime validation for connectivity and authentication
- Validate against existing site configurations

### 4. Performance Considerations
- Cache compiled schemas for better performance
- Use streaming validation for large configuration sets
- Implement validation result caching

## Next Steps

- [ ] Implement JSON Schema definition and validation library
- [ ] Create CLI validation tool
- [ ] Integrate pre-commit hooks
- [ ] Set up CI pipeline integration
