import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { getCurrentTimezone, formatDateInTimezone } from '@/lib/utils';

const TimezoneTest = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [testResults, setTestResults] = useState<string[]>([]);

  const runTimezoneTest = () => {
    if (!selectedDate) {
      setTestResults(['Please select a date and time first']);
      return;
    }

    const results: string[] = [];
    
    results.push(`=== Timezone Test Results ===`);
    results.push(`Current timezone: ${getCurrentTimezone()}`);
    results.push(`Selected date (raw): ${selectedDate.toString()}`);
    results.push(`ISO string: ${selectedDate.toISOString()}`);
    results.push(`Local formatted: ${formatDateInTimezone(selectedDate)}`);
    results.push(`UTC formatted: ${formatDateInTimezone(selectedDate, 'UTC')}`);
    
    // Test scheduling scenarios
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    results.push(`\n=== Scheduling Scenarios ===`);
    results.push(`Current time: ${now.toISOString()}`);
    results.push(`One hour from now: ${oneHourFromNow.toISOString()}`);
    results.push(`One hour ago: ${oneHourAgo.toISOString()}`);
    results.push(`Selected time is in past: ${selectedDate < now}`);
    results.push(`Selected time is in future: ${selectedDate > now}`);
    
    // Test timezone offset
    const offset = selectedDate.getTimezoneOffset();
    results.push(`\n=== Timezone Offset ===`);
    results.push(`Timezone offset: ${offset} minutes`);
    results.push(`Offset in hours: ${offset / 60} hours`);
    
    setTestResults(results);
    
    // Also log to console for debugging
    console.log('=== Timezone Test ===');
    console.log('Selected date:', selectedDate);
    console.log('ISO string:', selectedDate.toISOString());
    console.log('Timezone offset:', offset);
  };

  const clearResults = () => {
    setTestResults([]);
    setSelectedDate(undefined);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Timezone Debug Tool</CardTitle>
          <CardDescription>
            Test timezone handling for scheduled campaigns. Select a date and time to see how it's processed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Select Date & Time:</label>
            <DateTimePicker
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="Pick a date and time"
            />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={runTimezoneTest} disabled={!selectedDate}>
              Run Timezone Test
            </Button>
            <Button variant="outline" onClick={clearResults}>
              Clear Results
            </Button>
          </div>
          
          {testResults.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Test Results:</h3>
              <div className="bg-gray-100 p-4 rounded-md">
                <pre className="text-xs whitespace-pre-wrap">
                  {testResults.join('\n')}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TimezoneTest; 