export default function ChatLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Chat pages use their own full-height layout, no footer needed
    // The children (ChatPage) handles its own header/messages/input structure
    return <>{children}</>
}
