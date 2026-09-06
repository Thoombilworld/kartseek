/**
 * KARTSEEK gRPC TypeScript Interfaces
 * Auto-aligned with .proto definitions in /proto/*.proto
 * Use these types when injecting gRPC clients with @GrpcService decorators.
 */
import { type Observable } from 'rxjs';

// ── Shared ────────────────────────────────────────────────────────────────────

export interface StatusResponse  { success: boolean; message: string; }
export type EmptyRequest = Record<string, never>;

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidateTokenRequest  { token: string; }
export interface ValidateTokenResponse { isValid: boolean; userId: string; role: string; email: string; expiresAt: number; }
export interface GetUserRequest        { userId: string; }
export interface LoginRequest          { email: string; password: string; deviceId?: string; }
export interface RegisterRequest       { name: string; email: string; phone: string; password: string; role?: string; country?: string; }
export interface RefreshTokenRequest   { refreshToken: string; }
export interface LogoutRequest         { userId: string; refreshToken: string; }
export interface CheckPermissionRequest { userId: string; permission: string; }
export interface CheckPermissionResponse { hasPermission: boolean; reason: string; }
export interface UpdateRoleRequest     { userId: string; newRole: string; adminId: string; }
export interface BanUserRequest        { userId: string; reason: string; adminId: string; }

export interface UserGrpcResponse {
  id: string; email: string; phone: string; name: string; role: string;
  status: string; country: string; avatarUrl: string; createdAt: string; kycVerified: boolean;
}
export interface AuthTokenResponse { accessToken: string; refreshToken: string; expiresIn: number; user: UserGrpcResponse; }

export interface AuthServiceGrpc {
  validateToken(data: ValidateTokenRequest): Observable<ValidateTokenResponse>;
  getUser(data: GetUserRequest): Observable<UserGrpcResponse>;
  login(data: LoginRequest): Observable<AuthTokenResponse>;
  register(data: RegisterRequest): Observable<AuthTokenResponse>;
  refreshToken(data: RefreshTokenRequest): Observable<AuthTokenResponse>;
  logout(data: LogoutRequest): Observable<StatusResponse>;
  checkPermission(data: CheckPermissionRequest): Observable<CheckPermissionResponse>;
  updateRole(data: UpdateRoleRequest): Observable<StatusResponse>;
  banUser(data: BanUserRequest): Observable<StatusResponse>;
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER
// ─────────────────────────────────────────────────────────────────────────────

export interface OrderItemGrpc { productId: string; name: string; quantity: number; price: number; variantId?: string; imageUrl?: string; }
export interface DriverInfoGrpc { name: string; phone: string; lat: number; lng: number; heading: number; speed: number; }
export interface TimelineEventGrpc { status: string; at: string; done: boolean; }

export interface PlaceOrderRequest {
  customerId: string; items: OrderItemGrpc[]; deliveryAddress: string;
  serviceType: string; paymentMethod: string; couponCode?: string; walletAmount?: number; notes?: string;
}
export interface GetOrderRequest      { orderId: string; }
export interface UpdateStatusRequest  { orderId: string; status: string; updatedBy: string; }
export interface CancelOrderRequest   { orderId: string; reason: string; cancelledBy: string; }
export interface GetCustomerOrdersRequest { customerId: string; page: number; limit: number; status?: string; }
export interface GetSellerOrdersRequest   { sellerId: string; page: number; limit: number; status?: string; }

export interface OrderGrpcResponse {
  id: string; customerId: string; items: OrderItemGrpc[]; subtotal: number; deliveryFee: number;
  discount: number; totalAmount: number; deliveryAddress: string; serviceType: string;
  paymentMethod: string; status: string; notes?: string; placedAt: string;
  estimatedDeliveryAt: string; updatedAt?: string;
}
export interface TrackingResponse { orderId: string; status: string; estimatedDeliveryAt: string; driver?: DriverInfoGrpc; timeline: TimelineEventGrpc[]; }
export interface OrderListResponse { data: OrderGrpcResponse[]; total: number; page: number; limit: number; }

export interface OrderServiceGrpc {
  placeOrder(data: PlaceOrderRequest): Observable<OrderGrpcResponse>;
  getOrderById(data: GetOrderRequest): Observable<OrderGrpcResponse>;
  getOrderTracking(data: GetOrderRequest): Observable<TrackingResponse>;
  updateOrderStatus(data: UpdateStatusRequest): Observable<StatusResponse>;
  cancelOrder(data: CancelOrderRequest): Observable<StatusResponse>;
  getCustomerOrders(data: GetCustomerOrdersRequest): Observable<OrderListResponse>;
  getSellerOrders(data: GetSellerOrdersRequest): Observable<OrderListResponse>;
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT
// ─────────────────────────────────────────────────────────────────────────────

export interface InitiatePaymentRequest { orderId: string; userId: string; amount: number; currency: string; gateway: string; callbackUrl?: string; }
export interface VerifyPaymentRequest   { gateway: string; paymentId: string; orderId: string; razorpaySignature?: string; stripePaymentIntentId?: string; }
export interface RefundRequest          { orderId: string; userId: string; amount: number; reason: string; itemIds?: string[]; }
export interface WalletTransactionRequest { userId: string; amount: number; reason: string; referenceId?: string; }
export interface GetTransactionsRequest { userId: string; page: number; limit: number; }

export interface PaymentGrpcResponse { id: string; orderId: string; status: string; amount: number; currency: string; gateway: string; paymentToken?: string; checkoutUrl?: string; createdAt: string; }
export interface RefundGrpcResponse  { id: string; orderId: string; status: string; amount: number; reason: string; requestedAt: string; processedAt?: string; }
export interface WalletResponse      { userId: string; balance: number; currency: string; lastUpdated: string; }
export interface Transaction         { id: string; type: string; amount: number; reason: string; referenceId?: string; createdAt: string; }
export interface TransactionListResponse { data: Transaction[]; total: number; page: number; limit: number; }

export interface PaymentServiceGrpc {
  initiatePayment(data: InitiatePaymentRequest): Observable<PaymentGrpcResponse>;
  verifyPayment(data: VerifyPaymentRequest): Observable<PaymentGrpcResponse>;
  getPaymentByOrder(data: { orderId: string }): Observable<PaymentGrpcResponse>;
  requestRefund(data: RefundRequest): Observable<RefundGrpcResponse>;
  getRefundStatus(data: { refundId: string }): Observable<RefundGrpcResponse>;
  getWalletBalance(data: { userId: string }): Observable<WalletResponse>;
  creditWallet(data: WalletTransactionRequest): Observable<WalletResponse>;
  debitWallet(data: WalletTransactionRequest): Observable<WalletResponse>;
  getTransactions(data: GetTransactionsRequest): Observable<TransactionListResponse>;
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export interface PushRequest      { userId: string; title: string; body: string; type: string; imageUrl?: string; data?: Record<string, string>; }
export interface SmsRequest       { phone: string; message: string; type?: string; }
export interface EmailRequest     { to: string; subject: string; templateId: string; variables?: Record<string, string>; }
export interface BroadcastRequest { title: string; body: string; targetRole: string; targetCountry?: string; imageUrl?: string; }
export interface NotifResponse    { success: boolean; id: string; message: string; }
export interface NotificationGrpc { id: string; userId: string; title: string; body: string; type: string; isRead: boolean; imageUrl?: string; createdAt: string; }
export interface NotifListResponse { data: NotificationGrpc[]; total: number; page: number; limit: number; }

export interface NotificationServiceGrpc {
  sendPushNotification(data: PushRequest): Observable<NotifResponse>;
  sendSMS(data: SmsRequest): Observable<NotifResponse>;
  sendEmail(data: EmailRequest): Observable<NotifResponse>;
  broadcastPromo(data: BroadcastRequest): Observable<NotifResponse>;
  markAsRead(data: { notificationId: string; userId: string }): Observable<NotifResponse>;
  getUserNotifications(data: { userId: string; page: number; limit: number }): Observable<NotifListResponse>;
  getUnreadCount(data: { userId: string }): Observable<{ userId: string; unreadCount: number }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// TAXI
// ─────────────────────────────────────────────────────────────────────────────

export interface EstimateRequest    { pickupLat: number; pickupLng: number; dropLat: number; dropLng: number; vehicleType: string; }
export interface EstimateResponse   { vehicleType: string; distanceKm: number; estimatedFare: number; estimatedFareRange: string; etaMinutes: number; surgeMultiplier: number; }
export interface RequestRideInput   { customerId: string; pickupLat: number; pickupLng: number; dropLat: number; dropLng: number; vehicleType: string; paymentMethod: string; }
export interface RideGrpcResponse   { id: string; customerId: string; driverId?: string; status: string; pickupLat: number; pickupLng: number; dropLat: number; dropLng: number; vehicleType: string; fare?: number; paymentMethod: string; createdAt: string; updatedAt?: string; }
export interface TaxiDriverInfo     { driverId: string; lat: number; lng: number; distKm: number; etaMins: number; vehicleType: string; rating: number; }

export interface TaxiServiceGrpc {
  estimateFare(data: EstimateRequest): Observable<EstimateResponse>;
  requestRide(data: RequestRideInput): Observable<RideGrpcResponse>;
  getRideById(data: { rideId: string }): Observable<RideGrpcResponse>;
  updateRideStatus(data: { rideId: string; status: string; driverId?: string }): Observable<StatusResponse>;
  getNearbyDrivers(data: { lat: number; lng: number; radiusKm: number; vehicleType?: string }): Observable<{ drivers: TaxiDriverInfo[]; count: number }>;
  getRideHistory(data: { actorId: string; role: string; page: number; limit: number }): Observable<{ data: RideGrpcResponse[]; total: number; page: number; limit: number }>;
  acceptRide(data: { rideId: string; driverId: string }): Observable<RideGrpcResponse>;
  cancelRide(data: { rideId: string; reason: string; cancelledBy: string }): Observable<StatusResponse>;
}

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY
// ─────────────────────────────────────────────────────────────────────────────

export interface AssignPartnerRequest { orderId: string; serviceType: string; pickupLat?: number; pickupLng?: number; dropLat?: number; dropLng?: number; }
export interface AssignmentResponse   { orderId: string; partnerId: string; serviceType: string; status: string; assignedAt: string; updatedAt?: string; }
export interface FeeEstimateResponse  { distanceKm: number; fee: number; baseFee: number; distanceFee: number; weightFee: number; }

export interface DeliveryServiceGrpc {
  assignPartner(data: AssignPartnerRequest): Observable<AssignmentResponse>;
  getDeliveryStatus(data: { orderId: string }): Observable<AssignmentResponse>;
  updateDeliveryStatus(data: { orderId: string; status: string; partnerId: string; lat?: number; lng?: number }): Observable<StatusResponse>;
  getPartnerDeliveries(data: { partnerId: string; page: number; limit: number }): Observable<{ data: AssignmentResponse[]; total: number }>;
  estimateDeliveryFee(data: { distanceKm: number; weightKg?: number; serviceType?: string }): Observable<FeeEstimateResponse>;
  getActiveDelivery(data: { partnerId: string }): Observable<AssignmentResponse>;
}

// ─────────────────────────────────────────────────────────────────────────────
// RESTAURANT
// ─────────────────────────────────────────────────────────────────────────────

export interface GeoPoint           { lat: number; lng: number; }
export interface MenuItemGrpc       { id: string; restaurantId: string; name: string; price: number; description?: string; isVeg: boolean; isAvailable: boolean; isBestseller: boolean; category: string; imageUrl?: string; rating: number; status: string; }
export interface MenuCategoryGrpc   { name: string; items: MenuItemGrpc[]; }
export interface RestaurantGrpcResponse { id: string; name: string; slug: string; cuisine: string; isOpen: boolean; rating: number; ratingCount: number; deliveryTime: string; minOrder: number; location: GeoPoint; address: string; imageUrl?: string; distKm?: number; status: string; openHours?: string; }
export interface BookingGrpc        { id: string; restaurantId: string; userId: string; date: string; time: string; guests: number; status: string; createdAt: string; }

export interface RestaurantServiceGrpc {
  getNearbyRestaurants(data: { lat: number; lng: number; radiusKm?: number; cuisine?: string; page?: number; limit?: number }): Observable<{ data: RestaurantGrpcResponse[]; total: number }>;
  getRestaurantById(data: { restaurantId: string }): Observable<RestaurantGrpcResponse>;
  getRestaurantMenu(data: { restaurantId: string }): Observable<{ restaurantId: string; categories: MenuCategoryGrpc[] }>;
  addMenuItem(data: Partial<MenuItemGrpc> & { restaurantId: string }): Observable<MenuItemGrpc>;
  updateMenuItem(data: Partial<MenuItemGrpc> & { itemId: string }): Observable<MenuItemGrpc>;
  deleteMenuItem(data: { itemId: string; restaurantId: string }): Observable<StatusResponse>;
  bookTable(data: Omit<BookingGrpc, 'id' | 'status' | 'createdAt'>): Observable<BookingGrpc>;
  getBookings(data: { restaurantId: string; date: string }): Observable<{ data: BookingGrpc[]; total: number }>;
  toggleStatus(data: { restaurantId: string; isOnline: boolean }): Observable<StatusResponse>;
  approveRestaurant(data: { restaurantId: string; adminId: string }): Observable<StatusResponse>;
  getPendingApprovals(data: EmptyRequest): Observable<{ data: RestaurantGrpcResponse[]; total: number }>;
}
