'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { InteractivePitch } from '@/components/interactive-pitch';
import { PracticeSetupControls } from '@/components/practice-setup-controls';
import { Alert } from '@/components/ui/alert';
import { useAuthenticatedServices } from '@/hooks/use-authenticated-services';
import { ApiClientError } from '@/lib/api/errors';
import {
  DEFAULT_PRACTICE_SETUP,
  setupStateToDeliveryInput,
  validatePracticeSetup,
  type PracticeSetupState,
} from '@/lib/practice/setup-state';

/** Creates a new practice plan from high-level delivery configuration. */
export default function NewPlanPage() {
  const router = useRouter();
  const { api } = useAuthenticatedServices();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [setup, setSetup] = useState<PracticeSetupState>(DEFAULT_PRACTICE_SETUP);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validation = useMemo(() => validatePracticeSetup(setup), [setup]);

  async function handleSave() {
    if (!name.trim() || !validation.valid || saving) return;

    setSaving(true);
    setError(null);
    try {
      const delivery = setupStateToDeliveryInput(setup);
      const plan = await api.createPracticePlan({
        name: name.trim(),
        description: description.trim() || undefined,
        deliveries: [delivery],
      });
      router.push(`/app/plans/${plan.plan_id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.displayMessage : 'Failed to save plan');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/app/plans" className="text-sm font-medium text-pitch-700 hover:underline">
        ← Back to plans
      </Link>
      <h1 className="text-2xl font-bold">Create practice plan</h1>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <section className="card space-y-3">
        <label className="block">
          <span className="label-text">Plan name</span>
          <input
            className="input-field"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            required
            maxLength={100}
          />
        </label>
        <label className="block">
          <span className="label-text">Description (optional)</span>
          <textarea
            className="input-field min-h-20"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
            maxLength={500}
          />
        </label>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <InteractivePitch
            value={setup.target}
            onChange={(target) => {
              setSetup((prev) => ({ ...prev, target }));
            }}
          />
        </section>
        <section className="card">
          <PracticeSetupControls
            state={setup}
            onChange={(patch) => {
              setSetup((prev) => ({ ...prev, ...patch }));
            }}
            disabled={saving}
          />
        </section>
      </div>

      <button
        type="button"
        className="btn-primary"
        disabled={!name.trim() || !validation.valid || saving}
        onClick={() => void handleSave()}
      >
        {saving ? 'Saving…' : 'Save plan'}
      </button>
    </div>
  );
}
