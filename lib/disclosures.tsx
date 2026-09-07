import { createContext, useContext, useState } from 'react';

export const DisclosureContext = createContext<{
  values: Record<string, boolean>;
  change: (key: string, value: boolean) => void;
} | null>(null);

export function useDisclosure(
  key: string,
): [boolean, (value: boolean) => void] {
  const context = useContext(DisclosureContext);
  const [local, setLocal] = useState(false);
  return context
    ? [context.values[key] === true, (value) => context.change(key, value)]
    : [local, setLocal];
}
