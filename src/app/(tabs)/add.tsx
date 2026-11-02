import { Redirect } from 'expo-router';

/**
 * Placeholder route for the center "+" tab. Its tab button opens the add-transaction modal, so this
 * screen is never shown; if reached by a deep link it goes straight to the modal.
 */
export default function AddTab() {
  return <Redirect href="/transaction" />;
}
