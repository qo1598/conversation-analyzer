import './styles/globals.css'

export const metadata = {
  title: '대화 분석 시스템',
  description: '녹음 파일 업로드 및 대화 분석 평가 시스템',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <main className="min-h-screen p-4 md:p-8">
          {children}
        </main>
      </body>
    </html>
  )
} 