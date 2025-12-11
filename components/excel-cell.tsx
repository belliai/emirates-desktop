"use client"

import React, { useRef, useState } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"

interface ExcelCellProps {
  value: number | string
  onChange: (value: number) => void
  className?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onFocus?: () => void
  onBlur?: () => void
  placeholder?: string
  disabled?: boolean
  onTab?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onEnter?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onArrow?: (direction: "up" | "down" | "left" | "right", e: React.KeyboardEvent<HTMLInputElement>) => void
  showStepper?: boolean
}

export function ExcelCell({
  value,
  onChange,
  className = "",
  onKeyDown,
  onFocus,
  onBlur,
  placeholder,
  disabled = false,
  onTab,
  onEnter,
  onArrow,
  showStepper = true,
}: ExcelCellProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    // Allow empty string for clearing, or valid numbers
    if (inputValue === "" || /^-?\d*\.?\d*$/.test(inputValue)) {
      const numValue = inputValue === "" ? 0 : parseFloat(inputValue)
      onChange(isNaN(numValue) ? 0 : numValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle Tab key - move to next cell
    if (e.key === "Tab") {
      if (onTab) {
        onTab(e)
      } else {
        // Default behavior: let browser handle Tab navigation
        return
      }
    }

    // Handle Enter key - move to cell below
    if (e.key === "Enter") {
      e.preventDefault()
      if (onEnter) {
        onEnter(e)
      } else {
        // Default: move to next cell in same column (below)
        const currentInput = e.currentTarget
        const currentRow = currentInput.closest("tr")
        if (currentRow) {
          const nextRow = currentRow.nextElementSibling as HTMLTableRowElement | null
          if (nextRow) {
            const cellIndex = Array.from(currentRow.cells).indexOf(currentInput.closest("td") as HTMLTableCellElement)
            const nextCell = nextRow.cells[cellIndex]
            if (nextCell) {
              const nextInput = nextCell.querySelector("input") as HTMLInputElement | null
              if (nextInput) {
                nextInput.focus()
                nextInput.select()
              }
            }
          }
        }
      }
      return
    }

    // Handle Arrow keys
    if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
      // Only navigate if cursor is at start/end of input
      const input = e.currentTarget
      const isAtStart = input.selectionStart === 0
      const isAtEnd = input.selectionStart === input.value.length

      if (
        (e.key === "ArrowLeft" && isAtStart) ||
        (e.key === "ArrowRight" && isAtEnd) ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown"
      ) {
        e.preventDefault()
        if (onArrow) {
          const direction =
            e.key === "ArrowUp"
              ? "up"
              : e.key === "ArrowDown"
              ? "down"
              : e.key === "ArrowLeft"
              ? "left"
              : "right"
          onArrow(direction, e)
        } else {
          // Default arrow key navigation
          const currentInput = e.currentTarget
          const currentCell = currentInput.closest("td") as HTMLTableCellElement | null
          if (currentCell) {
            const currentRow = currentCell.closest("tr") as HTMLTableRowElement | null
            if (currentRow) {
              const cellIndex = Array.from(currentRow.cells).indexOf(currentCell)
              let targetCell: HTMLTableCellElement | null = null

              if (e.key === "ArrowUp" && currentRow.previousElementSibling) {
                const prevRow = currentRow.previousElementSibling as HTMLTableRowElement
                targetCell = prevRow.cells[cellIndex] || null
              } else if (e.key === "ArrowDown" && currentRow.nextElementSibling) {
                const nextRow = currentRow.nextElementSibling as HTMLTableRowElement
                targetCell = nextRow.cells[cellIndex] || null
              } else if (e.key === "ArrowLeft" && currentCell.previousElementSibling) {
                targetCell = currentCell.previousElementSibling as HTMLTableCellElement
              } else if (e.key === "ArrowRight" && currentCell.nextElementSibling) {
                targetCell = currentCell.nextElementSibling as HTMLTableCellElement
              }

              if (targetCell) {
                const targetInput = targetCell.querySelector("input") as HTMLInputElement | null
                if (targetInput) {
                  targetInput.focus()
                  targetInput.select()
                }
              }
            }
          }
        }
        return
      }
    }

    // Handle Escape - cancel editing (revert to original value)
    if (e.key === "Escape") {
      e.currentTarget.value = value.toString()
      e.currentTarget.blur()
      return
    }

    // Select all text when user starts typing (if cursor is at start/end)
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      const input = e.currentTarget
      if (input.selectionStart === input.selectionEnd && (input.selectionStart === 0 || input.selectionStart === input.value.length)) {
        // Select all for quick replacement
        setTimeout(() => {
          input.select()
        }, 0)
      }
    }

    // Call custom onKeyDown handler if provided
    if (onKeyDown) {
      onKeyDown(e)
    }
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Select all text on focus for quick replacement
    e.target.select()
    if (onFocus) {
      onFocus()
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Ensure value is saved as number
    const numValue = parseFloat(e.target.value) || 0
    onChange(numValue)
    if (onBlur) {
      onBlur()
    }
  }

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const currentValue = typeof value === "number" ? value : parseFloat(value.toString()) || 0
    onChange(currentValue + 1)
  }

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const currentValue = typeof value === "number" ? value : parseFloat(value.toString()) || 0
    onChange(Math.max(0, currentValue - 1))
  }

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={value.toString()}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        className={`
          w-full px-2 py-1 pr-6
          border border-gray-300 
          bg-white 
          text-center text-xs
          focus:outline-none 
          focus:border-[#D71A21] 
          focus:ring-1 
          focus:ring-[#D71A21]
          hover:bg-gray-50
          transition-colors
          disabled:bg-gray-100 
          disabled:cursor-not-allowed
          ${className}
        `}
      />
      {showStepper && !disabled && isHovered && (
        <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-gray-300 bg-white">
          <button
            type="button"
            onClick={handleIncrement}
            className="flex-1 px-1 hover:bg-gray-100 border-b border-gray-200 flex items-center justify-center transition-colors"
            title="Increment by 1"
          >
            <ChevronUp className="w-3 h-3 text-gray-600" />
          </button>
          <button
            type="button"
            onClick={handleDecrement}
            className="flex-1 px-1 hover:bg-gray-100 flex items-center justify-center transition-colors"
            title="Decrement by 1"
          >
            <ChevronDown className="w-3 h-3 text-gray-600" />
          </button>
        </div>
      )}
    </div>
  )
}

