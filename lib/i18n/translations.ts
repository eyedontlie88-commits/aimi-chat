/**
 * Translation Dictionary
 * All UI strings for English and Vietnamese
 */

export type Language = 'en' | 'vi'

export const translations = {
    en: {
        // Common
        common: {
            back: 'Back',
            save: 'Save',
            cancel: 'Cancel',
            close: 'Close',
            delete: 'Delete',
            confirm: 'Confirm',
            loading: 'Loading...',
            error: 'Error',
            success: 'Success',
            submit: 'Submit',
            send: 'Send',
            refresh: 'Refresh',
            edit: 'Edit',
            create: 'Create',
            duplicate: 'Duplicate',
        },

        // Auth
        auth: {
            signIn: 'Sign In',
            signOut: 'Sign Out',
            signUp: 'Sign Up',
            email: 'Email',
            password: 'Password',
            google: 'Google',
            signInFailed: 'Sign in failed',
            migratingData: 'Migrating data...',
        },

        // Guest Login Prompt
        guest: {
            title: 'Sign in to chat',
            message: 'To start chatting with {character}, you need to sign in to your account.',
            benefits: 'When you sign in you can:',
            benefit1: 'Chat without limits',
            benefit2: 'Save chat history',
            benefit3: 'Build relationships with characters',
            benefit4: 'Create memorable moments',
            signInGoogle: 'Sign in with Google',
            browseCharacters: 'Browse other characters',
            pleaseEnter: 'Please enter content',
        },

        // Settings
        settings: {
            title: 'Settings',
            language: 'Language',
            languageDesc: 'Choose your preferred language',
            profile: 'Your Profile',
            profileDesc: 'This information helps characters understand and relate to you better.',
            displayName: 'Display Name',
            nickname: 'Nickname (how they call you)',
            gender: 'Gender',
            age: 'Age',
            occupation: 'Occupation',
            occupationPlaceholder: 'e.g., Student, Software Engineer',
            personality: 'Personality Description',
            personalityPlaceholder: 'Describe yourself in a few words...',
            likes: 'Likes',
            likesPlaceholder: 'Things you enjoy...',
            dislikes: 'Dislikes',
            dislikesPlaceholder: "Things you don't like...",
            saveProfile: 'Save Profile',
            saving: 'Saving...',
            theme: 'Chat Theme',
            themeDesc: 'Choose a theme for your chat.',
            textMode: 'Text Color in Chat',
            textModeAuto: 'Auto (by theme)',
            textModeLight: 'Light (white)',
            textModeDark: 'Dark (black)',
            relationships: 'Relationship Settings',
            relationshipsDesc: 'Configure your relationship with each character.',
            genderOptions: {
                none: 'Prefer not to say',
                male: 'Male',
                female: 'Female',
                nonBinary: 'Non-binary',
            },
        },

        // Characters
        characters: {
            title: 'Characters',
            createNew: 'Create New Character',
            messages: 'messages',
            memories: 'memories',
            startChat: 'Start Chat',
            viewDetails: 'View Details',
            noCharacters: 'No characters yet',
            createFirst: 'Create your first character to start chatting!',
        },

        // Character Form
        characterForm: {
            createTitle: '✨ Create New Character',
            editTitle: '✏️ Edit Character',
            duplicateTitle: '📋 Duplicate Character',
            name: 'Character Name',
            avatar: 'Avatar',
            shortDesc: 'Short Description',
            shortDescPlaceholder: 'e.g., Warm older brother who cares for others',
            gender: 'Gender',
            persona: 'Persona',
            personaPlaceholder: 'Character personality, background...',
            speakingStyle: 'Speaking Style',
            speakingStylePlaceholder: 'How does this character speak?',
            boundaries: 'Boundaries',
            boundariesPlaceholder: 'Topics or behaviors to avoid...',
            tags: 'Tags',
            tagsPlaceholder: 'romantic, caring, protective...',
            aiProvider: 'AI Provider',
            aiModel: 'AI Model',
            presetModel: 'Preset Model',
            customModelId: 'Custom Model ID',
            recommended: 'Recommended',
            relationshipStatus: 'Relationship Status',
            uploadAvatar: 'Upload Image',
            chooseDefault: 'Or choose from defaults:',
        },

        // Character Settings Modal
        charSettings: {
            title: '⚙️ Character Settings',
            meetingContext: '📍 Meeting Context (important)',
            meetingContextExample: 'e.g., Met on Tinder, matched 1 week ago / New colleague / College friend...',
            meetingContextDesc: 'This helps AI understand your relationship and respond appropriately.',
            deleteCharacter: '🗑️ Delete Character',
            deleteWarning: 'This action cannot be undone. All chat history and memories will be deleted.',
            confirmDelete: 'Are you sure you want to delete this character?',
        },

        // Chat
        chat: {
            placeholder: 'Message {character}...',
            sending: 'Sending...',
            reply: 'Reply',
            saveMemory: 'Save',
            replyingTo: 'Replying to:',
            cancelReply: 'Cancel reply',
            search: 'Search',
            searchMessages: 'Search messages...',
            noResults: 'No messages found',
            stage: 'STAGE',
        },

        // Memory
        memory: {
            title: '💾 Save as Memory',
            description: 'Create a memory from this conversation for the character to remember.',
            type: 'Memory Type',
            content: 'Memory Content',
            contentPlaceholder: "What should the character remember? (e.g., 'User loves rainy days')",
            importance: 'Importance',
            minor: 'Minor',
            veryImportant: 'Very Important',
            saveMemory: 'Save Memory',
            types: {
                fact: '📝 Fact',
                factDesc: 'Information about the user',
                event: '🎉 Event',
                eventDesc: 'Something that happened',
                preference: '❤️ Preference',
                preferenceDesc: 'Likes or dislikes',
                anniversary: '🎂 Anniversary',
                anniversaryDesc: 'Important date',
                promise: '🤝 Promise',
                promiseDesc: 'Commitment made',
                other: '💭 Other',
                otherDesc: 'Other memory',
            },
        },

        // Phone Check
        phone: {
            title: "📱 {character}'s Phone",
            updated: 'Updated',
            justNow: 'Just now',
            minutesAgo: '{n} minutes ago',
            hoursAgo: '{n} hours ago',
            calls: 'Recent Calls',
            messages: 'Messages',
            notes: 'Notes',
            calendar: 'Calendar',
            noCalls: 'No recent calls',
            noMessages: 'No messages',
            noNotes: 'No notes',
            noEvents: 'No events',
        },

        // Narrative Syntax
        narrative: {
            scene: 'Scene',
            action: 'Action',
            thought: 'Thought',
            name: 'Name',
            addNarrative: 'Add storytelling technique',
            sceneTitle: 'Add scene description [text]',
            actionTitle: 'Add action *text*',
            thoughtTitle: 'Add thought (text)',
            nameTitle: 'Insert name {user} / {char}',
            user: 'User',
            character: 'Character',
            enterContent: 'Enter content for',
            preview: 'Preview',
            add: 'Add',
            hide: 'Hide',
        },

        // Actions Drawer
        actions: {
            title: '🎯 Features',
            photos: 'Photos',
            thoughts: 'Inner Thoughts',
            history: 'Chat History',
            journal: 'Journal',
            phone: 'Phone',
            memory: 'Memory',
            forum: 'Forum',
            favorites: 'Favorites',
            comingSoon: 'Coming soon',
            tapOutside: 'Tap outside or ✕ to close',
        },

        // Relationship Stages
        relationship: {
            stranger: 'Stranger',
            known: 'Known',
            acquaintance: 'Acquaintance',
            lover: 'Lover',
            veryClose: 'Very Close',
            crush: 'Crush',
            dating: 'Dating',
            engaged: 'Engaged',
            married: 'Married',
            livingTogether: 'Living Together',
        },

        // Themes
        themes: {
            midnight: {
                name: 'Midnight',
                desc: 'Dark, easy to read at night 🌙',
            },
            twilight: {
                name: 'Twilight',
                desc: 'Soft purple, aesthetic ✨',
            },
            sakura: {
                name: 'Sakura',
                desc: 'Pink pastel, sweet 🌸',
            },
            ocean: {
                name: 'Ocean',
                desc: 'Fresh blue, cool 🌊',
            },
        },
    },

    vi: {
        // Common
        common: {
            back: 'Quay lại',
            save: 'Lưu',
            cancel: 'Hủy',
            close: 'Đóng',
            delete: 'Xóa',
            confirm: 'Xác nhận',
            loading: 'Đang tải...',
            error: 'Lỗi',
            success: 'Thành công',
            submit: 'Gửi',
            send: 'Gửi',
            refresh: 'Làm mới',
            edit: 'Chỉnh sửa',
            create: 'Tạo mới',
            duplicate: 'Nhân bản',
        },

        // Auth
        auth: {
            signIn: 'Đăng nhập',
            signOut: 'Đăng xuất',
            signUp: 'Đăng ký',
            email: 'Email',
            password: 'Mật khẩu',
            google: 'Google',
            signInFailed: 'Đăng nhập thất bại',
            migratingData: 'Đang import dữ liệu...',
        },

        // Guest Login Prompt
        guest: {
            title: 'Đăng nhập để trò chuyện',
            message: 'Để bắt đầu cuộc trò chuyện với {character}, bạn cần đăng nhập vào tài khoản của mình.',
            benefits: 'Khi đăng nhập bạn có thể:',
            benefit1: 'Trò chuyện không giới hạn',
            benefit2: 'Lưu lịch sử trò chuyện',
            benefit3: 'Xây dựng mối quan hệ với nhân vật',
            benefit4: 'Tạo kỷ niệm đáng nhớ',
            signInGoogle: 'Đăng nhập với Google',
            browseCharacters: 'Xem nhân vật khác',
            pleaseEnter: 'Vui lòng nhập nội dung',
        },

        // Settings
        settings: {
            title: 'Cài đặt',
            language: 'Ngôn ngữ',
            languageDesc: 'Chọn ngôn ngữ bạn muốn sử dụng',
            profile: 'Hồ sơ của bạn',
            profileDesc: 'Thông tin này giúp nhân vật hiểu và tương tác với bạn tốt hơn.',
            displayName: 'Tên hiển thị',
            nickname: 'Biệt danh (cách họ gọi bạn)',
            gender: 'Giới tính',
            age: 'Tuổi',
            occupation: 'Nghề nghiệp',
            occupationPlaceholder: 'VD: Sinh viên, Kỹ sư phần mềm',
            personality: 'Mô tả tính cách',
            personalityPlaceholder: 'Mô tả bản thân bạn trong vài từ...',
            likes: 'Sở thích',
            likesPlaceholder: 'Những thứ bạn thích...',
            dislikes: 'Không thích',
            dislikesPlaceholder: 'Những thứ bạn không thích...',
            saveProfile: 'Lưu hồ sơ',
            saving: 'Đang lưu...',
            theme: 'Theme trò chuyện',
            themeDesc: 'Chọn theme cho trang chat của bạn.',
            textMode: 'Màu chữ trong chat',
            textModeAuto: 'Tự động (theo theme)',
            textModeLight: 'Chữ sáng (trắng)',
            textModeDark: 'Chữ đậm (tối)',
            relationships: 'Cài đặt quan hệ',
            relationshipsDesc: 'Thiết lập mối quan hệ với từng nhân vật.',
            genderOptions: {
                none: 'Không muốn nói',
                male: 'Nam',
                female: 'Nữ',
                nonBinary: 'Phi nhị nguyên',
            },
        },

        // Characters
        characters: {
            title: 'Nhân vật',
            createNew: 'Tạo nhân vật mới',
            messages: 'tin nhắn',
            memories: 'kỷ niệm',
            startChat: 'Bắt đầu chat',
            viewDetails: 'Xem chi tiết',
            noCharacters: 'Chưa có nhân vật nào',
            createFirst: 'Tạo nhân vật đầu tiên để bắt đầu trò chuyện!',
        },

        // Character Form
        characterForm: {
            createTitle: '✨ Tạo Nhân Vật Mới',
            editTitle: '✏️ Chỉnh sửa Nhân Vật',
            duplicateTitle: '📋 Nhân bản Nhân Vật',
            name: 'Tên nhân vật',
            avatar: 'Ảnh đại diện',
            shortDesc: 'Mô tả ngắn',
            shortDescPlaceholder: 'VD: Anh trai ấm áp, hay chăm sóc người khác',
            gender: 'Giới tính',
            persona: 'Tính cách',
            personaPlaceholder: 'Tính cách nhân vật, lý lịch...',
            speakingStyle: 'Cách nói chuyện',
            speakingStylePlaceholder: 'Nhân vật này nói chuyện như thế nào?',
            boundaries: 'Giới hạn',
            boundariesPlaceholder: 'Chủ đề hoặc hành vi cần tránh...',
            tags: 'Tags',
            tagsPlaceholder: 'lãng mạn, chu đáo, bảo vệ...',
            aiProvider: 'Nhà cung cấp AI',
            aiModel: 'Model AI',
            presetModel: 'Model có sẵn',
            customModelId: 'Nhập Model ID tùy chỉnh',
            recommended: 'Đề xuất',
            relationshipStatus: 'Trạng thái quan hệ',
            uploadAvatar: 'Tải ảnh lên',
            chooseDefault: 'Hoặc chọn từ mặc định:',
        },

        // Character Settings Modal
        charSettings: {
            title: '⚙️ Cài đặt nhân vật',
            meetingContext: '📍 Bối cảnh gặp nhau (quan trọng)',
            meetingContextExample: 'VD: Gặp qua app hẹn hò Tinder, mới match 1 tuần / Đồng nghiệp mới vào công ty / Bạn thời đại học...',
            meetingContextDesc: 'Thông tin này giúp AI hiểu mối quan hệ của bạn và cư xử phù hợp.',
            deleteCharacter: '🗑️ Xóa nhân vật',
            deleteWarning: 'Hành động này không thể hoàn tác. Toàn bộ lịch sử chat và kỷ niệm sẽ bị xóa.',
            confirmDelete: 'Bạn có chắc muốn xóa nhân vật này?',
        },

        // Chat
        chat: {
            placeholder: 'Nhắn cho {character}...',
            sending: 'Đang gửi...',
            reply: 'Trả lời',
            saveMemory: 'Lưu',
            replyingTo: 'Đang trả lời:',
            cancelReply: 'Hủy trả lời',
            search: 'Tìm kiếm',
            searchMessages: 'Tìm kiếm tin nhắn...',
            noResults: 'Không tìm thấy tin nhắn nào',
            stage: 'GĐ',
        },

        // Memory
        memory: {
            title: '💾 Lưu thành kỷ niệm',
            description: 'Tạo kỷ niệm từ cuộc trò chuyện này để nhân vật nhớ.',
            type: 'Loại kỷ niệm',
            content: 'Nội dung kỷ niệm',
            contentPlaceholder: "Nhân vật nên nhớ gì? (VD: 'Người dùng thích ngày mưa')",
            importance: 'Mức độ quan trọng',
            minor: 'Ít quan trọng',
            veryImportant: 'Rất quan trọng',
            saveMemory: 'Lưu kỷ niệm',
            types: {
                fact: '📝 Thông tin',
                factDesc: 'Thông tin về người dùng',
                event: '🎉 Sự kiện',
                eventDesc: 'Điều gì đó đã xảy ra',
                preference: '❤️ Sở thích',
                preferenceDesc: 'Thích hoặc không thích',
                anniversary: '🎂 Kỷ niệm',
                anniversaryDesc: 'Ngày quan trọng',
                promise: '🤝 Lời hứa',
                promiseDesc: 'Cam kết đã đưa ra',
                other: '💭 Khác',
                otherDesc: 'Kỷ niệm khác',
            },
        },

        // Phone Check
        phone: {
            title: '📱 Điện thoại của {character}',
            updated: 'Cập nhật',
            justNow: 'Vừa xong',
            minutesAgo: '{n} phút trước',
            hoursAgo: '{n} giờ trước',
            calls: 'Cuộc gọi gần đây',
            messages: 'Tin nhắn',
            notes: 'Ghi chú',
            calendar: 'Lịch',
            noCalls: 'Không có cuộc gọi',
            noMessages: 'Không có tin nhắn',
            noNotes: 'Không có ghi chú',
            noEvents: 'Không có sự kiện',
        },

        // Narrative Syntax
        narrative: {
            scene: 'Cảnh',
            action: 'Hành động',
            thought: 'Suy nghĩ',
            name: 'Tên',
            addNarrative: 'Thêm kỹ thuật kể chuyện',
            sceneTitle: 'Thêm mô tả cảnh [text]',
            actionTitle: 'Thêm hành động *text*',
            thoughtTitle: 'Thêm suy nghĩ (text)',
            nameTitle: 'Chèn tên {user} / {char}',
            user: 'Người dùng',
            character: 'Nhân vật',
            enterContent: 'Nhập nội dung cho',
            preview: 'Xem trước',
            add: 'Thêm',
            hide: 'Ẩn',
        },

        // Actions Drawer
        actions: {
            title: '🎯 Tính năng',
            photos: 'Ảnh',
            thoughts: 'Suy nghĩ bên trong',
            history: 'Lịch sử trò chuyện',
            journal: 'Nhật ký',
            phone: 'Điện thoại',
            memory: 'Bộ nhớ',
            forum: 'Diễn đàn',
            favorites: 'Yêu thích',
            comingSoon: 'Sắp ra mắt',
            tapOutside: 'Nhấn bên ngoài hoặc ✕ để đóng',
        },

        // Relationship Stages
        relationship: {
            stranger: 'Người lạ',
            known: 'Đã biết',
            acquaintance: 'Thân quen',
            lover: 'Người yêu',
            veryClose: 'Rất thân',
            crush: 'Thích thầm',
            dating: 'Đang hẹn hò',
            engaged: 'Đã đính hôn',
            married: 'Đã kết hôn',
            livingTogether: 'Sống chung',
        },

        // Themes
        themes: {
            midnight: {
                name: 'Midnight',
                desc: 'Nền tối, dễ đọc ban đêm 🌙',
            },
            twilight: {
                name: 'Twilight',
                desc: 'Nền tím nhẹ, aesthetic ✨',
            },
            sakura: {
                name: 'Sakura',
                desc: 'Hồng pastel, ngọt ngào 🌸',
            },
            ocean: {
                name: 'Ocean',
                desc: 'Xanh dương tươi mát 🌊',
            },
        },
    },
} as const

export type TranslationKey = keyof typeof translations.en
