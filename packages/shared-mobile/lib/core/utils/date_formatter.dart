/// KARTSEEK — Locale-Aware Date & Time Formatter
///
/// Formats dates and times according to the user's detected country
/// preferences (DD/MM/YYYY vs MM/DD/YYYY, 12h vs 24h clock).
library;

import 'package:intl/intl.dart';
import 'package:kartseek_shared_mobile/core/services/region_service.dart';

class DateTimeFormatter {
  DateTimeFormatter._();

  /// Country-specific date format patterns.
  static final Map<String, String> _datePatterns = {
    'QA': 'dd/MM/yyyy', 'IN': 'dd/MM/yyyy', 'AE': 'dd/MM/yyyy',
    'SA': 'dd/MM/yyyy', 'BH': 'dd/MM/yyyy', 'KW': 'dd/MM/yyyy',
    'OM': 'dd/MM/yyyy', 'GB': 'dd/MM/yyyy', 'US': 'MM/dd/yyyy',
    'KE': 'dd/MM/yyyy',
  };

  /// Country-specific time format patterns.
  static final Map<String, String> _timePatterns = {
    'QA': 'hh:mm a', 'IN': 'hh:mm a', 'AE': 'hh:mm a',
    'SA': 'hh:mm a', 'BH': 'hh:mm a', 'KW': 'hh:mm a',
    'OM': 'hh:mm a', 'GB': 'HH:mm', 'US': 'hh:mm a',
    'KE': 'HH:mm',
  };

  static String get _countryCode => RegionService.instance.currentCountry.code;

  /// Format a date using the country's preferred pattern.
  static String formatDate(DateTime dt) {
    final pattern = _datePatterns[_countryCode] ?? 'dd/MM/yyyy';
    return DateFormat(pattern).format(dt);
  }

  /// Format time using the country's preferred pattern (12h/24h).
  static String formatTime(DateTime dt) {
    final pattern = _timePatterns[_countryCode] ?? 'HH:mm';
    return DateFormat(pattern).format(dt);
  }

  /// Format both date and time together.
  static String formatDateTime(DateTime dt) {
    return '${formatDate(dt)} ${formatTime(dt)}';
  }

  /// Relative time (e.g., "2 hours ago", "Just now").
  static String relative(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inSeconds < 60) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return formatDate(dt);
  }

  /// Short date (e.g., "12 Jun" or "Jun 12" for US).
  static String shortDate(DateTime dt) {
    final isUS = _countryCode == 'US';
    return isUS ? DateFormat('MMM dd').format(dt) : DateFormat('dd MMM').format(dt);
  }
}
