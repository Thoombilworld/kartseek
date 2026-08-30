/// KARTSEEK Partner App — KYC Document Model
class KycDocument {
  final String id;
  final String type;
  final String name;
  final String? fileUrl;
  final KycDocumentStatus status;
  final String? rejectionReason;
  final DateTime? uploadedAt;
  final DateTime? expiryDate;
  final bool isRequired;

  const KycDocument({
    required this.id,
    required this.type,
    required this.name,
    this.fileUrl,
    this.status = KycDocumentStatus.pending,
    this.rejectionReason,
    this.uploadedAt,
    this.expiryDate,
    this.isRequired = true,
  });

  factory KycDocument.fromJson(Map<String, dynamic> json) {
    return KycDocument(
      id: json['id'] ?? '',
      type: json['type'] ?? '',
      name: json['name'] ?? '',
      fileUrl: json['file_url'],
      status: KycDocumentStatus.fromString(json['status'] ?? 'pending'),
      rejectionReason: json['rejection_reason'],
      uploadedAt: json['uploaded_at'] != null
          ? DateTime.parse(json['uploaded_at'])
          : null,
      expiryDate: json['expiry_date'] != null
          ? DateTime.parse(json['expiry_date'])
          : null,
      isRequired: json['is_required'] ?? true,
    );
  }

  bool get isExpired =>
      expiryDate != null && expiryDate!.isBefore(DateTime.now());

  bool get isUploaded => fileUrl != null && fileUrl!.isNotEmpty;

  static List<KycDocument> mockDriverDocuments() => [
        KycDocument(
          id: 'doc_001',
          type: 'id_proof',
          name: 'National ID / Passport',
          fileUrl: 'uploaded',
          status: KycDocumentStatus.approved,
          uploadedAt: DateTime(2024, 3, 15),
        ),
        KycDocument(
          id: 'doc_002',
          type: 'driving_license',
          name: 'Driving License',
          fileUrl: 'uploaded',
          status: KycDocumentStatus.approved,
          uploadedAt: DateTime(2024, 3, 15),
          expiryDate: DateTime(2027, 6, 30),
        ),
        KycDocument(
          id: 'doc_003',
          type: 'vehicle_registration',
          name: 'Vehicle Registration',
          fileUrl: 'uploaded',
          status: KycDocumentStatus.approved,
          uploadedAt: DateTime(2024, 3, 16),
        ),
        KycDocument(
          id: 'doc_004',
          type: 'vehicle_insurance',
          name: 'Vehicle Insurance',
          fileUrl: 'uploaded',
          status: KycDocumentStatus.approved,
          uploadedAt: DateTime(2024, 3, 16),
          expiryDate: DateTime(2026, 12, 31),
        ),
        const KycDocument(
          id: 'doc_005',
          type: 'vehicle_photo',
          name: 'Vehicle Photo',
          status: KycDocumentStatus.pending,
        ),
        KycDocument(
          id: 'doc_006',
          type: 'profile_photo',
          name: 'Profile Photo',
          fileUrl: 'uploaded',
          status: KycDocumentStatus.approved,
          uploadedAt: DateTime(2024, 3, 15),
        ),
      ];

  static List<KycDocument> mockDeliveryDocuments() => [
        KycDocument(
          id: 'doc_101',
          type: 'id_proof',
          name: 'National ID / Passport',
          fileUrl: 'uploaded',
          status: KycDocumentStatus.approved,
          uploadedAt: DateTime(2024, 4, 10),
        ),
        KycDocument(
          id: 'doc_102',
          type: 'address_proof',
          name: 'Address Proof',
          fileUrl: 'uploaded',
          status: KycDocumentStatus.approved,
          uploadedAt: DateTime(2024, 4, 10),
        ),
        const KycDocument(
          id: 'doc_103',
          type: 'bike_details',
          name: 'Bike / Vehicle Details',
          status: KycDocumentStatus.pending,
          isRequired: false,
        ),
        KycDocument(
          id: 'doc_104',
          type: 'profile_photo',
          name: 'Profile Photo',
          fileUrl: 'uploaded',
          status: KycDocumentStatus.approved,
          uploadedAt: DateTime(2024, 4, 10),
        ),
      ];
}

enum KycDocumentStatus {
  pending('pending'),
  uploaded('uploaded'),
  underReview('under_review'),
  approved('approved'),
  rejected('rejected');

  final String value;
  const KycDocumentStatus(this.value);

  static KycDocumentStatus fromString(String s) {
    switch (s) {
      case 'pending':
        return KycDocumentStatus.pending;
      case 'uploaded':
        return KycDocumentStatus.uploaded;
      case 'under_review':
        return KycDocumentStatus.underReview;
      case 'approved':
        return KycDocumentStatus.approved;
      case 'rejected':
        return KycDocumentStatus.rejected;
      default:
        return KycDocumentStatus.pending;
    }
  }
}
