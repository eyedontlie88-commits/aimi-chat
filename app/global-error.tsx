'use client'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html>
            <body>
                <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
                    <h2>Đã có lỗi xảy ra! (Global Error)</h2>
                    <p>Xin lỗi vì sự bất tiện này.</p>
                    <button
                        onClick={() => reset()}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#333',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                        }}
                    >
                        Thử lại
                    </button>
                </div>
            </body>
        </html>
    )
}
