import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../core/constants/api_constants.dart';
import 'auth_service.dart';

/// Shared Socket.IO client mirroring the production web frontend (`lib/socket.js`).
/// Joins `user_<userId>` while logged in and `order_<orderId>` while an order
/// tracking/details screen is open.
class RealtimeService {
  RealtimeService._();
  static final RealtimeService instance = RealtimeService._();

  io.Socket? _socket;
  String? _connectedUserId;
  final Map<String, int> _orderRoomRefCounts = {};

  final StreamController<Map<String, dynamic>> _notificationController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _orderUpdateController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _orderOtpController =
      StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get notifications => _notificationController.stream;
  Stream<Map<String, dynamic>> get orderUpdates => _orderUpdateController.stream;
  Stream<Map<String, dynamic>> get orderOtpEvents => _orderOtpController.stream;

  void connectIfAuthenticated() {
    final userId = AuthService.instance.currentUser?.id ?? '';
    if (!AuthService.instance.isAuthenticated || userId.isEmpty) {
      disconnect();
      return;
    }

    if (_socket != null) {
      if (_connectedUserId != userId) {
        _connectedUserId = userId;
        if (_socket!.connected) {
          _socket!.emit('join_user_room', userId);
        }
      }
      if (!_socket!.connected) _socket!.connect();
      return;
    }

    _connectedUserId = userId;
    final socket = io.io(
      ApiConstants.serverOrigin,
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .enableAutoConnect()
          .enableReconnection()
          .build(),
    );

    socket.onConnect((_) {
      _rejoinRooms(socket);
    });

    socket.onReconnect((_) {
      _rejoinRooms(socket);
    });

    socket.on('notification', (data) {
      final map = _asMap(data);
      if (map != null) _notificationController.add(map);
    });

    socket.on('order:status_update', (data) {
      final map = _asMap(data);
      if (map != null) _orderUpdateController.add(map);
    });

    socket.on('order:otp_sent', (data) {
      final map = _asMap(data);
      if (map != null) _orderOtpController.add(map);
    });

    socket.onConnectError((err) {
      debugPrint('Socket.IO connect error: $err');
    });

    _socket = socket;
    socket.connect();
  }

  void _rejoinRooms(io.Socket socket) {
    final uid = _connectedUserId;
    if (uid != null && uid.isNotEmpty) {
      socket.emit('join_user_room', uid);
    }
    for (final orderId in _orderRoomRefCounts.keys) {
      if (orderId.isNotEmpty) {
        socket.emit('join_order_room', orderId);
      }
    }
  }

  void joinOrderRoom(String orderId) {
    if (orderId.isEmpty) return;
    final count = _orderRoomRefCounts[orderId] ?? 0;
    _orderRoomRefCounts[orderId] = count + 1;
    connectIfAuthenticated();
    if (count == 0 && _socket?.connected == true) {
      _socket!.emit('join_order_room', orderId);
    }
  }

  void leaveOrderRoom(String orderId) {
    if (orderId.isEmpty) return;
    final count = _orderRoomRefCounts[orderId] ?? 0;
    if (count <= 1) {
      _orderRoomRefCounts.remove(orderId);
    } else {
      _orderRoomRefCounts[orderId] = count - 1;
    }
  }

  void disconnect() {
    _connectedUserId = null;
    _orderRoomRefCounts.clear();
    final socket = _socket;
    _socket = null;
    if (socket != null) {
      socket.dispose();
    }
  }

  static Map<String, dynamic>? _asMap(dynamic data) {
    if (data is Map) {
      return Map<String, dynamic>.from(data);
    }
    return null;
  }
}
