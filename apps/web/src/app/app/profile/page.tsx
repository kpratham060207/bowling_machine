'use client';

import { useEffect, useState, type SubmitEvent } from 'react';
import type { HandPreference, Player } from '@bowling-machine/api-contracts';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuthenticatedServices } from '@/hooks/use-authenticated-services';
import { ApiClientError } from '@/lib/api/errors';

const HAND_OPTIONS: HandPreference[] = ['RIGHT', 'LEFT', 'AMBIDEXTROUS', 'UNSPECIFIED'];

/** Player profile page — view and update supported profile fields via backend API. */
export default function AppProfilePage() {
  const { api } = useAuthenticatedServices();
  const [profile, setProfile] = useState<Player | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [battingHand, setBattingHand] = useState<HandPreference>('UNSPECIFIED');
  const [bowlingHand, setBowlingHand] = useState<HandPreference>('UNSPECIFIED');
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
      } catch (err) {
        setError(err instanceof ApiClientError ? err.displayMessage : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [api]);

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
    </div>
  );
}
