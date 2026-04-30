export const metadata = {
  title: 'Marketing OS',
  description: 'Your personal marketing command centre',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
