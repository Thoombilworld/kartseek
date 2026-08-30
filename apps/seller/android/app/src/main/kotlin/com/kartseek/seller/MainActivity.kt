package com.kartseek.seller

import io.flutter.embedding.android.FlutterFragmentActivity

/**
 * KARTSEEK Seller App — MainActivity
 *
 * Uses FlutterFragmentActivity (v2 embedding) which is required by:
 *  - flutter_webrtc (WebRTC video calling for the Doctor module)
 *  - local_auth (biometric authentication)
 *
 * The `/seller` WebSocket namespace connection is managed by
 * SellerOrderSocketService in Dart, not here.
 */
class MainActivity : FlutterFragmentActivity()
