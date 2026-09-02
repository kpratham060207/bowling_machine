import { API_CONTRACTS_PLACEHOLDER } from '@bowling-machine/api-contracts';
import { SHARED_PLACEHOLDER } from '@bowling-machine/shared';
import { UI_PLACEHOLDER } from '@bowling-machine/ui';

/**
 * Home page — Phase 1A foundation placeholder.
 * This is NOT the Throw Ball UI or any production feature screen.
 */
export default function HomePage() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '40rem' }}>
      <h1>Bowling Machine</h1>
      <p>
        <strong>Phase 1A:</strong> repository and development foundation. No application features
        are implemented yet.
      </p>
      <ul>
        <li>API contracts: {API_CONTRACTS_PLACEHOLDER}</li>
        <li>Shared: {SHARED_PLACEHOLDER}</li>
        <li>UI: {UI_PLACEHOLDER}</li>
      </ul>
    </main>
  );
}
