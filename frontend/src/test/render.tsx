import type { ReactElement } from 'react';
import { render } from '@testing-library/react';

import { ToastProvider } from '@/components/toast-provider';

/** Renders with the app-level providers the components expect. */
export function renderWithProviders(ui: ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}
