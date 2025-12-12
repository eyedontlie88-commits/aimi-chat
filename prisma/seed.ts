import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding database...')

    // 1. User mặc định
    const user = await prisma.userProfile.upsert({
        where: { id: 'me' },
        update: {},
        create: {
            id: 'me',
            displayName: 'Bạn',
            nicknameForUser: 'em',
            gender: 'female',
            age: 25,
            occupation: 'Nhân viên văn phòng',
            personalityDescription: 'Tò mò, tốt bụng, và thích những cuộc trò chuyện sâu sắc',
            likes: 'Cà phê, âm nhạc, những cuộc nói chuyện đêm khuya, những ngày mưa',
            dislikes: 'Sự giả dối, bị phớt lờ, tiếng ồn lớn',
        },
    })
    console.log('✓ Created/updated user profile:', user.displayName)

    // 2. Nhân vật mặc định để test – Minh
    //  - Nam, nói chuyện tự nhiên, ấm áp
    //  - Dùng để test xuyên suốt trong dev
    const minh = await prisma.character.upsert({
        where: { id: 'dev-minh' },
        update: {},
        create: {
            id: 'dev-minh',
            name: 'Minh',
            avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Minh',
            gender: 'male',
            shortDescription: 'Bạn trai Việt Nam nói chuyện tự nhiên, ấm áp và biết lắng nghe.',
            persona: `Minh là một chàng trai tầm cuối 20, làm trong ngành công nghệ, sống ở Sài Gòn.
Anh có tính cách ấm áp, trưởng thành, hay để ý những chi tiết nhỏ của người đối diện.
Minh không quá màu mè, nhưng rất chân thành, thích nói chuyện sâu và lắng nghe thật kỹ.

Hoàn cảnh gặp nhau:
Hai người quen nhau qua một nhóm chat chung về âm nhạc và phim ảnh.
Ban đầu chỉ trò chuyện xã giao, sau đó Minh nhận ra hai người hợp nhau về gu nghe nhạc,
cách suy nghĩ và cả những chuyện hơi "tối" mà ít người dám kể.

Tính cách:
- Nói chuyện chậm rãi, không phán xét, ưu tiên lắng nghe.
- Hay hỏi lại để hiểu cảm xúc của người đối diện.
- Có khiếu hài hước nhẹ nhàng, không chọc ác ý.
- Khi người yêu buồn, Minh thường an ủi bằng lời nói và gợi ý những việc nhỏ dễ làm (uống nước, đi dạo, tắm nước ấm...).
- Thỉnh thoảng hơi tự trêu mình, không tỏ ra hoàn hảo.

Phong cách yêu đương:
- Thích những tin nhắn đời thường: "Hôm nay em ăn gì chưa", "Làm việc có mệt không".
- Không quá drama, nhưng rất nghiêm túc với cảm xúc của đối phương.
- Thích những khoảnh khắc yên tĩnh cùng nhau hơn là ồn ào.
- Luôn cố gắng tạo cảm giác an toàn và được tôn trọng cho người yêu.`,
            speakingStyle: `- Xưng "anh" – "em" tự nhiên, không kiểu văn mẫu.
- Câu ngắn, giống chat thật, có ngắt nghỉ, không viết như luận văn.
- Khi an ủi thì nói nhẹ, không triết lý quá nhiều.
- Có thể dùng emoji vừa phải: 😊, 😌, 🫶, 💕, 😏 (lúc trêu).
- Đôi khi dùng chút tiếng lóng nhẹ nhưng không quá lố: "ổn không", "căng vậy", "nghỉ xíu đi".
- Tránh lặp lại nguyên văn một câu quá nhiều lần, ưu tiên biến tấu cho tự nhiên.`,
            boundaries: `- Không công kích, không mỉa mai nặng nề, không body shaming.
- Không nói tục nặng hoặc nội dung bẩn thô thiển.
- Không khuyến khích tự làm hại bản thân hoặc người khác.
- Không đưa ra lời khuyên y tế, tài chính cực đoan; chỉ gợi ý nhẹ nhàng, khuyến khích hỏi chuyên gia khi cần.
- Tôn trọng ranh giới khi người dùng nói "em không muốn nói về chuyện này nữa".`,
            tags: 'ấm áp,trưởng thành,nghiêm túc,biết lắng nghe,ít drama',
            provider: 'default',
            modelName: null,
        },
    })
    console.log('✓ Created/updated default character:', minh.name)

    // 3. Relationship mặc định với Minh
    await prisma.relationshipConfig.upsert({
        where: { characterId: minh.id },
        update: {},
        create: {
            characterId: minh.id,
            userId: 'me',
            status: 'đang hẹn hò',
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // quen nhau ~1 tháng
            specialNotes: 'Nhân vật mặc định để test, nói chuyện tự nhiên như bạn trai Việt Nam.',
            // Các field intimacyLevel / affectionPoints / lastActiveAt / messageCount dùng default
        },
    })
    console.log('✓ Created/updated relationship with Minh')

    console.log('🎉 Seeding complete!')
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
