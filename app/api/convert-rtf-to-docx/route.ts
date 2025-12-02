import { NextRequest, NextResponse } from 'next/server'
import { Document, Packer, Paragraph, TextRun } from 'docx'

/**
 * Convert RTF content to plain text
 * Preserves paragraph boundaries and decodes hex escapes while stripping control words
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
    const isTableRow = /^\d{3}\s+\d{3}-\d{8}/.test(line.trim())
    
    // Check if this line looks like a table header (contains "SER." and "AWB NO")
    const isTableHeader = /SER\./i.test(line) && /AWB\s+NO/i.test(line)
    
    // Check if this line looks like a separator (dashes, underscores, equals)
    const isSeparator = /^[_\-=\s]+$/.test(line.trim())
    
    if (isTableRow || isTableHeader || isSeparator) {
      // For table rows, preserve spacing more carefully
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
 * API route to convert RTF file to DOCX format
 * Accepts RTF file upload, converts to DOCX, and returns DOCX file
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    console.log('[API] Converting RTF to DOCX:', file.name)

    // Read RTF file content
    const rtfContent = await file.text()
    console.log('[API] RTF content length:', rtfContent.length)

    // Try using rtf-stream-parser first, then manual parsing
    let extractedText = ''
    try {
      // Method 1: Try rtf-stream-parser (preferred method)
        try {
          console.log('[API] Attempting to use rtf-stream-parser...')
          const RTFStreamParserModule = await import('rtf-stream-parser')
          
          const RTFStreamParser = RTFStreamParserModule.default || RTFStreamParserModule
          
          let textContent = ''
          let parser: any
          
          // Try different initialization methods
          if (typeof RTFStreamParser === 'function') {
            parser = new RTFStreamParser()
          } else if (RTFStreamParser.default && typeof RTFStreamParser.default === 'function') {
            parser = new RTFStreamParser.default()
          } else {
            throw new Error('Could not initialize rtf-stream-parser')
          }
          
          // Set up event listeners
          if (parser.on) {
            extractedText = await new Promise<string>((resolve, reject) => {
              parser.on('text', (text: string) => {
                textContent += text
              })
              
              parser.on('paragraph', () => {
                textContent += '\n'
              })
              
              parser.on('error', (err: Error) => {
                console.error('[API] rtf-stream-parser error:', err)
                reject(err)
              })
              
              parser.on('end', () => {
                const text = textContent.trim()
                if (text && text.length > 0) {
                  resolve(text)
                } else {
                  reject(new Error('rtf-stream-parser extracted empty text'))
                }
              })
              
              // Parse the RTF content
              if (parser.write) {
                parser.write(rtfContent)
                parser.end()
              } else {
                reject(new Error('rtf-stream-parser API not recognized'))
              }
            })
          } else {
            throw new Error('rtf-stream-parser API not recognized')
          }
          
          console.log('[API] ✅ rtf-stream-parser extracted text length:', extractedText.length)
        } catch (streamParserError) {
          console.warn('[API] ⚠️ rtf-stream-parser failed, using manual parsing:', streamParserError)
          
          // Method 2: Fallback to manual parsing
          extractedText = rtfToPlainText(rtfContent)
          console.log('[API] Manual parsing extracted text length:', extractedText.length)
          
          if (!extractedText || extractedText.trim().length === 0) {
            throw new Error('No text could be extracted from RTF file using any method')
          }
        }
      }
    } catch (error) {
      console.error('[API] All RTF parsing methods failed:', error)
      // Last resort: try manual parsing
      extractedText = rtfToPlainText(rtfContent)
      console.log('[API] Using manual parsing as last resort, length:', extractedText.length)
      
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text could be extracted from RTF file using any method')
      }
    }

    // Split text into paragraphs (preserve line breaks)
    const lines = extractedText.split('\n')
    const paragraphs: Paragraph[] = []

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (trimmedLine) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun(trimmedLine)],
          })
        )
      } else {
        // Empty line - add empty paragraph to preserve spacing
        paragraphs.push(
          new Paragraph({
            children: [new TextRun('')],
          })
        )
      }
    }

    // Create DOCX document
    const doc = new Document({
      sections: [
        {
          children: paragraphs,
        },
      ],
    })

    // Generate DOCX file buffer
    const buffer = await Packer.toBuffer(doc)

    // Return DOCX file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${file.name.replace(/\.rtf$/i, '.docx')}"`,
      },
    })
  } catch (error) {
    console.error('[API] Error converting RTF to DOCX:', error)
    return NextResponse.json(
      { error: 'Failed to convert RTF to DOCX', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

