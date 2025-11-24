"use client"

import { useState } from "react"

interface EditableFieldProps {
  value: string
  onChange: (value: string) => void
  className?: string
  multiline?: boolean
  readOnly?: boolean
}

export function EditableField({ value, onChange, className = "", multiline = false, readOnly = false }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)

  const handleBlur = () => {
    onChange(editValue)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      handleBlur()
    }
    if (e.key === "Escape") {
      setEditValue(value)
      setIsEditing(false)
    }
  }

  if (readOnly) {
    return (
      <span className={`px-1 py-0.5 ${className}`}>
        {value || ""}
      </span>
    )
  }

  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`w-full px-2 py-1 border border-[#D71A21] rounded focus:outline-none focus:ring-1 focus:ring-[#D71A21] ${className}`}
          autoFocus
          rows={2}
        />
      )
    }
    return (
      <input
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`px-2 py-1 border border-[#D71A21] rounded focus:outline-none focus:ring-1 focus:ring-[#D71A21] min-w-[60px] ${className}`}
        autoFocus
      />
    )
  }

  return (
    <span
      onClick={() => {
        setEditValue(value)
        setIsEditing(true)
      }}
      className={`cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded transition-colors ${className}`}
      title="Click to edit"
    >
      {value || ""}
    </span>
  )
}

