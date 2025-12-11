import { NextRequest, NextResponse } from "next/server"
import { convertRtfToDocx } from "@/lib/lists/rtf-to-docx"

/**
 * API route: convert uploaded RTF to DOCX via pandoc.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const buffer = await convertRtfToDocx(file)
    const docxFileName = file.name.replace(/\.rtf$/i, ".docx")

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${docxFileName}"`,
      },
    })
  } catch (error: any) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[API] Error converting RTF via pandoc:", message)
    return NextResponse.json(
      { error: "Failed to convert RTF to DOCX", details: message },
      { status: 500 }
    )
  }
}

