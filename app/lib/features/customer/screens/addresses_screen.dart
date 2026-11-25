import 'package:flutter/material.dart';
import '../../../models/address_model.dart';
import '../../../services/address_service.dart';
import '../../../services/auth_service.dart';
import '../../../services/location_service.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/widgets/error_widget.dart';
import '../../auth/screens/login_screen.dart';

class AddressesScreen extends StatefulWidget {
  const AddressesScreen({Key? key}) : super(key: key);

  @override
  State<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends State<AddressesScreen> {
  List<AddressModel> _addresses = [];
  bool _isLoading = true;
  String? _error;
  final Color jdkartOrange = const Color(0xFFF97316);

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  Future<void> _loadAddresses() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final data = await AddressService.instance.getAddresses();
      if (mounted) {
        setState(() {
          _addresses = data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error =
              e is ApiException ? e.message : 'Could not load your addresses. Please try again.';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _promptLogin() async {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Please log in to save addresses to your account.')),
    );
    final loggedIn = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen(popOnSuccess: true)),
    );
    if (loggedIn == true && mounted) _loadAddresses();
  }

  void _showAddressForm({AddressModel? existing}) {
    if (!AuthService.instance.isAuthenticated) {
      _promptLogin();
      return;
    }

    final isEdit = existing != null;
    final formKey = GlobalKey<FormState>();
    String label = existing?.label ?? 'HOME';
    final line1Controller = TextEditingController(text: existing?.addressLine1);
    final landmarkController = TextEditingController(text: existing?.landmark);
    final areaController = TextEditingController(text: existing?.area);
    final cityController = TextEditingController(text: existing?.city);
    final stateController = TextEditingController(text: existing?.state);
    final pincodeController = TextEditingController(text: existing?.pincode);
    bool isDefault = existing?.isDefault ?? false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(context).viewInsets.bottom + 20,
              ),
              child: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            isEdit ? 'Edit Delivery Address' : 'Add Delivery Address',
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close),
                            onPressed: () => Navigator.pop(ctx),
                          )
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: ['HOME', 'WORK', 'OTHER'].map((type) {
                          final isSel = label == type;
                          return Padding(
                            padding: const EdgeInsets.only(right: 8.0),
                            child: ChoiceChip(
                              label: Text(type),
                              selected: isSel,
                              selectedColor: jdkartOrange,
                              labelStyle: TextStyle(
                                color: isSel ? Colors.white : Colors.black87,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                              onSelected: (val) {
                                if (val) setModalState(() => label = type);
                              },
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: line1Controller,
                        decoration: InputDecoration(
                          labelText: 'Flat / House No / Road / Street *',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                      ),
                      const SizedBox(height: 10),
                      TextFormField(
                        controller: landmarkController,
                        decoration: InputDecoration(
                          labelText: 'Landmark (e.g. Near Bajaj Agency)',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: areaController,
                              decoration: InputDecoration(
                                labelText: 'Area / Village',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextFormField(
                              controller: cityController,
                              decoration: InputDecoration(
                                labelText: 'City / District *',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: stateController,
                              decoration: InputDecoration(
                                labelText: 'State',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextFormField(
                              controller: pincodeController,
                              keyboardType: TextInputType.number,
                              maxLength: 6,
                              decoration: InputDecoration(
                                labelText: 'Pincode *',
                                counterText: '',
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              validator: (v) {
                                final value = v?.trim() ?? '';
                                if (value.isEmpty) return 'Required';
                                if (!RegExp(r'^[1-9][0-9]{5}$').hasMatch(value)) {
                                  return 'Enter a valid 6-digit pincode';
                                }
                                return null;
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      CheckboxListTile(
                        contentPadding: EdgeInsets.zero,
                        value: isDefault,
                        title: const Text('Make this my default delivery address', style: TextStyle(fontSize: 13)),
                        activeColor: jdkartOrange,
                        onChanged: (v) => setModalState(() => isDefault = v ?? false),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () async {
                            if (!formKey.currentState!.validate()) return;
                            final address = AddressModel(
                              id: existing?.id ?? 'local_${DateTime.now().millisecondsSinceEpoch}',
                              label: label,
                              addressLine1: line1Controller.text.trim(),
                              addressLine2: existing?.addressLine2 ?? '',
                              landmark: landmarkController.text.trim(),
                              area: areaController.text.trim(),
                              city: cityController.text.trim(),
                              state: stateController.text.trim(),
                              pincode: pincodeController.text.trim(),
                              latitude: existing != null
                                  ? existing.latitude
                                  : LocationService.instance.selectedLat,
                              longitude: existing != null
                                  ? existing.longitude
                                  : LocationService.instance.selectedLng,
                              isDefault: isDefault,
                            );

                            Navigator.pop(ctx);
                            setState(() => _isLoading = true);
                            try {
                              if (isEdit) {
                                await AddressService.instance.updateAddress(address);
                              } else {
                                await AddressService.instance.addAddress(address);
                              }
                              _loadAddresses();
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(isEdit
                                        ? 'Address updated successfully!'
                                        : 'Address added successfully!'),
                                    backgroundColor: const Color(0xFF16A34A),
                                  ),
                                );
                              }
                            } on ApiException catch (e) {
                              if (mounted) {
                                setState(() => _isLoading = false);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(e.message),
                                    backgroundColor: Colors.redAccent,
                                  ),
                                );
                              }
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: jdkartOrange,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: const Text('Save Address', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                        ),
                      )
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Saved Addresses', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.black),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFF97316)))
          : _error != null && _addresses.isEmpty
              ? AppErrorState(message: _error!, onRetry: _loadAddresses)
              : _addresses.isEmpty
                  ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.location_off_outlined, size: 64, color: Colors.grey[400]),
                        const SizedBox(height: 16),
                        const Text('No Saved Addresses', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                        const SizedBox(height: 8),
                        Text(
                          'Add your delivery address so we can deliver meals to you quickly.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.grey[600], fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _addresses.length,
                  itemBuilder: (context, index) {
                    final item = _addresses[index];
                    return _buildAddressCard(item);
                  },
                ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton.icon(
            onPressed: () => _showAddressForm(),
            icon: const Icon(Icons.add, color: Colors.white),
            label: const Text('Add New Address', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
            style: ElevatedButton.styleFrom(
              backgroundColor: jdkartOrange,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAddressCard(AddressModel address) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 6, offset: const Offset(0, 2)),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF7ED),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              address.label == 'WORK' ? Icons.work_outline : Icons.home_outlined,
              color: jdkartOrange,
              size: 22,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(address.label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    if (address.isDefault) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDCFCE7),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text('DEFAULT', style: TextStyle(color: Color(0xFF15803D), fontSize: 10, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  address.fullAddress,
                  style: TextStyle(color: Colors.grey[700], fontSize: 13, height: 1.4),
                ),
              ],
            ),
          ),
          if (!address.id.startsWith('default_'))
            IconButton(
              tooltip: 'Edit address',
              icon: Icon(Icons.edit_outlined, color: jdkartOrange, size: 20),
              onPressed: () => _showAddressForm(existing: address),
            ),
          if (!address.id.startsWith('default_'))
            IconButton(
              icon: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 20),
              onPressed: () async {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Delete Address'),
                    content: const Text('Are you sure you want to delete this address?'),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                      TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete', style: TextStyle(color: Colors.red))),
                    ],
                  ),
                );
                if (confirm == true) {
                  try {
                    await AddressService.instance.deleteAddress(address.id);
                    _loadAddresses();
                  } on ApiException catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(e.message), backgroundColor: Colors.redAccent),
                      );
                    }
                  }
                }
              },
            ),
        ],
      ),
    );
  }
}
