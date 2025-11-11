import * as React from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateTimePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function DateTimePicker({
  value,
  onChange,
  disabled = false,
  placeholder = "Pick a date and time",
  className,
}: DateTimePickerProps) {
  // Store the local date and time separately
  const [localDate, setLocalDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined
  );
  const [timeValue, setTimeValue] = React.useState<string>(
    value ? format(value, "HH:mm") : ""
  );

  React.useEffect(() => {
    if (value) {
      setLocalDate(new Date(value));
      setTimeValue(format(value, "HH:mm"));
    } else {
      setLocalDate(undefined);
      setTimeValue("");
    }
  }, [value]);

  // Helper function to create a proper UTC date from local date and time
  const createUTCDate = (date: Date, timeString: string): Date => {
    const [hours, minutes] = timeString.split(":").map(Number);
    
    // Create a new date object with the selected date and time
    const combinedDate = new Date(date);
    combinedDate.setHours(hours || 0);
    combinedDate.setMinutes(minutes || 0);
    combinedDate.setSeconds(0);
    combinedDate.setMilliseconds(0);
    
    // Return the date as-is (it will be automatically converted to UTC when toISOString() is called)
    return combinedDate;
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setLocalDate(date);
      
      if (timeValue) {
        // If we have a time value, create the full UTC date
        const utcDateTime = createUTCDate(date, timeValue);
        
        // Check if the selected date and time is in the past (allow 1 minute buffer)
        const now = new Date();
        const oneMinuteFromNow = new Date(now.getTime() + 60000);
        
        if (utcDateTime <= now) {
          // If it's in the past, set it to 1 minute from now
          setLocalDate(oneMinuteFromNow);
          setTimeValue(format(oneMinuteFromNow, "HH:mm"));
          onChange?.(oneMinuteFromNow);
        } else {
          onChange?.(utcDateTime);
        }
      } else {
        // If no time is set, just update the date
        onChange?.(undefined);
      }
    } else {
      setLocalDate(undefined);
      onChange?.(undefined);
    }
  };

  const handleTimeChange = (time: string) => {
    setTimeValue(time);
    
    if (localDate && time) {
      // Create UTC date from local date and time
      const utcDateTime = createUTCDate(localDate, time);
      
      // Check if the selected date and time is in the past (allow 1 minute buffer)
      const now = new Date();
      const oneMinuteFromNow = new Date(now.getTime() + 60000);
      
      if (utcDateTime <= now) {
        // If it's in the past, set it to 1 minute from now
        setLocalDate(oneMinuteFromNow);
        setTimeValue(format(oneMinuteFromNow, "HH:mm"));
        onChange?.(oneMinuteFromNow);
      } else {
        onChange?.(utcDateTime);
      }
    } else if (time && !localDate) {
      // If time is set but no date is selected, create a date for today
      const today = new Date();
      const utcDateTime = createUTCDate(today, time);
      
      // Check if the time is in the past (allow 1 minute buffer)
      const now = new Date();
      const oneMinuteFromNow = new Date(now.getTime() + 60000);
      
      if (utcDateTime <= now) {
        // If it's in the past, set it to 1 minute from now
        setLocalDate(oneMinuteFromNow);
        setTimeValue(format(oneMinuteFromNow, "HH:mm"));
        onChange?.(oneMinuteFromNow);
      } else {
        setLocalDate(today);
        onChange?.(utcDateTime);
      }
    } else if (!time) {
      // If time is cleared, clear the onChange
      onChange?.(undefined);
    }
  };

  // Display the date in local timezone for user-friendly display
  const displayValue = localDate && timeValue
    ? format(localDate, "PPP 'at' HH:mm")
    : placeholder;

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !localDate && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayValue}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={localDate}
            onSelect={handleDateSelect}
            disabled={(date) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return date < today;
            }}
            initialFocus
            className="p-3"
          />
        </PopoverContent>
      </Popover>
      
      <div className="flex flex-col gap-1 min-w-[120px]">
        <Label htmlFor="time-input" className="text-xs text-muted-foreground">
          Time
        </Label>
        <Input
          id="time-input"
          type="time"
          value={timeValue}
          onChange={(e) => handleTimeChange(e.target.value)}
          disabled={disabled}
          className="h-10"
        />
      </div>
    </div>
  );
} 