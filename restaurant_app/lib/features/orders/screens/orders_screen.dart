import 'package:flutter/material.dart';

class OrdersScreen extends StatelessWidget {
  const OrdersScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        backgroundColor: const Color(0xFF0F0F1A), // Dark mode background from web
        appBar: AppBar(
          backgroundColor: const Color(0xFF161623), // bg-card
          elevation: 0,
          title: const Text('Order Management', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontFamily: 'DM Sans')),
          bottom: TabBar(
            isScrollable: true,
            labelColor: const Color(0xFFF97316),
            unselectedLabelColor: Colors.grey[500],
            indicatorColor: const Color(0xFFF97316),
            tabs: const [
              Tab(text: 'Pending (2)'),
              Tab(text: 'Accepted'),
              Tab(text: 'Preparing'),
              Tab(text: 'Ready/Done'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildOrderCard(context, '#A9F8C2', 'John Doe', 'john@example.com', 'Whopper Meal × 1 · Onion Rings × 2', '₹450', 'pending', '2 mins ago'),
                _buildOrderCard(context, '#B3X8D1', 'Alice', 'alice@example.com', 'Pizza × 1', '₹120', 'pending', 'Just now'),
              ],
            ),
            ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildOrderCard(context, '#C7K2M9', 'Mike', 'mike@example.com', 'Fries × 2', '₹240', 'accepted', '10 mins ago'),
              ],
            ),
            ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildOrderCard(context, '#D4J9N3', 'Sarah', 'sarah@example.com', 'Burger × 3', '₹890', 'preparing', '15 mins ago'),
              ],
            ),
            const Center(child: Text('No orders here', style: TextStyle(color: Colors.white54))),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderCard(BuildContext context, String id, String customerName, String customerPhone, String items, String total, String status, String time) {
    bool isPending = status == 'pending';
    
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF161623), // bg-card
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isPending ? const Color(0xFFF97316).withValues(alpha: 0.5) : const Color(0xFF2A2A3A)),
        boxShadow: isPending ? [BoxShadow(color: const Color(0xFFF97316).withValues(alpha: 0.1), blurRadius: 20)] : [],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  if (isPending)
                    Container(
                      margin: const EdgeInsets.only(right: 8),
                      width: 8, height: 8,
                      decoration: const BoxDecoration(color: Color(0xFFF59E0B), shape: BoxShape.circle),
                    ),
                  Text(id, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFFF97316), fontFamily: 'monospace')),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _getStatusColor(status).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(100),
                ),
                child: Text(status.toUpperCase(), style: TextStyle(color: _getStatusColor(status), fontSize: 10, fontWeight: FontWeight.bold)),
              )
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(customerName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white)),
                  const SizedBox(height: 2),
                  Text(customerPhone, style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                ],
              ),
              Text(total, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF22C55E), fontFamily: 'monospace')),
            ],
          ),
          const SizedBox(height: 12),
          Text('$items · $time', style: TextStyle(color: Colors.grey[400], fontSize: 12)),
          
          if (isPending) ...[
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      foregroundColor: Colors.red,
                      side: const BorderSide(color: Colors.red),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text('✖ Reject', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF22C55E),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text('Accept Order', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            )
          ] else if (status == 'accepted') ...[
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {},
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF3B82F6),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: const Text('Mark Preparing', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            )
          ] else if (status == 'preparing') ...[
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {},
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF22C55E),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: const Text('Mark Ready', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            )
          ]
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'pending': return const Color(0xFFF59E0B);
      case 'accepted': return const Color(0xFF3B82F6);
      case 'preparing': return const Color(0xFF8B5CF6);
      case 'ready': return const Color(0xFF10B981);
      default: return Colors.grey;
    }
  }
}
