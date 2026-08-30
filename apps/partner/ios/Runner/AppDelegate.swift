import Flutter
import UIKit
import CoreLocation
import GoogleMaps

@main
@objc class AppDelegate: FlutterAppDelegate, CLLocationManagerDelegate {
  private var locationManager: CLLocationManager?
  private var locationResult: FlutterResult?

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // ── Google Maps API Key ─────────────────────────────────────────────
    // Read from Info.plist first (for CI/CD injection), fallback to hardcoded.
    let mapsKey: String
    if let plistKey = Bundle.main.object(forInfoDictionaryKey: "GMSApiKey") as? String,
       !plistKey.isEmpty, !plistKey.hasPrefix("YOUR_") {
      mapsKey = plistKey
    } else {
      mapsKey = "YOUR_GOOGLE_MAPS_API_KEY_HERE"
      debugPrint("[KARTSEEK Partner] ⚠️ Using fallback Google Maps key — set GMSApiKey in Info.plist for production")
    }
    GMSServices.provideAPIKey(mapsKey)

    let controller : FlutterViewController = window?.rootViewController as! FlutterViewController
    let locationChannel = FlutterMethodChannel(name: "com.kartseek.partner/location",
                                              binaryMessenger: controller.binaryMessenger)
    
    locationChannel.setMethodCallHandler({
      [weak self] (call: FlutterMethodCall, result: @escaping FlutterResult) -> Void in
      if call.method == "getHardwareLocation" {
        self?.getHardwareLocation(result: result)
      } else {
        result(FlutterMethodNotImplemented)
      }
    })

    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // ── Deep Link Handlers ──────────────────────────────────────────────

  /// Handle Universal Links (https://partner.kartseek.com/...)
  override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    if userActivity.activityType == NSUserActivityTypeBrowsingWeb,
       let url = userActivity.webpageURL {
      debugPrint("[KARTSEEK Partner] 🔗 Universal Link: \(url)")
    }
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler)
  }

  /// Handle custom URL scheme: kartseek-partner://
  override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey : Any] = [:]
  ) -> Bool {
    debugPrint("[KARTSEEK Partner] 🔗 Custom URL: \(url)")
    return super.application(app, open: url, options: options)
  }

  // ── Hardware Location ───────────────────────────────────────────────

  private func getHardwareLocation(result: @escaping FlutterResult) {
    locationResult = result
    locationManager = CLLocationManager()
    locationManager?.delegate = self
    locationManager?.desiredAccuracy = kCLLocationAccuracyBest
    locationManager?.requestWhenInUseAuthorization()
    locationManager?.requestLocation()
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let location = locations.last else { return }
    locationResult?(["lat": location.coordinate.latitude, "lng": location.coordinate.longitude])
    locationResult = nil
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    locationResult?(FlutterError(code: "UNAVAILABLE",
                                message: "Location not available",
                                details: nil))
    locationResult = nil
  }
}
