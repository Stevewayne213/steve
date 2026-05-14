# Security Specification: EV-Grama Charge

## Data Invariants
- A charging point must have a valid owner (UID).
- A booking must link to an existing charging point.
- Owners can only manage their own charging points.
- Users can only read/manage their own bookings.
- Only the point owner can toggle the `isBusy` status (or via system logic during booking).

## The Dirty Dozen Payloads (Rejection Tests)
1.  **Identity Spoofing**: Attempt to create a charging point with someone else's `ownerId`.
2.  **State Hijacking**: A non-owner trying to set `isBusy` on a charging point.
3.  **Price Manipulation**: A user trying to update the `pricePerHour` on another person's point.
4.  **Orphaned Booking**: Creating a booking for a `pointId` that doesn't exist.
5.  **Ghost Field Injection**: Adding `isAdmin: true` to a charging point document.
6.  **Size Poisoning**: Document ID longer than 128 chars.
7.  **Resource Exhaustion**: Sending a 1MB string in the `name` field.
8.  **Unauthorized List**: Attempting to list all bookings in the system without a user filter.
9.  **Timestamp Fraud**: Providing a fake `createdAt` time instead of `request.time`.
10. **Role Escalation**: Attempting to modify a booking `status` from 'completed' back to 'pending'.
11. **Cross-User Leak**: Authenticated User A trying to `get` Booking B (owned by User B).
12. **Type Poisoning**: Sending `pricePerHour` as a string instead of a number.
