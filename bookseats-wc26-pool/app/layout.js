import "./globals.css";

export const metadata = {
  title: "BookSeats · World Cup 2026 Bracket Pool",
  description: "One Platform. The Entire Fan Experience. Call every group, crown your champion, beat your coworkers."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
