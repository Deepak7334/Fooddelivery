import 'package:flutter/material.dart';
import 'dart:math';

class DeliveryMapScreen extends StatefulWidget {
  const DeliveryMapScreen({Key? key}) : super(key: key);

  @override
  _DeliveryMapScreenState createState() => _DeliveryMapScreenState();
}

class _DeliveryMapScreenState extends State<DeliveryMapScreen> {
  bool isOnline = true;
  String _activeStatus = 'accepted_by_driver'; // Mock status
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Hello, Rahul', style: TextStyle(color: Colors.grey, fontSize: 14)),
            Text('JDkart Delivery Partner', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        actions: [
          Row(
            children: [
              Text(isOnline ? 'ONLINE' : 'OFFLINE', style: TextStyle(color: isOnline ? Colors.green : Colors.red, fontWeight: FontWeight.bold, fontSize: 12)),
              Switch(
                value: isOnline,
                onChanged: (val) => setState(() => isOnline = val),
                activeColor: Colors.green,
              ),
            ],
          )
        ],
      ),
      body: !isOnline 
        ? const Center(child: Text('You are currently Offline.\nToggle Online to receive orders.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey, fontSize: 16)))
        : ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('New Assignments', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(height: 12),
            _buildNewAssignmentCard(context),
            const SizedBox(height: 24),
            const Text('Active Deliveries', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(height: 12),
            _buildActiveDeliveryCard(context),
          ],
        ),
    );
  }

  Widget _buildNewAssignmentCard(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.orange.withValues(alpha: 0.5)),
        boxShadow: [BoxShadow(color: Colors.orange.withValues(alpha: 0.1), blurRadius: 10)],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: Colors.orange.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
                child: const Text('NEW REQUEST', style: TextStyle(color: Colors.orange, fontSize: 10, fontWeight: FontWeight.bold)),
              ),
              const Text('Earn ₹45', style: TextStyle(fontWeight: FontWeight.w900, color: Colors.green, fontSize: 16)),
            ],
          ),
          const SizedBox(height: 12),
          const Row(
            children: [
              Icon(Icons.store, color: Colors.grey, size: 20),
              SizedBox(width: 8),
              Expanded(child: Text('Burger King, Connaught Place', style: TextStyle(fontWeight: FontWeight.bold))),
            ],
          ),
          Padding(
            padding: const EdgeInsets.only(left: 9.0, top: 2, bottom: 2),
            child: Container(width: 2, height: 12, color: Colors.grey[300]),
          ),
          const Row(
            children: [
              Icon(Icons.location_on, color: Colors.red, size: 20),
              SizedBox(width: 8),
              Expanded(child: Text('12B, Sector 4, New Delhi (4.2 km)', style: TextStyle(color: Colors.grey, fontSize: 13))),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {},
                  style: OutlinedButton.styleFrom(foregroundColor: Colors.red, side: const BorderSide(color: Colors.red)),
                  child: const Text('Reject'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: ElevatedButton(
                  onPressed: () {},
                  style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).primaryColor),
                  child: const Text('Accept Order', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildActiveDeliveryCard(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('#OD1235', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.orange)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: const Color(0xFF3B82F6).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4)),
                child: const Text('ACCEPTED', style: TextStyle(color: Color(0xFF3B82F6), fontSize: 10, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text('Customer: Alice', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 4),
          const Text('Pizza × 1', style: TextStyle(color: Colors.grey, fontSize: 13)),
          const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Divider(height: 1)),
          
          ElevatedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.navigation, color: Colors.white, size: 18),
            label: const Text('Navigate to Restaurant', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(double.infinity, 45),
              backgroundColor: const Color(0xFF14B8A6),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () => _showOtpModal(context),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(double.infinity, 45),
              foregroundColor: Colors.green,
              side: const BorderSide(color: Colors.green),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Mark as Delivered (OTP)'),
          )
        ],
      ),
    );
  }

  void _showOtpModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 24, right: 24, top: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.verified_user, size: 48, color: Colors.green),
              const SizedBox(height: 16),
              const Text('Delivery OTP', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const Text('Ask Alice for their 6-digit OTP to complete the delivery.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: List.generate(6, (index) => Container(
                  width: 40, height: 50,
                  decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.grey[300]!)),
                  child: const Center(child: Text('-', style: TextStyle(fontSize: 24, color: Colors.grey))),
                )),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Delivery Completed Successfully!'), backgroundColor: Colors.green));
                },
                style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 54), backgroundColor: Colors.green, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                child: const Text('Verify & Complete', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 24),
            ],
          ),
        );
      }
    );
  }
}
