import { TestBed } from '@angular/core/testing';
import { SessionService, UserState } from './session.service';
import { UserPermissions } from '../models/models';

describe('SessionService', () => {
  let service: SessionService;
  const STORAGE_KEY = 'auth_user';

  // Helper to create a dummy user
  const createMockUser = (permissions: Partial<UserPermissions> = {}): UserState => ({
    id: 1,
    email: 'test@example.com',
    displayName: 'Test User',
    isBanned: false,
    token: 'fake-token',
    permissions: {
      userId: 1,
      permissionTemplateId: null,
      bookRoom: false,
      myBookings: false,
      manageUsers: false,
      manageClasses: false,
      manageRooms: false,
      manageAssets: false,
      manageBookings: false,
      manageCampuses: false,
      manageRoles: false,
      ...permissions
    }
  });

  beforeEach(() => {
    // Clear localStorage before each test to ensure a clean slate
    localStorage.removeItem(STORAGE_KEY);
    TestBed.configureTestingModule({});
    service = TestBed.inject(SessionService);
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('should be created and initialized empty', () => {
    expect(service).toBeTruthy();
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should save user to state and localStorage when setUser is called', () => {
    const user = createMockUser();

    service.setUser(user);

    // Verify Signal state
    expect(service.currentUser()).toEqual(user);
    expect(service.isAuthenticated()).toBe(true);

    // Verify LocalStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toEqual(user);
  });

  it('should restore user from localStorage on initialization', () => {
    const user = createMockUser();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

    // Re-inject the service so the constructor runs again
    const restoredService = new SessionService();

    expect(restoredService.currentUser()).toEqual(user);
    expect(restoredService.isAuthenticated()).toBe(true);
  });

  it('should clear session correctly', () => {
    service.setUser(createMockUser());
    expect(service.isAuthenticated()).toBe(true);

    service.clearSession();

    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('should gracefully handle invalid JSON in localStorage', () => {
    // Setup broken JSON
    localStorage.setItem(STORAGE_KEY, '{ broken-json');
    // Vitest uses vi.spyOn, Jasmine uses spyOn. 
    // We can just try/catch if spy is missing, but console warning will just print, which is fine for now.
    const originalWarn = console.warn;
    let warned = false;
    console.warn = () => { warned = true; };

    const freshService = new SessionService();

    expect(warned).toBe(true);
    console.warn = originalWarn; // Restore

    expect(freshService.currentUser()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull(); // Should clear it
  });

  describe('hasPermission', () => {
    it('should return false when user is not logged in', () => {
      expect(service.hasPermission('bookRoom')).toBe(false);
    });

    it('should return false when user lacks the specific permission', () => {
      const user = createMockUser({ bookRoom: false, manageUsers: false });
      service.setUser(user);

      expect(service.hasPermission('bookRoom')).toBe(false);
      expect(service.hasPermission('manageUsers')).toBe(false);
    });

    it('should return true when user has the specific permission', () => {
      const user = createMockUser({ bookRoom: true, manageRoles: true });
      service.setUser(user);

      expect(service.hasPermission('bookRoom')).toBe(true);
      expect(service.hasPermission('manageRoles')).toBe(true);
    });
  });
});
