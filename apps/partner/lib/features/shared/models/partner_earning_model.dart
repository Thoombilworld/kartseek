/// KARTSEEK Partner App — Earning Model
class PartnerEarning {
  final double todayEarnings;
  final double weeklyEarnings;
  final double monthlyEarnings;
  final int completedTrips;
  final int completedDeliveries;
  final double pendingPayout;
  final double paidPayout;
  final double cashCollected;
  final double onlineHours;
  final double incentives;
  final double deductions;
  final double commissionDeducted;
  final double bonus;

  const PartnerEarning({
    this.todayEarnings = 0,
    this.weeklyEarnings = 0,
    this.monthlyEarnings = 0,
    this.completedTrips = 0,
    this.completedDeliveries = 0,
    this.pendingPayout = 0,
    this.paidPayout = 0,
    this.cashCollected = 0,
    this.onlineHours = 0,
    this.incentives = 0,
    this.deductions = 0,
    this.commissionDeducted = 0,
    this.bonus = 0,
  });

  factory PartnerEarning.fromJson(Map<String, dynamic> json) {
    return PartnerEarning(
      todayEarnings: (json['today_earnings'] ?? 0).toDouble(),
      weeklyEarnings: (json['weekly_earnings'] ?? 0).toDouble(),
      monthlyEarnings: (json['monthly_earnings'] ?? 0).toDouble(),
      completedTrips: json['completed_trips'] ?? 0,
      completedDeliveries: json['completed_deliveries'] ?? 0,
      pendingPayout: (json['pending_payout'] ?? 0).toDouble(),
      paidPayout: (json['paid_payout'] ?? 0).toDouble(),
      cashCollected: (json['cash_collected'] ?? 0).toDouble(),
      onlineHours: (json['online_hours'] ?? 0).toDouble(),
      incentives: (json['incentives'] ?? 0).toDouble(),
      deductions: (json['deductions'] ?? 0).toDouble(),
      commissionDeducted: (json['commission_deducted'] ?? 0).toDouble(),
      bonus: (json['bonus'] ?? 0).toDouble(),
    );
  }

  double get totalEarnings => todayEarnings + incentives + bonus - deductions - commissionDeducted;
  double get netPayable => totalEarnings - cashCollected;

  static PartnerEarning mock() => const PartnerEarning(
        todayEarnings: 3450,
        weeklyEarnings: 18760,
        monthlyEarnings: 67200,
        completedTrips: 12,
        completedDeliveries: 8,
        pendingPayout: 5200,
        paidPayout: 62000,
        cashCollected: 14500,
        onlineHours: 8.5,
        incentives: 850,
        deductions: 200,
        commissionDeducted: 2760,
        bonus: 500,
      );
}

/// Wallet model
class PartnerWallet {
  final double availableBalance;
  final double pendingBalance;
  final double paidAmount;
  final double cashCollected;
  final double adjustment;
  final List<WalletTransaction> transactions;

  const PartnerWallet({
    this.availableBalance = 0,
    this.pendingBalance = 0,
    this.paidAmount = 0,
    this.cashCollected = 0,
    this.adjustment = 0,
    this.transactions = const [],
  });

  factory PartnerWallet.fromJson(Map<String, dynamic> json) {
    return PartnerWallet(
      availableBalance: (json['available_balance'] ?? 0).toDouble(),
      pendingBalance: (json['pending_balance'] ?? 0).toDouble(),
      paidAmount: (json['paid_amount'] ?? 0).toDouble(),
      cashCollected: (json['cash_collected'] ?? 0).toDouble(),
      adjustment: (json['adjustment'] ?? 0).toDouble(),
      transactions: (json['transactions'] as List? ?? [])
          .map((t) => WalletTransaction.fromJson(t))
          .toList(),
    );
  }

  static PartnerWallet mock() => PartnerWallet(
        availableBalance: 5200,
        pendingBalance: 1800,
        paidAmount: 62000,
        cashCollected: 14500,
        adjustment: -350,
        transactions: WalletTransaction.mockList(),
      );
}

class WalletTransaction {
  final String id;
  final String title;
  final String description;
  final double amount;
  final WalletTxnType type;
  final DateTime date;

  const WalletTransaction({
    required this.id,
    required this.title,
    required this.description,
    required this.amount,
    required this.type,
    required this.date,
  });

  factory WalletTransaction.fromJson(Map<String, dynamic> json) {
    return WalletTransaction(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      amount: (json['amount'] ?? 0).toDouble(),
      type: json['type'] == 'credit' ? WalletTxnType.credit : WalletTxnType.debit,
      date: json['date'] != null ? DateTime.parse(json['date']) : DateTime.now(),
    );
  }

  static List<WalletTransaction> mockList() => [
        WalletTransaction(id: 'txn_1', title: 'Trip #T-4521', description: 'Ride earnings', amount: 350, type: WalletTxnType.credit, date: DateTime.now()),
        WalletTransaction(id: 'txn_2', title: 'Commission', description: 'Platform fee', amount: -52, type: WalletTxnType.debit, date: DateTime.now()),
        WalletTransaction(id: 'txn_3', title: 'Bonus', description: '10-ride streak bonus', amount: 200, type: WalletTxnType.credit, date: DateTime.now().subtract(const Duration(hours: 3))),
        WalletTransaction(id: 'txn_4', title: 'Delivery #D-782', description: 'Delivery earnings', amount: 120, type: WalletTxnType.credit, date: DateTime.now().subtract(const Duration(hours: 5))),
        WalletTransaction(id: 'txn_5', title: 'Payout', description: 'Weekly payout to bank', amount: -5000, type: WalletTxnType.debit, date: DateTime.now().subtract(const Duration(days: 1))),
        WalletTransaction(id: 'txn_6', title: 'Cash collected', description: 'COD adjustment', amount: -800, type: WalletTxnType.debit, date: DateTime.now().subtract(const Duration(days: 1))),
      ];
}

enum WalletTxnType { credit, debit }

/// Ledger entry
class LedgerEntry {
  final String id;
  final DateTime date;
  final String tripOrOrderId;
  final double credit;
  final double debit;
  final double commission;
  final double cashCollected;
  final double payout;
  final double balance;

  const LedgerEntry({
    required this.id,
    required this.date,
    required this.tripOrOrderId,
    this.credit = 0,
    this.debit = 0,
    this.commission = 0,
    this.cashCollected = 0,
    this.payout = 0,
    this.balance = 0,
  });

  factory LedgerEntry.fromJson(Map<String, dynamic> json) {
    return LedgerEntry(
      id: json['id'] ?? '',
      date: json['date'] != null ? DateTime.parse(json['date']) : DateTime.now(),
      tripOrOrderId: json['trip_or_order_id'] ?? '',
      credit: (json['credit'] ?? 0).toDouble(),
      debit: (json['debit'] ?? 0).toDouble(),
      commission: (json['commission'] ?? 0).toDouble(),
      cashCollected: (json['cash_collected'] ?? 0).toDouble(),
      payout: (json['payout'] ?? 0).toDouble(),
      balance: (json['balance'] ?? 0).toDouble(),
    );
  }

  static List<LedgerEntry> mockList() => [
        LedgerEntry(id: 'led_1', date: DateTime.now(), tripOrOrderId: 'T-4521', credit: 350, commission: 52, balance: 5498),
        LedgerEntry(id: 'led_2', date: DateTime.now().subtract(const Duration(hours: 2)), tripOrOrderId: 'D-782', credit: 120, commission: 18, cashCollected: 120, balance: 5200),
        LedgerEntry(id: 'led_3', date: DateTime.now().subtract(const Duration(hours: 5)), tripOrOrderId: 'T-4520', credit: 280, commission: 42, balance: 5098),
        LedgerEntry(id: 'led_4', date: DateTime.now().subtract(const Duration(days: 1)), tripOrOrderId: 'PAYOUT', payout: 5000, debit: 5000, balance: 4860),
        LedgerEntry(id: 'led_5', date: DateTime.now().subtract(const Duration(days: 1)), tripOrOrderId: 'T-4519', credit: 450, commission: 68, cashCollected: 450, balance: 9860),
      ];
}
