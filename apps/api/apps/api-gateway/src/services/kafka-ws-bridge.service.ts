import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { KafkaConsumerService } from '@app/kafka';
import { TrackingGateway } from '../socket.gateway';
import { FranchiseGateway } from '../gateways/franchise.gateway';
import { OrderGateway } from '../gateways/order.gateway';
import { SellerGateway } from '../gateways/seller.gateway';
import { NotificationsGateway } from '../gateways/notifications.gateway';
import { HotelGateway } from '../gateways/hotel.gateway';
import { DoctorQueueGateway } from '../gateways/doctor.gateway';
import { KAFKA_TOPICS } from '@app/kafka';

/**
 * Kafka → WebSocket Bridge
 *
 * Subscribes to all critical Kafka domain events and broadcasts them
 * to connected WebSocket clients in the correct rooms/namespaces.
 *
 * This is the missing link between:
 *  - Backend microservices (publish Kafka events)
 *  - Frontend clients (listen on WebSocket namespaces)
 *
 * Event Flow:
 *   Microservice → Kafka → KafkaWsBridge → WebSocket Gateway → Client
 */
@Injectable()
export class KafkaWsBridgeService implements OnModuleInit {
  private readonly logger = new Logger(KafkaWsBridgeService.name);

  constructor(
    private readonly kafkaConsumer: KafkaConsumerService,
    private readonly trackingGateway: TrackingGateway,
    private readonly franchiseGateway: FranchiseGateway,
    private readonly orderGateway: OrderGateway,
    private readonly sellerGateway: SellerGateway,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly hotelGateway: HotelGateway,
    private readonly doctorGateway: DoctorQueueGateway,
  ) {}

  onModuleInit() {
    if (process.env.SKIP_KAFKA === 'true') {
      this.logger.warn('Kafka-WS Bridge disabled (SKIP_KAFKA=true)');
      return;
    }

    this.registerAllBridges();
    this.registerTier6Bridges();
    this.registerGroceryBridges();
    this.registerRestaurantBridges();
    this.registerPharmacyBridges();
    this.registerDoctorBridges();
    this.registerHotelBridges();
    this.logger.log('✅ Kafka → WebSocket bridge initialized');
  }

  /**
   * A note on picking the gateway, because getting it wrong fails silently.
   *
   * Socket.io rooms are scoped to a namespace, so `to('order:123')` only ever
   * reaches sockets that joined `order:123` *on that same gateway*. Emitting to
   * the right room name on the wrong gateway throws nothing, logs nothing and
   * delivers nothing — the events below looked correct for as long as nobody
   * checked whether a client received them.
   *
   * Which gateway owns which room:
   *   order:<id>      → orderGateway          (`/orders`, joined by `track_order`)
   *   user:<id>       → notificationsGateway  (`/notifications`, joined on connect)
   *   seller:<id>     → sellerGateway         (`/seller`, joined on connect)
   *   pharmacy:<id>   → sellerGateway         (`/seller`, joined by `join_room`)
   *   franchise:<id>  → franchiseGateway      (`/franchise`)
   *   hotel:<id>, owner:<id> → hotelGateway   (`hotel`)
   *
   * `trackingGateway` owns the taxi/delivery location feed and joins rooms
   * named with underscores (`order_<id>`, `trip_<id>`); it is not where order
   * or notification events belong.
   */
  private registerAllBridges() {
    // ── Order Lifecycle Events ──────────────────────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.ORDER_CREATED, async (data) => {
      this.logger.debug(`Bridge: order.created → WS room order:${data['orderId']}`);
      this.orderGateway.server?.to(`order:${data['orderId']}`).emit('order_status', {
        ...data,
        status: 'created',
        timestamp: new Date().toISOString(),
      });
    });

    /**
     * A seller's own new order.
     *
     * `SellerGateway.notifyNewOrder` has existed all along, complete with an
     * offline queue, and **nothing ever called it** — the only order bridge was
     * `order.created`, which carries the customer's whole basket, has no
     * `sellerId`, and is emitted to the order-tracking room. So the seller
     * portal's live toast, its unread badge and its pending-order count never
     * fired once, and a seller had to reload the page to discover they had been
     * paid. This is the missing half of that path.
     */
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.MARKETPLACE_ORDER_PLACED, async (data) => {
      const sellerId = data['sellerId'];
      if (!sellerId) return;
      const items = Array.isArray(data['items']) ? data['items'] : [];
      await this.sellerGateway.notifyNewOrder(String(sellerId), {
        orderId: String(data['orderId'] ?? data['orderNumber'] ?? ''),
        customerName: String(data['customerName'] ?? 'Customer'),
        items: items.length,
        total: Number(data['amount'] ?? 0),
        type: 'marketplace',
        // The seller's own market decides the currency; the toast renders it.
        currency: data['currency'] ? String(data['currency']) : undefined,
      }).catch((err) =>
        this.logger.error(`Bridge: marketplace.order.placed → seller ${sellerId} failed: ${err?.message}`),
      );
    });

    this.kafkaConsumer.subscribe(KAFKA_TOPICS.ORDER_STATUS_UPDATED, async (data) => {
      this.orderGateway.server?.to(`order:${data['orderId']}`).emit('order_status_changed', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    this.kafkaConsumer.subscribe(KAFKA_TOPICS.ORDER_CANCELLED, async (data) => {
      this.orderGateway.server?.to(`order:${data['orderId']}`).emit('order_status_changed', {
        ...data,
        status: 'cancelled',
        timestamp: new Date().toISOString(),
      });
    });

    this.kafkaConsumer.subscribe(KAFKA_TOPICS.ORDER_COMPLETED, async (data) => {
      this.orderGateway.server?.to(`order:${data['orderId']}`).emit('order_status_changed', {
        ...data,
        status: 'delivered',
        timestamp: new Date().toISOString(),
      });
    });

    // ── Delivery Tracking Events ────────────────────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.DELIVERY_PARTNER_ASSIGNED, async (data) => {
      this.orderGateway.server?.to(`order:${data['orderId']}`).emit('delivery_partner_assigned', {
        partnerId: data['partnerId'],
        orderId: data['orderId'],
        timestamp: new Date().toISOString(),
      });
    });

    this.kafkaConsumer.subscribe(KAFKA_TOPICS.DELIVERY_STATUS_UPDATED, async (data) => {
      this.orderGateway.server?.to(`order:${data['orderId']}`).emit('delivery_status_updated', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    // ── Taxi Ride Events ────────────────────────────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.TAXI_RIDE_REQUESTED, async (data) => {
      // Broadcast to all available drivers in the area
      this.trackingGateway.server?.emit('new_ride_request', {
        rideId: data['id'],
        customerId: data['customerId'],
        timestamp: new Date().toISOString(),
      });
    });

    this.kafkaConsumer.subscribe(KAFKA_TOPICS.TAXI_RIDE_STATUS_UPDATED, async (data) => {
      this.trackingGateway.server?.to(`ride:${data['id']}`).emit('ride_status_changed', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    this.kafkaConsumer.subscribe(KAFKA_TOPICS.TAXI_RIDE_COMPLETED, async (data) => {
      this.trackingGateway.server?.to(`ride:${data['id']}`).emit('ride_status_changed', {
        ...data,
        status: 'COMPLETED',
        timestamp: new Date().toISOString(),
      });
    });

    this.kafkaConsumer.subscribe(KAFKA_TOPICS.EMERGENCY_SOS_TRIGGERED, async (data) => {
      this.trackingGateway.server?.to('admin:sos').emit('emergency_sos_alert', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    this.kafkaConsumer.subscribe(KAFKA_TOPICS.TAXI_SOS_TRIGGERED, async (data) => {
      this.trackingGateway.server?.to('admin:sos').emit('emergency_sos_alert', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    // ── Payment Events ──────────────────────────────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.PAYMENT_SUCCESS, async (data) => {
      this.notificationsGateway.server?.to(`user:${data['userId']}`).emit('payment_success', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    this.kafkaConsumer.subscribe(KAFKA_TOPICS.PAYMENT_FAILED, async (data) => {
      this.notificationsGateway.server?.to(`user:${data['userId']}`).emit('payment_failed', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    // ── Notification Events ─────────────────────────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.NOTIFICATION_PUSH, async (data) => {
      const userId = data['userId'] as string;
      if (userId) {
        this.notificationsGateway.server?.to(`user:${userId}`).emit('notification', {
          ...data,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // ── Wallet Events ───────────────────────────────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.WALLET_CREDITED, async (data) => {
      this.notificationsGateway.server?.to(`user:${data['userId']}`).emit('wallet_updated', {
        type: 'credit',
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    this.kafkaConsumer.subscribe(KAFKA_TOPICS.WALLET_DEBITED, async (data) => {
      this.notificationsGateway.server?.to(`user:${data['userId']}`).emit('wallet_updated', {
        type: 'debit',
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    // ── Restaurant Events ───────────────────────────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.RESTAURANT_STATUS_CHANGED, async (data) => {
      this.trackingGateway.server?.to(`restaurant:${data['restaurantId']}`).emit('restaurant_status', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    // ── Refund Events ───────────────────────────────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.REFUND_APPROVED, async (data) => {
      this.notificationsGateway.server?.to(`user:${data['userId']}`).emit('refund_processed', {
        ...data,
        status: 'approved',
        timestamp: new Date().toISOString(),
      });
    });

    // ── Seller Events ───────────────────────────────────────────────────────
    // Emitted on `sellerGateway`, not `trackingGateway`. Socket.io rooms are
    // scoped to their namespace: sellers join `seller:<id>` on `/seller`, so a
    // `seller:<id>` room on the `tracking` namespace is a different room, and
    // one that nothing ever joins — this event was undeliverable.
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.SELLER_PRODUCT_CREATED, async (data) => {
      this.sellerGateway.server?.to(`seller:${data['sellerId']}`).emit('product_created', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    // ── Franchise Events ────────────────────────────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.FRANCHISE_SELLER_STATUS_UPDATED, async (data) => {
      this.franchiseGateway.server?.to(`franchise:${data['franchiseId']}`).emit('seller_status_changed', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    this.logger.log(`Registered ${this.getRegisteredTopicCount()} Kafka → WS bridges`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ TIER 6 — New Event Bridges
  // ═══════════════════════════════════════════════════════════════════════════

  private registerTier6Bridges() {
    // ── Return Lifecycle → Customer order rooms ──────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.RETURN_CREATED, async (data) => {
      this.logger.debug(`Bridge: return.created → WS room order:${data['orderId']}`);
      this.orderGateway.server?.to(`order:${data['orderId']}`).emit('return_update', {
        ...data,
        event: 'return_created',
        timestamp: new Date().toISOString(),
      });
    });

    this.kafkaConsumer.subscribe(KAFKA_TOPICS.RETURN_STATUS_UPDATED, async (data) => {
      this.orderGateway.server?.to(`order:${data['orderId']}`).emit('return_update', {
        ...data,
        event: 'return_status_changed',
        timestamp: new Date().toISOString(),
      });
    });

    this.kafkaConsumer.subscribe(KAFKA_TOPICS.RETURN_PICKUP_ASSIGNED, async (data) => {
      this.orderGateway.server?.to(`order:${data['orderId']}`).emit('return_update', {
        ...data,
        event: 'return_pickup_assigned',
        timestamp: new Date().toISOString(),
      });
    });

    // ── Delivery Assignment → Seller rooms ───────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.DELIVERY_ASSIGNMENT_CREATED, async (data) => {
      this.logger.debug(`Bridge: delivery.assigned → WS room seller:${data['sellerId']}`);
      this.sellerGateway.server?.to(`seller:${data['sellerId']}`).emit('delivery_assigned', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    // ── Variant Low Stock → Seller rooms ─────────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.VARIANT_LOW_STOCK, async (data) => {
      this.sellerGateway.server?.to(`seller:${data['sellerId']}`).emit('low_stock_alert', {
        ...data,
        type: 'variant',
        timestamp: new Date().toISOString(),
      });
    });

    // ── Q&A Events → Seller rooms ───────────────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.QA_QUESTION_POSTED, async (data) => {
      this.sellerGateway.server?.to(`seller:${data['sellerId']}`).emit('new_question', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    this.kafkaConsumer.subscribe(KAFKA_TOPICS.QA_ANSWER_POSTED, async (data) => {
      // Notify the customer who asked the question
      if (data['customerId']) {
        this.notificationsGateway.server?.to(`user:${data['customerId']}`).emit('question_answered', {
          ...data,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // ── Shipment Tracking → Order rooms ──────────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.SHIPMENT_TRACKING_UPDATED, async (data) => {
      this.orderGateway.server?.to(`order:${data['orderId']}`).emit('tracking_update', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    // ── Coupon Events → Notification broadcasts ─────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.COUPON_REDEEMED, async (data) => {
      if (data['customerId']) {
        this.notificationsGateway.server?.to(`user:${data['customerId']}`).emit('promo_update', {
          ...data,
          event: 'coupon_applied',
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ GROCERY — Kafka → WebSocket Bridges
  // ═══════════════════════════════════════════════════════════════════════════

  private registerGroceryBridges() {
    // ── New grocery order → notify store owner ──────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.GROCERY_ORDER_CREATED, async (data) => {
      this.logger.debug(`Bridge: grocery.order.created → WS room seller:${data['storeId']}`);
      this.sellerGateway.server?.to(`seller:${data['storeId']}`).emit('grocery_new_order', {
        ...data,
        event: 'grocery_order_created',
        timestamp: new Date().toISOString(),
      });
      // Also push to order tracking room for the customer
      this.orderGateway.server?.to(`order:${data['orderId']}`).emit('order_status', {
        ...data,
        status: 'created',
        timestamp: new Date().toISOString(),
      });
    });

    // ── Grocery order status updated → order room ──────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.GROCERY_ORDER_STATUS_UPDATED, async (data) => {
      this.orderGateway.server?.to(`order:${data['orderId']}`).emit('order_status', {
        ...data,
        timestamp: new Date().toISOString(),
      });
      // Also notify the store owner
      if (data['storeId']) {
        this.sellerGateway.server?.to(`seller:${data['storeId']}`).emit('grocery_order_update', {
          ...data,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // ── Grocery store approved → notify store owner ────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.GROCERY_STORE_APPROVED, async (data) => {
      this.logger.debug(`Bridge: grocery.store.approved → WS room seller:${data['ownerId']}`);
      this.sellerGateway.server?.to(`seller:${data['ownerId']}`).emit('store_status_changed', {
        ...data,
        event: 'store_approved',
        timestamp: new Date().toISOString(),
      });
      if (data['ownerId']) {
        this.notificationsGateway.server?.to(`user:${data['ownerId']}`).emit('notification', {
          id: `notif_${Date.now()}`,
          title: 'Store Approved! 🎉',
          body: `Your grocery store "${data['storeName'] || ''}" has been approved.`,
          type: 'system',
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    });

    // ── Grocery store suspended → notify store owner ───────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.GROCERY_STORE_SUSPENDED, async (data) => {
      this.sellerGateway.server?.to(`seller:${data['ownerId']}`).emit('store_status_changed', {
        ...data,
        event: 'store_suspended',
        timestamp: new Date().toISOString(),
      });
    });

    // ── Grocery low inventory → alert store owner ──────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.GROCERY_INVENTORY_LOW, async (data) => {
      this.logger.debug(`Bridge: grocery.inventory.low → WS room seller:${data['storeId']}`);
      this.sellerGateway.server?.to(`seller:${data['storeId']}`).emit('low_stock_alert', {
        ...data,
        type: 'grocery',
        timestamp: new Date().toISOString(),
      });
    });

    // ── Grocery delivery requested → tracking gateway ──────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.GROCERY_DELIVERY_REQUESTED, async (data) => {
      this.orderGateway.server?.to(`order:${data['orderId']}`).emit('delivery_requested', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    // ── Grocery product created → notify store owner ───────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.GROCERY_PRODUCT_CREATED, async (data) => {
      this.sellerGateway.server?.to(`seller:${data['storeId']}`).emit('grocery_product_created', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    // ── Grocery listing moderated → notify the seller, refresh admin queue ──
    // Section 3 of the governance spec: the seller portal learns the outcome as
    // soon as it is decided, rather than on the seller's next manual refresh.
    for (const [topic, event] of [
      [KAFKA_TOPICS.GROCERY_PRODUCT_APPROVED, 'grocery_product_approved'],
      [KAFKA_TOPICS.GROCERY_PRODUCT_REJECTED, 'grocery_product_rejected'],
    ] as const) {
      this.kafkaConsumer.subscribe(topic, async (data) => {
        const payload = { ...data, timestamp: new Date().toISOString() };
        this.sellerGateway.server?.to(`seller:${data['storeId']}`).emit(event, payload);
        // The moderation queue shrinks by one; admins watching it get the update
        // without polling.
        this.sellerGateway.server?.to('admin:grocery').emit('grocery_moderation_updated', payload);
      });
    }

    // ── Grocery category updated → broadcast to admin ──────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.GROCERY_CATEGORY_UPDATED, async (data) => {
      this.sellerGateway.server?.to('admin:grocery').emit('grocery_category_updated', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    this.logger.log('Registered 10 Grocery Kafka → WS bridges');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ██ RESTAURANT — Kafka → WebSocket Bridges
  // ═══════════════════════════════════════════════════════════════════════════

  private registerRestaurantBridges() {
    // ── Restaurant approved → notify restaurant owner ──────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.RESTAURANT_APPROVED, async (data) => {
      this.logger.debug(`Bridge: restaurant.approved → WS room seller:${data['ownerId']}`);
      this.sellerGateway.server?.to(`seller:${data['ownerId']}`).emit('restaurant_approved', {
        ...data,
        timestamp: new Date().toISOString(),
      });
      if (data['ownerId']) {
        this.notificationsGateway.server?.to(`user:${data['ownerId']}`).emit('notification', {
          id: `notif_${Date.now()}`,
          title: 'Restaurant Approved! 🍽️',
          body: `Your restaurant "${data['restaurantName'] || ''}" is now live on KARTSEEK.`,
          type: 'system',
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    });

    // ── Menu item created → push to restaurant room ────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.RESTAURANT_MENU_ITEM_CREATED, async (data) => {
      this.logger.debug(`Bridge: restaurant.menu_item.created → WS room restaurant:${data['restaurantId']}`);
      this.trackingGateway.server?.to(`restaurant:${data['restaurantId']}`).emit('menu_item_created', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    // ── Table booked → push to restaurant staff room ───────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.RESTAURANT_TABLE_BOOKED, async (data) => {
      this.logger.debug(`Bridge: restaurant.table.booked → WS room restaurant:${data['restaurantId']}`);
      this.trackingGateway.server?.to(`restaurant:${data['restaurantId']}`).emit('table_booked', {
        ...data,
        timestamp: new Date().toISOString(),
      });
      // Also notify the customer
      if (data['customerId']) {
        this.notificationsGateway.server?.to(`user:${data['customerId']}`).emit('notification', {
          id: `notif_${Date.now()}`,
          title: 'Table Reserved! ✅',
          body: `Your table at "${data['restaurantName'] || 'the restaurant'}" is confirmed.`,
          type: 'order',
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    });

    this.logger.log('Registered 3 Restaurant Kafka → WS bridges');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Pharmacy Bridges
  // ═══════════════════════════════════════════════════════════════════════════

  private registerPharmacyBridges() {
    // ── Order Created ────────────────────────────────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.PHARMACY_ORDER_CREATED, async (data) => {
      this.logger.debug(`Bridge: pharmacy.order.created → WS room pharmacy:${data['storeId']}`);
      this.sellerGateway.server?.to(`pharmacy:${data['storeId']}`).emit('pharmacy_new_order', {
        ...data,
        timestamp: new Date().toISOString(),
      });
      if (data['customerId']) {
        this.notificationsGateway.server?.to(`user:${data['customerId']}`).emit('notification', {
          id: `notif_${Date.now()}`,
          title: 'Order Placed! 💊',
          body: `Your pharmacy order ${data['orderNumber']} has been placed.`,
          type: 'order',
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    });

    // ── Order Status Updated ─────────────────────────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.PHARMACY_ORDER_STATUS_UPDATED, async (data) => {
      this.logger.debug(`Bridge: pharmacy.order.status_updated → WS`);
      this.sellerGateway.server?.to(`pharmacy:${data['storeId']}`).emit('pharmacy_order_update', {
        ...data,
        timestamp: new Date().toISOString(),
      });
      if (data['customerId']) {
        this.orderGateway.server?.to(`order:${data['id']}`).emit('pharmacy_order_status', {
          ...data,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // ── Order Completed ──────────────────────────────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.PHARMACY_ORDER_COMPLETED, async (data) => {
      this.logger.debug(`Bridge: pharmacy.order.completed → WS`);
      this.sellerGateway.server?.to(`pharmacy:${data['storeId']}`).emit('pharmacy_order_update', {
        ...data,
        status: 'COMPLETED',
        timestamp: new Date().toISOString(),
      });
      if (data['customerId']) {
        this.orderGateway.server?.to(`order:${data['id']}`).emit('pharmacy_order_status', {
          ...data,
          status: 'COMPLETED',
          timestamp: new Date().toISOString(),
        });
        this.notificationsGateway.server?.to(`user:${data['customerId']}`).emit('notification', {
          id: `notif_${Date.now()}`,
          title: 'Order Delivered! ✅',
          body: `Your pharmacy order ${data['orderNumber'] || ''} has been delivered.`,
          type: 'order',
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    });

    // ── Prescription Uploaded ────────────────────────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.PHARMACY_PRESCRIPTION_UPLOADED, async (data) => {
      this.logger.debug(`Bridge: pharmacy.prescription.uploaded → WS room pharmacy:${data['storeId'] || 'admin'}`);
      // Scope to the targeted store room; fall back to admin room if no store specified
      if (data['storeId']) {
        this.sellerGateway.server?.to(`pharmacy:${data['storeId']}`).emit('pharmacy_prescription_uploaded', {
          ...data,
          timestamp: new Date().toISOString(),
        });
      } else {
        // No store specified — notify admin prescriptions queue
        this.sellerGateway.server?.to('admin:pharmacy').emit('pharmacy_prescription_uploaded', {
          ...data,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // ── Prescription Verified ────────────────────────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.PHARMACY_PRESCRIPTION_VERIFIED, async (data) => {
      this.logger.debug(`Bridge: pharmacy.prescription.verified → WS`);
      if (data['customerId']) {
        this.notificationsGateway.server?.to(`user:${data['customerId']}`).emit('notification', {
          id: `notif_${Date.now()}`,
          title: data['status'] === 'VERIFIED_APPROVED' ? 'Prescription Approved ✅' : 'Prescription Rejected ❌',
          body: data['status'] === 'VERIFIED_APPROVED'
            ? 'Your prescription has been verified. Your order will proceed.'
            : 'Your prescription was not accepted. Please upload a valid one.',
          type: 'order',
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    });

    // ── Store Approved ───────────────────────────────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.PHARMACY_STORE_APPROVED, async (data) => {
      this.logger.debug(`Bridge: pharmacy.store.approved → WS`);
      this.sellerGateway.server?.to(`pharmacy:${data['id']}`).emit('pharmacy_store_approved', {
        ...data,
        timestamp: new Date().toISOString(),
      });
      if (data['ownerId']) {
        this.notificationsGateway.server?.to(`user:${data['ownerId']}`).emit('notification', {
          id: `notif_${Date.now()}`,
          title: 'Pharmacy Store Approved! 🎉',
          body: `Your pharmacy "${data['name'] || ''}" is now live on KARTSEEK.`,
          type: 'system',
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    });

    // ── Store Suspended ──────────────────────────────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.PHARMACY_STORE_SUSPENDED, async (data) => {
      this.logger.debug(`Bridge: pharmacy.store.suspended → WS room pharmacy:${data['id']}`);
      this.sellerGateway.server?.to(`pharmacy:${data['id']}`).emit('pharmacy_store_suspended', {
        ...data,
        timestamp: new Date().toISOString(),
      });
      if (data['ownerId']) {
        this.notificationsGateway.server?.to(`user:${data['ownerId']}`).emit('notification', {
          id: `notif_${Date.now()}`,
          title: 'Store Suspended ⚠️',
          body: `Your pharmacy has been suspended. ${data['reason'] ? `Reason: ${data['reason']}` : 'Contact support for details.'}`,
          type: 'system',
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    });

    // ── Low Stock ────────────────────────────────────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.PHARMACY_LOW_STOCK, async (data) => {
      this.logger.debug(`Bridge: pharmacy.low_stock → WS room pharmacy:${data['storeId']}`);
      this.sellerGateway.server?.to(`pharmacy:${data['storeId']}`).emit('pharmacy_low_stock', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    // ── Delivery Requested ───────────────────────────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.PHARMACY_DELIVERY_REQUESTED, async (data) => {
      this.logger.debug(`Bridge: pharmacy.delivery.requested → WS`);
      this.orderGateway.server?.to(`order:${data['orderId']}`).emit('delivery_requested', {
        ...data,
        service: 'pharmacy',
        timestamp: new Date().toISOString(),
      });
      this.sellerGateway.server?.to(`pharmacy:${data['storeId']}`).emit('pharmacy_delivery_requested', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    // ── Delivery Completed ───────────────────────────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.PHARMACY_DELIVERY_COMPLETED, async (data) => {
      this.logger.debug(`Bridge: pharmacy.delivery.completed → WS`);
      this.orderGateway.server?.to(`order:${data['orderId']}`).emit('delivery_completed', {
        ...data,
        service: 'pharmacy',
        timestamp: new Date().toISOString(),
      });
      this.sellerGateway.server?.to(`pharmacy:${data['storeId']}`).emit('pharmacy_delivery_completed', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    this.logger.log('Registered 10 Pharmacy Kafka → WS bridges');
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // ██ DOCTOR — Kafka → WebSocket Bridges
  // ═════════════════════════════════════════════════════════════════════════════

  private registerDoctorBridges() {
    // ── Appointment booked → notify doctor + customer ───────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.DOCTOR_APPOINTMENT_BOOKED, async (data) => {
      this.logger.debug(`Bridge: doctor.appointment.booked → WS`);
      // Notify doctor's seller room
      if (data['doctorId']) {
        this.sellerGateway.server?.to(`seller:${data['doctorId']}`).emit('new_booking', {
          ...data,
          bookingType: 'appointment',
          timestamp: new Date().toISOString(),
        });
      }
      // Notify patient
      if (data['customerId']) {
        this.notificationsGateway.server?.to(`user:${data['customerId']}`).emit('notification', {
          id: `notif_${Date.now()}`,
          title: 'Appointment Booked! \uD83C\uDFE5',
          body: `Your appointment with Dr. ${data['doctorName'] || ''} is confirmed.`,
          type: 'order',
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    });

    // ── Appointment cancelled → notify both parties ────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.DOCTOR_APPOINTMENT_CANCELLED, async (data) => {
      if (data['doctorId']) {
        this.sellerGateway.server?.to(`seller:${data['doctorId']}`).emit('appointment_cancelled', {
          ...data,
          timestamp: new Date().toISOString(),
        });
      }
      if (data['customerId']) {
        this.notificationsGateway.server?.to(`user:${data['customerId']}`).emit('notification', {
          id: `notif_${Date.now()}`,
          title: 'Appointment Cancelled \u274C',
          body: `Your appointment ${data['appointmentId'] || ''} has been cancelled.`,
          type: 'order',
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    });

    // ── Token advanced → doctor-queue namespace ───────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.DOCTOR_TOKEN_ADVANCED, async (data) => {
      this.logger.debug(`Bridge: doctor.token.advanced → WS doctor-queue`);
      this.doctorGateway.server?.to(`doctor_queue:${data['doctorId']}`).emit('token_advanced', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    // ── Queue updated → doctor-queue namespace ───────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.DOCTOR_QUEUE_UPDATED, async (data) => {
      this.doctorGateway.server?.to(`doctor_queue:${data['doctorId']}`).emit('queue_updated', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    // ── Appointment reminder → notify patient ────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.DOCTOR_APPOINTMENT_REMINDER, async (data) => {
      if (data['customerId']) {
        this.notificationsGateway.server?.to(`user:${data['customerId']}`).emit('notification', {
          id: `notif_${Date.now()}`,
          title: 'Appointment Reminder \u23F0',
          body: `Your appointment with Dr. ${data['doctorName'] || ''} is coming up${data['minutesUntil'] ? ` in ${data['minutesUntil']} minutes` : ''}.`,
          type: 'order',
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
      // Also push to doctor-queue namespace
      this.doctorGateway.server?.to(`doctor_queue:${data['doctorId']}`).emit('appointment_reminder', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    // ── Appointment rescheduled → notify patient ─────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.DOCTOR_APPOINTMENT_RESCHEDULED, async (data) => {
      if (data['customerId']) {
        this.notificationsGateway.server?.to(`user:${data['customerId']}`).emit('notification', {
          id: `notif_${Date.now()}`,
          title: 'Appointment Rescheduled \uD83D\uDCC5',
          body: `Your appointment has been rescheduled${data['newDate'] ? ` to ${data['newDate']}` : ''}.`,
          type: 'order',
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    });

    // ── Prescription issued → notify patient ────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.DOCTOR_PRESCRIPTION_ISSUED, async (data) => {
      if (data['customerId']) {
        this.notificationsGateway.server?.to(`user:${data['customerId']}`).emit('notification', {
          id: `notif_${Date.now()}`,
          title: 'Prescription Ready \uD83D\uDCCB',
          body: `Dr. ${data['doctorName'] || 'your doctor'} has issued a prescription.`,
          type: 'order',
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    });

    // ── Doctor status changed → notify admin ────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.DOCTOR_STATUS_CHANGED, async (data) => {
      this.sellerGateway.server?.to('admin:sellers').emit('seller_event', {
        ...data,
        event: 'doctor_status_changed',
        timestamp: new Date().toISOString(),
      });
    });

    this.logger.log('Registered 8 Doctor Kafka → WS bridges');
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // ██ HOTEL — Kafka → WebSocket Bridges
  // ═════════════════════════════════════════════════════════════════════════════

  private registerHotelBridges() {
    // ── Booking confirmed → hotel gateway ────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.HOTEL_BOOKING_CONFIRMED, async (data) => {
      this.logger.debug(`Bridge: hotel.booking.confirmed → WS`);
      this.hotelGateway.pushBookingConfirmation(data as any);
      // Also send customer notification
      if (data['customerId']) {
        this.notificationsGateway.server?.to(`user:${data['customerId']}`).emit('notification', {
          id: `notif_${Date.now()}`,
          title: 'Booking Confirmed! \uD83C\uDFE8',
          body: `Your hotel booking ${data['bookingId'] || ''} is confirmed.`,
          type: 'order',
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    });

    // ── Booking cancelled → hotel gateway ────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.HOTEL_BOOKING_CANCELLED, async (data) => {
      this.hotelGateway.pushBookingCancellation(data as any);
      if (data['customerId']) {
        this.notificationsGateway.server?.to(`user:${data['customerId']}`).emit('notification', {
          id: `notif_${Date.now()}`,
          title: 'Booking Cancelled \u274C',
          body: `Your hotel booking has been cancelled.${data['reason'] ? ` Reason: ${data['reason']}` : ''}`,
          type: 'order',
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    });

    // ── Guest checked in → hotel gateway ────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.HOTEL_GUEST_CHECKED_IN, async (data) => {
      this.hotelGateway.pushCheckInNotification(data as any);
    });

    // ── Guest checked out → owner dashboard ─────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.HOTEL_GUEST_CHECKED_OUT, async (data) => {
      if (data['ownerId']) {
        this.hotelGateway.server?.to(`owner:${data['ownerId']}`).emit('guest_checked_out', {
          ...data,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // ── Room availability changed → hotel room ──────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.HOTEL_ROOM_AVAILABILITY_CHANGED, async (data) => {
      this.hotelGateway.server?.to(`hotel:${data['hotelId']}`).emit('availability_updated', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    // ── Price changed → hotel room ───────────────────────────────
    this.kafkaConsumer.subscribe(KAFKA_TOPICS.HOTEL_PRICE_CHANGED, async (data) => {
      this.hotelGateway.server?.to(`hotel:${data['hotelId']}`).emit('price_changed', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    this.logger.log('Registered 6 Hotel Kafka → WS bridges');
  }

  private getRegisteredTopicCount(): number {
    return 64; // 19 original + 10 Tier 6 + 8 Grocery + 3 Restaurant + 10 Pharmacy + 8 Doctor + 6 Hotel
  }
}

