import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Remove duplicate items from GraphQL connection response based on ID
 * This function handles both edges and nodes arrays, keeping only unique items by ID
 * 
 * @param data - GraphQL connection response with edges and nodes
 * @returns Deduplicated data with unique items based on ID
 */
export function removeDuplicateById<T extends { id: number | string }>(data: {
  connection?: {
    edges?: Array<{ node: T; cursor?: string }>
    nodes?: T[]
    [key: string]: any
  }
  [key: string]: any
}): typeof data {
  if (!data?.connection) {
    return data
  }

  const { edges, nodes, ...rest } = data.connection

  // Deduplicate edges by node.id
  const uniqueEdgesMap = new Map<number | string, { node: T; cursor?: string }>()
  if (edges) {
    edges.forEach(edge => {
      const id = edge.node?.id
      if (id !== undefined && id !== null) {
        // Keep the first occurrence (or the one with the latest cursor if needed)
        if (!uniqueEdgesMap.has(id)) {
          uniqueEdgesMap.set(id, edge)
        } else {
          // If cursor exists and is newer, replace with newer one
          const existing = uniqueEdgesMap.get(id)!
          if (edge.cursor && existing.cursor && edge.cursor > existing.cursor) {
            uniqueEdgesMap.set(id, edge)
          }
        }
      }
    })
  }

  // Deduplicate nodes by id
  const uniqueNodesMap = new Map<number | string, T>()
  if (nodes) {
    nodes.forEach(node => {
      const id = node?.id
      if (id !== undefined && id !== null) {
        // Keep the first occurrence
        if (!uniqueNodesMap.has(id)) {
          uniqueNodesMap.set(id, node)
        }
      }
    })
  }

  // If we have edges, use them to populate nodes (ensuring consistency)
  if (uniqueEdgesMap.size > 0) {
    const nodesFromEdges = Array.from(uniqueEdgesMap.values()).map(edge => edge.node)
    // Merge with existing unique nodes, preferring nodes from edges
    nodesFromEdges.forEach(node => {
      const id = node?.id
      if (id !== undefined && id !== null) {
        uniqueNodesMap.set(id, node)
      }
    })
  }

  return {
    ...data,
    connection: {
      ...rest,
      edges: Array.from(uniqueEdgesMap.values()),
      nodes: Array.from(uniqueNodesMap.values()),
    },
  }
}

/**
 * Remove duplicates from an array based on ID field
 * 
 * @param items - Array of items with id field
 * @param keepFirst - If true, keep first occurrence; if false, keep last occurrence
 * @returns Array with unique items based on ID
 */
export function removeDuplicatesById<T extends { id: number | string }>(
  items: T[],
  keepFirst: boolean = true
): T[] {
  const seen = new Map<number | string, T>()
  
  items.forEach(item => {
    const id = item?.id
    if (id !== undefined && id !== null) {
      if (keepFirst) {
        if (!seen.has(id)) {
          seen.set(id, item)
        }
      } else {
        seen.set(id, item) // Always keep the last one
      }
    }
  })
  
  return Array.from(seen.values())
}
