/**
 * Newman Configuration for KARTSEEK API Testing
 * ───────────────────────────────────────────────
 * Central config for running all Postman collections via Newman.
 */
module.exports = {
  // Default reporter configuration
  reporters: ['cli', 'json', 'htmlextra'],

  reporter: {
    json: {
      export: './reports/newman-results.json',
    },
    htmlextra: {
      export: './reports/newman-report.html',
      title: 'KARTSEEK API Test Report',
      browserTitle: 'KARTSEEK API Tests',
      showOnlyFails: false,
      noSyntaxHighlighting: false,
      showEnvironmentData: true,
      skipEnvironmentVars: ['user_token', 'admin_token', 'seller_token', 'partner_token', 'refresh_token'],
      showGlobalData: false,
      skipGlobalVars: [],
      omitRequestBodies: false,
      omitResponseBodies: false,
      hideRequestBody: ['Login', 'Register'],
      hideResponseBody: [],
      showMarkdownLinks: true,
      noOverallRun: false,
      displayProgressBar: true,
    },
  },

  // Timeout configuration (milliseconds)
  timeout: {
    request: 10000,  // 10s per request
    script: 5000,    // 5s per script execution
  },

  // Delay between requests (milliseconds)
  delayRequest: 100,

  // Continue running even if a test fails
  bail: false,

  // Number of iterations
  iterationCount: 1,

  // Suppress exit code on test failure (useful for CI reporting)
  suppressExitCode: false,

  // Insecure mode (skip SSL validation for self-signed certs in staging)
  insecure: false,

  // Color output
  color: 'auto',

  // Collection execution order (critical paths first)
  collections: [
    '01-auth-user-management',
    '02-api-gateway',
    '03-customer-app',
    '06-marketplace',
    '07-marketplace-seller',
    '08-grocery',
    '09-grocery-seller',
    '10-restaurant',
    '11-restaurant-partner',
    '12-pharmacy',
    '13-pharmacy-seller',
    '14-doctor-appointment',
    '15-doctor-hospital-portal',
    '16-taxi-booking',
    '17-taxi-driver-delivery',
    '18-taxi-vendor',
    '19-hotel-booking',
    '20-hotel-owner',
    '21-franchise',
    '22-wallet-payment-settlement',
    '23-notifications',
    '24-upload-media',
    '25-search',
    '26-location-maps',
    '27-analytics-reports',
    '28-seo-aeo-geo',
    '29-support-complaints',
    '30-security-compliance',
    '31-loyalty',
    '04-website-apis',
    '05-admin-panel',
  ],
};
