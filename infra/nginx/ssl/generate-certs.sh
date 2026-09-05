#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# Generate self-signed SSL certificate for local HTTP/2 development
# Run: sh nginx/ssl/generate-certs.sh
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SSL_DIR="$SCRIPT_DIR"

echo "🔐 Generating self-signed SSL certificate for KARTSEEK..."

openssl req -x509 \
  -nodes \
  -days 365 \
  -newkey rsa:2048 \
  -keyout "$SSL_DIR/kartseek.key" \
  -out "$SSL_DIR/kartseek.crt" \
  -subj "/C=GB/ST=London/L=London/O=KARTSEEK/OU=Engineering/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:kartseek.local,DNS:*.kartseek.local,IP:127.0.0.1"

echo "✅ Certificate generated:"
echo "   Key:  $SSL_DIR/kartseek.key"
echo "   Cert: $SSL_DIR/kartseek.crt"
echo ""
echo "📌 To trust this cert on your machine (optional):"
echo "   macOS:  sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $SSL_DIR/kartseek.crt"
echo "   Ubuntu: sudo cp $SSL_DIR/kartseek.crt /usr/local/share/ca-certificates/ && sudo update-ca-certificates"
echo "   Windows: certutil -addstore -f 'ROOT' $SSL_DIR/kartseek.crt"
