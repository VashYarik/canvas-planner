import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import MainLayout from './components/MainLayout';

export const metadata = {
  title: 'Planner',
  description: 'AI-powered student planner',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body suppressHydrationWarning={true}>
          <MainLayout>{children}</MainLayout>
        </body>
      </html>
    </ClerkProvider>
  );
}
