import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/address_model.dart';
import 'auth_service.dart';

class AddressService {
  AddressService._();
  static final AddressService instance = AddressService._();

  /// Default fallback address when the customer has none saved yet
  static final List<AddressModel> defaultAddresses = [
    AddressModel(
      id: 'default_akbarpur',
      label: 'HOME',
      addressLine1: 'Main Road Akbarpur',
      landmark: 'Near Bajaj Agency',
      area: 'Akbarpur Market',
      city: 'Rohtas',
      state: 'Bihar',
      pincode: '821311',
      latitude: 24.636653,
      longitude: 83.963676,
      isDefault: true,
    ),
    AddressModel(
      id: 'default_nauhatta',
      label: 'WORK',
      addressLine1: 'Nauhatta Tehsil',
      landmark: 'Near Block Office',
      area: 'Paruka',
      city: 'Rohtas',
      state: 'Bihar',
      pincode: '821304',
      latitude: 24.571400,
      longitude: 83.734300,
      isDefault: false,
    ),
  ];

  /// Get all saved addresses for the authenticated customer.
  /// Throws [ApiException] on network/server failure.
  Future<List<AddressModel>> getAddresses() async {
    if (!AuthService.instance.isAuthenticated) return defaultAddresses;

    final data = await ApiClient.instance
        .get(ApiConstants.addresses, auth: true);
    if (data is Map && data['addresses'] is List && (data['addresses'] as List).isNotEmpty) {
      return (data['addresses'] as List)
          .map((a) => AddressModel.fromJson(Map<String, dynamic>.from(a)))
          .toList();
    }
    return defaultAddresses;
  }

  /// Add a new address to customer profile
  Future<void> addAddress(AddressModel address) async {
    await ApiClient.instance
        .post(ApiConstants.addresses, address.toJson(), auth: true);
  }

  /// Delete address
  Future<void> deleteAddress(String id) async {
    await ApiClient.instance
        .delete('${ApiConstants.addresses}/$id', auth: true);
  }

  /// Set address as default
  Future<void> setDefault(String id) async {
    await ApiClient.instance
        .patch('${ApiConstants.addresses}/$id/default', auth: true);
  }
}
