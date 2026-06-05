/**
 * Branded 404 — replaces expo-router's default "Unmatched Route" dev screen
 * with the Claude-design / Angular `error-404` surface.
 */
import React from 'react';
import { Stack, usePathname } from 'expo-router';

import { BeautyErrorScreen } from '@/components/BeautyErrorScreen';

export default function NotFoundScreen() {
  const pathname = usePathname();
  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'Not found' }} />
      <BeautyErrorScreen
        eyebrow="Page not found"
        title="We can't find that page"
        body="The link may be broken, or the page may have moved. Let's get you back somewhere familiar."
        code={`ERR_404 · ${pathname || '/unknown'}`}
        iconName="close"
        showNav={false}
      />
    </>
  );
}
