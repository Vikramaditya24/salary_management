import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { SearchBox } from './search-box';

describe('SearchBox', () => {
  afterEach(() => vi.useRealTimers());

  it('commits the text after the debounce, not on every keystroke', () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    render(<SearchBox value="" onSearch={onSearch} debounceMs={300} />);
    const input = screen.getByRole('searchbox', { name: 'Search employees' });

    fireEvent.change(input, { target: { value: 'a' } });
    act(() => vi.advanceTimersByTime(200));
    fireEvent.change(input, { target: { value: 'ada' } });
    act(() => vi.advanceTimersByTime(299));
    expect(onSearch).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('ada');
  });

  it('follows the URL when it changes underneath (back button, clear filters)', () => {
    const { rerender } = render(<SearchBox value="ada" onSearch={vi.fn()} />);
    expect(screen.getByRole('searchbox')).toHaveValue('ada');

    rerender(<SearchBox value="" onSearch={vi.fn()} />);
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  it('clears immediately from the clear button', () => {
    const onSearch = vi.fn();
    render(<SearchBox value="ada" onSearch={onSearch} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onSearch).toHaveBeenCalledWith('');
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  it('flags searches over the six-word limit instead of sending them', () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    render(<SearchBox value="" onSearch={onSearch} />);
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'a b c d e f g' } });
    act(() => vi.advanceTimersByTime(1000));

    expect(onSearch).not.toHaveBeenCalled();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(/up to 6 words/i);
  });
});
