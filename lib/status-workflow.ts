export interface StatusWorkflowRule {
  status: 1 | 2 | 3 | 4 | 5
  label: string
  requiredPreviousStatuses: Array<1 | 2 | 3 | 4 | 5>
}

// Define the chronological workflow rules for ULD statuses
export const STATUS_WORKFLOW_RULES: StatusWorkflowRule[] = [
  {
    status: 1,
    label: "1) on aircraft",
    requiredPreviousStatuses: [],
  },
  {
    status: 2,
    label: "2) received by GHA (AACS)",
    requiredPreviousStatuses: [1],
  },
  {
    status: 3,
    label: "3) tunnel inducted (Skychain)",
    requiredPreviousStatuses: [1, 2],
  },
  {
    status: 4,
    label: "4) store the ULD (MHS)",
    requiredPreviousStatuses: [1, 2, 3],
  },
  {
    status: 5,
    label: "5) breakdown completed",
    requiredPreviousStatuses: [1, 2, 3, 4],
  },
]

export interface StatusValidationResult {
  isValid: boolean
  missingStatuses: Array<1 | 2 | 3 | 4 | 5>
  message?: string
}

/**
 * Validates if a ULD can transition to a new status based on its status history
 * Enforces chronological order: status 3 requires 1 and 2 to be completed first
 */
export function validateStatusTransition(
  currentStatusHistory: Array<{ status: 1 | 2 | 3 | 4 | 5 }>,
  targetStatus: 1 | 2 | 3 | 4 | 5,
): StatusValidationResult {
  const rule = STATUS_WORKFLOW_RULES.find((r) => r.status === targetStatus)

  if (!rule) {
    return {
      isValid: false,
      missingStatuses: [],
      message: "Invalid target status",
    }
  }

  // Get all statuses that have been completed
  const completedStatuses = new Set(currentStatusHistory.map((entry) => entry.status))

  // Check if all required previous statuses are completed
  const missingStatuses = rule.requiredPreviousStatuses.filter(
    (requiredStatus) => !completedStatuses.has(requiredStatus),
  )

  if (missingStatuses.length > 0) {
    return {
      isValid: false,
      missingStatuses,
      message: `Cannot set status to ${rule.label}. Missing required statuses: ${missingStatuses.map((s) => STATUS_WORKFLOW_RULES.find((r) => r.status === s)?.label).join(", ")}`,
    }
  }

  return {
    isValid: true,
    missingStatuses: [],
  }
}

/**
 * Gets the missing statuses needed to reach a target status
 * Returns them in chronological order
 */
export function getMissingStatuses(
  currentStatusHistory: Array<{ status: 1 | 2 | 3 | 4 | 5 }>,
  targetStatus: 1 | 2 | 3 | 4 | 5,
): Array<1 | 2 | 3 | 4 | 5> {
  const validation = validateStatusTransition(currentStatusHistory, targetStatus)
  return validation.missingStatuses.sort((a, b) => a - b)
}

/**
 * Gets the next allowed statuses based on current status history
 */
export function getNextAllowedStatuses(
  currentStatusHistory: Array<{ status: 1 | 2 | 3 | 4 | 5 }>,
): Array<1 | 2 | 3 | 4 | 5> {
  const completedStatuses = new Set(currentStatusHistory.map((entry) => entry.status))
  const maxCompletedStatus = Math.max(...Array.from(completedStatuses), 0)

  // Can only move to the next sequential status
  const nextStatus = (maxCompletedStatus + 1) as 1 | 2 | 3 | 4 | 5
  if (nextStatus <= 5) {
    return [nextStatus]
  }

  return []
}
