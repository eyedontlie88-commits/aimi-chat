import Link from 'next/link'
import Image from 'next/image'

interface CharacterCardProps {
    id: string
    name: string
    avatarUrl: string
    shortDescription: string
    tags: string
    relationshipStatus?: string
}

export default function CharacterCard({
    id,
    name,
    avatarUrl,
    shortDescription,
    tags,
    relationshipStatus,
}: CharacterCardProps) {
    const tagList = tags.split(',').map((t) => t.trim())

    return (
        <div className="card glass-hover group animate-fade-in">
            <div className="flex flex-col items-center text-center space-y-4">
                <Link href={`/characters/${id}`} className="w-full flex flex-col items-center space-y-4">
                    <div className="relative w-32 h-32 rounded-full overflow-hidden ring-4 ring-primary/30 group-hover:ring-primary/60 transition-all">
                        <Image
                            src={avatarUrl}
                            alt={name}
                            fill
                            className="object-cover"
                            unoptimized
                        />
                    </div>

                    <div>
                        <h3 className="text-xl font-bold text-white group-hover:gradient-text transition-all">
                            {name}
                        </h3>
                        {relationshipStatus && (
                            <p className="text-xs text-primary mt-1">
                                {relationshipStatus}
                            </p>
                        )}
                    </div>

                    <p className="text-sm text-gray-300 line-clamp-2">{shortDescription}</p>

                    <div className="flex flex-wrap gap-2 justify-center">
                        {tagList.map((tag) => (
                            <span
                                key={tag}
                                className="px-3 py-1 text-xs rounded-full bg-primary/20 text-primary border border-primary/30"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </Link>

                {/* CTA Button */}
                <Link
                    href={`/chat/${id}`}
                    className="btn-primary w-full mt-2 text-center inline-flex items-center justify-center"
                >
                    Start Chat
                </Link>
            </div>
        </div>
    )
}
