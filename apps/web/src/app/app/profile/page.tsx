'use client';

import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import type { HandPreference, Player } from '@bowling-machine/api-contracts';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuthenticatedServices } from '@/hooks/use-authenticated-services';
import { ApiClientError } from '@/lib/api/errors';
import { createClient } from '@/lib/supabase/client';

const HAND_OPTIONS: HandPreference[] = ['RIGHT', 'LEFT', 'AMBIDEXTROUS', 'UNSPECIFIED'];
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

type AvailabilityState = 'idle' | 'checking' | 'available' | 'taken';

function validateUsername(username: string): string | null {
  const trimmedUsername = username.trim();

  if (trimmedUsername.length < 3 || trimmedUsername.length > 32) {
    return 'Username must be 3 to 32 characters long';
  }

  if (!USERNAME_PATTERN.test(trimmedUsername)) {
    return 'Username may only contain letters, numbers, underscore, or hyphen';
  }

  return null;
}

/** Player profile page — view and update supported profile fields via backend API. */
export default function AppProfilePage() {
  const { api } = useAuthenticatedServices();
  const searchParams = useSearchParams();
  const usernameSectionRef = useRef<HTMLElement | null>(null);
  const [profile, setProfile] = useState<Player | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [battingHand, setBattingHand] = useState<HandPreference>('UNSPECIFIED');
  const [bowlingHand, setBowlingHand] = useState<HandPreference>('UNSPECIFIED');
  const [usernameDraft, setUsernameDraft] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null);
  const [usernameAvailability, setUsernameAvailability] = useState<AvailabilityState>('idle');
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState('');
  const [confirmPasswordDraft, setConfirmPasswordDraft] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [highlightUsernameSection, setHighlightUsernameSection] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await api.getProfile();
        setProfile(data);
        setDisplayName(data.display_name);
        setBattingHand(data.batting_hand);
        setBowlingHand(data.bowling_hand);
        setUsernameDraft(data.username ?? '');
        setEditingUsername(!data.username);
      } catch (err) {
        setError(err instanceof ApiClientError ? err.displayMessage : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [api]);

  useEffect(() => {
    if (searchParams.get('prompt') !== 'username') {
      return;
    }

    /**
     * OAuth users without a claimed username land here. We both scroll and add
     * a visible highlight so the required next step is obvious.
     */
    setHighlightUsernameSection(true);
    usernameSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [searchParams]);

  async function handleSave(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await api.updateProfile({
        display_name: displayName,
        batting_hand: battingHand,
        bowling_hand: bowlingHand,
      });
      setProfile(updated);
      setMessage('Profile updated');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.displayMessage : 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleUsernameBlur() {
    if (!profile) {
      return;
    }

    const trimmedUsername = usernameDraft.trim();
    const validationMessage = validateUsername(trimmedUsername);
    setUsernameError(validationMessage);
    setUsernameMessage(null);

    if (validationMessage) {
      setUsernameAvailability('taken');
      return;
    }

    if (profile.username && trimmedUsername.toLowerCase() === profile.username.toLowerCase()) {
      setUsernameAvailability('available');
      setUsernameMessage('This is your current username.');
      return;
    }

    try {
      setUsernameAvailability('checking');
      const result = await api.checkUsernameAvailability(trimmedUsername);
      setUsernameAvailability(result.available ? 'available' : 'taken');
      setUsernameMessage(
        result.available ? 'Username is available.' : 'That username is already taken.',
      );
    } catch {
      setUsernameAvailability('idle');
      setUsernameMessage('Could not verify username availability right now.');
    }
  }

  async function handleUsernameSave(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) {
      return;
    }

    const trimmedUsername = usernameDraft.trim();
    const validationMessage = validateUsername(trimmedUsername);
    setUsernameError(validationMessage);
    setUsernameMessage(null);

    if (validationMessage) {
      return;
    }

    setUsernameSaving(true);
    setError(null);

    try {
      const updated = await api.updateProfile({ username: trimmedUsername });
      setProfile(updated);
      setUsernameDraft(updated.username ?? trimmedUsername);
      setUsernameAvailability('available');
      setUsernameMessage('Username saved.');
      setEditingUsername(false);
      setHighlightUsernameSection(false);
    } catch (err) {
      setUsernameMessage(null);
      setUsernameError(
        err instanceof ApiClientError ? err.displayMessage : 'Username update failed',
      );
    } finally {
      setUsernameSaving(false);
    }
  }

  async function handlePasswordSave(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (passwordDraft.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      setPasswordMessage(null);
      return;
    }

    if (passwordDraft !== confirmPasswordDraft) {
      setPasswordError('Passwords do not match');
      setPasswordMessage(null);
      return;
    }

    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordMessage(null);

    try {
      const supabase = createClient();
      const { error: supabaseError } = await supabase.auth.updateUser({ password: passwordDraft });
      if (supabaseError) {
        setPasswordError(supabaseError.message);
        return;
      }

      /**
       * The actual credential is managed entirely by Supabase Auth.
       * The app only stores whether a password has been configured.
       */
      const updated = await api.markPasswordCredentialSet();
      setProfile(updated);
      setPasswordDraft('');
      setConfirmPasswordDraft('');
      setPasswordMessage('Application password configured.');
    } catch (err) {
      setPasswordError(
        err instanceof ApiClientError ? err.displayMessage : 'Password update failed',
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading profile" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Your profile</h1>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {message ? <Alert variant="success">{message}</Alert> : null}

      <form onSubmit={(e) => void handleSave(e)} className="card space-y-4">
        <label className="block">
          <span className="label-text">Display name</span>
          <input
            className="input-field"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
            }}
            required
            maxLength={100}
          />
        </label>

        <label className="block">
          <span className="label-text">Batting hand</span>
          <select
            className="input-field"
            value={battingHand}
            onChange={(e) => {
              setBattingHand(e.target.value as HandPreference);
            }}
          >
            {HAND_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label-text">Bowling hand</span>
          <select
            className="input-field"
            value={bowlingHand}
            onChange={(e) => {
              setBowlingHand(e.target.value as HandPreference);
            }}
          >
            {HAND_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        {profile?.skill_level ? (
          <p className="text-sm text-slate-600">Skill level: {profile.skill_level}</p>
        ) : null}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </form>

      <section
        ref={usernameSectionRef}
        className={`card space-y-6 transition ${
          highlightUsernameSection ? 'ring-2 ring-pitch-500 ring-offset-2' : ''
        }`}
      >
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Security</h2>
          <p className="text-sm text-slate-600">
            Manage the username other players sign in with and whether password login is enabled.
          </p>
        </div>

        <div className="space-y-3 border-b border-slate-200 pb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-slate-900">Username</h3>
              <p className="text-sm text-slate-600">
                Your username can be used instead of email on the sign-in screen.
              </p>
            </div>
            {profile?.username ? (
              <button
                type="button"
                className="text-sm font-medium text-pitch-700 hover:underline"
                onClick={() => {
                  setEditingUsername((current) => !current);
                  setUsernameError(null);
                  setUsernameMessage(null);
                }}
              >
                {editingUsername ? 'Cancel' : 'Change'}
              </button>
            ) : null}
          </div>

          {profile?.username && !editingUsername ? (
            <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {profile.username}
            </p>
          ) : (
            <form onSubmit={(e) => void handleUsernameSave(e)} className="space-y-3">
              <label className="block">
                <span className="label-text">
                  {profile?.username ? 'Change username' : 'Set username'}
                </span>
                <input
                  type="text"
                  className="input-field"
                  value={usernameDraft}
                  onChange={(e) => {
                    setUsernameDraft(e.target.value);
                    setUsernameError(null);
                    setUsernameMessage(null);
                    setUsernameAvailability('idle');
                  }}
                  onBlur={() => {
                    void handleUsernameBlur();
                  }}
                  autoComplete="username"
                  disabled={usernameSaving}
                />
              </label>

              {usernameAvailability === 'checking' ? (
                <p className="text-sm text-slate-600">Checking username availability…</p>
              ) : null}
              {usernameError ? <p className="text-sm text-red-700">{usernameError}</p> : null}
              {!usernameError && usernameMessage ? (
                <p
                  className={`text-sm ${
                    usernameAvailability === 'taken' ? 'text-red-700' : 'text-green-700'
                  }`}
                >
                  {usernameMessage}
                </p>
              ) : null}

              <button type="submit" className="btn-primary" disabled={usernameSaving}>
                {usernameSaving
                  ? 'Saving username…'
                  : profile?.username
                    ? 'Save username'
                    : 'Set username'}
              </button>
            </form>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="font-medium text-slate-900">Application password</h3>
            <p className="text-sm text-slate-600">
              This controls whether you can sign in with a password in addition to Google.
            </p>
          </div>

          {profile?.has_password_credential ? (
            <p className="text-sm text-slate-700">Application password: ✓ Configured</p>
          ) : (
            <form onSubmit={(e) => void handlePasswordSave(e)} className="space-y-3">
              <label className="block">
                <span className="label-text">New password</span>
                <input
                  type="password"
                  className="input-field"
                  value={passwordDraft}
                  onChange={(e) => {
                    setPasswordDraft(e.target.value);
                    setPasswordError(null);
                    setPasswordMessage(null);
                  }}
                  minLength={8}
                  autoComplete="new-password"
                  disabled={passwordSaving}
                />
              </label>

              <label className="block">
                <span className="label-text">Confirm password</span>
                <input
                  type="password"
                  className="input-field"
                  value={confirmPasswordDraft}
                  onChange={(e) => {
                    setConfirmPasswordDraft(e.target.value);
                    setPasswordError(null);
                    setPasswordMessage(null);
                  }}
                  minLength={8}
                  autoComplete="new-password"
                  disabled={passwordSaving}
                />
              </label>

              {passwordError ? <p className="text-sm text-red-700">{passwordError}</p> : null}
              {passwordMessage ? <p className="text-sm text-green-700">{passwordMessage}</p> : null}

              <button type="submit" className="btn-primary" disabled={passwordSaving}>
                {passwordSaving ? 'Saving password…' : 'Set application password'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
