// WordPress categories and tags handling with fallback defaults
// PRD Reference: WordPress Integration (C3), Content Generation (B1-B3)

import { WordPressCategory, WordPressTag } from './wordpress-client.ts'

// Default categories and tags for fallback
const DEFAULT_CATEGORIES = [
  { name: 'Uncategorized', slug: 'uncategorized', description: 'Default category for automated content' },
  { name: 'Blog', slug: 'blog', description: 'General blog posts' },
  { name: 'Technology', slug: 'technology', description: 'Technology-related content' },
  { name: 'Business', slug: 'business', description: 'Business and professional content' },
  { name: 'Marketing', slug: 'marketing', description: 'Marketing and advertising content' },
  { name: 'SEO', slug: 'seo', description: 'Search engine optimization content' },
  { name: 'Content Marketing', slug: 'content-marketing', description: 'Content marketing strategies and tips' },
  { name: 'Digital Marketing', slug: 'digital-marketing', description: 'Digital marketing insights' }
]

const DEFAULT_TAGS = [
  { name: 'automated', slug: 'automated', description: 'Content created by automation' },
  { name: 'ai-generated', slug: 'ai-generated', description: 'AI-generated content' },
  { name: 'content-automation', slug: 'content-automation', description: 'Automated content creation' },
  { name: 'seo', slug: 'seo', description: 'Search engine optimization' },
  { name: 'marketing', slug: 'marketing', description: 'Marketing related content' },
  { name: 'blog', slug: 'blog', description: 'Blog content' },
  { name: 'technology', slug: 'technology', description: 'Technology content' },
  { name: 'business', slug: 'business', description: 'Business content' },
  { name: 'tips', slug: 'tips', description: 'Helpful tips and advice' },
  { name: 'guide', slug: 'guide', description: 'How-to guides and tutorials' }
]

// Content type to category mapping
const CONTENT_TYPE_CATEGORIES = {
  'blog_post': ['Blog', 'Content Marketing', 'SEO'],
  'product_description': ['Business', 'Marketing', 'Digital Marketing'],
  'technology': ['Technology', 'Business', 'SEO'],
  'marketing': ['Marketing', 'Digital Marketing', 'Content Marketing'],
  'business': ['Business', 'Marketing', 'Blog'],
  'seo': ['SEO', 'Content Marketing', 'Digital Marketing']
}

// Content type to tag mapping
const CONTENT_TYPE_TAGS = {
  'blog_post': ['blog', 'content-automation', 'seo', 'tips'],
  'product_description': ['marketing', 'business', 'automated', 'guide'],
  'technology': ['technology', 'automated', 'seo', 'tips'],
  'marketing': ['marketing', 'digital-marketing', 'seo', 'tips'],
  'business': ['business', 'marketing', 'automated', 'guide'],
  'seo': ['seo', 'content-marketing', 'tips', 'guide']
}

// Topic-based category suggestions
const TOPIC_CATEGORY_MAPPING = {
  'seo': ['SEO', 'Content Marketing', 'Digital Marketing'],
  'marketing': ['Marketing', 'Digital Marketing', 'Content Marketing'],
  'business': ['Business', 'Marketing', 'Blog'],
  'technology': ['Technology', 'Business', 'SEO'],
  'content': ['Content Marketing', 'Blog', 'SEO'],
  'social media': ['Digital Marketing', 'Marketing', 'Content Marketing'],
  'email': ['Digital Marketing', 'Marketing', 'Business'],
  'analytics': ['Digital Marketing', 'SEO', 'Business'],
  'automation': ['Technology', 'Business', 'Digital Marketing'],
  'ai': ['Technology', 'Business', 'Digital Marketing']
}

// Topic-based tag suggestions
const TOPIC_TAG_MAPPING = {
  'seo': ['seo', 'content-marketing', 'tips', 'guide'],
  'marketing': ['marketing', 'digital-marketing', 'tips', 'business'],
  'business': ['business', 'marketing', 'tips', 'guide'],
  'technology': ['technology', 'automated', 'tips', 'guide'],
  'content': ['content-marketing', 'blog', 'seo', 'tips'],
  'social media': ['digital-marketing', 'marketing', 'social-media', 'tips'],
  'email': ['email-marketing', 'digital-marketing', 'business', 'tips'],
  'analytics': ['analytics', 'digital-marketing', 'seo', 'business'],
  'automation': ['automation', 'technology', 'business', 'tips'],
  'ai': ['ai', 'technology', 'automation', 'business']
}

interface TaxonomySuggestion {
  categories: string[]
  tags: string[]
  confidence: number
  source: 'content_type' | 'topic' | 'default'
}

interface TaxonomyResult {
  categories: number[]
  tags: number[]
  suggestions: TaxonomySuggestion
  fallback_used: boolean
}

/**
 * WordPress taxonomy manager for categories and tags handling
 */
export class WordPressTaxonomyManager {
  private availableCategories: WordPressCategory[] = []
  private availableTags: WordPressTag[] = []
  private lastFetch: number = 0
  private fetchTimeout: number = 300000 // 5 minutes

  constructor() {
    // Initialize with default taxonomies
    this.initializeDefaults()
  }

  /**
   * Gets categories and tags for a content job with fallback defaults
   */
  async getTaxonomyForJob(
    job: {
      topic: string
      content_type?: string
      tags?: string[]
      categories?: string[]
    }
  ): Promise<TaxonomyResult> {
    try {
      console.log(`[TaxonomyManager] Getting taxonomy for job: ${job.topic}`)
      
      // Fetch current WordPress taxonomies
      await this.fetchWordPressTaxonomies()
      
      // Get taxonomy suggestions
      const suggestions = this.getTaxonomySuggestions(job)
      
      // Resolve categories
      const categoryIds = await this.resolveCategories(
        job.categories || suggestions.categories
      )
      
      // Resolve tags
      const tagIds = await this.resolveTags(
        job.tags || suggestions.tags
      )
      
      // Check if fallback was used
      const fallbackUsed = categoryIds.length === 0 && tagIds.length === 0
      
      console.log(`[TaxonomyManager] Resolved ${categoryIds.length} categories and ${tagIds.length} tags`)
      
      return {
        categories: categoryIds,
        tags: tagIds,
        suggestions,
        fallback_used: fallbackUsed
      }

    } catch (error) {
      console.error('[TaxonomyManager] Error getting taxonomy for job:', error)
      
      // Return fallback defaults
      return this.getFallbackTaxonomy(job)
    }
  }

  /**
   * Gets taxonomy suggestions based on content type and topic
   */
  getTaxonomySuggestions(job: {
    topic: string
    content_type?: string
  }): TaxonomySuggestion {
    const topic = job.topic.toLowerCase()
    const contentType = job.content_type || 'blog_post'
    
    let categories: string[] = []
    let tags: string[] = []
    let confidence = 0.5
    let source: 'content_type' | 'topic' | 'default' = 'default'
    
    // Try content type mapping first
    if (CONTENT_TYPE_CATEGORIES[contentType]) {
      categories = [...CONTENT_TYPE_CATEGORIES[contentType]]
      tags = [...CONTENT_TYPE_TAGS[contentType]]
      confidence = 0.8
      source = 'content_type'
    }
    
    // Try topic-based mapping
    const topicMatch = Object.keys(TOPIC_CATEGORY_MAPPING).find(key => 
      topic.includes(key.toLowerCase())
    )
    
    if (topicMatch) {
      const topicCategories = TOPIC_CATEGORY_MAPPING[topicMatch]
      const topicTags = TOPIC_TAG_MAPPING[topicMatch]
      
      // Merge with content type suggestions
      categories = [...new Set([...categories, ...topicCategories])]
      tags = [...new Set([...tags, ...topicTags])]
      confidence = Math.max(confidence, 0.9)
      source = 'topic'
    }
    
    // If no specific mapping found, use defaults
    if (categories.length === 0) {
      categories = ['Blog', 'Content Marketing']
      tags = ['blog', 'content-automation', 'tips']
      confidence = 0.3
      source = 'default'
    }
    
    return {
      categories: categories.slice(0, 3), // Limit to 3 categories
      tags: tags.slice(0, 5), // Limit to 5 tags
      confidence,
      source
    }
  }

  /**
   * Resolves category names to WordPress category IDs
   */
  async resolveCategories(categoryNames: string[]): Promise<number[]> {
    try {
      if (categoryNames.length === 0) {
        return this.getDefaultCategoryIds()
      }
      
      const categoryMap = new Map(
        this.availableCategories.map(cat => [cat.name.toLowerCase(), cat.id])
      )
      
      const resolvedIds: number[] = []
      
      for (const name of categoryNames) {
        const id = categoryMap.get(name.toLowerCase())
        if (id) {
          resolvedIds.push(id)
        } else {
          console.warn(`[TaxonomyManager] Category not found: ${name}`)
        }
      }
      
      // If no categories resolved, use defaults
      if (resolvedIds.length === 0) {
        console.log('[TaxonomyManager] No categories resolved, using defaults')
        return this.getDefaultCategoryIds()
      }
      
      return resolvedIds
      
    } catch (error) {
      console.error('[TaxonomyManager] Error resolving categories:', error)
      return this.getDefaultCategoryIds()
    }
  }

  /**
   * Resolves tag names to WordPress tag IDs
   */
  async resolveTags(tagNames: string[]): Promise<number[]> {
    try {
      if (tagNames.length === 0) {
        return this.getDefaultTagIds()
      }
      
      const tagMap = new Map(
        this.availableTags.map(tag => [tag.name.toLowerCase(), tag.id])
      )
      
      const resolvedIds: number[] = []
      
      for (const name of tagNames) {
        const id = tagMap.get(name.toLowerCase())
        if (id) {
          resolvedIds.push(id)
        } else {
          console.warn(`[TaxonomyManager] Tag not found: ${name}`)
        }
      }
      
      // If no tags resolved, use defaults
      if (resolvedIds.length === 0) {
        console.log('[TaxonomyManager] No tags resolved, using defaults')
        return this.getDefaultTagIds()
      }
      
      return resolvedIds
      
    } catch (error) {
      console.error('[TaxonomyManager] Error resolving tags:', error)
      return this.getDefaultTagIds()
    }
  }

  /**
   * Fetches current WordPress taxonomies
   */
  private async fetchWordPressTaxonomies(): Promise<void> {
    const now = Date.now()
    
    // Use cache if recent
    if (this.availableCategories.length > 0 && (now - this.lastFetch) < this.fetchTimeout) {
      return
    }
    
    try {
      console.log('[TaxonomyManager] Fetching WordPress taxonomies')
      
      // Import WordPress client dynamically to avoid circular dependency
      const { createWordPressClient } = await import('./wordpress-client.ts')
      const client = createWordPressClient()
      
      // Fetch categories and tags in parallel
      const [categories, tags] = await Promise.all([
        client.getCategories(),
        client.getTags()
      ])
      
      this.availableCategories = categories
      this.availableTags = tags
      this.lastFetch = now
      
      console.log(`[TaxonomyManager] Fetched ${categories.length} categories and ${tags.length} tags`)
      
    } catch (error) {
      console.error('[TaxonomyManager] Error fetching WordPress taxonomies:', error)
      // Keep existing taxonomies or use defaults
    }
  }

  /**
   * Gets default category IDs
   */
  private getDefaultCategoryIds(): number[] {
    // Try to find "Uncategorized" category first
    const uncategorized = this.availableCategories.find(cat => 
      cat.name.toLowerCase() === 'uncategorized'
    )
    
    if (uncategorized) {
      return [uncategorized.id]
    }
    
    // If no categories available, return empty array
    // WordPress will handle this gracefully
    return []
  }

  /**
   * Gets default tag IDs
   */
  private getDefaultTagIds(): number[] {
    // Try to find common default tags
    const defaultTagNames = ['automated', 'content-automation', 'blog']
    
    const defaultTags = this.availableTags.filter(tag =>
      defaultTagNames.includes(tag.name.toLowerCase())
    )
    
    if (defaultTags.length > 0) {
      return defaultTags.map(tag => tag.id)
    }
    
    // If no tags available, return empty array
    return []
  }

  /**
   * Gets fallback taxonomy when WordPress is unavailable
   */
  private getFallbackTaxonomy(job: {
    topic: string
    content_type?: string
  }): TaxonomyResult {
    console.log('[TaxonomyManager] Using fallback taxonomy')
    
    const suggestions = this.getTaxonomySuggestions(job)
    
    return {
      categories: [], // WordPress will use default category
      tags: [], // WordPress will handle gracefully
      suggestions,
      fallback_used: true
    }
  }

  /**
   * Initializes default taxonomies
   */
  private initializeDefaults(): void {
    // Convert default categories to WordPress format
    this.availableCategories = DEFAULT_CATEGORIES.map((cat, index) => ({
      id: index + 1,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      count: 0
    }))
    
    // Convert default tags to WordPress format
    this.availableTags = DEFAULT_TAGS.map((tag, index) => ({
      id: index + 1,
      name: tag.name,
      slug: tag.slug,
      description: tag.description,
      count: 0
    }))
  }

  /**
   * Gets available categories
   */
  getAvailableCategories(): WordPressCategory[] {
    return [...this.availableCategories]
  }

  /**
   * Gets available tags
   */
  getAvailableTags(): WordPressTag[] {
    return [...this.availableTags]
  }

  /**
   * Clears taxonomy cache
   */
  clearCache(): void {
    this.availableCategories = []
    this.availableTags = []
    this.lastFetch = 0
    console.log('[TaxonomyManager] Taxonomy cache cleared')
  }

  /**
   * Refreshes taxonomy data
   */
  async refreshTaxonomies(): Promise<void> {
    this.clearCache()
    await this.fetchWordPressTaxonomies()
  }
}

/**
 * Creates WordPress taxonomy manager
 */
export function createWordPressTaxonomyManager(): WordPressTaxonomyManager {
  return new WordPressTaxonomyManager()
}

/**
 * Gets taxonomy for a content job with fallback defaults
 */
export async function getTaxonomyForJob(job: {
  topic: string
  content_type?: string
  tags?: string[]
  categories?: string[]
}): Promise<TaxonomyResult> {
  try {
    const manager = createWordPressTaxonomyManager()
    return await manager.getTaxonomyForJob(job)
  } catch (error) {
    console.error('Error in getTaxonomyForJob:', error)
    
    // Return fallback
    return {
      categories: [],
      tags: [],
      suggestions: {
        categories: ['Blog'],
        tags: ['blog', 'automated'],
        confidence: 0.1,
        source: 'default'
      },
      fallback_used: true
    }
  }
}

/**
 * Gets default categories
 */
export function getDefaultCategories() {
  return DEFAULT_CATEGORIES
}

/**
 * Gets default tags
 */
export function getDefaultTags() {
  return DEFAULT_TAGS
}

/**
 * Gets content type category mapping
 */
export function getContentTypeCategories() {
  return CONTENT_TYPE_CATEGORIES
}

/**
 * Gets content type tag mapping
 */
export function getContentTypeTags() {
  return CONTENT_TYPE_TAGS
}
