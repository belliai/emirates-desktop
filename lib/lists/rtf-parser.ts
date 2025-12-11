/**
 * RTF parser for extracting text content.
 * Uses a hybrid approach: rtf.js for browser rendering, fallback to direct RTF stripping.
 * Works in browser and any machine without requiring pandoc installation.
 */

/**
 * Convert HTML element to text, preserving table structure with tabs/newlines.
 */
function htmlToText(element: HTMLElement): string {
  let result = ""
  
  function processNode(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent || ""
      return
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) return
    
    const el = node as HTMLElement
    const tagName = el.tagName.toLowerCase()
    
    // Handle table elements
    if (tagName === "table") {
      // Process table rows
      for (const child of el.children) {
        processNode(child)
      }
      return
    }
    
    if (tagName === "tbody" || tagName === "thead" || tagName === "tfoot") {
      for (const child of el.children) {
        processNode(child)
      }
      return
    }
    
    if (tagName === "tr") {
      // Process cells in row
      const cells = el.querySelectorAll("td, th")
      const cellTexts: string[] = []
      cells.forEach((cell) => {
        cellTexts.push((cell.textContent || "").trim())
      })
      result += cellTexts.join("\t") + "\n"
      return
    }
    
    // Handle block elements
    if (["p", "div", "br", "h1", "h2", "h3", "h4", "h5", "h6"].includes(tagName)) {
      // Add newline before if not at start
      if (result.length > 0 && !result.endsWith("\n")) {
        result += "\n"
      }
      for (const child of el.childNodes) {
        processNode(child)
      }
      if (tagName !== "br" && !result.endsWith("\n")) {
        result += "\n"
      }
      return
    }
    
    // Process children for other elements
    for (const child of el.childNodes) {
      processNode(child)
    }
  }
  
  processNode(element)
  
  // Clean up result
  return result
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\t+\n/g, "\n")
    .trim()
}

/**
 * Strip RTF control codes and extract plain text.
 * This is a robust fallback that works without DOM dependencies.
 */
function stripRtfToText(rtf: string): string {
  // Remove RTF header info
  let text = rtf
  
  // Track brace depth and skip special groups
  let result = ""
  let braceDepth = 0
  let skipGroup = 0
  let i = 0
  
  // Groups to skip entirely (these don't contain visible text)
  const skipGroupNames = [
    "fonttbl", "colortbl", "stylesheet", "info", "header", "footer",
    "headerf", "footerf", "headerl", "footerl", "headerr", "footerr",
    "pict", "object", "shp", "themedata", "colorschememapping",
    "datastore", "latentstyles", "listtable", "listoverridetable",
    "rsidtbl", "generator", "mmathPr", "defchp", "defpap",
    "fldinst", "bkmkstart", "bkmkend"
    // Note: "field" is NOT skipped as it can contain visible content like fldrslt
  ]
  
  // Track if we're in a table cell to handle spacing properly
  let inTableCell = false
  
  while (i < text.length) {
    const char = text[i]
    
    if (char === "{") {
      braceDepth++
      // Check if this is a group to skip
      const nextChars = text.slice(i + 1, i + 50)
      const groupMatch = nextChars.match(/^\\(\*\\)?(\w+)/)
      if (groupMatch) {
        const groupName = groupMatch[2]
        // Skip known non-content groups
        if (skipGroupNames.includes(groupName)) {
          skipGroup = braceDepth
        }
        // Skip \* groups ONLY if they're known metadata groups
        // Don't skip all \* groups as some may contain content
        if (groupMatch[1]) {
          const starGroupName = groupMatch[2]
          const starSkipGroups = [
            "generator", "pn", "xmlnstbl", "themedata", "colorschememapping",
            "latentstyles", "datastore", "mmathPr", "pgptbl", "listpicture",
            "shppict", "nonshppict", "blipuid", "oldcprops", "oldpprops"
          ]
          if (starSkipGroups.includes(starGroupName)) {
            skipGroup = braceDepth
          }
        }
      }
      i++
      continue
    }
    
    if (char === "}") {
      if (braceDepth === skipGroup) {
        skipGroup = 0
      }
      braceDepth--
      i++
      continue
    }
    
    // Skip content in special groups
    if (skipGroup > 0) {
      i++
      continue
    }
    
    if (char === "\\") {
      // Control word or symbol
      const remaining = text.slice(i)
      
      // Special characters
      if (remaining.startsWith("\\\\")) {
        result += "\\"
        i += 2
        continue
      }
      if (remaining.startsWith("\\{")) {
        result += "{"
        i += 2
        continue
      }
      if (remaining.startsWith("\\}")) {
        result += "}"
        i += 2
        continue
      }
      if (remaining.startsWith("\\'")) {
        // Hex character like \'e9
        const hexMatch = remaining.match(/^\\'([0-9a-fA-F]{2})/)
        if (hexMatch) {
          const charCode = parseInt(hexMatch[1], 16)
          result += String.fromCharCode(charCode)
          i += 4
          continue
        }
      }
      
      // Control words
      const ctrlMatch = remaining.match(/^\\([a-z]+)(-?\d+)?[ ]?/)
      if (ctrlMatch) {
        const ctrl = ctrlMatch[1]
        const param = ctrlMatch[2]
        
        // Paragraph/line breaks
        if (ctrl === "par" || ctrl === "line") {
          result += "\n"
        }
        // Tab
        if (ctrl === "tab") {
          result += "\t"
        }
        // Table cell end - add space/tab to separate columns
        if (ctrl === "cell") {
          // Add space before next cell content
          result += "\t"
          inTableCell = false
        }
        // Mark entering a table cell
        if (ctrl === "intbl") {
          inTableCell = true
        }
        // Table row end - add newline
        if (ctrl === "row") {
          result += "\n"
          inTableCell = false
        }
        // Table row definition - can signal start of new row
        if (ctrl === "trowd") {
          // Only add newline if there's content before
          if (result.length > 0 && !result.endsWith("\n")) {
            result += "\n"
          }
        }
        // Nested table cell/row
        if (ctrl === "nestcell") {
          result += "\t"
        }
        if (ctrl === "nestrow") {
          result += "\n"
        }
        // Non-breaking space
        if (ctrl === "~") {
          result += " "
        }
        // Soft line break
        if (ctrl === "softline") {
          result += "\n"
        }
        // Unicode character
        if (ctrl === "u" && param) {
          let code = parseInt(param, 10)
          if (code < 0) code += 65536
          result += String.fromCharCode(code)
          // Skip the replacement character that follows \uN
          const afterCtrl = text.slice(i + ctrlMatch[0].length)
          if (afterCtrl.startsWith("?")) {
            i += ctrlMatch[0].length + 1
            continue
          }
        }
        
        i += ctrlMatch[0].length
        continue
      }
      
      // Unknown control, skip the backslash and continue
      i++
      continue
    }
    
    // Regular character
    if (char === "\r" || char === "\n") {
      // RTF uses these for formatting, not content
      i++
      continue
    }
    
    result += char
    i++
  }
  
  // Clean up the result
  result = result
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Clean up multiple tabs (from empty cells) to single tab
    .replace(/\t{2,}/g, "\t")
    // Clean up tab at start of line
    .replace(/\n\t/g, "\n")
    // Clean up multiple newlines
    .replace(/\n{3,}/g, "\n\n")
    // Remove trailing tabs on lines
    .replace(/\t+\n/g, "\n")
    .trim()
  
  return result
}

/**
 * Extract plain text from an RTF file.
 * Uses direct RTF parsing for reliable text extraction.
 */
export async function extractTextFromRTF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)
  
  // Convert to string (RTF is text-based, typically Windows-1252 or similar)
  let rtfString = ""
  for (let i = 0; i < uint8Array.length; i++) {
    rtfString += String.fromCharCode(uint8Array[i])
  }
  
  // Try rtf.js FIRST in browser context (better table handling)
  if (typeof document !== "undefined") {
    try {
      const { RTFJS, EMFJS, WMFJS } = await import("rtf.js")
      
      RTFJS.loggingEnabled(false)
      EMFJS.loggingEnabled(false)
      WMFJS.loggingEnabled(false)
      
      const buffer = new ArrayBuffer(rtfString.length)
      const bufferView = new Uint8Array(buffer)
      for (let i = 0; i < rtfString.length; i++) {
        bufferView[i] = rtfString.charCodeAt(i)
      }
      
      const doc = new RTFJS.Document(buffer, {})
      const htmlElements = await doc.render()
      
      const container = document.createElement("div")
      container.append(...htmlElements)
      
      // Convert HTML to text while preserving table structure
      const rtfjsText = htmlToText(container)
      console.log("[RTF Parser] rtf.js extracted text preview (first 1000 chars):", rtfjsText.substring(0, 1000))
      console.log("[RTF Parser] rtf.js total length:", rtfjsText.length)
      
      if (rtfjsText && rtfjsText.length > 100) {
        return rtfjsText
      }
    } catch (e) {
      console.warn("[RTF Parser] rtf.js failed, falling back to manual parser:", e)
    }
  }
  
  // Fallback to manual RTF stripper
  const strippedText = stripRtfToText(rtfString)
  
  // Debug: log a preview of extracted text
  console.log("[RTF Parser] Manual stripper text preview (first 1000 chars):", strippedText.substring(0, 1000))
  console.log("[RTF Parser] Manual stripper total length:", strippedText.length)
  
  return strippedText
}

/**
 * Extract HTML from an RTF file.
 * Only works in browser context with rtf.js.
 */
export async function extractHtmlFromRTF(file: File): Promise<string> {
  if (typeof document === "undefined") {
    throw new Error("extractHtmlFromRTF requires browser context")
  }
  
  const arrayBuffer = await file.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)
  
  let rtfString = ""
  for (let i = 0; i < uint8Array.length; i++) {
    rtfString += String.fromCharCode(uint8Array[i])
  }
  
  const { RTFJS, EMFJS, WMFJS } = await import("rtf.js")
  
  RTFJS.loggingEnabled(false)
  EMFJS.loggingEnabled(false)
  WMFJS.loggingEnabled(false)
  
  const buffer = new ArrayBuffer(rtfString.length)
  const bufferView = new Uint8Array(buffer)
  for (let i = 0; i < rtfString.length; i++) {
    bufferView[i] = rtfString.charCodeAt(i)
  }
  
  const doc = new RTFJS.Document(buffer, {})
  const htmlElements = await doc.render()
  
  const container = document.createElement("div")
  container.append(...htmlElements)
  
  return container.innerHTML
}

/**
 * Get metadata from an RTF file.
 */
export async function getMetadataFromRTF(file: File): Promise<Record<string, unknown>> {
  const arrayBuffer = await file.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)
  
  let rtfString = ""
  for (let i = 0; i < uint8Array.length; i++) {
    rtfString += String.fromCharCode(uint8Array[i])
  }
  
  // Try to extract basic metadata from RTF info group
  const metadata: Record<string, unknown> = {}
  
  const infoMatch = rtfString.match(/\{\\info([^}]*(?:\{[^}]*\}[^}]*)*)\}/)
  if (infoMatch) {
    const infoContent = infoMatch[1]
    
    const titleMatch = infoContent.match(/\{\\title\s*([^}]*)\}/)
    if (titleMatch) metadata.title = titleMatch[1].trim()
    
    const authorMatch = infoContent.match(/\{\\author\s*([^}]*)\}/)
    if (authorMatch) metadata.author = authorMatch[1].trim()
    
    const createdMatch = infoContent.match(/\{\\creatim\\yr(\d+)\\mo(\d+)\\dy(\d+)/)
    if (createdMatch) {
      metadata.created = `${createdMatch[1]}-${createdMatch[2].padStart(2, "0")}-${createdMatch[3].padStart(2, "0")}`
    }
  }
  
  return metadata
}
