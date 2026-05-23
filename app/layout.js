import "./globals.css";

export const metadata = {
  title: "KNJ",
  description: "KNJ is Not Jira"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

