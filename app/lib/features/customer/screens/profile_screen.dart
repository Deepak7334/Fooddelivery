import 'package:flutter/material.dart';
import 'orders_screen.dart';
import 'addresses_screen.dart';
import 'my_bookings_screen.dart';
import 'notifications_screen.dart';
import 'wishlist_screen.dart';
import 'offers_screen.dart';
import '../../auth/screens/login_screen.dart';
import '../../../models/user_model.dart';
import '../../../services/auth_service.dart';
import '../../../services/cart_service.dart';
import '../../../services/favorites_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final Color jdkartOrange = const Color(0xFFF97316);
  bool _saving = false;
  String? _profileError;

  @override
  void initState() {
    super.initState();
    _syncFromServer();
  }

  Future<void> _syncFromServer() async {
    if (!AuthService.instance.isAuthenticated) return;
    final user = await AuthService.instance.refreshProfile();
    if (mounted && user != null) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService.instance.currentUser;
    final loggedIn = AuthService.instance.isAuthenticated && user != null;
    final userName = user != null && user.name.isNotEmpty ? user.name : 'JDKart Customer';
    final initialLetter = userName.isNotEmpty ? userName[0].toUpperCase() : 'J';

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        title: const Text('My Profile', style: TextStyle(color: Colors.black, fontWeight: FontWeight.w900, fontSize: 20)),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        child: Column(
          children: [
            // User Header Profile Card
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
              child: loggedIn
                  ? Row(
                      children: [
                        CircleAvatar(
                          radius: 36,
                          backgroundColor: jdkartOrange,
                          child: Text(initialLetter, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white)),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(userName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
                              const SizedBox(height: 4),
                              if (user.phone.isNotEmpty)
                                Text(user.phone, style: const TextStyle(color: Colors.grey, fontSize: 13, fontWeight: FontWeight.w500)),
                              if (user.email.isNotEmpty)
                                Text(user.email, style: const TextStyle(color: Colors.grey, fontSize: 13)),
                            ],
                          ),
                        ),
                        IconButton(
                          tooltip: 'Edit profile',
                          onPressed: () => _openProfileEditor(user),
                          icon: Icon(Icons.edit_outlined, color: jdkartOrange, size: 22),
                        ),
                      ],
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 36,
                              backgroundColor: const Color(0xFFF1F5F9),
                              child: Icon(Icons.person_outline_rounded, color: jdkartOrange, size: 36),
                            ),
                            const SizedBox(width: 16),
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Welcome to JDKart', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
                                  SizedBox(height: 4),
                                  Text(
                                    'Log in to view your orders, saved addresses and bookings.',
                                    style: TextStyle(color: Colors.grey, fontSize: 13),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          height: 46,
                          child: ElevatedButton(
                            onPressed: _promptLogin,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: jdkartOrange,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: const Text('Log in / Sign up', style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ),
                      ],
                    ),
            ),
            const SizedBox(height: 14),

            _buildSection(context, [
              _MenuItem(icon: Icons.shopping_bag_outlined, title: 'My Orders', onTap: () => _openAccountScreen((_) => const OrdersScreen())),
              _MenuItem(icon: Icons.favorite_border_rounded, title: 'Wishlist & Favorites', onTap: () => _openAccountScreen((_) => const WishlistScreen())),
              _MenuItem(icon: Icons.location_on_outlined, title: 'Saved Addresses', onTap: () => _openAccountScreen((_) => const AddressesScreen())),
              _MenuItem(icon: Icons.table_restaurant_rounded, title: 'My Table Reservations', onTap: () => _openAccountScreen((_) => const MyBookingsScreen())),
            ]),
            const SizedBox(height: 14),

            _buildSection(context, [
              _MenuItem(icon: Icons.notifications_none_rounded, title: 'Notifications', onTap: () => _openAccountScreen((_) => const NotificationsScreen())),
              _MenuItem(
                icon: Icons.account_balance_wallet_outlined,
                title: 'JDKart Wallet & UPI',
                onTap: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      title: const Row(
                        children: [
                          Icon(Icons.info_outline_rounded, color: Color(0xFFF97316)),
                          SizedBox(width: 8),
                          Text('Payment Notice', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      content: const Text(
                        'Currently not accepting online payments. Please choose Cash on Delivery for all your food orders.',
                        style: TextStyle(fontSize: 14, height: 1.4),
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(ctx),
                          child: const Text('OK', style: TextStyle(color: Color(0xFFF97316), fontWeight: FontWeight.bold)),
                        )
                      ],
                    ),
                  );
                },
              ),
              _MenuItem(icon: Icons.local_offer_outlined, title: 'Offers & Promos', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const OffersScreen()))),
            ]),
            const SizedBox(height: 14),

            _buildSection(context, [
              _MenuItem(
                icon: Icons.help_outline_rounded,
                title: 'Help & Customer Support',
                onTap: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      title: const Row(
                        children: [
                          Icon(Icons.support_agent_rounded, color: Color(0xFFF97316)),
                          SizedBox(width: 8),
                          Text('Customer Support', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      content: const Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Need help with your order or have queries? Reach us at:', style: TextStyle(fontSize: 14)),
                          SizedBox(height: 12),
                          Row(
                            children: [
                              Icon(Icons.email_outlined, size: 16, color: Colors.grey),
                              SizedBox(width: 8),
                              Text('supportjdkart@gmail.com', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            ],
                          ),
                          SizedBox(height: 6),
                          Row(
                            children: [
                              Icon(Icons.location_on_outlined, size: 16, color: Colors.grey),
                              SizedBox(width: 8),
                              Text('Akbarpur, Rohtas, Bihar - 821311', style: TextStyle(fontSize: 13, color: Colors.grey)),
                            ],
                          ),
                        ],
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(ctx),
                          child: const Text('Close', style: TextStyle(color: Color(0xFFF97316), fontWeight: FontWeight.bold)),
                        )
                      ],
                    ),
                  );
                },
              ),
              _MenuItem(
                icon: Icons.info_outline_rounded,
                title: 'About JDKart App',
                onTap: () {
                  showAboutDialog(
                    context: context,
                    applicationName: 'JDKart',
                    applicationVersion: 'v1.0.0 (Fast Delivery)',
                    applicationIcon: Image.asset('assets/images/logo.png', width: 48, height: 48, errorBuilder: (_, __, ___) => const Icon(Icons.delivery_dining, size: 48, color: Color(0xFFF97316))),
                    children: const [
                      SizedBox(height: 10),
                      Text('JDKart is your premier food and essentials delivery partner in Rohtas, Bihar. Fresh meals from top local restaurants delivered straight to your door.'),
                    ],
                  );
                },
              ),
            ]),
            const SizedBox(height: 24),

            if (loggedIn)
              TextButton.icon(
                onPressed: () async {
                  await AuthService.instance.logout();
                  CartService.instance.clearCart();
                  await FavoritesService.instance.clear();
                  if (context.mounted) {
                    Navigator.pushAndRemoveUntil(
                      context,
                      MaterialPageRoute(builder: (_) => const LoginScreen()),
                      (route) => false,
                    );
                  }
                },
                icon: const Icon(Icons.logout_rounded, color: Colors.red),
                label: const Text('Log Out', style: TextStyle(color: Colors.red, fontSize: 15, fontWeight: FontWeight.bold)),
              ),
            const SizedBox(height: 120),
          ],
        ),
      ),
    );
  }

  Future<bool> _promptLogin() async {
    if (AuthService.instance.isAuthenticated) return true;
    final loggedIn = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen(popOnSuccess: true)),
    );
    if (loggedIn == true && mounted) {
      await _syncFromServer();
      if (mounted) setState(() {});
      return true;
    }
    return false;
  }

  Future<void> _openAccountScreen(WidgetBuilder builder) async {
    if (!await _promptLogin()) return;
    if (!mounted) return;
    Navigator.push(context, MaterialPageRoute(builder: builder));
  }

  void _openProfileEditor(UserModel? user) {
    if (user == null || !AuthService.instance.isAuthenticated) {
      _promptLogin().then((ok) {
        if (ok && mounted) _openProfileEditor(AuthService.instance.currentUser);
      });
      return;
    }

    final nameController = TextEditingController(text: user.name);
    final phoneController = TextEditingController(text: user.phone);
    _profileError = null;
    _saving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Edit profile',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF1E293B)),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: nameController,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(
                  labelText: 'Full Name',
                  border: OutlineInputBorder(),
                  contentPadding:
                      EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
                onChanged: (_) {
                  if (_profileError != null) {
                    setSheetState(() => _profileError = null);
                  }
                },
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Mobile Number',
                  counterText: '',
                  border: OutlineInputBorder(),
                  contentPadding:
                      EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
                onChanged: (_) {
                  if (_profileError != null) {
                    setSheetState(() => _profileError = null);
                  }
                },
              ),
              const SizedBox(height: 12),
              if (user.email.isNotEmpty)
                Text(
                  'Email ${user.email} is managed by your login and cannot be changed here.',
                  style: TextStyle(color: Colors.grey[600], fontSize: 12.5),
                ),
              if (_profileError != null) ...[
                const SizedBox(height: 12),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.error_outline_rounded,
                        color: Colors.redAccent, size: 16),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        _profileError!,
                        style: const TextStyle(
                            color: Colors.redAccent, fontSize: 13, height: 1.3),
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _saving ? null : () => _saveProfile(ctx, nameController, phoneController, setSheetState),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: jdkartOrange,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _saving
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                              strokeWidth: 2.5, color: Colors.white),
                        )
                      : const Text('Save Changes',
                          style:
                              TextStyle(fontSize: 15.5, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    ).whenComplete(() {
      nameController.dispose();
      phoneController.dispose();
    });
  }

  /// Matches the backend's phone normalisation: strips +91 / leading 0 and
  /// all non-digits so "98765 43210" and "+91 9876543210" behave the same.
  String _normalizePhone(String raw) {
    var digits = raw.replaceAll(RegExp(r'\D'), '');
    if (digits.length == 12 && digits.startsWith('91')) {
      digits = digits.substring(2);
    }
    if (digits.length == 11 && digits.startsWith('0')) {
      digits = digits.substring(1);
    }
    return digits;
  }

  Future<void> _saveProfile(
    BuildContext sheetContext,
    TextEditingController nameController,
    TextEditingController phoneController,
    StateSetter setSheetState,
  ) async {
    final name = nameController.text.trim();
    final phone = _normalizePhone(phoneController.text);

    String? error;
    if (name.isEmpty) {
      error = 'Please enter your name.';
    } else if (phone.isNotEmpty && phone.length != 10) {
      error = 'Enter a valid 10-digit mobile number, or leave it blank.';
    }
    if (error != null) {
      setSheetState(() => _profileError = error);
      return;
    }

    final current = AuthService.instance.currentUser;
    final nameChanged = current == null || name != current.name;
    final phoneChanged = current == null || phone != current.phone;
    if (!nameChanged && !phoneChanged) {
      Navigator.pop(sheetContext);
      return;
    }

    setSheetState(() => _saving = true);
    Map<String, dynamic> result;
    try {
      result = await AuthService.instance.updateProfile(
        name: nameChanged ? name : null,
        phone: phoneChanged ? phone : null,
      );
    } catch (_) {
      result = {
        'success': false,
        'message': 'Could not update your profile. Please try again.',
      };
    }

    if (!mounted) return;
    if (sheetContext.mounted) {
      setSheetState(() => _saving = false);
    }

    if (result['success'] == true) {
      if (sheetContext.mounted) Navigator.pop(sheetContext);
      setState(() {});
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Profile updated'),
            backgroundColor: Color(0xFF16A34A)),
      );
    } else {
      final message = result['message'] ??
          'Could not update your profile. Please try again.';
      if (sheetContext.mounted) {
        setSheetState(() => _profileError = message);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message), backgroundColor: Colors.redAccent),
        );
      }
    }
  }

  Widget _buildSection(BuildContext context, List<_MenuItem> items) {    return Container(
      color: Colors.white,
      child: Column(
        children: items.map((item) {
          int index = items.indexOf(item);
          return Column(
            children: [
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: Colors.grey[50], borderRadius: BorderRadius.circular(10)),
                  child: Icon(item.icon, color: const Color(0xFF1E293B), size: 20),
                ),
                title: Text(item.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14.5)),
                trailing: const Icon(Icons.chevron_right_rounded, color: Colors.grey, size: 20),
                onTap: item.onTap,
              ),
              if (index < items.length - 1) const Divider(height: 1, indent: 64),
            ],
          );
        }).toList(),
      ),
    );
  }
}

class _MenuItem {
  final IconData icon;
  final String title;
  final VoidCallback onTap;

  _MenuItem({required this.icon, required this.title, required this.onTap});
}
