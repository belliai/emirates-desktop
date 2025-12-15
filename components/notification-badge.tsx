"use client"

import { useState, useEffect } from "react"
import { Bell, X } from "lucide-react"
import { useNotifications } from "@/lib/notification-context"
import { Button } from "@/components/ui/button"

interface NotificationBadgeProps {
  staffNo: number | string
  className?: string
}

export function NotificationBadge({ staffNo, className }: NotificationBadgeProps) {
  const { getUnreadCount, getNotificationsForStaff, markAsRead, markAllAsRead } = useNotifications()
  const [showNotifications, setShowNotifications] = useState(false)
  const unreadCount = getUnreadCount(staffNo)
  const notifications = getNotificationsForStaff(staffNo)

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    
    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    // Display in Dubai/GST timezone (UTC+4)
    return date.toLocaleDateString('en-US', { timeZone: 'Asia/Dubai' })
  }

  return (
    <div className={`relative ${className || ""}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#D71A21] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {showNotifications && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowNotifications(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead(staffNo)}
                    className="text-xs text-[#D71A21] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No notifications
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer ${
                        !notif.read ? "bg-blue-50" : ""
                      }`}
                      onClick={() => {
                        if (!notif.read) {
                          markAsRead(notif.id)
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm text-gray-900">
                              {notif.title}
                            </h4>
                            {!notif.read && (
                              <span className="w-2 h-2 bg-[#D71A21] rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            {notif.message}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatTime(notif.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}












