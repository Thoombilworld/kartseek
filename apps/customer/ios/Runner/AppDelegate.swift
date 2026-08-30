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
    // Google Maps API Key — reads from Info.plist or falls back to placeholder
    let mapsKey = Bundle.main.object(forInfoDictionaryKey: "GMSApiKey") as? String ?? "YOUR_GOOGLE_MAPS_API_KEY_HERE"
    GMSServices.provideAPIKey(mapsKey)

    let controller : FlutterViewController = window?.rootViewController as! FlutterViewController
    let locationChannel = FlutterMethodChannel(name: "com.kartseek.app/location",
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

  // MARK: - Deep Linking (Universal Links)
  override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    // Forward Universal Links to Flutter
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler)
  }

  // MARK: - Custom URL Scheme (kartseek://)
  override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey : Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options)
  }

  // MARK: - Hardware Location
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
