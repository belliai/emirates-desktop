"use client"

import { useState, KeyboardEvent, ClipboardEvent, useRef, useEffect } from "react"
import { X } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type TagInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  validate?: (tag: string) => boolean
  maxVisible?: number
  className?: string
}

export function TagInput({
  value,
  onChange,
  placeholder = "Add code...",
  validate = (tag) => /^[A-Z*]{1,3}$/.test(tag),
  maxVisible = 3,
  className = "",
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Parse comma-separated string into array
  const tags = value
    ? value.split(",").map((t) => t.trim()).filter((t) => t.length > 0)
    : []
  
  const visibleTags = tags.slice(0, maxVisible)
  const hiddenTags = tags.slice(maxVisible)
  const hasMore = hiddenTags.length > 0

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toUpperCase()
    if (!trimmedTag) return
    
    // Check if tag already exists
    if (tags.includes(trimmedTag)) {
      setInputValue("")
      return
    }
    
    // Validate tag
    if (!validate(trimmedTag)) {
      // Show some visual feedback for invalid input
      setInputValue("")
      return
    }
    
    const newTags = [...tags, trimmedTag]
    onChange(newTags.join(","))
    setInputValue("")
  }

  const removeTag = (indexToRemove: number) => {
    const newTags = tags.filter((_, index) => index !== indexToRemove)
    onChange(newTags.join(","))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      e.preventDefault()
      removeTag(tags.length - 1)
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData("text")
    
    // Check if pasted text contains commas
    if (pastedText.includes(",")) {
      e.preventDefault()
      const newTags = pastedText
        .split(",")
        .map((t) => t.trim().toUpperCase())
        .filter((t) => t.length > 0 && validate(t))
        .filter((t) => !tags.includes(t))
      
      if (newTags.length > 0) {
        const allTags = [...tags, ...newTags]
        onChange(allTags.join(","))
        setInputValue("")
      }
    }
  }

  const handleContainerClick = () => {
    inputRef.current?.focus()
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-1 px-2 py-1 text-xs border rounded transition-colors ${
        isFocused
          ? "border-[#D71A21] ring-1 ring-[#D71A21]"
          : "border-transparent hover:border-gray-300"
      } bg-transparent cursor-text ${className}`}
      onClick={handleContainerClick}
    >
      {visibleTags.map((tag, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#D71A21] text-white rounded-full text-xs font-medium"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              removeTag(index)
            }}
            className="hover:bg-[#B71419] rounded-full p-0.5 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      
      {hasMore && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs font-medium cursor-help">
                +{hiddenTags.length} more
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="flex flex-wrap gap-1">
                {hiddenTags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#D71A21] text-white rounded-full text-xs"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeTag(maxVisible + index)
                      }}
                      className="hover:bg-[#B71419] rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value.toUpperCase())}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[60px] outline-none bg-transparent text-xs"
      />
    </div>
  )
}

