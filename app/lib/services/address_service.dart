import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/address_model.dart';
import 'auth_service.dart';

class AddressService {
  AddressService._();
  static final AddressService instance = AddressService._();

  /// Get all saved addresses for the authenticated customer.
  /// Throws [ApiException] on network/server failure.
  Future<List<AddressModel>> getAddresses() async {
    if (!AuthService.instance.isAuthenticated) return [];

    final data = await ApiClient.instance
        .get(ApiConstants.addresses, auth: true);
    if (data is Map && data['addresses'] is List) {
      return (data['addresses'] as List)
          .map((a) => AddressModel.fromJson(Map<String, dynamic>.from(a)))
          .toList();
    }
    return [];
  }

  /// Add a new address to customer profile
  Future<void> addAddress(AddressModel address) async {
    await ApiClient.instance
        .post(ApiConstants.addresses, address.toJson(), auth: true);
  }

  /// Update an existing address. Empty fields are sent so they can be cleared.
  Future<void> updateAddress(AddressModel address) async {
    await ApiClient.instance.patch(
      '${ApiConstants.addresses}/${address.id}',
      body: {
        'label': address.label,
        'addressLine1': address.addressLine1,
        'addressLine2': address.addressLine2,
        'landmark': address.landmark,
        'area': address.area,
        'city': address.city,
        'state': address.state,
        'pincode': address.pincode,
        if (address.latitude != null) 'latitude': address.latitude,
        if (address.longitude != null) 'longitude': address.longitude,
        if (address.isDefault) 'isDefault': true,
      },
      auth: true,
    );
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
