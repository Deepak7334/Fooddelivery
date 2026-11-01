import 'package:flutter/material.dart';

class DeliveryEarningsScreen extends StatelessWidget {
  const DeliveryEarningsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text('Earnings', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF10B981), Color(0xFF059669)]),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              children: [
                const Text('Today\'s Earnings', style: TextStyle(color: Colors.white70)),
                const SizedBox(height: 8),
                const Text('₹1,240', style: TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.w900)),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildStat('Deliveries', '14'),
                    _buildStat('Hours', '5.2'),
                    _buildStat('Tips', '₹150'),
                  ],
                )
              ],
            ),
          ),
          const SizedBox(height: 32),
          const Text('Weekly History', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          const SizedBox(height: 16),
          _buildHistoryRow('Mon, 12 Oct', '₹980', '12 Trips'),
          _buildHistoryRow('Tue, 13 Oct', '₹1,120', '15 Trips'),
          _buildHistoryRow('Wed, 14 Oct', '₹1,450', '18 Trips'),
        ],
      ),
    );
  }

  Widget _buildStat(String label, String value) {
    return Column(
      children: [
        Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
      ],
    );
  }

  Widget _buildHistoryRow(String date, String amount, String trips) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey[200]!)),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(date, style: const TextStyle(fontWeight: FontWeight.bold)),
              Text(trips, style: TextStyle(color: Colors.grey[500], fontSize: 12)),
            ],
          ),
          Text(amount, style: const TextStyle(fontWeight: FontWeight.w900, color: Colors.green, fontSize: 16)),
        ],
      ),
    );
  }
}
