# Walkthrough - Recurring Scheduled Messages

This walkthrough describes the implementation of Recurring Scheduled Messages.

## Feature Overview

Users can now choose between "One-Time" and "Recurring (Monthly)" schedules when scheduling messages manually.
- **One-Time**: The message is sent once at the specific date and time, then deleted.
- **Recurring**: The message is sent every month on the same day and time.

## Workflow

1.  **Manual Scheduling**:
    -   In the "Jadwal Pesan" form, check "Ulangi setiap bulan".
    -   This sets `isRecurring: true`.
    -   The server creates a cron job ignoring the month/year `0 0 10 5 * *` (e.g., 5th of every month at 10:00).
2.  **Excel Upload**:
    -   Excel uploads are treated as **One-Time** by default (`isRecurring: false`).
    -   This prevents old bill reminders from being sent in subsequent months.
    -   The server creates a one-time cron job for the specific date.

## Implementation Details

### Backend (`schedulerService.js`)
-   `addScheduledMessage` now accepts `isRecurring`.
-   `scheduleMessage` logic split:
    -   `isRecurring = true`: Uses Cron Pattern (Repeat Monthly).
    -   `isRecurring = false`: Uses Date Object (Run Once). Callback deletes the message ID.
-   `deleteScheduledMessage` is called automatically for one-time jobs after execution.

### Frontend (`ScheduledMessageManager.js`)
-   Added `isRecurring` state and checkbox.
-   Displays "Bulanan" badge for recurring messages in the list.

## Usage Guide for Bills

For "Jadwal Pesan Tiap Bulan Sesuai Tanggal Tagihan":
1.  **Manual**: If the bill amount is constant, use "Ulangi setiap bulan".
2.  **Variable Bills (Excel)**: Upload the Excel file every month. The system will schedule them for the specific dates in that file. They will run once and disappear. Do NOT use recurring for variable bills.
