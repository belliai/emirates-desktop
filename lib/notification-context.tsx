"use client"

import { createContext, useContext, useState, ReactNode, useCallback } from "react"

export type NotificationType = "load_plan_updated" | "load_plan_assigned"

export type Notification = {
  id: string
  type: NotificationType
  flight: string
  staffNo?: number | string // Staff number this notification is for (undefined = all supervisors)
  title: string
  message: string
  timestamp: Date
  read: boolean
}

type NotificationContextType = {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void
  markAsRead: (notificationId: string) => void
  markAllAsRead: (staffNo?: number | string) => void
  getNotificationsForStaff: (staffNo: number | string) => Notification[]
  getUnreadCount: (staffNo: number | string) => number
  clearNotifications: (staffNo?: number | string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

let notificationIdCounter = 0

function generateNotificationId(): string {
  notificationIdCounter++
  return `notif-${Date.now()}-${notificationIdCounter}`
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: generateNotificationId(),
      timestamp: new Date(),
      read: false,
    }
    
    setNotifications((prev) => [newNotification, ...prev])
  }, [])

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === notificationId ? { ...notif, read: true } : notif))
    )
  }, [])

  const markAllAsRead = useCallback((staffNo?: number | string) => {
    setNotifications((prev) =>
      prev.map((notif) => {
        if (staffNo !== undefined) {
          // Mark as read for specific staff
          if (notif.staffNo?.toString() === staffNo.toString()) {
            return { ...notif, read: true }
          }
          // Also mark supervisor notifications (load_plan_updated with undefined staffNo) as read for this staff
          if (notif.staffNo === undefined && notif.type === "load_plan_updated") {
            return { ...notif, read: true }
          }
          return notif
        }
        // Mark all as read
        return { ...notif, read: true }
      })
    )
  }, [])

  const getNotificationsForStaff = useCallback((staffNo: number | string): Notification[] => {
    return notifications.filter((notif) => {
      // Staff-specific notifications
      if (notif.staffNo?.toString() === staffNo.toString()) {
        return true
      }
      // Supervisor notifications (load_plan_updated) - check if staff is a supervisor
      // For now, we'll show all load_plan_updated notifications to any staff member
      // In a real implementation, we'd check job_code here
      if (notif.staffNo === undefined && notif.type === "load_plan_updated") {
        return true
      }
      return false
    })
  }, [notifications])

  const getUnreadCount = useCallback((staffNo: number | string): number => {
    return getNotificationsForStaff(staffNo).filter((notif) => !notif.read).length
  }, [getNotificationsForStaff])

  const clearNotifications = useCallback((staffNo?: number | string) => {
    if (staffNo !== undefined) {
      setNotifications((prev) => prev.filter((notif) => notif.staffNo?.toString() !== staffNo.toString()))
    } else {
      setNotifications([])
    }
  }, [])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        getNotificationsForStaff,
        getUnreadCount,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}

