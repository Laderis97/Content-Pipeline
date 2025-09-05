// Content validation utilities for SEO optimization and quality assurance
// PRD Reference: Content Generation (B3), Data & Security (E2), Success Metrics

import { ContentValidationResult } from './types.ts'

// SEO and content quality thresholds
const CONTENT_THRESHOLDS = {
  min_word_count: 600,
  max_word_count: 800,
  min_title_length: 30,
  max_title_length: 60,
  min_meta_description_length: 120,
  max_meta_description_length: 160,
  min_heading_count: 3,
  max_heading_count: 8,
  min_paragraph_count: 4,
  max_paragraph_count: 12
}

// SEO quality indicators
const SEO_INDICATORS = {
  keyword_density_min: 0.5, // 0.5%
  keyword_density_max: 3.0, // 3.0%
  readability_score_min: 60, // Flesch Reading Ease
  internal_link_opportunities: 2,
  external_link_opportunities: 1
}

// Content quality rules
const QUALITY_RULES = {
  min_sentence_length: 10,
  max_sentence_length: 25,
  min_paragraph_length: 50,
  max_paragraph_length: 200,
  required_html_tags: ['h1', 'h2', 'p'],
  forbidden_words: ['click here', 'read more', 'learn more', 'find out more']
}

interface SEOAnalysis {
  keyword_density: number
  readability_score: number
  heading_structure: boolean
  meta_optimization: boolean
  internal_linking: boolean
  content_freshness: boolean
  overall_score: number
}

interface ContentStructure {
  title: string
  meta_description: string
  headings: string[]
  paragraphs: string[]
  word_count: number
  sentence_count: number
  average_sentence_length: number
  average_paragraph_length: number
}

/**
 * Comprehensive content validator for SEO optimization and quality assurance
 */
export class ContentValidator {
  private content: string
  private title: string
  private topic: string

  constructor(content: string, title: string, topic: string) {
    this.content = content
    this.title = title
    this.topic = topic
  }

  /**
   * Performs comprehensive content validation
   */
  async validateContent(): Promise<ContentValidationResult> {
    try {
      console.log(`[ContentValidator] Starting validation for topic: ${this.topic}`)
      
      // Basic validation
      const basicValidation = this.validateBasicRequirements()
      if (!basicValidation.valid) {
        return basicValidation
      }

      // Extract content structure
      const structure = this.extractContentStructure()
      
      // Word count validation
      const wordCountValidation = this.validateWordCount(structure.word_count)
      if (!wordCountValidation.valid) {
        return wordCountValidation
      }

      // SEO validation
      const seoValidation = await this.validateSEOOptimization(structure)
      if (!seoValidation.valid) {
        return seoValidation
      }

      // Content quality validation
      const qualityValidation = this.validateContentQuality(structure)
      if (!qualityValidation.valid) {
        return qualityValidation
      }

      // HTML structure validation
      const htmlValidation = this.validateHTMLStructure()
      if (!htmlValidation.valid) {
        return htmlValidation
      }

      console.log(`[ContentValidator] Content validation passed for topic: ${this.topic}`)
      
      return {
        valid: true,
        word_count: structure.word_count,
        has_title: true,
        has_content: true,
        meets_minimum_length: true,
        warnings: [
          ...seoValidation.warnings || [],
          ...qualityValidation.warnings || [],
          ...htmlValidation.warnings || []
        ]
      }

    } catch (error) {
      console.error(`[ContentValidator] Validation error:`, error)
      return {
        valid: false,
        error: `Content validation failed: ${error.message}`
      }
    }
  }

  /**
   * Validates basic content requirements
   */
  private validateBasicRequirements(): ContentValidationResult {
    if (!this.content || this.content.trim().length === 0) {
      return {
        valid: false,
        error: 'Generated content is empty'
      }
    }

    if (!this.title || this.title.trim().length === 0) {
      return {
        valid: false,
        error: 'Generated title is empty'
      }
    }

    if (this.title.length < CONTENT_THRESHOLDS.min_title_length) {
      return {
        valid: false,
        error: `Title too short: ${this.title.length} characters (minimum ${CONTENT_THRESHOLDS.min_title_length})`
      }
    }

    if (this.title.length > CONTENT_THRESHOLDS.max_title_length) {
      return {
        valid: false,
        error: `Title too long: ${this.title.length} characters (maximum ${CONTENT_THRESHOLDS.max_title_length})`
      }
    }

    return { valid: true }
  }

  /**
   * Validates word count meets PRD requirements (600-800 words)
   */
  private validateWordCount(wordCount: number): ContentValidationResult {
    if (wordCount < CONTENT_THRESHOLDS.min_word_count) {
      return {
        valid: false,
        error: `Content too short: ${wordCount} words (minimum ${CONTENT_THRESHOLDS.min_word_count} required)`
      }
    }

    if (wordCount > CONTENT_THRESHOLDS.max_word_count) {
      return {
        valid: false,
        error: `Content too long: ${wordCount} words (maximum ${CONTENT_THRESHOLDS.max_word_count} recommended)`
      }
    }

    return { valid: true }
  }

  /**
   * Validates SEO optimization
   */
  private async validateSEOOptimization(structure: ContentStructure): Promise<ContentValidationResult> {
    const warnings: string[] = []
    
    try {
      // Analyze SEO factors
      const seoAnalysis = this.analyzeSEO(structure)
      
      // Check keyword density
      if (seoAnalysis.keyword_density < SEO_INDICATORS.keyword_density_min) {
        warnings.push(`Low keyword density: ${seoAnalysis.keyword_density.toFixed(2)}% (recommended: ${SEO_INDICATORS.keyword_density_min}%)`)
      }
      
      if (seoAnalysis.keyword_density > SEO_INDICATORS.keyword_density_max) {
        warnings.push(`High keyword density: ${seoAnalysis.keyword_density.toFixed(2)}% (recommended: ${SEO_INDICATORS.keyword_density_max}%)`)
      }

      // Check readability
      if (seoAnalysis.readability_score < SEO_INDICATORS.readability_score_min) {
        warnings.push(`Low readability score: ${seoAnalysis.readability_score} (recommended: ${SEO_INDICATORS.readability_score_min}+)`)
      }

      // Check heading structure
      if (!seoAnalysis.heading_structure) {
        warnings.push('Poor heading structure - ensure proper H1, H2, H3 hierarchy')
      }

      // Check meta optimization
      if (!seoAnalysis.meta_optimization) {
        warnings.push('Meta description could be optimized for better SEO')
      }

      // Check internal linking opportunities
      if (!seoAnalysis.internal_linking) {
        warnings.push('Consider adding internal linking opportunities')
      }

      // Overall SEO score
      if (seoAnalysis.overall_score < 70) {
        warnings.push(`Low SEO score: ${seoAnalysis.overall_score}/100 - consider optimization`)
      }

      return {
        valid: true,
        warnings: warnings.length > 0 ? warnings : undefined
      }

    } catch (error) {
      console.warn(`[ContentValidator] SEO validation warning:`, error)
      return {
        valid: true,
        warnings: [`SEO analysis incomplete: ${error.message}`]
      }
    }
  }

  /**
   * Validates content quality
   */
  private validateContentQuality(structure: ContentStructure): ContentValidationResult {
    const warnings: string[] = []

    // Check sentence length
    if (structure.average_sentence_length < QUALITY_RULES.min_sentence_length) {
      warnings.push(`Sentences too short: average ${structure.average_sentence_length} words (recommended: ${QUALITY_RULES.min_sentence_length}+)`)
    }

    if (structure.average_sentence_length > QUALITY_RULES.max_sentence_length) {
      warnings.push(`Sentences too long: average ${structure.average_sentence_length} words (recommended: ${QUALITY_RULES.max_sentence_length} or less)`)
    }

    // Check paragraph length
    if (structure.average_paragraph_length < QUALITY_RULES.min_paragraph_length) {
      warnings.push(`Paragraphs too short: average ${structure.average_paragraph_length} words (recommended: ${QUALITY_RULES.min_paragraph_length}+)`)
    }

    if (structure.average_paragraph_length > QUALITY_RULES.max_paragraph_length) {
      warnings.push(`Paragraphs too long: average ${structure.average_paragraph_length} words (recommended: ${QUALITY_RULES.max_paragraph_length} or less)`)
    }

    // Check for forbidden words
    const forbiddenWords = this.checkForbiddenWords()
    if (forbiddenWords.length > 0) {
      warnings.push(`Avoid these phrases: ${forbiddenWords.join(', ')}`)
    }

    // Check heading count
    if (structure.headings.length < CONTENT_THRESHOLDS.min_heading_count) {
      warnings.push(`Too few headings: ${structure.headings.length} (recommended: ${CONTENT_THRESHOLDS.min_heading_count}+)`)
    }

    if (structure.headings.length > CONTENT_THRESHOLDS.max_heading_count) {
      warnings.push(`Too many headings: ${structure.headings.length} (recommended: ${CONTENT_THRESHOLDS.max_heading_count} or less)`)
    }

    // Check paragraph count
    if (structure.paragraphs.length < CONTENT_THRESHOLDS.min_paragraph_count) {
      warnings.push(`Too few paragraphs: ${structure.paragraphs.length} (recommended: ${CONTENT_THRESHOLDS.min_paragraph_count}+)`)
    }

    if (structure.paragraphs.length > CONTENT_THRESHOLDS.max_paragraph_count) {
      warnings.push(`Too many paragraphs: ${structure.paragraphs.length} (recommended: ${CONTENT_THRESHOLDS.max_paragraph_count} or less)`)
    }

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  }

  /**
   * Validates HTML structure
   */
  private validateHTMLStructure(): ContentValidationResult {
    const warnings: string[] = []

    // Check for required HTML tags
    for (const tag of QUALITY_RULES.required_html_tags) {
      if (!this.content.includes(`<${tag}`)) {
        warnings.push(`Missing required HTML tag: <${tag}>`)
      }
    }

    // Check for proper HTML structure
    if (!this.content.includes('<h1') && !this.content.includes('<h2')) {
      warnings.push('Content should include at least one heading (H1 or H2)')
    }

    // Check for unclosed tags
    const openTags = this.content.match(/<[^/][^>]*>/g) || []
    const closeTags = this.content.match(/<\/[^>]*>/g) || []
    
    if (openTags.length !== closeTags.length) {
      warnings.push('HTML structure may have unclosed tags')
    }

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  }

  /**
   * Extracts content structure for analysis
   */
  private extractContentStructure(): ContentStructure {
    // Extract title
    const titleMatch = this.content.match(/<title>(.*?)<\/title>/i)
    const extractedTitle = titleMatch ? titleMatch[1].trim() : this.title

    // Extract meta description
    const metaMatch = this.content.match(/<meta[^>]*description[^>]*content="([^"]*)"[^>]*>/i)
    const metaDescription = metaMatch ? metaMatch[1].trim() : ''

    // Extract headings
    const headingMatches = this.content.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi) || []
    const headings = headingMatches.map(h => h.replace(/<[^>]*>/g, '').trim())

    // Extract paragraphs
    const paragraphMatches = this.content.match(/<p[^>]*>(.*?)<\/p>/gi) || []
    const paragraphs = paragraphMatches.map(p => p.replace(/<[^>]*>/g, '').trim())

    // Calculate word count
    const cleanContent = this.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const wordCount = cleanContent.split(/\s+/).length

    // Calculate sentence count
    const sentences = cleanContent.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const sentenceCount = sentences.length

    // Calculate averages
    const averageSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : 0
    const averageParagraphLength = paragraphs.length > 0 ? wordCount / paragraphs.length : 0

    return {
      title: extractedTitle,
      meta_description: metaDescription,
      headings,
      paragraphs,
      word_count: wordCount,
      sentence_count: sentenceCount,
      average_sentence_length: Math.round(averageSentenceLength * 10) / 10,
      average_paragraph_length: Math.round(averageParagraphLength * 10) / 10
    }
  }

  /**
   * Analyzes SEO factors
   */
  private analyzeSEO(structure: ContentStructure): SEOAnalysis {
    // Calculate keyword density
    const keywordDensity = this.calculateKeywordDensity()

    // Calculate readability score (simplified Flesch Reading Ease)
    const readabilityScore = this.calculateReadabilityScore(structure)

    // Check heading structure
    const headingStructure = this.checkHeadingStructure(structure.headings)

    // Check meta optimization
    const metaOptimization = this.checkMetaOptimization(structure.meta_description)

    // Check internal linking opportunities
    const internalLinking = this.checkInternalLinkingOpportunities()

    // Calculate overall SEO score
    const overallScore = this.calculateOverallSEOScore({
      keyword_density: keywordDensity,
      readability_score: readabilityScore,
      heading_structure: headingStructure,
      meta_optimization: metaOptimization,
      internal_linking: internalLinking
    })

    return {
      keyword_density: keywordDensity,
      readability_score: readabilityScore,
      heading_structure: headingStructure,
      meta_optimization: metaOptimization,
      internal_linking: internalLinking,
      content_freshness: true, // Assume fresh content
      overall_score: overallScore
    }
  }

  /**
   * Calculates keyword density
   */
  private calculateKeywordDensity(): number {
    const cleanContent = this.content.toLowerCase().replace(/<[^>]*>/g, ' ')
    const words = cleanContent.split(/\s+/).filter(w => w.length > 2)
    const totalWords = words.length

    if (totalWords === 0) return 0

    // Extract main keywords from topic
    const topicWords = this.topic.toLowerCase().split(/\s+/).filter(w => w.length > 2)
    let keywordCount = 0

    for (const word of topicWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi')
      const matches = cleanContent.match(regex)
      if (matches) {
        keywordCount += matches.length
      }
    }

    return (keywordCount / totalWords) * 100
  }

  /**
   * Calculates readability score (simplified Flesch Reading Ease)
   */
  private calculateReadabilityScore(structure: ContentStructure): number {
    if (structure.sentence_count === 0 || structure.word_count === 0) return 0

    const averageSentenceLength = structure.word_count / structure.sentence_count
    const averageSyllablesPerWord = 1.5 // Simplified estimation

    // Simplified Flesch Reading Ease formula
    const score = 206.835 - (1.015 * averageSentenceLength) - (84.6 * averageSyllablesPerWord)
    return Math.max(0, Math.min(100, Math.round(score)))
  }

  /**
   * Checks heading structure
   */
  private checkHeadingStructure(headings: string[]): boolean {
    if (headings.length === 0) return false

    // Check for H1 or H2
    const hasMainHeading = this.content.includes('<h1') || this.content.includes('<h2')
    if (!hasMainHeading) return false

    // Check for proper hierarchy (simplified)
    return headings.length >= 2
  }

  /**
   * Checks meta optimization
   */
  private checkMetaOptimization(metaDescription: string): boolean {
    if (!metaDescription) return false

    const length = metaDescription.length
    return length >= CONTENT_THRESHOLDS.min_meta_description_length && 
           length <= CONTENT_THRESHOLDS.max_meta_description_length
  }

  /**
   * Checks internal linking opportunities
   */
  private checkInternalLinkingOpportunities(): boolean {
    // Look for phrases that suggest internal linking opportunities
    const linkingPhrases = [
      'related to', 'similar to', 'as mentioned', 'previously discussed',
      'in our', 'on our', 'check out', 'see also'
    ]

    const contentLower = this.content.toLowerCase()
    const opportunities = linkingPhrases.filter(phrase => contentLower.includes(phrase))
    
    return opportunities.length >= SEO_INDICATORS.internal_link_opportunities
  }

  /**
   * Calculates overall SEO score
   */
  private calculateOverallSEOScore(analysis: Partial<SEOAnalysis>): number {
    let score = 0
    let factors = 0

    // Keyword density (20 points)
    if (analysis.keyword_density !== undefined) {
      if (analysis.keyword_density >= SEO_INDICATORS.keyword_density_min && 
          analysis.keyword_density <= SEO_INDICATORS.keyword_density_max) {
        score += 20
      } else {
        score += Math.max(0, 20 - Math.abs(analysis.keyword_density - 1.5) * 10)
      }
      factors++
    }

    // Readability (20 points)
    if (analysis.readability_score !== undefined) {
      if (analysis.readability_score >= SEO_INDICATORS.readability_score_min) {
        score += 20
      } else {
        score += (analysis.readability_score / SEO_INDICATORS.readability_score_min) * 20
      }
      factors++
    }

    // Heading structure (20 points)
    if (analysis.heading_structure) {
      score += 20
    }
    factors++

    // Meta optimization (20 points)
    if (analysis.meta_optimization) {
      score += 20
    }
    factors++

    // Internal linking (20 points)
    if (analysis.internal_linking) {
      score += 20
    }
    factors++

    return factors > 0 ? Math.round(score / factors) : 0
  }

  /**
   * Checks for forbidden words
   */
  private checkForbiddenWords(): string[] {
    const contentLower = this.content.toLowerCase()
    return QUALITY_RULES.forbidden_words.filter(word => contentLower.includes(word))
  }
}

/**
 * Validates content with comprehensive SEO and quality checks
 */
export async function validateContent(
  content: string, 
  title: string, 
  topic: string
): Promise<ContentValidationResult> {
  try {
    const validator = new ContentValidator(content, title, topic)
    return await validator.validateContent()
  } catch (error) {
    console.error('Error in validateContent:', error)
    return {
      valid: false,
      error: `Content validation failed: ${error.message}`
    }
  }
}

/**
 * Gets content validation thresholds
 */
export function getContentThresholds() {
  return CONTENT_THRESHOLDS
}

/**
 * Gets SEO indicators
 */
export function getSEOIndicators() {
  return SEO_INDICATORS
}

/**
 * Gets quality rules
 */
export function getQualityRules() {
  return QUALITY_RULES
}
