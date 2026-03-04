import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BookingDetailedReadModel } from '../../models/models';

export interface RegistrationParticipant {
  userId: number;
  displayName: string;
  email: string;
}

@Injectable({
  providedIn: 'root',
})
export class RegistrationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/bookings';

  /** Register / RSVP the current user for a booking */
  register(bookingId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${bookingId}/register`, {});
  }

  /** Unregister from a confirmed booking (reverts to invited status) */
  unregister(bookingId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${bookingId}/register`);
  }

  /** Decline an invitation (sets status to declined, still visible) */
  declineInvitation(bookingId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${bookingId}/decline`, {});
  }

  /**
   * Get bookings by the current user's registration status.
   * @param statuses   array of statuses to include, e.g. ['registered','invited','declined']
   * @param timeFilter 'upcoming' | 'history' | undefined (all)
   */
  getMyRegistrationBookings(
    statuses: string[],
    timeFilter?: 'upcoming' | 'history',
  ): Observable<BookingDetailedReadModel[]> {
    const params: Record<string, string> = {};
    if (statuses.length > 0) params['statuses'] = statuses.join(',');
    if (timeFilter) params['timeFilter'] = timeFilter;
    return this.http.get<BookingDetailedReadModel[]>(
      `${this.apiUrl}/my-registration-bookings`,
      { params },
    );
  }

  /** Get confirmed participant list for a specific booking */
  getParticipants(bookingId: number): Observable<RegistrationParticipant[]> {
    return this.http.get<RegistrationParticipant[]>(`${this.apiUrl}/${bookingId}/registrations`);
  }

  /** Get invited (pending) user list for a specific booking */
  getInvitedUsers(bookingId: number): Observable<RegistrationParticipant[]> {
    return this.http.get<RegistrationParticipant[]>(`${this.apiUrl}/${bookingId}/invitations`);
  }

  /** Invite users to a booking */
  inviteUsers(bookingId: number, userIds: number[]): Observable<{ invited: number }> {
    return this.http.post<{ invited: number }>(`${this.apiUrl}/${bookingId}/invite`, { userIds });
  }

  /** Remove an invitation (owner only — permanently deletes the row) */
  removeInvitation(bookingId: number, targetUserId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${bookingId}/invitations/${targetUserId}`);
  }
}
