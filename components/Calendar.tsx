'use client'

import { useState } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

type ValuePiece = Date | null
type Value = ValuePiece | [ValuePiece, ValuePiece]

interface CalendarProps {
  notesDates: string[] // Array of dates that have notes (YYYY-MM-DD format)
}

export default function CalendarView({ notesDates }: CalendarProps) {
  const [value, setValue] = useState<Value>(new Date())
  const router = useRouter()

  const handleDateChange = (newValue: Value) => {
    if (newValue instanceof Date) {
      setValue(newValue)
      const dateStr = format(newValue, 'yyyy-MM-dd')
      router.push(`/notes/${dateStr}`)
    }
  }

  const tileClassName = ({ date }: { date: Date }) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    if (notesDates.includes(dateStr)) {
      return 'has-note'
    }
    return null
  }

  return (
    <div className="w-full">
      <Calendar
        onChange={handleDateChange}
        value={value}
        tileClassName={tileClassName}
        className="w-full border-0 bg-white"
      />
    </div>
  )
}

