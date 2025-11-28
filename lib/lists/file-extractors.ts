/**
 * Extract text content from different file formats
 * Uses mammoth for DOCX, pdfjs-dist for PDF parsing, and rtf-parser for RTF parsing
 */

/**
 * Light-weight RTF to text converter.
 * Preserves paragraph boundaries and decodes hex escapes while stripping control words.
 * IMPORTANT: Preserves spacing for table rows to ensure parser can match shipment patterns.
 */
function rtfToPlainText(rtf: string): string {
  // Normalize common control words to plaintext separators
  let text = rtf
    .replace(/\\par[d]?/gi, "\n")
    .replace(/\\line/gi, "\n")
    .replace(/\\tab/gi, "\t")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")

  // Decode hex escapes like \'e9 -> é
  text = text.replace(/\\'([0-9a-fA-F]{2})/g, (_m, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  )

  // Drop remaining control words (e.g., \b, \fs22, \ansi) but keep surrounding text
  // Skip table-related control words that might produce garbage text
  text = text.replace(/\\[a-zA-Z]+-?\d*(?:\s|)/g, "")

  // Remove braces that only define groups, but be careful with nested structures
  // First pass: remove empty braces
  text = text.replace(/\{[^}]*\}/g, (match) => {
    // If brace contains only control words or whitespace, remove it
    const content = match.slice(1, -1)
    if (!content.trim() || /^\\[a-zA-Z]+\d*\s*$/.test(content)) {
      return ""
    }
    return match
  })
  
  // Second pass: remove remaining braces (but preserve content)
  text = text.replace(/[{}]/g, "")

  // Split into lines for processing
  const lines = text.split("\n")
  const processedLines: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    
    // Check if this line looks like a table row (starts with 3 digits followed by AWB pattern)
    // Pattern: 3 digits, spaces, 3 digits-dash-8 digits (e.g., "001 176-92065120")
    const isTableRow = /^\d{3}\s+\d{3}-\d{8}/.test(line.trim())
    
    // Check if this line looks like a table header (contains "SER." and "AWB NO")
    const isTableHeader = /SER\./i.test(line) && /AWB\s+NO/i.test(line)
    
    // Check if this line looks like a separator (dashes, underscores, equals)
    const isSeparator = /^[_\-=\s]+$/.test(line.trim())
    
    if (isTableRow || isTableHeader || isSeparator) {
      // For table rows, preserve spacing more carefully
      // Normalize tabs to spaces but preserve multiple spaces
      line = line.replace(/\t/g, " ")
      // Only collapse spaces if there are more than 2 consecutive spaces (preserve table alignment)
      line = line.replace(/ {3,}/g, "  ") // Replace 3+ spaces with 2 spaces
      processedLines.push(line.trimEnd())
    } else {
      // For non-table lines, collapse whitespace normally
      line = line.trimEnd()
      line = line.replace(/[ \t]+/g, " ")
      processedLines.push(line)
    }
  }
  
  // Join lines and collapse excessive newlines
  text = processedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim()
  
  // Final cleanup: remove any remaining RTF artifacts
  // Remove lines that are clearly RTF style definitions or binary data
  const finalLines = text.split("\n")
  const cleanedLines = finalLines.filter(line => {
    const trimmed = line.trim()
    // Skip empty lines (but keep single empty lines between sections)
    if (!trimmed) return true // Keep empty lines for structure
    
    // Skip RTF style table definitions
    if (trimmed.match(/^List\s+Table\s+\d+/i)) return false
    
    // Skip binary-looking data (long sequences of 0s, fs, or hex-like patterns)
    if (trimmed.match(/^[0f\s]{50,}$/i)) return false
    if (trimmed.match(/^[0-9a-f]{100,}$/i)) return false
    
    // Skip lines that are just RTF control codes
    if (trimmed.match(/^\\[a-zA-Z]+\d*\s*$/)) return false
    
    return true
  })
  
  // Rejoin, preserving structure but removing excessive empty lines
  text = cleanedLines.join("\n").replace(/\n{4,}/g, "\n\n\n").trim()

  return text
}

/**
 * Extract text from RTF file by converting to DOCX first, then using DOCX extraction
 * This approach is more reliable than direct RTF parsing
 */
async function extractTextFromRTF(file: File): Promise<string> {
  try {
    console.log('[v0] Converting RTF to DOCX via API route...')
    
    // Convert RTF to DOCX using API route
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch('/api/convert-rtf-to-docx', {
      method: 'POST',
      body: formData,
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(`RTF to DOCX conversion failed: ${errorData.error || response.statusText}`)
    }
    
    // Get DOCX file from response
    const docxBlob = await response.blob()
    const docxFile = new File([docxBlob], file.name.replace(/\.rtf$/i, '.docx'), {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    
    console.log('[v0] RTF converted to DOCX, now extracting text using mammoth...')
    
    // Use existing DOCX extraction logic
    return await extractTextFromDOCX(docxFile)
  } catch (error) {
    console.error('[v0] Error converting RTF to DOCX:', error)
    // Fallback to direct RTF text extraction if conversion fails
    console.warn('[v0] Falling back to direct RTF text extraction...')
    try {
      const text = await file.text()
      const strippedText = rtfToPlainText(text)
      console.log('[v0] RTF fallback extraction, length:', strippedText.length)
      return strippedText
    } catch (fallbackError) {
      console.error('[v0] RTF fallback extraction failed:', fallbackError)
      throw new Error('Failed to extract text from RTF file')
    }
  }
}

/**
 * Extract text from DOCX file using mammoth
 */
async function extractTextFromDOCX(file: File): Promise<string> {
  try {
    // Dynamic import mammoth library
    const mammoth = await import('mammoth')
    const arrayBuffer = await file.arrayBuffer()
    
    const result = await mammoth.extractRawText({ arrayBuffer })
    console.log('[v0] DOCX extraction successful, length:', result.value.length)
    return result.value
  } catch (error) {
    console.error('[v0] Error extracting DOCX with mammoth:', error)
    // Fallback: try to read as text
    return await file.text()
  }
}

/**
 * Extract text from PDF file using pdf.js
 */
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Dynamic import pdf.js library
    const pdfjsLib = await import('pdfjs-dist')
    
    // Set worker path
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
    
    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise
    
    let fullText = ''
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
      fullText += pageText + '\n'
    }
    
    console.log('[v0] PDF extraction successful, length:', fullText.length)
    return fullText
  } catch (error) {
    console.error('[v0] Error extracting PDF with pdf.js:', error)
    // Fallback: try to read as text
    return await file.text()
  }
}

/**
 * Extract text from any supported file format
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase()
  
  console.log('[v0] Extracting text from file:', fileName)
  
  // For markdown and text files, read as text
  if (fileName.endsWith('.md') || fileName.endsWith('.txt')) {
    const text = await file.text()
    console.log('[v0] Text file extracted, length:', text.length)
    return text
  }
  
  // For RTF files - parse similar to DOCX
  if (fileName.endsWith('.rtf')) {
    return await extractTextFromRTF(file)
  }
  
  // For DOCX files
  if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
    return await extractTextFromDOCX(file)
  }
  
  // For PDF files
  if (fileName.endsWith('.pdf')) {
    return await extractTextFromPDF(file)
  }
  
  // Fallback to text reading
  const text = await file.text()
  console.log('[v0] Fallback text extraction, length:', text.length)
  return text
}
