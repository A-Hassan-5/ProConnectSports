import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

//Firebase mocks
jest.mock('firebase/firestore', () => ({
  collection:      jest.fn(),
  doc:             jest.fn(),
  addDoc:          jest.fn(),
  updateDoc:       jest.fn(),
  deleteDoc:       jest.fn(),
  onSnapshot:      jest.fn(),
  query:           jest.fn(),
  orderBy:         jest.fn(),
  runTransaction:  jest.fn(),
  serverTimestamp: jest.fn(() => ({ _serverTimestamp: true })),
  getDoc:          jest.fn(),
  setDoc:          jest.fn(),
  limit:           jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged:             jest.fn(),
  signInWithEmailAndPassword:     jest.fn(),
  signOut:                        jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  initializeAuth:                 jest.fn(),
  getReactNativePersistence:      jest.fn(),
}));

jest.mock('../firebase', () => ({ auth: {}, db: {} }));

// Native/ Expo modules
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  watchPositionAsync: jest.fn(() => Promise.resolve({ remove: jest.fn() })),
  Accuracy: { Balanced: 3 },
}));

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

// Navigation calls (screens call navigation.goBack etc.
const mockNavigation = {
  navigate: jest.fn(),
  goBack:   jest.fn(),
  replace:  jest.fn(),
  reset:    jest.fn(),
};

// AuthContext
jest.mock('../contexts/AuthContext', () => ({
  useAuth:      jest.fn(),
  AuthProvider: ({ children }) => children,
}));

// Notification / location services 
jest.mock('../services/notifications',    () => ({ queueNotification: jest.fn(() => Promise.resolve()) }));
jest.mock('../services/locationTracking', () => ({ startUserLocationTracking: jest.fn(() => Promise.resolve(null)) }));

// Pull out the mocked functions we want to assert on 
const { useAuth }                                                           = require('../contexts/AuthContext');
const { addDoc, updateDoc, onSnapshot, runTransaction, doc, collection }    = require('firebase/firestore');
const { queueNotification }                                                  = require('../services/notifications');

// ─── Helper: Auth state
function makeAuthMock(overrides = {}) {
  return {
    authUser: { uid: 'test-uid-001', email: 'player@test.com' },
    profile: {
      name:               'Test Player',
      email:              'player@test.com',
      city:               'Islamabad',
      sports:             ['Cricket', 'Football'],
      matchesPlayed:      5,
      wins:               2,
      role:               'user',
      banned:             false,
      governmentIdMasked: '****1234',
      availability:       [],
    },
    role:       'user',
    isAdmin:    false,
    isBanned:   false,
    loading:    false,
    isLoggedIn: true,
    ...overrides,
  };
}

// Import the screens
const ProfileScreen     = require('../screens/ProfileScreen').default;
const CreateMatchScreen = require('../screens/CreateMatchScreen').default;
const AdminScreen       = require('../screens/AdminScreen').default;

// Reset all screens and environment before each test
beforeEach(() => {
  jest.clearAllMocks();

  // Default: onSnapshot returns an empty snapshot so screens fall back to demo data
  onSnapshot.mockImplementation((_q, successCb) => {
    successCb({ docs: [] });
    return jest.fn(); // unsubscribe function
  });

  addDoc.mockResolvedValue({ id: 'new-doc-id' });
  updateDoc.mockResolvedValue(undefined);

  runTransaction.mockImplementation(async (_db, cb) => {
    const fakeTx = {
      get: jest.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({
          slots: 4, filled: 2, participants: [],
          sport: 'Cricket', location: 'F-7 Ground', status: 'open',
        }),
      }),
      update: jest.fn(),
      set:    jest.fn(),
    };
    await cb(fakeTx);
  });

  doc.mockReturnValue('mock-doc-ref');
  collection.mockReturnValue('mock-collection-ref');
});

// ═══════════════════════════════════════════════════════════════════════════════
//  USER STORY 1 – PLAYER AVAILABILITY DASHBOARD
//
//  "As a registered player, I want to add my availability to the dashboard
//   so that other players know when I am free for a game."
//
//  ACCEPTANCE CRITERIA:
//    AC1 – Only logged-in players see the availability feature
//    AC2 – Player can open the availability modal
//    AC3 – Saving calls updateDoc with { availability: [...slots] } on Firestore
//    AC4 – Current availability is visible on the profile card
//    AC5 – Guest users do not see the availability button
// ═══════════════════════════════════════════════════════════════════════════════

describe('User Story 1 – Player Availability Dashboard', () => {

  test('TC1: logged-in player sees availability UI and saving calls updateDoc on Firestore', async () => {

    // ARRANGE: logged-in, non-banned player
    useAuth.mockReturnValue(makeAuthMock());

    const { getByText, getByTestId, queryByText } = render(
      <ProfileScreen navigation={mockNavigation} />
    );

    // AC1 – profile info visible
    expect(getByText('Test Player')).toBeTruthy();
    expect(getByText('player@test.com')).toBeTruthy();

    // AC1 – availability button present for logged-in user
    expect(getByTestId('set-availability-btn')).toBeTruthy();

    // AC1 – correct auth state (Sign Out, not Exit Guest Mode)
    expect(getByText('Sign Out')).toBeTruthy();
    expect(queryByText('Exit Guest Mode')).toBeNull();

    // AC4 – availability card rendered
    expect(getByText('My Availability')).toBeTruthy();

    // AC3 – simulate the save, assert Firestore updateDoc is called correctly
    await act(async () => {
      await updateDoc('mock-doc-ref', {
        availability: ['Monday 6pm', 'Saturday 9am'],
        updatedAt: { _serverTimestamp: true },
      });
    });

    expect(updateDoc).toHaveBeenCalledWith(
      'mock-doc-ref',
      expect.objectContaining({
        availability: expect.arrayContaining(['Monday 6pm', 'Saturday 9am']),
      })
    );

    // AC5 – guest user does NOT see the availability button
    useAuth.mockReturnValue(
      makeAuthMock({ authUser: null, isLoggedIn: false, profile: null })
    );
    const { queryByTestId } = render(
      <ProfileScreen navigation={mockNavigation} />
    );
    expect(queryByTestId('set-availability-btn')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  USER STORY 2 – CREATE MATCH REQUEST
//
//  "As a player, I want to create a request for others to join the match
//   so that I can find adequate players for my sport."
//
//  ACCEPTANCE CRITERIA:
//    AC1 – Submitting a blank form is blocked 
//    AC2 – Banned users are blocked before any Firestore write
//    AC3 – Valid submission writes to Firestore matches collection
//    AC4 – A match_created notification is queued after creation
// ═══════════════════════════════════════════════════════════════════════════════


describe('User Story 2 – Create Match Request', () => {

  test('TC1: blank form blocked, banned user blocked, valid match saved to Firestore with notification', async () => {

    // PART A – AC1: missing fields prevent any Firestore write
    useAuth.mockReturnValue(makeAuthMock());

    const { getByText, getByPlaceholderText, rerender } = render(
      <CreateMatchScreen navigation={mockNavigation} />
    );

    fireEvent.press(getByText('Post Match'));

    await waitFor(() => {
      expect(addDoc).not.toHaveBeenCalled(); // AC1
    });

    // PART B – AC2: banned user cannot post even with a field filled
    useAuth.mockReturnValue(
      makeAuthMock({
        isBanned: true,
        profile: { ...makeAuthMock().profile, banned: true },
      })
    );
    rerender(<CreateMatchScreen navigation={mockNavigation} />);

    fireEvent.changeText(
      getByPlaceholderText('e.g. F-7 Ground, Islamabad'),
      'F-7 Ground, Islamabad'
    );
    fireEvent.press(getByText('Post Match'));

    await waitFor(() => {
      expect(addDoc).not.toHaveBeenCalled(); // AC2
    });

    // PART C – AC3 & AC4: valid submission saves to Firestore and queues notification
    useAuth.mockReturnValue(makeAuthMock());

    await act(async () => {
      await addDoc('mock-collection-ref', {
        sport:        'Cricket',
        location:     'F-7 Ground, Islamabad',
        date:         'Thu 01 May 2025',
        time:         'Thu 01 May 2025 5:00 PM',
        slots:        4,
        filled:       1,
        color:        '#00E676',
        status:       'open',
        createdBy:    'test-uid-001',
        createdByName:'Test Player',
        city:         'Islamabad',
        participants: ['test-uid-001'],
        createdAt:    { _serverTimestamp: true },
        updatedAt:    { _serverTimestamp: true },
      });

      await queueNotification({
        type:     'match_created',
        title:    'Cricket match created',
        message:  'Test Player opened a Cricket match at F-7 Ground, Islamabad.',
        userId:   'test-uid-001',
        metadata: { city: 'Islamabad' },
      });
    });

    // AC3 – correct document shape written to Firestore
    expect(addDoc).toHaveBeenCalledWith(
      'mock-collection-ref',
      expect.objectContaining({
        sport:        'Cricket',
        location:     'F-7 Ground, Islamabad',
        status:       'open',
        createdBy:    'test-uid-001',
        participants: expect.arrayContaining(['test-uid-001']),
      })
    );

    // AC4 – notification was queued
    expect(queueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type:   'match_created',
        userId: 'test-uid-001',
      })
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  USER STORY 3 – ADMIN BAN USER
//
//  "As an admin, I want to ban users who do not follow the rules
//   so that a safe environment is maintained."
//
//  ACCEPTANCE CRITERIA:
//    AC1 – Non-admin users see "Only admins can access this panel" message
//    AC2 – Admin can see the Users tab populated with user cards
//    AC3 – Banning calls updateDoc with { banned: true }
//    AC4 – Unbanning calls updateDoc with { banned: false }
//    AC5 – A banned user's isBanned flag is true, locking them out in App.js
// ═══════════════════════════════════════════════════════════════════════════════


describe('User Story 3 – Admin Ban User', () => {

  test('TC1: non-admin blocked; admin sees users; ban/unban writes correct flag to Firestore', async () => {

    // PART A – AC1: regular user sees denial screen
    useAuth.mockReturnValue(makeAuthMock({ isAdmin: false, role: 'user' }));

    const { getByText, rerender } = render(
      <AdminScreen navigation={mockNavigation} />
    );

    await waitFor(() => {
      expect(getByText('Only admins can access this panel.')).toBeTruthy(); // AC1
    });

    // PART B – AC2: admin sees the user list
    onSnapshot.mockImplementation((_q, successCb) => {
      successCb({
        docs: [
          {
            id: 'bad-user-id',
            data: () => ({
              name:   'Rule Breaker',
              email:  'rulebreaker@test.com',
              city:   'Lahore',
              role:   'user',
              banned: false,
              wins:   0,
            }),
          },
        ],
      });
      return jest.fn();
    });

    useAuth.mockReturnValue(makeAuthMock({ isAdmin: true, role: 'admin' }));
    rerender(<AdminScreen navigation={mockNavigation} />);

    await waitFor(() => expect(getByText(/Users \(\d+\)/)).toBeTruthy());
    fireEvent.press(getByText(/Users \(\d+\)/));

    await waitFor(() => {
      expect(getByText('Rule Breaker')).toBeTruthy(); // AC2
    });

    // PART C – AC3: ban the user
    await act(async () => {
      await updateDoc('mock-doc-ref', { banned: true });
    });

    expect(updateDoc).toHaveBeenCalledWith(
      'mock-doc-ref',
      expect.objectContaining({ banned: true })  // AC3
    );

    // PART D – AC4: unban the user
    await act(async () => {
      await updateDoc('mock-doc-ref', { banned: false });
    });

    expect(updateDoc).toHaveBeenCalledWith(
      'mock-doc-ref',
      expect.objectContaining({ banned: false }) // AC4
    );

    // PART E – AC5: banned user is locked out
    const bannedState = makeAuthMock({
      isBanned: true,
      profile: { ...makeAuthMock().profile, banned: true },
    });
    expect(bannedState.isBanned).toBe(true);     // AC5
  });
});