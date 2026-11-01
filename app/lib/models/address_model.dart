class AddressModel {
  final String id;
  final String label;
  final String addressLine1;
  final String addressLine2;
  final String landmark;
  final String area;
  final String city;
  final String state;
  final String pincode;
  final double? latitude;
  final double? longitude;
  final bool isDefault;

  AddressModel({
    required this.id,
    this.label = 'HOME',
    this.addressLine1 = '',
    this.addressLine2 = '',
    this.landmark = '',
    this.area = '',
    this.city = '',
    this.state = '',
    this.pincode = '',
    this.latitude,
    this.longitude,
    this.isDefault = false,
  });

  String get fullAddress {
    final parts = [
      addressLine1,
      if (addressLine2.isNotEmpty) addressLine2,
      if (landmark.isNotEmpty) (landmark.trim().toLowerCase().startsWith('near') ? landmark.trim() : 'Near ${landmark.trim()}'),
      if (area.isNotEmpty) area,
      if (city.isNotEmpty) city,
      if (state.isNotEmpty) state,
      if (pincode.isNotEmpty) pincode,
    ].where((p) => p.trim().isNotEmpty).toList();

    return parts.isNotEmpty ? parts.join(', ') : 'Address not specified';
  }

  factory AddressModel.fromJson(Map<String, dynamic> json) {
    return AddressModel(
      id: json['_id'] ?? json['id'] ?? '',
      label: (json['label'] ?? 'HOME').toString().toUpperCase(),
      addressLine1: json['addressLine1'] ?? json['address'] ?? '',
      addressLine2: json['addressLine2'] ?? '',
      landmark: json['landmark'] ?? '',
      area: json['area'] ?? '',
      city: json['city'] ?? '',
      state: json['state'] ?? '',
      pincode: json['pincode'] ?? '',
      latitude: json['latitude'] != null ? (json['latitude'] as num).toDouble() : null,
      longitude: json['longitude'] != null ? (json['longitude'] as num).toDouble() : null,
      isDefault: json['isDefault'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'label': label,
      'addressLine1': addressLine1,
      if (addressLine2.isNotEmpty) 'addressLine2': addressLine2,
      if (landmark.isNotEmpty) 'landmark': landmark,
      if (area.isNotEmpty) 'area': area,
      if (city.isNotEmpty) 'city': city,
      if (state.isNotEmpty) 'state': state,
      if (pincode.isNotEmpty) 'pincode': pincode,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      'isDefault': isDefault,
    };
  }
}
