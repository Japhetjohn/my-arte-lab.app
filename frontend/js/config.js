// Application Configuration

// API Configuration
export const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168'))
    ? 'http://localhost:5000/api'
    : 'https://api.myartelab.com/api'; // Update with your production URL

export const API_ENDPOINTS = {
    // Auth
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    verifyEmail: '/auth/verify-email',
    me: '/auth/me',

    // Creators
    creators: '/creators',
    creatorProfile: (id) => `/creators/${id}`,

    // Bookings
    bookings: '/bookings',
    createBooking: '/bookings',
    bookingDetails: (id) => `/bookings/${id}`,
    completeBooking: (id) => `/bookings/${id}/complete`,
    cancelBooking: (id) => `/bookings/${id}/cancel`,
    releasePayment: (id) => `/bookings/${id}/release-payment`,

    // Wallet
    wallet: '/wallet',
    transactions: '/wallet/transactions',
    withdraw: '/wallet/withdraw',
    balanceSummary: '/wallet/balance-summary',

    // Reviews
    reviews: '/reviews',
    createReview: '/reviews',

    // Profile
    updateProfile: '/auth/profile',
    updatePassword: '/auth/update-password'
};

// Mock Data for development/fallback

export const mockCreators = [
    {
        id: 1,
        name: 'Chioma Adeleke',
        role: 'Wedding Photographer',
        location: 'Lagos, Nigeria',
        rating: 4.9,
        reviewCount: 127,
        price: 'From $250',
        verified: true,
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
        cover: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=1200&h=360&fit=crop',
        bio: 'Capturing your special moments with creativity and passion. Over 5 years of experience in wedding and portrait photography.',
        responseTime: '2 hours',
        completedJobs: 127,
        portfolio: [
            'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=400&h=400&fit=crop'
        ],
        services: [
            {
                title: 'Wedding Photography Package',
                price: '$250',
                duration: '8 hours',
                deliverables: ['500+ edited photos', 'Online gallery', '2 photographers', 'Same-day teaser']
            },
            {
                title: 'Portrait Session',
                price: '$80',
                duration: '2 hours',
                deliverables: ['50+ edited photos', 'Online gallery', 'Location scouting']
            }
        ]
    },
    {
        id: 2,
        name: 'Kwame Osei',
        role: 'Brand Designer',
        location: 'Accra, Ghana',
        rating: 4.8,
        reviewCount: 89,
        price: 'From $150',
        verified: true,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
        cover: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&h=360&fit=crop',
        bio: 'Creating impactful brand identities for startups and established businesses across Africa.',
        responseTime: '1 hour',
        completedJobs: 89,
        portfolio: [
            'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1634942537034-2531766767d1?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1609921212029-bb5a28e60960?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=400&fit=crop'
        ],
        services: [
            {
                title: 'Complete Brand Identity',
                price: '$350',
                duration: '2 weeks',
                deliverables: ['Logo design', 'Brand guidelines', 'Business cards', 'Social media templates']
            },
            {
                title: 'Logo Design',
                price: '$150',
                duration: '5 days',
                deliverables: ['3 concepts', 'Unlimited revisions', 'Vector files', 'Brand colors']
            }
        ]
    },
    {
        id: 3,
        name: 'Amara Nwosu',
        role: 'Portrait Photographer',
        location: 'Abuja, Nigeria',
        rating: 5.0,
        reviewCount: 64,
        price: 'From $100',
        verified: true,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
        cover: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=1200&h=360&fit=crop',
        bio: 'Specializing in contemporary portraits that tell your unique story.',
        responseTime: '3 hours',
        completedJobs: 64,
        portfolio: [
            'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop'
        ],
        services: [
            {
                title: 'Professional Headshots',
                price: '$100',
                duration: '1 hour',
                deliverables: ['20+ edited photos', 'Digital delivery', 'Studio setup']
            }
        ]
    },
    {
        id: 4,
        name: 'Fatima Hassan',
        role: 'UI/UX Designer',
        location: 'Nairobi, Kenya',
        rating: 4.9,
        reviewCount: 112,
        price: 'From $200',
        verified: true,
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
        cover: 'https://images.unsplash.com/photo-1559028012-481c04fa702d?w=1200&h=360&fit=crop',
        bio: 'Designing beautiful and functional digital experiences for web and mobile.',
        responseTime: '2 hours',
        completedJobs: 112,
        portfolio: [
            'https://images.unsplash.com/photo-1559028012-481c04fa702d?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1609921212029-bb5a28e60960?w=400&h=400&fit=crop'
        ],
        services: [
            {
                title: 'Mobile App Design',
                price: '$400',
                duration: '2 weeks',
                deliverables: ['Full app design', 'Interactive prototype', 'Design system', 'Developer handoff']
            },
            {
                title: 'Website Design',
                price: '$300',
                duration: '10 days',
                deliverables: ['5 pages', 'Responsive design', 'Figma files']
            }
        ]
    }
];

export const mockWalletData = {
    balance: 1250.00,
    pending: 350.00,
    totalEarnings: 2840.00,
    withdrawn: 1590.00,
    transactions: [
        { id: 1, title: 'Payment received', description: 'Wedding Photography Package', date: '2025-11-02', amount: 250, type: 'credit', status: 'completed' },
        { id: 2, title: 'Withdrawal', description: 'Bank transfer to GTBank', date: '2025-11-01', amount: -500, type: 'debit', status: 'completed' },
        { id: 3, title: 'Payment received', description: 'Portrait Session', date: '2025-10-28', amount: 80, type: 'credit', status: 'completed' },
        { id: 4, title: 'Platform fee', description: 'Service fee for October', date: '2025-10-25', amount: -15, type: 'debit', status: 'completed' },
        { id: 5, title: 'Payment pending', description: 'Logo Design Project', date: '2025-11-04', amount: 150, type: 'credit', status: 'pending' },
        { id: 6, title: 'Payment pending', description: 'Brand Identity Package', date: '2025-11-03', amount: 200, type: 'credit', status: 'pending' }
    ]
};

export const mockBookingsData = [
    {
        id: 1,
        creatorName: 'Chioma Adeleke',
        creatorAvatar: mockCreators[0].avatar,
        service: 'Wedding Photography Package',
        status: 'in_progress',
        date: '2025-11-15',
        amount: 250,
        clientName: 'John Doe'
    },
    {
        id: 2,
        creatorName: 'Kwame Osei',
        creatorAvatar: mockCreators[1].avatar,
        service: 'Logo Design',
        status: 'pending',
        date: '2025-11-20',
        amount: 150,
        clientName: 'Jane Smith'
    },
    {
        id: 3,
        creatorName: 'Amara Nwosu',
        creatorAvatar: mockCreators[2].avatar,
        service: 'Professional Headshots',
        status: 'completed',
        date: '2025-10-28',
        amount: 100,
        clientName: 'Mike Johnson'
    }
];
