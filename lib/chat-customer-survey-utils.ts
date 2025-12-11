/**
 * Utility functions for handling Chat Customer Survey data
 * Fixes duplicate data issues in getChatCustomerSuveys response
 */

import { removeDuplicateById, removeDuplicatesById } from './utils'

/**
 * Type definition for Chat Customer Survey node
 */
export type ChatCustomerSurveyNode = {
  id: number
  contact_name: string
  contact_id: string
  channel: {
    channel_color: string
    channel_id: string
    channel_image: string
    channel_initials: string
    channel_name: string
    phone: string
    store_id: number
    store_name: string
  }
  location: string
  user_id: number
  user_name: string
  rating: number
  comment_message: string
  conversation_id: string
  created_at: string
}

/**
 * Type definition for Chat Customer Survey connection response
 */
export type ChatCustomerSurveyConnection = {
  connection: {
    edges: Array<{
      cursor: string
      node: ChatCustomerSurveyNode
    }>
    nodes: ChatCustomerSurveyNode[]
    page_cursors: any[]
    page_info: {
      has_next_page: boolean
      has_previous_page: boolean
      start_cursor: string
      end_cursor: string
    }
    total_count: number
    total_page_count: number
  }
}

/**
 * Fix duplicate data in getChatCustomerSuveys response
 * Removes duplicate entries based on ID from both edges and nodes
 * 
 * @param data - Response from getChatCustomerSuveys API
 * @returns Deduplicated response with unique items based on ID
 * 
 * @example
 * ```typescript
 * const response = await getChatCustomerSuveys(params)
 * const fixedData = fixDuplicateChatCustomerSurveys(response)
 * // Use fixedData.connection.edges and fixedData.connection.nodes
 * ```
 */
export function fixDuplicateChatCustomerSurveys(
  data: ChatCustomerSurveyConnection
): ChatCustomerSurveyConnection {
  // Use the utility function to remove duplicates
  const deduplicated = removeDuplicateById(data) as ChatCustomerSurveyConnection

  // Update total_count to reflect actual unique items
  if (deduplicated.connection) {
    const uniqueCount = deduplicated.connection.nodes?.length || 0
    deduplicated.connection.total_count = uniqueCount
  }

  return deduplicated
}

/**
 * Get unique nodes from Chat Customer Survey connection
 * This is a convenience function that extracts and deduplicates nodes
 * 
 * @param data - Response from getChatCustomerSuveys API
 * @returns Array of unique nodes based on ID
 */
export function getUniqueChatCustomerSurveyNodes(
  data: ChatCustomerSurveyConnection
): ChatCustomerSurveyNode[] {
  const fixed = fixDuplicateChatCustomerSurveys(data)
  return fixed.connection.nodes || []
}

/**
 * Get unique edges from Chat Customer Survey connection
 * This is a convenience function that extracts and deduplicates edges
 * 
 * @param data - Response from getChatCustomerSuveys API
 * @returns Array of unique edges based on node.id
 */
export function getUniqueChatCustomerSurveyEdges(
  data: ChatCustomerSurveyConnection
): Array<{ cursor: string; node: ChatCustomerSurveyNode }> {
  const fixed = fixDuplicateChatCustomerSurveys(data)
  return fixed.connection.edges || []
}
