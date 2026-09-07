import type { Metadata } from 'next';
import './globals.css';
import './preferred-prototype.css';
export const metadata: Metadata = { title: 'WraeclastLedger — Strategy Browser', description: 'Browse Path of Exile farming strategies, inspect authored results and copy reusable setups.', referrer: 'no-referrer', icons: {icon:'/ledger.png'} };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-theme="dark"><body>{children}</body></html>;
}
