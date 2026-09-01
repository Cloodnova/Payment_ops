import { type Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CloudNova PaymentOps',
  description:
    'CloudNova PaymentOps is a non-transactional payment-data intelligence platform. It does not execute or authorize payments.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
