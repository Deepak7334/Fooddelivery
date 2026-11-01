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

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final Color jdkartOrange = const Color(0xFFF97316);
  bool _saving = false;

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
    final userName = user != null && user.name.isNotEmpty ? user.name : 'JDKart Customer';
    final userEmail = user != null && user.email.isNotEmpty ? user.email : 'customer@jdkart.in';
    final userPhone = user != null && user.phone.isNotEmpty ? user.phone : 'Rohtas, Bihar';
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
              child: Column(
                children: [
                  Row(
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
                            Text(userPhone, style: const TextStyle(color: Colors.grey, fontSize: 13, fontWeight: FontWeight.w500)),
                            Text(userEmail, style: const TextStyle(color: Colors.grey, fontSize: 13)),
                          ],
                        ),
                      ),
                      IconButton(
                        tooltip: 'Edit profile',
                        onPressed: () => _openProfileEditor(user),
                        icon: Icon(Icons.edit_outlined, color: jdkartOrange, size: 22),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // JDKart Pro Gold Membership Banner
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.workspace_premium_rounded, color: Color(0xFFF59E0B), size: 20),
                        ),
                        const SizedBox(width: 10),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'JDKART PRO MEMBER',
                                style: TextStyle(color: Color(0xFFF59E0B), fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 0.5),
                              ),
                              Text(
                                'Free delivery on all orders above ₹99',
                                style: TextStyle(color: Colors.white70, fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white54, size: 12),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            _buildSection(context, [
              _MenuItem(icon: Icons.shopping_bag_outlined, title: 'My Orders', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const OrdersScreen()))),
              _MenuItem(icon: Icons.favorite_border_rounded, title: 'Wishlist & Favorites', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const WishlistScreen()))),
              _MenuItem(icon: Icons.location_on_outlined, title: 'Saved Addresses', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AddressesScreen()))),
              _MenuItem(icon: Icons.table_restaurant_rounded, title: 'My Table Reservations', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MyBookingsScreen()))),
            ]),
            const SizedBox(height: 14),

            _buildSection(context, [
              _MenuItem(icon: Icons.notifications_none_rounded, title: 'Notifications', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen()))),
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
                    applicationIcon: Image.asset('assets/logo.png', width: 48, height: 48, errorBuilder: (_, __, ___) => const Icon(Icons.delivery_dining, size: 48, color: Color(0xFFF97316))),
                    children: const [
                      SizedBox(height: 10),
                      Text('JDKart is your premier food and essentials delivery partner in Rohtas, Bihar. Fresh meals from top local restaurants delivered straight to your door.'),
                    ],
                  );
                },
              ),
            ]),
            const SizedBox(height: 24),

            TextButton.icon(
              onPressed: () async {
                await AuthService.instance.logout();
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

  void _openProfileEditor(UserModel? user) {
    if (user == null || !AuthService.instance.isAuthenticated) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
      return;
    }

    final nameController = TextEditingController(text: user.name);
    final phoneController = TextEditingController(text: user.phone);

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
                decoration: const InputDecoration(
                  labelText: 'Full Name',
                  border: OutlineInputBorder(),
                  contentPadding:
                      EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Mobile Number',
                  border: OutlineInputBorder(),
                  contentPadding:
                      EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Email ${user.email} is managed by your login and cannot be changed here.',
                style: TextStyle(color: Colors.grey[600], fontSize: 12.5),
              ),
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

  Future<void> _saveProfile(
    BuildContext sheetContext,
    TextEditingController nameController,
    TextEditingController phoneController,
    StateSetter setSheetState,
  ) async {
    final name = nameController.text.trim();
    final phone = phoneController.text.trim();

    if (name.isEmpty) {
      ScaffoldMessenger.of(sheetContext).showSnackBar(
        const SnackBar(
            content: Text('Please enter your name.'),
            backgroundColor: Colors.redAccent),
      );
      return;
    }

    setSheetState(() => _saving = true);
    final result =
        await AuthService.instance.updateProfile(name: name, phone: phone);
    if (!mounted) return;
    setSheetState(() => _saving = false);

    if (result['success'] == true) {
      Navigator.pop(sheetContext);
      setState(() {});
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Profile updated'),
            backgroundColor: Color(0xFF16A34A)),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['message'] ??
              'Could not update your profile. Please try again.'),
          backgroundColor: Colors.redAccent,
        ),
      );
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
