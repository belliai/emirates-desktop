import { NextRequest, NextResponse } from 'next/server'
import { Document, Packer, Paragraph, TextRun } from 'docx'

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

    // Read RTF file content
    const rtfContent = await file.text()

    // Parse RTF content using rtf-parser
    const rtfParser = await import('rtf-parser')
    const parsedRTF = await new Promise<any>((resolve, reject) => {
      rtfParser.string(rtfContent, (err: Error | null, doc: any) => {
        if (err) {
          reject(err)
          return
        }
        resolve(doc)
      })
    })

    // Extract text from RTF document structure
    let extractedText = ''
    function extractTextFromContent(content: any[]): void {
      if (!content || !Array.isArray(content)) return
      for (const item of content) {
        if (typeof item === 'string') {
          extractedText += item
        } else if (item.text) {
          extractedText += item.text
        }
        if (item.content) {
          extractTextFromContent(item.content)
        }
      }
    }

    if (parsedRTF?.content) {
      extractTextFromContent(parsedRTF.content)
    }

    // If no text extracted, fallback to manual RTF stripping
    if (!extractedText || extractedText.trim().length === 0) {
      // Simple RTF control code stripping
      extractedText = rtfContent
        .replace(/\\par[d]?/gi, '\n')
        .replace(/\\line/gi, '\n')
        .replace(/\\tab/gi, '\t')
        .replace(/\\[a-zA-Z]+-?\d*(?:\s|)/g, '')
        .replace(/[{}]/g, '')
        .replace(/\\'([0-9a-fA-F]{2})/g, (_m, hex) =>
          String.fromCharCode(parseInt(hex, 16))
        )
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

