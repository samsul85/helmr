export const metadata = {
  title: 'Helmr — Take the helm of your next group plan',
  description: 'Plan group events. Collect funds upfront. No more chasing reimbursements.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%E2%9A%93%3C/text%3E%3C/svg%3E" />
      </head>
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#f5f3ee', color: '#1a1a1a' }}>
        {children}
      </body>
    </html>
  );
}
