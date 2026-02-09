# Walkthrough - Delete All Scheduled Messages

This walkthrough describes the implementation of the "Delete All" scheduled messages feature.

## Changes

### Backend

1.  **Service**: Added `deleteAllScheduledMessages` method to `server/services/schedulerService.js`.
    -   Stops all running cron jobs.
    -   Clears the internal jobs map.
    -   Clears the scheduled messages array.
    -   Saves the empty array to `scheduledMessages.json`.

2.  **Controller**: Added `deleteAllScheduledMessagesController` to `server/controllers/schedulerController.js` to handle the API request.

3.  **Routes**: Added `DELETE /api/schedule` route in `server/routes/schedulerRoutes.js`.

### Frontend

1.  **Component**: Updated `client/src/components/ScheduledMessageManager.js`.
    -   Added `handleDeleteAll` function to call the delete API.
    -   Added a "Hapus Semua" button in the "Daftar Pesan Terjadwal" header.
    -   The button is only visible if there are scheduled messages.
    -   Includes a confirmation dialog before deletion.

## Verification

1.  Navigate to the "Jadwal Pesan" or "Scheduled Messages" page.
2.  Ensure there are scheduled messages in the list.
3.  Click the "Hapus Semua" button.
4.  Confirm the dialog.
5.  Verify that the list is cleared and a success notification is shown.
