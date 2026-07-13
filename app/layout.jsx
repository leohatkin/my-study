import "./globals.css";

export const metadata = {
  title: {
    default: "NEXUS // Signal Studio",
    template: "%s // NEXUS",
  },
  description: "A focused generative image signal console.",
};

export const viewport = {
  colorScheme: "dark",
  themeColor: "#06070d",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
