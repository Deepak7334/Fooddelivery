import 'package:flutter/material.dart';
import 'orders_screen.dart';
import 'addresses_screen.dart';
import 'notifications_screen.dart';
import 'wishlist_screen.dart';
import 'offers_screen.dart';
import 'table_booking_screen.dart';
import '../../auth/screens/login_screen.dart';
import '../../../services/auth_service.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final Color jdkartOrange = const Color(0xFFF97316);
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
                            color: const Color(0xFFF59E0B).withOpacity(0.2),
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
              _MenuItem(icon: Icons.table_restaurant_rounded, title: 'Table Reservations', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TableBookingScreen()))),
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

  Widget _buildSection(BuildContext context, List<_MenuItem> items) {
    return Container(
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
