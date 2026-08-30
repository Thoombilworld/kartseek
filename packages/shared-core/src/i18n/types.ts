/// KARTSEEK — i18n Type Definitions
/// Strict typing for all translatable strings across the application.

/**
 * Top-level namespace keys for organizing translations by feature domain.
 * Every UI string in the app must belong to one of these namespaces.
 */
export interface TranslationKeys {
  // ── Global / Shared ──────────────────────────────────────────────────────────
  common: {
    appName: string;
    tagline: string;
    searchPlaceholder: string;
    searchIn: string;
    loading: string;
    detecting: string;
    viewAll: string;
    seeAll: string;
    learnMore: string;
    back: string;
    next: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    close: string;
    confirm: string;
    yes: string;
    no: string;
    ok: string;
    error: string;
    success: string;
    warning: string;
    retry: string;
    noResults: string;
    selectRegion: string;
    language: string;
    country: string;
    currency: string;
    settings: string;
    logout: string;
    login: string;
    signUp: string;
    signOut: string;
    or: string;
    and: string;
    of: string;
    all: string;
    none: string;
    filter: string;
    sort: string;
    apply: string;
    reset: string;
    more: string;
    less: string;
    showMore: string;
    showLess: string;
    minutes: string;
    hours: string;
    days: string;
    today: string;
    yesterday: string;
    justNow: string;
    ago: string;
    min: string;
    hr: string;
    km: string;
    mi: string;
    promoted: string;
    featured: string;
    new: string;
    hot: string;
    popular: string;
    trending: string;
    topRated: string;
    bestSeller: string;
    freeDelivery: string;
    orderNow: string;
    shopNow: string;
    bookNow: string;
    exploreNow: string;
    getStarted: string;
    continueText: string;
    submit: string;
    update: string;
    remove: string;
    add: string;
    share: string;
    copy: string;
    download: string;
    upload: string;
    switchLanguage: string;
    switchCountry: string;
    rtl: string;
    ltr: string;
    darkMode: string;
    lightMode: string;
    poweredBy: string;
    allRightsReserved: string;
    termsOfService: string;
    privacyPolicy: string;
    helpCenter: string;
    contactUs: string;
  };

  // ── Navigation ────────────────────────────────────────────────────────────────
  nav: {
    home: string;
    shop: string;
    orders: string;
    wishlist: string;
    profile: string;
    cart: string;
    notifications: string;
    search: string;
    menu: string;
    marketplace: string;
    grocery: string;
    restaurant: string;
    foodDelivery: string;
    pharmacy: string;
    doctor: string;
    taxi: string;
    wallet: string;
    rewards: string;
    loyalty: string;
    support: string;
    helpSupport: string;
    sellerPortal: string;
    driverPortal: string;
    franchise: string;
    adminConsole: string;
  };

  // ── Home Page ─────────────────────────────────────────────────────────────────
  home: {
    walletLabel: string;
    walletTopUp: string;
    loyaltyLabel: string;
    loyaltyPoints: string;
    loyaltyValue: string;
    ourServices: string;
    recentOrders: string;
    trendingNow: string;
    nearbyStores: string;
    popularBrands: string;
    premiumRestaurants: string;
    premiumRestaurantsDesc: string;
    browseAllRestaurants: string;
    trackOrder: string;
    liveUpdates: string;
    getHelp: string;
    support247: string;
    avgDelivery: string;
    appRating: string;
    securePay: string;
    delivery: string;
    takeaway: string;
    dineIn: string;
    bookTable: string;
    forTwo: string;
    quickActions: string;
    storesFound: string;
    storesDeliveringNow: string;
  };

  // ── Auth ───────────────────────────────────────────────────────────────────────
  auth: {
    loginTitle: string;
    signUpTitle: string;
    emailLabel: string;
    passwordLabel: string;
    forgotPassword: string;
    rememberMe: string;
    noAccount: string;
    hasAccount: string;
    createAccount: string;
    welcomeBack: string;
    loginWith: string;
    signUpWith: string;
    orContinueWith: string;
    nameLabel: string;
    phoneLabel: string;
    confirmPassword: string;
    agreeTerms: string;

    // ── Sign-in / sign-up screens ──────────────────────────────────────────
    signIn: string;
    signInSubtitle: string;
    signUpHeadline: string;
    signUpSubtitle: string;
    createOneFree: string;
    orSignUpWith: string;
    phoneOtp: string;
    optional: string;
    agreeToThe: string;
    showPassword: string;
    hidePassword: string;
    emailPlaceholder: string;
    namePlaceholder: string;
    passwordMinPlaceholder: string;
    phonePlaceholder: string;

    // ── Password recovery ──────────────────────────────────────────────────
    forgotPasswordTitle: string;
    forgotPasswordSubtitle: string;
    resetHeadline: string;
    resetHeadlineBody: string;
    sendResetLink: string;
    resetLinkSent: string;
    resetLinkSentBody: string;
    notInInbox: string;
    tryDifferentAddress: string;
    featSingleUseLink: string;
    featEncryptedReset: string;
    backToSignIn: string;
    resetPasswordTitle: string;
    resetPasswordSubtitle: string;
    newPassword: string;
    updatePassword: string;
    passwordUpdated: string;
    passwordUpdatedBody: string;
    creatingPasswordFor: string;
    createNewPasswordHeadline: string;
    createNewPasswordBody: string;
    featMixCharacters: string;
    featNeverReuse: string;
    passwordsMatch: string;
    pwStrengthWeak: string;
    pwStrengthFair: string;
    pwStrengthGood: string;
    pwStrengthStrong: string;
    pwCheckLength: string;
    pwCheckUpper: string;
    pwCheckLower: string;
    pwCheckNumber: string;
    pwCheckSpecial: string;

    // ── Marketing bullets ──────────────────────────────────────────────────
    featShopCategories: string;
    featBookServices: string;
    featSecurePayments: string;
    featOneAccount: string;
    featWelcomeBonus: string;
    featDataProtected: string;

    /**
     * Failure copy.
     *
     * The gateway's 4xx messages are already customer-facing and carry detail
     * worth showing verbatim (attempts remaining, lockout minutes), so they are
     * preferred over these when present — these cover the branches where the
     * server said nothing useful. See `describeLoginError` in
     * `app/auth/login/page.tsx`.
     */
    errFillAllFields: string;
    errFillAllRequired: string;
    errEnterEmail: string;
    errInvalidEmail: string;
    errResetLinkFailed: string;
    errPasswordRule: string;
    errPasswordMismatch: string;
    errMustAgreeTerms: string;
    errCheckEmailPassword: string;
    errCheckDetails: string;
    errEmailExists: string;
    errSignInUnreachable: string;
    errSignInUnreachableNetwork: string;
    errSignUpUnreachable: string;
    errSignUpUnreachableNetwork: string;
    errSignInFailed: string;
    errSignUpFailed: string;
    errResetFailed: string;
    errResetLinkInvalid: string;
  };

  // ── Profile / Account ─────────────────────────────────────────────────────────
  account: {
    myAccount: string;
    ordersBookings: string;
    savedAddresses: string;
    securitySettings: string;
    loyaltyPoints: string;
    paymentMethods: string;
    preferences: string;
    personalInfo: string;
    changePassword: string;
    manageAddresses: string;
    orderHistory: string;
    activeOrders: string;
    completedOrders: string;
    cancelledOrders: string;
  };

  // ── Grocery Module ────────────────────────────────────────────────────────────
  grocery: {
    title: string;
    freshGroceries: string;
    deliveredIn: string;
    nearbyStores: string;
    shopByBrand: string;
    trendingStores: string;
    todaysDeals: string;
    allBrands: string;
    lightningFast: string;
    orderDescription: string;
    mostPopular: string;
    risingFast: string;
    fastestDelivery: string;
    ordersThisWeek: string;
    categories: string;
    vegetables: string;
    fruits: string;
    dairy: string;
    meat: string;
    seafood: string;
    bakery: string;
    beverages: string;
    snacks: string;
    organic: string;
    frozen: string;
    household: string;
    personalCare: string;
  };

  // ── Restaurant / Food Module ──────────────────────────────────────────────────
  food: {
    title: string;
    foodDelivery: string;
    restaurants: string;
    cuisines: string;
    menuCategories: string;
    addToCart: string;
    viewMenu: string;
    deliveryTime: string;
    costForTwo: string;
    offer: string;
    bestSellers: string;
    recommended: string;
    topPicks: string;
    pureVeg: string;
    nonVeg: string;
    vegan: string;
    customize: string;
    addOns: string;
    specialInstructions: string;
    repeat: string;
    tableBooking: string;
    dineInAvailable: string;
    takeawayAvailable: string;
    deliveryAvailable: string;
  };

  // ── Pharmacy Module ───────────────────────────────────────────────────────────
  pharmacy: {
    title: string;
    orderMedicine: string;
    uploadPrescription: string;
    searchMedicine: string;
    otcProducts: string;
    prescriptionRequired: string;
    genericAlternative: string;
    addToCart: string;
    dosage: string;
    quantity: string;
    sideEffects: string;
    manufacturer: string;
    expiryDate: string;
    healthProducts: string;
    wellness: string;
  };

  // ── Doctor Module ─────────────────────────────────────────────────────────────
  doctor: {
    title: string;
    findDoctor: string;
    bookAppointment: string;
    specialization: string;
    experience: string;
    consultationFee: string;
    availability: string;
    onlineConsultation: string;
    inClinic: string;
    bookSlot: string;
    viewProfile: string;
    ratings: string;
    patients: string;
    years: string;
    upcomingAppointments: string;
    pastConsultations: string;
  };

  // ── Taxi Module ───────────────────────────────────────────────────────────────
  taxi: {
    title: string;
    bookRide: string;
    whereToGo: string;
    pickupLocation: string;
    dropLocation: string;
    estimatedFare: string;
    estimatedTime: string;
    rideTypes: string;
    sedan: string;
    suv: string;
    auto: string;
    bike: string;
    premium: string;
    driverArriving: string;
    rideInProgress: string;
    rideCompleted: string;
    rateYourRide: string;
    scheduleRide: string;
    currentLocation: string;
  };

  // ── Cart & Checkout ───────────────────────────────────────────────────────────
  cart: {
    myCart: string;
    emptyCart: string;
    emptyCartMessage: string;
    subtotal: string;
    deliveryFee: string;
    discount: string;
    total: string;
    tax: string;
    taxIncluded: string;
    taxExcluded: string;
    applyCoupon: string;
    removeCoupon: string;
    couponCode: string;
    checkout: string;
    continueShopping: string;
    items: string;
    quantity: string;
    pricePerItem: string;
    estimatedDelivery: string;
    deliveryAddress: string;
    changeAddress: string;
    paymentMethod: string;
    changePayment: string;
    placeOrder: string;
    orderConfirmed: string;
    orderConfirmedMessage: string;
    payNow: string;
    cashOnDelivery: string;
    wallet: string;
    card: string;
    upi: string;
    netBanking: string;
  };

  // ── Orders ────────────────────────────────────────────────────────────────────
  orders: {
    myOrders: string;
    orderDetails: string;
    orderId: string;
    orderPlaced: string;
    orderConfirmed: string;
    preparing: string;
    outForDelivery: string;
    delivered: string;
    cancelled: string;
    refunded: string;
    trackOrder: string;
    reorder: string;
    cancelOrder: string;
    rateOrder: string;
    deliveredOn: string;
    expectedDelivery: string;
    orderSummary: string;
    onTheWay: string;
    status: string;
  };

  // ── Admin ─────────────────────────────────────────────────────────────────────
  admin: {
    dashboard: string;
    users: string;
    sellers: string;
    partners: string;
    analytics: string;
    content: string;
    promotions: string;
    commissions: string;
    refunds: string;
    reports: string;
    settings: string;
    moduleManagement: string;
    regions: string;
    createCampaign: string;
    contentPromotions: string;
    contentDescription: string;
    banners: string;
    pushNotifications: string;
    commissionManagement: string;
    commissionDescription: string;
    configure: string;
    totalEarned: string;
    avgRate: string;
    growthVsLastWeek: string;
    customRateOverrides: string;
    moduleCommissionRates: string;
    topCommissionPartners: string;
    globalConfig: string;
    settlementCycle: string;
    minPayoutThreshold: string;
    taxDeduction: string;
    autoApprove: string;
    refundDeduction: string;
    saveConfiguration: string;
    // Table headers
    campaign: string;
    type: string;
    target: string;
    period: string;
    reach: string;
    clicks: string;
    actions: string;
    module: string;
    baseRate: string;
    grossSales: string;
    earned: string;
    lastUpdated: string;
    partner: string;
    rate: string;
    commissionEarned: string;
  };

  // ── Footer ────────────────────────────────────────────────────────────────────
  footer: {
    about: string;
    aboutDescription: string;
    shopAndOrder: string;
    services: string;
    partnerWithUs: string;
    supportLegal: string;
    freshGroceries: string;
    pharmacyMeds: string;
    taxiBooking: string;
    doctorAppointments: string;
    kartseekPay: string;
    loyaltyRewards: string;
    driverDeliveryPortal: string;
    facebook: string;
    twitter: string;
    instagram: string;
    linkedin: string;
  };

  // ── Notifications ─────────────────────────────────────────────────────────────
  notifications: {
    title: string;
    markAllRead: string;
    noNotifications: string;
    orderUpdate: string;
    promotionalOffer: string;
    systemAlert: string;
    newMessage: string;
  };

  // ── Promos ────────────────────────────────────────────────────────────────────
  promos: {
    newUser: string;
    flashSale: string;
    healthDeal: string;
    flat50Off: string;
    onFirstRide: string;
    useCodeAtCheckout: string;
    freeDelivery: string;
    onAllGrocery: string;
    noMinOrder: string;
    todayOnly: string;
    percentOff: string;
    allMedicinesWellness: string;
    useCode: string;
  };

  // ── Errors ────────────────────────────────────────────────────────────────────
  errors: {
    somethingWentWrong: string;
    pageNotFound: string;
    networkError: string;
    unauthorized: string;
    forbidden: string;
    serverError: string;
    timeout: string;
    tryAgain: string;
    goBack: string;
    goHome: string;
    sessionExpired: string;
    invalidInput: string;
  };
}

/**
 * A flattened key path type for dot-notation access.
 * e.g., 'common.loading', 'nav.home', 'home.walletLabel'
 */
export type TranslationKeyPath = {
  [NS in keyof TranslationKeys]: `${NS}.${string & keyof TranslationKeys[NS]}`;
}[keyof TranslationKeys];
