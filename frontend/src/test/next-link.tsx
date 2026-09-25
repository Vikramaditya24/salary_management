import type { ComponentProps } from 'react';

/** Plain-anchor replacement for `next/link` in component tests. */
export default function Link({ href, children, ...rest }: ComponentProps<'a'> & { href: string }) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
