import 'package:flutter/material.dart';

class MenuScreen extends StatefulWidget {
  const MenuScreen({Key? key}) : super(key: key);

  @override
  _MenuScreenState createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  final List<Map<String, dynamic>> menuItems = [
    {'name': 'Whopper Meal', 'price': 450, 'inStock': true, 'image': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200'},
    {'name': 'Onion Rings', 'price': 120, 'inStock': true, 'image': 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=200'},
    {'name': 'Chicken Fries', 'price': 200, 'inStock': false, 'image': 'https://images.unsplash.com/photo-1562967914-01efa7e87832?w=200'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text('Menu Management', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(icon: const Icon(Icons.add, color: Colors.black), onPressed: () {}),
        ],
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(20),
        itemCount: menuItems.length,
        itemBuilder: (context, index) {
          final item = menuItems[index];
          return Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey[200]!)),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(item['image'], width: 70, height: 70, fit: BoxFit.cover),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item['name'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 4),
                      Text('₹${item['price']}', style: TextStyle(fontWeight: FontWeight.w900, color: Theme.of(context).primaryColor)),
                    ],
                  ),
                ),
                Column(
                  children: [
                    Switch(
                      value: item['inStock'],
                      onChanged: (val) {
                        setState(() => item['inStock'] = val);
                      },
                      activeColor: Colors.green,
                    ),
                    Text(item['inStock'] ? 'In Stock' : 'Out of Stock', style: TextStyle(color: item['inStock'] ? Colors.green : Colors.red, fontSize: 10, fontWeight: FontWeight.bold)),
                  ],
                )
              ],
            ),
          );
        },
      ),
    );
  }
}
