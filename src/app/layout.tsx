import type { Metadata } from "next";
import "./globals.css";
import { loadCurrentUser } from "@/features/auth/server/load-current-user";
import { CurrentUserProvider } from "@/features/auth/context/current-user-context";
import Providers from "./providers";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "MaFia Reservation",
  description:
    "비회원도 빠르게 좌석을 선택하고 예약할 수 있는 콘서트 예약 플랫폼",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await loadCurrentUser();

  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <Providers>
          <SiteHeader />
          <CurrentUserProvider initialState={currentUser}>
            {children}
          </CurrentUserProvider>
        </Providers>
      </body>
    </html>
  );
}
